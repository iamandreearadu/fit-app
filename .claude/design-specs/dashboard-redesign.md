# UI Spec: Dashboard Redesign — NovaFit

**Author:** @uiux-designer  
**Date:** 2026-06-12  
**Status:** CANONICAL — supersedes all previous sprint specs  
**Consumed by:** @angular-developer  
**ADR:** `.claude/decisions/dashboard-redesign.md`  
**API Contract:** `.claude/contracts/dashboard-redesign.md`  
**Privacy classification:** OWNER-ONLY — all health fields private

---

## User Story

As a NovaFit user, I want to open the dashboard and understand how my day is going in under 3 seconds, log quick entries without navigating away, and feel motivated to close my remaining daily goals.

---

## UX Flow

1. User opens `/dashboard` → sticky `DashboardHeaderBarComponent` renders immediately
2. `DashboardFacade.loadDashboardToday()` fires → all data cards enter loading state (skeleton arcs and bars — no zeros)
3. API resolves → `CalorieBalanceCardComponent` ring animates from 0% to real percentage (0.6s ease-out); other cards fade in with staggered `slideUp`
4. `DashboardFacade.loadAiInsight()` fires separately (non-blocking) → `AiInsightCardComponent` fills in async; spinner shown until resolved
5. User taps the "+500 ml" quick-action chip → water value increments, ring re-animates, chip confirms inline for 1 200 ms
6. User taps "Log meal" chip or NutritionCard CTA → meal picker modal opens over the dashboard
7. User enters weight in DailyCheckinComponent and blurs the field → facade auto-saves; autosave badge confirms
8. User scrolls to bottom → `DashboardHistoryAccordionComponent` is collapsed; user taps to expand → `PreviousDailyUserDataComponent` renders inside

---

## Component Tree

```
DashboardPageComponent  (route: /dashboard)
│
├── DashboardHeaderBarComponent        sticky header — date, meta badge, avatar
│     └── StreakChipComponent          signature element — inline in header bar
│
├── CalorieBalanceCardComponent        hero card — large gradient ProgressRing
│     └── ProgressRingComponent        lg size, gradient track
│
├── QuickActionsComponent              horizontally scrollable chip strip
│
├── NutritionCardComponent             macro ProgressBars + Log Meal CTA
│     ├── ProgressBarComponent         × 3 (Protein / Carbs / Fat)
│     └── [Log Meal CTA]               opens meal picker modal
│
├── MoveBurnCardComponent              ProgressRing + quick-add activity chips
│     └── ProgressRingComponent        md size, primary track
│
├── HydrationStepsCardComponent        two ProgressRings side by side
│     ├── ProgressRingComponent        sm size, info/blue track — Water
│     └── ProgressRingComponent        sm size, success/green track — Steps
│
├── DailyCheckinComponent              weight input + energy level selector
│
├── WeeklyWorkoutCardComponent         Mon–Sun grid (existing — keep)
├── AiInsightCardComponent             AI chip (existing — keep)
└── DashboardHistoryAccordionComponent collapsed by default
      └── PreviousDailyUserDataComponent (existing — keep)

────────────────────────────────────────
Shared components (features/dashboard/shared/):

  ProgressRingComponent   reusable SVG radial ring
  ProgressBarComponent    reusable horizontal progress bar
```

---

## Design Tokens (Locked)

Only the following tokens may be used. No new hex values. No external palette.

| Purpose | Token / Value |
|---|---|
| App background | `var(--surface)` = `#0d0d10` |
| Primary interactive | `var(--primary)` = `#7c4dff` |
| Primary glow / shadow | `var(--primary-glow)` = `rgba(124,77,255,0.35)` |
| Accent / danger | `var(--accent)` = `#ff4081` |
| Accent background | `var(--accent-bg)` = `rgba(255,64,129,0.15)` |
| White text | `var(--white)` = `#ffffff` |
| White soft | `var(--white-soft)` = `rgba(255,255,255,0.85)` |
| White fade | `var(--white-fade)` = `rgba(255,255,255,0.08)` |
| Card background | `rgba(255,255,255,0.025)` |
| Card border | `1px solid rgba(255,255,255,0.08)` |
| Card hover border | `rgba(255,255,255,0.12)` |
| Card radius | `20px` |
| Card header separator | `1px solid rgba(255,255,255,0.06)` |
| Modal backdrop | `rgba(0,0,0,0.65)` + `backdrop-filter: blur(8px)` |
| Modal box | `background #0d0d10; border-radius 24px; border 1px solid rgba(255,255,255,0.1)` |
| Protein color | `#a78bfa` (light purple) |
| Carbs color | `#38bdf8` (sky blue) |
| Fat color | `#ffb74d` (orange) |
| Success / steps | `#4ade80` (green) |
| Info / water | `#38bdf8` (sky blue) |
| Skeleton block | `rgba(255,255,255,0.04)` |

**Gradient rule — restricted use only:**  
`linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)`  
Permitted on: (1) CalorieBalance hero ring track, (2) StreakChip count + flame when `current > 0`, (3) selected/active chip state backgrounds. Nowhere else.

**Nova token alias (parallel to base tokens, same values):**

| Nova token | Maps to |
|---|---|
| `--nova-surface-base` | `var(--surface)` |
| `--nova-primary` | `var(--primary)` |
| `--nova-primary-alpha-14` | `rgba(124,77,255,0.14)` |
| `--nova-glass-card-bg` | `rgba(255,255,255,0.025)` |
| `--nova-glass-card-border` | `1px solid rgba(255,255,255,0.08)` |
| `--nova-text-primary` | `var(--white)` |
| `--nova-text-secondary` | `var(--white-soft)` |
| `--nova-text-hint` | `rgba(255,255,255,0.4)` |
| `--nova-text-ghost` | `rgba(255,255,255,0.3)` |

