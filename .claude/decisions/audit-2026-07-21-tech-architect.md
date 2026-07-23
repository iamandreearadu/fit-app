## Architecture Audit — FitApp — 2026-07-21

**Auditor:** @tech-architect (read-only pass)
**Branch:** Fix-Release
**Scope:** Clean Layered Architecture (backend), Signals+Facade (frontend), social module debt, cross-cutting concerns (JWT userId, SignalR groups), god-services/circular deps, CLAUDE.md divergence.

---

### CRITICAL

None. No layering violation severe enough to break the architecture was found:
- No controller touches `AppDbContext`/`DbContext`/`.Include(` directly (grep of `FitApp.Api/Controllers/*.cs` returns nothing).
- No service exposes an EF entity through its public signature (grep for `Task<User>`, `Task<Post>`, `Task<Comment>`, `Task<Notification>`, `Task<DirectMessage>`, etc. across `FitApp.Api/Services/*.cs` returns nothing — all public methods return `*Response`/`*Dto`/`Paginated<*Response>`).
- No component imports an `api/*.service.ts` or `HttpClient` directly (grep of `fit-app/src/app/features/**/*.ts` excluding specs returns nothing) — the facade boundary is intact.

---

### WARNING

**W1 — `SocialService` is a god-service (`FitApp.Api/Services/SocialService.cs`, 1249 lines; `ISocialService.cs` exposes 34 methods).**
One service owns the entire social domain plus cross-domain reads. `ISocialService` spans at least 8 distinct responsibilities: posts CRUD, feed/discover/trending, likes, comments, follows + followers/following, profiles, profile sub-collections (posts/workouts/blogs + their archive/delete), bio, user-authored blogs CRUD, articles, user search, suggested users, and share-from-workout/share-from-meal. It reaches directly into 11 DbSets — `db.Posts, db.Likes, db.Comments, db.Follows, db.Users, db.BlogPosts, db.WorkoutTemplates, db.WorkoutSessions, db.MealEntries, db.DailyEntries` — i.e. it reads Workout, Meal, Daily, and Blog domains that other services (`WorkoutService`, `NutritionService`, `DailyDataService`, `BlogService`) also own. This is the single largest piece of architectural debt in the repo. It is not yet a *correctness* problem (dependencies flow one way — it only depends on `INotificationService`, no circular reference), which is why it is WARNING not CRITICAL. Recommend splitting along the seams the frontend already found (see Verified-OK V2): `IPostService` (posts/feed/discover/trending/likes/comments), `IProfileService` (profile + sub-collections + bio + follows), `ISocialBlogService` (user blogs/articles), and a `ISocialShareService` (from-workout/from-meal, which should call into `WorkoutSessionService`/`NutritionService` rather than re-query their tables).

**W2 — SignalR push responsibility is split between the hub and a controller (`FitApp.Api/Controllers/ConversationsController.cs:131`).**
`ChatHub.SendMessage` (`FitApp.Api/Hubs/ChatHub.cs`) owns the send path — it persists via `conversationService.SendMessageAsync`, then pushes `ReceiveMessage`/`NewConversationMessage` and creates notifications. But `ConversationsController.DeleteMessage` reaches into `IHubContext<ChatHub>` and pushes `MessageDeleted` *from the controller* (line 131), after calling `conversationService.SoftDeleteMessageAsync`. So the real-time contract for one conversation is authored in two places with two different layers. The REST `POST .../messages` path (`ConversationsController.SendMessage`, line 86) also persists but does **not** push — it relies on the hub path — which means a message sent via REST instead of the hub would not be delivered in real time. Recommend the service (or a single dedicated notifier) own all conversation push events so send/delete are symmetric.

---

### ADVISORY

