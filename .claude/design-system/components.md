# NovaFit Design System -- Component Inventory & Specs

**Author:** @design-system-architect
**Date:** 2026-06-04
**Consumers:** @uiux-designer, @angular-developer
**Depends on:** `tokens.md` (token definitions must be merged first)

---

## SECTION 1 -- Existing Component Audit

Classification per component:
- **SOLID**: Keep as-is
- **IMPROVE**: Update visuals or interactions, pattern is correct
- **REPLACE**: Fundamentally wrong pattern for the use case
- **MISSING**: Needed for redesign but does not exist

### Shared Components

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| Header | `shared/components/header/` | IMPROVE | 10 hardcoded `#fff`, needs token migration. Streak badge placement is correct. |
| Footer | `shared/components/footer/` | SOLID | Well-tokenized with `var()`. Footer-specific gradient is acceptable. |
| ConfirmDialog | `shared/components/confirm-dialog/` | SOLID | Uses tokens correctly. Inline styles in `.ts` file should move to `.css`. |
| MoveUp (scroll-to-top) | `shared/components/move-up/` | SOLID | Good token usage, good animation. |
| StreakBadge | `shared/components/streak-badge/` | IMPROVE | Token usage is good. Visual weight is insufficient per UX audit (D5). Needs size increase on Dashboard. |
| WorkoutSetRow | `shared/components/workout-set-row/` | SOLID | Uses `var()` with fallbacks. Custom keyframes for completion feedback. Well-designed. |
| ShareToSocialBottomSheet | `shared/components/share-to-social-bottom-sheet/` | SOLID | Good token usage via `--primary-rgb`. Animation and states well-defined. |

### Core Components

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| AiChatBottomSheet | `core/components/ai-chat-bottom-sheet/` | SOLID | Context-adaptive colors. Good token usage. |
| AiChatFab | `core/components/ai-chat-fab/` | SOLID | Entrance animation, glow pulse. |

### Dashboard Components

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| DashboardPage | `features/dashboard/dashboard-page.component` | REPLACE | Shell component renders greeting + daily-user-data + previous-days with no progress visualization. Needs complete restructure per UX audit (D1, D3). |
| Dashboard (greeting) | `features/dashboard/dashboard/` | IMPROVE | Greeting strip is functional. Streak chip needs prominence upgrade (D5). Ctrl-bar needs repositioning (D3). |
| DailyUserData | `features/dashboard/daily-user-data/` | REPLACE | Three monolithic cards with inverted mobile hierarchy (D2). Macro entry is form-first not progress-first (D8). 20+ hardcoded colors. |
| DailyEntryCalorieSummary | `features/dashboard/daily-entry-calorie-summary/` | REPLACE | Shows raw kcal number. Needs to become "Calories Remaining" display (competitive analysis). |
| PreviousDailyUserData | `features/dashboard/previous-daily-user-data/` | IMPROVE | Functional history view. Should collapse to accordion (D7). 10+ hardcoded colors. |
| CalorieBalanceCard | `features/dashboard/calorie-balance-card/` | IMPROVE | Good surplus/deficit logic. Hardcoded colors (`#ff9800`, `#4caf50`) need tokenizing. |
| AiMealAnalyzer | `features/dashboard/daily-user-data/ai-meal-analyzer/` | IMPROVE | Complex but functional. 15+ hardcoded colors. NOVA score colors need tokens. |

