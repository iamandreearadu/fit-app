# NovaFit — Sprint 3: Profile Redesign + Feed Cursor + Dashboard Ring + Design System
# Technique: COAST (Context → Objective → Actions → Scenario → Task)
# Run: paste this file content directly into Claude Code

---

## C — CONTEXT

You are working on **NovaFit** (FitApp), a fitness + social platform (Angular 19 + .NET 10).
Branch: `Fix-Release`. Sprints 1 and 2 are complete — the following changes are in place:

**Sprint 1 complete:**
- Dead nav components deleted (`social-bottom-nav`, `social-top-bar` from features/social/components)
- Dead re-export facades deleted (`social-chat.facade.ts`, `social-notifications.facade.ts`)
- `SocialShellComponent` is lazy-loaded in `app.routes.ts`
- `AccountService` alerts moved to `AccountFacade`
- AI service files renamed: `ai-inference.service.ts`, `ai-chat-history.service.ts`, `ai-chat.store.ts`
- P0 bugs fixed: profile reactive route param, archiveWorkout inversion, SignalR MessageDeleted, double-connection guard

**Sprint 2 complete:**
- `app-bottom-nav` has 5 new tabs: Feed (`/social`) / Discover (`/social/discover`) / Dashboard (`/user-dashboard`) / Alerts (`/social/notifications`) / Messages (`/social/chat`)
- Alerts and Messages badges are separate (no longer combined)
- `social-top-tabs` pill row removed from `social-shell.component`
- Back chevron in `app-top-bar` on social detail routes
- AI FAB and daily panel FAB no longer overlap
- Pull-to-refresh on the social feed
- Discover page pagination (12 items per page, IntersectionObserver sentinel)
- SignalR: custom reconnect schedule `[0, 2000, 5000, 10000, 30000, 60000, 120000]`
- SignalR: `onreconnected` re-syncs notification badge + conversation list
- "Reconnecting..." amber banner in social shell
- Backend: conversations list paginated, `CursorPageResponse<T>` for messages, `GET /api/social/trending` endpoint

**Design system tokens (never hardcode hex values — use these):**
```css
--primary: #7c4dff
--accent: #ff4081
--surface: #0d0d10
--nav-height: 56px
--primary-light: #a78bfa
--white: #ffffff
--glass-bg: rgba(255,255,255,0.025)
--glass-border: rgba(255,255,255,0.08)
--color-success: #4ade80
--color-warning: #ffb74d
--color-error: #ef5350
```

---

## O — OBJECTIVE

Sprint 3 delivers three parallel tracks:
1. **Profile** — athlete identity redesign (stat strip, activity heatmap, achievement chips, mobile touch actions)
2. **Feed + Dashboard** — cursor-based pagination on feed, daily completion ring on dashboard, fix `UserFacade` reactivity
3. **Backend + Design System** — expand workout share endpoint with structured data, replace hardcoded hex values with tokens, add glassmorphism + z-index token system

---

## A — ACTIONS

Run all four actions in parallel — they target non-overlapping files.

---

### ACTION 1 — Profile Redesign (Mobile + Web) → `@angular-developer`

Read every file listed before making any change.

**Files to read first:**
- `fit-app/src/app/features/social/social-profile/social-profile.component.ts`
- `fit-app/src/app/features/social/social-profile/social-profile.component.html`
- `fit-app/src/app/features/social/social-profile/social-profile.component.css`
- `fit-app/src/app/features/social/social-profile/stats-tab/stats-tab.component.html`
- `fit-app/src/app/core/facade/social.facade.ts`
- `fit-app/src/app/core/models/social.model.ts`

---

#### 1a. Mobile hero redesign — athlete identity first

**Objective:** The current hero shows Posts/Followers/Following counts immediately after the avatar — social vanity metrics before any athletic identity. Redesign the hero to lead with performance.

**New element order (top to bottom, inside `.profile-header`):**

**[1] Sport ID background wash** (new wrapping div on the whole hero):
```css
.profile-sport-id-bg {
  background: linear-gradient(180deg, rgba(124,77,255,0.07) 0%, transparent 100%);
  padding-bottom: 4px;
}
```

**[2] Avatar + identity row** (flex, `align-items: flex-end`, `gap: 16px`, `padding: 20px 20px 0`):

*Left: avatar (80px, increase from current size if smaller):*
```css
.profile-avatar-ring {
  width: 80px; height: 80px;
  border: 2.5px solid var(--primary);
  border-radius: 50%;
  position: relative; flex-shrink: 0;
}
```

