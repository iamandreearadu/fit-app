# UI Spec: Sprint 1 Components — NovaFit Redesign

**Owner:** @uiux-designer
**Date:** 2026-06-05
**Status:** DRAFT
**Consumers:** @angular-developer (implementation), @code-reviewer (review)
**Depends on:**
- `.claude/design-system/tokens-sprint-0.md` — canonical `--nova-*` token dictionary
- `.claude/decisions/redesign-adr-1.md` — `LinkedContentData` structured API response (PostCard variant data source)
- `.claude/design-specs/dashboard-redesign.md` — ProgressRingsHero layout context
- `.claude/design-specs/besocial-redesign.md` — PostCard type-branching context

---

## Privacy Notice (Absolute — Read Before Implementing Any Social Component)

These rules are non-negotiable and must be enforced in template logic, not just styling.

> **WORKOUT post cards:** NEVER display `EstimatedCaloriesKcal`, actual calories burned, body weight (kg/lbs), BMI, BMR, or TDEE. These values exist on the `LinkedContentData` interface (`estimatedCaloriesKcal`) but MUST NOT be rendered in any template context visible to other users.
>
> **Permitted WORKOUT display fields:** workout template title (`TemplateTitle`), duration in minutes (`DurationMin`), exercise count (`ExerciseCount`), set count (`TotalSets`), total volume in kg (`TotalVolumeKg`).
>
> **MEAL post cards:** NEVER display macro grams (protein, carbs, fats), total calorie count, or any nutritional breakdown. The `LinkedContentData` interface carries `proteinG`, `carbsG`, `fatG`, `totalCalories` — these fields MUST NOT be rendered on any publicly visible meal card.
>
> **Permitted MEAL display fields:** meal name only (sourced from `linkedContent.title` or `linkedContent.subtitle`).
>
> **Implementation guard pattern:** All template blocks that render `linkedContentData` fields must have an explicit comment `<!-- PRIVACY: field permitted -->` to confirm the field has been reviewed. Any field not listed in the permitted lists above requires a second review before rendering.

---

## Cross-Component Dependency Map

```
ProgressRingComponent (shared/components/progress-ring/)
  └── consumed by: RingsHeroComponent (features/dashboard/rings-hero/)

FitnessDataBlockComponent (shared/components/fitness-data-block/)
  └── consumed by: PostCard WORKOUT variant (features/social/components/post-card/)

PullToRefreshDirective (shared/directives/pull-to-refresh.directive.ts)
  └── applied to: .feed-page host in SocialFeedComponent (features/social/feed/)
```

Build order: `ProgressRingComponent` → `RingsHeroComponent`; `FitnessDataBlockComponent` → `PostCard` update; `PullToRefreshDirective` → `SocialFeedComponent` integration. The directive and the fitness data block can be built in parallel.

---

## Component 1: ProgressRingComponent

**Path:** `src/app/shared/components/progress-ring/progress-ring.component.ts`
**Selector:** `app-progress-ring`
**Type:** Standalone, shared, reusable SVG primitive

### Summary

A circular SVG progress ring that is the core visual primitive for the Dashboard hero. Renders a track arc and a fill arc driven by a 0–1 progress input, with four color variants and three size presets. Designed for reuse anywhere a ring progress indicator is needed.

### Angular Inputs / Outputs

```typescript
@Input() size: 'sm' | 'md' | 'lg' = 'md'
@Input() progress: number = 0
  // 0–1 range. Values > 1 are clamped to 1 and trigger the complete state.
  // Values < 0 are clamped to 0.
@Input() variant: 'calories' | 'protein' | 'water' | 'workouts' = 'calories'
@Input() label?: string
  // Optional text rendered below the ring, uppercase, letter-spaced.
@Input() loading: boolean = false
  // When true: renders loading state animation instead of progress arc.
// No outputs — display-only primitive. Parent reacts to its own data changes.
```

### Size Specifications

| Size token | Host container | SVG diameter | Stroke width | Center slot diameter | Center value font |
|---|---|---|---|---|---|
| `sm` | 48 × 48 px | 44 px | 4 px | none | — |
| `md` | 80 × 80 px | 72 px | 6 px | 40 px | `--nova-text-body-sm` (12px) / `--nova-weight-bold` (700) |
| `lg` | 120 × 120 px | 108 px | 8 px | 72 px | `--nova-text-subtitle` (16px) / `--nova-weight-extrabold` (800) |

The host container is the outermost `div`. The SVG fills it exactly. The center slot is an absolutely-positioned `div` centered over the SVG using:
```css
position: absolute;
top: 50%; left: 50%;
transform: translate(-50%, -50%);
```

### SVG Construction

```
viewBox="0 0 {diameter} {diameter}"
cx = diameter / 2
cy = diameter / 2
r  = diameter / 2 - strokeWidth / 2
circumference = 2 × π × r
```

**Track circle (always visible):**
- `stroke` = arc color at 12% opacity (use `stroke-opacity="0.12"` on the arc color value, not a separate rgba token)
- `fill="none"`
- `stroke-width` = size's stroke width (see table)
- `stroke-linecap="round"`

**Progress arc:**
- `stroke-dasharray` = circumference
- `stroke-dashoffset` = circumference × (1 − clampedProgress)
  - Where `clampedProgress = Math.min(Math.max(progress, 0), 1)`