**A1 — JWT userId extraction uses three different patterns across controllers.**
The same claim lookup (`ClaimTypes.NameIdentifier ?? "sub"`) is copy-pasted into every controller with inconsistent shape and null-handling:
- Throwing property: `SocialController.cs:14`, `ConversationsController.cs:19` — `... ?? throw new UnauthorizedAccessException(...)`.
- Null-forgiving property: `UsersController.cs:17`, `NutritionController.cs:16`, `WorkoutsController.cs:14`, `WorkoutSessionsController.cs:19`, `DailyDataController.cs:14` — `... ?? User.FindFirstValue("sub")!` (bang).
- Nullable method + explicit guard: `DashboardController.cs:16` — `private string? GetUserId()` with `if (userId is null) return Unauthorized();`.
- Inline expression: `ChatController.cs:14`, `NotificationsController.cs:14`, `AiController.cs:15`.
All are safe because every controller is `[Authorize]`, so this is not a bug — but it is 11 copies of one cross-cutting concern. Recommend a `protected string UserId` on a shared `ApiControllerBase`. The two hubs already share an identical private `GetUserId()` (`ChatHub.cs`, `NotificationHub.cs`) — those are consistent with each other but not with the controllers.

**A2 — DI abstraction is inconsistent: only 5 of ~19 services have an interface.**
`Program.cs:126-132` registers `INotificationService`, `IFileStorageService`, `IConversationService`, `ISocialService`, `IDashboardService` against implementations, while `Program.cs:110-123` registers 14 services as concrete types (`JwtService`, `MetricsService`, `AuthService`, `UserService`, `DailyDataService`, `WorkoutService`, `WorkoutSessionService`, `NutritionService`, `FoodSearchService`, `OnboardingService`, `BlogService`, `AiProxyService`, `EmailService`, `ChatService`). Controllers mirror the split — `SocialController`/`ConversationsController`/`NotificationsController`/`DashboardController` inject interfaces; `UsersController` (`UsersController.cs:12-15`), `AuthController`, `BlogController`, `ChatController`, `DailyDataController`, `NutritionController`, `AiController` inject concrete classes. There is no rule being followed — pick one (interfaces for services with meaningful contracts / that are mocked in tests) and apply it uniformly.

**A3 — `UsersController` injects three services and mixes domain ownership (`UsersController.cs:12-18, 66-68`).**
`GET /api/users/me/numbers` delegates to `onboardingService.GetYourNumbersAsync` and `GET /api/users/me/streak` to `dailyService.GetUserStreakAsync`. Fitness "numbers" (BMI/BMR/TDEE) living in `OnboardingService` rather than `MetricsService`/`UserService` is a domain-placement smell — onboarding is a *flow*, not a home for a computed-metrics read used outside onboarding. Low urgency; flag for whoever next touches metrics.

**A4 — Frontend real-time services sit outside the facade layer as `core/services/*-hub.service.ts`.**
`chat-hub.service.ts` and `notification-hub.service.ts` live in `core/services/`, not `core/facade/`. This is defensible (they are transport, like the `api/` services) but it means the "components → facades → services" story has a second, undocumented service family. Confirm components reach them only through `chat.facade.ts` / `notification.facade.ts` and never inject a hub service directly (not exhaustively verified this pass).

---

### Divergence from CLAUDE.md (documentation debt — treat as ADVISORY)

CLAUDE.md's structure sections are materially out of date; an agent trusting them will look for files that don't exist and miss ones that do.