*Camera chip — PERMANENT on mobile (own profile only), NOT hover-dependent:*
On `@media (max-width: 768px)`, add a permanently visible chip:
```html
@if (isOwnProfile()) {
  <button class="profile-avatar-camera-chip" (click)="triggerAvatarUpload()" aria-label="Change profile photo">
    <mat-icon>photo_camera</mat-icon>
  </button>
}
```
```css
.profile-avatar-camera-chip {
  position: absolute; bottom: 0; right: 0;
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--primary); border: 2px solid var(--surface);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.profile-avatar-camera-chip mat-icon { font-size: 14px; width: 14px; height: 14px; color: var(--white); }
```
On desktop (>768px), keep the existing `:hover` overlay — do not remove it.

*Right column (flex: 1):*
- Display name: 22px / 800 / `var(--white)` / `letter-spacing: -0.3px`
- Verified badge (`verified` mat-icon, 16px, `var(--primary)`) inline after name
- Fitness goal badge pill (below name, immediately):
  Map `user.goal` to pill styles:
  - `'lose_weight'` → `background: rgba(255,64,129,0.12); color: #ff4081`
  - `'gain_muscle'` → `background: rgba(74,222,128,0.10); color: #4ade80`
  - `'maintain'` → `background: rgba(56,189,248,0.10); color: #38bdf8`
  - `'strength'` → `background: rgba(167,139,250,0.14); color: #a78bfa`
  - fallback → `background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5)`
  
  Pill CSS: `border-radius: 999px; padding: 3px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: inline-flex; width: fit-content; margin-top: 4px`

**[3] Athlete Stat Strip** (NEW — replaces the Posts/Followers/Following stat row as the dominant stat):

```html
<div class="profile-athlete-stat-strip">
  <div class="profile-stat-cell">
    <span class="profile-stat-label">STREAK</span>
    <span class="profile-stat-number streak-color">{{ stats()?.currentStreak ?? 0 }}</span>
    <span class="profile-stat-sub">days</span>
  </div>
  <div class="profile-stat-cell">
    <span class="profile-stat-label">THIS MONTH</span>
    <span class="profile-stat-number success-color">{{ stats()?.workoutsThisMonth ?? 0 }}</span>
    <span class="profile-stat-sub">workouts</span>
  </div>
  <div class="profile-stat-cell">
    <span class="profile-stat-label">TOTAL</span>
    <span class="profile-stat-number primary-light-color">{{ stats()?.totalWorkouts ?? 0 }}</span>
    <span class="profile-stat-sub">workouts</span>
  </div>
</div>
```

```css
.profile-athlete-stat-strip {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 14px 20px;
  margin-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.06);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.profile-stat-cell {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  border-right: 1px solid rgba(255,255,255,0.06);
}
.profile-stat-cell:last-child { border-right: none; }
.profile-stat-label {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.05em; color: rgba(255,255,255,0.35);
}
.profile-stat-number { font-size: 22px; font-weight: 800; line-height: 1.1; }
.profile-stat-sub { font-size: 11px; color: rgba(255,255,255,0.25); }
.streak-color { color: #ff9800; }
.success-color { color: var(--color-success, #4ade80); }
.primary-light-color { color: var(--primary-light); }
```

**Data source:** `stats()` signal — already loaded via `GET /api/users/{userId}/stats` which returns
`currentStreak`, `workoutsThisMonth`, `totalWorkouts`. Check `social-profile.component.ts` for
how `publicStats` is currently loaded and use the same signal.

**[4] Bio** — keep existing structure, no changes. `padding: 12px 20px`.

**[5] Social stats compact row** (DEMOTED — secondary information, single line):

Replace the large 3-cell Posts/Followers/Following grid with a compact single text line:
```html
<div class="profile-social-stats-compact">
  <span>{{ profile()?.postsCount ?? 0 }} Posts</span>
  <span class="stat-dot">·</span>
  <button class="stat-link" (click)="showFollowers()">{{ profile()?.followersCount ?? 0 }} Followers</button>
  <span class="stat-dot">·</span>
  <button class="stat-link" (click)="showFollowing()">{{ profile()?.followingCount ?? 0 }} Following</button>
</div>
```
```css
.profile-social-stats-compact {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 20px 14px; flex-wrap: wrap;
  font-size: 13px; color: rgba(255,255,255,0.45);
}
.profile-social-stats-compact span { font-weight: 700; color: rgba(255,255,255,0.6); }
.stat-dot { color: rgba(255,255,255,0.25); }
.stat-link {
  background: none; border: none; cursor: pointer; padding: 0;
  font-size: 13px; color: rgba(255,255,255,0.45);
}
.stat-link:hover { color: var(--white); }
```

**[6] Action row** — keep existing structure (Follow/Unfollow + Message for others; Edit Bio + New Post for own). No structural changes.

---

#### 1b. Activity heatmap — 12-week contribution grid

Add this section **between the action row and the tab row**.

