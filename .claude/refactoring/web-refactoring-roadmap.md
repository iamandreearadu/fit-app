# NovaFit — Web Refactoring Roadmap (Document A)
_Generated: 2026-06-22 | Branch: Fix-Release | Source: Full 8-agent analysis pipeline_

---

## P0 — Critical Fixes (Blockers Before Any Release)

### P0.1 — SignalR `MessageDeleted` event unhandled (functional DM bug)
**Files:** `fit-app/src/app/core/services/chat-hub.service.ts`
**Current behavior:** `ChatHubService` subscribes to `ReceiveMessage` and `NewConversationMessage` but never registers `MessageDeleted`. When the other participant deletes a message, the sender's UI shows stale deleted content permanently.
**Change:** Add `this.connection.on('MessageDeleted', (payload) => this.messageDeletedSubject.next(payload))` and expose `messageDeleted$` Observable. Wire to `ChatFacade.removeMessage()` that filters the deleted message from the conversation signal.
**Why:** Functional regression — the backend hub fires this event; the frontend silently ignores it.
**Effort:** S

### P0.2 — SignalR double-connection risk during reconnect
**Files:** `chat-hub.service.ts:18`, `notification-hub.service.ts:23`
**Current behavior:** Both hub services guard against `HubConnectionState.Connected` only. If `connect()` is called while the connection is in `Reconnecting` state (e.g., the `SocialShellComponent` safety net fires during a network blip), a second parallel connection is created → duplicate message delivery.
**Change:** Also check `HubConnectionState.Reconnecting` and `HubConnectionState.Connecting`:
```typescript
if ([HubConnectionState.Connected, HubConnectionState.Reconnecting, HubConnectionState.Connecting]
    .includes(this.connection?.state)) return;
```
**Why:** Silent data integrity issue — users receive duplicate messages.
**Effort:** S

### P0.3 — `AuthController` error responses violate `ProblemDetails` contract
**Files:** `FitApp.Api/Controllers/AuthController.cs`
**Current behavior:** `Login` returns `Unauthorized(new { message = "..." })` and `Register` returns `Conflict(new { message = error })` — plain anonymous objects, not `ProblemDetails`. All other controllers use `Problem(statusCode: X, detail: ...)`.
**Change:** Replace both with:
```csharp
return Problem(statusCode: 401, detail: "Invalid credentials.");
return Problem(statusCode: 409, detail: error);
```
**Why:** Angular's error interceptor and any generic error handler will fail to parse these responses. The auth flow is the most critical path — inconsistent error shapes here cause silent failures.
**Effort:** S

### P0.4 — Blog list is unbounded (no pagination)
**Files:** `FitApp.Api/Services/BlogService.cs:14`, `FitApp.Api/Controllers/BlogController.cs`
**Current behavior:** `GET /api/blog` calls `ToListAsync()` with no `Skip`/`Take`. Returns all blog posts in one response.
**Change:** Add `int page = 1, int pageSize = 20` parameters. Apply `Math.Min(pageSize, 50)`, `Skip((page-1)*pageSize).Take(pageSize)`. Return `PaginatedResponse<BlogPostDto>`.
**Why:** Blog content will grow unbounded. Already inconsistent with every other list endpoint.
**Effort:** S

### P0.5 — Conversations list is unbounded (no pagination)
**Files:** `FitApp.Api/Services/ConversationService.cs:35-42`, `FitApp.Api/Controllers/ConversationsController.cs`
**Current behavior:** `GET /api/conversations` returns ALL conversations and materializes ALL their messages to compute unread counts in C#. For a user with many conversations this is an O(n × m) memory allocation.
**Change:** Add `page`/`pageSize` parameters. Return `PaginatedResponse<ConversationSummaryResponse>`. Move unread count calculation to a SQL `GROUP BY` query.
**Why:** Performance + consistency with every other list endpoint.
**Effort:** M

### P0.6 — `SocialProfile` uses route snapshot instead of reactive subscription
**Files:** `fit-app/src/app/features/social/social-profile/social-profile.component.ts:72-85`
**Current behavior:** `route.snapshot.paramMap.get('userId')` is called once on `ngOnInit`. When navigating from profile A to profile B (e.g., from the followers list at line 233 via `navigateToProfile(userId)`), Angular reuses the component instance and `ngOnInit` does not re-fire. The profile shows stale data from the previous user.
**Change:** Subscribe to `route.paramMap` as an observable, using `takeUntilDestroyed(this.destroyRef)`:
```typescript
this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe(params => {
    const userId = params.get('userId');
    this.loadProfile(userId);
  });
```
**Why:** Functional bug affecting core social navigation between profiles.
**Effort:** S

