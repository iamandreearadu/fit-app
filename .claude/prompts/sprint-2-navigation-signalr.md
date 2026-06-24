# NovaFit — Sprint 2: Navigation Overhaul + SignalR + Backend
# Technique: COAST (Context → Objective → Actions → Scenario → Task)
# Run: paste this file content directly into Claude Code

---

## C — CONTEXT

You are working on **NovaFit** (FitApp), a fitness + social platform (Angular 19 + .NET 10).
Branch: `Fix-Release`. Sprint 1 is complete — the following changes are already in place:
- Dead nav components deleted (`social-bottom-nav`, `social-top-bar` from features/social/components)
- Dead re-export facades deleted (`social-chat.facade.ts`, `social-notifications.facade.ts`)
- `SocialShellComponent` is now lazy-loaded in `app.routes.ts`
- `AccountService` no longer imports `AlertService` (moved to AccountFacade)
- AI service files renamed: `ai-inference.service.ts`, `ai-chat-history.service.ts`, `ai-chat.store.ts`
- P0 bugs fixed: profile reactive route param, archiveWorkout inversion, SignalR MessageDeleted, double-connection guard

**Current navigation state (mobile):**
The global `app-bottom-nav` still has the old 5 tabs (Dashboard/Plans/Social/Profile/More).
Inside `/social`, the shell still renders `<app-social-top-tabs>` — a pill row (Feed/Discover/Chat/Alerts)
that stacks below the global top bar, consuming ~160px of combined nav chrome.
The social badge in the bottom nav combines notifications + DMs into a single count.
There is no back chevron on social detail routes (/social/post/:id, /social/chat/:id, etc.).

**Design system tokens (use these — never hardcode hex values):**
```css
--primary: #7c4dff
--accent: #ff4081
--surface: #0d0d10
--nav-height: 56px
--nav-bg: rgba(13,13,16,0.85)
--nav-blur: 20px
--nav-border: rgba(255,255,255,0.07)
--primary-light: #a78bfa
--white: #ffffff
--glass-bg: rgba(255,255,255,0.025)
--glass-border: rgba(255,255,255,0.08)
```

---

## O — OBJECTIVE

Complete Sprint 2: transform the mobile navigation from a confused double-layer system into
a clean BeSocial-first 5-tab bottom nav, add pull-to-refresh and discover pagination to the feed,
harden SignalR for mobile network changes, and align the backend with three missing improvements.

---

## A — ACTIONS

Run all three actions in parallel — they target non-overlapping files.

---

### ACTION 1 — Navigation Overhaul → `@angular-developer`

Read all affected files before making any change.

#### 1a. Redesign `app-bottom-nav` — 5 new tabs

**File:** `fit-app/src/app/shared/components/bottom-nav/app-bottom-nav.component.*`

Replace the current 5 tabs with:

| Position | Tab       | Icon          | Route                   | Badge               |
|----------|-----------|---------------|-------------------------|---------------------|
| 1        | Feed      | `home`        | `/social`               | none                |
| 2        | Discover  | `explore`     | `/social/discover`      | none                |
| 3        | Dashboard | `dashboard`   | `/user-dashboard`       | none                |
| 4        | Alerts    | `notifications` | `/social/notifications` | `unreadNotifications` count |
| 5        | Messages  | `chat_bubble` | `/social/chat`          | `unreadMessages` count |

**Active state spec:**
- Icon + label color: `var(--primary)`
- Indicator: 3px × 3px pill dot, `border-radius: 999px`, `background: var(--primary)`, `top: 6px`, centered horizontally
- Transition: `color 0.18s ease`, `background 0.18s ease`
- Press: `transform: scale(0.92)`, `0.1s ease`
- Inactive: icon + label at `rgba(255,255,255,0.4)`

**"Dashboard" tab (position 3):**
- `routerLink="/dashboard"`, `routerLinkActive` applies normally
- Standard 22px icon size (same as other tabs)