- `fill="none"`
- `stroke-width` = same as track
- `stroke-linecap="round"`
- Transform: `rotate(-90deg)` around center (start arc at 12 o'clock)
  - Applied via `transform-origin: center` and `transform: rotate(-90deg)`
- Transition on `stroke-dashoffset`:
  ```css
  transition: stroke-dashoffset var(--nova-duration-celebrate) var(--nova-ease-spring);
  ```
  `--nova-duration-celebrate` = 600ms, `--nova-ease-spring` = `cubic-bezier(0.34, 1.56, 0.64, 1)`

**SVG gradient defs (per ring instance, not global):**

Use a unique `id` per instance to avoid DOM collisions. Generate with:
```typescript
readonly gradId = `ring-grad-${Math.random().toString(36).slice(2, 7)}`;
```

Define a `<linearGradient>` inside `<defs>` for each variant's complete state:
- `calories`: `#7c4dff` → `#5e35b1` (primary to primary-dark)
- `protein`: `#a78bfa` → `#7c4dff` (primary-light to primary)
- `water`: `#4ade80` → `#22d3ee` (success to hydration cyan)
- `workouts`: `#4ade80` → `#38bdf8` (success green to info blue)

The gradient is applied as `stroke: url(#ring-grad-{id})` on the progress arc only when `state === 'complete'`.

### Color Variants (arc stroke color)

| Variant | Arc stroke (partial state) | Complete state stroke |
|---|---|---|
| `calories` | `var(--nova-primary)` | `url(#ring-grad-{id})` gradient |
| `protein` | `var(--nova-primary-light)` | `url(#ring-grad-{id})` gradient |
| `water` | `var(--nova-info)` | `url(#ring-grad-{id})` gradient |
| `workouts` | `var(--nova-success)` | `url(#ring-grad-{id})` gradient |

### States

**empty** (`progress === 0`, not loading):
- Track arc visible at 12% opacity of the variant's arc color
- No fill arc rendered (or `stroke-dashoffset = circumference`, effectively invisible)
- Center slot (md/lg): renders projected content showing `0` or `--`
- No animation

**partial** (`0 < progress < 1`):
- Fill arc rendered with spring transition when `progress` input changes
- Track arc visible at 12% opacity
- Center slot renders projected content

**complete** (`progress >= 1`, clamped to 1):
- Fill arc uses `url(#ring-grad-{id})` stroke (gradient)
- Center slot text element applies one-shot scale pulse:
  ```css
  animation: ringCenterPop var(--nova-duration-celebrate) var(--nova-ease-spring) forwards;
  ```
  Keyframe `ringCenterPop`: `scale(1) → scale(1.08) → scale(1.0)` — defined locally in the component's styles (not global, since it is a ring-specific animation)
- Track arc: `stroke-opacity: 0.06` (slightly more receded to emphasize the filled arc)

**loading** (`loading === true`, overrides all other states):
- Only the track arc is rendered
- A 25%-length visible arc rotates continuously:
  ```css
  animation: ringSpinner 350ms linear infinite;
  ```
  Keyframe `ringSpinner`: `stroke-dashoffset` animates through a full circumference rotation using `transform: rotate(0deg)` → `rotate(360deg)` on the SVG arc element
  Duration uses `var(--nova-duration-entrance)` = 350ms (not celebrate, this is a loading indicator)
- Arc color: variant's partial color at 40% opacity
- No center slot content rendered in loading state — slot shows nothing

### Center Slot

Only `md` and `lg` sizes have a center slot. `sm` has no center slot.

The center slot uses Angular's content projection:
```html
<ng-content select="[ringCenter]"></ng-content>
```

It is an absolutely-positioned container centered over the SVG. The projected content is responsible for its own layout. This keeps the component unopinionated about what goes inside.

Example usage:
```html
<app-progress-ring size="lg" variant="calories" [progress]="caloriesProgress">
  <div ringCenter class="ring-center-content">
    <span class="ring-value">{{ caloriesConsumed }}</span>
    <span class="ring-sublabel">kcal</span>
  </div>
</app-progress-ring>
```

### Label Below Ring

When `label` input is provided:
- Rendered in a `<div class="ring-label">` immediately below the host container (`flex-direction: column` on outer wrapper)
- Typography: `var(--nova-text-sm)` (11px) / `--nova-weight-bold` (700) / `var(--nova-text-hint)` (rgba 255,255,255,0.45)
- Text transform: `uppercase`
- Letter spacing: `0.05em`
- Margin-top: `var(--nova-space-1)` (4px)

### Visual Structure (ASCII)

```
┌──────────────────────────┐
│  ┌──────────────────┐    │   ← host container (e.g. 120×120 for lg)
│  │   SVG            │    │
│  │  ┌─────────┐     │    │
│  │  │ track ○ │     │    │   ← SVG track arc (stroke-opacity 0.12)
│  │  │ fill  ◕ │     │    │   ← SVG fill arc (progress-driven dashoffset)
│  │  │         │     │    │
│  │  │ [slot]  │     │    │   ← absolute center div (ng-content ringCenter)
│  │  └─────────┘     │    │
│  └──────────────────┘    │
│  [label text if provided]│
└──────────────────────────┘
```

### Component Template Structure

```html
<div class="ring-wrapper ring-wrapper--{{ size }}">
  <div class="ring-svg-container">
    <svg [attr.viewBox]="'0 0 ' + diameter + ' ' + diameter"
         [attr.width]="diameter" [attr.height]="diameter">
      <defs>
        <linearGradient [id]="gradId" x1="0%" y1="0%" x2="100%" y2="100%">
          <!-- variant-specific gradient stops -->
        </linearGradient>
      </defs>
      <!-- track arc -->
      <circle class="ring-track"
              [attr.cx]="cx" [attr.cy]="cy" [attr.r]="r"
              [attr.stroke]="arcColor"
              [attr.stroke-width]="strokeWidth"
              stroke-opacity="0.12"
              fill="none"
              stroke-linecap="round" />
      <!-- fill arc (hidden in loading state) -->
      @if (!loading) {
        <circle class="ring-fill"
                [class.ring-fill--complete]="isComplete"
                [attr.cx]="cx" [attr.cy]="cy" [attr.r]="r"
                [attr.stroke]="isComplete ? 'url(#' + gradId + ')' : arcColor"
                [attr.stroke-width]="strokeWidth"
                [attr.stroke-dasharray]="circumference"
                [attr.stroke-dashoffset]="dashOffset"
                fill="none"
                stroke-linecap="round"
                style="transform: rotate(-90deg); transform-origin: 50% 50%;" />
      }
      <!-- loading arc -->
      @if (loading) {
        <circle class="ring-loading-arc"
                [attr.cx]="cx" [attr.cy]="cy" [attr.r]="r"
                [attr.stroke]="arcColor"
                [attr.stroke-width]="strokeWidth"
                [attr.stroke-dasharray]="circumference * 0.25 + ' ' + circumference * 0.75"
                fill="none"
                stroke-linecap="round" />
      }
    </svg>
    <!-- center slot for md and lg only -->
    @if (size !== 'sm') {
      <div class="ring-center-slot">
        <ng-content select="[ringCenter]"></ng-content>
      </div>
    }
  </div>
  @if (label) {
    <div class="ring-label">{{ label }}</div>
  }
</div>
```

### Computed Properties (TypeScript)

```typescript
readonly clampedProgress = computed(() => Math.min(Math.max(this.progress, 0), 1));
readonly isComplete = computed(() => this.progress >= 1);

// Size-driven constants
readonly diameter = computed(() => ({ sm: 44, md: 72, lg: 108 }[this.size]));
readonly strokeWidth = computed(() => ({ sm: 4, md: 6, lg: 8 }[this.size]));
readonly r = computed(() => this.diameter() / 2 - this.strokeWidth() / 2);
readonly circumference = computed(() => 2 * Math.PI * this.r());
readonly cx = computed(() => this.diameter() / 2);
readonly cy = computed(() => this.diameter() / 2);
readonly dashOffset = computed(() => this.circumference() * (1 - this.clampedProgress()));

// Variant-driven arc color (CSS variable string)
readonly arcColor = computed(() => ({
  calories: 'var(--nova-primary)',
  protein: 'var(--nova-primary-light)',
  water: 'var(--nova-info)',
  workouts: 'var(--nova-success)',
}[this.variant]));
```

### CSS Classes

```
.ring-wrapper              — outer flex column container (position: relative)
.ring-wrapper--sm          — size modifier: 48×48px host
.ring-wrapper--md          — size modifier: 80×80px host
.ring-wrapper--lg          — size modifier: 120×120px host
.ring-svg-container        — position: relative; contains SVG + center slot
.ring-track                — SVG track circle element
.ring-fill                 — SVG fill arc element
.ring-fill--complete       — applied when isComplete; triggers ringCenterPop on center slot
.ring-loading-arc          — SVG loading spinner arc
.ring-center-slot          — absolute center projection container
.ring-label                — text label below ring
```

### Angular Material Components Used

None. This is a pure SVG + Angular component.

### Accessibility

- Host element: `role="meter"` `aria-valuenow="{{ Math.round(clampedProgress() * 100) }}"` `aria-valuemin="0"` `aria-valuemax="100"` `aria-label="{{ variant }} progress: {{ Math.round(clampedProgress() * 100) }}%"`
- When loading: `aria-busy="true"` `aria-label="Loading {{ variant }} progress"`
- The SVG does not receive focus independently — the host `div` is the ARIA target

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .ring-fill {
    transition: none;
  }
  .ring-loading-arc {
    animation: none;
  }
  .ring-fill--complete .ring-center-slot {
    animation: none;
  }
}
```

### Responsiveness

This component has no internal responsive behavior. Its size is controlled entirely by the `size` input. The parent layout is responsible for responsive ring sizing. The `RingsHeroComponent` handles all breakpoint-driven size changes.

---

## Component 2: RingsHeroComponent (Dashboard Rings Hero Section)

**Path:** `src/app/features/dashboard/rings-hero/rings-hero.component.ts`
**Selector:** `app-rings-hero`
**Type:** Standalone, feature-specific, composes ProgressRingComponent

### Summary

The top-of-dashboard hero section that replaces the legacy ctrl-bar as the primary progress visualization. Shows three progress rings (calories, protein, workouts) answering "how is my day going?" in one glance, plus a streak badge and a goal completion label. Addresses audit findings D1 (no goal progress visualization), D4 (zero emotional feedback), D5 (streak visual weight insufficient).

### Angular Inputs / Outputs

```typescript
@Input() caloriesConsumed: number = 0
@Input() caloriesTarget: number = 2000
  // TDEE target from DashboardFacade
@Input() proteinConsumedG: number = 0
@Input() proteinTargetG: number = 150
  // Derived from DashboardFacade.proteinTargetG computed signal
@Input() workoutsThisWeek: number = 0
@Input() workoutsWeeklyTarget: number = 3
  // User-configured or default 3 workouts/week
@Input() currentStreak: number = 0
@Input() loggedToday: boolean = false
  // Whether the user has logged any data today (drives streak pulse)