### Social Components

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| SocialShell | `features/social/social-shell.component` | IMPROVE | Shell layout works. Daily panel FAB is read-only dead-end (S8). |
| SocialFeed | `features/social/feed/` | IMPROVE | IntersectionObserver works. Missing pull-to-refresh (S3). Skeleton states present. |
| SocialFeedGuidedEmpty | `features/social/feed/guided-empty/` | SOLID | Well-structured guided empty state. Uses global `.guided-empty-*` classes. |
| PostCard | `features/social/components/post-card/` | REPLACE | Chrome-heavy (S2). Linked fitness content is near-invisible (S1). Single template for all types. Needs type-specific card templates per Strava pattern. |
| CreateContent | `features/social/components/create-content/` | IMPROVE | Image-before-text order wrong (S9). Functional otherwise. |
| EditPost | `features/social/components/edit-post/` | SOLID | |
| WriteArticle | `features/social/components/write-article/` | SOLID | |
| SideNav | `features/social/components/side-nav/` | SOLID | |
| BottomNav | `features/social/components/bottom-nav/` | IMPROVE | Missing bridge back to tracking (S10). |
| TopBar | `features/social/components/top-bar/` | IMPROVE | 2 rogue colors (`#a07cff`, `#ff5252`). Functional. |
| DailyPanel | `features/social/components/daily-panel/` | IMPROVE | Read-only dead-end (S8). Needs quick-log actions. 15+ hardcoded colors. |
| SuggestedUsers | `features/social/components/suggested-users/` | IMPROVE | Silently hides when empty -- needs fallback message (S5). |
| SocialDiscover | `features/social/discover/` | IMPROVE | Empty states have no CTA (S5). Loading/error states correct. |
| SocialNotifications | `features/social/notifications/` | IMPROVE | No grouping (S6). Wrong timestamp format. Flat list. |
| SocialProfile | `features/social/social-profile/` | IMPROVE | Social-first not athletic-first (S4). 2 rogue surface colors. |
| StatsTab | `features/social/social-profile/stats-tab/` | SOLID | Charts work. |
| SocialChat | `features/social/chat/` | SOLID | |
| SocialChatDetail | `features/social/chat-detail/` | SOLID | Real-time SignalR works. |
| ArticleDetail | `features/social/article-detail/` | SOLID | |
| PostDetail | `features/social/post-detail/` | SOLID | |

### Other Feature Components

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| Login | `features/auth/login/` | SOLID | Auth-specific dark colors intentional. |
| Register | `features/auth/register/` | SOLID | Goal shake animation good. Some hardcoded colors. |
| OnboardingWizard | `features/onboarding/onboarding-wizard.component` | IMPROVE | 18+ hardcoded colors -- worst offender. Token migration needed. |
| OnboardingCarousel | `features/onboarding/carousel/` | SOLID | Good animations. |
| OnboardingBiometrics | `features/onboarding/biometrics/` | SOLID | |
| YourNumbersReveal | `features/onboarding/your-numbers/` | SOLID | |
| WorkoutsContent | `features/workouts/workouts-content/` | IMPROVE | 10+ hardcoded colors. Type/level pills need semantic tokens. |
| ActiveWorkoutSession | `features/workouts/active-session/` | SOLID | Timer animations, set completion feedback. |
| WorkoutCompletionCard | `features/workouts/active-session/workout-completion-card/` | SOLID | Good celebration animations (completion-card-in, tile-pop). Model for other celebrations. |
| NutritionTab | `features/user/nutrition-tab/` | IMPROVE | Macro chips use hardcoded colors. Need `--macro-*` tokens. |
| MealCompletionFeedback | `features/user/nutrition-tab/meal-completion-feedback/` | SOLID | Good bar-fill animation. Uses tokens with fallbacks. |
| FoodSearch | `features/user/nutrition-tab/food-search/` | SOLID | |
| RecentFoods | `features/user/nutrition-tab/recent-foods/` | SOLID | |
| UserPage | `features/user/user-page.component` | IMPROVE | 10+ hardcoded colors. Streak animation present. |
| ProfileTab | `features/user/profile-tab/` | IMPROVE | Avatar camera overlay good. 5+ hardcoded colors. |
| PhysicalStats | `features/user/physical-stats/` | IMPROVE | Hardcoded colors. |
| FitnessMetrics | `features/user/fitness-metrics/` | IMPROVE | Hardcoded colors. |
| WorkoutsTab | `features/user/workouts-tab/` | IMPROVE | 10+ hardcoded colors. |
| Blog | `features/blog/blog.component` | SOLID | |
| BlogContent | `features/blog/blog-content/` | IMPROVE | 6+ hardcoded colors. |
| BlogPostDetail | `features/blog/blog-post-detail/` | SOLID | |
| OpenAI (AI chat page) | `features/openai/openai.component` | SOLID | |
| Groq (chat messages) | `features/openai/groq/` | SOLID | msgIn keyframe, bounce typing. |
| GroqSidenav | `features/openai/groq-sidenav/` | IMPROVE | 2 rogue colors. |

---

## SECTION 2 -- MISSING Components (New for Redesign)

### 2.1 MetricCard

**Purpose:** The core building block of the redesigned Dashboard. Displays a single tracked metric (calories, water, steps, weight, macros) with progress visualization, current value, target, and quick-log action. Replaces the monolithic card approach.

**Where it appears:** Dashboard main grid, daily panel in beSocial shell.