**Badge spec (Alerts tab + Messages tab — identical visual):**
```css
min-width: 16px; height: 16px; padding: 0 4px;
border-radius: 999px;
background: var(--accent);
color: var(--white);
font-size: 9px; font-weight: 700;
border: 1.5px solid var(--surface);
position: absolute; top: 6px; right: calc(50% - 20px);
```
Render only when count > 0. Cap at "99+" when count exceeds 99.

**Badge data bindings:**
- Tab 4 (Alerts): inject `NotificationFacade`, bind to `notificationFacade.unreadCount`
- Tab 5 (Messages): inject `ChatFacade`, add a `totalUnreadMessages = computed(() => ...)`
  signal that sums unread counts across all conversations. If ChatFacade doesn't expose this,
  compute it from the conversations signal: `conversations().reduce((sum, c) => sum + (c.unreadCount ?? 0), 0)`

**Remove** the old combined `socialBadge` computation.

**Nav visibility:** confirm `app.component.ts` `showMainNav` logic shows the bottom nav on ALL
authenticated routes including `/social/*`. No changes needed if it already works — just verify.

#### 1b. Remove `social-top-tabs` from the social shell

**Files:** `fit-app/src/app/features/social/social-shell.component.html`, `.ts`, `.css`

- Remove `<app-social-top-tabs>` from the shell template
- Remove `SocialTopTabsComponent` from shell imports array
- In `social-shell.component.css`, remove or adjust any `padding-top` that was compensating
  for the top-tabs row height. Keep only the padding for the global `app-top-bar` (56px):
  `padding-top: calc(var(--nav-height) + env(safe-area-inset-top))`

The content area should now flow from directly below `app-top-bar` to directly above `app-bottom-nav`.

#### 1c. Add back navigation on social detail routes

**File:** `fit-app/src/app/shared/components/top-bar/app-top-bar.component.*`

On these routes: `/social/post/:id`, `/social/article/:id`, `/social/chat/:id`, `/social/profile/:id`
— replace the NovaFit wordmark/logo area with:
```html
<button class="top-bar-back-btn" (click)="goBack()">
  <mat-icon>chevron_left</mat-icon>
</button>
<span class="top-bar-context-title">{{ contextTitle() }}</span>
```

`contextTitle()` is a `computed()` signal that returns:
- "Post" on `/social/post/:id`
- "Article" on `/social/article/:id`
- "Message" on `/social/chat/:id`
- "Profile" on `/social/profile/:id`
- `''` (show logo) on all other routes

`goBack()` calls `this.location.back()`. Inject `Location` from `@angular/common`.

Use `Router` or `ActivatedRoute` to detect the current URL pattern. A `toSignal(router.events.pipe(...))` or a `computed()` based on `router.url` signal works.

On root social routes (`/social`, `/social/discover`, `/social/notifications`, `/social/chat` exact):
— show the normal NovaFit wordmark/logo.

**Back button CSS:**
```css
.top-bar-back-btn {
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: none; cursor: pointer;
  color: var(--white); border-radius: 10px;
}
.top-bar-back-btn:hover { background: rgba(255,255,255,0.06); }
.top-bar-context-title {
  font-size: 16px; font-weight: 700; color: var(--white);
  letter-spacing: -0.2px;
}
```

#### 1d. Fix AI FAB vs daily panel FAB stacking conflict

**Files:** `fit-app/src/app/core/components/ai-chat-fab/ai-chat-fab.component.css`
           `fit-app/src/app/features/social/social-shell.component.css`

Both FABs currently use `bottom: calc(var(--nav-height) + env(safe-area-inset-bottom) + 8px)` on
`/social/*` routes — they overlap exactly in the bottom-right corner.

In `ai-chat-fab.component.css`, add a rule that applies only inside the social shell context.
The simplest approach: add an `@Input() extraBottomOffset = 0` to `AiChatFabComponent`,
and in `social-shell.component.html` pass `[extraBottomOffset]="64"` to `<app-ai-chat-fab>`.
The FAB CSS then applies: `bottom: calc(var(--nav-height) + env(safe-area-inset-bottom) + 8px + {{extraBottomOffset}}px)`.

