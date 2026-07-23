## Performance Audit — FitApp — 2026-07-21

Branch: `Fix-Release`. Read-only audit — no source files modified.

### CRITICAL

**1. Production build fails — bundle size cannot be verified, app cannot ship**

`cd fit-app && npx ng build --configuration production` fails with two template compile errors:

- `src/app/features/dashboard/daily-user-data/daily-user-data.component.html:126`
  ```
  @for (w of facade.workoutTemplates; track w.uid) {
  ```
  `UserFacade.workoutTemplates` is a `computed()` Signal (`user.facade.ts:225`), not an array — it's being iterated without being invoked. Needs `facade.workoutTemplates()`.

- `src/app/features/social/post-detail/social-post-detail.component.ts:43` declares
  ```ts
  private readonly facade = inject(SocialContentFacade);
  ```
  but the template (`social-post-detail.component.html:31`) calls `facade.toggleFollow($event)` directly, which Angular's template type-checker rejects because `facade` is not accessible outside the class.

Impact: not a runtime performance bug, but it is the single most important finding — it blocks the bundle-size budget check requested for this audit, and it means the current `Fix-Release` branch cannot be built for production at all. Route to `@bug-hunter` before any further performance or release work.

### WARNING

**1. Missing index on `ConversationParticipant.UserId`** — `FitApp.Api/Data/AppDbContext.cs:213-221`

Only a composite unique index `(ConversationId, UserId)` exists. SQLite can only use a composite index as a prefix on its leading column(s), so it can't serve lookups filtered by `UserId` alone. Both of these hot paths filter by `UserId` only:
- `ConversationService.cs:20-23` (`GetConversationsAsync` — runs on every Chat tab load)
- `ConversationService.cs:106-113` (`GetOrCreateAsync`)

This is exactly the index the performance-engineer persona's own reference table calls out ("DM conversation lookup … `HasIndex(cp => cp.UserId)`") but it was never added. Fix: add `e.HasIndex(cp => cp.UserId);` in `OnModelCreating` for `ConversationParticipant` + an EF migration.

**2. Missing `.AsNoTracking()` on read-only queries** — violates the project's own hard rule ("`.AsNoTracking()` on all GET service methods")
- `NotificationService.cs:97-98` — `GetNotificationsAsync` loads `Notifications.Include(Actor)` without `.AsNoTracking()`. This is a polled endpoint (unread badge), so it pays unnecessary change-tracking overhead repeatedly.
- `ConversationService.cs:27-37` (`GetConversationsAsync`) and `ConversationService.cs:209-220` (`GetMessagesAsync`) — both pure reads, both untracked-eligible, neither uses `.AsNoTracking()`.

**3. Inconsistent pagination cap** — `ConversationService.cs:205` clamps `pageSize = Math.Min(pageSize, 100)`, not the project convention of 50 (`CLAUDE.md`, and every other paginated endpoint). Possibly intentional for chat scrollback, but it's an undocumented deviation — either lower it to 50 or note the exception explicitly.

### ADVISORY

- `SocialService.cs:670-732` (`GetSuggestedUsersAsync`) re-sorts an already DB-ordered `pool` in-memory (`OrderByDescending/ThenByDescending` at line 728) duplicating work already done in SQL. Harmless at `limit=5`/pool≤15, but redundant — could push the final ordering into the query.
- `SocialService.cs:299-353` (`ToggleLikeAsync`) wraps two `SaveChangesAsync` + an `ExecuteUpdateAsync` in an explicit DB transaction. Correct, but SQLite already serializes all writes DB-wide (single writer), so this buys no extra isolation — noted for awareness only, no action needed.
- `fit-app/package-lock.json` shows local modifications picked up while running the build for this audit — unrelated to performance, flag for the dev to review/discard if unintended.

### Verified OK

- **N+1 queries**: none found. `SocialService` feed/discover/trending/profile queries all use `.Include()` chains + `.AsSplitQuery()` + batched `.Where(id => ...Contains...)` for likes/follows lookups — no per-item queries inside loops. `ConversationService.GetConversationsAsync` batches unread counts via a single grouped query rather than N+1 `CountAsync` calls per conversation.
- **Pagination caps**: every paginated backend endpoint enforces `Math.Min(pageSize, N)` server-side — `WorkoutService.cs:12` (50), `NutritionService.cs:14` (50), `DailyDataService.cs:63` (50), `FoodSearchService.cs:40` (10), `NotificationService.cs:96` (50), and every method in `SocialService` (50, except `GetTrendingAsync` at 20 and `GetSuggestedUsersAsync` at 5, both intentionally tighter). Controllers pass query params straight through — no cap bypass path found.
- **Atomic counters**: `Post.LikesCount` / `Post.CommentsCount` are updated exclusively via `ExecuteUpdateAsync` (`SocialService.cs:318-320, 327-328, 403-404, 441-443`) — no read-modify-write races.
- **Indexes**: `Post(UserId, IsArchived, CreatedAt)`, `Follow(FollowerId, FollowingId)` unique + `Follow(FollowingId)` non-unique, `Notification(RecipientId, IsRead, CreatedAt)`, `DirectMessage(ConversationId, SentAt)`, `WorkoutSession(UserId, FinishedAt)` all present and match actual query access patterns (see WARNING #1 for the one gap).
- **RxJS subscriptions**: every manual `.subscribe(` found in facades (`notification.facade.ts`, `chat.facade.ts`, `workouts-tab.facade.ts`, `user.facade.ts`) and in components (e.g. `social-feed.component.ts:129`, dialog closes) is piped through `takeUntilDestroyed()`. No leak risk found.
- **SignalR lifecycle**: `ChatHubService`/`NotificationHubService` both call `.stop()` and null out `connection` in `disconnect()`; `AccountFacade.logout()` (`account.facade.ts:157-158`) calls both `chatHub.disconnect()` and `notifHub.disconnect()`. No leaked hub connections on logout.
- **Bundle budget config**: `fit-app/angular.json:45-56` sets initial budget 1.5MB warn / 2MB error, matching `CLAUDE.md` — but actual size is unverifiable until CRITICAL #1 is fixed.

### Overall verdict

Backend query discipline is strong and already follows most of this agent's own hard rules (AsNoTracking mostly present, atomic counters everywhere, pagination capped everywhere, split queries + no in-memory filtering). The real backend gaps are small and low-risk: one missing index (`ConversationParticipant.UserId`) and a handful of missing `.AsNoTracking()` calls on read paths. Frontend RxJS/SignalR hygiene is clean — no subscription or connection leaks found. The actually urgent problem is unrelated to performance tuning: `Fix-Release` does not currently compile in production configuration (two template bugs), which blocks both the bundle-size verification this audit was asked to do and any release. Fix the two compile errors first, then land the `ConversationParticipant` index and the missing `AsNoTracking()` calls as a quick follow-up.

**Summary counts:** CRITICAL: 1 · WARNING: 3 · ADVISORY: 3 · Verified OK: 7 categories