Both forms are acceptable in implementation. Base tokens are the ground truth.

---

## Shared Component: ProgressRingComponent

**File:** `features/dashboard/shared/progress-ring/progress-ring.component.*`

**Purpose:** Reusable SVG radial ring used by CalorieBalanceCard (lg), MoveBurnCard (md), HydrationStepsCard (sm × 2).

### Inputs

| Input | Type | Description |
|---|---|---|
| `value` | `number` | Current value |
| `goal` | `number` | Target value |
| `label` | `string` | Center primary label (e.g. "970") |
| `sublabel` | `string` | Center secondary label (e.g. "kcal remaining") |
| `unit` | `string` | Unit string for aria-label |
| `size` | `'sm' \| 'md' \| 'lg'` | Ring diameter: sm=120px, md=160px, lg=200px (240px on desktop) |
| `colorMode` | `'primary' \| 'gradient' \| 'info' \| 'success'` | Track fill color |
| `loading` | `boolean` | When true renders skeleton arc |

### Size spec

| Size token | Diameter | strokeWidth | Center font |
|---|---|---|---|
| `sm` | 120px | 8px | 18px / 700 |
| `md` | 160px | 10px | 22px / 800 |
| `lg` | 200px mobile / 240px desktop | 12px | 28px / 800 + caption 13px |

### Visual spec

- Track (background arc): `rgba(255,255,255,0.06)` full circle
- Fill arc: color per `colorMode` — `var(--primary)` / gradient / `#38bdf8` / `#4ade80`
- Ring fill stroke-dashoffset animates from 0 to real value on load (see Motion section)
- Center label: white, Poppins, size per table above
- Center sublabel: `rgba(255,255,255,0.4)`, 11px / 500

### States

**Loading:** `stroke-dashoffset` shimmer animation on the fill arc — pulse between `rgba(255,255,255,0.04)` and `rgba(255,255,255,0.08)` at 1.6s infinite. Center shows two skeleton blocks (24px×4px + 48px×3px) with the same shimmer. No numbers rendered.

**Empty:** Ring rendered at 0% fill (track only, no shimmer). Center shows mat-icon (per card — see individual specs) at 28px `rgba(255,255,255,0.18)`. No number. Motivating sublabel text.

**Error:** Ring not rendered. Replaced by a compact inline error state (see card-level error specs).

### Accessibility

- `role="img"` on the SVG element
- `aria-label="[label]: [value] [unit] of [goal] [unit] goal"` — e.g. `"Calories burned: 320 kcal of 500 kcal goal"`. Color alone does not convey meaning.
- When `loading=true`: `aria-busy="true"` + `aria-label="Loading [label]"`

---

## Shared Component: ProgressBarComponent

**File:** `features/dashboard/shared/progress-bar/progress-bar.component.*`

**Purpose:** Reusable horizontal macro progress bar row — used × 3 in NutritionCard.

### Inputs

| Input | Type | Description |
|---|---|---|
| `name` | `string` | "Protein" / "Carbs" / "Fat" |
| `consumed` | `number` | Grams consumed |
| `target` | `number` | Grams target |
| `unit` | `string` | "g" |
| `colorClass` | `'protein' \| 'carbs' \| 'fat'` | Determines dot + bar fill color |
| `loading` | `boolean` | Skeleton state |

### Visual spec

Row layout (flex, align-items center, gap 10px):
- Color dot: 8px circle — protein `#a78bfa`, carbs `#38bdf8`, fat `#ffb74d`
- Name label: 13px / 600 / `rgba(255,255,255,0.7)`, flex-shrink 0, min-width 52px
- Bar: `mat-progress-bar`, flex 1, height 6px, border-radius 3px; track `rgba(255,255,255,0.08)`; fill color matches dot
- Fraction label: `[consumed]g / [target]g`, 12px / 500 / `rgba(255,255,255,0.4)`, flex-shrink 0

### States

**Loading:** Dot replaced by 8px skeleton circle shimmer. Name skeleton: 44px×10px block. Bar replaced by full-width `rgba(255,255,255,0.04)` shimmer block, 6px height. Fraction hidden.

**Empty (consumed=0):** Bar at 0%, fraction shows `0g / [target]g`. No separate empty message — the empty state is handled at the NutritionCard level.

**Error:** Bar hidden; inline `rgba(255,64,129,0.15)` background row with error icon and "–" values.

### Accessibility

- `aria-label="[name]: [consumed]g of [target]g"` on the bar element
- Do not rely on color alone — name label is always visible
- Min touch target: bar row height ≥ 48px for the entire row (vertical padding compensates the 6px bar)

---

## Component: DashboardHeaderBarComponent

**File:** `features/dashboard/dashboard-header-bar/dashboard-header-bar.component.*`  
**Status:** Existing — confirm token alignment only.

### Layout

- `position: sticky; top: 0; z-index: 100`
- Background: `rgba(13,13,16,0.92)` + `backdrop-filter: blur(12px)` — glassmorphism sticky bar
- Height: 56px
- Flex row: `[date + statusBadge] [flex-spacer] [StreakChip] [avatar]`

### Content