### P0.7 — `archiveWorkout` called on "Unarchive" button (logic inversion bug)
**Files:** `fit-app/src/app/features/social/social-profile/social-profile.component.html:299`, `social-profile.component.ts:288`
**Current behavior:** The "Unarchive" button in the archived workouts section calls `archiveWorkout(workoutId)` — which archives again rather than unarchiving. The `facade.archiveWorkout()` method should be `facade.unarchiveWorkout()`.
**Change:** Confirm the facade has a separate `unarchiveWorkout(id)` method (check `PATCH /api/social/profile/workouts/{id}`). If not, add it. Wire the unarchive button to the correct method.
**Why:** Functional bug — users cannot recover archived workouts.
**Effort:** S

---

## P1 — Architecture Refactors

### P1.1 — Split `SocialFacade` (454 lines, 37+ methods) into three focused facades
**Files:** `fit-app/src/app/core/facade/social.facade.ts` (primary), plus new files to create
**Current behavior:** `social.facade.ts` manages 7 distinct concerns: feed pagination, discover, profile loading, profile sections (workouts/blogs/archived), search, follow lists, guided empty state, sharing, and public stats. `toggleLike()` must fan out across 3 signal arrays (`feed`, `profilePosts`, `_discoverPosts`). Any new view displaying posts must be added to this fan-out.
**Change:** Split into:
- `social-feed.facade.ts` — feed loading, discover, guided empty state, suggestions (lines 40–117, 166–177, 370–409)
- `social-profile.facade.ts` — profile loading, profile sections, follow lists, bio, archive, public stats (lines 54–58, 78–93, 196–310, 333–368, 441–453)
- `social-content.facade.ts` — post CRUD, like, comment, search, article, blog CRUD, share (lines 119–165, 179–199, 237–295, 313–331, 411–439)

Back all three with a new `SocialPostCacheService` (`core/services/social-post-cache.service.ts`): a `Map<number, WritableSignal<Post>>` as the single source of truth for post data. `toggleLike()` updates the cache once; all views derive from it via `computed()` — the triple-update fan-out is eliminated.
**Why:** The 454-line monolith is the primary source of maintenance debt in the frontend. The triple-update fan-out will grow to 5–6 arrays as new post-displaying views are added.
**Effort:** L

### P1.2 — Lazy-load `SocialShellComponent` in main bundle
**Files:** `fit-app/src/app/app.routes.ts:6` (eager import), `:96` (component assignment)
**Current behavior:** `SocialShellComponent` is imported statically at line 6 and assigned as `component: SocialShellComponent` at line 96 (not `loadComponent`). The entire social shell — and its static imports (`SocialSideNavComponent`, `SocialTopTabsComponent`, `SocialDailyPanelComponent`, `MatIconModule`, `BreakpointObserver`) — lands in the main bundle for every user, including unauthenticated visitors on the landing page.
**Change:**
```typescript
// app.routes.ts — remove line 6 static import, change route to:
{
  path: 'social',
  loadComponent: () =>
    import('./features/social/social-shell.component').then(m => m.SocialShellComponent),
  canActivate: [AuthGuard],
  children: [...]
}
```
**Why:** Removes ~30–80KB gzipped from the initial bundle. Unauthenticated users pay no cost for the social module.
**Effort:** S

### P1.3 — Rename three AI service files (fix typo, clarify purpose)
**Files:**
- `fit-app/src/app/api/groq-ai.service.ts` → rename to `ai-chat-history.service.ts`, class `AiChatHistoryService` (handles AI conversation CRUD at `/api/chat`)
- `fit-app/src/app/core/services/grog-ai.service.ts` → rename to `fit-app/src/app/core/store/ai-chat.store.ts`, class `AiChatStore` (Signal state for AI chat — belongs in store, not services)
- `fit-app/src/app/api/groq-ai-api.service.ts` → rename to `ai-inference.service.ts`, class `AiInferenceService` (Groq proxy calls — inference only)
**Current behavior:** Three files with nearly identical names (`groq-ai-api`, `groq-ai`, `grog-ai`) do completely different things. The `grog-ai` typo is particularly disorienting. `GroqAiFacade` imports `GroqAiService as GroqInMemoryService` to paper over the confusion.
**Change:** Rename files + classes, update all imports in `groq-ai.facade.ts` and any other consumers. Remove the `as GroqInMemoryService` alias — the proper name makes the alias unnecessary.
**Why:** Every new developer wastes time understanding which AI service does what. The typo causes build-tool issues in case-sensitive environments.
**Effort:** S