**Structure:**
```html
<div class="metric-card" [class.metric-card--complete]="isComplete">
  <div class="metric-card-header">
    <div class="metric-card-icon">
      <mat-icon>{{ icon }}</mat-icon>
    </div>
    <span class="metric-card-label">{{ label }}</span>
    <span class="metric-card-badge" *ngIf="badge">{{ badge }}</span>
  </div>
  <div class="metric-card-body">
    <span class="metric-card-value">{{ currentValue }}</span>
    <span class="metric-card-unit">{{ unit }}</span>
    <span class="metric-card-target">/ {{ target }}</span>
  </div>
  <div class="metric-card-progress">
    <!-- Linear progress bar OR mini ring depending on variant -->
    <div class="metric-card-bar">
      <div class="metric-card-bar-fill" [style.width.%]="percentage"></div>
    </div>
  </div>
  <div class="metric-card-action" *ngIf="quickAction">
    <button class="metric-card-quick-btn">{{ quickAction.label }}</button>
  </div>
</div>
```

**Token References:**
- Background: `var(--surface-card)`
- Border: `var(--border-default)`
- Border hover: `var(--border-strong)`
- Icon container bg: `rgba(var(--primary-rgb), 0.14)` or semantic color bg
- Label: `var(--text-tertiary)`
- Value: `var(--text-primary)`
- Target: `var(--text-muted)`
- Bar track: `var(--surface-active)`
- Bar fill: Contextual -- `var(--ring-calorie)` / `var(--ring-water)` / `var(--ring-activity)` depending on metric type
- Card radius: `var(--radius-lg)`

**States:**

| State | Visual Change | CSS |
|-------|---------------|-----|
| Default | Card at rest, bar at current progress | `background: var(--surface-card); border: 1px solid var(--border-default);` |
| Hover | Slight lift, border brightens | `transform: translateY(-4px); border-color: var(--border-strong); box-shadow: var(--shadow-card-hover); transition: all var(--duration-standard) var(--ease-standard);` |
| Active/Pressed | Scale down slightly | `transform: scale(0.98); transition: transform var(--duration-micro) var(--ease-standard);` |
| Disabled | Reduced opacity, no interaction | `opacity: 0.4; pointer-events: none;` |
| Loading | Skeleton pulse on value and bar | `animation: pulse var(--duration-celebration) infinite; background: var(--surface-hover);` |
| Empty | Value shows "--", bar at 0, quick-log CTA prominent | Value: `var(--text-muted)`, CTA button uses `btn-primary` styling |
| Error | Error icon, retry text in body | Icon: `var(--color-error)`, retry button uses `btn-ghost` |
| Success/Complete | Green checkmark, border glow, bar full | `border-color: rgba(74, 222, 128, 0.3); .metric-card-icon { background: var(--color-success-bg); color: var(--color-success); }` |

**Sizing:**
- Min height: `120px` (15 x 8px)
- Padding: `16px` (2 x 8px)
- Icon container: `40px` (5 x 8px)
- Quick-log button: min `48px` height (touch target)
- Gap between elements: `8px`

**Motion:**
- Enter: `slideUp`, `var(--duration-emphasis)`, `var(--ease-decelerate)`, stagger 50ms per card
- Bar fill: `width`, `var(--duration-celebration)`, `var(--ease-standard)`, starts 200ms after card enter
- Complete state: border glow pulse once, `var(--duration-celebration)`, `var(--ease-spring)`

**Do / Don't:**
- DO: Use contextual color per metric type (calorie=purple, water=cyan, activity=green)
- DO: Always show target alongside current value -- never a raw number alone
- DON'T: Use glassmorphism on this card -- it lives in the main flow, not an overlay
- DON'T: Exceed `var(--duration-emphasis)` for any card transition

---

### 2.2 ProgressRing

**Purpose:** Circular SVG progress indicator showing completion percentage. Used for calories, water, and activity on the Dashboard hero section. Replaces the current linear progress bars for primary daily goals.

**Where it appears:** Dashboard hero area (large), MetricCard variant (small), DailyPanel in beSocial.

**Structure:**
```html
<div class="progress-ring" [class]="'progress-ring--' + size">
  <svg viewBox="0 0 100 100" class="progress-ring-svg">
    <!-- Track (background circle) -->
    <circle class="progress-ring-track"
      cx="50" cy="50" r="42"
      stroke-width="8"
      fill="none" />
    <!-- Fill (progress arc) -->
    <circle class="progress-ring-fill"
      cx="50" cy="50" r="42"
      stroke-width="8"
      fill="none"
      [style.stroke-dashoffset]="dashOffset"
      stroke-linecap="round" />
  </svg>
  <div class="progress-ring-content">
    <span class="progress-ring-value">{{ value }}</span>
    <span class="progress-ring-label">{{ label }}</span>
  </div>
</div>
```

