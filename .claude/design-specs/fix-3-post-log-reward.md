## UI Spec: Fix 3 — Post-Log Reward Screens

**Author:** @uiux-designer
**Date:** 2026-06-02
**Audit reference:** Full Platform Audit § 6 — Empty States & Feedback Loops (items 1, 2)
**Contract reference:** `.claude/contracts/fix-6-workout-set-logger.md` — `WorkoutCompletionSummaryDto`
**Implementation plan:** `.claude/plans/ux-audit-implementation-plan.md` — Fix 3, Sprint 2
**Status:** READY_FOR_IMPLEMENTATION

---

### User Story

As a user who just completed a workout or logged a meal, I want to see an immediate,
visually rewarding confirmation of what I achieved so that I feel motivated to keep
my tracking streak alive and return to the app tomorrow.

---

### Audit Context — Why This Exists

Section 6 of the UX audit identifies **three missing feedback loops** that this spec closes:

> "Post-workout: No calorie burn summary, no streak update notification, no 'Great workout!
> You've trained 3 days this week' acknowledgment."
> "Post-meal log: No running total update visible immediately ('You've hit 68% of your
> protein goal today'). The macro progress should update visibly and prominently the
> instant a meal is saved."

Current state: workout save → generic success toast → return to list. No dopamine hit,
no progress visualization, no acknowledgment that the action mattered.

Fix 3 closes this gap with **two purpose-built components**, one per tracking domain.

---

### Data Contracts

#### Workout — `WorkoutCompletionSummary` (TypeScript model, already in facade)

```typescript
interface WorkoutCompletionSummary {
  sessionId:              number;   // reference for Fix 2 share flow
  templateTitle:          string;   // display name
  durationMin:            number;   // shown as "47 min"
  exerciseCount:          number;   // shown as "3 exercises"
  setsCompleted:          number;   // shown as "12 sets"
  estimatedCaloriesKcal:  number;   // shown as "~285 kcal" — proportional estimate
  streakDay:              number;   // current streak snapshot (NOT incremented by workout)
  completedAt:            string;   // ISO 8601 — formatted for display
}
```

**Source:** `workouts-tab.facade.completionSummary()` signal — set after `completeSession()`
succeeds. Read by `WorkoutCompletionCardComponent` via input binding.

#### Meal — Daily Macro Totals (from NutritionTabFacade)

```typescript
interface DailyMacroTotals {
  protein_g:  number;
  carbs_g:    number;
  fats_g:     number;
  calories:   number;
}

interface DailyMacroTargets {
  protein_g:  number;   // from user profile settings
  carbs_g:    number;
  fats_g:     number;
  calories:   number;
}
```

**Source:** `nutrition-tab.facade` must expose:
- `dailyTotals: Signal<DailyMacroTotals>` — recomputed after each meal save
- `dailyTargets: Signal<DailyMacroTargets>` — from user store (TDEE-derived targets)

**`MealCompletionFeedbackComponent` receives:**
- `@Input() savedMeal: MealEntry` — the meal just saved (for name display)
- `@Input() dailyTotals: DailyMacroTotals` — running day totals including this meal
- `@Input() dailyTargets: DailyMacroTargets` — from user profile

---

### UX Flow

#### Workout Completion Flow

```
1. User taps "Finish" in ActiveWorkoutSessionComponent
2. Confirm bottom sheet: "End workout?" → user confirms
3. POST /api/workouts/sessions → 201 Created → WorkoutCompletionSummary
4. facade.completionSummary() signal set → non-null
5. WorkoutCompletionCardComponent slides up (0.35s, slideUp animation)
   covering the ActiveWorkoutSessionComponent
6. Stat tiles appear: duration | exercises | sets | calories
7. Streak counter animates from 0 → streakDay (1.2s count-up)
8. Share CTA and Close button visible
9a. User taps "Share to beSocial" → ShareToSocialBottomSheetComponent opens
    (Fix 2) — card remains underneath
9b. User taps "Close" or backdrop → card dismisses with slideDown (0.25s) →
    navigation returns to /workouts list → facade.completionSummary() reset to null
```

#### Meal Completion Flow

```
1. User taps "Save" in Add/Edit Meal dialog
2. POST /api/nutrition → 201 Created → MealEntry returned
3. NutritionTabFacade.dailyTotals() signal recomputed (includes new meal)
4. MealCompletionFeedbackComponent slides down into NutritionTabComponent
   (above the meals list, below the Add Meal button row)
5. Success badge + macro progress bars appear — bars fill from 0% with 0.6s animation
6. Staggered bar fill: protein at 0ms, carbs at 100ms, fat at 200ms
7. Headline copy displays the macro with the highest % of target
8. Auto-dismiss after 8 seconds (progress indicator in close button)
   OR user taps × to dismiss immediately
9a. (Optional) User taps "Share to beSocial" → ShareToSocialBottomSheetComponent
9b. Component slides up and collapses (height → 0, 0.3s ease-in)
```