- **Date:** formatted as "Friday, Jun 12" — 14px / 600 / `rgba(255,255,255,0.7)`
- **Status badge:** `.pill` — MAINTENANCE → `rgba(56,189,248,0.1)` bg / `#38bdf8` text; CUTTING → `rgba(255,64,129,0.12)` bg / `#ff4081` text; BULKING → `rgba(74,222,128,0.1)` bg / `#4ade80` text — 10px / 700 / UPPERCASE / letter-spacing 0.05em
- **StreakChip:** inline to the right of the spacer (see StreakChipComponent spec)
- **Avatar:** 32px circle, from user store

### Data source

`dashboardToday()?.meta` (`date`, `statusBadge`)

---

## Component: StreakChipComponent

**Signature element — highest retention mechanic.**  
**File:** `features/dashboard/streak-chip/streak-chip.component.*` (may already exist as `streak-badge` — reconcile)

### Layout

Inline pill, height 32px, border-radius 999px, min touch target 48×48px with outer padding.

```
[🔥 icon] [current count] [day streak] [separator ·] [Best: Xd]
```

### Visual spec

**Active state** (`current > 0`):
- Flame icon: `mat-icon` "local_fire_department", 18px, gradient color fill (primary→accent via CSS gradient mask technique or simply `var(--accent)` if gradient mask is not supported)
- Count: 24px / 800 — text uses gradient `linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)` via `-webkit-background-clip: text; -webkit-text-fill-color: transparent`
- "day streak" label: 13px / 500 / `rgba(255,255,255,0.5)`
- Separator: `rgba(255,255,255,0.15)`
- Best: "Best: [X]d" — 11px / 600 / `rgba(255,255,255,0.35)`
- Container: `background: rgba(124,77,255,0.10); border: 1px solid rgba(124,77,255,0.25); border-radius: 999px; padding: 4px 12px`
- Pulse animation on the flame when `current > 0` and `loggedToday === true` — use existing `pulse` keyframe, `animation: pulse 2s ease-in-out infinite`

**Inactive state** (`current === 0`):
- Flame icon: `rgba(255,255,255,0.2)` — no color, no gradient
- Text: "Start your streak" — 12px / 500 / `rgba(255,255,255,0.4)`
- Best row hidden
- Container: `background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08)`

### States

**Loading:** Skeleton pill — 100px × 28px shimmer block.

**Empty (current=0):** Inactive state as above. This IS the empty state — no separate empty block needed.

**Error:** Hidden silently — streak display is non-critical; don't show an error state for this chip.

### Data source

`dashboardToday()?.streak` (`current`, `best`)

### Accessibility

- `role="status"` — screen reader announced on update
- `aria-label="[current] day streak. Personal best: [best] days"` when active; `"No active streak"` when inactive
- Meets 48×48px touch target via container padding

---

## Component: QuickActionsComponent

**File:** `features/dashboard/quick-actions/quick-actions.component.*`  
**Status:** Existing (`quick-actions-strip`) — rename to align if needed.

### Layout

- Full-width horizontal scrollable row, height 56px, `overflow-x: auto; scrollbar-width: none`
- Gap: 8px between chips, padding: `0 16px`
- `align-items: center`

### Chips specification

| Chip | Icon | Label | Action | Disabled when |
|---|---|---|---|---|
| Water | `water_drop` | `+500 ml` | `facade.adjustWaterMl(500)` + inline confirm | — |
| Meal | `restaurant` | `Log meal` | emit `(openMealPicker)` | — |
| AI Analyze | `auto_awesome` | `AI analyze` | navigate to `/user-dashboard/analyze-meal` | route transition |
| Activity | dynamic | current activity label | emit `(openActivityPicker)` | — |
| Reset | `restart_alt` | `Reset day` | emit `(reset)` → confirm dialog | — |

### Visual spec (chip)

- Height: 40px; min-width: 48px; padding: `0 14px`
- Border: `1.5px dashed rgba(124,77,255,0.35)`
- Border-radius: 10px
- Background: transparent
- Color: `rgba(124,77,255,0.8)` — Poppins 13px / 600
- Icon: 18px / 18px / same color
- Hover: `background rgba(124,77,255,0.08); border-color rgba(124,77,255,0.6); translateY(-1px)` — 0.15s ease
- Disabled: `opacity 0.45; cursor not-allowed`
- Confirming (water chip): border becomes `1.5px solid #38bdf8` (solid, info color); label shows "+500ml ✓" for 1 200 ms then reverts

### States

**Loading (dashboard loading):** All chips render but are `pointer-events: none; opacity: 0.5` until `isDashboardLoading()` resolves.

**Error:** Chips remain visible. Non-blocking — the strip is independent of data state.

### Accessibility

- Each chip: `type="button"`, `aria-label` = full descriptive text (e.g. "Add 500 millilitres of water")
- Water confirming state: `aria-live="polite"` region for the confirmation text
- Touch target: chip height 40px + `min-height: 48px` via surrounding padding on the scroll container

---

## Component: CalorieBalanceCardComponent

**Hero card — the answer to "how is my day going?"**  
**File:** `features/dashboard/calorie-balance-card/calorie-balance-card.component.*`

### Layout

Full-width card, always `section-full`, `animation-delay: 0ms`.

Structure (flex column, gap 0):
```
[card-hdr: "Calorie Balance" + statusBadge + onTrack indicator]
[body:
   [eaten tile] — [ProgressRing lg, gradient] — [burned tile]
   [net row: "Net [value] kcal" pill]
   [remaining callout: "You have [X] kcal remaining"]
]
```

### Visual spec — card body