**SVG Math:**
- Circumference: `2 * PI * 42 = 263.89`
- `stroke-dasharray: 263.89`
- `stroke-dashoffset: 263.89 * (1 - percentage / 100)`
- Transform: `rotate(-90deg)` on the fill circle to start from top

**Token References:**
- Track stroke: `var(--ring-calorie-bg)` / `var(--ring-water-bg)` / `var(--ring-activity-bg)`
- Fill stroke: `var(--ring-calorie)` / `var(--ring-water)` / `var(--ring-activity)`
- Stroke width: `var(--ring-stroke-width)` (8px)
- Value text: `var(--text-primary)`
- Label text: `var(--text-tertiary)`

**Variants:**

| Variant | Size Token | Value Font | Label Font | Use |
|---------|-----------|------------|------------|-----|
| `sm` | `var(--ring-size-sm)` / 96px | 20px / 800 | 10px / 600 | Inline in metric cards, daily panel |
| `md` | `var(--ring-size-md)` / 136px | 28px / 800 | 12px / 600 | Dashboard secondary rings |
| `lg` | `var(--ring-size-lg)` / 192px | 40px / 800 | 14px / 600 | Dashboard hero ring |

**States:**

| State | Visual Change | CSS |
|-------|---------------|-----|
| Default | Ring at current fill | Computed `stroke-dashoffset` |
| Hover | N/A -- rings are display-only, not interactive | |
| Active | N/A | |
| Disabled | Track only, no fill, muted colors | `opacity: 0.3;` |
| Loading | Track pulses, no fill | `.progress-ring-track { animation: pulse 1.5s infinite; }` |
| Empty | Ring at 0%, value shows "0" | `stroke-dashoffset: 263.89` (full offset) |
| Error | Red track, "!" icon in center | `stroke: var(--color-error); .progress-ring-value { content: '!'; }` |
| Complete (100%) | Fill complete, brief celebration | Glow pulse on fill stroke, value turns `var(--color-success)`. If `size === 'lg'`, trigger confetti keyframe. |

**Motion:**
- Initial fill: `stroke-dashoffset` transition, `1200ms`, `cubic-bezier(0.4, 0, 0.2, 1)` -- slow and satisfying
- Value counter: Count from 0 to current value over `800ms` (use `requestAnimationFrame` in component)
- Ring close (100%): Glow pulse, `var(--duration-celebration)`, `var(--ease-spring)`

**Do / Don't:**
- DO: Use SVG, not canvas -- SVG scales perfectly and is accessible
- DO: Always pair with a value + label inside the ring
- DO: Use `stroke-linecap: round` for the fill stroke -- looks polished
- DON'T: Animate on every data refresh -- only animate on first render and when value crosses a threshold (25%, 50%, 75%, 100%)
- DON'T: Use more than 3 concentric rings -- Apple uses 3, and more becomes unreadable

**Reference:** Apple Fitness+ Activity Rings. SVG ring pattern from Radix Themes circular progress.

---

### 2.3 ActivityFeedItem (Redesigned PostCard)

**Purpose:** Type-specific social feed card that surfaces fitness data prominently. Replaces the current unified `post-card.component` with template branching per content type. This is not a new component file -- it is a redesign of the existing `PostCard` with new visual templates.

**Where it appears:** Social feed, discover feed, profile posts tab.

**Type Templates:**

