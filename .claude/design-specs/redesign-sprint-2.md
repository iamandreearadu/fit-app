# UI Spec: Sprint 2 — Dashboard Full Restructure + Profile Athlete Identity

**Owner:** @uiux-designer
**Date:** 2026-06-09
**Status:** CANONICAL
**Consumers:** @angular-developer (implementation), @code-reviewer (review), @security-auditor (privacy audit)
**Depends on:**
- `.claude/design-system/tokens-sprint-0.md` — canonical `--nova-*` token dictionary
- `.claude/design-specs/redesign-sprint-1-components.md` — Sprint 1 component specs (ProgressRingComponent, FitnessDataBlockComponent)
- `.claude/plans/redesign-implementation-plan.md` — sprint scope, ADR references, dependency graph
- `.claude/decisions/redesign-adr-3.md` — DashboardFacade signal architecture
- `.claude/decisions/redesign-adr-4.md` — monthlyWorkoutCount + mutualFollowersCount API additions

---

## Privacy Notice (Absolute — Enforced in Template AND Facade)

These rules are non-negotiable. Both the template guard and the facade guard are required.

> **PrivateStatsComponent** is NEVER rendered when `profileId !== currentUserId`. Template guard: `@if (isOwnProfile())`. Facade guard: facade method returns null when called for another user.
>
> **BMI value** is NOT displayed anywhere. Only trend direction: up arrow (`--nova-accent`), down arrow (`--nova-success`), or a dash for stable.
>
> **Weight numeric values** are NOT displayed. Only a CSS/SVG sparkline shape (no y-axis labels, no data point labels, no tooltip values).
>
> **mutualFollowersCount** is shown ONLY on other users' profiles. NEVER on own profile (not zero, not "--", not hidden with opacity — the element is not rendered at all).
>
> **AthleteStatsBarComponent** contains social counts only (workouts/month, followers, following, mutual). Zero health metrics.
>
> **ActivityGridComponent** tap navigates to `/social/posts/:postId`. Never exposes workout calorie data in the grid.

---

## Part 1 — Dashboard Full Restructure

### User Story

As a NovaFit user, I want to open the Dashboard and understand how my day is going in under 3 seconds, log quick entries without navigating away, and feel motivated to close my remaining daily goals.

### UX Flow

1. User opens Dashboard → sticky header renders immediately (Section A)
2. RingsHeroComponent renders with loading state (rings show spinner arcs) while DashboardFacade resolves
3. DashboardFacade resolves → rings animate in with spring transition, QuickStatsRow populates
4. MacroProgressCard, WeeklyWorkoutCard, AiInsightCard, RecentActivityFeed render in sequence with `slideUp` stagger (each 60ms later)
5. User taps a ring center → no action (display only); user reads completion label
6. User scrolls down → sticky header stays, RingsHero scrolls away
7. AiInsightCard refresh button → spinner replaces text while Groq responds → new text fades in
8. RecentActivityFeed "See all →" → navigates to appropriate history route

### Page Layout

**Mobile (default, < 768px):** Single-column vertical scroll. Order: A → B → C → D → E → F → G.

**Desktop (≥ 768px):** Section A spans full width (sticky). Section B spans full width. Sections C, D, E, F, G enter a 2-column CSS grid (`grid-template-columns: 1fr 1fr`). Section D (Macro Progress) spans both columns (`grid-column: 1 / -1`). Section C (Quick Stats Row) spans both columns. Section E and F are side-by-side. Section G spans both columns.

```
Mobile:                         Desktop (≥768px):
┌──────────────────┐            ┌────────────────────────────┐
│  A: Header Bar   │            │       A: Header Bar        │
├──────────────────┤            ├────────────────────────────┤
│  B: Rings Hero   │            │       B: Rings Hero        │
├──────────────────┤            ├────────────────────────────┤
│  C: Quick Stats  │            │   C: Quick Stats Row       │
├──────────────────┤            ├──────────────┬─────────────┤
│  D: Macro Card   │            │   E: Weekly  │  F: AI      │
├──────────────────┤            ├──────────────┴─────────────┤
│  E: Weekly Card  │            │   D: Macro Progress Card   │
├──────────────────┤            ├────────────────────────────┤
│  F: AI Insight   │            │   G: Recent Activity       │
├──────────────────┤            └────────────────────────────┘
│  G: Recent Act.  │
└──────────────────┘
```

Page container CSS:
```css
.dashboard-page {
  background: var(--nova-surface-base);
  min-height: 100vh;
  padding-bottom: var(--nova-space-16);   /* 64px — clears bottom nav */
}

.dashboard-grid {
  padding: 0 var(--nova-space-4);         /* 16px side padding */
  display: flex;
  flex-direction: column;
  gap: var(--nova-space-4);               /* 16px between sections */
}

@media (min-width: 768px) {
  .dashboard-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--nova-space-4);
    padding: 0 var(--nova-space-6);
  }
  .dashboard-grid .section-full {
    grid-column: 1 / -1;
  }
}
```

---

## Section A — DashboardHeaderBarComponent

**Path:** `src/app/features/dashboard/dashboard-header-bar/dashboard-header-bar.component.ts`
**Selector:** `app-dashboard-header-bar`
**Type:** Standalone, feature-specific

### Angular Inputs

```typescript
@Input() streakCount: number = 0
@Input() hasUnreadNotifications: boolean = false
@Output() notificationsBellClick = new EventEmitter<void>()
```

### Visual Anatomy

```
┌──────────────────────────────────────────────────┐  h: 56px
│ [◆ NovaFit]    [Thursday, Jun 5]    [🔥12] [🔔•] │
│  left                 center           right      │
└──────────────────────────────────────────────────┘
```

**Container:**
- `position: sticky; top: 0; z-index: var(--nova-z-sticky);` (200)
- `height: 56px`
- `background: transparent`
- `display: flex; align-items: center; justify-content: space-between`
- `padding: 0 var(--nova-space-4)` (16px)
- No border-bottom — floats above content

**Left — Logo mark + app name:**
- Logo mark: 24×24px filled diamond `◆` rendered as inline SVG or `mat-icon` in `var(--nova-primary)`, `font-size: 20px`
- App name "NovaFit": `var(--nova-text-body-md)` (14px) / `var(--nova-weight-bold)` / `var(--nova-text-primary)`
- Gap between mark and name: `var(--nova-space-2)` (8px)
- Flex row, `align-items: center`

**Center — Date:**
- Format: "Thursday, Jun 5" via `DatePipe` with format `'EEEE, MMM d'`
- `var(--nova-text-body-md)` (14px) / `var(--nova-weight-regular)` / `var(--nova-text-secondary)`
- `position: absolute; left: 50%; transform: translateX(-50%)` — truly centered independent of sides

