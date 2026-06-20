# UI Spec: Modules Consistency Pass

**Author:** @uiux-designer
**Date:** 2026-06-04
**Consumed by:** @angular-developer
**Depends on:** `.claude/design-system/tokens.md`, `.claude/design-system/components.md`, `.claude/design-system/motion.md`, `.claude/design-system/spatial.md`
**Reference specs:** `dashboard-redesign.md`, `besocial-redesign.md`, `fix-6-workout-set-logger.md`, `fix-3-post-log-reward.md`, `fix-1-food-database-frontend.md`, `fix-8-ai-contextual.md`

---

## Scope and Approach

This pass is a targeted consistency alignment — not a ground-up redesign. The Dashboard and beSocial received full redesigns in Phases 1–4. This document ensures that the Workouts module, Nutrition module, AI Chat (bottom sheet), and the Me/Profile tab speak the same visual language as those redesigned surfaces. The primary interventions are: token migration (replacing hardcoded color, spacing, and duration values with CSS custom properties from the new token set), layout refinements to match the 8px spatial grid, state coverage verification, and structural annotations for the few gaps where current implementations do not match the new design system patterns. Where a previous Fix spec already fully covers a sub-problem, this document references that spec rather than duplicating it.

---

## Module: Workouts

### Template List

**Current state — product vs. database feel**

The `WorkoutsContentComponent` (`workouts-content.component`) is currently a plan-purchase catalog — hardcoded mock `WorkoutPlan[]` data with price values and a "Buy" button that surfaces a "coming soon" alert. It is not connected to the backend `WorkoutTemplate` entities that the `WorkoutsTabFacade` manages. This architectural split creates two disconnected "workouts" experiences: the user's actual logged templates (in `user/workouts-tab`) and this catalog page (at `/plans`).

The catalog page feels like a database because: (1) the card structure leads with an image overlay and badges, then buries the actionable content (title, weeks, perks, price) in a card body with no visual hierarchy differentiation; (2) no card communicates anything about the user's personal relationship to that plan (have they done it? how many times?); (3) the controls bar (search + 3 custom dropdowns + sort) replicates database-browser conventions (filter, sort, paginate) rather than fitness-app conventions (goal-fit, difficulty, time commitment); (4) the "Buy" CTA implies a transactional relationship that is contradicted by the app's actual data model.

The consistency pass does not change the data model or the routing. It applies the new visual language to whatever is rendered, and flags the architectural gap for the product team.

**Template card — MetricCard pattern alignment**

The `WorkoutsContentComponent` plan cards do not use the MetricCard pattern from `components.md`. For the catalog cards, a full MetricCard adoption is not appropriate — they are informational cards, not single-metric displays. However, the visual pattern must be consistent with the rest of the app.

Apply the standard card pattern:

```
.plan-card
  background: var(--surface-card)
  border: 1px solid var(--border-default)
  border-radius: var(--radius-lg)
  overflow: hidden
  transition: transform var(--duration-standard) var(--ease-standard),
              border-color var(--duration-micro) var(--ease-standard),
              box-shadow var(--duration-standard) var(--ease-standard)

.plan-card:hover
  transform: translateY(-4px)
  border-color: var(--border-strong)
  box-shadow: var(--shadow-card-hover)
```

**Card header (image section):**
- Image overlay gradient: `linear-gradient(to bottom, transparent 40%, var(--surface) 100%)` — ensures the text below reads against the card surface, not a hardcoded black
- Replace hardcoded badge colors:
  - `type-home`: `background: var(--color-info-bg); color: var(--color-info); border: 1px solid rgba(56, 189, 248, 0.2)`
  - `type-gym`: `background: rgba(124, 77, 255, 0.12); color: var(--primary-light); border: 1px solid var(--border-primary)`
  - `type-hybrid`: `background: var(--color-success-bg); color: var(--color-success); border: 1px solid rgba(74, 222, 128, 0.2)`
  - `lvl-beginner`: `background: var(--color-success-bg); color: var(--color-success)`
  - `lvl-intermediate`: `background: var(--color-warning-bg); color: var(--color-warning)`
  - `lvl-advanced`: `background: rgba(255, 64, 129, 0.12); color: var(--accent)`
  - All badges: `border-radius: var(--radius-pill)`, `font-size: var(--text-xs)`, `font-weight: var(--weight-bold)`, uppercase, `letter-spacing: 0.05em`, `padding: 3px 10px`

**Card body:**
- Weeks label: `var(--text-xs)` / `var(--weight-semibold)` / `var(--text-tertiary)`, `mat-icon` at 14px in `var(--text-muted)`
- Plan title: `var(--text-lg)` / `var(--weight-black)` / `var(--text-primary)` — currently at 22px implied, reduce to `var(--text-lg)` = 17px for visual consistency with card title spec in spatial.md
- Subtitle: `var(--text-sm)` / `var(--weight-regular)` / `var(--text-tertiary)`
- Perks list: `var(--text-sm)` / `var(--text-secondary)`, `check_circle` icon at 14px in `var(--color-success)`, gap 6px per item

**Card footer:**
- Price: `var(--text-2xl)` / `var(--weight-black)` / `var(--text-primary)`, currency prefix `var(--text-lg)` / `var(--text-muted)`
- "/ one-time" unit: `var(--text-xs)` / `var(--text-muted)`
- Buy button: `.btn-primary` class, height 42px, `border-radius: var(--radius-md)`. Min touch target 48px via padding.

**Controls bar token migration:**
- Search input: replace `rgba(255,255,255,.04)` bg with `var(--surface-card)`; replace `rgba(255,255,255,.08)` border with `var(--border-default)`; focus border `var(--border-primary)` (currently hardcoded `rgba(124,77,255,.4)`)
- Custom dropdowns (`.drop-trigger`, `.drop-panel`): replace all hardcoded `rgba` values with `--surface-card`, `--border-default`, `--surface-elevated` (for panel), `--shadow-dropdown`. Active option: `background: rgba(124, 77, 255, 0.12); color: var(--primary)`
- Reset button: `icon-btn-round` pattern (already in global styles)
- Page size buttons: same pill pattern as filter chips from beSocial redesign — active: `background: var(--primary)`, inactive: `background: var(--surface-card); border: 1px solid var(--border-default)`

**Stagger entrance animation:**
The card grid must animate in with the stagger pattern from `motion.md` section 3.9:
```css
.plan-card:nth-child(1) { animation: slideUp var(--duration-emphasis) var(--ease-decelerate); animation-delay: 0ms; }
.plan-card:nth-child(2) { animation-delay: 50ms; }
.plan-card:nth-child(3) { animation-delay: 100ms; }
/* ... up to nth-child(6), cap at 250ms delay */
```

**Empty state (no results):**
The current `.no-results` block uses a bare `mat-icon` + `<p>` with no CTA. Replace with the `EmptyStateTemplate` pattern from `components.md` section 2.7:
- Icon: `search_off`, 32px, `var(--primary)`
- Headline: "No plans match your search" — `var(--text-xl)` / `var(--weight-black)` / `var(--text-primary)`
- Description: "Try adjusting your filters or search term." — `var(--text-base)` / `var(--text-tertiary)`
- CTA: "Reset filters" ghost button calling `resetFilters()`
- Animation: `slideUp`, `var(--duration-emphasis)`, `var(--ease-decelerate)`