#### 2.3a. Workout Post Card
```html
<div class="feed-card feed-card--workout">
  <div class="feed-card-header">
    <img class="feed-card-avatar" [src]="post.author.avatar" />
    <div class="feed-card-meta">
      <span class="feed-card-name">{{ post.author.displayName }}</span>
      <span class="feed-card-time">{{ post.createdAt | relativeTime }}</span>
    </div>
    <button class="feed-card-menu" mat-icon-button>
      <mat-icon>more_horiz</mat-icon>
    </button>
  </div>
  <div class="feed-card-text" *ngIf="post.content">{{ post.content }}</div>
  <!-- WORKOUT FITNESS DATA BLOCK -->
  <div class="fitness-data-block fitness-data-block--workout">
    <div class="fitness-data-accent"></div>
    <div class="fitness-data-header">
      <mat-icon class="fitness-data-icon">fitness_center</mat-icon>
      <span class="fitness-data-title">{{ linkedContent.title }}</span>
    </div>
    <div class="fitness-data-stats">
      <div class="fitness-stat">
        <span class="fitness-stat-value">{{ exerciseCount }}</span>
        <span class="fitness-stat-label">exercises</span>
      </div>
      <div class="fitness-stat">
        <span class="fitness-stat-value">{{ totalSets }}</span>
        <span class="fitness-stat-label">sets</span>
      </div>
      <div class="fitness-stat">
        <span class="fitness-stat-value">{{ totalVolume }}</span>
        <span class="fitness-stat-label">kg volume</span>
      </div>
      <div class="fitness-stat">
        <span class="fitness-stat-value">~{{ estCalories }}</span>
        <span class="fitness-stat-label">kcal</span>
      </div>
    </div>
  </div>
  <div class="feed-card-image" *ngIf="post.imageUrl">
    <img [src]="post.imageUrl" />
  </div>
  <div class="feed-card-footer">
    <!-- Reaction bar with expanded reactions -->
    <div class="feed-card-reactions">
      <button class="reaction-btn" *ngFor="let r of reactions" [class.active]="r.active">
        <mat-icon>{{ r.icon }}</mat-icon>
      </button>
      <span class="reaction-count">{{ totalReactions }}</span>
    </div>
    <button class="feed-card-comment-btn">
      <mat-icon>chat_bubble_outline</mat-icon>
      <span>{{ commentCount }}</span>
    </button>
  </div>
</div>
```

#### 2.3b. Meal Post Card
Same header/footer. Fitness data block becomes:
```html
<div class="fitness-data-block fitness-data-block--meal">
  <div class="fitness-data-accent" style="background: var(--fitness-card-meal-accent)"></div>
  <div class="fitness-data-header">
    <mat-icon class="fitness-data-icon">restaurant</mat-icon>
    <span class="fitness-data-title">{{ linkedContent.title }}</span>
    <span class="fitness-data-kcal">{{ totalKcal }} kcal</span>
  </div>
  <div class="fitness-data-macros">
    <div class="macro-chip macro-chip--protein">P: {{ protein }}g</div>
    <div class="macro-chip macro-chip--carbs">C: {{ carbs }}g</div>
    <div class="macro-chip macro-chip--fat">F: {{ fat }}g</div>
  </div>
</div>
```

**Token References:**
- Fitness data block bg: `var(--fitness-card-bg)`
- Fitness data block border: `var(--fitness-card-border)`
- Workout accent band: `var(--fitness-card-accent)` (3px left border)
- Meal accent band: `var(--fitness-card-meal-accent)` (3px left border)
- Stat value: `var(--text-primary)` at `var(--fitness-stat-size)` / `var(--fitness-stat-weight)`
- Stat label: `var(--text-tertiary)` at `var(--text-xs)`
- Avatar: 32px circle (down from 36px to reduce chrome)
- Name: `var(--text-primary)` at `var(--text-base)` / `var(--weight-semibold)`
- Time: `var(--text-tertiary)` at `var(--text-sm)`
- Fitness data block radius: `var(--radius-md)`

**States:**

| State | Visual Change | CSS |
|-------|---------------|-----|
| Default | Card at rest | `background: var(--surface-card); border: 1px solid var(--border-default);` |
| Hover | Border brightens | `border-color: var(--border-strong); transition: border-color var(--duration-micro) var(--ease-standard);` |
| Active/Pressed | N/A for feed cards -- tap navigates to detail | |
| Disabled | N/A | |
| Loading | Skeleton: avatar circle + 2 text bars + fitness block placeholder | `animation: pulse 1.5s infinite;` |
| Empty | N/A -- posts always have content | |
| Error | N/A -- handled at feed level | |
| Success | Reaction button pulses once on tap | `animation: reaction-pop var(--duration-standard) var(--ease-spring);` |

**Sizing:**
- Card padding: `16px` (2 x 8px)
- Header row height: `40px` (avatar 32px + padding)
- Fitness data block padding: `16px`
- Footer height: `40px`
- Stat grid gap: `16px`
- Min touch target on all buttons: `48px x 48px`