---

## Component 1 — WorkoutCompletionCardComponent

**Selector:** `app-workout-completion-card`
**File location:** `features/workouts/active-session/workout-completion-card/`
**Rendered inside:** `ActiveWorkoutSessionComponent` as an absolute overlay
**Trigger:** `@if (completionSummary())` — shown when facade signal is non-null

---

### Layout

```
┌────────────────────────────────────────────┐  ← backdrop (blur)
│                                            │
│                                            │
│   ┌────────────────────────────────────┐   │  ← card (slide-up)
│   │                                    │   │
│   │  [━━━] drag handle                 │   │
│   │                                    │   │
│   │  ✦  WORKOUT COMPLETE               │   │  ← badge pill
│   │                                    │   │
│   │  Pull Day A                        │   │  ← workout name
│   │  Monday, 2 Jun 2026 · 11:02        │   │  ← date / time
│   │                                    │   │
│   │  ┌────────┐ ┌────────┐ ┌────────┐ │   │  ← stat tiles (3-col grid)
│   │  │ timer  │ │fitness │ │  bolt  │ │   │
│   │  │  47    │ │   3    │ │  ~285  │ │   │
│   │  │  min   │ │  exs   │ │  kcal  │ │   │
│   │  └────────┘ └────────┘ └────────┘ │   │
│   │                                    │   │
│   │  ───────────────────────────────   │   │  ← separator
│   │                                    │   │
│   │         🔥   8   days              │   │  ← streak (centered)
│   │            Current streak          │   │
│   │    Keep going — you're on fire!    │   │  ← motivational copy
│   │                                    │   │
│   │  ┌──────────────────────────────┐ │   │  ← share CTA (ghost)
│   │  │  share  Share to beSocial    │ │   │
│   │  └──────────────────────────────┘ │   │
│   │                                    │   │
│   │  ┌──────────────────────────────┐ │   │  ← close (primary)
│   │  │           Close              │ │   │
│   │  └──────────────────────────────┘ │   │
│   │                                    │   │
│   └────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

---

### Visual Spec — Card Container

**Backdrop:**
```css
/* .completion-backdrop */
position: fixed;
inset: 0;
background: rgba(0, 0, 0, 0.65);
backdrop-filter: blur(8px);
-webkit-backdrop-filter: blur(8px);
z-index: 500;
animation: fadeIn 0.2s ease-out;    /* reuses global keyframe */
```

**Card (mobile — bottom sheet):**
```css
/* .completion-card */
position: fixed;
bottom: 0;
left: 0;
right: 0;
background: #0d0d10;                /* var(--surface) */
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 24px 24px 0 0;
padding: 12px 24px 36px;           /* extra bottom padding — safe area */
z-index: 501;
max-height: 90dvh;
overflow-y: auto;
animation: slideUp 0.35s ease-out;  /* reuses global keyframe */
box-shadow: 0 -8px 48px rgba(0, 0, 0, 0.7);
```

**Card (desktop ≥ 640px — centered dialog):**
```css
/* .completion-card (override) */
position: fixed;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
bottom: auto;
border-radius: 24px;
max-width: 480px;
width: calc(100% - 48px);
max-height: 85dvh;
```

---

### Visual Spec — Drag Handle

```css
/* .completion-drag-handle */
width: 40px;
height: 4px;
border-radius: 999px;
background: rgba(255, 255, 255, 0.14);
margin: 0 auto 20px;
flex-shrink: 0;
```
Only visible on mobile (< 640px). Hidden on desktop.

---

### Visual Spec — Success Badge

```css
/* .completion-badge */
display: inline-flex;
align-items: center;
gap: 6px;
padding: 4px 12px 4px 10px;
border-radius: 999px;
background: rgba(124, 77, 255, 0.14);
border: 1px solid rgba(124, 77, 255, 0.28);
color: var(--primary);
font-size: 11px;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.08em;
margin-bottom: 16px;
```

Icon: `check_circle` mat-icon, 16px, `color: var(--primary)`.
Text: `"WORKOUT COMPLETE"`

---

### Visual Spec — Workout Name & Date

**Name:**
```css
font-size: 24px;
font-weight: 800;
color: var(--white);
letter-spacing: -0.5px;
line-height: 1.2;
margin-bottom: 6px;
```
Content: `templateTitle` from DTO.

**Date / Time:**
```css
font-size: 12px;
font-weight: 500;
color: rgba(255, 255, 255, 0.4);
margin-bottom: 24px;
```
Format: `"Monday, 2 Jun 2026 · 11:02"` — derived from `completedAt`.

---

### Visual Spec — Stat Tiles (3-column grid)

**Grid container:**
```css
/* .completion-stats-grid */
display: grid;
grid-template-columns: repeat(3, 1fr);
gap: 10px;
margin-bottom: 24px;
```

**Individual tile:**
```css
/* .completion-stat-tile */
background: rgba(255, 255, 255, 0.04);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 14px;
padding: 14px 10px 12px;
display: flex;
flex-direction: column;
align-items: center;
gap: 4px;
```

**Tile icon (mat-icon):**
```css
font-size: 18px;
width: 18px;
height: 18px;
margin-bottom: 4px;
```

**Tile value:**
```css
font-size: 26px;
font-weight: 800;
color: var(--white);
font-variant-numeric: tabular-nums;
line-height: 1;
```

**Tile label:**
```css
font-size: 10px;
font-weight: 700;
color: rgba(255, 255, 255, 0.4);
text-transform: uppercase;
letter-spacing: 0.05em;
text-align: center;
```

**Three tiles:**

| Tile | Icon | Icon color | Value | Label |
|---|---|---|---|---|
| Duration | `timer` | `var(--primary)` | `"47"` | `"MIN"` |
| Exercises | `fitness_center` | `rgba(255,255,255,0.55)` | `"3"` | `"EXERCISES"` |
| Calories | `local_fire_department` | `var(--accent)` | `"~285"` | `"KCAL EST."` |

**Calories prefix:** Always render `"~"` before `estimatedCaloriesKcal` to signal estimation.
If `estimatedCaloriesKcal === 0`: show `"—"` instead of `"~0"`.

---

### Visual Spec — Separator

```css
/* .completion-separator */
height: 1px;
background: rgba(255, 255, 255, 0.06);
margin: 4px 0 24px;
```

---

### Visual Spec — Streak Section

```css
/* .completion-streak */
display: flex;
flex-direction: column;
align-items: center;
gap: 4px;
margin-bottom: 20px;
```

**Flame icon (mat-icon):**
```css
font-size: 36px;
width: 36px;
height: 36px;
color: var(--accent);
animation: pulse 2s ease-in-out infinite;  /* reuses global keyframe */
margin-bottom: 2px;
```

**Counter row (flame + number + "days" inline):**
```
         🔥   8   days