**My Templates section (the user's actual workout templates):**
The `user/workouts-tab` component hosts the real CRUD templates. These must match the card visual language. Per the beSocial redesign spec (`besocial-redesign.md`, Workouts tab section), each user workout template card receives:
- Left accent band: `3px solid var(--primary)` (already specced; verify implementation)
- Stats chips: exercise count (`background: rgba(124,77,255,0.1); color: var(--primary-light)`), estimated duration (`color: var(--color-info); background: var(--color-info-bg)`), estimated kcal (`color: var(--color-warning); background: var(--color-warning-bg)`)
- Card pattern: `var(--surface-card)`, `var(--border-default)`, `var(--radius-lg)`, hover lift

---

### Active Workout Session Screen

**Existing implementation quality:**
The `ActiveWorkoutSessionComponent` is already architecturally well-designed (Fix 6 delivered the `WorkoutSetRowComponent` — SOLID per `components.md` audit). The implementation uses `WorkoutSetRowComponent` correctly: set rows are rendered via the shared component which already has its own completion feedback keyframes (`set-row-check-pop`, `set-btn-press`). No structural replacement is needed. This section addresses the token violations and gym-use ergonomics.

**Token violations to fix in `active-workout-session.component.css`:**

| Current hardcoded value | Replace with |
|------------------------|--------------|
| `rgba(255, 255, 255, 0.5)` (loading text, elapsed, rest-label, dot) | `var(--text-tertiary)` |
| `rgba(255, 255, 255, 0.06)` (header border-bottom) | `var(--border-subtle)` |
| `rgba(13, 13, 16, 0.92)` (session-header bg) | `rgba(var(--surface-rgb, 13, 13, 16), 0.92)` — acceptable exception for blur backdrop |
| `rgba(13, 13, 16, 0.94)` (rest timer bg) | Same — blur backdrop exception |
| `rgba(255, 255, 255, 0.1)` (rest timer border, rest-bar-track) | `var(--border-default)` |
| `rgba(255, 255, 255, 0.12)` (rest-dur-btn border) | `var(--border-default)` |
| `rgba(124, 77, 255, 0.18)` (rest-dur-btn--active bg) | `rgba(124, 77, 255, 0.14)` or keep — this is `var(--primary)` tint, acceptable inline |
| `rgba(22, 22, 30, 0.98)` (session-confirm-sheet bg) | `var(--surface-elevated)` |
| `rgba(255, 255, 255, 0.1)` (confirm-sheet border) | `var(--border-default)` |
| `#4ade80` (session-ex-done icon color) | `var(--color-success)` |
| `#ff9800` (rest-countdown--warn) | `var(--color-calorie)` |
| Transition `0.18s` | `var(--duration-micro)` |
| Transition `0.15s` | `var(--duration-micro)` |

**Font sizes during active session — gym-first sizing:**
The current implementation uses 15px for exercise name (`.session-ex-name`) and 16px for the session title. These are too small when the user is glancing at the screen between sets. Required updates:

| Element | Current | Required | Token |
|---------|---------|---------|-------|
| `.session-ex-name` (exercise name) | `15px` | `20px` | `var(--text-xl)` |
| `.session-title` (workout name in header) | `16px` | `17px` | `var(--text-lg)` |
| `.session-elapsed` (timer) | `14px` | `15px` | `var(--text-base)` |
| Set number (inside WorkoutSetRow) | Per Fix 6 spec | Per Fix 6 spec | No change |
| Weight value (inside WorkoutSetRow) | Per Fix 6 spec | Per Fix 6 spec — verify 20px+/700 |

**Chrome reduction during active session:**
The session is already a routed page with its own sticky header (close button + title + elapsed timer). This is the correct pattern — the global app header is not rendered on this route because the session replaces the page. Verify that `active-session` is loaded as a route under `/workouts/session/:templateId` and that the parent route component does NOT include `<app-header>`. If the global header is showing on this route, it must be hidden for sessions.

The full-screen mode currently achieved via fixed FAB + sticky header is correct. Do not add the app footer to this route. The sidebar (desktop) at >= 640px breaks the FAB pattern — the current implementation correctly makes the FAB `position: static` and full-width on desktop, which is the right ergonomic choice.

**"Complete Set" button (primary action) location:**
The primary action is the right-swipe gesture on `WorkoutSetRowComponent`. The "Finish" FAB is fixed bottom-right (`bottom: 24px; right: 20px`), which is reachable with the right thumb on all standard phone sizes. This placement is correct. On desktop (>= 640px), the FAB becomes a full-width inline button at the bottom of the content area, which is correct for that viewport.

No changes required to button placement.

**Rest timer — token and motion alignment:**
The rest timer uses a linear progress bar (`rest-bar-fill`) with `transition: width 1s linear`. This `1s` duration is the domain-specific timer animation — keep as-is (exception per `motion.md`). The timer entrance uses `timer-slide-up` at `0.28s ease-out`. Update to `var(--duration-emphasis) var(--ease-decelerate)` (0.35s / cubic). The timer exit `timer-slide-down` remains at its current duration. The rest warning color `#ff9800` → `var(--color-calorie)`.

The rest timer bar fill color is `var(--primary)` (already tokenized). The track `rgba(255,255,255,.1)` → `var(--border-default)`. These are the only required changes.

**Section header spacing:**
`.session-section` gap is `8px`. The exercise header `.session-exercise-hdr` has `padding: 8px 0 4px`. Both are on the 8px grid — no change needed. The gap between exercise sections is `24px` — on grid (3 × 8). Keep.

---

### Post-Workout Summary

The `WorkoutCompletionCardComponent` (Fix 3) is rated SOLID in the components.md audit. The card template is complete and the stat tiles use `tile-pop` entrance animation, swipe-to-dismiss, and streak display. The "Share to beSocial" button correctly calls `onShare()` which connects to `ShareToSocialBottomSheetComponent` (also SOLID).

**Token migration needed in `workout-completion-card.component.css`** — the file was not read in full but the audit in `components.md` marks the component SOLID with no token violations flagged. Verify one item in implementation: the stat tile backgrounds should use `var(--surface-card)` and borders `var(--border-default)`. Check that the `--primary` tint in `tile-icon--primary` is `var(--primary)` (not hardcoded `#7c4dff`). The `tile-icon--accent` color should be `var(--accent)` (not hardcoded `#ff4081`).

**MetricCard pattern in the stat tiles:**
The three stat tiles (Duration / Exercises / Calories) structurally match the MetricCard layout concept. They do not need to be refactored to use the new `MetricCardComponent` — they are celebration display tiles, not interactive metric cards. The visual language (icon + large number + uppercase label) is consistent. Keep the existing tile design.

**Post-workout summary — share action:**
The "Share to beSocial" button uses `.btn-ghost` class correctly. On completion, the `ShareToSocialBottomSheetComponent` handles the share flow. Reference `fix-2-share-besocial.md` for the full share sheet spec. No changes needed here.

---

## Module: Nutrition

### Macro Progress Visualization

**Current state in the Nutrition tab:**
The `NutritionTabComponent` (`user/nutrition-tab`) is a meal CRUD list. It does not show macro progress visualization at all — there are no progress bars, rings, or aggregate numbers visible in the tab. Macro progress is only shown:
1. In the Dashboard's `MacroProgressCardComponent` (the redesigned version per `dashboard-redesign.md`)
2. As a post-save feedback card via `MealCompletionFeedbackComponent` (Fix 3)

The Nutrition tab itself is missing its primary visualization: "how am I doing today?"

**Recommended: Daily Nutrition Summary Header**

Add a `.nutrition-summary-header` section above the filter row in `nutrition-tab.component.html`. This section is the authoritative daily nutrition view when the user is on the Nutrition tab.

**Layout:**
```
.nutrition-summary-header
  .ns-rings-row                      flex row, justify-content center, gap 24px
    ProgressRingComponent [sm, protein]
    ProgressRingComponent [sm, carbs]
    ProgressRingComponent [sm, fat]
  .ns-total-row                      flex row, justify-content center, gap 32px
    .ns-total-item [Total kcal consumed]
    .ns-total-item [Protein target %]
    .ns-total-item [Water progress] (pulled from DashboardFacade or UserFacade)
```

**Ring configuration (reuse `ProgressRingComponent` from Dashboard redesign):**

| Ring | Type | Track token | Fill token | Center value | Center label |
|------|------|-------------|------------|-------------|-------------|
| Protein | custom | `var(--macro-protein-bg)` | `var(--macro-protein)` | `proteinG + "g"` | "protein" |
| Carbs | custom | `var(--macro-carbs-bg)` | `var(--macro-carbs)` | `carbsG + "g"` | "carbs" |
| Fat | custom | `var(--macro-fat-bg)` | `var(--macro-fat)` | `fatG + "g"` | "fat" |

Ring size: `var(--ring-size-sm)` = 96px. Percentage: `Math.min((consumed / target) * 100, 100)`.

**Container:**
```css
.nutrition-summary-header {
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: 24px 16px 16px;
  margin-bottom: 24px;
}
```

**Section label above rings:**
- Text: "Today's nutrition" — `var(--text-xs)` / `var(--weight-bold)` / uppercase / `var(--text-muted)` / `letter-spacing: 0.05em`

**Total row:**
Each `.ns-total-item`:
```
.ns-total-item
  .ns-total-value     [2140 kcal] — var(--text-2xl) / var(--weight-black) / var(--text-primary)
  .ns-total-label     [consumed] — var(--text-xs) / var(--text-muted) / uppercase
```

**States:**
- Loading: three skeleton circles at 96px each (`.skeleton` with `border-radius: 50%`) + two skeleton bars for the total row. `animation: pulse 1.5s ease-in-out infinite; background: var(--surface-hover)`
- No data (no meals logged today): rings at 0% fill. Total values show "0g" / "0 kcal". Add a subtle inline CTA: "Log your first meal to see progress" in `var(--text-muted)` / `var(--text-sm)`, center-aligned, with `restaurant` icon at 16px
- Error: the summary header hides silently — the meal list below is still available. The header's data source failing is non-critical

**Data source:** `NutritionTabFacade` already exposes `meals$` from which today's totals can be derived via a computed property in the component. Targets come from `UserFacade.metrics()` (same source as Dashboard's `MacroProgressCardComponent`).