// No outputs
```

### Computed Properties

```typescript
readonly caloriesProgress = computed(() =>
  this.caloriesTarget > 0 ? this.caloriesConsumed / this.caloriesTarget : 0
);
readonly proteinProgress = computed(() =>
  this.proteinTargetG > 0 ? this.proteinConsumedG / this.proteinTargetG : 0
);
readonly workoutsProgress = computed(() =>
  this.workoutsWeeklyTarget > 0 ? this.workoutsThisWeek / this.workoutsWeeklyTarget : 0
);

readonly caloriesRemaining = computed(() =>
  Math.max(0, this.caloriesTarget - this.caloriesConsumed)
);
readonly caloriesOver = computed(() =>
  Math.max(0, this.caloriesConsumed - this.caloriesTarget)
);

// Goal completion: each ring counts if it meets its threshold
readonly goalsOnTrack = computed(() => {
  let count = 0;
  if (this.caloriesProgress() >= 0.8) count++;        // 80% of calorie target logged
  if (this.proteinProgress() >= 0.8) count++;          // 80% of protein target
  if (this.workoutsProgress() >= 1.0) count++;         // weekly workout target met
  return count;
});

readonly completionLabel = computed(() => {
  const g = this.goalsOnTrack();
  if (this.caloriesConsumed === 0 && this.proteinConsumedG === 0) {
    return 'Log your first entry';
  }
  if (g === 3) return 'Day Complete!';
  return `${g}/3 goals on track`;
});

readonly allComplete = computed(() => this.goalsOnTrack() === 3);
```

### Layout — Desktop (≥ 640px)

```
.rings-hero
  .rings-row                    ← flex row, justify: center, align: center
    .ring-slot.ring-slot--left  ← Protein ring (md)
    .ring-slot.ring-slot--center← Calories ring (lg) ← PRIMARY, larger
    .ring-slot.ring-slot--right ← Workouts ring (md)
  .rings-streak-row             ← streak badge, centered, margin-top 12px
  .rings-completion-label       ← completion text, centered, margin-top 8px
```

Gap between ring slots: `var(--nova-space-8)` (32px)

Vertical alignment: md rings are vertically centered relative to the lg ring using `align-items: center` on `.rings-row`.

### Layout — Mobile (< 640px)

```
.rings-hero
  .rings-row-mobile-primary     ← calories ring (lg), centered, full width
  .rings-row-mobile-secondary   ← flex row: [protein md] [workouts md], gap 24px, centered
  .rings-streak-row             ← streak badge, centered
  .rings-completion-label       ← completion text, centered
```

Implementation: toggle layout with a CSS class on the `.rings-hero` container based on viewport, or use a responsive flex-wrap approach:
```css
.rings-row {
  flex-wrap: nowrap;
  /* at < 640px, override via .rings-hero.rings-hero--mobile */
}
```

### Ring Center Slot Content

**Calories lg ring center slot (`ringCenter`):**
- Primary value: `caloriesConsumed` at `22px` / `--nova-weight-extrabold` (800) / `var(--nova-text-primary)`
- Below: "kcal" label at `var(--nova-text-xs)` (10px) / `var(--nova-text-hint)` (rgba 255,255,255,0.45)
- **Hover state (desktop only):** Center content fades (opacity 0 over `--nova-duration-micro`) and transitions to show `caloriesRemaining` value:
  - If `caloriesRemaining > 0`: value text in `var(--nova-success)`, label text "+420 left" or "420 left"
  - If `caloriesOver > 0`: value text in `var(--nova-accent)`, label "over goal"
  - This is a CSS hover transition on `.ring-slot--center:hover .ring-center-content` — no JS needed
  - Duration: `var(--nova-duration-standard)` (200ms) / `var(--nova-ease-out)`

**Protein md ring center slot:**
- Value: `proteinConsumedG` (rounded to integer) at `var(--nova-text-body-md)` (14px) / `--nova-weight-bold` (700) / `var(--nova-text-primary)`
- Label: "protein" at `var(--nova-text-xs)` / `var(--nova-text-hint)`

**Workouts md ring center slot:**
- Value: `workoutsThisWeek` at `var(--nova-text-body-md)` (14px) / `--nova-weight-bold` (700) / `var(--nova-text-primary)`
- Label: "workouts" at `var(--nova-text-xs)` / `var(--nova-text-hint)`

### Streak Badge

```
.rings-streak-badge
  mat-icon "local_fire_department" (16px)  +  "{streak} day streak"  +  " day streak" label
```

Visual spec:
- Container: `display: inline-flex; align-items: center; gap: var(--nova-space-1); padding: var(--nova-space-1) var(--nova-space-3); border-radius: var(--nova-radius-pill)`
- Background: `var(--nova-primary-alpha-10)` (rgba 124,77,255,0.10)
- Border: `1px solid var(--nova-primary-alpha-25)` (rgba 124,77,255,0.25)
- Flame icon: `var(--nova-streak-warm)` (#ff9f40), 16px — `mat-icon` with inline `font-size: 16px; line-height: 1`
- Streak count: `var(--nova-text-body-md)` (14px) / `--nova-weight-bold` / `var(--nova-text-primary)`
- " day streak" text: `var(--nova-text-body-sm)` (12px) / `var(--nova-weight-regular)` / `var(--nova-text-hint)`

Pulse animation when `loggedToday === true`:
```css
.rings-streak-badge.rings-streak-badge--logged .rings-streak-icon {
  animation: flamePulse 1.5s ease-in-out infinite;
}
```
`flamePulse` keyframe (existing, from dashboard component CSS — reuse it): scale 1 → 1.15 → 1 with opacity shift.

When `currentStreak === 0`: streak badge is hidden entirely — use `@if (currentStreak > 0)` guard.

### Completion Label

```html
<div class="rings-completion-label"
     [class.rings-completion-label--complete]="allComplete()">
  {{ completionLabel() }}
</div>
```

Typography:
- Default: `var(--nova-text-body-sm)` (12px) / `--nova-weight-medium` / `var(--nova-text-muted)` (rgba 255,255,255,0.55)
- When `goalsOnTrack() > 0 && !allComplete()`: color shifts to `var(--nova-text-secondary)` (rgba 255,255,255,0.85)
- When `allComplete()`: `var(--nova-success)` (#4ade80) / `--nova-weight-bold` — add `rings-completion-label--complete` modifier class

### States

**New user / no data (caloriesConsumed === 0 and proteinConsumedG === 0 and workoutsThisWeek === 0):**
- All three rings at `progress=0` — empty state
- Center slots show `0`
- Completion label: "Log your first entry" in `var(--nova-text-hint)`
- Streak badge hidden (streak is 0)

**Partial progress (default returning user):**
- Rings fill to their respective computed progress values
- Spring transition on any change
- Completion label shows goal count text

**All complete (goalsOnTrack === 3):**
1. All three rings trigger complete state simultaneously, but with stagger:
   - Protein ring: `animation-delay: 0ms`
   - Calories ring: `animation-delay: 150ms`
   - Workouts ring: `animation-delay: 300ms`
   - Implement via CSS custom property `--ring-complete-delay` set on each `.ring-slot` in the template
2. Completion label animates to "Day Complete!" in `var(--nova-success)` with `fadeIn` animation (`var(--nova-duration-standard)`)
3. Hero section background transitions to a radial gradient (one-shot, triggered by adding `.rings-hero--complete` class):
   ```css
   .rings-hero--complete {
     background: radial-gradient(circle at 50% 60%, rgba(124,77,255,0.08) 0%, transparent 60%);
     transition: background var(--nova-duration-celebrate) var(--nova-ease-out);
   }
   ```
4. CSS confetti burst: 8 pseudo-element dots (4 on `::before`, 4 on `::after` of `.rings-row`) scatter outward using `transform: translate()` keyframes, colored with `var(--nova-primary)`, `var(--nova-success)`, `var(--nova-accent)`. Duration: `var(--nova-duration-celebrate)` then `opacity: 0`. Use `animation-fill-mode: forwards`.

**Loading (inputs not yet resolved — no separate loading input; parent passes 0 values):**
- Pass `loading=true` to each ring when the dashboard data is still fetching
- The parent `DashboardPageComponent` is responsible for passing the loading boolean based on `DashboardFacade.isLoading()`

### Section Container

```css
.rings-hero {
  padding: var(--nova-space-5) var(--nova-space-4);   /* 20px 16px */
  background: var(--nova-white-alpha-025);
  border: var(--nova-glass-card-border);               /* 1px solid var(--nova-white-alpha-08) */
  border-radius: var(--nova-radius-xl);                /* 20px */
  position: relative;
  overflow: hidden;                                     /* contain confetti dots */
}