- **Controllers:** CLAUDE.md lists `DailyController`; the actual file is `DailyDataController.cs`. CLAUDE.md omits `DashboardController`, `OnboardingController`, `WorkoutSessionsController` entirely.
- **Services:** CLAUDE.md's "Services/" list names only `AiProxyService, EmailService, MetricsService, SocialService, ConversationService, NotificationService`. The repo has 13 more: `AuthService, BlogService, ChatService, DailyDataService, DashboardService, FileStorageService, FoodSearchService, JwtService, NutritionService, OnboardingService, UserService, WorkoutService, WorkoutSessionService`.
- **Facades:** CLAUDE.md lists `social.facade.ts`, `social-chat.facade.ts`, `social-notifications.facade.ts`. None of these exist. The actual social facades are `social-content.facade.ts`, `social-feed.facade.ts`, `social-profile.facade.ts`. CLAUDE.md also omits `dashboard.facade.ts` and `onboarding.facade.ts`.
- **API services:** CLAUDE.md names `groq-ai-api.service.ts`; the repo instead has `ai-inference.service.ts` + `ai-chat-history.service.ts`. CLAUDE.md omits `dashboard.service.ts`, `onboarding.service.ts`, `open-food-facts.service.ts`, `stats.service.ts`.
- **Real-time on the frontend:** CLAUDE.md implies DM/notification real-time lives in `social-chat.facade`/`social-notifications.facade`; it actually lives in `core/services/chat-hub.service.ts` + `notification-hub.service.ts`, orchestrated by `chat.facade.ts` and `notification.facade.ts`.

Recommend a follow-up doc-sync task to regenerate the Structure sections of CLAUDE.md from the tree.

---

### Verified OK

- **V1 — Controllers are thin.** Every controller inspected (`SocialController` 541 lines but 0 business logic — pure try/catch → `service.XAsync(UserId, …)` → `Ok`/`Problem`; `ConversationsController`, `UsersController`, `DashboardController`, `WorkoutsController`) delegates to a service and only maps exceptions to status codes. No `AppDbContext`/LINQ/`.Include` in any controller.
- **V2 — Frontend facade pattern is respected and the social facades are cleanly decomposed, not duplicated.** `SocialFeedFacade` owns feed/discover/suggestions signal state; `SocialProfileFacade` owns profile state; `SocialContentFacade` owns post CRUD/comments/search/follow/share and orchestrates the other two via explicit mutation helpers (`patchFeedPost`, `restoreFeed`, `patchProfilePost` — `social-content.facade.ts:37-77`). Optimistic like fan-out is written once in `SocialContentFacade.toggleLike` and applied across all three stores. This is a good split — no shared logic is copy-pasted between the three.
- **V3 — DTO boundary holds.** All service public signatures return DTOs/records (`*Response`, `*Dto`, `PaginatedResponse<*Response>`); entities stay internal. `SocialService` maps through `MapToPostResponse`.
- **V4 — SignalR group naming is consistent between hubs.** Both `NotificationHub` and `ChatHub` add the connection to `user-{userId}` on `OnConnectedAsync` and use an identical private `GetUserId()` helper. `ChatHub` additionally manages `conv-{conversationId}` groups with a participant check (`ChatHub.JoinConversation`) before join — correct authorization.
- **V5 — No circular service dependencies / no other god-service.** `SocialService` depends only on `AppDbContext` + `INotificationService`. Next-largest services are reasonable (`DashboardService` 363, `ConversationService` 322, `OnboardingService` 243, `AiProxyService` 248). Dependency flow is one-directional.
- **V6 — Pagination cap present.** `SocialService.GetFeedAsync` applies `pageSize = Math.Min(pageSize, 50)` per the .NET standard in CLAUDE.md (spot-checked; confirm it is applied on *every* paginated method during the W1 split).

---

### Overall verdict

**Architecturally sound with one significant structural debt and pervasive documentation drift.** The hard boundaries hold everywhere it matters: controllers are thin, no entity leaks past the service layer, no component bypasses a facade, no circular dependencies, SignalR authorization/grouping is correct. There are **0 CRITICAL, 2 WARNING, 4 ADVISORY** findings plus a documentation-divergence cluster. The one thing worth scheduling real work for is **W1 — decomposing `SocialService`/`ISocialService`** (1249 lines, 34 methods, 11 DbSets), ideally mirroring the clean three-way split the frontend facades already demonstrate. W2 (split conversation push path) is a smaller, contained fix. Everything else is consistency/hygiene. CLAUDE.md's Structure sections should be regenerated before the next agent relies on them.