**Angular implementation note:** Do not duplicate the macro target computation logic. Extract it to a shared utility or expose `carbsTargetG`, `proteinTargetG`, `fatTargetG` from `UserFacade` as computed signals — the Dashboard redesign spec already requires these same computed signals in `DashboardFacade`. Consolidate to `UserFacade`.

---

### Meal Card Design

**Current state:**
Meal list items in `nutrition-tab.component.html` use a `.row` class with a `4px` left accent band (`background: rgba(124,77,255,.6)`) and a card body showing meal name, type pill, and a macro row. When expanded (`expandedUid` matches), food items render below.

The pattern is close to correct. Specific alignment changes:

**Collapsed state:**
The `.row-type-bar` accent band currently uses `rgba(124,77,255,.6)`. Replace with `var(--primary)` at full opacity — the low opacity makes it look faded rather than intentional.

Meal type pill (`.type-pill`): currently `background: rgba(124,77,255,.18); color: #a78bfa`. Replace:
- `background: rgba(124, 77, 255, 0.12)` (stays as-is, acceptable)
- `color: var(--primary-light)` (replace hardcoded `#a78bfa`)
- `border-color: var(--border-primary)` (replace hardcoded `rgba(124,77,255,.35)`)

**Macro chips (`.macro-chip`):**
The current implementation uses `macro-chip` with per-class colors that are hardcoded. Align with the token set:
```css
.macro-chip--protein {
  background: var(--macro-protein-bg);
  color: var(--macro-protein);
  border: 1px solid rgba(167, 139, 250, 0.2);
}
.macro-chip--carbs {
  background: var(--macro-carbs-bg);
  color: var(--macro-carbs);
  border: 1px solid rgba(56, 189, 248, 0.2);
}
.macro-chip--fat {
  background: var(--macro-fat-bg);
  color: var(--macro-fat);
  border: 1px solid rgba(255, 183, 77, 0.2);
}
```

Chip dimensions: height `24px`, `padding: 4px 8px`, `border-radius: var(--radius-xs)` = 6px, `font-size: var(--text-xs)`, `font-weight: var(--weight-bold)`. Per spatial.md section 4.2.

**Calorie total display:**
Currently not prominently shown on the collapsed row. Add a calorie badge to the right side of the `.row-top` row (before the action buttons):
- `[mealTotalKcal] kcal` — `var(--text-sm)` / `var(--weight-bold)` / `var(--text-primary)`
- `background: var(--surface-active)` / `border-radius: var(--radius-pill)` / `padding: 2px 10px`

This mirrors the kcal badge in the `FitnessDataBlockComponent` (Meal variant) from besocial-redesign.md.

**Expanded state:**
Food items list. Each food item row should display:
- Food name: `var(--text-base)` / `var(--weight-semibold)` / `var(--text-primary)`
- Grams: `var(--text-sm)` / `var(--text-tertiary)` — "(Xg)"
- Mini macro row: same `.macro-chip` pattern at 11px

**Row card adjustments:**
- Replace `background: rgba(255,255,255,.025)` on `.content-card` with `var(--surface-card)`
- Replace `border: 1px solid rgba(255,255,255,.07)` with `var(--border-default)`
- Replace row `background: rgba(255,255,255,.03)` with `var(--surface-card)` (same value, but tokenized)
- Replace row border `rgba(255,255,255,.07)` with `var(--border-subtle)`
- Replace row hover `rgba(255,255,255,.055)` with `var(--surface-hover)`
- Toolbar title font `22px / #fff` → `var(--text-2xl)` / `var(--text-primary)`
- Subtitle color `rgba(255,255,255,.45)` → `var(--text-tertiary)`
- `.card-hdr-icon` icon container background: `rgba(124, 77, 255, 0.14)` (already used in global `.card-hdr-icon`)

**Loading state:**
The current `loading` boolean controls a `<mat-progress-spinner>` inline in the filters row. Replace with a skeleton pattern when `loading` is true and `meals.length === 0`:
- Three skeleton meal rows: `height: 72px; border-radius: var(--radius-md); background: var(--surface-hover); animation: pulse 1.5s ease-in-out infinite; margin-bottom: 8px`
- When `loading` is true but meals already exist (refresh): keep the existing spinner in the filter row — subtle loading without layout shift

---

### Food Search Alignment

Reference `fix-1-food-database-frontend.md` for the complete `FoodSearchComponent` spec. The component is rated SOLID in `components.md`. This pass verifies token compliance only:

**`food-search.component.css` — check for:**
- Search input border focus state should use `var(--border-primary)` (not hardcoded `rgba(124,77,255,x)`)
- Result items hover: `var(--surface-hover)` (not hardcoded rgba)
- Skeleton rows: `.skeleton` class with `var(--surface-hover)` background
- Selected item highlight: `background: rgba(124, 77, 255, 0.12); color: var(--primary-light)` — verify these are tokenized