```
```css
/* .completion-streak-row */
display: flex;
align-items: baseline;
gap: 6px;
```

**Animated counter number:**
```css
/* .completion-streak-count */
font-size: 52px;
font-weight: 800;
color: var(--white);
font-variant-numeric: tabular-nums;
line-height: 1;
```

**"days" unit:**
```css
font-size: 18px;
font-weight: 600;
color: rgba(255, 255, 255, 0.6);
```

**"Current streak" caption:**
```css
font-size: 11px;
font-weight: 700;
color: rgba(255, 255, 255, 0.3);
text-transform: uppercase;
letter-spacing: 0.1em;
margin-top: 2px;
```
Content: `"CURRENT STREAK"`

**Motivational copy:**
```css
font-size: 14px;
font-weight: 500;
color: rgba(255, 255, 255, 0.5);
text-align: center;
margin-top: 8px;
margin-bottom: 28px;
```
Content logic (evaluated once on mount):

| Condition | Copy |
|---|---|
| `streakDay === 1` | `"Great start — one day down!"` |
| `streakDay >= 2 && streakDay < 7` | `"Keep going — you're building momentum!"` |
| `streakDay === 7` | `"One week streak — you're consistent! 🎯"` |
| `streakDay > 7 && streakDay < 30` | `"You're on fire! Keep the streak alive."` |
| `streakDay >= 30` | `"Incredible — ${streakDay} days strong! 🏆"` |
| `streakDay === 0` | `"Log today's entry to start your streak!"` |

---

### Visual Spec — CTA Buttons

**Share to beSocial (ghost):**
```css
/* Reuses global .btn-ghost pattern */
width: 100%;
height: 48px;
border: 1px solid rgba(255, 255, 255, 0.14);
border-radius: 12px;
background: transparent;
color: var(--white-soft);
font-size: 14px;
font-weight: 700;
display: flex;
align-items: center;
justify-content: center;
gap: 8px;
margin-bottom: 10px;
cursor: pointer;
transition: border-color 0.15s, background 0.15s, transform 0.15s;
/* hover: */
/* border-color: rgba(255,255,255,0.28); background: rgba(255,255,255,0.04); transform: translateY(-1px); */
```
Icon: `share` mat-icon, 18px.
Text: `"Share to beSocial"`

**Close (primary):**
```css
/* Reuses global .btn-primary pattern */
width: 100%;
height: 48px;
background: var(--primary);
border-radius: 12px;
border: none;
color: var(--white);
font-size: 14px;
font-weight: 700;
cursor: pointer;
transition: opacity 0.15s, transform 0.15s;
/* hover: */
/* opacity: 0.88; transform: translateY(-1px); */
```
Text: `"Close"`

---

### States

| State | Trigger | Visual |
|---|---|---|
| **Hidden** | `completionSummary() === null` | Component not rendered (`@if` guard) |
| **Entering** | Signal becomes non-null | Backdrop fadeIn (0.2s) → card slideUp (0.35s, 0.05s delay) |
| **Active / Default** | After entrance | Stat tiles visible, streak counter animating |
| **Sharing** | Share CTA tapped | ShareToSocialBottomSheetComponent opens on top (z-index 600); card remains |
| **Dismissing** | Close tap OR backdrop tap | Card slides down, backdrop fades out — both 0.25s; then nav to /workouts |

**Loading state:** Not applicable — component is only rendered after API response is available.
**Error state:** Not applicable — if `completeSession()` fails, the facade returns null and a
  `ngx-toastr` error toast is shown by the facade (existing pattern). Card never opens.
**Empty stat:** If `exerciseCount === 0` (session with no sets), the exercises tile shows
  `"0"` with label `"EXERCISES"`. Calories tile shows `"—"`.

---

### Animations — Component-Scoped

**Defined in `workout-completion-card.component.css` — NOT in global styles.css.**

```css
/* Streak counter count-up — JS-driven, not CSS keyframe */
/* Component uses a setInterval that increments a local streakDisplay signal */
/* from 0 to streakDay, stepping every Math.max(30, 1200 / streakDay) ms      */
/* This avoids a CSS counter (not easily accessible) while remaining Angular-idiomatic */