@media (max-width: 640px) {
  .rings-hero {
    border-radius: 0;          /* edge-to-edge on mobile */
    border-left: none;
    border-right: none;
  }
}
```

### CSS Classes

```
.rings-hero                      — section container
.rings-hero--complete            — all goals complete; applied via [class.rings-hero--complete]="allComplete()"
.rings-row                       — desktop: flex row of 3 ring slots
.rings-row-mobile-primary        — mobile: single centered slot for calories lg ring
.rings-row-mobile-secondary      — mobile: 2-column row for protein + workouts
.ring-slot                       — wrapper for each ring + its label
.ring-slot--left                 — protein ring slot
.ring-slot--center               — calories ring slot (larger)
.ring-slot--right                — workouts ring slot
.ring-center-content             — inner content div inside the ringCenter slot
.ring-center-content--hover      — hover-revealed content (calories remaining)
.rings-streak-row                — row containing the streak badge
.rings-streak-badge              — pill-shaped streak indicator
.rings-streak-badge--logged      — modifier for logged-today pulse animation
.rings-streak-icon               — the flame mat-icon
.rings-completion-label          — goal count or "Day Complete!" text
.rings-completion-label--complete— green color modifier
```

### Angular Material Components Used

- `MatIconModule` for `local_fire_department` icon in streak badge

### Responsiveness

| Breakpoint | Layout change |
|---|---|
| ≥ 640px | Three rings inline, horizontal flex row. Calories center lg, protein/workouts flanking md. |
| < 640px | Calories lg centered on its own row. Protein md + Workouts md in 2-col row below. Gap `var(--nova-space-6)` (24px) between secondary rings. |
| < 400px | Secondary ring sizes can be reduced by the parent if needed via `size="sm"` — but default is md for all viewports. |

### Accessibility

- Host `section` element: `aria-label="Daily progress overview"`
- Each ring has its own `aria-label` from `ProgressRingComponent`
- Streak badge: `aria-label="{{ currentStreak }} day streak{{ loggedToday ? ', logged today' : '' }}"`
- Completion label: `role="status"` `aria-live="polite"` so screen readers announce goal completion when the text changes

---

## Component 3: FitnessDataBlockComponent

**Path:** `src/app/shared/components/fitness-data-block/fitness-data-block.component.ts`
**Selector:** `app-fitness-data-block`
**Type:** Standalone, shared, reusable metric tile

### Summary

A compact data display tile for a single fitness metric: an icon, a value with optional unit, a label, and an optional trend indicator. Used as the stat building block inside PostCard WORKOUT variants and potentially Dashboard stat panels. Addresses Finding S1's requirement for structured, visually legible stat tiles in social content.

### Angular Inputs / Outputs

```typescript
@Input() icon: string = ''
  // Material icon name, e.g. 'timer', 'fitness_center', 'bar_chart'
@Input() label: string = ''
  // e.g. 'exercises', 'duration', 'volume' — rendered uppercase, letter-spaced
@Input() value: number | null = null
  // null triggers loading state. A resolved 0 triggers the zero state.
@Input() unit?: string
  // e.g. 'sets', 'min', 'kg' — rendered inline after the value
@Input() trend?: 'up' | 'down' | null = null
  // Optional trend arrow shown inline right of value
@Input() size: 'sm' | 'md' = 'md'
@Input() iconColor?: string
  // CSS color value (full value, not a token name). Defaults to var(--nova-primary).
  // Pass the token reference as a string: iconColor="var(--nova-info)"
// No outputs
```

### Size Specifications

| Size | Min-width | Icon size | Icon container | Label font | Value font |
|---|---|---|---|---|---|
| `sm` | 56 px | `var(--nova-icon-default)` (18px) | 28 × 28 px | `var(--nova-text-xs)` (10px) | `var(--nova-text-body-sm)` (12px) / 700 |
| `md` | 72 px | `var(--nova-icon-lg)` (22px) | 36 × 36 px | `var(--nova-text-sm)` (11px) | `var(--nova-text-body-md)` (14px) / 700 |

### Layout (Vertical Stack)

```
.fitness-data-block.fitness-data-block--{size}
  .fdb-icon-wrap             ← circular container, icon inside
  .fdb-value-row             ← flex row: [value][unit][trend arrow]
  .fdb-label                 ← uppercase label below value
```

`display: flex; flex-direction: column; align-items: center; gap: var(--nova-space-1);`

### Icon Container

```css
.fdb-icon-wrap {
  border-radius: var(--nova-radius-circle);    /* 50% */
  display: flex; align-items: center; justify-content: center;
  /* background computed from iconColor at 12% opacity — set via inline style from component */
}
/* sm: width 28px; height 28px */
/* md: width 36px; height 36px */
```

Background is computed inline: `background: rgba({iconColorRGB}, 0.12)`. Since the component receives a CSS variable string, the simplest approach is to apply the background via an Angular class that is set based on `variant` context in PostCard. The `iconColor` input drives the icon text color (`mat-icon` color); the background uses a predefined alpha variant. The developer should note: if `iconColor` is a `var(--nova-*)` token, the background should use the corresponding alpha token. Recommended approach: accept a `iconVariant: 'primary' | 'info' | 'success' | 'warning' | 'protein'` input alongside `iconColor` to select the correct background token.

Revised API clarification:
```typescript
// Use iconVariant (not iconColor) to drive both icon color and background:
@Input() iconVariant: 'primary' | 'info' | 'success' | 'warning' | 'protein' = 'primary'
// 'primary'  → icon: var(--nova-primary),       bg: var(--nova-primary-alpha-14)
// 'info'     → icon: var(--nova-info),           bg: var(--nova-info-bg)
// 'success'  → icon: var(--nova-success),        bg: var(--nova-success-bg-12)
// 'warning'  → icon: var(--nova-warning),        bg: var(--nova-warning-bg)
// 'protein'  → icon: var(--nova-primary-light),  bg: var(--nova-primary-alpha-12)
```

The original `iconColor?: string` input can still be accepted for overrides, but `iconVariant` is the primary API.

### Value Row

```
.fdb-value-row
  span.fdb-value   ← the number
  span.fdb-unit    ← unit text (if provided)
  span.fdb-trend   ← trend arrow (if provided)