**Do / Don't:**
- DO: Make fitness data block the tallest visual element for workout/meal posts
- DO: Use the accent band color to differentiate workout (purple) from meal (green) at a glance
- DON'T: Show fitness data as a single-line subtitle -- use a structured stat grid
- DON'T: Show follow button in the header for users you already follow -- only for unfollowed

---

### 2.4 UserStatsChip

**Purpose:** Compact display of a user's athletic identity. Shows goal badge, streak count, and workout frequency. Used in profile headers, discover cards, and post headers when relevant.

**Where it appears:** Social profile header (below stats row), discover user cards, optionally in post card headers.

**Structure:**
```html
<div class="user-stats-chip">
  <span class="usc-goal" [class]="'usc-goal--' + fitnessGoal">{{ goalLabel }}</span>
  <span class="usc-divider"></span>
  <span class="usc-streak" *ngIf="streak > 0">
    <mat-icon>local_fire_department</mat-icon>
    {{ streak }}
  </span>
  <span class="usc-divider" *ngIf="streak > 0"></span>
  <span class="usc-workouts">{{ monthlyWorkouts }} this month</span>
</div>
```

**Token References:**
- Container bg: `var(--surface-card)`
- Container border: `var(--border-default)`
- Container radius: `var(--radius-pill)`
- Goal text (lose): `var(--accent)` on `var(--accent-background)`
- Goal text (gain): `var(--color-success)` on `var(--color-success-bg)`
- Goal text (maintain): `var(--color-info)` on `var(--color-info-bg)`
- Streak icon: `var(--color-streak)`
- Streak text: `var(--text-primary)` at `var(--text-xs)` / `var(--weight-bold)`
- Workout count: `var(--text-secondary)` at `var(--text-xs)`
- Divider: `var(--border-subtle)`, 1px, 16px tall

**States:**

| State | Visual Change | CSS |
|-------|---------------|-----|
| Default | Resting | Standard styling |
| Hover | N/A -- informational, not interactive | |
| Active | N/A | |
| Disabled | N/A | |
| Loading | Skeleton bar 160px wide | `animation: pulse 1.5s infinite; width: 160px; height: 28px; border-radius: var(--radius-pill);` |
| Empty (no data) | Shows only goal badge | Hide streak and workout dividers |
| Error | N/A -- degrades gracefully to empty | |
| Success | N/A | |

**Sizing:**
- Height: `32px` (4 x 8px)
- Padding: `4px 12px`
- Icon size: `14px`
- Min-width: `120px`

---

### 2.5 BottomSheet (Shared Pattern)

**Purpose:** Standardized bottom sheet overlay used across the app. Currently implemented ad-hoc in share-to-social, ai-chat, and create-content with inconsistent styling. This defines the canonical pattern.

**Where it appears:** Share card, AI chat, create content, workout completion, future metric detail views.

**Structure:**
```html
<div class="bottom-sheet-backdrop" (click)="dismiss()">
  <div class="bottom-sheet" [class]="'bottom-sheet--' + size" (click)="$event.stopPropagation()">
    <div class="bottom-sheet-handle"></div>
    <div class="bottom-sheet-header" *ngIf="title">
      <h3 class="bottom-sheet-title">{{ title }}</h3>
      <button class="bottom-sheet-close" (click)="dismiss()">
        <mat-icon>close</mat-icon>
      </button>
    </div>
    <div class="bottom-sheet-body">
      <ng-content></ng-content>
    </div>
  </div>
</div>
```

**Token References:**
- Backdrop: `var(--overlay-scrim)`
- Sheet bg: `var(--surface)` (opaque, not transparent for bottom sheets)
- Sheet border: `var(--border-default)`
- Sheet radius: `var(--radius-xl)` `var(--radius-xl)` 0 0
- Sheet shadow: `var(--shadow-sheet)`
- Handle: 40px wide, 4px tall, `var(--border-strong)`, `var(--radius-pill)`
- Title: `var(--text-primary)` at `var(--text-lg)` / `var(--weight-bold)`
- Close icon: `var(--text-muted)`

**Variants:**

| Variant | Max Height | Use |
|---------|-----------|-----|
| `compact` | `40dvh` | Quick action (share, confirm) |
| `standard` | `70dvh` | Content creation, AI chat |
| `full` | `92dvh` | Complex forms, article editor |

**States:**