/* Card dismiss (inverse of global slideUp) */
@keyframes completion-card-dismiss {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(100%);
    opacity: 0;
  }
}

/* Stat tile entrance — staggered pop-in */
@keyframes completion-tile-pop {
  0%   { transform: scale(0.85) translateY(8px); opacity: 0; }
  70%  { transform: scale(1.04) translateY(-2px); opacity: 1; }
  100% { transform: scale(1)    translateY(0);    opacity: 1; }
}
/* Applied with animation-delay: 0ms, 80ms, 160ms for tiles 1, 2, 3 */
/* Duration: 0.3s ease-out for each tile */

/* Flame icon pulse is handled by global 'pulse' keyframe */
```

**Streak counter implementation (Angular signal pattern):**
```typescript
// In WorkoutCompletionCardComponent
readonly streakDisplay = signal(0);

private animateStreak(target: number): void {
  const stepMs   = Math.max(30, Math.floor(1200 / Math.max(target, 1)));
  let   current  = 0;
  const interval = setInterval(() => {
    current++;
    this.streakDisplay.set(current);
    if (current >= target) clearInterval(interval);
  }, stepMs);
}

// Called in ngOnInit / effect() after summary is available:
// effect(() => {
//   const s = this.summary();
//   if (s) this.animateStreak(s.streakDay);
// });
```

---

### Interactions

| Interaction | Result |
|---|---|
| Tap backdrop | Dismiss card (same as Close) |
| Tap "Close" | `dismissing` state → animate out → emit `dismissed` output → parent navigates to `/workouts` → reset `facade.completionSummary()` to null |
| Tap "Share to beSocial" | Opens `ShareToSocialBottomSheetComponent` (Fix 2) with pre-populated data: `{ sessionId, templateTitle, durationMin, exerciseCount }` — **calories NOT passed** (privacy constraint) |
| Swipe down on card (mobile) | Dismiss (detect via pointer events — `translateY > 80px` on swipe → snap to dismiss) |

---

### Angular Material Components to Use

| Purpose | Component |
|---|---|
| Icons | `mat-icon` — `check_circle`, `timer`, `fitness_center`, `local_fire_department`, `share`, `close` |
| Backdrop close button (a11y) | Visually hidden `<button>` covering backdrop |

No `mat-dialog` — the card is a custom overlay, not an Angular Material dialog, to allow
precise control over the entrance/exit animations and bottom-sheet behavior on mobile.

---

### CSS Classes to Reuse (from styles.css)

| Class | Usage |
|---|---|
| `.btn-primary` | "Close" button |
| `.btn-ghost` | "Share to beSocial" button |
| `.pill` | Success badge |

**New classes (define in `workout-completion-card.component.css` only — never global):**

| Class | Purpose |
|---|---|
| `.completion-backdrop` | Fixed overlay background |
| `.completion-card` | Slide-up card shell |
| `.completion-drag-handle` | Mobile drag indicator bar |
| `.completion-badge` | "WORKOUT COMPLETE" pill |
| `.completion-stats-grid` | 3-column tile grid |
| `.completion-stat-tile` | Individual stat tile |
| `.completion-separator` | Horizontal rule |
| `.completion-streak` | Streak section wrapper |
| `.completion-streak-row` | Flame + number + "days" inline row |
| `.completion-streak-count` | Animated counter number |

---

### Responsiveness

**Mobile (< 640px) — PRIMARY**
- Bottom sheet: `border-radius: 24px 24px 0 0`, full width
- Drag handle visible
- Stat tiles: 3-column grid, tiles may compress to ~30% width each — value font reduced to `22px` at < 380px
- All buttons: full width, `height: 48px` minimum
- Streak counter: `font-size: 52px`

**Desktop (≥ 640px)**
- Centered dialog: `max-width: 480px`, `border-radius: 24px`, vertical center
- Drag handle hidden
- Backdrop remains — user must tap Close or backdrop to dismiss
- Stat tiles: same 3-column grid, more breathing room at `padding: 18px 14px`
- Streak counter: `font-size: 60px` (more space)

---

---

## Component 2 — MealCompletionFeedbackComponent

**Selector:** `app-meal-completion-feedback`
**File location:** `features/user/nutrition-tab/meal-completion-feedback/`
**Rendered inside:** `NutritionTabComponent`, injected just below the page header
  and above the meals list
**Trigger:** `@if (showFeedback())` — local boolean signal, set true after meal save,
  auto-reset after 8s or on dismiss

---

### Layout

**Full-width inline card — NOT a modal or overlay.**

```
┌──────────────────────────────────────────────────────────┐
│  ✅  Meal saved!                                    [×]   │
│                                                          │
│  Protein  [████████████░░░░░░]  68%                     │
│  Carbs    [████████████████░░]  83%                     │
│  Fat      [██████░░░░░░░░░░░░]  38%                     │
│                                                          │
│  "You've hit 68% of your protein goal today."           │
│                                                          │
│  [share  Share to beSocial]        [auto-dismiss ring]  │
└──────────────────────────────────────────────────────────┘
```

The component slides **down** from 0 height to full height when it appears (not a bottom
sheet — it pushes content below it down). On dismiss, height collapses back to 0.

---

### Visual Spec — Card Container

```css
/* .meal-feedback-card */
background: rgba(255, 255, 255, 0.025);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 16px;
padding: 16px 18px 18px;
margin-bottom: 16px;
overflow: hidden;
animation: slideUp 0.3s ease-out;  /* reuses global keyframe — slides card in from below */
```

**Dismiss animation (component-scoped):**
```css
@keyframes meal-feedback-collapse {
  from {
    max-height: 300px;
    opacity: 1;
    margin-bottom: 16px;
    padding-top: 16px;
    padding-bottom: 18px;
  }
  to {
    max-height: 0;
    opacity: 0;
    margin-bottom: 0;
    padding-top: 0;
    padding-bottom: 0;
  }
}
```

---

### Visual Spec — Header Row

```
[✅ icon]  [Meal saved!]  ─────────────  [× dismiss]
```

```css
/* .meal-feedback-header */
display: flex;
align-items: center;
gap: 8px;
margin-bottom: 14px;
```

**Check icon (mat-icon):**
```css
font-size: 18px;
width: 18px;
height: 18px;
color: var(--color-success);   /* #4ade80 */
flex-shrink: 0;
```

**"Meal saved!" label:**
```css
font-size: 14px;
font-weight: 700;
color: var(--white);
flex: 1;
```

**Dismiss button (×):**
```css
/* .meal-feedback-dismiss */
width: 32px;
height: 32px;
border-radius: 8px;
background: rgba(255, 255, 255, 0.06);
border: 1px solid rgba(255, 255, 255, 0.08);
color: rgba(255, 255, 255, 0.45);
display: flex;
align-items: center;
justify-content: center;
cursor: pointer;
flex-shrink: 0;
transition: background 0.15s, color 0.15s;
/* min touch target via padding override: */
min-width: 48px;
min-height: 48px;
margin: -8px;     /* compensate for touch-target expansion */
```
Icon: `close` mat-icon, 16px.

---

### Visual Spec — Macro Progress Bars

**Wrapper:**
```css
/* .meal-feedback-macros */
display: flex;
flex-direction: column;
gap: 10px;
margin-bottom: 16px;
```

**Each macro row:**
```css
/* .meal-feedback-macro-row */
display: grid;
grid-template-columns: 68px 1fr 36px;
align-items: center;
gap: 10px;
```

**Label:**
```css
font-size: 13px;
font-weight: 600;
color: var(--white-soft);
```

**Progress bar track:**
```css
/* .meal-feedback-bar-track */
height: 8px;
border-radius: 4px;
background: rgba(255, 255, 255, 0.07);
overflow: hidden;
position: relative;
```

**Progress bar fill:**
```css
/* .meal-feedback-bar-fill */
height: 100%;
border-radius: 4px;
width: 0%;                     /* initial — JS sets this to final % */
transition: width 0.6s ease-out;
/* color set per macro — see below */
```

**Percentage label:**
```css
font-size: 12px;
font-weight: 700;
color: rgba(255, 255, 255, 0.6);
text-align: right;
font-variant-numeric: tabular-nums;
```

**Macro-specific bar fill colors (use CSS variables only):**

| Macro | CSS variable | Fallback |
|---|---|---|
| Protein | `var(--primary-light)` | `#a78bfa` |
| Carbs | `var(--color-info)` | `#38bdf8` |
| Fat | `var(--color-warning)` | `#ffb74d` |