```html
<div class="profile-heatmap-row">
  <span class="profile-heatmap-label">{{ isOwnProfile() ? 'Your activity' : 'Activity' }}</span>
  <div class="profile-heatmap-grid" [attr.aria-label]="'Activity heatmap, last 12 weeks'">
    @for (cell of heatmapCells(); track cell.date) {
      <div
        class="heatmap-cell"
        [style.background]="cell.color"
        [attr.title]="cell.label"
        aria-hidden="true">
      </div>
    }
  </div>
</div>
```

**CSS:**
```css
.profile-heatmap-row {
  padding: 16px 20px 0;
  overflow-x: auto; scrollbar-width: none;
}
.profile-heatmap-row::-webkit-scrollbar { display: none; }
.profile-heatmap-label {
  font-size: 11px; font-weight: 600;
  color: rgba(255,255,255,0.3);
  display: block; margin-bottom: 8px;
}
.profile-heatmap-grid {
  display: grid;
  grid-template-columns: repeat(12, 10px);
  grid-template-rows: repeat(7, 10px);
  gap: 2px;
  width: fit-content;
}
.heatmap-cell {
  width: 10px; height: 10px;
  border-radius: 2px;
}
```

**Component logic — add to `social-profile.component.ts`:**
```typescript
readonly heatmapCells = computed(() => {
  const workouts = this.facade.publicStats()?.recentWorkouts ?? [];
  // Build a Set of date strings from workout dates
  const workoutDates = new Set(
    workouts.map(w => new Date(w.date).toDateString())
  );

  const cells = [];
  const today = new Date();
  // 12 weeks × 7 days = 84 cells, starting from 83 days ago
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const hasWorkout = workoutDates.has(d.toDateString());
    cells.push({
      date: d.toISOString(),
      color: hasWorkout ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
      label: `${d.toLocaleDateString()} — ${hasWorkout ? 'workout logged' : 'no activity'}`
    });
  }
  return cells;
});
```

**Note:** `recentWorkouts` on `publicStats()` may only return the last 5 workouts. Check what
`GET /api/users/{userId}/stats` actually returns. If it returns less than 84 days of history,
the grid will show mostly empty cells — this is correct behavior (accurate data).
Do NOT fabricate dates. If the backend only returns recent workouts, show those and leave the
rest empty. The heatmap will fill up naturally as users log workouts over time.

**Loading state:** When `publicStats()` is null (loading), render 84 cells all with
`background: rgba(255,255,255,0.04)` — skeleton appearance. No separate skeleton component needed.

---

#### 1c. Achievement chip row

Add this section **between the heatmap and the tab row**.

```html
@if (achievementChips().length > 0) {
  <div class="profile-achievement-chips">
    @for (chip of achievementChips(); track chip.id) {
      <div class="profile-achievement-chip" [style.background]="chip.bg" [style.border]="chip.border" [attr.aria-label]="'Achievement: ' + chip.label">
        <mat-icon [style.color]="chip.iconColor" [style.font-size.px]="14">{{ chip.icon }}</mat-icon>
        <span [style.color]="chip.textColor">{{ chip.label }}</span>
      </div>
    }
  </div>
}
```

**CSS:**
```css
.profile-achievement-chips {
  display: flex; gap: 8px;
  padding: 12px 20px;
  overflow-x: auto; scrollbar-width: none;
}
.profile-achievement-chips::-webkit-scrollbar { display: none; }
.profile-achievement-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-radius: 999px; flex-shrink: 0;
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
}
.profile-achievement-chip mat-icon { width: 14px; height: 14px; }
```

**Component logic — add `achievementChips = computed(...)` to `social-profile.component.ts`:**
```typescript
readonly achievementChips = computed(() => {
  const stats = this.facade.publicStats();
  if (!stats) return [];

  const chips = [];

  if ((stats.currentStreak ?? 0) >= 30) {
    chips.push({ id: 'streak-30', icon: 'whatshot', label: '30-Day Streak',
      bg: 'rgba(255,152,0,0.14)', border: '1px solid rgba(255,152,0,0.30)',
      iconColor: '#ff9800', textColor: '#ff9800' });
  } else if ((stats.currentStreak ?? 0) >= 7) {
    chips.push({ id: 'streak-7', icon: 'local_fire_department', label: '7-Day Streak',
      bg: 'rgba(255,152,0,0.10)', border: '1px solid rgba(255,152,0,0.20)',
      iconColor: '#ff9800', textColor: '#ff9800' });
  }

  if ((stats.totalWorkouts ?? 0) >= 10) {
    chips.push({ id: 'workouts-10', icon: 'fitness_center', label: '10 Workouts',
      bg: 'rgba(167,139,250,0.14)', border: '1px solid rgba(167,139,250,0.20)',
      iconColor: 'var(--primary-light)', textColor: 'var(--primary-light)' });
  }

  if ((stats.postsCount ?? 0) >= 1) {
    chips.push({ id: 'first-post', icon: 'photo_camera', label: 'First Post',
      bg: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
      iconColor: 'rgba(255,255,255,0.5)', textColor: 'rgba(255,255,255,0.5)' });
  }

  return chips;
});
```