| State | Visual Change | CSS |
|-------|---------------|-----|
| Default | Sheet visible at bottom | Position fixed, bottom 0 |
| Hover | N/A | |
| Active | N/A | |
| Disabled | N/A | |
| Loading | Spinner in body area | |
| Empty | Body shows empty message | |
| Error | Body shows error with retry | |
| Success | Sheet auto-dismisses after 1.5s | |

**Motion:**
- Enter: `translateY(100%) -> translateY(0)`, `var(--duration-emphasis)`, `var(--ease-decelerate)`
- Exit: `translateY(0) -> translateY(100%)`, `var(--duration-standard)`, `var(--ease-accelerate)`
- Backdrop: `opacity: 0 -> 1`, `var(--duration-standard)`, `var(--ease-standard)`

**Do / Don't:**
- DO: Always include the handle bar -- it signals swipe-to-dismiss affordance
- DO: On desktop (>640px), center the sheet horizontally at max-width 480px
- DON'T: Use glassmorphism on bottom sheets -- opaque surface for readability
- DON'T: Allow bottom sheet content to scroll behind the handle area

**Reference:** Material 3 Bottom Sheet specification. Apple HIG Sheet presentation.

---

### 2.6 NotificationBadge

**Purpose:** Grouped notification count indicator. Replaces the current flat notification rows for repeated actions. Displays "X and Y liked your post" instead of separate rows.

**Where it appears:** Notifications list, bottom nav badge, header badge.

**Structure (inline badge variant):**
```html
<span class="notification-badge" [class.notification-badge--dot]="!showCount">
  {{ count > 99 ? '99+' : count }}
</span>
```

**Structure (grouped notification row):**
```html
<div class="notification-group">
  <div class="notification-group-icon" [class]="'icon-' + type">
    <mat-icon>{{ typeIcon }}</mat-icon>
  </div>
  <div class="notification-group-avatars">
    <img *ngFor="let actor of actors | slice:0:3" [src]="actor.avatar" class="notification-group-avatar" />
    <span class="notification-group-overflow" *ngIf="actors.length > 3">+{{ actors.length - 3 }}</span>
  </div>
  <div class="notification-group-text">
    <span class="notification-group-actors">{{ actorNames }}</span>
    <span class="notification-group-action">{{ actionText }}</span>
  </div>
  <span class="notification-group-time">{{ time | relativeTime }}</span>
</div>
```

**Token References:**
- Badge bg: `var(--accent)` (notification dot/count)
- Badge text: `var(--text-primary)`
- Badge size: `20px` min (badge), `8px` (dot-only)
- Group icon bg: Type-specific (like: `var(--accent)`, comment: `var(--color-info)`, follow: `var(--color-success)`, message: `var(--primary)`)
- Actor names: `var(--text-primary)` at `var(--text-base)` / `var(--weight-semibold)`
- Action text: `var(--text-secondary)` at `var(--text-base)` / `var(--weight-regular)`
- Time: `var(--text-tertiary)` at `var(--text-sm)`
- Unread indicator: 8px circle, `var(--primary)`

**States:**

| State | Visual Change | CSS |
|-------|---------------|-----|
| Default (unread) | Slight background tint, unread dot | `background: var(--surface-hover); border-left: 3px solid var(--primary);` |
| Default (read) | No tint, no dot | `background: transparent;` |
| Hover | Background brightens | `background: var(--surface-active);` |
| Active/Pressed | Scale feedback | `transform: scale(0.98);` |
| Disabled | N/A | |
| Loading | Skeleton rows | |
| Empty | "No notifications yet" with bell icon | `.guided-empty-*` pattern |
| Error | Retry message | |

**Sizing:**
- Row height: `72px` (9 x 8px)
- Avatar: `40px` (5 x 8px), overlap by -8px for stacked avatars
- Icon container: `40px` circle
- Padding: `16px`
- Touch target: `48px` min on the entire row

---

### 2.7 EmptyStateTemplate

**Purpose:** Standardized empty state pattern used across all modules. Currently, empty states are inconsistent: some have CTAs (social feed guided empty), most don't (discover empty states). This component enforces the design system rule that every empty state must include a converting CTA.

**Where it appears:** Every list/feed/grid that can be empty.

**Structure:**
```html
<div class="empty-state">
  <div class="empty-state-icon">
    <mat-icon>{{ icon }}</mat-icon>
  </div>
  <h3 class="empty-state-headline">{{ headline }}</h3>
  <p class="empty-state-description">{{ description }}</p>
  <button class="empty-state-cta btn-primary" (click)="ctaAction()">
    <mat-icon *ngIf="ctaIcon">{{ ctaIcon }}</mat-icon>
    {{ ctaLabel }}
  </button>
  <button class="empty-state-escape" *ngIf="escapeLabel" (click)="escapeAction()">
    {{ escapeLabel }}
  </button>
</div>
```