**ProgressRing** (center, lg):
- Size: 200px mobile / 240px desktop
- colorMode: `gradient` (`linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)`)
- `value`: `calorieBalance.net`, `goal`: `calorieBalance.goal`
- percentage: `Math.min(100, Math.round((net / goal) * 100))`
- Center label: `calorieBalance.remaining` — 28px / 800 / white
- Center sublabel: "kcal remaining" — 12px / `rgba(255,255,255,0.4)`
- When `onTrack === false` (over goal): center label shows overage, sublabel "kcal over goal"; fill arc switches to `var(--accent)` override (gradient only when on track)

**Eaten tile** (left of ring):
- `eaten` value: 20px / 800 / white
- "Eaten" label: 11px / 700 / UPPERCASE / `rgba(255,255,255,0.35)` / letter-spacing 0.05em
- Icon: `restaurant` 16px `rgba(255,255,255,0.3)`

**Burned tile** (right of ring):
- `burned` value: 20px / 800 / white
- "Burned" label: same treatment as eaten
- Icon: `local_fire_department` 16px `rgba(255,64,129,0.6)`

**Net row:**
- Pill: `background rgba(255,255,255,0.06); border-radius 999px; padding 6px 14px`
- Text: "Net [net] kcal" — 13px / 600 / `rgba(255,255,255,0.7)`
- When `onTrack`: prepend `mat-icon` "check_circle" 14px `#4ade80`
- When over goal: prepend `mat-icon` "warning" 14px `var(--accent)`

**Remaining callout:**
- 14px / 500 / `rgba(255,255,255,0.5)` — centered below net row
- When `onTrack`: "You have [remaining] kcal remaining today"
- When over goal: "You're [overage] kcal over your goal" in `rgba(255,64,129,0.8)`

### card-hdr

Use `.card-hdr` pattern:
- Icon container (40px, border-radius 12px, `background rgba(124,77,255,0.14)`): `mat-icon` "donut_large"
- Title: "Calorie Balance" — 17px / 800 / white
- Subtitle: today's date string — 12px / `rgba(255,255,255,0.4)`

### States

**Loading:**
- All three tiles replaced by shimmer blocks:
  - Eaten/Burned tiles: 40px × 40px rectangle skeletons
  - ProgressRing: `loading=true` prop → shimmer arc (see ProgressRingComponent)
  - Net row: 120px × 24px skeleton pill
  - Remaining callout: 180px × 14px skeleton line
- No numbers rendered. Label "Calorie Balance" in header still visible.

**Empty** (`eaten === 0 AND burned === 0`):
- Ring renders at 0% fill (track only — `rgba(255,255,255,0.06)` arc)
- Center: `mat-icon` "restaurant" at 40px / `rgba(255,255,255,0.18)`
- Below icon: "Ready to fuel your day?" — 15px / `rgba(255,255,255,0.35)`
- CTA button: "Log your first meal" — `.btn-primary` — emits `(openMealPicker)`
- Eaten/Burned tiles hidden in empty state (not rendered as zeros)
- Net row hidden

**Error:**
- Full card body replaced by compact error strip: `background rgba(255,64,129,0.08); border 1px solid rgba(255,64,129,0.15); border-radius 12px; padding 12px 16px`
- `mat-icon` "error_outline" `var(--accent)` 18px inline + "Couldn't load calorie data" 14px `rgba(255,255,255,0.7)`
- Ghost button "Retry" — right-aligned — emits `(retry)` → `facade.loadDashboardToday()`

### Data source

`dashboardToday()?.calorieBalance` (`eaten`, `burned`, `goal`, `net`, `remaining`, `onTrack`)

### Privacy

`calorieBalance.goal` is derived from the user's BMR/TDEE. **Never expose on social, discover, or public profile endpoints.** Dashboard only.

### Accessibility

- Ring: `aria-label="Calorie balance: [net] kcal consumed of [goal] kcal goal"` — see ProgressRingComponent
- Net pill: `aria-live="polite"` — updates when values change after logging
- Contrast: all text values use white / white-soft against the dark card background — WCAG AA minimum

---

## Component: NutritionCardComponent

**File:** `features/dashboard/nutrition-card/nutrition-card.component.*`

### Layout

Full-width card, `section-full`, `animation-delay: 180ms`.

Structure:
```
[card-hdr: "Nutrition" + "Log meal" ghost button]
[body:
  [ProgressBar row × 3: Protein / Carbs / Fat]
  [divider]
  [total kcal row: "Total: [eaten] kcal logged"]
  [Log meal CTA button — full-width, dashed style]
]
```

### card-hdr

- Icon container: `mat-icon` "restaurant_menu", `rgba(74,222,128,0.10)` bg, `#4ade80` color
- Title: "Nutrition" — 17px / 800 / white
- Subtitle: "Today's macros" — 12px / `rgba(255,255,255,0.4)`
- Right side: ghost button "Log meal" — `border: 1px solid rgba(255,255,255,0.14); border-radius 12px; padding 6px 14px; font-size 12px / 600` — emits `(openMealPicker)`

### Body

Three `ProgressBarComponent` rows:

| Row | colorClass | color |
|---|---|---|
| Protein | `protein` | `#a78bfa` |
| Carbs | `carbs` | `#38bdf8` |
| Fat | `fat` | `#ffb74d` |

Total kcal row: `rgba(255,255,255,0.04)` background strip, 10px top/bottom padding; "Total logged: [eaten] kcal" — 13px / 500 / `rgba(255,255,255,0.5)`. Hidden in empty state.