Map `stats.postsCount` from `publicStats()` if available, or from `profile()?.postsCount`.
Adjust field names to match the actual `UserPublicStatsResponse` model in `social.model.ts`.

---

#### 1d. Post grid touch actions — permanent 3-dot button

**Problem:** Edit/Archive/Delete on the profile post grid use a `:hover` overlay that is
unreachable on mobile touch. The `:active` CSS fallback fires only during finger-down, not on tap.

**Fix — mobile only (`@media (max-width: 768px)`):**

In `social-profile.component.html`, inside the `@for` loop that renders own-profile post cells,
add a permanent 3-dot button:
```html
@if (isOwnProfile()) {
  <button
    class="profile-post-cell-menu-btn"
    (click)="$event.stopPropagation(); openPostMenu(post)"
    aria-label="Options for this post"
    aria-haspopup="true">
    <mat-icon>more_horiz</mat-icon>
  </button>
}
```

**CSS (inside `@media (max-width: 768px)`):**
```css
.profile-post-cell-menu-btn {
  position: absolute; top: 4px; right: 4px;
  width: 28px; height: 28px;
  background: rgba(0,0,0,0.5);
  border: none; border-radius: 6px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; z-index: 2;
}
.profile-post-cell-menu-btn mat-icon {
  font-size: 16px; width: 16px; height: 16px;
  color: var(--white);
}
```

**`openPostMenu(post)` method** — opens a `MatBottomSheet` with 3 actions:
```typescript
openPostMenu(post: Post) {
  const ref = this.bottomSheet.open(PostMenuSheetComponent, {
    data: { post },
    panelClass: 'post-menu-sheet-panel'
  });
  ref.afterDismissed().subscribe(action => {
    if (action === 'edit') this.openEditPost(post);
    if (action === 'archive') this.archivePost(post.id);
    if (action === 'delete') this.deletePost(post.id);
  });
}
```

Create `PostMenuSheetComponent` as a simple standalone component in
`fit-app/src/app/features/social/social-profile/post-menu-sheet/`:
- 3 items: Edit (`edit` icon), Archive (`archive` icon), Delete (`delete_outline` icon, `var(--accent)` color)
- Each item: 56px min-height, emits the action string via `bottomSheetRef.dismiss('action')`
- Sheet styling: `border-radius: 24px 24px 0 0; background: var(--surface); padding: 12px 16px calc(16px + env(safe-area-inset-bottom))`

Add `MatBottomSheet` import to `social-profile.component.ts`.

On desktop (`> 768px`): the existing `:hover` overlay remains unchanged — do not remove it.

---

### ACTION 2 — Feed Cursor Pagination + Dashboard Ring → `@angular-developer`

This action targets different files from Action 1. Run in parallel.
Read every file before making any change.

**Files to read first:**
- `fit-app/src/app/core/facade/social.facade.ts`
- `fit-app/src/app/api/social.service.ts`
- `fit-app/src/app/features/social/feed/social-feed.component.ts`
- `fit-app/src/app/features/dashboard/dashboard-page.component.ts`
- `fit-app/src/app/features/dashboard/dashboard-page.component.html`
- `fit-app/src/app/features/dashboard/components/dashboard/dashboard.component.ts`
- `fit-app/src/app/features/dashboard/components/dashboard/dashboard.component.html`
- `fit-app/src/app/core/facade/dashboard.facade.ts` (if it exists)
- `fit-app/src/app/core/facade/user.facade.ts`

---

#### 2a. Feed cursor-based pagination

**Context:** The backend `GET /api/social/feed` already supports a `cursor` query parameter —
the frontend is not using it. The feed uses `feedPage` (offset counter) in the facade.
Cursor-based pagination prevents gaps/duplicates when new posts are inserted between page fetches.

**Changes in `social.facade.ts`:**

1. Replace `private feedPage = signal(1)` with:
   ```typescript
   private feedNextCursor = signal<string | null>(null);
   private feedHasMore = signal(true);
   readonly feedHasMore$ = this.feedHasMore.asReadonly();
   ```

2. Update `loadFeed(forceRefresh = false)`:
   ```typescript
   async loadFeed(forceRefresh = false) {
     if (this.feedLoading()) return;
     if (!forceRefresh && !this.feedHasMore()) return;

     if (forceRefresh) {
       this.feedNextCursor.set(null);
       this.feedHasMore.set(true);
       this._feed.set([]);
     }

     this.feedLoading.set(true);
     try {
       const result = await firstValueFrom(
         this.socialService.getFeed(this.feedNextCursor())
       );
       this._feed.update(current =>
         forceRefresh ? result.items : [...current, ...result.items]
       );
       this.feedNextCursor.set(result.nextCursor ?? null);
       this.feedHasMore.set(result.hasMore);
     } finally {
       this.feedLoading.set(false);
     }
   }
   ```