### P1.4 — Move UI alert calls from `AccountService` to `AccountFacade`
**Files:** `fit-app/src/app/api/account.service.ts:24-79`
**Current behavior:** `AccountService` is the only API service that injects `AlertService` and shows toasts directly (`login()`, `register()`, `logout()`). Every other API service correctly delegates UI feedback to the facade layer. `logout()` shows a toast but makes no HTTP call — its logic belongs entirely in the facade.
**Change:** Remove `AlertService` injection from `AccountService`. Move all `alerts.success()/warn()/info()` calls to `AccountFacade.login()`, `AccountFacade.register()`, and `AccountFacade.logout()`.
**Why:** Violates clean architecture. The HTTP layer should only handle HTTP and data shaping.
**Effort:** S

### P1.5 — Delete dead re-export facade files
**Files:** `fit-app/src/app/core/facade/social-chat.facade.ts`, `fit-app/src/app/core/facade/social-notifications.facade.ts`
**Current behavior:** Both files are 3-line re-exports (`export { ChatFacade as SocialChatFacade }`). They add an indirection layer with no benefit. The underlying singletons are `ChatFacade` and `NotificationFacade`.
**Change:** Delete both files. Update `SocialShellComponent` to import `ChatFacade` and `NotificationFacade` directly.
**Why:** Dead code that misleads readers into thinking there is a distinct social-specific chat implementation.
**Effort:** S

### P1.6 — SignalR `onreconnected` handlers + state re-sync
**Files:** `chat-hub.service.ts`, `notification-hub.service.ts`, `chat.facade.ts`, `notification.facade.ts`
**Current behavior:** After `withAutomaticReconnect()` restores a connection, neither hub fires any event to sync state. Notifications and messages received during the disconnect window are permanently lost from the UI until manual refresh. The `isConnected` signal is only set on initial `connectHub()`, not on reconnect events.
**Change:**
1. Add `onreconnected` handler in both hub services that emits via a `reconnectedSubject`.
2. In `NotificationFacade`: subscribe to `notifHub.reconnected$` and call `loadUnreadCount()`.
3. In `ChatFacade`: subscribe to `chatHub.reconnected$`, call `loadConversations()`, and re-join the active conversation group via `joinConversation(activeConversationId)`.
4. Extend reconnect retry schedule: `.withAutomaticReconnect([0, 2000, 5000, 10000, 30000, 60000, 120000])`.
**Why:** Silent data loss on mobile network changes. The 4-retry default stops after ~42 seconds — any phone screen lock longer than 42 seconds kills real-time permanently.
**Effort:** S

### P1.7 — Fix `UserFacade` delegations break reactivity chain
**Files:** `fit-app/src/app/core/facade/user.facade.ts:213,226`
**Current behavior:** `get meals()` and `get workoutTemplates()` return plain values (snapshots), not signals. Components reading these get non-reactive data.
**Change:** Replace with:
```typescript
readonly meals = computed(() => this.nutritionTabFacade._meals());
readonly workoutTemplates = computed(() => this.workoutsTabFacade.templatesSignal());
```
**Why:** Breaks reactivity. Components won't update when the underlying data changes.
**Effort:** S

### P1.8 — Audit and remove dead `toObservable()` bridges in facades
**Files:** `blog.facade.ts:33-34`, `workouts-tab.facade.ts:61-62`, `nutrition-tab.facade.ts:22`
**Current behavior:** These facades create `posts$`, `templates$`, `meals$` Observable versions of their signals. In Angular 19 Signals-first architecture, these are likely unused. Each `toObservable()` creates an internal subscription — memory overhead with no benefit if unconsumerd.
**Change:** Grep for any template or service consuming these Observables (e.g., `nutritionTabFacade.meals$`). If no consumers exist, delete them.
**Why:** Dead code + unnecessary memory allocation.
**Effort:** S