**Over-target state (> 100%):**
- Bar fill: capped at 100% width (no overflow)
- Bar fill color: `var(--accent)` (pink) to signal over-target
- Percentage label: shows actual `"112%"` with accent color
- Example: `"Fat: 112%"` — accent-colored label, full-width accent bar

**Zero target / target not set:**
- If `dailyTargets.protein_g === 0`: hide that macro row entirely
- Show a subtle caption: `"Set up your macro goals in Profile to see targets"` — `font-size: 12px; color: rgba(255,255,255,0.3);`

**Animation stagger (CSS custom properties approach):**
```css
.meal-feedback-macro-row:nth-child(1) .meal-feedback-bar-fill { transition-delay: 0ms; }
.meal-feedback-macro-row:nth-child(2) .meal-feedback-bar-fill { transition-delay: 100ms; }
.meal-feedback-macro-row:nth-child(3) .meal-feedback-bar-fill { transition-delay: 200ms; }
```
Width transitions are triggered in `ngAfterViewInit` via a `setTimeout(fn, 50)` to ensure
the initial `width: 0%` is rendered before the final value is set.

**Bar width calculation:**
```typescript
barWidth(macro: 'protein' | 'carbs' | 'fat'): string {
  const total   = this.dailyTotals()[`${macro}_g`];
  const target  = this.dailyTargets()[`${macro}_g`];
  if (!target) return '0%';
  return `${Math.min((total / target) * 100, 100)}%`;
}

barPercent(macro: 'protein' | 'carbs' | 'fat'): string {
  const total   = this.dailyTotals()[`${macro}_g`];
  const target  = this.dailyTargets()[`${macro}_g`];
  if (!target) return '—';
  return `${Math.round((total / target) * 100)}%`;
}
```