3. Remove the old `feedPage` signal and any `pageSize` calculations.

**Changes in `social.service.ts`:**

Update `getFeed()` signature:
```typescript
getFeed(cursor: string | null = null): Observable<CursorPageResponse<PostResponse>> {
  const params = cursor ? { cursor, pageSize: '20' } : { pageSize: '20' };
  return this.http.get<CursorPageResponse<PostResponse>>(`${this.apiUrl}/social/feed`, { params });
}
```

Add `CursorPageResponse<T>` interface to `social.model.ts` (or import from a shared models file):
```typescript
export interface CursorPageResponse<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
}
```

**Changes in `social-feed.component.ts`:**

The IntersectionObserver sentinel already triggers `facade.loadFeed()`. No changes needed there.
Update the sentinel callback to also check `facade.feedHasMore$()` before calling `loadFeed()`:
```typescript
if (isIntersecting && !this.facade.feedLoading() && this.facade.feedHasMore$()) {
  this.facade.loadFeed();
}
```

Remove any remaining reference to `feedPage` from the component.

**Backend note:** Confirm `GET /api/social/feed` returns `{ items, hasMore, nextCursor }`.
If the backend currently returns a `PaginatedResponse` shape instead, the model mapping
needs to handle both shapes gracefully until the backend is confirmed. Check `social.service.ts`
response type and align.

---

#### 2b. Dashboard daily completion ring

**New component:** `fit-app/src/app/features/dashboard/components/daily-completion-ring/daily-completion-ring.component.ts`

Create as a standalone Angular component.

**Template:**
```html
<div class="completion-ring-container" [class.all-complete]="allComplete()">
  <svg class="ring-svg" viewBox="0 0 80 80" width="80" height="80">
    <!-- Background track -->
    <circle class="ring-track" cx="40" cy="40" r="34" />
    <!-- Progress arc -->
    <circle
      class="ring-progress"
      cx="40" cy="40" r="34"
      [style.stroke-dashoffset]="dashOffset()"
    />
  </svg>
  <div class="ring-center">
    @if (allComplete()) {
      <mat-icon class="ring-complete-icon">check_circle</mat-icon>
    } @else {
      <span class="ring-fraction">{{ completedCount() }}/{{ totalGoals }}</span>
    }
  </div>
  @if (allComplete()) {
    <div class="ring-glow"></div>
  }
</div>
```

**CSS:**
```css
:host { display: block; position: relative; }

.completion-ring-container {
  position: relative;
  width: 80px; height: 80px;
  display: flex; align-items: center; justify-content: center;
}

.ring-svg { position: absolute; top: 0; left: 0; transform: rotate(-90deg); }

.ring-track {
  fill: none;
  stroke: rgba(255,255,255,0.08);
  stroke-width: 6;
}

.ring-progress {
  fill: none;
  stroke: var(--primary);
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: 213.6; /* 2π × 34 */
  transition: stroke-dashoffset 0.6s ease;
}

.ring-center {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: center;
}

.ring-fraction {
  font-size: 14px; font-weight: 800; color: var(--white);
}

.ring-complete-icon {
  font-size: 28px; width: 28px; height: 28px;
  color: var(--primary);
  animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ring-glow {
  position: absolute; inset: -4px;
  border-radius: 50%;
  box-shadow: 0 0 20px rgba(124,77,255,0.5), 0 0 40px rgba(124,77,255,0.2);
  animation: glow-pulse 2s ease-in-out infinite;
}

@keyframes pop-in {
  from { transform: scale(0.5); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
@keyframes glow-pulse {
  0%, 100% { opacity: 0.7; }
  50%       { opacity: 1;   }
}

/* When all complete: upgrade ring color */
.all-complete .ring-progress { stroke: #4ade80; }
```

**Component logic:**
```typescript
@Component({
  selector: 'app-daily-completion-ring',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './daily-completion-ring.component.html',
  styleUrls: ['./daily-completion-ring.component.css']
})
export class DailyCompletionRingComponent {
  // Inputs — pass from parent dashboard component
  @Input({ required: true }) mealLogged = false;    // mealCount >= 1
  @Input({ required: true }) workoutLogged = false; // caloriesBurned > 0 OR workoutSession exists
  @Input({ required: true }) waterMet = false;      // waterConsumedL >= waterTarget
  @Input({ required: true }) stepsMet = false;      // steps >= stepTarget

  readonly totalGoals = 4;
  readonly circumference = 2 * Math.PI * 34; // 213.6

  readonly completedCount = computed(() =>
    [this.mealLogged, this.workoutLogged, this.waterMet, this.stepsMet]
      .filter(Boolean).length
  );

  readonly allComplete = computed(() => this.completedCount() === this.totalGoals);

  readonly dashOffset = computed(() => {
    const progress = this.completedCount() / this.totalGoals;
    return this.circumference * (1 - progress);
  });
}
```