---

## P2 — Feature Upgrades (Web-Specific)

### P2.1 — Desktop social sidebar navigation redesign
**Files:** `fit-app/src/app/features/social/components/side-nav/social-side-nav.component.html`, `.ts`, `.css`
**Current behavior:** Flat list of 5 nav items + "New Post" + "Log out" + "Back to NovaFit". No hierarchy. Power users have no organized structure for data-intensive workflows.
**Change (per UI/UX spec):** Organize into 5 sections:
1. **Primary** (no label): Feed, Discover
2. **CONNECT** section: Messages (with unread badge), Alerts (with unread badge)
3. **ME** section: My Profile, My Stats (routes to stats tab), Archived
4. **CREATE** section: "New Post" (elevated gradient button), "Write Article" (info-blue tinted item)
5. **Footer** (bottom, low weight): Dashboard, Workouts, Log Out (danger hover only)

Add streak row between mini-profile and section 1 when `streak.current > 0` — amber background, flame icon, count + "day streak" label.
**Why:** Power users who create content and track analytics need navigational hierarchy, not a flat list.
**Effort:** M

### P2.2 — Profile redesign: athlete stat strip, heatmap, achievement chips
**Files:** `fit-app/src/app/features/social/social-profile/social-profile.component.html`, `.css`
**Current behavior:** Hero shows Posts/Followers/Following (vanity metrics first). No activity heatmap. No achievement chips. 2 of 4 stat cards show "--" placeholder values.
**Change (per UI/UX spec):**
- Demote follower counts to a single compact text line: "42 Posts · 118 Followers · 54 Following" at 13px/400
- Add **Athlete Stat Strip** (3 columns on mobile, 4 on web): STREAK / THIS MONTH / TOTAL / BEST STREAK — using existing `GET /api/users/{userId}/stats` data
- Add **Activity Heatmap**: 12-week (mobile) / 26-week (web) grid. 10×10px cells, color intensity = workout days. Data: `WorkoutTemplate.CreatedAt` or `WorkoutSession.CompletedAt` history
- Add **Achievement Chip Row**: horizontal scroll, chips for 7-day streak, 30-day streak, first post, 10 workouts, goal achiever
- Fix post grid 3-dot button for mobile (permanent, not hover-only — see P0 for mobile)
**Why:** Profile leads with social vanity instead of athletic identity. Strava and Hevy both lead with performance. Two stat cards are placeholder "–" values.
**Effort:** M

### P2.3 — Structured workout summary cards in feed
**Files:** `fit-app/src/app/features/social/components/post-card/post-card.component.html`, `.ts`, `.css`, `fit-app/src/app/core/models/social.model.ts`
**Current behavior:** Shared workouts appear as text posts with a `LinkedContentPreview` badge showing only `{ type: 'workout', title, subtitle }` — no structured data, no sets/reps/weights, no PR badges.
**Change:** Add a `linkedContentData` rendering mode to `PostCardComponent` that displays:
- Workout name + type icon
- Duration + exercise count stats row
- Top 3 exercises with sets × reps @ weight (or "×N exercises" overflow)
- Optional PR badge (`emoji_events`, amber) for any new personal record in the session
Data comes from an expanded `LinkedContentData` object (extends current `LinkedContentPreview`). Backend must include exercise breakdown in `PostFromWorkoutRequest` response (see P4.5).
**Why:** Hevy's core social engagement mechanic. Auto-generated workout cards with real data are higher-signal content than text posts. Drives both content creation (zero effort after workout) and feed engagement.
**Effort:** M (backend expansion required — coordinate with P4.5)

### P2.4 — Dashboard daily completion ring
**Files:** `fit-app/src/app/features/dashboard/components/dashboard/dashboard.component.html`, `.css`, plus a new `DailyCompletionRingComponent`
**Current behavior:** Dashboard 5/10 — no unified completion indicator, no closing beat when all targets are met. Individual progress bars exist for water and steps, but no "all done today" moment.
**Change:** New `<app-daily-completion-ring>` component positioned as the first visible element in the dashboard greeting strip.
- SVG circle progress ring, 80px, `stroke: var(--primary)`, `stroke-dasharray` animated to fill percentage
- Segments: Nutrition logged (1+ meal), Workout logged, Water ≥ target, Steps ≥ target
- When all 4 segments fill: ring glows (`box-shadow: 0 0 16px rgba(124,77,255,0.6)`), confetti particle burst (10 particles, 0.6s animation, `position: absolute`), streak badge bumps
- Data from `GET /api/daily/today/summary` (ADR Fix 10, APPROVED)
**Why:** No habit loop closure exists. The dashboard is scored 5/10 specifically because of this gap. A ring that closes creates loss aversion + reward simultaneously.
**Effort:** S (frontend only — Fix 10 summary endpoint already defined)