---

### Visual Spec — Headline Copy

```css
/* .meal-feedback-headline */
font-size: 13px;
font-weight: 500;
color: rgba(255, 255, 255, 0.55);
font-style: italic;
margin-bottom: 16px;
line-height: 1.5;
```

**Copy selection logic** — pick the macro with the highest % of daily target:

```typescript
get headlineCopy(): string {
  const p = proteinPct;   // 0–999 number
  const c = carbsPct;
  const f = fatPct;

  // All targets unset
  if (!p && !c && !f) return 'Keep logging to see your daily progress.';

  const topMacro = [
    { label: 'protein', pct: p },
    { label: 'carbs',   pct: c },
    { label: 'fat',     pct: f },
  ].sort((a, b) => b.pct - a.pct)[0];

  if (topMacro.pct >= 100) {
    if (p >= 100 && c >= 100 && f >= 100)
      return "You've hit all your macro goals today! 🎯";
    return `You've hit your ${topMacro.label} goal for today!`;
  }
  if (topMacro.pct >= 75)
    return `You've hit ${topMacro.pct}% of your ${topMacro.label} goal today — almost there!`;

  return `You've hit ${topMacro.pct}% of your ${topMacro.label} goal today.`;
}
```

---

### Visual Spec — Footer Row (Share CTA + Auto-dismiss Indicator)

```css
/* .meal-feedback-footer */
display: flex;
align-items: center;
justify-content: space-between;
gap: 12px;
```

**Share to beSocial button (ghost, compact):**
```css
/* .meal-feedback-share-btn */
height: 38px;
padding: 0 16px;
border: 1px solid rgba(255, 255, 255, 0.14);
border-radius: 10px;
background: transparent;
color: rgba(255, 255, 255, 0.7);
font-size: 13px;
font-weight: 600;
display: flex;
align-items: center;
gap: 6px;
cursor: pointer;
transition: border-color 0.15s, background 0.15s;
min-height: 48px;   /* touch target */
```
Icon: `share` mat-icon, 15px.
Text: `"Share to beSocial"`

**Auto-dismiss ring (countdown indicator):**
A circular SVG ring that depletes over 8 seconds, indicating time until auto-dismiss.

```css
/* .meal-feedback-dismiss-ring */
width: 36px;
height: 36px;
position: relative;
flex-shrink: 0;
```
```html
<svg width="36" height="36" viewBox="0 0 36 36">
  <!-- Background track -->
  <circle cx="18" cy="18" r="14"
    fill="none"
    stroke="rgba(255,255,255,0.08)"
    stroke-width="2.5" />
  <!-- Depleting arc — stroke-dasharray/dashoffset animated via CSS -->
  <circle cx="18" cy="18" r="14"
    fill="none"
    stroke="rgba(255,255,255,0.25)"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-dasharray="87.96"       /* 2π × 14 */
    stroke-dashoffset="0"
    transform="rotate(-90 18 18)"
    class="dismiss-ring-arc" />