Note: `@Input()` signals with `computed()` work in Angular 19. If the inputs are signals
rather than plain values, adjust using `input()` instead of `@Input()`.

**Integration — add the ring to the dashboard:**

In `dashboard.component.html` (the greeting/header component, not the full page):
Add `<app-daily-completion-ring>` as the first visible element, to the left of or above
the greeting text:
```html
<div class="dashboard-header-row">
  <app-daily-completion-ring
    [mealLogged]="(facade.dailyToday()?.mealCount ?? 0) >= 1"
    [workoutLogged]="(facade.dailyToday()?.caloriesBurned ?? 0) > 0"
    [waterMet]="(facade.dailyToday()?.waterConsumedL ?? 0) >= (userFacade.waterTargetFromMetrics() ?? 2)"
    [stepsMet]="(facade.dailyToday()?.steps ?? 0) >= (facade.stepTarget() ?? 8000)"
  />
  <div class="dashboard-greeting-text">
    <!-- existing greeting, date, streak content -->
  </div>
</div>
```

Add to `DashboardComponent` imports: `DailyCompletionRingComponent`.

Check that `facade.dailyToday()` or equivalent signal exists and exposes `mealCount`,
`caloriesBurned`, `waterConsumedL`, `steps`. If the facade uses different field names,
adjust the bindings to match. Read `dashboard.facade.ts` first to confirm field names.

---

#### 2c. Fix `UserFacade` delegations — plain values → computed signals

**File:** `fit-app/src/app/core/facade/user.facade.ts`

**Problem:** `get meals()` and `get workoutTemplates()` return plain values (snapshots),
not reactive signals. Components reading these won't update when underlying data changes.

Find the methods in `user.facade.ts` that delegate to `NutritionTabFacade` and `WorkoutsTabFacade`.
Replace plain getter methods with `computed()` signals:

```typescript
// BEFORE (breaks reactivity):
get meals() { return this.nutritionTabFacade._meals(); }
get workoutTemplates() { return this.workoutsTabFacade.templates(); }

// AFTER (reactive):
readonly meals = computed(() => this.nutritionTabFacade._meals());
readonly workoutTemplates = computed(() => this.workoutsTabFacade.templates());
```

Read the file first — the exact method names and the facade method they call may differ.
Adjust to match what you find. The principle is: replace any `get X()` delegation with
`readonly X = computed(() => this.otherFacade.X())`.

After changing, grep for any template or component using `userFacade.meals` or
`userFacade.workoutTemplates` to confirm they read them as signals (with `()` call syntax).

---

### ACTION 3 — Backend: Workout Share Expansion → `@dotnet-developer`

Read every file listed before making any change.

**Files to read first:**
- `FitApp.Api/Controllers/SocialController.cs`
- `FitApp.Api/Services/SocialService.cs`
- `FitApp.Api/Models/DTOs/SocialDtos.cs`
- `FitApp.Api/Models/Entities/` (Post, WorkoutTemplate, WorkoutSession if it exists)

---

#### 3a. Expand `POST /api/social/posts/from-workout/{sessionId}` with structured exercise data

**Context:** The current endpoint creates a post from a workout but the `LinkedContentPreview`
only contains `{ type, title, subtitle }` — no exercise breakdown, no sets/reps/weights.
The frontend needs structured data to render workout summary cards in the feed (Sprint 4).

**Step 1 — Add `LinkedContentData` DTO to `SocialDtos.cs`:**
```csharp
public record WorkoutExerciseSummaryDto(
    string ExerciseName,
    int Sets,
    int Reps,
    decimal WeightKg,
    bool IsPersonalRecord = false
);

public record LinkedWorkoutDataDto(
    string WorkoutTitle,
    string WorkoutType,
    int DurationMinutes,
    int ExerciseCount,
    decimal TotalVolumeKg,
    IEnumerable<WorkoutExerciseSummaryDto> TopExercises  // max 3
);
```

**Step 2 — Update `PostFromWorkoutRequest` response** to include the new data.

Find the existing `PostFromWorkoutAsync` method in `SocialService.cs` (or similar).
After creating the post, populate `LinkedWorkoutDataDto`:

```csharp
// Load the workout template with exercises
var workout = await db.WorkoutTemplates
    .Include(w => w.Exercises)
    .FirstOrDefaultAsync(w => w.Id == workoutId && w.UserId == userId);

if (workout == null) return NotFound();

var topExercises = workout.Exercises
    .Take(3)
    .Select(e => new WorkoutExerciseSummaryDto(
        ExerciseName: e.Name,
        Sets: e.Sets,
        Reps: e.Reps,
        WeightKg: e.WeightKg,
        IsPersonalRecord: false  // PR detection is a future enhancement — default false for now
    ));

var linkedData = new LinkedWorkoutDataDto(
    WorkoutTitle: workout.Title,
    WorkoutType: workout.Type.ToString(),
    DurationMinutes: workout.DurationMin,
    ExerciseCount: workout.Exercises.Count,
    TotalVolumeKg: workout.Exercises.Sum(e => (decimal)(e.Sets * e.Reps) * e.WeightKg),
    TopExercises: topExercises
);
```

**Step 3 — Add `LinkedWorkoutData` property to `PostResponse`:**
```csharp
public LinkedWorkoutDataDto? LinkedWorkoutData { get; init; }
```

Populate this property in the `PostResponse` projection for posts where `LinkedWorkoutId != null`:
In `GetFeedAsync`, `GetDiscoverAsync`, and `GetPostAsync`, extend the Select projection to include
`LinkedWorkoutData` for linked workout posts. Since loading exercises for every feed post would be
an N+1, use a conditional Include:

```csharp
.Include(p => p.LinkedWorkout)
  .ThenInclude(w => w.Exercises)
```