**Right — Streak badge + notification bell:**
- Streak badge (rendered only when `streakCount > 0`):
  - `mat-icon` `local_fire_department` at 16px, `var(--nova-warning)` (#ffb74d)
  - Count text: `var(--nova-text-body-sm)` (12px) / `var(--nova-weight-bold)` / `var(--nova-warning)`
  - Container: `display: inline-flex; align-items: center; gap: var(--nova-space-1)`
  - No pill background here — minimal treatment
- Notification bell:
  - `mat-icon-button` with `notifications` or `notifications_active` icon, 24px
  - Icon color: `var(--nova-text-secondary)`
  - Unread dot: when `hasUnreadNotifications === true`, a 6px circle (absolute, top-right of icon) `background: var(--nova-accent)`, `border-radius: var(--nova-radius-circle)`
  - Touch target: 48×48px (mat-icon-button default satisfies this)
- Gap between streak and bell: `var(--nova-space-3)` (12px)
- Flex row, `align-items: center`

### States

- **No streak:** streak badge renders nothing (`@if (streakCount > 0)`)
- **No unread:** bell shows `notifications` icon, no dot
- **Has unread:** bell shows `notifications_active` icon + accent dot

### Motion

- Bell icon swap (`notifications` ↔ `notifications_active`): no animation — instant
- Unread dot appearance: `opacity 0 → 1` over `var(--nova-duration-micro)` (150ms)

### CSS Classes

```
.dash-header-bar          — sticky container
.dash-header-left         — logo + name row
.dash-header-logo-mark    — SVG/icon mark
.dash-header-app-name     — "NovaFit" text
.dash-header-date         — absolute center date
.dash-header-right        — streak + bell row
.dash-header-streak       — flame icon + count
.dash-header-bell-wrap    — relative container for bell + unread dot
.dash-header-unread-dot   — 6px accent dot
```

### Angular Material Components

- `MatIconModule` for `local_fire_department`, `notifications`, `notifications_active`
- `MatIconButton` for the bell

### Accessibility

- `role="banner"` on the container
- Bell button: `aria-label="{{ hasUnreadNotifications ? 'Notifications, unread' : 'Notifications' }}"`
- Streak badge: `aria-label="{{ streakCount }} day streak"`

### Responsiveness

No layout change at any breakpoint. The absolute-center date collapses to `display: none` at `< 400px` to prevent overflow.

---

## Section B — RingsHeroComponent

Sprint 1 spec already defines this component in full (`.claude/design-specs/redesign-sprint-1-components.md`, Component 2). The following additions apply for Sprint 2 integration only.

**Path:** `src/app/features/dashboard/rings-hero/rings-hero.component.ts` (existing from Sprint 1)

### Sprint 2 Addition: Completion Sub-label

Below the existing `rings-completion-label`, add a second line:

```html
@if (!allComplete() && caloriesConsumed > 0) {
  <div class="rings-sub-label">{{ completionSubLabel() }}</div>
}
```

`completionSubLabel()` returns a string like "Keep going — X kcal remaining" or "Protein target within reach" based on which goal is closest to completion. This is a computed signal, max 40 chars.

Typography: `var(--nova-text-xs)` (10px) / `var(--nova-weight-regular)` / `var(--nova-text-hint)` — below the completion label with `margin-top: var(--nova-space-1)`.

### Pull-to-Refresh Integration

The `PullToRefreshDirective` (Sprint 1) wraps the entire `.dashboard-grid` scroll container in `DashboardPageComponent`, not just Section B. The host element for `appPullToRefresh` is the page's main scrollable `div`.

```html
<!-- DashboardPageComponent template -->
<div class="dashboard-page" appPullToRefresh [ptrThreshold]="64"
     (refresh)="onRefresh()" #ptr="appPullToRefresh">
  <app-dashboard-header-bar .../>
  <div class="dashboard-grid">
    <app-rings-hero class="section-full" .../>
    <!-- ... other sections -->
  </div>
</div>
```

---

## Section C — QuickStatsRowComponent

**Path:** `src/app/features/dashboard/quick-stats-row/quick-stats-row.component.ts`
**Selector:** `app-quick-stats-row`
**Type:** Standalone, feature-specific

### Angular Inputs

```typescript
@Input() steps: number | null = null
  // null = loading state
@Input() activeMinutes: number | null = null
@Input() waterMl: number | null = null
@Input() weightKg: number | null = null
  // null = not yet logged today (renders loading then empty state)
@Input() loading: boolean = false
```

### Visual Anatomy

```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│  👣 Steps  │ │  ⏱ Active  │ │  💧 Water  │ │  ⚖ Weight  │
│   8,420    │ │  35 min    │ │  1,200 ml  │ │  72.4 kg   │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
← horizontally scrollable on mobile, flex-wrap: nowrap →
```

**Container:**
- `display: flex; flex-direction: row; gap: var(--nova-space-3); overflow-x: auto`
- `scrollbar-width: none` (hide scrollbar on mobile)
- `padding-bottom: var(--nova-space-1)` (4px — prevents card shadow clip)
- No card wrapper on the row itself — the individual cards are the glass surfaces

**Each `FitnessDataBlockComponent` card wrapper:**
- `min-width: 80px; flex: 0 0 auto`
- Glassmorphism card: `background: var(--nova-glass-card-bg)` (`var(--nova-white-alpha-025)`), `border: var(--nova-glass-card-border)` (`1px solid var(--nova-white-alpha-08)`), `border-radius: var(--nova-radius-xl)` (20px)
- `padding: var(--nova-space-4) var(--nova-space-3)` (16px 12px)
- Hover: `border-color: var(--nova-glass-card-hover-border)` / `transform: translateY(-2px)` / `var(--nova-transition-card)`

**Cards (reuse `FitnessDataBlockComponent` with `size="md"`):**

| Card | Icon | Label | Unit | iconVariant |
|------|------|-------|------|-------------|
| Steps | `directions_walk` | STEPS | steps | `info` |
| Active minutes | `timer` | ACTIVE | min | `success` |
| Water | `water_drop` | WATER | ml | `info` |
| Weight | `monitor_weight` | WEIGHT | kg | — (use `--nova-text-secondary` color) |

Weight card uses a custom `iconVariant` not in Sprint 1's set. Add `'neutral'` variant:
- `'neutral'` → icon: `var(--nova-text-secondary)`, bg: `var(--nova-white-alpha-06)`

### States

**Loading (`loading === true` or any value is `null`):**
- Each card wrapper renders, but `FitnessDataBlockComponent` receives `[value]="null"` which triggers its built-in skeleton shimmer state
- Card border still rendered — no layout shift

**Empty (steps === 0 and activeMinutes === 0):**
- Cards show `FitnessDataBlockComponent` zero state (`--` dashes, dimmed)
- No special empty state overlay — the `FitnessDataBlockComponent` zero state is sufficient

**Weight not logged (`weightKg === null` after data loads):**
- Weight card shows zero state with label "not logged" instead of a unit — override via `[unit]="'not logged'"` and `[value]="null"` after loading resolves. Wait: `FitnessDataBlockComponent` zero state already shows `--` for null values, which is sufficient.

### CSS Classes

```
.quick-stats-row          — horizontal scroll container
.qsr-card                 — individual card wrapper (glassmorphism)
```

### Angular Material Components

- None directly — delegates to `FitnessDataBlockComponent`

### Accessibility

- Container: `role="list"` `aria-label="Today's quick stats"`
- Each card wrapper: `role="listitem"`

### Responsiveness

- Mobile: horizontal scroll, `overflow-x: auto`
- Desktop (≥ 768px): `flex-wrap: wrap` — cards wrap naturally in the 2-column grid cell. The full-width section class causes the row to span both columns.

---

## Section D — MacroProgressCardComponent

**Path:** `src/app/features/dashboard/macro-progress-card/macro-progress-card.component.ts`
**Selector:** `app-macro-progress-card`
**Type:** Standalone, feature-specific

### Angular Inputs

```typescript
@Input() proteinConsumedG: number = 0
@Input() proteinTargetG: number = 150
@Input() carbsConsumedG: number = 0
@Input() carbsTargetG: number = 225
@Input() fatConsumedG: number = 0
@Input() fatTargetG: number = 65
@Input() totalCaloriesConsumed: number = 0
@Input() loading: boolean = false
```

### Visual Anatomy

```
┌─────────────────────────────────────────────────────┐
│ Today's Nutrition                      1,840 kcal   │  ← card header
├─────────────────────────────────────────────────────┤
│ Protein           82g / 150g                        │
│ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░         │  ← 6px bar
│                                                     │
│ Carbs            120g / 225g                        │
│ ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        │
│                                                     │
│ Fat               42g / 65g                         │
│ ████████████████████████░░░░░░░░░░░░                │
└─────────────────────────────────────────────────────┘
```

**Card container:**
- `background: var(--nova-glass-card-bg)`
- `border: var(--nova-glass-card-border)`
- `border-radius: var(--nova-radius-xl)` (20px)
- `padding: var(--nova-space-4) var(--nova-space-5)` (16px 20px)

**Card header row:**
- `display: flex; justify-content: space-between; align-items: baseline`
- `margin-bottom: var(--nova-space-4)` (16px)
- Left: "Today's Nutrition" — `var(--nova-text-subtitle)` (16px) / `var(--nova-weight-bold)` / `var(--nova-text-primary)`
- Right: total calorie count — `var(--nova-text-heading)` (20px) / `var(--nova-weight-bold)` / `var(--nova-text-primary)` — most prominent number on card

**Each macro row:**
- `margin-bottom: var(--nova-space-3)` (12px) on all except the last
- Label row: `display: flex; justify-content: space-between; margin-bottom: var(--nova-space-1)` (4px)
  - Left: macro name — `var(--nova-text-body-sm)` (12px) / `var(--nova-weight-medium)` / `var(--nova-text-secondary)`
  - Right: "82g / 150g" — `var(--nova-text-body-sm)` (12px) / `var(--nova-weight-medium)` / `var(--nova-text-primary)`
- Progress bar track: `height: 6px; border-radius: 3px; background: var(--nova-white-alpha-08); overflow: hidden`
- Progress bar fill:
  - Protein: `background: var(--nova-gradient-macro-protein)` (`linear-gradient(90deg, #7c3aed, #a78bfa)`)
  - Carbs: `background: var(--nova-gradient-macro-carbs)` (`linear-gradient(90deg, #0284c7, #29b6f6)`)
  - Fat: `background: var(--nova-gradient-macro-fats)` (`linear-gradient(90deg, #d97706, #ffb74d)`)
  - Width: `{{ clampedPercent }}%` computed as `Math.min((consumed / target) * 100, 100)`
  - Transition: `width var(--nova-duration-slow) var(--nova-ease-out)` (300ms, ease-out)

**Bar state modifiers:**

At ≥ 90% fill (nearly complete):
```css
.macro-bar-fill.macro-bar-fill--near-complete {
  animation: macroNearPulse 1.8s ease-in-out infinite;
}
@keyframes macroNearPulse {
  0%, 100% { box-shadow: none; }
  50%       { box-shadow: 0 0 8px var(--nova-warning-glow); }
}
```

At ≤ 50% fill:
```css
.macro-bar-fill.macro-bar-fill--low {
  opacity: 0.6;
}
```

### States

**Loading:**
- Header: skeleton block `140px × 16px` (label) + `80px × 20px` (calorie total), `background: var(--nova-white-alpha-04)`, `border-radius: var(--nova-radius-sm)`, shimmer animation
- Each bar row: label skeleton `80px × 10px` + value skeleton `60px × 10px` + bar skeleton `100% × 6px`
- Shimmer: `animation: shimmer 1.4s ease-in-out infinite` (same keyframe as `FitnessDataBlockComponent`)

**Empty (all consumed values are 0 and not loading):**
- Bars render at 0% width (empty track visible)
- Calorie total shows "0 kcal" in `var(--nova-text-hint)`
- No separate empty state component — the zero-width bars with dimmed text are the empty state

**Error:**
- Not separately handled — parent `DashboardPageComponent` manages global error state; this card simply shows 0 values

### Computed Properties

```typescript
readonly proteinPct = computed(() =>
  this.proteinTargetG > 0
    ? Math.min((this.proteinConsumedG / this.proteinTargetG) * 100, 100)
    : 0
);
readonly carbsPct = computed(() =>
  this.carbsTargetG > 0
    ? Math.min((this.carbsConsumedG / this.carbsTargetG) * 100, 100)
    : 0
);
readonly fatPct = computed(() =>
  this.fatTargetG > 0
    ? Math.min((this.fatConsumedG / this.fatTargetG) * 100, 100)
    : 0
);

readonly proteinState = computed((): 'low' | 'normal' | 'near-complete' => {
  const p = this.proteinPct();
  if (p >= 90) return 'near-complete';
  if (p <= 50) return 'low';
  return 'normal';
});
// Same pattern for carbsState, fatState
```

### CSS Classes

```
.macro-progress-card        — card container
.mpc-header                 — header flex row
.mpc-title                  — "Today's Nutrition" label
.mpc-calorie-total          — total kcal number (right-aligned)
.mpc-macro-row              — per-macro wrapper
.mpc-macro-label-row        — name + value flex row
.mpc-macro-name             — "Protein" / "Carbs" / "Fat"
.mpc-macro-value            — "82g / 150g"
.macro-bar-track            — bar background track
.macro-bar-fill             — fill element
.macro-bar-fill--protein    — protein gradient
.macro-bar-fill--carbs      — carbs gradient
.macro-bar-fill--fat        — fat gradient
.macro-bar-fill--low        — ≤50% opacity modifier
.macro-bar-fill--near-complete  — ≥90% pulse modifier
.mpc-skeleton               — skeleton shimmer container
```

### Angular Material Components

None — pure CSS bars.

### Accessibility

- Card: `role="region"` `aria-label="Today's macro progress"`
- Each bar: `role="meter"` `aria-valuenow="{{ consumed }}"` `aria-valuemin="0"` `aria-valuemax="{{ target }}"` `aria-label="{{ macroName }}: {{ consumed }}g of {{ target }}g"`

### Responsiveness

No internal responsive changes. Spans both columns on desktop via `.section-full` parent class.

---

## Section E — WeeklyWorkoutCardComponent

**Path:** `src/app/features/dashboard/weekly-workout-card/weekly-workout-card.component.ts`
**Selector:** `app-weekly-workout-card`
**Type:** Standalone, feature-specific

### Angular Inputs

```typescript
@Input() weekDays: WeekDayEntry[] = []
  // Array of 7 entries Mon–Sun, always 7 elements (missing days have durationMin: 0)
@Input() workoutCount: number = 0
@Input() lastWorkoutDate: Date | null = null
@Input() loading: boolean = false

export interface WeekDayEntry {
  dayLabel: string;   // 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  durationMin: number;
  isToday: boolean;
}
```

### Visual Anatomy

```
┌──────────────────────────────────────────────┐
│ This Week                         [3 workouts]│  ← header
├──────────────────────────────────────────────┤
│                                              │
│  ██       ██                ██              │  ← bars
│  ██  ██   ██  ██       ██   ██              │
│  ██  ██   ██  ██  ██   ██   ██              │
│  ──  ──   ──  ──  ──   ──   ──              │
│ Mon Tue  Wed Thu  Fri  Sat  Sun             │
│                    ·                        │  ← today dot under 'Fri'
│                                              │
│ Last workout: 2 days ago                    │
└──────────────────────────────────────────────┘
```

**Card container:** glassmorphism card — same token pattern as Section D.

**Card header row:**
- Left: "This Week" — `var(--nova-text-subtitle)` (16px) / `var(--nova-weight-bold)` / `var(--nova-text-primary)`
- Right: workout count pill — `background: var(--nova-primary-alpha-16)` (note: use `var(--nova-primary-alpha-14)` which exists in token dict); `border: 1px solid var(--nova-primary-alpha-25)`; `border-radius: var(--nova-radius-pill)`; count text `var(--nova-text-body-sm)` (12px) / `var(--nova-weight-bold)` / `var(--nova-primary-light)`; `padding: var(--nova-space-1) var(--nova-space-2)` (4px 8px)

**Bar chart:**
- Container: `display: flex; flex-direction: row; align-items: flex-end; gap: var(--nova-space-2)` (8px); `height: 56px; margin: var(--nova-space-3) 0` (12px 0)
- Each day column: `display: flex; flex-direction: column; align-items: center; flex: 1`
- Bar element:
  - `width: 100%; max-width: 24px`
  - `border-radius: var(--nova-radius-sm) var(--nova-radius-sm) 0 0` (8px top, flat bottom)
  - Background when `durationMin === 0`: `var(--nova-white-alpha-06)`
  - Background when `durationMin > 0` (normal): `var(--nova-primary)`
  - Background when today and `durationMin > 0`: `var(--nova-primary)` + `box-shadow: 0 0 8px var(--nova-primary-alpha-35)` (accent glow for today's bar)
  - Height: proportional — `Math.max((durationMin / maxDuration) * 48, 4)px`, where `maxDuration` is the max across the 7 days. Minimum 4px visible bar when any workout was logged.
  - Transition: `height var(--nova-duration-slow) var(--nova-ease-out)` (300ms)
- Day label: `var(--nova-text-xs)` (10px) / `var(--nova-weight-medium)` / `var(--nova-text-tertiary)`; `margin-top: var(--nova-space-1)` (4px)
- Today indicator dot: 4px circle below the day label, `background: var(--nova-primary)`, `border-radius: var(--nova-radius-circle)`, only rendered when `isToday === true`
- Today day label: `color: var(--nova-text-primary)` (brighter than others)

**Last workout row:**
- `margin-top: var(--nova-space-3)` (12px)
- "Last workout: " + `RelativeTimePipe` output — `var(--nova-text-body-sm)` (12px) / `var(--nova-weight-regular)` / `var(--nova-text-secondary)`
- Hidden when `lastWorkoutDate === null`

### States

**Loading:**
- 7 skeleton bars at varying heights (hardcoded placeholder heights: 40, 20, 36, 12, 28, 44, 16px), `background: var(--nova-white-alpha-04)`, shimmer animation
- Header skeleton: `80px × 16px` label + `60px × 20px` pill

**Empty (all durationMin === 0):**
- All bars render at minimum 4px invisible-near-invisible height in `var(--nova-white-alpha-04)`
- No inline empty state text — the empty bars are self-explanatory
- Last workout row hidden

**Error:** Not separately handled at this card level.

### CSS Classes

```
.weekly-workout-card        — card container
.wwc-header                 — header flex row
.wwc-title                  — "This Week"
.wwc-count-pill             — workout count badge
.wwc-chart                  — bar chart flex container
.wwc-day-col                — per-day column
.wwc-bar                    — the bar element
.wwc-bar--has-workout       — primary color fill
.wwc-bar--today             — today's accent glow
.wwc-day-label              — 3-letter day text
.wwc-day-label--today       — brighter color
.wwc-today-dot              — 4px dot beneath today label
.wwc-last-workout           — footer "Last workout:" row
```

### Accessibility

- Card: `role="region"` `aria-label="This week's workouts"`
- Chart container: `role="img"` `aria-label="{{ workoutCount }} workouts this week. Bar chart Mon–Sun."`
- Individual bars are decorative — `aria-hidden="true"` on bar elements

### Responsiveness

No internal responsive changes. Sits in the left column on desktop.

---

## Section F — AiInsightCardComponent

**Path:** `src/app/features/dashboard/ai-insight-card/ai-insight-card.component.ts`
**Selector:** `app-ai-insight-card`
**Type:** Standalone, feature-specific

### Angular Inputs / Outputs

```typescript
@Input() insightText: string = ''
@Input() loading: boolean = false
@Input() error: boolean = false
@Output() refreshRequested = new EventEmitter<void>()
```

### Visual Anatomy

```
┌──────────────────────────────────────────────┐  ← primary-glow border
│ ✨ AI Insight                          [↻]   │  ← header
├──────────────────────────────────────────────┤
│  "Great progress! You're 80% to your       │
│   protein goal. Keep it up!"               │
└──────────────────────────────────────────────┘
```

**Card container:**
- `background: var(--nova-glass-card-bg)`
- `border: 1px solid var(--nova-primary)`
- `box-shadow: 0 0 12px var(--nova-primary-alpha-16)` (note: use closest token — `var(--nova-primary-alpha-14)` exists; use it here)
- `border-radius: var(--nova-radius-xl)` (20px)
- `padding: var(--nova-space-4) var(--nova-space-5)` (16px 20px)

**Header row:**
- `display: flex; justify-content: space-between; align-items: center`
- `margin-bottom: var(--nova-space-3)` (12px)
- Left: `auto_awesome` mat-icon (16px, `var(--nova-primary)`) + "AI Insight" (`var(--nova-text-body-md)` 14px / `var(--nova-weight-bold)` / `var(--nova-text-primary)`); gap `var(--nova-space-2)`
- Right: refresh `mat-icon-button` — `refresh` icon (16px, `var(--nova-text-tertiary)`) — 32px touch target (override `min-width`, `min-height` to 32px for this compact icon button; still meets gym-use standard because this is a secondary action not requiring precision)

  Wait — touch target rule is 48×48px minimum. The refresh button must be 48×48px. Use a 48px container with the icon visually centered.

**Body:**
- Insight text: `var(--nova-text-body-md)` (14px) / `var(--nova-weight-regular)` / `var(--nova-text-primary)`
- `line-height: var(--nova-leading-normal)` (1.5)
- Max 2 visible lines with `display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden`

### States

**Loading:**
- Two skeleton shimmer lines: `100% × 14px` + `70% × 14px`, `background: var(--nova-white-alpha-04)`, shimmer, `border-radius: var(--nova-radius-sm)`, gap `var(--nova-space-2)`
- Refresh button still visible but disabled (`[disabled]="true"`)

**Loaded (`insightText` non-empty, not loading, not error):**
- Full display as above

**Error (`error === true`):**
- Body: "Couldn't load insight" in `var(--nova-text-tertiary)`, `var(--nova-text-body-sm)` (12px)
- Retry button below the text: `mat-button` with label "Retry" in `var(--nova-primary)`, `font-size: var(--nova-text-body-sm)`, `font-weight: var(--nova-weight-bold)`, emits `refreshRequested`

**Empty (`insightText` is empty string, not loading):**
- Show loading state — the parent should trigger a fetch and set `loading: true`. This card never shows a permanent empty state; it shows loading until content or error arrives.

### Refresh Button Interaction

- Hover: icon color transitions to `var(--nova-primary)` over `var(--nova-duration-micro)` (150ms)
- Click: emits `refreshRequested`; parent sets `loading: true`, calls Groq API, updates `insightText` on response
- While `loading === true`: refresh icon spins continuously — `animation: spin 600ms linear infinite` (reuse `ptr-spin` keyframe or define once in global)

### Motion

- On `insightText` change (new text arrives): text fades in via `opacity: 0 → 1` over `var(--nova-duration-moderate)` (250ms) using Angular's `@if` with an `@defer` or CSS transition on the text element

### CSS Classes

```
.ai-insight-card            — card container
.aic-header                 — header flex row
.aic-header-left            — icon + label row
.aic-sparkle-icon           — auto_awesome mat-icon
.aic-label                  — "AI Insight" text
.aic-refresh-btn            — 48px refresh icon button
.aic-body                   — insight text
.aic-error-text             — "Couldn't load insight"
.aic-retry-btn              — retry button
.aic-skeleton               — skeleton container
.aic-skeleton-line          — shimmer line
```

### Angular Material Components

- `MatIconModule` for `auto_awesome`, `refresh`
- `MatIconButton` for refresh button
- `MatButton` for retry button

### Accessibility

- Card: `role="region"` `aria-label="AI daily insight"`
- `aria-live="polite"` on `.aic-body` so screen readers announce new text
- Refresh button: `aria-label="Refresh AI insight"`
- When loading: `aria-busy="true"` on card container

### Responsiveness

Sits in right column on desktop alongside Section E (WeeklyWorkoutCard). No internal layout changes.

---

## Section G — RecentActivityFeedComponent

**Path:** `src/app/features/dashboard/recent-activity-feed/recent-activity-feed.component.ts`
**Selector:** `app-recent-activity-feed`
**Type:** Standalone, feature-specific

### Angular Inputs / Outputs

```typescript
@Input() activities: ActivityItem[] = []
@Input() loading: boolean = false
@Output() seeAllClick = new EventEmitter<void>()

export interface ActivityItem {
  id: string;
  type: 'workout' | 'meal' | 'weight' | 'water';
  title: string;        // e.g. "Push Day A" or "Breakfast"
  subtitle: string;     // e.g. "45 min · 4 exercises" or "3 items logged"
  timestamp: Date;
}
```

### Visual Anatomy

```
┌──────────────────────────────────────────────┐
│ Recent Activity                  See all →   │  ← header
├──────────────────────────────────────────────┤
│ [💪] Push Day A                   2h ago     │
│      45 min · 4 exercises                   │
├──────────────────────────────────────────────┤
│ [🍽] Breakfast                   3h ago     │
│      3 items logged                         │
├──────────────────────────────────────────────┤
│ [💧] Water                        4h ago    │
│      1,200 ml logged                        │
└──────────────────────────────────────────────┘
```

**Card container:** glassmorphism card — same pattern.

**Card header:**
- Left: "Recent Activity" — `var(--nova-text-subtitle)` (16px) / `var(--nova-weight-bold)` / `var(--nova-text-primary)`
- Right: "See all →" — `var(--nova-text-body-sm)` (12px) / `var(--nova-weight-bold)` / `var(--nova-primary)`; tap emits `seeAllClick`; touch target padded to 48px min height via `padding: 12px 0`

**Activity divider:** `var(--nova-glass-divider)` (`1px solid var(--nova-white-alpha-06)`) between items

**Each activity row:**
- `display: flex; align-items: center; gap: var(--nova-space-3)` (12px)
- `padding: var(--nova-space-3) 0` (12px top/bottom)
- Left icon: 32×32px rounded square (`border-radius: var(--nova-radius-sm)`, 8px), `background: var(--nova-glass-card-bg)`, icon `var(--nova-icon-default)` (18px)
  - workout: `fitness_center` icon in `var(--nova-primary)`
  - meal: `restaurant` icon in `var(--nova-success)`
  - weight: `monitor_weight` icon in `var(--nova-info)`
  - water: `water_drop` icon in `var(--nova-info)`
- Center (flex: 1, `overflow: hidden`):
  - Title: `var(--nova-text-body-md)` (14px) / `var(--nova-weight-semibold)` / `var(--nova-text-primary)`; `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`
  - Subtitle: `var(--nova-text-body-sm)` (12px) / `var(--nova-weight-regular)` / `var(--nova-text-secondary)`
- Right: `RelativeTimePipe` output — `var(--nova-text-body-sm)` (12px) / `var(--nova-weight-regular)` / `var(--nova-text-tertiary)`; `white-space: nowrap`

### States

**Loading:**
- 5 skeleton rows. Each row: 32px circle skeleton (left) + two text skeleton lines (center) + 40px text skeleton (right)
- Skeletons: `background: var(--nova-white-alpha-04)`, shimmer, `border-radius: var(--nova-radius-sm)`

**Empty (activities.length === 0 and not loading):**
```
.raf-empty
  mat-icon "directions_run"        ← 40px, var(--nova-text-invisible) (rgba 255,255,255,0.18)
  p "No activity yet today"        ← var(--nova-text-body-lg) 15px, var(--nova-text-ghost) (rgba 255,255,255,0.30)
```
Container: `padding: var(--nova-space-8) var(--nova-space-4)` (32px 16px), `text-align: center`

**Error:** Not separately handled at card level — parent manages.

### CSS Classes

```
.recent-activity-feed       — card container
.raf-header                 — header flex row
.raf-title                  — "Recent Activity"
.raf-see-all                — "See all →" link
.raf-list                   — activity list container
.raf-item                   — single activity row
.raf-item-icon              — 32px rounded icon square
.raf-item-center            — flex column: title + subtitle
.raf-item-title             — activity name
.raf-item-subtitle          — secondary info
.raf-item-time              — relative time (right)
.raf-divider                — glass divider between items
.raf-empty                  — empty state container
.raf-skeleton-row           — loading row
```

### Angular Material Components

- `MatIconModule` for activity type icons

### Accessibility

- Card: `role="region"` `aria-label="Recent activity"`
- List: `role="list"`
- Each row: `role="listitem"` `aria-label="{{ item.title }}, {{ item.subtitle }}, {{ item.timestamp | relativeTime }}"`
- "See all" link: `aria-label="See all activity"`

### Responsiveness

Spans both columns on desktop via `.section-full`. On mobile: single column, full width.

---

## Dashboard Page — DashboardPageComponent Wiring

**Path:** `src/app/features/dashboard/dashboard-page/dashboard-page.component.ts` (new — replaces existing `DashboardComponent`)

### Facade Signals Consumed (from `DashboardFacade` per ADR-3)

```typescript
// Read from DashboardFacade:
readonly isLoading = dashFacade.isLoading;
readonly caloriesConsumed = dashFacade.caloriesConsumed;       // computed
readonly proteinConsumedG = dashFacade.proteinConsumedG;       // computed from meals
readonly carbsConsumedG = dashFacade.carbsConsumedG;
readonly fatConsumedG = dashFacade.fatConsumedG;
readonly waterMl = dashFacade.waterMl;                         // from waterConsumedL signal * 1000
readonly steps = dashFacade.steps;
readonly weightKg = dashFacade.weightKg;
readonly currentStreak = dashFacade.currentStreak;             // from user store
readonly weekDays = dashFacade.weekDays;                       // computed from workout history
readonly activities = dashFacade.recentActivities;             // last 5, computed
readonly aiInsightText = dashFacade.aiInsightText;
readonly aiInsightLoading = dashFacade.aiInsightLoading;
readonly aiInsightError = dashFacade.aiInsightError;
readonly hasUnreadNotifications = notificationFacade.hasUnread;
```

### Page Entrance Animation

Each section card enters with `slideUp` animation staggered:
- Section A: no animation (sticky, always visible)
- Section B: `animation-delay: 0ms`
- Section C: `animation-delay: 60ms`
- Section D: `animation-delay: 120ms`
- Section E: `animation-delay: 180ms`
- Section F: `animation-delay: 240ms`
- Section G: `animation-delay: 300ms`

Use `animation: slideUp var(--nova-duration-entrance) var(--nova-ease-out) both` on each `.dashboard-grid > *`.

### Dashboard States

**Day 1 / No data:**
- Rings Hero: all rings at 0%, completion label "Log your first entry"
- Quick Stats Row: zero state (-- dashes in each card)
- Macro Progress Card: zero-width bars, "0 kcal" header
- Weekly Workout Card: all bars at minimum height
- AI Insight Card: shows a hardcoded welcome message from DashboardFacade ("Welcome! Log your first meal to get personalized insights.") — no Groq call on first day
- Recent Activity Feed: empty state

**Rest day:**
- Weekly chart shows today's bar empty
- AI Insight might acknowledge rest day if context includes `activityType === 'rest'`

**Day complete:**
- RingsHeroComponent `allComplete()` fires, celebration triggers
- AI Insight Card shows congratulatory text (Groq call with completion context)

---

## Part 2 — Profile Athlete Identity Redesign

### User Story

As a NovaFit user, I want my profile to communicate my athletic identity at a glance — my fitness goal, streak, and recent performance — so that other users can understand who I am as an athlete before reading my posts.

### UX Flow

1. User navigates to `/social/profile/:userId`
2. `SocialProfileComponent` shell loads → `ProfileHeroComponent` renders with loading skeleton
3. `SocialFacade.loadProfile(userId)` resolves → hero populates with spring animation
4. `AthleteStatsBarComponent` populates with counts
5. `RecentPerformanceComponent` loads 3 fitness data blocks from profile stats
6. User scrolls down → `ActivityGridComponent` loads, shows 3-column grid or list
7. If own profile: `PrivateStatsComponent` renders below activity grid (NEVER for other profiles)
8. User taps activity grid cell → navigates to `/social/posts/:postId`
9. User taps Follow button → button transitions from "Follow" to "Following" with check icon + success color momentarily

### Page Layout (SocialProfileComponent shell)

```
.social-profile-page
  A: ProfileHeroComponent
  B: AthleteStatsBarComponent
  C: RecentPerformanceComponent
  D: ActivityGridComponent
  E: PrivateStatsComponent   ← @if (isOwnProfile()) ONLY
```

**Container:** `background: var(--nova-surface-base)`, `min-height: 100vh`

---

## Section A — ProfileHeroComponent

**Path:** `src/app/features/social/social-profile/profile-hero/profile-hero.component.ts`
**Selector:** `app-profile-hero`
**Type:** Standalone, feature-specific

### Angular Inputs / Outputs

```typescript
@Input() profile: UserSocialProfile | null = null
@Input() isOwnProfile: boolean = false
@Input() isFollowing: boolean = false
@Input() loading: boolean = false
@Output() followToggle = new EventEmitter<void>()
@Output() editProfileClick = new EventEmitter<void>()
```

### Visual Anatomy — Mobile

```
┌──────────────────────────────────────────────┐
│  (subtle radial purple glow bg)              │
│                                              │
│  [◉ 80px avatar]  Name Here              │
│                   @username                  │
│                   [Fat Loss] [🔥 12]          │  ← goal + streak badges
│                                              │
│  "Bio text goes here up to 3 lines..."       │
│                                              │
│             [Follow / Edit Profile]          │
└──────────────────────────────────────────────┘
```

### Visual Anatomy — Desktop (≥ 768px)

```
┌──────────────────────────────────────────────┐
│         (radial glow from center)            │
│                                              │
│         [◉ 80px avatar]                     │
│         Name Here                            │
│         @username                            │
│         [Fat Loss] [🔥 12]                    │
│         "Bio text..."                        │
│         [Follow / Edit Profile]              │
└──────────────────────────────────────────────┘
```

**Container:**
- Full-width section, no card border
- `background: radial-gradient(circle at 50% 0%, var(--nova-primary-alpha-08) 0%, transparent 65%)`
- `padding: var(--nova-space-6) var(--nova-space-4) var(--nova-space-5)` (24px 16px 20px)
- On mobile: avatar left-aligned with name/badges to its right in a flex row
- On desktop (≥ 768px): all content centered, `text-align: center`, `align-items: center`

**Avatar:**
- 80px circle
- `border-radius: var(--nova-radius-circle)`
- `border: 2px solid var(--nova-primary)`
- `box-shadow: 0 0 16px var(--nova-primary-alpha-14)` (use `--nova-primary-alpha-14`)
- `object-fit: cover`
- Fallback when no avatar: initials in a circle with `background: var(--nova-primary-alpha-14)`, `color: var(--nova-primary-light)`, `font-size: var(--nova-text-heading-sm)` (19px), `font-weight: var(--nova-weight-bold)`

**Name:** `var(--nova-text-heading-lg)` (22px) / `var(--nova-weight-extrabold)` / `var(--nova-text-primary)`; `white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px` on mobile (prevent overflow next to avatar)

**Username:** `var(--nova-text-body-md)` (14px) / `var(--nova-weight-regular)` / `var(--nova-text-secondary)` — "@username" format; `margin-top: var(--nova-space-1)` (4px)

**Badges row (goal + streak):**
- `display: flex; flex-direction: row; gap: var(--nova-space-2); flex-wrap: wrap; margin-top: var(--nova-space-2)`
- Goal badge: `var(--nova-text-xs)` (10px) / `var(--nova-weight-bold)` / uppercase / `var(--nova-primary)` text; `background: var(--nova-primary-alpha-14)`; `border: 1px solid var(--nova-primary-alpha-25)`; `border-radius: var(--nova-radius-pill)`; `padding: var(--nova-space-1) var(--nova-space-2)` (4px 8px)
  - Goal text mappings: `"lose_weight"` → "Fat Loss", `"gain_muscle"` → "Muscle Gain", `"maintain"` → "Maintenance", `"strength"` → "Strength", `"cardio"` → "Cardio"
- Streak badge (rendered only when streak > 0): `local_fire_department` mat-icon (12px, `var(--nova-warning)`) + count + " day streak"; same pill shape, `background: var(--nova-warning-bg)`; `border: 1px solid var(--nova-warning-border)` (`rgba(255,183,77,0.35)`)
- Both badges hidden during loading

**Bio text (rendered only when `profile.bio` is non-empty):**
- `var(--nova-text-body)` (13px) / `var(--nova-weight-regular)` / `var(--nova-text-secondary)`
- `margin-top: var(--nova-space-3)` (12px)
- Max 3 lines: `display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden`

**CTA Button:**
- `margin-top: var(--nova-space-4)` (16px)
- Own profile ("Edit Profile"): `mat-stroked-button`, `border: 1px solid var(--nova-white-alpha-14)`, `color: var(--nova-text-primary)`, `background: transparent`, `border-radius: var(--nova-radius-md)` (12px), `height: 40px`, `min-width: 140px`
- Other user, NOT following ("Follow"): `mat-raised-button`, `background: var(--nova-primary)`, `color: var(--nova-text-primary)`, `border-radius: var(--nova-radius-md)`, `height: 40px`, `min-width: 120px`, `box-shadow: var(--nova-shadow-primary-btn)`
- Other user, IS following ("Following"): `mat-stroked-button`, `border: 1px solid var(--nova-primary-alpha-25)`, `color: var(--nova-primary-light)`, `border-radius: var(--nova-radius-md)`, `height: 40px`; includes `check` mat-icon (16px) before the text

**Follow button transition:**
- On click (follow action): button immediately updates to "Following" state (optimistic UI)
- On click (unfollow action): mat-menu with single option "Unfollow" opens above the button

### States

**Loading:**
- Avatar: 80px circle skeleton, `background: var(--nova-white-alpha-06)`, shimmer
- Name: `160px × 22px` skeleton block
- Username: `100px × 14px` skeleton block
- Badges row: two `60px × 20px` pill skeletons
- Button: `120px × 40px` skeleton block
- Bio (if present): two `100% × 13px` lines

**Loaded:** Full display as above

**No avatar:** Initials fallback (described above)

### CSS Classes

```
.profile-hero               — section container
.ph-content                 — inner content (flex row mobile, flex col desktop)
.ph-avatar-wrap             — avatar + border container
.ph-avatar                  — img element
.ph-avatar-initials         — fallback initials div
.ph-info                    — name/username/badges flex column
.ph-name                    — display name
.ph-username                — @username
.ph-badges-row              — goal + streak flex row
.ph-goal-badge              — fitness goal pill
.ph-streak-badge            — streak pill
.ph-bio                     — bio text
.ph-cta                     — CTA button container
.ph-follow-btn              — follow/unfollow button
.ph-edit-btn                — edit profile button
```

### Angular Material Components

- `MatButton` / `MatRaisedButton` / `MatStrokedButton` for CTA
- `MatIconModule` for `check`, `local_fire_department`
- `MatMenuModule` for unfollow menu (own future sprint — for now, direct toggle)

### Accessibility

- Section: `role="banner"` (profile identity is the page banner)
- Avatar: `alt="{{ profile.displayName }}"` on img; `aria-label="{{ profile.displayName }}" role="img"` on initials div
- Follow button: `aria-label="{{ isFollowing ? 'Unfollow ' : 'Follow ' }}{{ profile.displayName }}"`
- Edit button: `aria-label="Edit your profile"`
- Goal badge: `aria-label="Fitness goal: {{ goalText }}"`

### Responsiveness

| Breakpoint | Layout |
|---|---|
| Mobile (default) | Flex row: avatar left, info right. Button below info block. |
| ≥ 768px | Flex column: avatar centered, all content centered, `text-align: center` |

---

## Section B — AthleteStatsBarComponent

**Path:** `src/app/features/social/social-profile/athlete-stats-bar/athlete-stats-bar.component.ts`
**Selector:** `app-athlete-stats-bar`
**Type:** Standalone, feature-specific

### Privacy Constraint

> `mutualFollowersCount` is rendered ONLY when `isOwnProfile === false`. When `isOwnProfile === true`, the element is not rendered — not zero, not hidden, not "--". Use `@if (!isOwnProfile())` guard.

> This component contains social counts ONLY. No health metrics. The `monthlyWorkoutCount` is a workout session count (social activity) — it is permitted.

### Angular Inputs

```typescript
@Input() monthlyWorkouts: number = 0
@Input() followersCount: number = 0
@Input() followingCount: number = 0
@Input() mutualFollowersCount: number = 0
  // Only rendered when isOwnProfile === false
@Input() isOwnProfile: boolean = false
@Input() loading: boolean = false
@Output() followersClick = new EventEmitter<void>()
@Output() followingClick = new EventEmitter<void>()
```

### Visual Anatomy — Own Profile (3 stats)

```
┌─────────────┬─────────────┬─────────────┐
│     12      │     248     │      91     │
│  workouts   │  followers  │  following  │
│   this mo   │             │             │
└─────────────┴─────────────┴─────────────┘
```

### Visual Anatomy — Other Profile (4 stats)

```
┌──────────┬──────────┬──────────┬──────────┐
│    12    │   248    │    91    │    6     │
│ workouts │followers │following │  mutual  │
│ this mo  │          │          │          │
└──────────┴──────────┴──────────┴──────────┘
```

**Container:**
- Full-width, no card border — sits directly on page surface
- `display: flex; flex-direction: row`
- `border-top: var(--nova-glass-divider); border-bottom: var(--nova-glass-divider)`
- `padding: var(--nova-space-4) 0` (16px top/bottom)

**Each stat block:**
- `flex: 1; display: flex; flex-direction: column; align-items: center; gap: var(--nova-space-1)` (4px)
- Dividers between blocks: `border-right: var(--nova-glass-divider)` on all except last
- Count: `var(--nova-text-heading-sm)` (19px) / `var(--nova-weight-bold)` / `var(--nova-text-primary)` — wait, `--nova-text-heading-sm` is 19px, but spec says 18px/700. Use nearest token: `var(--nova-text-heading)` is 20px or `var(--nova-text-subtitle)` is 16px. Per spec "18px/700" → closest token is `var(--nova-text-heading-sm)` at 19px. Use that.
- Label: `var(--nova-text-sm)` (11px) / `var(--nova-weight-medium)` / `var(--nova-text-secondary)`; `text-transform: uppercase; letter-spacing: var(--nova-tracking-wider)` (0.05em); `text-align: center`
- Followers + Following blocks are tappable (emit clicks): `cursor: pointer; transition: var(--nova-transition-hover)`; hover: `color: var(--nova-primary)` on the count
- Monthly workouts and mutual followers blocks: not tappable

### States

**Loading:**
- Each count: `48px × 19px` skeleton block, shimmer
- Label: `40px × 11px` skeleton block

**Loaded:** Full display

### CSS Classes

```
.athlete-stats-bar          — full-width container
.asb-stat                   — single stat block
.asb-stat--tappable         — pointer cursor + hover color
.asb-stat-count             — number
.asb-stat-label             — uppercase label
.asb-divider                — right border divider
```

### Angular Material Components

None — pure CSS.

### Accessibility

- `role="region"` `aria-label="Profile statistics"`
- Followers button: `role="button"` `aria-label="{{ followersCount }} followers, tap to view"`
- Following button: `role="button"` `aria-label="{{ followingCount }} following, tap to view"`
- Stats row: `role="list"`, each stat: `role="listitem"`

### Responsiveness

No changes across breakpoints — the flex row compresses stat labels on very narrow screens. At `< 360px`, label font reduces to `var(--nova-text-xs)` (10px).

---

## Section C — RecentPerformanceComponent

**Path:** `src/app/features/social/social-profile/recent-performance/recent-performance.component.ts`
**Selector:** `app-recent-performance`
**Type:** Standalone, feature-specific

### Angular Inputs

```typescript
@Input() bestStreakDays: number | null = null
@Input() weeklyWorkouts: number | null = null
@Input() favouriteExercise: string | null = null
  // Most-logged exercise name. Truncated to 12 chars in display.
@Input() loading: boolean = false
```

### Visual Anatomy

```
┌──────────────────────────────────────────────┐
│ Recent Performance                           │  ← card header
├──────────────────────────────────────────────┤
│  ┌────────┐  ┌────────┐  ┌────────┐         │
│  │  🏆   │  │  💪   │  │  ⭐   │         │
│  │   21  │  │   4   │  │ Bench │         │
│  │ streak│  │ workts│  │ Press │         │
│  └────────┘  └────────┘  └────────┘         │
└──────────────────────────────────────────────┘
```

**Card container:** glassmorphism card — `background: var(--nova-glass-card-bg)`, `border: var(--nova-glass-card-border)`, `border-radius: var(--nova-radius-xl)`, `padding: var(--nova-space-4) var(--nova-space-5)`

**Card header:** "Recent Performance" — `var(--nova-text-subtitle)` (16px) / `var(--nova-weight-bold)` / `var(--nova-text-primary)`; `margin-bottom: var(--nova-space-4)` (16px)

**Stats row:**
- `display: flex; flex-direction: row; gap: var(--nova-space-4)` (16px)
- Three `FitnessDataBlockComponent` instances with `size="md"`

| Slot | Icon | Label | Value | Unit | iconVariant |
|------|------|-------|-------|------|-------------|
| Best streak | `emoji_events` | BEST STREAK | `bestStreakDays` | days | `warning` |
| Weekly volume | `fitness_center` | THIS WEEK | `weeklyWorkouts` | workouts | `primary` |
| Favourite exercise | `star` | FAVOURITE | — | — | `info` |

The favourite exercise slot requires custom rendering — it shows a text string, not a number. Override `FitnessDataBlockComponent` usage here: pass `[value]="null"` and project custom content via ng-content if the component supports it, or alternatively inline the stat block CSS classes manually for this slot only.

Recommended approach: add a `textValue?: string` input to `FitnessDataBlockComponent` (alongside the existing `value: number | null`). When `textValue` is set, render the string instead of the number. This keeps the API clean.

### States

**Loading:** Each `FitnessDataBlockComponent` receives `[value]="null"` which triggers built-in skeleton shimmer.

**Empty (`bestStreakDays === 0 && weeklyWorkouts === 0`):**
- Values show `FitnessDataBlockComponent` zero state (`--`)
- No special empty state — the zero dashes communicate "no activity yet"

### CSS Classes

```
.recent-performance-card    — card container
.rpc-header                 — "Recent Performance" title
.rpc-stats-row              — flex row of 3 data blocks
```

### Angular Material Components

- `MatIconModule` (delegated through `FitnessDataBlockComponent`)

### Accessibility

- `role="region"` `aria-label="Recent performance stats"`

### Responsiveness

No internal changes. On mobile, the 3-block row may compress to narrow tiles — `FitnessDataBlockComponent` handles gracefully with its `min-width` constraints. At `< 360px`, gap reduces to `var(--nova-space-2)` (8px).

---

## Section D — ActivityGridComponent

**Path:** `src/app/features/social/social-profile/activity-grid/activity-grid.component.ts`
**Selector:** `app-activity-grid`
**Type:** Standalone, feature-specific

### Angular Inputs / Outputs

```typescript
@Input() posts: ProfilePost[] = []
@Input() loading: boolean = false
@Input() hasMore: boolean = false
@Output() loadMore = new EventEmitter<void>()
@Output() postTap = new EventEmitter<string>()  // emits postId

export interface ProfilePost {
  postId: string;
  imageUrl?: string;
  workoutType?: string;   // for icon fallback
  durationMin?: number;
  timestamp: Date;
}
```

### Visual Anatomy — Grid Mode

```
┌───────────────┬───────────────┬───────────────┐
│  [img/icon]   │  [img/icon]   │  [img/icon]   │
│         32min │          45min│        20 min │  ← duration overlay
├───────────────┼───────────────┼───────────────┤
│  [img/icon]   │  [img/icon]   │  [img/icon]   │
│         28min │          60min│        35 min │
└───────────────┴───────────────┴───────────────┘
             [Load more]
```

**Toggle bar:**
- Top-right of the card header: two icon buttons `grid_on` and `list` (16px), `mat-icon-button`
- Active mode: icon color `var(--nova-primary)`, `background: var(--nova-primary-alpha-10)`
- Inactive: `var(--nova-text-tertiary)`, transparent background
- Button size: 32×32px visual, but 48×48px tap target via padding

**Card container:** glassmorphism card pattern.

**Card header:**
- Left: "Workouts" — `var(--nova-text-subtitle)` (16px) / `var(--nova-weight-bold)` / `var(--nova-text-primary)`
- Right: toggle bar

**Grid mode:**
- `display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px`
- Each cell: `aspect-ratio: 1; position: relative; overflow: hidden; cursor: pointer`
  - Image: `object-fit: cover; width: 100%; height: 100%`
  - No-image fallback: `background: linear-gradient(135deg, var(--nova-surface-elevated) 0%, var(--nova-surface-base) 100%)` with `mat-icon` centered: `var(--nova-icon-2xl)` (40px), `var(--nova-primary)` — icon is workout type or generic `fitness_center`
  - Duration overlay: `position: absolute; bottom: 6px; left: 6px`; `var(--nova-text-xs)` (10px) / `var(--nova-weight-semibold)` / `var(--nova-text-primary)`; `text-shadow: 0 1px 3px rgba(0,0,0,0.8)` — use inline style for text-shadow since it's a one-off legibility trick, not a design system color
  - Hover (desktop): `transform: scale(1.03)` on image, `var(--nova-transition-card)`
  - Tap: emits `postTap` with `post.postId`

**List mode:**
- Standard card list rows using the same pattern as `RecentActivityFeedComponent` rows
- Shows icon + workout title + duration + `RelativeTimePipe` output
- No pagination in list mode (shows all loaded posts, with "Load more" if `hasMore`)

**Load more button (grid mode only):**
- `mat-stroked-button`, full width, label "Load more"
- `border: 1px solid var(--nova-white-alpha-10)`; `color: var(--nova-text-secondary)`; `border-radius: var(--nova-radius-md)`; `height: 44px`
- Hidden when `hasMore === false`

### States

**Loading (initial):**
- Grid mode: 9 skeleton cells — 3×3 grid of `aspect-ratio: 1` blocks in `var(--nova-white-alpha-04)`, shimmer, `gap: 2px`
- List mode: 5 skeleton rows

**Empty (`posts.length === 0` and not loading):**
```
.ag-empty
  mat-icon "fitness_center"    ← var(--nova-icon-2xl) 40px, var(--nova-text-invisible)
  p "No public workouts yet"   ← var(--nova-text-body-lg) 15px, var(--nova-text-ghost)
```
Container: `padding: var(--nova-space-10) var(--nova-space-4)` (40px 16px), `text-align: center`

**Error:** Small error banner at top of card: `background: var(--nova-error-bg)`, `color: var(--nova-error)`, `border-radius: var(--nova-radius-sm)`, `padding: var(--nova-space-2) var(--nova-space-3)`, "Couldn't load workouts" + retry button.

### Navigation

Tap on a grid cell or list row calls:
```typescript
onPostTap(postId: string): void {
  this.postTap.emit(postId);
}
// Parent (SocialProfileComponent) handles:
// router.navigate(['/social/posts', postId])
```

The route MUST be `/social/posts/:postId` — not a profile sub-route.

### CSS Classes

```
.activity-grid-card         — card container
.agc-header                 — header flex row
.agc-title                  — "Workouts"
.agc-toggle-bar             — grid/list toggle
.agc-toggle-btn             — each toggle icon button
.agc-toggle-btn--active     — active mode indicator
.agc-grid                   — CSS grid (grid mode)
.agc-grid-cell              — single grid cell
.agc-cell-image             — cover image
.agc-cell-fallback          — no-image fallback bg + icon
.agc-cell-duration          — bottom-left duration overlay
.agc-list                   — list container (list mode)
.agc-list-row               — single list row
.agc-load-more              — load more button container
.ag-empty                   — empty state
.ag-skeleton-grid           — loading skeleton grid
.ag-skeleton-cell           — loading skeleton cell
```

### Angular Material Components

- `MatIconModule` for `grid_on`, `list`, `fitness_center` and type icons
- `MatIconButton` for toggle buttons
- `MatStrokedButton` for load more

### Accessibility

- Card: `role="region"` `aria-label="Workout posts"`
- Grid: `role="list"` when in grid mode
- Each cell: `role="listitem"` `aria-label="Workout, {{ post.durationMin }} minutes, {{ post.timestamp | relativeTime }}"` `tabindex="0"`
- Keyboard: `Enter` / `Space` on a focused cell triggers navigation

### Responsiveness

- Mobile: 3-column grid (default), equal-width columns. Each cell is a square via `aspect-ratio: 1`.
- Desktop (≥ 768px): same 3-column grid, cells are larger due to wider container.

---

## Section E — PrivateStatsComponent

**Path:** `src/app/features/social/social-profile/private-stats/private-stats.component.ts`
**Selector:** `app-private-stats`
**Type:** Standalone, feature-specific

### Privacy Constraint (Absolute)

> This component is NEVER rendered when `profileId !== currentUserId`.
>
> Template guard in `SocialProfileComponent`:
> ```html
> @if (isOwnProfile()) {
>   <app-private-stats ... />
> }
> ```
>
> Facade guard in `SocialFacade.loadPrivateStats()`:
> ```typescript
> if (profileId !== this.authStore.userId()) {
>   return; // Silently abort — never throw, never log
> }
> ```
>
> BMI: direction only. No number.
> Weight: sparkline shape only. No numbers, no y-axis, no tooltip.

### Angular Inputs

```typescript
@Input() bmiTrend: 'up' | 'down' | 'stable' = 'stable'
@Input() weightHistory: number[] = []
  // Raw weight values for sparkline shape — NOT displayed as values.
  // Minimum 2 points required to draw a line. If fewer, sparkline hidden.
@Input() goalProgressPct: number = 0
  // 0–100. Percentage toward user's fitness goal.
@Input() goalLabel: string = ''
  // e.g. "Fat Loss Goal", "Muscle Gain Goal"
@Input() loading: boolean = false
```

### Visual Anatomy

```
┌──────────────────────────────────────────────┐
│ 🔒 My Stats                                  │  ← card header
├──────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────────────┐  │
│  │  BMI Trend   │  │  Weight Trend        │  │
│  │     ↑        │  │   ╱╲  ╱              │  │
│  │  Increasing  │  │  ╱  ╲╱  (shape only) │  │
│  └──────────────┘  └──────────────────────┘  │
├──────────────────────────────────────────────┤
│  Fat Loss Goal              ████████░░  72%  │  ← full-width progress row
└──────────────────────────────────────────────┘
```

**Card container:** glassmorphism card.

**Card header:**
- `lock` mat-icon (16px, `var(--nova-text-tertiary)`) + "My Stats" (`var(--nova-text-subtitle)` 16px / `var(--nova-weight-bold)` / `var(--nova-text-primary)`); gap `var(--nova-space-2)`
- `margin-bottom: var(--nova-space-4)`

**Top row — 2-col grid:**
- `display: grid; grid-template-columns: 1fr 1fr; gap: var(--nova-space-4)` (16px)
- `margin-bottom: var(--nova-space-4)`

**BMI Trend block (left cell):**
- Inner card: `background: var(--nova-white-alpha-03)`, `border: var(--nova-glass-section-border)`, `border-radius: var(--nova-radius-lg)` (16px), `padding: var(--nova-space-3) var(--nova-space-4)`
- Label: "BMI Trend" — `var(--nova-text-xs)` (10px) / `var(--nova-weight-bold)` / `var(--nova-text-hint)` / uppercase / letter-spacing 0.05em; `margin-bottom: var(--nova-space-2)`
- Trend indicator:
  - `up`: `arrow_upward` mat-icon (24px, `var(--nova-accent)`) + text "Increasing" (`var(--nova-text-body-sm)` 12px, `var(--nova-accent)`)
  - `down`: `arrow_downward` mat-icon (24px, `var(--nova-success)`) + text "Decreasing" (`var(--nova-text-body-sm)` 12px, `var(--nova-success)`)
  - `stable`: `remove` mat-icon (24px, `var(--nova-text-secondary)`) + text "Stable" (`var(--nova-text-body-sm)` 12px, `var(--nova-text-secondary)`)
- NO numeric BMI value. The icon + direction word is the complete display.

**Weight Sparkline block (right cell):**
- Same inner card style as BMI block
- Label: "Weight Trend" — same label style as BMI label
- SVG sparkline:
  - Container: `width: 100%; height: 48px`
  - SVG `viewBox="0 0 120 48"` — scaled to container via `preserveAspectRatio="none"`
  - Path: smooth polyline through normalized weight history values. Y-axis normalized: `yMin = Math.min(...history)`, `yMax = Math.max(...history)`. Point: `y = 48 - ((value - yMin) / (yMax - yMin || 1)) * 44 + 2` (2px top padding). X points evenly distributed across 0–120.
  - Stroke: `var(--nova-primary)`, `stroke-width: 2`, `fill: none`, `stroke-linecap: round`, `stroke-linejoin: round`
  - No axes. No grid lines. No labels. No tooltips. SHAPE ONLY.
  - Below the line path: a gradient fill area — `<linearGradient>` from `var(--nova-primary-alpha-14)` at top to transparent at bottom; `<path d="..." fill="url(#sparkGrad)">` as the closed fill shape
  - Hidden when `weightHistory.length < 2`
  - When hidden: label "Log more entries to see trend" in `var(--nova-text-hint)`, `var(--nova-text-xs)`

**Goal Progress row (full width):**
- `display: flex; align-items: center; gap: var(--nova-space-3)` (12px)
- Goal label: `var(--nova-text-body-sm)` (12px) / `var(--nova-weight-medium)` / `var(--nova-text-secondary)`; `flex: 0 0 auto`
- Progress bar track: `flex: 1; height: 8px; background: var(--nova-white-alpha-08); border-radius: var(--nova-radius-pill); overflow: hidden`
- Progress bar fill: `background: var(--nova-primary)`, `border-radius: var(--nova-radius-pill)`, `height: 100%`, `width: {{ goalProgressPct }}%`, `transition: width var(--nova-duration-slow) var(--nova-ease-out)`
- Percentage text: `var(--nova-text-body-sm)` (12px) / `var(--nova-weight-bold)` / `var(--nova-text-primary)`; `flex: 0 0 auto`; e.g. "72%"

### States

**Loading:**
- BMI block: 24px circle skeleton + two text line skeletons
- Sparkline block: `100% × 48px` skeleton rectangle, shimmer
- Goal row: full-width skeleton

**No data (`weightHistory.length < 2`):**
- Sparkline block shows the "Log more entries" hint text instead of SVG

### CSS Classes

```
.private-stats-card         — card container
.psc-header                 — header row with lock icon
.psc-lock-icon              — lock mat-icon
.psc-title                  — "My Stats"
.psc-top-grid               — 2-col grid
.psc-inner-block            — reusable inner card (BMI + sparkline cells)
.psc-block-label            — "BMI TREND" / "WEIGHT TREND" uppercase label
.psc-bmi-indicator          — icon + direction text row
.psc-bmi-icon               — arrow mat-icon
.psc-bmi-text               — direction word
.psc-sparkline-svg          — the SVG element
.psc-sparkline-path         — the line path
.psc-sparkline-fill         — the gradient fill area
.psc-sparkline-empty-hint   — "Log more entries" text
.psc-goal-row               — full-width goal progress row
.psc-goal-label             — goal name text
.psc-goal-bar-track         — bar background
.psc-goal-bar-fill          — bar fill
.psc-goal-pct               — "72%" text
```

### Angular Material Components

- `MatIconModule` for `lock`, `arrow_upward`, `arrow_downward`, `remove`

### Accessibility

- Card: `role="region"` `aria-label="My private stats — only visible to you"`
- BMI block: `aria-label="BMI trend: {{ bmiTrend }}"` — says "increasing", "decreasing", or "stable", NOT a number
- Weight sparkline: `aria-label="Weight trend chart — shape only"` `role="img"` — no data values announced
- Goal progress: `role="meter"` `aria-valuenow="{{ goalProgressPct }}"` `aria-valuemin="0"` `aria-valuemax="100"` `aria-label="{{ goalLabel }}: {{ goalProgressPct }}% complete"`

### Responsiveness

- Mobile (default): 2-col inner grid. At `< 360px`, inner grid collapses to 1-col (BMI above sparkline).
- Desktop (≥ 768px): inner grid stays 2-col; card is full-width in the profile column.

---

## Token Quick Reference — Sprint 2

All tokens used in this spec. Source: `.claude/design-system/tokens-sprint-0.md`.

### Colors

| Token | Value | Used in |
|---|---|---|
| `--nova-primary` | #7c4dff | Header logo, bar fills, avatar border, follow btn bg, today bar, insight border, sparkline stroke |
| `--nova-primary-light` | #a78bfa | Following btn text, workout count pill text |
| `--nova-primary-alpha-08` | rgba(124,77,255,0.08) | Profile hero radial bg |
| `--nova-primary-alpha-10` | rgba(124,77,255,0.10) | Toggle active bg |
| `--nova-primary-alpha-14` | rgba(124,77,255,0.14) | Avatar shadow, goal badge bg, sparkline fill gradient, workout icon bg |
| `--nova-primary-alpha-16` | — | Not in token dict; use `--nova-primary-alpha-14` instead |
| `--nova-primary-alpha-25` | rgba(124,77,255,0.25) | Goal badge border, following btn border |
| `--nova-primary-alpha-35` | rgba(124,77,255,0.35) | Today bar glow |
| `--nova-accent` | rgb(255,64,129) | BMI up trend icon/text, unread dot |
| `--nova-success` | #4ade80 | BMI down trend icon/text, active minutes icon |
| `--nova-info` | #38bdf8 | Steps, water, weight icons in quick stats; weekly workouts block; favourite exercise block |
| `--nova-warning` | #ffb74d | Streak badges (header, profile hero) |
| `--nova-warning-bg` | rgba(255,183,77,0.12) | Streak badge background in hero |
| `--nova-warning-border` | rgba(255,183,77,0.35) | Streak badge border in hero |
| `--nova-warning-glow` | rgba(255,183,77,0.30) | Macro bar near-complete pulse |
| `--nova-error` | #ef5350 | Activity grid error text |
| `--nova-error-bg` | rgba(239,83,80,0.12) | Activity grid error banner bg |
| `--nova-gradient-macro-protein` | `linear-gradient(90deg, #7c3aed, #a78bfa)` | Protein bar fill |
| `--nova-gradient-macro-carbs` | `linear-gradient(90deg, #0284c7, #29b6f6)` | Carbs bar fill |
| `--nova-gradient-macro-fats` | `linear-gradient(90deg, #d97706, #ffb74d)` | Fat bar fill |

### Surfaces / Glass

| Token | Used in |
|---|---|
| `--nova-glass-card-bg` | All card backgrounds |
| `--nova-glass-card-border` | All card borders (`1px solid var(--nova-white-alpha-08)`) |
| `--nova-glass-card-hover-border` | Quick stats card hover |
| `--nova-glass-section-border` | PrivateStats inner block border |
| `--nova-glass-divider` | AthleteStatsBar top/bottom, RecentActivityFeed row dividers |
| `--nova-white-alpha-03` | PrivateStats inner block bg |
| `--nova-white-alpha-04` | Skeleton shimmer base |
| `--nova-white-alpha-06` | Activity icon bg, zero-state bar |
| `--nova-white-alpha-08` | Macro bar track, goal progress track |
| `--nova-white-alpha-10` | Load more button border |
| `--nova-white-alpha-14` | Edit Profile button border |
| `--nova-surface-base` | Page background |
| `--nova-surface-elevated` | Grid cell no-image fallback bg gradient |

### Text

| Token | Used in |
|---|---|
| `--nova-text-primary` | All primary labels, counts, values |
| `--nova-text-secondary` | Body text, subtitles, username, bio |
| `--nova-text-tertiary` | Refresh icon default, lock icon |
| `--nova-text-hint` | Timestamps, unit labels, streak sub-text |
| `--nova-text-ghost` | Empty state text (rgba 255,255,255,0.30) |
| `--nova-text-invisible` | Empty state icons (rgba 255,255,255,0.18) |

### Motion

| Token | Value | Used in |
|---|---|---|
| `--nova-duration-micro` | 150ms | Hover color, unread dot, refresh icon color |
| `--nova-duration-standard` | 200ms | Card hover transform, toggle switch |
| `--nova-duration-slow` | 300ms | Macro bar width, weekly bar height, sparkline |
| `--nova-duration-entrance` | 350ms | Page sections slideUp |
| `--nova-ease-out` | ease-out | Bar width transitions |
| `--nova-ease-spring` | cubic-bezier(0.34, 1.56, 0.64, 1) | Follow button state change |
| `--nova-transition-card` | border/transform/shadow 200ms | Card hover |
| `--nova-transition-hover` | all 150ms ease | Icon color hover |

### Spacing

| Token | Value | Used in |
|---|---|---|
| `--nova-space-1` | 4px | Badge gap, micro margins |
| `--nova-space-2` | 8px | Badge gap, bar chart gap, row gap |
| `--nova-space-3` | 12px | Activity row padding, section margins |
| `--nova-space-4` | 16px | Card padding, grid gap |
| `--nova-space-5` | 20px | Card padding-x |
| `--nova-space-6` | 24px | Profile hero padding-top |
| `--nova-space-8` | 32px | Empty state padding |
| `--nova-space-10` | 40px | Activity grid empty state |
| `--nova-space-16` | 64px | Page bottom padding |

### Border Radius

| Token | Value | Used in |
|---|---|---|
| `--nova-radius-sm` | 8px | Activity icon squares, skeleton blocks |
| `--nova-radius-md` | 12px | Follow/Edit buttons, grid cell no-image fallback |
| `--nova-radius-lg` | 16px | PrivateStats inner block |
| `--nova-radius-xl` | 20px | All card containers |
| `--nova-radius-pill` | 999px | Goal/streak badges, count pill, progress bars |
| `--nova-radius-circle` | 50% | Avatar, unread dot |

### Typography

| Token | Value | Used in |
|---|---|---|
| `--nova-text-xs` | 10px | Badge labels, overlay duration, block labels |
| `--nova-text-sm` | 11px | Stat labels |
| `--nova-text-body-sm` | 12px | Timestamps, macro values, sub-labels |
| `--nova-text-body-md` | 14px | Body text, header date, activity titles, username |
| `--nova-text-body` | 13px | Bio text |
| `--nova-text-subtitle` | 16px | All card headers, AI insight label |
| `--nova-text-heading` | 20px | Calorie total in macro card |
| `--nova-text-heading-sm` | 19px | AthleteStatsBar counts |
| `--nova-text-heading-lg` | 22px | Profile display name |

---

## Implementation Order (Sprint 2)

```
Week 1:
  Day 1:   DashboardHeaderBarComponent — simple, unblocked
  Day 1:   QuickStatsRowComponent — reuses FitnessDataBlockComponent from Sprint 1
  Day 2:   MacroProgressCardComponent — CSS bars, no dependencies
  Day 2:   WeeklyWorkoutCardComponent — CSS bar chart, WeekDayEntry interface
  Day 3:   AiInsightCardComponent — Groq integration, loading/error states
  Day 3:   RecentActivityFeedComponent — RelativeTimePipe (Sprint 0)
  Day 4–5: DashboardPageComponent shell — wire all 6 sections to DashboardFacade (ADR-3)

Week 2:
  Day 1:   ProfileHeroComponent — avatar, badges, follow button
  Day 2:   AthleteStatsBarComponent — counts, privacy guard
  Day 2:   RecentPerformanceComponent — reuses FitnessDataBlockComponent
  Day 3:   ActivityGridComponent — grid/list toggle, navigation, load more
  Day 4:   PrivateStatsComponent — BMI trend, sparkline SVG, goal progress
  Day 5:   SocialProfileComponent wiring — integrate all 5 sections, isOwnProfile guard

Integration:
  - DashboardFacade signals (ADR-3) must exist before DashboardPageComponent wiring
  - ADR-4 backend (S2-BE-1) must land before AthleteStatsBarComponent receives real monthlyWorkouts data; use 0 as fallback until then
  - ActivityGrid navigation: confirm route `/social/posts/:postId` exists and resolves
  - PrivateStatsComponent: @security-auditor reviews template guard + facade guard before merge
```

---

## Open Questions for @angular-developer

1. **FitnessDataBlockComponent `textValue` input:** The `RecentPerformanceComponent` favourite exercise slot needs to display a string, not a number. Confirm whether to add `textValue?: string` to `FitnessDataBlockComponent` or inline the block CSS for this one slot. Adding the input is preferred for consistency.

2. **WeekDayEntry source:** Confirm whether `DashboardFacade.weekDays` computes the 7-entry array from `workouts-tab.service.ts` history calls or from a dedicated endpoint. The facade should normalize to the `WeekDayEntry[]` shape regardless of source.

3. **ActivityGrid and post images:** Confirm whether `ProfilePost.imageUrl` is available from `GET /api/social/profile/{userId}/posts`. The existing endpoint returns `PostResponse` which has an optional image field. Map it to `imageUrl` in the profile post interface.

4. **Sparkline SVG and Angular SSR:** If server-side rendering is ever added, the sparkline SVG path generation must happen in a computed signal (not in `ngAfterViewInit`) to avoid hydration mismatches. Flag for future SSR compatibility.

5. **Follow button unfollow confirmation:** The spec currently toggles directly on click. Confirm whether an unfollow confirmation (e.g., a `MatMenu` with "Unfollow" option) is required for Sprint 2 or deferred to Sprint 4 polish.
```