```

**Value:** `var(--nova-text-primary)` at the size's value font (see table above). Font weight 700.

**Unit:** `var(--nova-text-hint)` (rgba 255,255,255,0.45), same font size as value but weight 400. Margin-left `2px`.

**Trend arrow:**
- `▲` in `var(--nova-success)` for `'up'`, `▼` in `var(--nova-accent)` for `'down'`
- Font size: `var(--nova-text-xs)` (10px)
- Margin-left: `var(--nova-space-1)` (4px)
- Hidden when `trend` is null or undefined

### Label

```css
.fdb-label {
  font-size: var(--nova-text-xs);       /* 10px for sm, 11px for md — use size-specific token */
  font-weight: var(--nova-weight-bold);
  color: var(--nova-text-hint);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

### States

**loading (`value === null`):**
- Icon container: `background: var(--nova-white-alpha-06)` — replaces the icon color background. Icon still rendered but in `var(--nova-text-hint)`.
- Value area: skeleton shimmer block
  - sm: `40px × 12px`, md: `48px × 14px`
  - Background: `var(--nova-white-alpha-04)` animated with pulse
  - `animation: shimmer 1.4s ease-in-out infinite`
  - Keyframe: `var(--nova-white-alpha-04) → var(--nova-white-alpha-08) → var(--nova-white-alpha-04)`
  - `border-radius: var(--nova-radius-sm)` (8px)
- Label area: skeleton shimmer block `28px × 8px`, same pulse animation
- Trend arrow: hidden

**populated (`value !== null && value !== 0`):**
- Full display as described above
- On first render, the value animates from 0 to its final value:
  ```typescript
  // In ngOnChanges or an effect:
  // When value transitions from null/0 to a positive number,
  // trigger animateCounter(startEl, 0, value, 600)
  // animateCounter is a shared utility in shared/utils/animate-counter.ts
  ```
  Duration: 600ms, easing: ease-out. Skip animation if `prefers-reduced-motion`.

**zero (`value === 0`):**
- Value displays `--` (two em dashes) instead of `0`
- Text color: `var(--nova-text-hint)` (dimmed — signals "not yet logged", not "zero")
- Icon container at 50% opacity: `opacity: 0.5`
- Trend arrow: hidden

### CSS Classes

```
.fitness-data-block              — base container
.fitness-data-block--sm          — small size modifier
.fitness-data-block--md          — medium size modifier
.fdb-icon-wrap                   — circular icon container
.fdb-value-row                   — flex row for value + unit + trend
.fdb-value                       — the number text
.fdb-unit                        — unit text
.fdb-trend                       — trend arrow character
.fdb-trend--up                   — success color modifier
.fdb-trend--down                 — accent color modifier
.fdb-label                       — uppercase label below value
.fdb-skeleton-value              — shimmer block for loading state
.fdb-skeleton-label              — shimmer block for label
```

### Angular Material Components Used

- `MatIconModule` for the icon

### Accessibility

- `role="group"` on `.fitness-data-block`
- `aria-label="{{ value ?? 'loading' }} {{ unit ?? '' }} {{ label }}"` — e.g. `"24 sets exercises"`
- When loading: `aria-busy="true"` `aria-label="Loading {{ label }} metric"`
- Trend arrow: `aria-label="{{ trend === 'up' ? 'trending up' : 'trending down' }}"` on `.fdb-trend`; decorative text character gets `aria-hidden="true"` and the `aria-label` is on the parent span

### Responsiveness

No internal responsive behavior. The parent layout controls sizing via the `size` input. In PostCard's stats row (3 blocks inline), the parent ensures each block has `flex: 1; min-width: 0` to shrink gracefully on narrow viewports.

---

## Component 4: PostCard Type Branching

**Path:** `src/app/features/social/components/post-card/post-card.component.ts` (update existing)
**Type:** Existing component, additive update — no file rename, no component split

### Summary

The existing PostCard component gains 4 visually distinct rendering variants based on the type of linked content attached to the post. Variant 1 (WORKOUT) and Variant 2 (MEAL) activate when structured `linkedContentData` is present (per ADR-1). Variant 3 (MILESTONE) activates via a `isMilestone` flag or text detection. Variant 4 (TEXT/DEFAULT) is unchanged — it is the existing baseline. The component file structure is not changed; new template blocks are added using `@switch`.

### Privacy Constraint (repeated here — enforcer is the developer reading this spec)

> WORKOUT cards: display ONLY `TemplateTitle`, `DurationMin`, `ExerciseCount`, `TotalSets`, `TotalVolumeKg`.
> MEAL cards: display ONLY the meal name. No macros, no calories.
> The `estimatedCaloriesKcal`, `proteinG`, `carbsG`, `fatG`, `totalCalories` fields from `LinkedContentData` are FORBIDDEN in any public-facing template.

### TypeScript Interface (add to `social.model.ts`)

```typescript
export interface LinkedContentData {
  // Workout fields — null/undefined for meal posts
  exerciseCount?: number;
  totalSets?: number;
  totalVolumeKg?: number;
  durationMin?: number;
  templateTitle?: string;
  estimatedCaloriesKcal?: number;  // EXISTS IN DATA — DO NOT RENDER IN TEMPLATE

  // Meal fields — null/undefined for workout posts
  proteinG?: number;     // EXISTS IN DATA — DO NOT RENDER IN TEMPLATE
  carbsG?: number;       // EXISTS IN DATA — DO NOT RENDER IN TEMPLATE
  fatG?: number;         // EXISTS IN DATA — DO NOT RENDER IN TEMPLATE
  totalCalories?: number; // EXISTS IN DATA — DO NOT RENDER IN TEMPLATE
}

// Add to Post interface:
// linkedContentData?: LinkedContentData;
// isMilestone?: boolean;
```

### Type Detection Computed Signals (add to PostCard component)

```typescript
readonly postVariant = computed((): 'workout' | 'meal' | 'milestone' | 'text' => {
  const lc = this.post().linkedContent;
  const lcd = this.post().linkedContentData;

  // WORKOUT: linked content type is workout AND structured data is present
  if (lc?.type === 'workout' && lcd?.exerciseCount != null) return 'workout';

  // MEAL: linked content type is meal (structured data not required for meal — only name shown)
  if (lc?.type === 'meal') return 'meal';

  // MILESTONE: explicit flag OR text pattern detection
  if (this.post().isMilestone) return 'milestone';
  const text = this.post().content ?? '';
  if (/\bPR\b|personal record|🎯/i.test(text) && lc == null) return 'milestone';

  // TEXT: default
  return 'text';
});

// Legacy fallback: when linkedContentData is absent but linkedContent.subtitle exists
readonly hasStructuredData = computed(() =>
  this.post().linkedContentData?.exerciseCount != null
);
```

### Template Structure

```html
<!-- The linked content block replaces the existing .linked-content-preview div -->
@switch (postVariant()) {

  @case ('workout') {
    <!-- WORKOUT VARIANT — privacy reviewed: only permitted fields used -->
    <div class="post-fitness-block post-fitness-block--workout">
      <div class="pfb-accent-bar"></div>
      <div class="pfb-body">
        <div class="pfb-header">
          <div class="pfb-icon-wrap pfb-icon-wrap--workout">
            <mat-icon>sports</mat-icon>
          </div>
          <span class="pfb-title">
            <!-- PRIVACY: field permitted — TemplateTitle -->
            {{ post().linkedContentData?.templateTitle ?? post().linkedContent?.title }}
          </span>
        </div>
        <div class="pfb-stats-row">
          <app-fitness-data-block
            icon="timer"
            label="duration"
            [value]="post().linkedContentData?.durationMin ?? null"
            unit="min"
            size="sm"
            iconVariant="info"
            <!-- PRIVACY: field permitted — DurationMin -->
          />
          <app-fitness-data-block
            icon="fitness_center"
            label="exercises"
            [value]="post().linkedContentData?.exerciseCount ?? null"
            size="sm"
            iconVariant="primary"
            <!-- PRIVACY: field permitted — ExerciseCount -->
          />
          <app-fitness-data-block
            icon="bar_chart"
            label="sets"
            [value]="post().linkedContentData?.totalSets ?? null"
            size="sm"
            iconVariant="protein"
            <!-- PRIVACY: field permitted — TotalSets -->
          />
        </div>
      </div>
    </div>
  }

  @case ('meal') {
    <!-- MEAL VARIANT — privacy reviewed: only meal name shown -->
    <div class="post-fitness-block post-fitness-block--meal">
      <div class="pfb-accent-bar pfb-accent-bar--meal"></div>
      <div class="pfb-body">
        <div class="pfb-header">
          <div class="pfb-icon-wrap pfb-icon-wrap--meal">
            <mat-icon>restaurant_menu</mat-icon>
          </div>
          <div class="pfb-meal-info">
            <span class="pfb-title">
              <!-- PRIVACY: field permitted — meal name only -->
              {{ post().linkedContent?.title }}
            </span>
            @if (post().linkedContent?.subtitle) {
              <span class="pfb-meal-type-pill">{{ post().linkedContent!.subtitle }}</span>
              <!-- subtitle here is the meal type label (Breakfast/Lunch/etc), NOT macros -->
            }
          </div>
        </div>
      </div>
    </div>
  }

  @case ('milestone') {
    <!-- MILESTONE VARIANT -->
    <div class="post-milestone-block">
      <div class="pmb-banner">
        <mat-icon>emoji_events</mat-icon>
        <span class="pmb-banner-label">Milestone</span>
      </div>
    </div>
  }

  @default {
    <!-- TEXT VARIANT — no linked content block rendered -->
    <!-- The existing .linked-content-preview block renders here if linkedContent exists
         as a legacy fallback for posts without structured data -->
    @if (post().linkedContent && !hasStructuredData()) {
      <!-- existing legacy linked-content-preview markup — KEEP UNCHANGED -->
    }
  }

}
```

### Variant 1: WORKOUT Visual Spec

**Post-fitness-block container (`.post-fitness-block--workout`):**
- `background: var(--nova-primary-alpha-06)` (rgba 124,77,255,0.06)
- `border: 1px solid var(--nova-primary-alpha-18)` (rgba 124,77,255,0.18)
- `border-radius: var(--nova-radius-md)` (12px)
- `padding: var(--nova-space-3) var(--nova-space-4)` (12px 16px)
- `margin: var(--nova-space-2) 0` (8px 0)
- `position: relative; overflow: hidden`

**Left accent bar (`.pfb-accent-bar`):**
- `position: absolute; left: 0; top: 0; bottom: 0; width: 3px`
- `background: var(--nova-primary)`
- `border-radius: var(--nova-radius-xl) 0 0 var(--nova-radius-xl)` — rounded on left edge only

**Icon container (`.pfb-icon-wrap--workout`):**
- `width: 40px; height: 40px; border-radius: var(--nova-radius-md)` (12px)
- `background: var(--nova-primary-alpha-14)` (rgba 124,77,255,0.14)
- `border: 1px solid var(--nova-primary-alpha-28)` (rgba 124,77,255,0.28)
- `display: flex; align-items: center; justify-content: center`
- Icon: `sports` mat-icon at `var(--nova-icon-lg)` (22px), color `var(--nova-primary-light)`

**Title (`.pfb-title`):**
- `var(--nova-text-subtitle)` (16px) / `--nova-weight-bold` / `var(--nova-text-primary)`

**Stats row (`.pfb-stats-row`):**
- `display: flex; flex-direction: row; gap: var(--nova-space-4)` (16px); `margin-top: var(--nova-space-3)` (12px)
- Three `app-fitness-data-block` components with `size="sm"`

**Hover (desktop):**
- `border-color: var(--nova-primary-alpha-28)` over `var(--nova-duration-standard)` (200ms)
- `box-shadow: var(--nova-shadow-card-hover)`
- `transform: translateY(-2px)`
- Transition: `var(--nova-transition-card)`

### Variant 2: MEAL Visual Spec

**Post-fitness-block container (`.post-fitness-block--meal`):**
- `background: var(--nova-accent-alpha-10)` (rgba 255,64,129,0.10)
- `border: 1px solid var(--nova-accent-alpha-18)` (rgba 255,64,129,0.18)
- Same `border-radius`, `padding`, `margin` as workout variant
- `position: relative; overflow: hidden`

**Accent bar (`.pfb-accent-bar--meal`):**
- Same position/dimensions as workout bar
- `background: var(--nova-accent)` (pink)

**Icon container (`.pfb-icon-wrap--meal`):**
- `background: var(--nova-accent-alpha-12)` (rgba 255,64,129,0.12)
- `border: 1px solid var(--nova-accent-alpha-20)` (rgba 255,64,129,0.20)
- Same size and border-radius as workout icon wrap
- Icon: `restaurant_menu` at same size, color `var(--nova-accent)`

**Meal type pill (`.pfb-meal-type-pill`):**
- Rendered only when `linkedContent.subtitle` is a meal type string (Breakfast, Lunch, etc.)
- `background: var(--nova-accent-alpha-10); border: 1px solid var(--nova-accent-alpha-18); border-radius: var(--nova-radius-pill); padding: 2px 8px`
- `font-size: var(--nova-text-xs)` (10px) / `--nova-weight-bold` / `var(--nova-accent)` / uppercase

**Hover:**
- `border-color: var(--nova-accent-alpha-25)` over `var(--nova-duration-standard)`

### Variant 3: MILESTONE Visual Spec

**Full card gets special treatment** — this modifier is applied to the outermost `.feed-card` or `.post-card` element:
```css
.feed-card.feed-card--milestone {
  border: 1px solid rgba(251, 191, 36, 0.25);     /* celebration gold border */
  background: linear-gradient(to bottom,
    rgba(124, 77, 255, 0.06),                       /* subtle purple top */
    var(--nova-white-alpha-025)                      /* baseline card bg bottom */
  );
}
```

**Milestone banner block (`.pmb-banner`):**
- Positioned as the top section of the linked-content slot (rendered above post text, not below)
- `height: 56px`
- `background: var(--nova-gradient-brand)` (`linear-gradient(135deg, var(--nova-primary), var(--nova-accent))`)
- `border-radius: var(--nova-radius-md) var(--nova-radius-md) 0 0` (top corners rounded, flat bottom)
- `display: flex; align-items: center; justify-content: center; gap: var(--nova-space-2)`
- Icon: `emoji_events` mat-icon, 24px, white (`var(--nova-text-primary)`)
- Label: "Milestone" at `var(--nova-text-sm)` (11px) / `--nova-weight-bold` / uppercase / `var(--nova-text-primary)` / letter-spacing 0.05em

**Post text (milestone card):**
- Rendered below the `.pmb-banner`
- `font-size: var(--nova-text-subtitle)` (16px) / `--nova-weight-semibold` / `var(--nova-text-primary)`

**Card border:**
- `border: 1px solid var(--nova-primary-alpha-25)` (rgba 124,77,255,0.25)

### Variant 4: TEXT (Default)

No changes to existing styling. The current `rgba(255,255,255,0.025)` background and `var(--nova-white-alpha-08)` border are preserved exactly. The `@default` branch of `@switch` renders the existing template structure. Zero visual regression on text posts.

### Legacy Fallback (posts without `linkedContentData`)

When `post.linkedContentData` is absent (legacy posts created before ADR-1 migration), the `@default` branch falls back to the existing `linkedContent.subtitle` string rendering. This maintains backward compatibility without a data migration.

### CSS Classes (new — add to post-card component stylesheet)

```
.post-fitness-block              — base for workout/meal fitness content block
.post-fitness-block--workout     — workout variant: primary color treatment
.post-fitness-block--meal        — meal variant: accent color treatment
.pfb-accent-bar                  — 3px left border (workout: primary, meal: accent)
.pfb-accent-bar--meal            — meal color override for accent bar
.pfb-body                        — padding wrapper inside the block
.pfb-header                      — flex row: icon + title
.pfb-icon-wrap                   — circular/rounded icon container
.pfb-icon-wrap--workout          — workout-specific icon container colors
.pfb-icon-wrap--meal             — meal-specific icon container colors
.pfb-title                       — workout/meal name
.pfb-meal-info                   — flex column: title + meal type pill
.pfb-meal-type-pill              — meal type badge (Breakfast/Lunch/etc)
.pfb-stats-row                   — flex row of 3 FitnessDataBlock components
.post-milestone-block            — milestone linked content slot
.pmb-banner                      — gradient banner strip at top of milestone block
.pmb-banner-label                — "Milestone" uppercase text in banner
.feed-card--milestone            — modifier on the root card for gold border + gradient bg
```

### Angular Material Components Used

- `MatIconModule` for `sports`, `restaurant_menu`, `emoji_events` icons

### Accessibility

- `.post-fitness-block`: `role="region"` `aria-label="Workout data"` or `"Meal data"` depending on variant
- Stats row: `role="list"` — each `app-fitness-data-block` is a `role="listitem"`
- Milestone banner: `role="img"` `aria-label="Milestone achievement"`

---

## Component 5: PullToRefreshDirective

**Path:** `src/app/shared/directives/pull-to-refresh.directive.ts`
**Type:** Standalone directive, CDK-aware

### Summary

An Angular directive for mobile pull-to-refresh on the social feed container. Uses CDK ScrollDispatcher and native PointerEvents (not deprecated TouchEvent) for cross-device compatibility. Disabled automatically on desktop (≥ 768px viewport width). Addresses Finding S3 — critical missing interaction on the social feed.

### Angular Directive API

```typescript
@Directive({
  selector: '[appPullToRefresh]',
  standalone: true,
  exportAs: 'appPullToRefresh'
})
export class PullToRefreshDirective {
  @Input() ptrThreshold: number = 64
    // Pull distance in pixels required to trigger refresh. Default: 64px.
  @Output() refresh = new EventEmitter<void>()
    // Emitted when user releases at or above threshold.

  complete(): void {
    // Called by the parent component when the refresh operation has finished.
    // Triggers the "completing" phase: feed returns to translateY(0), indicator fades.
  }
}
```

Usage in the feed component template:
```html
<div class="feed-page" appPullToRefresh [ptrThreshold]="64"
     (refresh)="onRefresh()" #ptr="appPullToRefresh">
  <!-- feed content -->
</div>
```

In the feed component class:
```typescript
@ViewChild('ptr') ptr!: PullToRefreshDirective;

async onRefresh(): Promise<void> {
  await this.facade.loadFeed(true);
  this.ptr.complete();
}
```

### Pull Phases

**Phase 1 — idle:**
- `scrollTop > 0` on host, or viewport ≥ 768px: directive is inactive
- No visual indicator
- All pointer events pass through normally

**Phase 2 — pulling (0px < pullDistance < ptrThreshold):**

Visual indicator (`div.ptr-indicator`) injected into the DOM as the first child of the host element's parent:
```html
<div class="ptr-indicator" [ngStyle]="{ transform: indicatorTransform }">
  <mat-icon class="ptr-icon" [ngStyle]="{ transform: iconRotation }">expand_more</mat-icon>
</div>
```

Indicator position: `position: absolute; top: 0; left: 50%; transform: translateX(-50%) translateY({indicatorTranslateY})` where:
```
indicatorTranslateY = -48px + (pullDistance / ptrThreshold) * 48px
```
At 0px pull: indicator fully hidden above viewport (`translateY(-48px)`)
At 64px pull: indicator fully visible (`translateY(0)`)

Icon rotation: `rotate({(pullDistance / ptrThreshold) * 180}deg)`
- At 0px pull: `rotate(0deg)` — pointing down
- At 64px pull: `rotate(180deg)` — pointing up (visually signals "release to refresh")

Icon color: `var(--nova-text-secondary)` (rgba 255,255,255,0.85) during pulling phase

Opacity: `0 + (pullDistance / ptrThreshold) * 1` — fades in linearly with pull distance

Feed content host: `transform: translateY({pullDistance * 0.4}px)` — content follows with 40% dampening (rubber-band feel)

**Phase 3 — ready (pullDistance >= ptrThreshold):**

Visual indicator:
- Icon: switches from `expand_more` to `refresh` mat-icon
- Icon rotation: animated continuous spin at 1 rotation per 600ms (`animation: spin 600ms linear infinite`)
  - Keyframe: `@keyframes ptr-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`
- Icon color: `var(--nova-primary)` (#7c4dff)
- Indicator: snaps to fully visible position with spring: `transition: transform var(--nova-duration-fast) var(--nova-ease-spring)`
  - `--nova-duration-fast` = 180ms, spring easing

**Phase 4 — refreshing (pointer released at >= threshold):**

Triggered on `pointerup` when `pullDistance >= ptrThreshold`:
1. `refresh.emit()` fires immediately
2. Feed content: `transform: translateY(56px)` — content pushes down to reveal indicator
   - `transition: transform var(--nova-duration-standard) var(--nova-ease-out)` (200ms)
3. Indicator: `mat-progress-spinner` (diameter 28px) replaces the `mat-icon`
   - `mode="indeterminate"`, styled with `color: var(--nova-primary)` via `--mdc-circular-progress-active-indicator-color: var(--nova-primary)`
4. State locked — pointer events disabled on the pull gesture until `complete()` is called

**Phase 5 — completing (after `complete()` is called):**

1. Feed content: `transform: translateY(0)` — slides back up
   - `transition: transform var(--nova-duration-standard) var(--nova-ease-out)`
2. Indicator: `opacity: 0`
   - `transition: opacity var(--nova-duration-standard) var(--nova-ease-out)`
3. After transitions complete (`setTimeout(duration)`): remove indicator from DOM, reset all state signals to idle

**Phase abort — release below threshold (< 64px pull, then release):**

1. Feed content: `transform: translateY(0)` with spring transition (`var(--nova-ease-spring)`, `var(--nova-duration-standard)`)
2. Indicator: `opacity: 0; transform: translateY(-48px)`
3. Reset to idle after transition

### Desktop Disable Guard

At the top of `pointerdown` handler:
```typescript
private isDesktop(): boolean {
  return window.matchMedia('(min-width: 768px)').matches;
}
```
If `isDesktop()` returns true: all pointer handlers return early immediately. The directive is inert on desktop.

### Scroll Position Guard

At the top of `pointermove` handler:
```typescript
if (this.el.nativeElement.scrollTop > 0) {
  // User is mid-scroll — pass through normally, do not activate pull gesture
  return;
}
```
The pull gesture only activates when `scrollTop === 0` AND the pointer is moving downward.

### Pointer Event Handling

Use `@HostListener` for pointer events (not `addEventListener` directly):

```typescript
@HostListener('pointerdown', ['$event'])
onPointerDown(e: PointerEvent): void { ... }

@HostListener('pointermove', ['$event'])
onPointerMove(e: PointerEvent): void { ... }

@HostListener('pointerup', ['$event'])
onPointerUp(e: PointerEvent): void { ... }

@HostListener('pointercancel', ['$event'])
onPointerCancel(e: PointerEvent): void { ... }
```

`pointercancel` is treated identically to a below-threshold release — abort and reset.

Note: Do NOT use `passive: true` on `pointermove` here because the directive calls `preventDefault()` to prevent the page scroll when the pull gesture is active. Call `e.preventDefault()` on `pointermove` only when `scrollTop === 0` and `isPulling === true`.

### Indicator DOM Injection

The directive injects the indicator element relative to the host. Strategy:

```typescript
private createIndicator(): void {
  this.indicator = this.renderer.createElement('div');
  this.renderer.addClass(this.indicator, 'ptr-indicator');
  // Insert as first child of host's parent element, before the host
  this.renderer.insertBefore(
    this.el.nativeElement.parentElement,
    this.indicator,
    this.el.nativeElement
  );
}
```

Use `Renderer2` injected via the directive constructor for DOM operations (never direct DOM manipulation).

### PTR Indicator CSS

```css
.ptr-indicator {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%) translateY(-48px);
  width: 48px;
  height: 48px;
  border-radius: var(--nova-radius-circle);           /* 50% */
  background: var(--nova-white-alpha-08);
  border: 1px solid var(--nova-white-alpha-14);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--nova-z-sticky);                       /* 200 */
  pointer-events: none;
  transition: opacity var(--nova-duration-standard) var(--nova-ease-out),
              transform var(--nova-duration-fast) var(--nova-ease-spring);
}

.ptr-indicator .ptr-icon {
  font-size: var(--nova-icon-default);                 /* 18px */
  color: var(--nova-text-secondary);
  transition: transform var(--nova-duration-micro) linear,
              color var(--nova-duration-micro) var(--nova-ease-out);
}

.ptr-indicator.ptr-indicator--ready .ptr-icon {
  color: var(--nova-primary);
}

.ptr-indicator.ptr-indicator--refreshing mat-progress-spinner {
  /* MCD override for primary color */
  --mdc-circular-progress-active-indicator-color: var(--nova-primary);
}

@keyframes ptr-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```

### State Machine (internal signals)

```typescript
type PtrState = 'idle' | 'pulling' | 'ready' | 'refreshing' | 'completing';

private state = signal<PtrState>('idle');
private pullDistance = signal<number>(0);
private startY: number = 0;
```

All phase transitions are driven by this state signal. Use `effect()` to react to state changes and update the indicator's CSS classes and styles.

### CDK Usage Note

The task description references `CdkScrollable` for scroll detection. Implementation note: `CdkScrollable` is ideal for scroll event listening but requires the host element to be registered with the scroll dispatcher. For this directive's scroll-position guard, reading `this.el.nativeElement.scrollTop` directly in the `pointermove` handler is simpler and sufficient. Reserve `CdkScrollable` for future integration with virtual scroll. Do NOT import `PointerEventsModule` — it does not exist in Angular CDK; use native `PointerEvent` via `@HostListener`.

### Angular Material Components Used

- `MatIconModule` for `expand_more` and `refresh` icons
- `MatProgressSpinnerModule` for the refreshing-phase spinner

### Accessibility

- The indicator is `aria-hidden="true"` — it is a pure visual affordance
- The `refresh` output event, when handled by the feed component, should update an `aria-live="polite"` region: "Feed refreshed" once `complete()` is called

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .ptr-indicator {
    transition: none;
  }
  .ptr-indicator .ptr-icon {
    transition: none;
    animation: none;
  }
}
```

When reduced motion is active, the indicator still appears and functions (feedback is required), but without transitions and without the spin animation. The spinner replaces the spin animation and continues to show `mat-progress-spinner` (which has its own reduced-motion handling in MDC).

---

## Token Quick Reference

All tokens used in this spec. Source: `.claude/design-system/tokens-sprint-0.md`.

### Colors
| Token | Value | Used in |
|---|---|---|
| `--nova-primary` | #7c4dff | Ring calories fill, workout accent bar, primary icon variant |
| `--nova-primary-light` | #a78bfa | Protein ring fill, protein icon variant color |
| `--nova-primary-alpha-06` | rgba(124,77,255,0.06) | Workout fitness block bg |
| `--nova-primary-alpha-10` | rgba(124,77,255,0.10) | Streak badge bg |
| `--nova-primary-alpha-12` | rgba(124,77,255,0.12) | Protein icon container bg |
| `--nova-primary-alpha-14` | rgba(124,77,255,0.14) | Workout icon container bg |
| `--nova-primary-alpha-18` | rgba(124,77,255,0.18) | Workout fitness block border |
| `--nova-primary-alpha-25` | rgba(124,77,255,0.25) | Streak badge border, milestone card border |
| `--nova-primary-alpha-28` | rgba(124,77,255,0.28) | Workout icon container border, workout block hover border |
| `--nova-accent` | rgb(255,64,129) | Meal accent bar, calories over-goal text, trend down |
| `--nova-accent-alpha-10` | rgba(255,64,129,0.10) | Meal fitness block bg |
| `--nova-accent-alpha-12` | rgba(255,64,129,0.12) | Meal icon container bg |
| `--nova-accent-alpha-18` | rgba(255,64,129,0.18) | Meal fitness block border |
| `--nova-accent-alpha-20` | rgba(255,64,129,0.20) | Meal icon container border |
| `--nova-accent-alpha-25` | rgba(255,64,129,0.25) | Meal block hover border |
| `--nova-success` | #4ade80 | Workouts ring fill, complete state gradient endpoint, trend up, completion label complete |
| `--nova-info` | #38bdf8 | Water ring fill, duration icon variant |
| `--nova-warning` | #ffb74d | Warning icon variant |
| `--nova-streak-warm` | #ff9f40 | Streak badge flame icon |
| `--nova-gradient-brand` | 135deg primary → accent | Milestone banner bg |
| `--nova-gradient-primary` | 135deg primary → primary-dark | Calories ring complete gradient |

### Surfaces / Borders
| Token | Used in |
|---|---|
| `--nova-white-alpha-025` | Rings hero container bg |
| `--nova-white-alpha-04` | FitnessDataBlock skeleton shimmer base |
| `--nova-white-alpha-06` | FitnessDataBlock loading icon wrap bg |
| `--nova-white-alpha-08` | Rings hero border, PTR indicator bg |
| `--nova-white-alpha-14` | PTR indicator border |
| `--nova-glass-card-border` | Rings hero border (token alias: `1px solid var(--nova-white-alpha-08)`) |

### Text
| Token | Used in |
|---|---|
| `--nova-text-primary` | Ring center values, FDB values, meal/workout names |
| `--nova-text-secondary` | PTR icon default color |
| `--nova-text-muted` | FDB label zero state, completion label default |
| `--nova-text-hint` | Ring labels, FDB labels, FDB unit text, streak "day streak" text |

### Motion
| Token | Value | Used in |
|---|---|---|
| `--nova-duration-micro` | 150ms | Hover color transitions |
| `--nova-duration-fast` | 180ms | PTR ready snap, ghost-btn transitions |
| `--nova-duration-standard` | 200ms | Card hover, PTR completing, state changes |
| `--nova-duration-entrance` | 350ms | Ring loading spinner |
| `--nova-duration-celebrate` | 600ms | Ring fill transition, ring complete pulse |
| `--nova-ease-spring` | cubic-bezier(0.34, 1.56, 0.64, 1) | Ring dashoffset, PTR snap, ring complete |
| `--nova-ease-out` | ease-out | Standard entrances |
| `--nova-transition-state` | all 200ms ease-out | Card hover, workout block hover |
| `--nova-transition-card` | border/transform/shadow 200ms | Post card hover |

### Spacing
| Token | Value | Used in |
|---|---|---|
| `--nova-space-1` | 4px | Ring label margin, FDB gap, streak badge gap |
| `--nova-space-2` | 8px | Card internal margin |
| `--nova-space-3` | 12px | FDB stats row top margin |
| `--nova-space-4` | 16px | Fitness block padding-x, FDB stats row gap |
| `--nova-space-5` | 20px | Rings hero padding-y |
| `--nova-space-6` | 24px | Mobile secondary rings gap |
| `--nova-space-8` | 32px | Desktop rings row gap |

### Border Radius
| Token | Value | Used in |
|---|---|---|
| `--nova-radius-sm` | 8px | FDB icon container (sm size) |
| `--nova-radius-md` | 12px | Fitness block, fitness block icon wrap, meal type pill |
| `--nova-radius-xl` | 20px | Rings hero container |
| `--nova-radius-pill` | 999px | Streak badge, meal type pill |
| `--nova-radius-circle` | 50% | FDB icon container (circle), PTR indicator |

### Typography
| Token | Value | Used in |
|---|---|---|
| `--nova-text-xs` | 10px | Ring labels, FDB labels (sm), FDB unit, streak "day streak" |
| `--nova-text-sm` | 11px | FDB labels (md), ring label |
| `--nova-text-body-sm` | 12px | FDB values (sm), ring center md, completion label |
| `--nova-text-body-md` | 14px | FDB values (md), ring center lg values, streak count |
| `--nova-text-subtitle` | 16px | Ring center lg value, workout/meal name in fitness block |
| `--nova-weight-bold` | 700 | FDB values, ring center values, labels |
| `--nova-weight-extrabold` | 800 | Calories lg ring center value |

---

## Implementation Order (Sprint 1)

```
Week 1:
  Day 1–2: ProgressRingComponent — SVG math, 4 variants, 4 states, ng-content slot
  Day 3:   RingsHeroComponent — layout, 3 rings, streak badge, completion label
  Day 4–5: FitnessDataBlockComponent — loading/zero/populated states, shimmer

Week 2:
  Day 1–2: PostCard type branching — @switch block, WORKOUT variant with FitnessDataBlock
  Day 3:   PostCard MEAL variant, MILESTONE variant
  Day 4–5: PullToRefreshDirective — pointer events, phase state machine, indicator injection

Integration:
  - After RingsHeroComponent: wire to DashboardFacade signals in DashboardPageComponent
  - After PostCard update: verify legacy fallback renders correctly on old posts
  - After PTR directive: integrate in SocialFeedComponent with (refresh) handler
```

---

## Open Questions for @angular-developer

1. **ProgressRing SVG gradient IDs:** Confirm the `Math.random()` ID generation strategy is acceptable, or prefer a counter-based approach (`inject(ProgressRingIdService)`). If multiple rings render server-side in the future, random IDs may cause hydration mismatches.

2. **PTR indicator DOM injection with Renderer2:** Verify that `renderer.insertBefore(parent, indicator, host)` produces the correct stacking context given that `.feed-page` may be `position: relative`. The PTR indicator must appear above the feed content — confirm `z-index: var(--nova-z-sticky)` (200) is sufficient and that no parent has `overflow: hidden` that would clip the indicator.

3. **FitnessDataBlock `animateCounter`:** Confirm that `shared/utils/animate-counter.ts` exists or needs to be created. The dashboard redesign spec also references it. It should be created once and imported in both locations.

4. **PostCard `linkedContentData` null handling:** Confirm that the `post()` signal type in the existing component includes the new `linkedContentData?: LinkedContentData` field after the model update, so TypeScript does not error on `post().linkedContentData?.exerciseCount`.