**Token References:**
- Container: centered, `padding: 48px 24px`
- Icon container: `64px` (8 x 8px), `var(--radius-lg)`, `rgba(var(--primary-rgb), 0.12)` bg, `rgba(var(--primary-rgb), 0.22)` border
- Icon: `32px`, `var(--primary)`
- Headline: `var(--text-primary)` at `var(--text-xl)` / `var(--weight-black)`
- Description: `var(--text-tertiary)` at `var(--text-base)` / `var(--weight-regular)`, max-width 320px
- CTA: `btn-primary` class, min-width `160px`, `48px` height
- Escape link: `var(--text-muted)` at `var(--text-sm)`, hover `var(--text-secondary)`

**States:**

| State | Visual Change | Notes |
|-------|---------------|-------|
| Default | Full empty state visible | Icon + headline + description + CTA |
| Hover | CTA button hover state | Standard `btn-primary:hover` |
| Active | CTA pressed state | Standard `btn-primary:active` |
| Disabled | N/A -- empty states are always actionable | |
| Loading | N/A -- loading shows skeleton, not empty state | |
| Empty | This IS the empty state | |
| Error | Different variant with red icon and retry CTA | Icon: `var(--color-error)`, CTA: "Try again" |
| Success | N/A -- success means content loaded, empty state hides | |

**Motion:**
- Enter: `slideUp`, `var(--duration-emphasis)`, `var(--ease-decelerate)`
- CTA button: standard hover lift

**Do / Don't:**
- DO: ALWAYS include at least one CTA button -- an empty state without an action is a dead end
- DO: Use encouraging, active-voice copy ("Create your first workout" not "No workouts found")
- DON'T: Show a sad/empty icon without a clear next step
- DON'T: Use this component for loading states -- that is a skeleton's job

**Existing pattern to absorb:** The `.guided-empty-*` global classes in `styles.css` (lines 876-944) are a good starting point. The new EmptyStateTemplate wraps this pattern into a reusable Angular component with required `ctaLabel` and `ctaAction` inputs.

---

## SECTION 3 -- Pattern Library Additions

### 3.1 Skeleton Pattern (Standardize)

Multiple components define their own skeleton states. Standardize to a shared mixin / utility class:

```css
.skeleton {
  background: var(--surface-hover);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton--text { height: 14px; width: 60%; }
.skeleton--text-sm { height: 12px; width: 40%; }
.skeleton--circle { border-radius: 50%; }
.skeleton--card {
  height: 200px;
  border-radius: var(--radius-lg);
}
```

### 3.2 Reaction System Pattern

New interaction pattern for expanded reactions. This is a UI pattern spec, not a full component.

```
[reaction-bar]
  [reaction-btn: fire]  -- icon: local_fire_department, color: var(--reaction-fire)
  [reaction-btn: strong] -- icon: fitness_center, color: var(--reaction-strong)
  [reaction-btn: heart]  -- icon: favorite, color: var(--reaction-heart)
  [reaction-btn: clap]   -- icon: celebration, color: var(--reaction-clap)
  [reaction-btn: target]  -- icon: gps_fixed, color: var(--reaction-target)
```

- Default: only heart icon shown (backward compatible)
- Tap-and-hold or tap "+" to expand full reaction bar
- Reaction bar appears as horizontal popover above the button row
- Each reaction button: 40px circle, icon at 20px
- Active reaction: filled background with its `--reaction-*-bg` token
- Popover: `var(--surface-elevated)`, `var(--border-default)`, `var(--radius-pill)`, `var(--shadow-dropdown)`
- Enter: `scaleY(0) -> scaleY(1)` from bottom, `var(--duration-standard)`, `var(--ease-spring)`

### 3.3 Relative Time Pipe

Missing shared utility. Needed by notifications (S6) and feed cards:

```
< 60s:    "just now"
< 60m:    "Xm ago"
< 24h:    "Xh ago"
< 48h:    "Yesterday"
< 7d:     "Xd ago"
>= 7d:    "MMM d" (e.g., "Jun 4")
>= 1yr:   "MMM d, yyyy"
```

This is a pure pipe, not a component, but it is a design system primitive that every timestamped surface must use.