### P2.5 — Blog / Article: content creation improvements
**Files:** `fit-app/src/app/features/social/components/write-article/write-article.component.ts`, `FitApp.Api/Controllers/BlogController.cs`
**Current behavior:** Article creation dialog works but articles created via beSocial go to `POST /api/social/profile/blogs/create` and are NOT listed in `GET /api/blog` (the public blog). This means user-written articles exist only in beSocial, not in the main blog content.
**Change:** Evaluate whether user-written articles should appear in the public blog listing (with author filter: only articles by admin appear in public blog; user articles appear only in beSocial). If the decision is to keep them separate, add `isPublic: boolean` flag to `BlogPost` and filter accordingly.
**Why:** UX confusion — the same "article" concept exists in two isolated spaces.
**Effort:** M (requires ADR — this is a product decision, not just a code change)

---

## P3 — Design System Enforcement

### P3.1 — Replace 100+ hardcoded hex values with CSS token references
**Files:** All component CSS files (worst offenders: `onboarding-wizard.component.css` — 13 occurrences, `daily-user-data.component.css` — 17 occurrences, `workouts-content.component.css` — 9 occurrences)
**Current behavior:** Token consistency scored 4/10. Raw `#7c4dff`, `#0d0d10`, `#ff4081`, `#a78bfa`, `#ffb74d` appear 100+ times across 40+ files instead of `var(--primary)`, `var(--surface)`, `var(--accent)`, `var(--primary-light)`, `var(--color-warning)`.
**Change:** Find and replace all occurrences. Add a CSS lint rule or pre-commit hook flagging raw hex values in component CSS files.
**Why:** Any future theme change requires touching 40+ files. The design system becomes effectively immutable.
**Effort:** M

### P3.2 — Add `-webkit-backdrop-filter` prefix everywhere
**Files:** ~15 component CSS files including `styles.css:546,698,767`, `header.component.css:328`, `footer.component.css:47`, `social-profile.component.css:277`, `hero-slider.component.css:157`
**Current behavior:** iOS Safari requires `-webkit-backdrop-filter` for glass effects. Approximately 15 files use `backdrop-filter` without the prefix. Glass effects silently fail on iOS — the primary gym-use device.
**Change:** For every `backdrop-filter: blur(X)` line, add `-webkit-backdrop-filter: blur(X)` immediately above it.
**Why:** Visual regression on the most important mobile platform. Glass morphism is the core visual identity.
**Effort:** S

### P3.3 — Delete dead social nav component files
**Files:**
- `fit-app/src/app/features/social/components/bottom-nav/social-bottom-nav.component.*` (4 files)
- `fit-app/src/app/features/social/components/top-bar/social-top-bar.component.*` (4 files)
**Current behavior:** Both are fully implemented but never imported or rendered (confirmed by grep — zero `app-social-bottom-nav` or `app-social-top-bar` references in any HTML template). 382 lines of dead CSS, 200+ lines of dead TypeScript.
**Change:** Delete all 8 files. Confirm no dynamic import paths reference them.
**Why:** Dead code that creates confusion about the intended navigation model. Developers editing the wrong file is a real risk.
**Effort:** S (trivial, but verify no dynamic references first)

### P3.4 — Standardize responsive breakpoints (16+ values → 6 canonical)
**Files:** All component CSS files
**Current behavior:** 16+ distinct breakpoint values are used across the codebase. Off-by-one variants exist: `767px` vs `768px`, `479px` vs `480px`, `639px` vs `640px`. Uncommon values (399px, 540px, 600px, 720px, 900px, 960px) cause unpredictable responsive behavior.
**Change:** Adopt 6 canonical breakpoints as CSS custom properties:
```css
:root {
  --bp-xs: 480px;   /* Small phone */
  --bp-sm: 640px;   /* Modals → sheets */
  --bp-md: 768px;   /* Mobile nav swap */
  --bp-lg: 968px;   /* Tablet/sidebar */
  --bp-xl: 1100px;  /* Header icon-only */
  --bp-2xl: 1200px; /* Social daily panel inline */
}
```
Immediately fix off-by-one errors (767→768, 479→480, 639→640). Collapse uncommon breakpoints into nearest canonical value.
**Why:** 16 different breakpoints make layout behavior unpredictable. Off-by-one errors cause 1px behavior gaps.
**Effort:** M