Log meal CTA (`.btn-add-ex` pattern): `border: 1.5px dashed rgba(124,77,255,0.35); border-radius 10px; color rgba(124,77,255,0.8); height 44px; width 100%` — "＋ Log a meal" — 14px / 600.

### States

**Loading:** All 3 ProgressBar rows in `loading=true` state (skeleton rows). CTA button hidden. Header visible.

**Empty** (`macros.every(m => m.consumed === 0)`):
- Macro bars render at 0% fill showing targets (e.g. "0g / 158g") — this is intentional: the target numbers give context for what to aim for
- Below bars: empty-state strip with `mat-icon` "add_circle_outline" 24px `rgba(124,77,255,0.5)` + "Log your first meal to track macros" 13px `rgba(255,255,255,0.35)` — do NOT show zeros in the bar fill
- CTA button visible and prominent

**Error:** Compact error strip below header (same pattern as CalorieBalance error) + Retry button.

### Data source

`dashboardToday()?.macros` (array of 3: Protein, Carbs, Fat)  
`dashboardToday()?.calorieBalance.eaten` (for total kcal row)

### Privacy

`macros[].target` is derived from `GoalCalories`. **Never expose macro targets on social or public endpoints.**

### Accessibility

- Each ProgressBar row: see ProgressBarComponent spec
- "Log meal" ghost button: `aria-label="Log a meal to track nutrition"`
- CTA add button: `aria-label="Log a meal"`

---

## Component: MoveBurnCardComponent

**File:** `features/dashboard/move-burn-card/move-burn-card.component.*`

### Layout

On desktop: left card of a 2-column row alongside `HydrationStepsCardComponent`.  
On mobile: full-width, `animation-delay: 240ms`.

Structure:
```
[card-hdr: "Move & Burn"]
[body:
  [ProgressRing md — center]
  [quick-add activity chip strip]
]
```

### card-hdr

- Icon container: `mat-icon` "directions_run", `rgba(255,64,129,0.12)` bg, `var(--accent)` color
- Title: "Move & Burn" — 17px / 800 / white
- Subtitle: "[value] of [goal] kcal burned" — 12px / `rgba(255,255,255,0.4)`

### Body

**ProgressRing** (md, primary color):
- `value`: `burned.value`, `goal`: `burned.goal`
- Center label: `[value]` — 22px / 800 / white
- Center sublabel: "kcal burned" — 11px / `rgba(255,255,255,0.4)`
- Below ring: small ghost text "Goal: [goal] kcal" — 11px / `rgba(255,255,255,0.3)`

**Activity quick-add chips** (horizontal scroll strip, same `.qa-chip` spec as QuickActions):
- Each chip: activity icon + label — emit `(openActivityPicker)`
- Examples: 🏃 Running, 💪 Strength, 🚴 Cycling
- These are contextual shortcuts, not full activity logging

### States

**Loading:** ProgressRing in `loading=true` state. Activity chips render as 3 skeleton pill blocks (60px × 28px). Header visible.

**Empty** (`burned.value === 0`):
- Ring at 0% fill, center: `mat-icon` "directions_walk" 32px `rgba(255,255,255,0.18)`
- Center sublabel: "No activity yet" — 12px / `rgba(255,255,255,0.35)`
- Activity chips visible and actionable as CTA
- Below ring: "Track an activity to see your burn" — 13px / `rgba(255,255,255,0.3)`

**Error:** Compact error strip + Retry.

### Data source

`dashboardToday()?.burned` (`value`, `goal`, `unit: "kcal"`)

### Privacy

`burned.goal` is derived from `GoalCalories × 0.15`. **Never expose on social endpoints.**

### Accessibility

- Ring: `aria-label="Calories burned: [value] kcal of [goal] kcal goal"`
- Activity chips: each has `aria-label` matching the activity name

---

## Component: HydrationStepsCardComponent

**File:** `features/dashboard/hydration-steps-card/hydration-steps-card.component.*`

### Layout

On desktop: right card of the 2-column row alongside `MoveBurnCardComponent`, `animation-delay: 300ms`.  
On mobile: full-width, below MoveBurnCard.

Structure:
```
[card-hdr: "Hydration & Steps"]
[body: 2-column symmetric grid]
  [Left: Water ProgressRing sm] | [Right: Steps ProgressRing sm]
  [+250ml / +500ml chips]       | [+500 / +1 000 chips]
```

### card-hdr

- Icon container: `mat-icon` "water_drop", `rgba(56,189,248,0.12)` bg, `#38bdf8` color
- Title: "Hydration & Steps" — 17px / 800 / white
- Subtitle: "[water_value] ml · [steps_value] steps" — 12px / `rgba(255,255,255,0.4)` — updates reactively

### Water ring (sm, info/blue)

- `value`: `water.value` (ml), `goal`: `water.goal` (ml)
- Center label: formatted — if value ≥ 1000 show "[value/1000]L" else "[value]ml" — 18px / 700
- Center sublabel: "of [goal/1000]L goal" — 10px / `rgba(255,255,255,0.4)`
- Below ring: two `.qa-chip` mini-chips "+250 ml" and "+500 ml" — emit `facade.adjustWaterMl(250)` and `facade.adjustWaterMl(500)`
- When `value >= goal`: center sublabel becomes "Goal reached! 💧" in `#38bdf8`; ring fill completes with a brief scale pulse

### Steps ring (sm, success/green)