**AI Meal Analyzer CTA placement:**
The `onOpenAiAnalyzer()` handler in `NutritionTabComponent` correctly opens `AiMealAnalyzerDialogComponent` via `MatDialog`. The CTA button that triggers this in the guided empty state (`NutritionGuidedEmptyComponent`) should be the primary visual action:
- Button: `.btn-primary` class, `auto_awesome` icon at 18px, label "AI analyze meal"
- Icon container bg when shown as card: `rgba(124, 77, 255, 0.14)` (standard)
- This is already specced in Fix 7 (`fix-7-empty-states.md`) — reference that spec for the guided empty state visual. Do not duplicate.

The AI analyzer CTA must also appear as a secondary action in the `nutrition-summary-header` when no meals exist yet:
```html
<button class="btn-primary" (click)="onOpenAiAnalyzer()">
  <mat-icon>auto_awesome</mat-icon>
  AI analyze meal
</button>
```
Placement: centered below the "Log your first meal" text in the no-data state of `.nutrition-summary-header`.

---

## Module: AI Chat (Bottom Sheet)

### Bottom Sheet Anatomy

**Current implementation status:**
The `AiChatBottomSheetComponent` was created in Fix 8 (`fix-8-ai-contextual.md`) and is rated SOLID in `components.md`. The component uses `MatBottomSheet` and injects via `MAT_BOTTOM_SHEET_DATA`. The implementation is functional. This pass identifies specific token and sizing gaps.

**Does it match the canonical BottomSheet spec from `components.md` section 2.5?**

Comparison:

| Spec requirement | Current implementation | Action |
|-----------------|----------------------|--------|
| Backdrop: `var(--overlay-scrim)` | Controlled by `MatBottomSheet` panel class — must be set in `styles.css` via `.ai-chat-sheet-panel .mat-mdc-bottom-sheet-container { ... }` | Verify the `ai-chat-sheet-panel` CSS in `styles.css` sets backdrop correctly |
| Sheet bg: `var(--surface)` (opaque) | The `.acbs-shell` has no background — background comes from `mat-mdc-bottom-sheet-container`. Must be set via panel class to `var(--surface)` | Check and fix in `styles.css` |
| Sheet border: `var(--border-default)` top | Not present in current CSS — needs `border-top: 1px solid var(--border-default)` on the sheet container | Add via `styles.css` panel class |
| Sheet radius: `var(--radius-xl) var(--radius-xl) 0 0` | Controlled by `mat-mdc-bottom-sheet-container` — must be set in panel class | Verify panel class sets `border-radius: var(--radius-xl) var(--radius-xl) 0 0` |
| Sheet shadow: `var(--shadow-sheet)` | Not present — needs `box-shadow: var(--shadow-sheet)` | Add via panel class |
| Max height: 70dvh (standard variant) | Controlled by panel class — verify `max-height: 70dvh` is set | Verify and adjust if needed |
| Handle: 40px wide, 4px tall, `var(--border-strong)` color | Current: 40px wide, 4px tall, `rgba(255,255,255,0.2)` | Replace `rgba(255,255,255,0.2)` with `var(--border-strong)` |
| Handle hover: brightens | Current: `rgba(255,255,255,0.35)` on hover | Replace with `var(--border-focus)` |
| Enter animation: `sheetEnter` keyframe | Handled by Material — acceptable | No change |

**Spec gap — sheet handle width:**
The canonical spec (components.md section 2.5) specifies 40px wide handle. The current `acbs-handle` is `width: 40px` — already correct. Note that the spec document header at the top of this file specifies 32px wide. The components.md canonical spec wins: 40px is the standard.

**Desktop positioning (>= 640px):**
Per components.md section 2.5: "On desktop, center the sheet horizontally at max-width 480px." The panel class in `styles.css` must add:
```css
@media (min-width: 640px) {
  .ai-chat-sheet-panel .mat-mdc-bottom-sheet-container {
    max-width: 480px;
    margin: 0 auto;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  }
}
```

---

### Chat Bubble Design

**User message bubble — current vs. spec:**

Current implementation:
- `background: var(--primary)` — correct
- `border-bottom-right-radius: 4px` — this creates the "chat tail" asymmetry. Correct per spec.
- Full border-radius on other corners is `18px` (from `.bubble`). The spec requires `16px 16px 4px 16px`. Update `.bubble` base radius to `var(--radius-lg)` = 20px... however 20px is too large for a chat bubble. Use `16px` as the base (this is a domain-specific value for chat, which is not in the standard card radius scale).

Recommended: `border-radius: 16px 16px 4px 16px` for user bubbles, `16px 16px 16px 4px` for AI bubbles. These are fixed values, not using `--radius-*` tokens, because chat bubble asymmetric radius is a domain-specific pattern, not a card/modal pattern. This is an acceptable exception.

```css
.msg-user .bubble {
  background: var(--primary);
  color: var(--white);
  border-radius: 16px 16px 4px 16px;
  box-shadow: 0 2px 12px var(--primary-glow);  /* replace hardcoded rgba */
}

.msg-ai .bubble {
  background: var(--surface-card);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  border-radius: 16px 16px 16px 4px;
}
```

The current `.msg-ai .bubble` uses `rgba(255, 255, 255, 0.05)` for background. Replace with `var(--surface-card)`. Replace `var(--white-fade)` border with `var(--border-default)`.

**AI avatar:**
Currently no avatar is shown beside AI messages. The spec requires a 24px circle with `auto_awesome` icon. Implementation:

```html
<!-- Add to .msg-ai template -->
<div class="bubble-avatar" aria-hidden="true">
  <mat-icon>auto_awesome</mat-icon>
</div>
```

```css
.msg-ai {
  align-items: flex-end;
  gap: 8px;
}

.bubble-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(124, 77, 255, 0.14);
  border: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  align-self: flex-end;
  margin-bottom: 2px;
}

.bubble-avatar mat-icon {
  font-size: 13px;
  width: 13px;
  height: 13px;
  color: var(--primary-light);
}
```

**Typing indicator:**
Current implementation uses `acbs-bounce` keyframe with three `.dot` elements at `6px`, `background: rgba(255,255,255,0.5)`. The animation cycle is `1.2s ease infinite`. Align with the design system:
- Dot color: `var(--text-tertiary)` (replace `rgba(255,255,255,0.5)`)
- Animation duration: `1.2s` is acceptable — closest to `--duration-celebration` semantically but used for infinite repeat, not a one-shot animation. Keep as-is per the motion.md audit which explicitly marks `acbs-bounce` as KEEP.
- Bubble background: `var(--surface-card)` (replace `rgba(255,255,255,0.05)`) to be consistent with other AI bubbles

**Bubble text size:**
`.bubble-text` is `14px`. This is below `var(--text-base)` = 15px. Update to `var(--text-base)` for readability. The gym use case demands legibility.

**Timestamp:**
`.bubble-time` is `10px` / `opacity: 0.4`. Replace with `var(--text-xs)` = 11px / `var(--text-muted)` = `rgba(255,255,255,0.35)` (using the token directly instead of opacity manipulation). Remove the `opacity: 0.4` approach — opacity stacking causes rendering inconsistencies on some Android browsers.

---

### Context Badge

The context badge (`acbs-ctx-badge`) is already implemented and working. The badge appears directly below the handle, above the message scroll area. Current position is correct.

**Token alignment:**
- `.ctx--default`: `background: rgba(124, 77, 255, 0.14); color: var(--primary-light)` — already correct
- `.ctx--dashboard`: `background: var(--color-info-bg); color: var(--color-info)` — already correct
- `.ctx--workouts`: `background: rgba(124, 77, 255, 0.14); color: var(--primary-light)` — already correct
- `.ctx--nutrition`: `background: var(--color-success-bg); color: var(--color-success)` — already correct
- `.ctx--social`: `background: var(--accent-background); color: var(--accent)` — already correct