If the component already uses a fixed CSS class, an alternative is adding a `.social-shell` host
context selector in the FAB's CSS or using a CSS variable.

Choose whichever approach is cleaner given the current code — read the file first.

---

### ACTION 2 — Feed Experience + SignalR Resilience → `@angular-developer`

This action targets different files from Action 1 — run in parallel.
Read all affected files before making any change.

#### 2a. Pull-to-refresh on social feed

**File:** `fit-app/src/app/features/social/feed/social-feed.component.ts` + `.html`

Implement using the Pointer Events API (zero new npm dependencies):

In the component:
```typescript
private startY = 0;
private isPulling = false;
readonly isPullRefreshing = signal(false);

onPointerDown(e: PointerEvent) {
  if (this.feedContainer.nativeElement.scrollTop === 0) {
    this.startY = e.clientY;
    this.isPulling = true;
  }
}
onPointerMove(e: PointerEvent) {
  if (!this.isPulling) return;
  if (e.clientY - this.startY > 70) {
    this.isPullRefreshing.set(true);
  }
}
onPointerUp() {
  if (this.isPullRefreshing()) {
    this.facade.loadFeed(true); // force-refresh existing method
  }
  this.isPulling = false;
  this.isPullRefreshing.set(false);
}
```

Add `@ViewChild('feedContainer')` ref on the feed scroll container. Bind the pointer events
via `(pointerdown)`, `(pointermove)`, `(pointerup)` on that container.

In the template, add a pull-to-refresh indicator above the feed list:
```html
@if (isPullRefreshing()) {
  <div class="pull-refresh-indicator">
    <mat-spinner diameter="24" color="primary"></mat-spinner>
  </div>
}
```
CSS: `display:flex; justify-content:center; padding:12px 0;`

Also show the same spinner while `facade.feedLoading()` is true after a pull-refresh trigger
(reuse the existing loading state).

#### 2b. Discover page pagination

**Files:** `fit-app/src/app/features/social/discover/social-discover.component.ts` + `.html`
           `fit-app/src/app/core/facade/social.facade.ts` (or social-feed.facade.ts if split already done)
           `fit-app/src/app/api/social.service.ts`

Add pagination to the discover feed (currently loads all posts in one unbounded call):