- `value`: `steps.value`, `goal`: `steps.goal`
- Center label: formatted with commas — e.g. "6,200" — 18px / 700
- Center sublabel: "of [goal/1000]k steps" — 10px / `rgba(255,255,255,0.4)`
- Below ring: two `.qa-chip` mini-chips "+500" and "+1 000" — emit `facade.adjustSteps(500)` and `facade.adjustSteps(1000)`
- When `value >= goal`: same completion treatment as water, color `#4ade80`

### States

**Loading:** Both rings in `loading=true`. Chip strips hidden. Header visible.

**Empty — Water** (`water.value === 0`):
- Ring at 0% fill, center: `mat-icon` "water_drop" 28px `rgba(56,189,248,0.25)`
- Sublabel: "Drink your first glass" — 11px / `rgba(255,255,255,0.35)`
- Quick-add chips still visible — they ARE the CTA

**Empty — Steps** (`steps.value === 0`):
- Ring at 0% fill, center: `mat-icon` "directions_walk" 28px `rgba(74,222,128,0.25)`
- Sublabel: "Start moving" — 11px / `rgba(255,255,255,0.35)`
- Quick-add chips still visible

**Error:** Compact error strip across full card body + Retry.

### Data sources

- `dashboardToday()?.water` (`value`, `goal`, `unit: "ml"`)
- `dashboardToday()?.steps` (`value`, `goal`, `unit: "steps"`)

### Privacy

`water.goal` is derived from the user's body weight (`weight × 0.033`). **Never expose on social endpoints.**

### Accessibility

- Water ring: `aria-label="Water intake: [value] millilitres of [goal] millilitres goal"`
- Steps ring: `aria-label="Steps: [value] of [goal] steps goal"`
- Quick-add chips: `aria-label="Add [amount] millilitres of water"` / `"Add [amount] steps"`
- Completion state: `aria-live="polite"` announces "Water goal reached!" / "Steps goal reached!"

---

## Component: DailyCheckinComponent

**File:** `features/dashboard/daily-checkin/daily-checkin.component.*`

### Layout

Full-width card, `section-full`, `animation-delay: 360ms`.

Structure:
```
[card-hdr: "Daily Check-in"]
[body:
  [weight input row]
  [divider]
  [energy level row: 5 emoji buttons]
  [autosave badge]
]
```

### card-hdr

- Icon container: `mat-icon` "fact_check", `rgba(124,77,255,0.14)` bg, `#a78bfa` color
- Title: "Daily Check-in" — 17px / 800 / white
- Subtitle: "Weight & energy level" — 12px / `rgba(255,255,255,0.4)`

### Body

**Weight input row:**
- Label: "Today's weight" — 13px / 600 / `rgba(255,255,255,0.6)`
- `mat-form-field` `appearance="outline"`, `type="number"`, suffix "kg", placeholder "e.g. 72.5"
- Input height: 48px (enforced — gym touch target)
- The field pre-fills from `checkIn.weightKg` if not null; otherwise placeholder shown
- On blur → facade auto-saves; autosave badge visible for 2s

**Divider:** `1px solid rgba(255,255,255,0.06)`

**Energy level row:**
- Label: "How are you feeling?" — 13px / 600 / `rgba(255,255,255,0.6)`
- 5 buttons in a flex row, gap 8px, each: 48×48px min, border-radius 12px
- Unselected: `background rgba(255,255,255,0.04); border 1px solid rgba(255,255,255,0.08)`
- Selected: `background rgba(124,77,255,0.14); border 1px solid rgba(124,77,255,0.3)`
- Emoji buttons: 😴(1) · 😕(2) · 😐(3) · 🙂(4) · 🤩(5)
- Emoji size: 22px; button label below emoji (optional): small text "1"–"5" at 10px `rgba(255,255,255,0.3)`
- Pre-selects `checkIn.energyLevel` if not null

**Autosave badge** (`.save-badge` existing pattern):
- Saving: spinner 14px + "Saving..." `rgba(255,255,255,0.5)`
- Saved: check icon `#4ade80` + "Saved" — fades after 2s
- Error: warning icon `var(--accent)` + "Save failed"

### States

**Loading:** Weight input skeleton (full-width, 48px height, shimmer). Energy row: 5 skeleton square blocks 48×48px shimmer. Header visible.

**Empty** (`checkIn.weightKg === null AND checkIn.energyLevel === null`):
- Both inputs render normally, pre-filled with placeholder only
- Below the form: soft motivational nudge strip — `rgba(124,77,255,0.06)` bg; `mat-icon` "star_border" 16px `rgba(124,77,255,0.4)` inline + "Log your weight and energy to track progress over time" 13px `rgba(255,255,255,0.35)` — this is informational only, NOT a blocking empty state

**Error (save failure):** Inline autosave badge shows error state (see above). The form remains usable.

### Data source

`dashboardToday()?.checkIn` (`weightKg`, `energyLevel`)

### Privacy — Critical

`checkIn.weightKg` is the user's body weight. **This field MUST NEVER appear on any social, discover, or public profile endpoint. It is scoped exclusively to the authenticated owner's dashboard view.**

### Accessibility

- Weight input: `aria-label="Today's weight in kilograms"`, associated `<label>` element (not placeholder-only)
- Energy buttons: `role="radiogroup"` on the container; each button `role="radio"` with `aria-checked` and `aria-label="Energy level [N] - [emoji description]"` (e.g. "Energy level 4 - Feeling good")
- Autosave badge: `aria-live="polite"` region
- Min touch target: 48×48px enforced on all interactive elements

---

## Page Layout & Grid

**File:** `features/dashboard/dashboard-page.component.css`

### Grid system