These are all fully tokenized. No changes needed.

**Badge typography:**
Current: `font-size: 11px; font-weight: 700; letter-spacing: 0.03em`. Update `letter-spacing: 0.03em` to `0.05em` to match the label/badge spec from spatial.md section 9 (label/badge: `letter-spacing: 0.05em`). Minor change.

**Badge text values (the `label` field in `ctxConfig`):**
Current labels:
- dashboard: "Asking about your dashboard"
- workouts: "Asking about your workouts"
- nutrition: "Asking about your nutrition"
- social: "Asking about fitness & community"

These are correct per the spec intent. No change.

**Suggestion chip touch targets:**
`.acbs-chip` currently has `min-height: 36px`. This is below the 48px minimum touch target. The chips are used as quick-fill prompts at the gym. Update:
```css
.acbs-chip {
  min-height: 40px;
  padding: 8px 14px;
}
```
The chips are small enough that the `::before` pseudo-element touch target extension is not needed — increasing padding to 40px is sufficient and visible.

**Send button touch target:**
`.acbs-send-btn` is `40px x 40px`. Below the 48px minimum. Update to `48px x 48px`:
```css
.acbs-send-btn {
  width: 48px;
  height: 48px;
}
```

**Input textarea minimum height:**
`.acbs-textarea` should have `min-height: 48px` (currently using `rows="1"` which may render at ~36px depending on browser). Add `min-height: 48px` to the textarea to meet the touch target rule when the user taps to focus.

---

## Module: Me / Profile Tab

### Information Architecture

**Current sections in `user-page.component`:**