</svg>
<!-- × icon centered inside the SVG -->
<mat-icon class="dismiss-ring-icon">close</mat-icon>
```
```css
/* .dismiss-ring-arc */
transition: stroke-dashoffset 8s linear;
/* After view init: set stroke-dashoffset to 87.96 (full depletion over 8s) */

/* .dismiss-ring-icon */
position: absolute;
inset: 0;
display: flex;
align-items: center;
justify-content: center;
font-size: 14px;
color: rgba(255, 255, 255, 0.4);
```

**Tapping the ring icon** immediately dismisses (same as × button in header — both
call the same dismiss handler).

---

### States

| State | Trigger | Visual |
|---|---|---|
| **Hidden** | Default; after dismiss | Component not in DOM (`@if showFeedback()`) |
| **Entering** | `showFeedback()` becomes true after meal save | Card slides down (slideUp global keyframe), bars animate from 0% with stagger |
| **Active** | 0s – 8s | Bars at final %, copy visible, ring depleting |
| **No targets set** | `dailyTargets.*_g === 0` for all macros | Bars hidden; show CTA to set macro targets; no headline copy |
| **All goals hit** | All macros ≥ 100% | Headline copy: "You've hit all your macro goals today! 🎯" |
| **Auto-dismissing** | At 8 seconds | Ring completes → dismiss animation (collapse) |
| **Manually dismissed** | × tapped OR ring tapped | Same collapse animation, immediately |

**Error state:** Not applicable — this component is only rendered after a successful save.
**Loading state:** Not applicable — data is ready before component is shown.

---

### Animations — Component-Scoped

**Defined in `meal-completion-feedback.component.css` — NOT in global styles.css.**

```css
/* Card collapse on dismiss */
@keyframes meal-feedback-collapse {
  from {
    max-height: 300px;
    opacity: 1;
    margin-bottom: 16px;
    padding-top: 16px;
    padding-bottom: 18px;
  }
  to {
    max-height: 0;
    opacity: 0;
    margin-bottom: 0;
    padding-top: 0;
    padding-bottom: 0;
  }
}
/* Applied to host element on dismiss: animation-duration: 0.3s; animation-fill-mode: forwards; */
/* After 0.3s (animationend event): set showFeedback() = false */
```

---

### Interactions

| Interaction | Result |
|---|---|
| Appear automatically | After `nutritionFacade.saveMeal()` resolves — shown by parent |
| Tap × (header) | Immediate dismiss — collapse animation (0.3s) |
| Tap ring icon (footer) | Same as × |
| Auto-dismiss at 8s | Collapse animation triggered by `setTimeout` |
| Tap "Share to beSocial" | Opens `ShareToSocialBottomSheetComponent` (Fix 2) with pre-populated data: `{ mealId, mealName, mealType }` — **macro totals NOT passed** (privacy constraint) |

---

### Angular Material Components to Use

| Purpose | Component |
|---|---|
| Header check icon | `mat-icon` — `check_circle` |
| Dismiss icon | `mat-icon` — `close` |
| Share icon | `mat-icon` — `share` |
| Progress bars | **Custom CSS** — NOT `mat-progress-bar` (custom colors per macro, no Angular Material theming override needed) |

---

### CSS Classes to Reuse (from styles.css)

| Class | Usage |
|---|---|
| `.btn-ghost` | Reference pattern for Share button (custom sizing applied on top) |

**New classes (define in `meal-completion-feedback.component.css` only — never global):**

| Class | Purpose |
|---|---|
| `.meal-feedback-card` | Card container |
| `.meal-feedback-header` | Top row: check + title + dismiss |
| `.meal-feedback-dismiss` | × dismiss button (header) |
| `.meal-feedback-macros` | Macros section wrapper |
| `.meal-feedback-macro-row` | Individual macro row (label + bar + %) |
| `.meal-feedback-bar-track` | Grey bar background track |
| `.meal-feedback-bar-fill` | Animated colored fill |
| `.meal-feedback-headline` | Italic motivational copy |
| `.meal-feedback-footer` | Share + ring row |
| `.meal-feedback-share-btn` | Compact ghost share button |
| `.meal-feedback-dismiss-ring` | SVG countdown ring wrapper |

---

### Responsiveness

**Mobile (< 640px) — PRIMARY**
- Full width card, fills parent container (nutrition tab is single column)
- Share button: `flex: 1` — stretches to fill space left of ring
- Macro label width: `56px` (reduced from `68px`)
- Value font: `12px` for bar percentage label
- Touch target enforcement: all tappable elements `min-height: 48px`

**Desktop (≥ 640px)**
- Card appears in the nutrition tab column — max-width constrained by parent layout
- Share button compact (fixed width `auto`)
- All fonts at spec sizes

**Extra-small (< 380px)**
- Macro label shortened: `"Pro"` / `"Carb"` / `"Fat"` — 3-char abbreviations
- Footer: Share button text hidden, icon only (`"share"` icon at 18px)

---

---

## Shared Concern — ShareToSocialBottomSheetComponent Integration (Fix 2)

Both components invoke Fix 2's `ShareToSocialBottomSheetComponent`. Payload passed:

**From WorkoutCompletionCardComponent:**
```typescript
{
  type:          'workout',
  sessionId:     summary.sessionId,
  templateTitle: summary.templateTitle,
  durationMin:   summary.durationMin,
  exerciseCount: summary.exerciseCount,
  // estimatedCaloriesKcal: INTENTIONALLY OMITTED — privacy constraint
  //   Calories burned is a health metric. It MUST NOT appear in any social post.
  //   Spec constraint: @code-reviewer must verify this on Fix 2 implementation.
}
```

**From MealCompletionFeedbackComponent:**
```typescript
{
  type:     'meal',
  mealId:   savedMeal.id,
  mealName: savedMeal.name,
  mealType: savedMeal.type,
  // totalProtein_g / totalCarbs_g / totalFats_g: INTENTIONALLY OMITTED
  //   Macro totals are health metrics. They MUST NOT appear in any social post.
  //   Only the meal name and type are shared.
}
```

---

## Accessibility

### WorkoutCompletionCardComponent

| Concern | Implementation |
|---|---|
| Role | Overlay element: `role="dialog"` on `.completion-card`, `aria-modal="true"`, `aria-labelledby="completion-title"` |
| Focus management | On card entrance, focus trapped inside card. First focusable: "Close" button. |
| Backdrop close | Backdrop `<button>` covers area with `aria-label="Close workout summary"` |
| Streak counter | `aria-live="polite"` on the counter element — announces final value: `"Current streak: 8 days"` |
| Stat tiles | Each tile wrapped in `<article>` with `aria-label="Duration: 47 minutes"` etc. |
| Escape key | `@HostListener('keydown.escape')` triggers dismiss |
| Tab order | Close button → Share button → (trap back to Close) |
| Min touch targets | All buttons `min-height: 48px; min-width: 48px` enforced |
| Contrast | All text WCAG AA compliant; ghost text `rgba(255,255,255,0.4)` used only for decorative date, not primary content |

### MealCompletionFeedbackComponent

| Concern | Implementation |
|---|---|
| Role | `role="status"` on `.meal-feedback-card` — signals a status update |
| `aria-live` | `"polite"` — announces on mount: `"Meal saved. You've hit 68% of your protein goal today."` |
| Progress bars | Each bar row has `role="progressbar"`, `aria-valuenow="{pct}"`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Protein: 68%"` |
| Auto-dismiss | `aria-label` on ring button: `"Dismiss (closes in 8 seconds)"` |
| Color not sole indicator | Over-target bars use both color change (accent) AND `aria-label` update (`"Protein: 112% — over goal"`) |
| Min touch targets | × button and ring: `min-height: 48px; min-width: 48px` enforced via negative margin compensation |