### P3.5 — Add glassmorphism surface tokens
**Files:** `fit-app/src/styles.css` (add to `:root`), then update ~50 component files
**Current behavior:** Glass card backgrounds use 6+ distinct `rgba(255,255,255,0.0X)` values. Borders use 6 different opacities. No tokens exist for glass surfaces.
**Change:** Add to `:root`:
```css
--glass-bg-subtle: rgba(255,255,255,0.025);
--glass-bg-medium: rgba(255,255,255,0.04);
--glass-bg-strong: rgba(255,255,255,0.06);
--glass-border-subtle: rgba(255,255,255,0.06);
--glass-border-default: rgba(255,255,255,0.08);
--glass-border-strong: rgba(255,255,255,0.12);
--blur-light: 4px;
--blur-medium: 12px;
--blur-heavy: 20px;
```
Replace raw `rgba()` values with appropriate tokens in all component CSS files.
**Why:** Glass consistency is the most visually impactful design system issue after token consistency.
**Effort:** M

### P3.6 — Z-index token system
**Files:** `fit-app/src/styles.css` (add tokens), multiple component CSS files
**Current behavior:** Z-index values are ad-hoc and contradictory: old social nav uses `z-index: 900`, new shared nav uses `z-index: 100`, AI chat FAB uses `950`, social shell daily panel uses `920–930`, modals use `900–1001`, move-up button uses `1000`. Stacking bugs are inevitable.
**Change:** Add canonical z-index tokens:
```css
--z-base: 1; --z-sticky: 100; --z-drawer: 200;
--z-overlay: 800; --z-modal: 900; --z-fab: 950; --z-toast: 1000;
```
**Why:** Prevents stacking bugs as new layered components are added.
**Effort:** S

### P3.7 — Build `<app-empty-state>` shared component
**Files:** New `fit-app/src/app/shared/components/empty-state/empty-state.component.ts`
**Current behavior:** Two competing empty state systems: the global `.empty` class (simple icon + text) and the `.guided-empty-*` class family (icon + headline + sub + CTA + escape link). Feature areas implement their own variations.
**Change:** Create `<app-empty-state>` with inputs: `icon: string`, `headline: string`, `subtitle: string`, `ctaLabel: string`, `ctaAction: () => void`, `secondaryLabel?: string`, `secondaryAction?: () => void`. All feature empty states migrate to this component over time.
**Why:** Design consistency and reduced code duplication.
**Effort:** S

### P3.8 — Build `<app-skeleton>` shared component
**Files:** New `fit-app/src/app/shared/components/skeleton-loader/skeleton-loader.component.ts`
**Current behavior:** No skeleton loading pattern exists anywhere. Components either show a spinner or nothing while loading.
**Change:** `<app-skeleton>` with `variant` input: `'text' | 'card' | 'avatar' | 'list-item'`. Each variant renders a shimmer-animated placeholder shape. CSS `pulse` keyframe is already used in some places — standardize on one shared animation.
**Why:** Perceived performance. The design system mandates loading states for every component; this provides the infrastructure.
**Effort:** S

---

## P4 — Backend Alignment

### P4.1 — Collapse `PostResponse` article fields into nested `ArticlePreview` object
**Files:** `FitApp.Api/Models/DTOs/SocialDtos.cs` (PostResponse class), `FitApp.Api/Services/SocialService.cs` (mapping), Angular `social.model.ts`
**Current behavior:** `PostResponse` carries 6 nullable article fields (`ArticleId`, `ArticleTitle`, `ArticleCategory`, `ArticleCaption`, `ArticleDescription`, `ArticleImage`) on every post in every feed response — including the 90%+ of posts that are not articles. 6 null fields × 20 posts per page = significant wire overhead.
**Change:** Replace with:
```csharp
public record ArticlePreviewDto(int ArticleId, string Title, string Category, string? Caption, string? Description, string? ImageUrl);
// In PostResponse:
public ArticlePreviewDto? ArticlePreview { get; init; }
```
Update SocialService mapping and Angular `PostResponse` model.
**Why:** ~20% feed payload reduction. Coordinated Angular + .NET change — deploy together.
**Effort:** M (breaking API change — requires coordinated frontend deploy)