The sidebar nav and mobile tab row reveal the current IA:
1. Profile (name, email, avatar — the `ProfileTabComponent`)
2. Physical & Metrics (the `PhysicalTabComponent` — body stats, BMI, BMR, TDEE)
3. My Workouts (the `WorkoutsTabComponent` — user's CRUD workout templates)
4. Nutrition Plans (the `NutritionTabComponent` — CRUD meal entries)
5. Progress (coming soon — "cs-card" placeholder)
6. Goals (coming soon — "cs-card" placeholder)
7. Settings (coming soon — "cs-card" placeholder)
8. AI Chat History (navigates to `/ai-assistant` — `openAiHistory()`)
9. Notifications/Alerts (coming soon — "cs-card" placeholder)

**Problems with the current IA:**
- No concept of "how others see you" — the profile section is purely a settings form (name, email, avatar upload), not a social identity preview
- Achievements do not exist at all — no placeholder, no indication they are planned
- Settings, Notifications, Progress, and Goals are "coming soon" shells with no actionable content — they add nav clutter without delivering value
- AI Chat History is in the nav but navigates away from the page (breaks the Me tab context)
- The "Physical & Metrics" tab merges two concerns: body stats input and calculated metrics display

**Recommended IA restructure:**

```
Me / Profile tab
  ├── Profile           [Profile identity — name, avatar, bio + "Preview my profile" CTA]
  ├── My Stats          [Private health metrics — weight, BMI, BMR, TDEE, goal calories]
  ├── My Workouts       [CRUD workout templates — as-is]
  ├── Nutrition         [CRUD meal entries — as-is, with new summary header]
  ├── Achievements      [Placeholder section — spec below]
  ├── AI History        [Inline in this tab — do NOT navigate away]
  └── Settings          [Account + Privacy + Notifications + App — structured placeholder]
```

The "Progress" and "Goals" shells are removed from the nav until they are implemented. They add cognitive noise without delivering value. The streak display in the sidebar remains as the primary progress indicator.

**Sidebar visual updates:**
- `.sb-item--ai` class (used for AI Chat History item) should have a subtle visual distinction: `background: rgba(124, 77, 255, 0.06)` when not active, `mat-icon` in `var(--primary-light)`
- All sidebar `.sb-item` nav buttons must meet 48px height. Current height is unspecified. Add `min-height: 48px` to `.sb-item`
- Sidebar avatar size: currently implied by `<img>` container. Set explicit `width: 56px; height: 56px; border-radius: 50%; object-fit: cover` — matches the 7 × 8px size from besocial profile spec for non-hero contexts
- Sidebar streak: the `.sb-streak` section uses `sb-flame-icon` with an `.animated` class. Token migration: flame color should be `var(--color-streak)` (not hardcoded in CSS — verify), at-risk badge `var(--accent)` on `var(--accent-background)`

---

### Achievement System Placeholder

No achievement system exists. The Me tab has no mention of achievements at any level. The consistency pass introduces a placeholder section that is spec-ready for when the achievement engine ships.

**Section: Achievements (new tab content)**

Add to the `activeTab` union type: include `'achievements'` (already has `'progress'` — repurpose if possible). Create a new placeholder content block in `user-page.component.html`.

**Placeholder layout:**
```
.achievements-card     (standard card: var(--surface-card), var(--border-default), var(--radius-lg))
  .card-hdr
    .card-hdr-icon     [emoji_events icon, background: var(--celebration-gold-bg)]
    .card-hdr-title    "Achievements"
    .card-hdr-subtitle "Complete challenges to earn achievements"
  .achievements-locked-grid   (2-column on mobile, 3-column on tablet+)
    [6 placeholder achievement cards]
```

**Placeholder achievement card:**
```css
.achievement-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  opacity: 0.5;  /* locked state */
}
```

Inside each placeholder:
- Icon: `lock` mat-icon at 24px, `var(--text-disabled)` — signals the achievement is locked
- Label: placeholder text in `var(--text-xs)` / `var(--text-disabled)` / uppercase — e.g., "7-DAY STREAK", "FIRST WORKOUT", "MACRO MASTER"
- No numbers or progress — purely decorative locked state

**Empty state (no achievements earned yet):**
Below the grid, show the `EmptyStateTemplate` pattern:
- Icon: `emoji_events`, 32px, `var(--celebration-gold)`
- Headline: "No achievements yet"
- Description: "Complete workouts, maintain your streak, and log nutrition to earn achievements."
- CTA: "Discover challenges" — ghost button → navigates to `/social/discover` (Challenge of the Week card per besocial-redesign.md)
- Animation: `slideUp`, `var(--duration-emphasis)`, `var(--ease-decelerate)`

**Icon container for card header:**
`emoji_events` icon in a 40×40px container:
```css
.card-hdr-icon--achievements {
  background: var(--celebration-gold-bg);
  border: 1px solid rgba(251, 191, 36, 0.2);
}
```

---

### Social Profile Preview

**Current state:**
The `ProfileTabComponent` is a settings form: name, email, avatar upload. It has no concept of "how others will see you." The social profile view (`SocialProfileComponent`) exists at `/social/profile/:userId` and accepts `[isOwnProfile]` input. There is no connection between the Me tab profile form and the social profile view.

**Add "Preview my profile" button:**

In `profile-tab.component.html`, add to the card header or below the avatar section:

```html
<button class="btn-ghost preview-btn" (click)="openSocialProfile()" type="button">
  <mat-icon>visibility</mat-icon>
  Preview my profile
</button>
```

```css
.preview-btn {
  height: 40px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--text-secondary);
  border-color: var(--border-default);
  gap: 6px;
  padding: 0 16px;
  min-height: 48px;   /* touch target */
}

.preview-btn:hover {
  background: var(--surface-hover);
  border-color: var(--border-strong);
  transition: all var(--duration-micro) var(--ease-standard);
}
```

**`openSocialProfile()` method:**
Navigate to `/social/profile/[currentUserId]`. The user's own ID is available via `UserFacade.user()?.id` or `AccountFacade.authUser()?.id`.

```typescript
openSocialProfile(): void {
  const userId = this.facade.user()?.id;
  if (userId) this.router.navigate(['/social/profile', userId]);
}
```

The `SocialProfileComponent` already handles the `isOwnProfile` detection by comparing the route `userId` param to the authenticated user's ID. No changes to `SocialProfileComponent` are needed for the read-only preview use case.

**Button placement:** Directly below the avatar in the profile section, before the form fields. This placement makes it clear the button relates to the user's public identity, not the form settings.

---

### Settings Organization

**Current state:**
The "Settings" tab is a "coming soon" shell (`cs-card`) with a list of planned features (change password, manage privacy settings, configure notification preferences, delete account). No actual functionality exists.

**The consistency pass does not implement settings functionality.** That is a product sprint. However, the placeholder must be visually restructured to communicate the planned hierarchy and avoid the appearance of incomplete work.

**Restructured Settings placeholder layout:**

Replace the single `cs-card` with a grouped-sections placeholder that teaches the user what is coming and where it will live.

```
Settings tab
  [Section: Account]          [Section: Privacy]
  [Section: Notifications]    [Section: App]
```

Each section is a card with `.card-hdr` pattern and a list of disabled-looking settings items.

**Account section:**
```
.card-hdr
  icon: manage_accounts
  title: "Account"
  subtitle: "Password, email, and account management"
.settings-item [lock, "Change password", coming-soon chip]
.settings-item [email, "Change email", coming-soon chip]
.settings-item [delete_forever, "Delete account", coming-soon chip, var(--accent) icon]
```

**Privacy section:**
```
.card-hdr
  icon: privacy_tip
  title: "Privacy"
  subtitle: "Control what others can see"
.settings-item [public, "Profile visibility", toggle stub — disabled]
.settings-item [visibility, "Who can see my workouts", toggle stub]
.settings-item [bar_chart, "Show stats on profile", toggle stub]
.settings-item [fitness_center, "Show activity to followers", toggle stub]
```

Privacy items show `mat-slide-toggle` components in `disabled` state (not functional, but communicates the granular control that is planned). The toggle color when "on" should use `var(--primary)`.

**Notifications section:**
```
.card-hdr
  icon: notifications
  title: "Notifications"
  subtitle: "Choose what you want to hear about"
.settings-item [favorite, "Likes and reactions", toggle stub]
.settings-item [chat_bubble, "Comments", toggle stub]
.settings-item [person_add, "New followers", toggle stub]
.settings-item [message, "Direct messages", toggle stub]
.settings-item [local_fire_department, "Streak reminders", toggle stub]
.settings-item [bar_chart, "Weekly summary", toggle stub]
```

**App section:**
```
.card-hdr
  icon: settings_applications
  title: "App"
  subtitle: "Display and behavior preferences"
.settings-item [palette, "Theme", "Dark (current)", right label — no toggle]
.settings-item [language, "Language", "English", right label]
.settings-item [info, "Version", "1.0.0", right label]
```

**`.settings-item` visual spec:**
```css
.settings-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-subtle);
  min-height: 56px;  /* touch target + padding */
  cursor: not-allowed;  /* disabled state */
  opacity: 0.6;         /* disabled visual */
}

.settings-item:last-child { border-bottom: none; }

.settings-item-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: var(--surface-active);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.settings-item-icon mat-icon {
  font-size: 20px;
  color: var(--text-tertiary);
}

.settings-item-label {
  flex: 1;
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  color: var(--text-secondary);
}

.settings-item-badge {
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: var(--surface-active);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

**"Coming soon" chip** on items not yet implemented:
```css
.coming-soon-chip {
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  background: var(--surface-card);
  color: var(--text-muted);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

**Sections layout:**
On mobile: single column. On tablet (>= 768px): 2-column grid (`grid-template-columns: repeat(2, 1fr); gap: 16px`). Each section is one card.

---

## Cross-Module Consistency Checklist

The following checklist is for `@angular-developer` to tick off during implementation. Every item is derived from a finding in this spec or a referenced Fix spec.

### Token Compliance

- [ ] `workouts-content.component.css` — all hardcoded colors replaced with tokens (badge colors, hover states, dropdown panels)
- [ ] `active-workout-session.component.css` — 12 hardcoded color values replaced (see table in Active Session section)
- [ ] `nutrition-tab.component.css` — hardcoded `#fff` → `var(--white)`, `#a78bfa` → `var(--primary-light)`, `rgba(124,77,255,x)` borders → `var(--border-primary)`, card backgrounds → `var(--surface-card)`
- [ ] `ai-chat-bottom-sheet.component.css` — handle color `rgba(255,255,255,0.2)` → `var(--border-strong)`, bubble AI bg → `var(--surface-card)`, bubble border → `var(--border-default)`, dot color → `var(--text-tertiary)`, bubble-text → `var(--text-base)`
- [ ] `user-page.component.css` — `#7C4DFF` inline styles in template → moved to CSS with `var(--primary)`, `#ff4081` → `var(--accent)`
- [ ] All `rgba(255,255,255,0.XX)` border values in scope → mapped to `--border-*` tokens
- [ ] All `rgba(255,255,255,0.XX)` background values in scope → mapped to `--surface-*` tokens
- [ ] All `0.15s`, `0.18s`, `0.2s` transitions → `var(--duration-micro)` or `var(--duration-standard)`

### Spacing Compliance (8px grid)

- [ ] Nutrition tab toolbar margin-bottom `18px` → `16px`
- [ ] Nutrition tab filter margin-bottom `20px` → `24px` (3 × 8px — closer to the spatial.md "comfortable" spacing for section gaps)
- [ ] Nutrition tab `.list` gap `10px` → `8px` (on grid)
- [ ] Nutrition tab `.row-main` padding `14px 16px` → `16px` (uniform, on grid)
- [ ] Active session `.session-confirm-header` gap `14px` → `16px`
- [ ] Nutrition summary header padding `24px 16px 16px` — on grid, keep
- [ ] Settings section `.settings-item` padding `14px 16px` → `16px` for uniformity

### State Coverage (all list/data views must have loading, empty, error)

- [ ] `WorkoutsContentComponent` — loading: `mat-progress-spinner` (exists, keep), empty: replace `.no-results` with `EmptyStateTemplate` pattern, error: not present — add a simple error banner if the plan list were to load from API
- [ ] `NutritionTabComponent` — loading: replace inline spinner with skeleton rows (per spec), empty: exists (`NutritionGuidedEmptyComponent`), error: `facade.error()` already passed to guided empty — verify error state renders
- [ ] `NutritionSummaryHeader` (new) — loading: skeleton circles, empty: rings at 0% + no-data CTA, error: silently hide
- [ ] Achievements placeholder — loading: N/A (static content), empty: `EmptyStateTemplate` (per spec), error: N/A
- [ ] Settings placeholder — loading: N/A (static content), error: N/A

### Touch Target Compliance (48px minimum, gym use)

- [ ] `WorkoutsContentComponent` buy button: `min-height: 48px` via padding (visual: 42px)
- [ ] `WorkoutsContentComponent` dropdown triggers: `min-height: 48px`
- [ ] `WorkoutsContentComponent` page-size buttons: `min-height: 48px`
- [ ] `active-workout-session.component` rest duration buttons: already `min-height: 48px` (`var(--touch-target)`) — verify
- [ ] `active-workout-session.component` Skip/+30s rest buttons: already `min-height: 48px` — verify
- [ ] `active-workout-session.component` Finish FAB: `min-height: 56px` — already correct
- [ ] `nutrition-tab.component` meal row actions: `icon-btn-round` must be `48px × 48px`
- [ ] `ai-chat-bottom-sheet.component` send button: `48px × 48px` (change from 40px)
- [ ] `ai-chat-bottom-sheet.component` suggestion chips: `min-height: 40px` (change from 36px — closest compliant size below 48px for inline chip UI)
- [ ] `ai-chat-bottom-sheet.component` textarea: `min-height: 48px`
- [ ] `user-page.component` sidebar nav items: `min-height: 48px`
- [ ] `user-page.component` mobile tab buttons: `min-height: 48px`
- [ ] `profile-tab.component` "Preview my profile" button: `min-height: 48px`
- [ ] Settings `.settings-item` rows: `min-height: 56px` (touch target for toggle/row)

### Animation Compliance

- [ ] Workouts plan cards: stagger entrance using `slideUp` + `animation-delay` per motion.md section 3.9
- [ ] Nutrition summary header: `slideUp` on initial render, macro ring fill animated via `ringFill` (reuse from Dashboard `ProgressRingComponent`)
- [ ] Empty states across all new content: `slideUp`, `var(--duration-emphasis)`, `var(--ease-decelerate)` on enter
- [ ] AI chat bottom sheet handle hover: `var(--duration-micro)` / `var(--ease-standard)` (already correct)
- [ ] Active session rest timer entrance: `timer-slide-up` updated to `var(--duration-emphasis)` / `var(--ease-decelerate)` (from 0.28s ease-out)

### Reduced Motion

- [ ] All new animations (stagger entrance, ring fill in nutrition header, slideUp on achievements empty state) are suppressed by the global `@media (prefers-reduced-motion: reduce)` block in `styles.css` — no per-component overrides needed if the global block is in place (per motion.md section 8)

---

## Token References

All CSS custom properties referenced in this spec. Every token listed here must exist in the `:root` block of `styles.css` per tokens.md Section 11.

### Color Tokens
- `var(--primary)` — workout accent bands, buy button, active nav item, AI send button, macro ring fill (protein)
- `var(--primary-light)` — plan type-gym badge text, sidebar AI item icon, meal type pill text, AI context badge text (default/workouts)
- `var(--primary-glow)` — user message bubble box-shadow replacement
- `var(--primary-darker)` — not used in this spec — no reference
- `var(--accent)` — at-risk streak badge, delete account icon, lvl-advanced badge text
- `var(--accent-background)` — social context badge background
- `var(--surface)` — bottom sheet background (via panel class), active session header blur backdrop base
- `var(--surface-card)` — all card backgrounds (plan cards, nutrition rows, settings sections, AI bubble AI side)
- `var(--surface-hover)` — card hover bg, skeleton animation bg, unread notification bg
- `var(--surface-active)` — pressed states, calorie badge bg, settings item icon bg
- `var(--surface-elevated)` — confirmation sheet bg (active session), dropdown panel bg
- `var(--color-success)` — perk checkmarks, plan beginner badge, workout type-home badge, completion icon, AI nutrition context badge
- `var(--color-success-bg)` — plan beginner badge bg, workout type-home badge bg, AI nutrition context badge bg
- `var(--color-info)` — plan type-home badge (carbs ring fill), plan duration chip
- `var(--color-info-bg)` — plan type-home badge bg, AI dashboard context badge bg
- `var(--color-warning)` — plan lvl-intermediate badge text, fat macro ring fill, plan calorie chip
- `var(--color-warning-bg)` — plan lvl-intermediate badge bg, fat macro chip bg
- `var(--color-calorie)` — rest timer countdown warning color (replaces `#ff9800`)
- `var(--color-streak)` — sidebar streak flame icon
- `var(--macro-protein)` — protein ring fill, protein chip text
- `var(--macro-carbs)` — carbs ring fill, carbs chip text
- `var(--macro-fat)` — fat ring fill, fat chip text
- `var(--macro-protein-bg)` — protein ring track, protein chip bg
- `var(--macro-carbs-bg)` — carbs ring track, carbs chip bg
- `var(--macro-fat-bg)` — fat ring track, fat chip bg
- `var(--celebration-gold)` — achievements card header icon color
- `var(--celebration-gold-bg)` — achievements card header icon container bg
- `var(--text-disabled)` — locked achievement icons

### Text Tokens
- `var(--text-primary)` — all headings, card titles, active values, calorie totals
- `var(--text-secondary)` — body text, plan subtitles, settings item labels, AI bubble text
- `var(--text-tertiary)` — captions, plan weeks label, macro chip sub-labels, bubble timestamps
- `var(--text-muted)` — placeholders, section subtitles, "coming soon" chip text
- `var(--text-disabled)` — locked achievement card content, disabled settings items

### Border Tokens
- `var(--border-subtle)` — card section dividers, settings item row separators, nutrition row borders (reduced opacity)
- `var(--border-default)` — all card borders, input outlines, plan card at rest, AI bubble border, rest timer border
- `var(--border-strong)` — card hover, handle zone hover, ghost button hover
- `var(--border-focus)` — input focus (nutrition search, AI textarea focus)
- `var(--border-primary)` — meal type pill border, AI textarea focus, selected plan chip

### Shadow Tokens
- `var(--shadow-card-hover)` — plan card hover
- `var(--shadow-sheet)` — AI chat bottom sheet (via panel class in styles.css)
- `var(--shadow-dropdown)` — custom dropdown panels in WorkoutsContentComponent

### Border Radius Tokens
- `var(--radius-xs)` = 6px — macro chips
- `var(--radius-sm)` = 10px — settings item icon container, rest duration buttons, filter chips
- `var(--radius-md)` = 14px — nutrition meal rows, buttons, settings sections nested cards, preview button
- `var(--radius-lg)` = 20px — plan cards, nutrition content card, achievements card, settings sections
- `var(--radius-xl)` = 24px — AI chat bottom sheet corners (via panel class)
- `var(--radius-pill)` = 999px — all badge/chip elements, macro chips, "coming soon" chip, plan type/level badges

### Motion Tokens
- `var(--duration-micro)` = 150ms — hover transitions for all card and button elements
- `var(--duration-standard)` = 250ms — plan card hover, dropdown open/close, state changes
- `var(--duration-emphasis)` = 350ms — plan card stagger entrance, empty state enter, rest timer slide entrance
- `var(--duration-celebration)` = 600ms — nutrition macro ring fill (on first render, via `ringFill` keyframe)
- `var(--ease-standard)` = ease-out — all default transitions
- `var(--ease-spring)` = cubic-bezier(0.34, 1.56, 0.64, 1) — achievement unlock animation (future)
- `var(--ease-decelerate)` = cubic-bezier(0.0, 0.0, 0.2, 1) — page/card enter, rest timer enter
- `var(--ease-accelerate)` = cubic-bezier(0.4, 0.0, 1, 1) — elements exiting

### Typography Tokens
- `var(--text-xs)` = 11px — badge labels, macro chip labels, section category headers, "coming soon" chips, filter chips
- `var(--text-sm)` = 13px — plan subtitle, plan weeks, sidebar sub-text, AI bubble timestamp, empty state description
- `var(--text-base)` = 15px — plan perk items, body copy, nutrition row titles, AI bubble text (update from 14px), settings item labels
- `var(--text-lg)` = 17px — plan card title, settings section card titles
- `var(--text-xl)` = 20px — session exercise name (gym-sized increase from 15px), empty state headline
- `var(--text-2xl)` = 24px — plan price, calorie total in nutrition summary, achievements section empty state counter
- `var(--weight-regular)` = 400 — body text, plan subtitles
- `var(--weight-medium)` = 500 — perk items, elapsed timer, settings item labels
- `var(--weight-semibold)` = 600 — plan weeks label, meal row titles, preview button
- `var(--weight-bold)` = 700 — plan card footer, badge text, chip labels, send button label, session title
- `var(--weight-black)` = 800 — plan card title, nutrition summary totals, achievements empty state headline

### Ring Tokens (used in nutrition summary header)
- `var(--ring-stroke-width)` = 8px
- `var(--ring-size-sm)` = 96px — nutrition macro rings
- `var(--macro-protein)` — protein ring fill (aliased from `var(--primary-light)`)
- `var(--macro-carbs)` — carbs ring fill (aliased from `var(--color-info)`)
- `var(--macro-fat)` — fat ring fill (aliased from `var(--color-warning)`)
- `var(--macro-protein-bg)` — protein ring track
- `var(--macro-carbs-bg)` — carbs ring track
- `var(--macro-fat-bg)` — fat ring track

### Overlay Tokens
- `var(--overlay-scrim)` — AI chat bottom sheet backdrop (via `styles.css` `.ai-chat-sheet-panel` override)

---

## Angular Implementation Notes

The following is the definitive task list for `@angular-developer`. Each item includes the file path, type of change, and reference to the relevant section of this spec.

### Token Migration (mechanical, no behavior change)

| File | Change type | Reference |
|------|------------|-----------|
| `workouts-content.component.css` | Replace hardcoded badge colors, hover states, dropdown colors | Template List — Token Migration |
| `active-workout-session.component.css` | Replace 12 hardcoded values per the table in Active Session — Token violations section | Active Session — Token violations |
| `nutrition-tab.component.css` | Replace `#fff`, `#a78bfa`, hardcoded rgba border/bg values | Meal Card Design |
| `ai-chat-bottom-sheet.component.css` | Replace handle color, bubble backgrounds, borders, dot color, bubble-text size, timestamp approach | Chat Bubble Design |
| `user-page.component.html` | Remove inline `style="color:#7C4DFF"` and `style="color:#ff4081"` on icon elements in cs-card sections — move to CSS with `var(--primary)` / `var(--accent)` | Token compliance hard rule |

### Structural Changes

| Component | Change | Spec reference |
|-----------|--------|---------------|
| `NutritionTabComponent` | Add `.nutrition-summary-header` section above filters, with 3 `ProgressRingComponent` instances (reuse from Dashboard) | Macro Progress Visualization |
| `NutritionTabComponent` | Update macro chip CSS to use `--macro-*` tokens | Meal Card Design — Macro chips |
| `NutritionTabComponent` | Add calorie total badge to collapsed meal row `.row-top` | Meal Card Design — Calorie total |
| `NutritionTabComponent` | Replace inline loading spinner (in `.filters`) with skeleton rows when `loading && meals.length === 0` | Meal Card Design — Loading state |
| `AiChatBottomSheetComponent` | Add `.bubble-avatar` element to AI message template | Chat Bubble Design — AI avatar |
| `AiChatBottomSheetComponent` | Update `.acbs-send-btn` to 48×48px | Chat Bubble Design — Send button |
| `AiChatBottomSheetComponent` | Update `.acbs-chip` `min-height` to 40px | Context Badge — Touch targets |
| `AiChatBottomSheetComponent` | Update `.acbs-textarea` `min-height` to 48px | Chat Bubble Design — Textarea |
| `ProfileTabComponent` | Add "Preview my profile" ghost button + `openSocialProfile()` method with `Router` injection | Social Profile Preview |
| `UserPageComponent` | Add `'achievements'` to `activeTab` union and new achievements content block | Achievement System |
| `UserPageComponent` | Restructure Settings content block to 4-section grouped layout with disabled items | Settings Organization |
| `UserPageComponent` | Remove "Progress" and "Goals" sidebar items and mobile tab buttons (or keep as hidden until implemented — product decision) | IA Restructure |
| `WorkoutsContentComponent` | Replace `.no-results` with `EmptyStateTemplate` pattern (can be inline template, not a new component import if `EmptyStateTemplate` is not yet built) | Template List — Empty state |
| `WorkoutsContentComponent` | Add `animation: slideUp var(--duration-emphasis) var(--ease-decelerate)` + stagger delays to `.plan-card` | Template List — Stagger entrance |

### New CSS Classes Needed

| Class | File | Description |
|-------|------|-------------|
| `.nutrition-summary-header` | `nutrition-tab.component.css` | Daily nutrition summary card container |
| `.ns-rings-row` | `nutrition-tab.component.css` | Flex row for 3 macro rings |
| `.ns-total-row` | `nutrition-tab.component.css` | Total calorie/macro summary row |
| `.ns-total-item` | `nutrition-tab.component.css` | Individual total display cell |
| `.bubble-avatar` | `ai-chat-bottom-sheet.component.css` | 24px AI avatar circle beside AI messages |
| `.achievements-locked-grid` | `user-page.component.css` | 2-3 column grid for achievement placeholders |
| `.achievement-placeholder` | `user-page.component.css` | Individual locked achievement card |
| `.settings-item` | `user-page.component.css` | Settings row (icon + label + control) |
| `.settings-item-icon` | `user-page.component.css` | Icon container in settings row |
| `.settings-item-label` | `user-page.component.css` | Text label in settings row |
| `.coming-soon-chip` | `user-page.component.css` | "Coming soon" badge on unimplemented items |
| `.preview-btn` | `profile-tab.component.css` | "Preview my profile" ghost button |

### styles.css Panel Class Changes

The `ai-chat-sheet-panel` overrides for `MatBottomSheet` must be added or verified in `styles.css`:

```css
/* AI Chat Bottom Sheet — canonical BottomSheet spec alignment */
.ai-chat-sheet-panel .mat-mdc-bottom-sheet-container {
  background: var(--surface);
  border-top: 1px solid var(--border-default);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  box-shadow: var(--shadow-sheet);
  max-height: 70dvh;
  padding: 0;
}

@media (min-width: 640px) {
  .ai-chat-sheet-panel .mat-mdc-bottom-sheet-container {
    max-width: 480px;
    margin: 0 auto;
  }
}

.cdk-overlay-container .ai-chat-sheet-panel + .cdk-overlay-backdrop {
  background: var(--overlay-scrim);
}
```

### Facade / Signal Updates

| Facade | New computed signal | Purpose |
|--------|--------------------|----|
| `UserFacade` | `proteinTargetG`, `carbsTargetG`, `fatTargetG` | Expose macro targets for both Dashboard and Nutrition tab — consolidate from wherever they are computed in Dashboard redesign |
| `NutritionTabFacade` | `todayTotals` computed signal (protein, carbs, fat, kcal totals for today's date) | Feed `.nutrition-summary-header` rings and totals |
| `ProfileTabComponent` | Inject `Router` + add `openSocialProfile()` method | Social profile preview |

### No New Components Required

This consistency pass deliberately avoids creating new component files. All changes are:
1. CSS token migrations in existing component stylesheets
2. Template additions within existing component HTML files
3. New CSS utility classes added to existing component stylesheet or `styles.css`
4. One new method (`openSocialProfile()`) in `ProfileTabComponent`
5. Reuse of the already-specced `ProgressRingComponent` (which `@angular-developer` will create for the Dashboard redesign — the Nutrition tab consumes the same component after it exists)

The only dependency on unreleased work is the `ProgressRingComponent` in the nutrition summary header. Until that component exists (Dashboard redesign sprint), the header can render linear progress bars using the `macroBarFill` pattern from the Dashboard `MacroProgressCardComponent` as a temporary fallback.