In the facade, add:
```typescript
private discoverPage = signal(1);
private discoverHasMore = signal(true);
```
Update `loadDiscover()` to accept a `page` parameter and append results (don't replace on page > 1).
Pass `page` and `pageSize=12` to `SocialService.getDiscover()`.
Set `discoverHasMore.set(result.length === 12)`.

In `social.service.ts`, update `getDiscover()` to accept `page: number, pageSize: number = 12`
and include them as query params.

In the discover template, add a sentinel div at the very bottom of the post grid:
```html
<div #discoverSentinel class="discover-sentinel"></div>
@if (facade.discoverLoading()) {
  <div class="discover-loading-more">
    <mat-spinner diameter="24"></mat-spinner>
  </div>
}
```

In the component, add an `IntersectionObserver` on `discoverSentinel` (same pattern already
used in `social-feed.component.ts` for the feed sentinel). When sentinel enters viewport
and `discoverHasMore()` is true and not already loading: call `facade.loadDiscover(nextPage)`.

#### 2c. SignalR custom reconnect schedule + onreconnected state re-sync

**Files:** `fit-app/src/app/core/services/chat-hub.service.ts`
           `fit-app/src/app/core/services/notification-hub.service.ts`
           `fit-app/src/app/core/facade/notification.facade.ts`
           `fit-app/src/app/core/facade/chat.facade.ts` (check actual name)

**In both hub services:**

1. Replace `.withAutomaticReconnect()` (no args) with:
   `.withAutomaticReconnect([0, 2000, 5000, 10000, 30000, 60000, 120000])`
   This extends reconnect to ~2 minutes instead of stopping after 42 seconds.

2. Add connection state broadcasting:
```typescript
private readonly reconnectedSubject = new Subject<void>();
private readonly connectionStateSubject = new BehaviorSubject<'connected'|'reconnecting'|'disconnected'>('disconnected');

readonly reconnected$ = this.reconnectedSubject.asObservable();
readonly connectionState$ = this.connectionStateSubject.asObservable();
```

3. Register lifecycle callbacks right after `.build()`:
```typescript
this.connection.onreconnecting(() => this.connectionStateSubject.next('reconnecting'));
this.connection.onreconnected(() => {
  this.connectionStateSubject.next('connected');
  this.reconnectedSubject.next();
});
this.connection.onclose(() => this.connectionStateSubject.next('disconnected'));
```

**In NotificationFacade:** subscribe to `notifHub.reconnected$` with `takeUntilDestroyed`.
On emit: call `this.loadUnreadCount()` to re-sync the notification badge.

**In ChatFacade:** subscribe to `chatHub.reconnected$` with `takeUntilDestroyed`.
On emit: call `this.loadConversations()` to re-sync the conversation list and unread counts.

#### 2d. "Reconnecting..." banner in social shell

**File:** `fit-app/src/app/features/social/social-shell.component.ts` + `.html` + `.css`

Inject `ChatHubService` into `SocialShellComponent`.

Add:
```typescript
readonly isReconnecting = toSignal(
  this.chatHub.connectionState$.pipe(map(s => s === 'reconnecting')),
  { initialValue: false }
);
```

In the template, immediately after the opening shell container div:
```html
@if (isReconnecting()) {
  <div class="reconnecting-banner">
    <mat-icon class="reconnecting-icon">sync</mat-icon>
    Reconnecting...
  </div>
}
```

CSS:
```css
.reconnecting-banner {
  background: rgba(255,152,0,0.12);
  border-bottom: 1px solid rgba(255,152,0,0.20);
  padding: 6px 16px;
  font-size: 12px; font-weight: 600;
  color: #ff9800;
  display: flex; align-items: center; gap: 8px;
  position: sticky; top: var(--nav-height); z-index: var(--z-sticky, 100);
}
.reconnecting-icon {
  font-size: 16px; width: 16px; height: 16px;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

---

### ACTION 3 — Backend Sprint 2 → `@dotnet-developer`

Read all affected files before making any change.

#### 3a. Conversations list pagination

**Files:** `FitApp.Api/Services/ConversationService.cs`, `FitApp.Api/Controllers/ConversationsController.cs`

`GET /api/conversations` currently returns all conversations unbounded and computes unread
counts by loading all messages into memory.

Changes:
1. Add `int page = 1, int pageSize = 20` to `GetConversationsAsync`.
   Apply `Math.Min(pageSize, 50)`, `Skip((page-1)*pageSize).Take(pageSize)`.
   Return `PaginatedResponse<ConversationSummaryResponse>`.

2. Move unread count from C# in-memory grouping to a SQL correlated COUNT:
```csharp
UnreadCount = context.DirectMessages.Count(m =>
    m.ConversationId == c.Id &&
    !m.IsDeleted &&
    m.SentAt > (participant.LastReadAt ?? DateTime.MinValue) &&
    m.SenderId != userId)
```
Replace the existing in-memory `messages.Where(...).Count()` approach.

Update the controller endpoint to accept and forward the new parameters.

#### 3b. CursorPageResponse for GetMessagesAsync

**Files:** `FitApp.Api/Models/DTOs/ConversationDtos.cs`, `FitApp.Api/Services/ConversationService.cs`,
           `FitApp.Api/Controllers/ConversationsController.cs`

`GET /api/conversations/{id}/messages` uses cursor-based pagination (beforeMessageId) but returns
`PaginatedResponse<T>` with `Page = 1` and `TotalCount = pageSize` — both values are meaningless
and mislead consumers.

Add a new generic DTO to `ConversationDtos.cs`:
```csharp
public record CursorPageResponse<T>(
    IEnumerable<T> Items,
    bool HasMore,
    int? NextCursor  // Id of the oldest message in this page — use as beforeMessageId next call
);
```

Change `GetMessagesAsync` to return `CursorPageResponse<DirectMessageResponse>`:
- `Items`: fetched messages, ordered oldest-first for display
- `HasMore`: `items.Count == pageSize` (true if there may be more before the cursor)
- `NextCursor`: `items.FirstOrDefault()?.Id` (the oldest message Id in this batch)

Update the controller to return the new shape.
Note: Angular's `conversation.service.ts` consumes this response — include a comment
in the PR description that the Angular model type for messages pagination must be updated
to `CursorPageResponse<DirectMessageResponse>`.

#### 3c. Add GET /api/social/trending endpoint

**Files:** `FitApp.Api/Controllers/SocialController.cs`, `FitApp.Api/Services/SocialService.cs`

New endpoint: `[HttpGet("trending")]` with `[Authorize]`.

Signature: `GET /api/social/trending?pageSize=20`

Implementation in `SocialService.GetTrendingAsync(int userId, int pageSize)`:
```csharp
var since = DateTime.UtcNow.AddDays(-7);
var posts = await db.Posts
    .Where(p => !p.IsArchived && p.AuthorId != userId && p.CreatedAt >= since)
    .Include(p => p.Author)
    .Include(p => p.Likes)
    .Include(p => p.Comments)
    .OrderByDescending(p => p.LikesCount * 2 + p.CommentsCount)
    .ThenByDescending(p => p.CreatedAt)
    .Take(Math.Min(pageSize, 20))
    .ToListAsync();
```

Return the same `PostResponse` projection already used in `GetDiscoverAsync` —
including `IsLikedByMe` flag (check if `userId` is in `post.Likes`).

This endpoint is used as:
1. Fallback content for cold-start users (follows nobody → trending fills the discover tab)
2. Content for the "already followed everyone" empty state on discover

---

## S — SCENARIO

### What success looks like after Sprint 2:

- Mobile: opening `/social` shows the social feed directly, with 5 bottom nav tabs
  (Feed, Discover, Dashboard, Alerts, Messages).
  No pill row below the global top bar — just feed content from nav to nav.
- Tapping "Dashboard" navigates to `/dashboard`.
- Tapping "Alerts" shows a distinct notification badge count separate from DMs.
- Tapping into a post (`/social/post/123`) shows a back chevron ← in the top bar.
- Pulling down on the feed triggers a refresh spinner.
- The discover tab loads 12 posts at a time and loads more on scroll.
- Locking and unlocking the phone after > 42 seconds: SignalR reconnects silently.
  If reconnect is in progress, a subtle amber banner appears. Badge counts re-sync automatically.
- Backend: conversations list is paginated, message pagination returns clean cursor shape,
  trending endpoint is available for Discover empty state.

---

## T — TASK

**Execute Actions 1, 2, and 3 in parallel** — they target non-overlapping files.

For each action, assign it to the appropriate agent:
- Action 1 → `@angular-developer`
- Action 2 → `@angular-developer` (separate instance, different files)
- Action 3 → `@dotnet-developer`

**Constraints:**
- READ every file before editing — never assume contents from descriptions above
- Use `ng build` to verify no TypeScript/import errors after changes
- No new npm packages without explicit justification
- Never hardcode hex values — use CSS custom properties
- All new subscriptions must use `takeUntilDestroyed()`
- No `any` types in TypeScript
- Action 2 has one potential overlap with Action 1: `social-shell.component.*`.
  If running in parallel, Action 1 should complete changes to `social-shell.component.*` first,
  then Action 2 can add the reconnecting banner to the same file. Or run them sequentially
  on that specific file.

---
_Sprint 2 | Branch: Fix-Release | Generated: 2026-06-22_