```
.dashboard-page           background var(--surface); min-height 100vh; padding-bottom 64px
.dashboard-grid           flex-direction column; gap 16px; padding 0 16px

@media (min-width: 768px)
  .dashboard-grid         grid, grid-template-columns 1fr 1fr; gap 16px; padding 0 24px

.section-full             grid-column 1 / -1
```

### Section order and stagger

| # | Component | Grid class | animation-delay |
|---|---|---|---|
| A | DashboardHeaderBarComponent | outside grid (sticky) | — |
| B | CalorieBalanceCardComponent | `section-full` | 0ms |
| C | QuickActionsComponent | `section-full` | 60ms |
| D | NutritionCardComponent | `section-full` | 120ms |
| E | MoveBurnCardComponent | *(no section-full)* — left col | 180ms |
| F | HydrationStepsCardComponent | *(no section-full)* — right col | 240ms |
| G | DailyCheckinComponent | `section-full` | 300ms |
| H | WeeklyWorkoutCardComponent | *(no section-full)* — left col | 360ms |
| I | AiInsightCardComponent | *(no section-full)* — right col | 420ms |
| J | DashboardHistoryAccordionComponent | `section-full` | 480ms |

On mobile all sections are full-width single column in this order.

---

## Motion Spec

### Page entrance

All `.dashboard-grid > *` animate in with `slideUp` (existing keyframe — do NOT redefine):
```
opacity: 0 → 1; translateY: 18px → 0; duration: 0.35s; easing: ease-out
```
Each section offset by the `animation-delay` defined in the table above.

**Reduced motion:** Wrap all transition/animation declarations in `@media (prefers-reduced-motion: no-preference)`. When the preference is `reduce`, sections render instantly at full opacity with no translate — no slideUp, no ring fill animation, no bounce.

### Ring fill animation

On data resolution (`isDashboardLoading()` → false):
```
SVG stroke-dashoffset: circumference → (1 - pct) × circumference
duration: 0.6s; easing: ease-out; delay: 0.1s after loading false
```
Only fires once per page load, not on every signal update.

### Card hover

```
transform: translateY(-4px); border-color: rgba(255,255,255,0.12); 0.2s ease
```

### Button hover

```
transform: translateY(-1px); opacity: 0.85; 0.15s ease
```

### Chip confirm (water / steps)

```
border transitions to solid info/success color; label text cross-fades; duration: 0.15s
After 1 200ms: reverts to dashed primary border; 0.15s
```

### Streak pulse

```
animation: pulse 2s ease-in-out infinite  (existing keyframe)
Applied to flame icon when current > 0 AND loggedToday === true
```

---

## Accessibility — Full Page

| Requirement | Implementation |
|---|---|
| Touch targets ≥ 48×48px | Enforced on all interactive elements (chips, buttons, energy selectors, ring quick-add). Padding compensates where visual size is smaller. |
| Spacing ≥ 8px between targets | Gap on all chip strips: `8px` minimum |
| Focus ring | All focusable elements: `outline: 2px solid var(--primary); outline-offset: 2px` — never `outline: none` without replacement |
| Color-only information | Every ring and bar includes an `aria-label` with value + target. Status badge has text label, not just color. Energy buttons have `aria-label` with description. |
| Heading hierarchy | Section headings use `h2` semantics inside `role="region"` containers |
| Screen reader regions | Each card: `role="region"` + `aria-labelledby` pointing to the card title |
| Live regions | Net calories, water/steps completion, autosave badge, streak update — all `aria-live="polite"` |
| Keyboard navigation | Tab order follows visual reading order top-to-bottom, left-to-right |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` disables all `slideUp`, ring-fill animation, pulse, and hover transitions |
| WCAG AA contrast | Minimum 4.5:1 for body text; 3:1 for large text (28px+). All chip labels, ring center labels, and bar fraction text verified against `#0d0d10` background |
| No placeholder-only labels | All inputs have associated `<label>` elements |

---

## Responsiveness

### Desktop (≥ 768px)

- 2-column grid active
- CalorieBalance hero ring: 240px diameter
- MoveBurn + HydrationSteps: side by side (left / right columns)
- WeeklyWorkout + AiInsight: side by side
- All other sections: `section-full` (both columns)
- StreakChip: inline in sticky header

### Tablet (< 968px)

- 2-column grid active
- CalorieBalance ring: 200px
- Chips in QuickActions: ensure horizontal scroll does not clip

### Mobile (< 640px)

- Single-column layout
- All sections full-width
- Modals (meal picker, calorie balance, activity picker): bottom sheets — `border-radius: 24px 24px 0 0; max-height: 88dvh`. AI meal analysis is a dedicated full-screen route and must not use a bottom sheet.
- CalorieBalance ring: 180px
- Energy selector 5 buttons: stretch to fill width (`justify-content: space-between`)
- QuickActions strip: `-webkit-overflow-scrolling: touch`

### Smallest (< 480px)

- Card padding reduced to 14px
- ProgressBar fraction label hidden (bar only with ARIA label)
- Eaten/Burned tiles in CalorieBalance stack vertically above/below the ring

---

## Privacy Note — Mandatory Enforcement

The following data surfaced on the dashboard contains **private health information** scoped exclusively to the authenticated owner:

| Field path | Data | Restriction |
|---|---|---|
| `checkIn.weightKg` | User body weight (kg) | Owner only — never social/profile/discover |
| `calorieBalance.goal` | Daily calorie goal (from BMR/TDEE) | Owner only |
| `macros[].target` | Macro gram targets (from GoalCalories) | Owner only |
| `burned.goal` | Daily burn target (from GoalCalories) | Owner only |
| `water.goal` | Water target (derived from body weight) | Owner only |