Add this Include only to endpoints that serve single posts or small lists.
For the feed endpoint, only populate `LinkedWorkoutData` for posts where `p.LinkedWorkoutId != null`
(most posts won't have it, so the ThenInclude cost is minimal in practice with SQLite).

**Step 4 — Verify the endpoint route exists and is accessible.**
The route should be: `POST /api/social/posts/from-workout/{workoutId}` with `[Authorize]`.
If the route doesn't exist yet, create it in `SocialController.cs` calling the new service method.

**Privacy guardrail (critical — do not skip):**
`LinkedWorkoutDataDto` MUST NOT include:
- Estimated calories burned
- Body weight or BMI
- Heart rate data
- Any health metric from `DailyEntry`

It MUST only include: workout name, type, duration, exercise names, sets, reps, weight lifted.
This follows the existing privacy framework in `social.model.ts` (check `ShareToSocialData` comments).

---

### ACTION 4 — Design System: Token Enforcement → `@design-system-architect`

Read every file listed before making any change.
This action is purely CSS changes — no TypeScript, no template changes.

**Files to read first:**
- `fit-app/src/styles.css` (the `:root` token definitions)
- `fit-app/src/app/features/onboarding/onboarding-wizard.component.css`
- `fit-app/src/app/features/dashboard/components/daily-user-data/daily-user-data.component.css`
- `fit-app/src/app/features/workouts/workouts-content.component.css`
- `fit-app/src/app/features/social/social-profile/social-profile.component.css`
- `fit-app/src/app/features/blog/blog-content/blog-content.component.css`

---

#### 4a. Add glassmorphism surface tokens to `styles.css`

Add these new tokens to the `:root` block in `styles.css` (near the existing glass/blur tokens):
```css
/* Glassmorphism surfaces */
--glass-bg-subtle:  rgba(255,255,255,0.025);
--glass-bg-medium:  rgba(255,255,255,0.04);
--glass-bg-strong:  rgba(255,255,255,0.06);
--glass-border-subtle:  rgba(255,255,255,0.06);
--glass-border-default: rgba(255,255,255,0.08);
--glass-border-strong:  rgba(255,255,255,0.12);

/* Blur tiers */
--blur-light:  4px;
--blur-medium: 12px;
--blur-heavy:  20px;

/* Z-index scale */
--z-base:    1;
--z-sticky:  100;
--z-drawer:  200;
--z-overlay: 800;
--z-modal:   900;
--z-fab:     950;
--z-toast:   1000;
```

---

#### 4b. Replace hardcoded hex values — worst 5 files first

For each file, replace raw hex values with the correct token:

**Mapping:**
- `#7c4dff` → `var(--primary)`
- `#0d0d10` → `var(--surface)`
- `#ff4081` → `var(--accent)`
- `#a78bfa` → `var(--primary-light)`
- `#ffb74d` → `var(--color-warning)`
- `rgba(255,255,255,0.025)` → `var(--glass-bg-subtle)` ← only after adding the token in 4a
- `rgba(255,255,255,0.04)` → `var(--glass-bg-medium)` ← only after adding the token in 4a
- `rgba(255,255,255,0.08)` → `var(--glass-border-default)` ← only after adding the token in 4a

**Do NOT replace hex values that are inside `:root {}` token definitions themselves.**
**Do NOT replace hex values used as fallbacks inside `var()` — e.g., `var(--primary, #7c4dff)` is acceptable.**

**File 1: `onboarding-wizard.component.css`** (13 raw `#7c4dff` occurrences)
Replace all `#7c4dff` with `var(--primary)`.

**File 2: `daily-user-data.component.css`** (17 raw color occurrences)
Replace `#7c4dff` → `var(--primary)`, `#a78bfa` → `var(--primary-light)`, `#ffb74d` → `var(--color-warning)`, `#0d0d10` → `var(--surface)`.

**File 3: `workouts-content.component.css`** (9 raw occurrences)
Replace `#7c4dff` → `var(--primary)`, `#a78bfa` → `var(--primary-light)`.

**File 4: `social-profile.component.css`**
Replace `#ff4081` → `var(--accent)`, `#7c4dff` → `var(--primary)`, `#a78bfa` → `var(--primary-light)`.

**File 5: `blog-content.component.css`**
Replace `#a78bfa` → `var(--primary-light)`, `#7c4dff` → `var(--primary)`.

---

#### 4c. Add `-webkit-backdrop-filter` prefix (iOS Safari fix)

**Critical:** iOS Safari requires the `-webkit-` prefix for glass effects. Without it, all
glassmorphism surfaces appear as plain dark backgrounds on iPhone — the primary target device.

For every occurrence of `backdrop-filter: blur(...)` in the 5 files above, add the webkit
prefixed line immediately above it:
```css
/* BEFORE */
backdrop-filter: blur(20px);

/* AFTER */
-webkit-backdrop-filter: blur(20px);
backdrop-filter: blur(20px);
```

Also check `styles.css` for any `backdrop-filter` lines without the webkit prefix and add them.

---

#### 4d. Remove redundant `font-family: Poppins` declarations

`styles.css` already sets `* { font-family: "Poppins", sans-serif; }` globally.
Any component CSS file that re-declares `font-family: 'Poppins', sans-serif` or
`font-family: "Poppins"` is redundant.

In the 5 files from 4b, remove all `font-family: Poppins` or `font-family: 'Poppins', sans-serif`
declarations from component CSS rules (they are dead weight).

---

## S — SCENARIO

### What success looks like after Sprint 3:

**Profile:**
- Opening any social profile on mobile shows: athlete stat strip (STREAK / THIS MONTH / TOTAL)
  as the dominant data, not a follower count
- Scrolling slightly reveals a 12-week heatmap grid with purple squares for workout days
- Achievement chips appear below for earned milestones (7-day streak, 10 workouts, etc.)
- Tapping the 3-dot on a post grid cell opens a bottom sheet with Edit/Archive/Delete — no hover required

**Feed:**
- The feed no longer has a `feedPage` counter — it uses cursor from the API response
- Navigating away and back does not cause duplicate posts
- Pull-to-refresh and infinite scroll both work correctly with the new cursor logic

**Dashboard:**
- The greeting area shows a circular completion ring (0/4 → 4/4 as the day progresses)
- When all 4 goals are met, the ring turns green and glows
- The ring updates reactively as the user logs meals, water, steps, workouts

**Backend:**
- `POST /api/social/posts/from-workout/{id}` returns `linkedWorkoutData` with exercise breakdown
- No health metrics (calories, weight, heart rate) in the linked workout data

**Design system:**
- The 5 worst CSS files no longer contain raw `#7c4dff`, `#0d0d10`, `#ff4081`, `#a78bfa`
- All `backdrop-filter` lines in those files have `-webkit-backdrop-filter` above them
- New glassmorphism tokens exist in `:root` for future use

---

## T — TASK

**Execute Actions 1, 2, 3, and 4 in parallel.**

File overlap check:
- Action 1 and Action 2: NO overlap (different feature areas)
- Action 1 and Action 3: NO overlap (frontend vs backend)
- Action 1 and Action 4: POTENTIAL overlap on `social-profile.component.css`
  → Action 4 should process `social-profile.component.css` AFTER Action 1 finishes it,
    or Action 1 agent should already use tokens for any new CSS it writes (preferred approach)
- Action 2 and Action 4: NO overlap
- Action 3 and Action 4: NO overlap (backend vs CSS)

**Rules:**
- READ every file before editing
- Never hardcode hex values — use CSS custom properties
- All new Angular subscriptions must use `takeUntilDestroyed()`
- No `any` types in TypeScript
- No new npm packages
- Always add `-webkit-backdrop-filter` alongside `backdrop-filter`
- Privacy guardrail: `LinkedWorkoutDataDto` must NEVER include calories, body weight, or health metrics
- Run `ng build` after Angular changes to verify no TypeScript errors

---
_Sprint 3 | Branch: Fix-Release | Generated: 2026-06-23_