---

## Privacy Constraints

These are hard constraints that **@code-reviewer must verify** on Fix 2 and Fix 3
implementation before merge:

1. `estimatedCaloriesKcal` from `WorkoutCompletionSummary` — shown ONLY to the
   authenticated user in their own completion card. **MUST NOT** be passed to any
   social endpoint or included in any share payload.

2. Macro totals (`protein_g`, `carbs_g`, `fats_g`) from `MealCompletionFeedback` —
   shown ONLY in the user's own inline feedback. **MUST NOT** be passed to any social
   endpoint. The share payload for meals contains only `mealName` and `mealType`.

3. `streakDay` in the completion card — read-only display from the user's own
   `WorkoutCompletionSummary`. Correct copy: **"Current streak: X days"** — never
   claim "Workout added to streak" because completing a workout session does NOT
   increment the streak (streak is controlled by `DailyEntry` saves only, per
   Fix 6 contract).

---

## Out of Scope for Fix 3

| Item | Deferred to |
|---|---|
| ShareToSocialBottomSheetComponent implementation | Fix 2 (Sprint 2) |
| Real-time streak push via SignalR `streak-updated` event | Fix 5 / Fix 3 backend |
| "Ring closing" celebration for completing all daily goals (workout + meals + daily entry) | Future / Sprint 4 polish |
| Calorie daily progress bar in MealCompletionFeedback | Fix 10 (daily entry auto-population sprint) |
| Sound / haptic feedback | Deferred — gym context, audio may be off |
| AI-contextual calorie estimation (Groq call post-completion) | Fix 8 (AI contextual layer sprint) |
| Macro target setup flow if targets are 0 | Links to user profile settings (existing) |