These values **must not appear in** `SocialService`, `SocialController`, any public profile endpoint, `POST` responses, or any component visible when `profileId !== currentUserId`. If a future feature requires displaying any of these publicly, a separate privacy-reviewed DTO with explicit user opt-in must be created first.

The `DashboardTodayDto` is response-typed to the authenticated user's JWT `sub` claim. No date parameter, no user ID parameter — the backend extracts identity from the token only.

---

## Angular Material Components

| Component | Used by |
|---|---|
| `mat-spinner` | AI insight loading, chip disabled state |
| `mat-icon` | All icons throughout — never emoji for functional icons |
| `mat-progress-bar` | ProgressBarComponent (macro bars) |
| `mat-form-field` `appearance="outline"` | Weight input in DailyCheckinComponent |
| `mat-button` / `mat-stroked-button` | All ghost buttons and CTAs |
| `mat-ripple` | Energy level selector buttons |

---

## CSS Classes to Reuse (from styles.css)

- `.btn-primary` — primary filled action buttons
- `.btn-ghost` — ghost/outline buttons
- `.btn-add-ex` / `.btn-add` — dashed-border add/CTA buttons (reuse for "Log meal" CTA)
- `.card-hdr` — card header pattern (icon container + title + subtitle)
- `.card-hdr-icon` — 40px icon container, 12px radius, primary-alpha bg
- `.pill` — standard pill badge (status badge, net row)
- `.pill-subtle` — lower-opacity pill variant
- `.empty` — standard empty state pattern (icon + message block)
- `.loader-overlay` — full-card loading overlay with spinner
- `.save-badge`, `.sb-saving`, `.sb-saved`, `.sb-error` — autosave badge states
- `.qa-chip` — quick-action chip (reuse across QuickActions and HydrationSteps mini-chips)
- `.qa-chip--confirming` — confirmation state variant

**New classes (define in component CSS, not globally):**
- `.progress-ring-lg / -md / -sm` — size variants for ProgressRingComponent
- `.calorie-hero-body` — flex layout container for ring + stat tiles
- `.eaten-tile / .burned-tile` — flanking stat tiles in CalorieBalanceCard
- `.energy-btn / .energy-btn--selected` — energy level selector buttons
- `.checkin-nudge` — informational empty strip in DailyCheckinComponent
- `.hydration-steps-grid` — 2-column symmetric layout inside HydrationStepsCard

---

## Data Wiring Summary

**Single call in `ngOnInit()`:**  
`this.dashFacade.loadDashboardToday()` → populates `dashboardToday()` signal → all cards bind reactively  
`this.dashFacade.loadAiInsight()` → separate async call → AiInsightCard fills in independently

**Component → DTO path:**

| Component | Signal path |
|---|---|
| DashboardHeaderBar | `dashboardToday()?.meta` |
| StreakChip | `dashboardToday()?.streak` |
| CalorieBalanceCard | `dashboardToday()?.calorieBalance` |
| NutritionCard | `dashboardToday()?.macros`, `?.calorieBalance.eaten` |
| MoveBurnCard | `dashboardToday()?.burned` |
| HydrationStepsCard | `dashboardToday()?.water`, `?.steps` |
| DailyCheckinCard | `dashboardToday()?.checkIn` |
| WeeklyWorkoutCard | `dashboardToday()?.weeklyWorkouts` |
| AiInsightCard | `dashFacade.aiInsight()` (separate signal) |

**Loading state signal:** `dashFacade.isDashboardLoading()` → passed as `[loading]` input to all cards  
**Error state signal:** `dashFacade.dashboardError()` → each card renders error state when non-null

---

## Files to Create / Modify

| File | Action | Notes |
|---|---|---|
| `features/dashboard/shared/progress-ring/progress-ring.component.*` | CREATE | Shared reusable SVG ring |
| `features/dashboard/shared/progress-bar/progress-bar.component.*` | CREATE | Shared reusable bar row |
| `features/dashboard/streak-chip/streak-chip.component.*` | CREATE or REPLACE | Signature element — full spec above |
| `features/dashboard/calorie-balance-card/calorie-balance-card.component.*` | MODIFY | Exists — align to this spec; add empty/error states |
| `features/dashboard/quick-actions/quick-actions.component.*` | KEEP (rename from quick-actions-strip if needed) | Token-aligned already |
| `features/dashboard/nutrition-card/nutrition-card.component.*` | CREATE or REFACTOR from macro-progress-card | New layout with ProgressBarComponent |
| `features/dashboard/move-burn-card/move-burn-card.component.*` | CREATE | Ring + activity chips |
| `features/dashboard/hydration-steps-card/hydration-steps-card.component.*` | CREATE or REFACTOR from existing daily-user-data water/steps cards | Two rings side by side |
| `features/dashboard/daily-checkin/daily-checkin.component.*` | CREATE or REFACTOR from existing energy/weight cards | Weight + energy |
| `features/dashboard/dashboard-page.component.html` | MODIFY | New grid order per section table |
| `features/dashboard/dashboard-page.component.css` | MODIFY | New grid CSS |
| `core/facade/dashboard.facade.ts` | MODIFY | Remove 4 computed target signals; use DTO targets |
| `core/models/dashboard.model.ts` | MODIFY | New DTO interfaces per contract |
| `api/dashboard.service.ts` | MODIFY | Return type to new DashboardTodayDto |