### P4.2 — Fix `GetMessagesAsync` response shape (misleading PaginatedResponse)
**Files:** `FitApp.Api/Services/ConversationService.cs`, `FitApp.Api/Models/DTOs/ConversationDtos.cs`
**Current behavior:** `GET /api/conversations/{id}/messages` uses cursor-based pagination but returns `PaginatedResponse<T>` with `Page = 1` and `TotalCount = pageSize` (not the actual total). These values are meaningless for cursor pagination.
**Change:** Introduce `CursorPageResponse<T>` DTO: `{ Items: T[], HasMore: bool, NextCursor: string? }`. Use for this endpoint. Update Angular `conversation.service.ts` and `social-chat.facade.ts` consumers.
**Why:** Misleading `TotalCount` could cause Angular consumers to implement incorrect pagination logic.
**Effort:** S

### P4.3 — Add missing index on `Follows.FollowingId`
**Files:** `FitApp.Api/Data/AppDbContext.cs`
**Current behavior:** `ToggleFollowAsync` calls `CountAsync(f => f.FollowingId == targetUserId)` on every follow/unfollow action. The `Follows` table has a composite unique index on `(FollowerId, FollowingId)` but no covering index on `FollowingId` alone. As follower counts grow, this query does a full table scan.
**Change:** Add to `OnModelCreating`:
```csharp
entity.HasIndex(f => f.FollowingId).HasDatabaseName("IX_Follows_FollowingId");
```
Then create and apply an EF migration.
**Why:** Performance — runs on every follow/unfollow action, unbounded scan on a high-traffic table.
**Effort:** S

### P4.4 — Add `GET /api/social/trending` endpoint
**Files:** `FitApp.Api/Controllers/SocialController.cs`, `FitApp.Api/Services/SocialService.cs`
**Current behavior:** `GET /api/social/discover` sorts by `CreatedAt DESC` only. Cold-start users (follows nobody) see chronological posts from strangers — no engagement signal.
**Change:** New endpoint scoring by `(LikesCount * 2 + CommentsCount)` in the last 7 days. Cap at `Math.Min(pageSize, 20)`. Used as the fallback when the user follows nobody or when discover has exhausted all suggested users.
**Why:** "Already followed everyone" empty state (Discover tab) needs real content. Chronological ordering surfaces old, low-engagement content.
**Effort:** M

### P4.5 — Expand workout share endpoint to include structured exercise data
**Files:** `FitApp.Api/Controllers/SocialController.cs`, `FitApp.Api/Services/SocialService.cs`, `FitApp.Api/Models/DTOs/SocialDtos.cs`
**Current behavior:** `POST /api/social/posts/from-workout/{sessionId}` creates a post with a `LinkedContentPreview` (type, title, subtitle) but no exercise breakdown data.
**Change:** Add `LinkedContentData` to `PostFromWorkoutResponse` containing top exercises (name, sets × reps, weight), total volume, duration, and any PR flags. This data is already in the `WorkoutSession` entity and its `WorkoutExercise` relationship.
**Why:** Required for structured workout summary cards in the feed (P2.3). Without this, feed cards can only show title/type text.
**Effort:** M

### P4.6 — Remove redundant `GetPublicStatsAsync` DB round-trip
**Files:** `FitApp.Api/Services/UserService.cs:41-103`
**Current behavior:** Issues two separate `db.WorkoutTemplates` queries: one `CountAsync` for `workoutsThisMonth` and another to load `workoutsInWindow`. The count is derivable from the window query in memory — one redundant DB call on every profile stats view.
**Change:** Remove the `CountAsync` call. Derive `workoutsThisMonth` from `workoutsInWindow.Count(w => w.CreatedAt >= firstOfMonth)` in memory.
**Why:** Performance — eliminates one DB round-trip on every profile stats request.
**Effort:** S

---

_Document A complete. See `mobile-besocial-roadmap.md` for Document B._
