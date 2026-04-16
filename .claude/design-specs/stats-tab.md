# UI Spec: Stats Tab in Social Profile
*Written by @uiux-designer — 2026-04-11*

---

## User Story

As a user, I want to see meaningful fitness stats on any social profile so that I can understand an athlete's consistency and progress at a glance — while being able to deep-dive into my own full metrics when viewing my own profile.

---

## UX Flow

1. User navigates to `/social/profile/:userId` — profile loads with four tabs (Posts, Workouts, Articles, Stats).
2. User clicks the Stats tab — `activeTab()` signal becomes `'stats'`.
3. `StatsTabComponent` mounts and immediately starts loading:
   - **Own profile:** reads through `DailyFacade` + `WorkoutsFacade` (already cached); aggregates streak, averages, volume, calorie history on the frontend via a `StatsHelperService`.
   - **Other profile:** calls `SocialFacade.loadPublicStats(userId)` → `GET /api/users/{userId}/stats`.
4. While loading: skeleton cards + skeleton chart blocks appear.
5. On success: stat cards animate in with `slideUp 0.35s ease-out`, charts fade in (`fadeIn 0.3s ease-out`).
6. On insufficient data (< 3 daily entries for own profile): charts replaced by empty state — other sections render normally.
7. On API error (other profile): full-tab error banner with retry CTA.

---

## Tab Bar Update

Expand `.profile-tabs` grid from 3 to 4 columns:

```css
/* social-profile.component.css — update existing rule */
.profile-tabs {
  grid-template-columns: 1fr 1fr 1fr 1fr;
}
```

The existing `@media (max-width: 640px)` rule hides `<span>` labels — icon-only tabs at 4 columns on mobile work fine.

New tab button (append after Articles tab in HTML):
```html
<button class="profile-tab-btn" [class.active]="activeTab() === 'stats'"
        (click)="setTab('stats')" type="button">
  <mat-icon>bar_chart</mat-icon>
  <span>Stats</span>
</button>
```

---

## Component: StatsTabComponent

**File:** `fit-app/src/app/features/social/social-profile/stats-tab/stats-tab.component.ts`
**Standalone:** yes
**Inputs:** `@Input() isOwnProfile: boolean`, `@Input() userId: string`
**Injected:** `SocialFacade` (public stats), `DailyFacade` + `WorkoutsFacade` (own stats only), `StatsHelperService`

---

## Screen A — Own Profile (`isOwnProfile = true`)

### Layout

```
┌─────────────────────────────────────────┐
│  Stat Cards Grid (2 × 2)                │
│  ┌──────────────┬──────────────┐        │
│  │ Active Streak│ Workouts /mo │        │
│  ├──────────────┼──────────────┤        │
│  │ Avg Calories │ Weight Δ 30d │        │
│  └──────────────┴──────────────┘        │
│                                         │
│  Chart — Daily Calories vs Target (bar) │
│                                         │
│  Chart — Weekly Volume (line)           │
│                                         │
│  Recent Workouts (list, last 5)         │
└─────────────────────────────────────────┘
```

> Note: Weight history chart is not available (DailyEntry entity does not store daily WeightKg — only current weight lives on User). Weight Δ 30d card shows the difference between current weight and the user's profile weight from 30 days ago if a snapshot exists, otherwise shows "—".

### Stat Cards — Visual Spec

**Grid:** `display: grid; grid-template-columns: 1fr 1fr; gap: 12px;`

**Each card:**
```css
background: rgba(255,255,255,0.025);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 16px;
padding: 16px 18px;
display: flex; flex-direction: column; gap: 6px;
transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
```
Hover: `transform: translateY(-4px); border-color: rgba(255,255,255,0.12); box-shadow: 0 4px 16px rgba(124,77,255,0.28);`

**Icon container:** 36×36px, `border-radius: 10px`, `mat-icon` 20px inside.
**Value:** `font-size: 26px; font-weight: 700; color: var(--white); line-height: 1;`
**Label:** `font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em;`
**Sub-caption:** `font-size: 12px; color: rgba(255,255,255,0.3); font-weight: 400;`

#### Card 1 — Active Streak
- Icon: `local_fire_department`, bg `rgba(255,152,0,0.14)`, color `#ff9800`
- Value: `{activeStreak}` | Label: "ACTIVE STREAK" | Sub: "consecutive days"

#### Card 2 — Workouts This Month
- Icon: `fitness_center`, bg `rgba(124,77,255,0.14)`, color `var(--primary)`
- Value: `{workoutsThisMonth}` | Label: "WORKOUTS" | Sub: "this month"

#### Card 3 — Avg Calories (7 days)
- Icon: `bolt`, bg `rgba(255,152,0,0.10)`, color `#ffb74d`
- Value: `{avgCaloriesLast7Days} kcal` | Label: "AVG CALORIES" | Sub: "last 7 days"
- If no calorie data: value = "—"

#### Card 4 — Weight Change (30 days)
- Icon: `trending_down` (loss) / `trending_up` (gain) / `trending_flat` (null)
- Loss: bg `rgba(74,222,128,0.10)`, color `#4ade80`
- Gain: bg `rgba(255,64,129,0.12)`, color `#ff4081`
- Null: bg `rgba(56,189,248,0.10)`, color `#38bdf8`, value "—"
- Value: `{n > 0 ? '+' : ''}{n} kg` | Label: "WEIGHT CHANGE" | Sub: "last 30 days"
- Source: `User.WeightKg` current vs. value stored 30 days ago — if unavailable show "—"

---

### Chart 1 — Daily Calories vs Target (own profile)

**Section header:** "Daily Calories" (16px/600/white) floated left. Custom HTML legend right: Calories dot `#ff4081` + Target dot `#38bdf8`.

**Chart container:**
```css
background: rgba(255,255,255,0.02);
border: 1px solid rgba(255,255,255,0.06);
border-radius: 16px;
padding: 16px 12px 10px;
```
Canvas wrapper: `position: relative; height: 200px;`

**Chart.js config (mixed):**
- "Calories" dataset: type `bar`, bg `rgba(255,64,129,0.5)`, border `#ff4081`, borderRadius 4
- "Target" dataset: type `line`, color `rgba(56,189,248,0.6)`, `borderDash: [4,4]`, no fill, point radius 0
- X-axis: show every 5th day label, `color: rgba(255,255,255,0.35)`, no axis border
- Y-axis: kcal, same color, grid lines `rgba(255,255,255,0.04)`
- Tooltip: bg `#1a1a24`, border `rgba(255,255,255,0.1)`, Poppins
- `responsive: true; maintainAspectRatio: false`
- `plugins.legend.display: false`

---

### Chart 2 — Weekly Volume (own profile)

**Section header:** "Weekly Volume" (16px/600/white). No toggle.

**Chart.js config:**
- Type: `line`
- Color: `#7c4dff`, fill gradient `rgba(124,77,255,0.18)` → `rgba(124,77,255,0)` (fill: true)
- Point radius 4 / hover 7; border width 2; tension 0.3
- Canvas height: 180px
- Tooltip: `{weekStart} — {volumeKg} kg total`
- Same axis style as Chart 1

---

### Recent Workouts (own profile)

**Section header:** "Recent Workouts" (16px/600/white).

**List:** `display: flex; flex-direction: column; gap: 8px;`

Each row: reuse `.profile-content-card` + `.profile-card-icon.workout-icon` from existing CSS. Add `.stats-volume-chip` to the right:

```css
.stats-volume-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px;
  background: rgba(124,77,255,0.12);
  border-radius: 999px;
  font-size: 11px; font-weight: 700;
  color: var(--primary);
  flex-shrink: 0;
}
```

---

## Screen B — Other Profile (`isOwnProfile = false`)

### Stat Cards Row

**Grid:** `display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;`
Same glass card style, compact: `padding: 14px`, value `font-size: 22px`.

- Card 1 — Streak: `local_fire_department` `#ff9800`
- Card 2 — Workouts: `fitness_center` `var(--primary)`
- Card 3 — Volume: `bar_chart`, bg `rgba(167,139,250,0.14)`, color `#a78bfa`. Value formatted: ≥ 1000 kg → `1.8t`

### Chart — Weekly Volume (other profile)

Identical to Chart 2 in Screen A. Data: `publicStats.weeklyVolumes`.

Privacy note below chart:
```css
.stats-privacy-note {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: rgba(255,255,255,0.25);
  margin-top: 8px;
}
```
`mat-icon lock` at 14px + "Weight and calorie data is private"

### Recent Workouts (other profile)

Same `.profile-content-card` rows. Name + date only — no volume chip.

---

## States

### Loading

**Card skeleton:**
```css
.stats-card-skeleton {
  height: 88px; border-radius: 16px;
  background: rgba(255,255,255,0.04);
  animation: pulse 1.5s ease-in-out infinite;
}
```

**Chart skeleton:**
```css
.stats-chart-skeleton {
  height: 200px; border-radius: 16px;
  background: rgba(255,255,255,0.04);
  animation: pulse 1.5s ease-in-out infinite;
}
```

**Workout row skeletons:** 3× `.profile-content-card--skeleton` (already defined).

### Empty (insufficient data)

```css
.stats-chart-empty {
  height: 160px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 10px;
  border: 1px dashed rgba(255,255,255,0.08);
  border-radius: 16px;
}
```
- `mat-icon show_chart` 36px / `rgba(255,255,255,0.18)`
- "Not enough data yet — keep logging!" — 13px / `rgba(255,255,255,0.3)`

Full tab empty (other profile, zero workouts): reuse `.profile-empty` with `mat-icon bar_chart` + "No public stats yet".

### Error (other profile only)

Reuse `.profile-error` (already in `social-profile.component.css`):
- `mat-icon error_outline` + "Could not load stats." + `.btn-ghost` retry

---

## CSS Classes Inventory

### New (in `stats-tab.component.css`)

| Class | Purpose |
|---|---|
| `.stats-tab` | Root — `flex column; gap: 20px; padding: 20px 0 80px` |
| `.stats-cards-grid-2x2` | `grid-template-columns: 1fr 1fr; gap: 12px` |
| `.stats-cards-grid-3x1` | `grid-template-columns: 1fr 1fr 1fr; gap: 12px` |
| `.stats-stat-card` | Glass card |
| `.stats-stat-icon` | 36px icon box |
| `.stats-stat-value` | 26px/700 number |
| `.stats-stat-value--negative` | `color: #4ade80` |
| `.stats-stat-value--positive` | `color: #ff4081` |
| `.stats-stat-label` | 11px/700/uppercase |
| `.stats-stat-sub` | 12px/400 sub |
| `.stats-card-skeleton` | 88px pulse skeleton |
| `.stats-chart-section` | Wrapper for one chart block |
| `.stats-chart-header` | `display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px` |
| `.stats-chart-title` | 16px/600/white |
| `.stats-chart-container` | Glass card around canvas |
| `.stats-chart-canvas-wrap` | `position: relative; height: 200px` |
| `.stats-chart-skeleton` | 200px pulse skeleton |
| `.stats-chart-empty` | Dashed empty area |
| `.stats-chart-legend` | `display: flex; gap: 12px; align-items: center` |
| `.stats-legend-item` | `display: flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(255,255,255,0.5)` |
| `.stats-legend-dot` | `width: 8px; height: 8px; border-radius: 50%` |
| `.stats-volume-chip` | Purple pill for workout volume |
| `.stats-privacy-note` | Lock + privacy text |
| `.stats-recent-section` | Recent workouts wrapper |

### Reused from `social-profile.component.css`
- `.profile-content-card`, `.profile-content-card--skeleton`
- `.profile-card-icon`, `.workout-icon`
- `.profile-card-info`, `.profile-card-title`, `.profile-card-sub`
- `.profile-empty`, `.profile-error`

### Reused from `styles.css`
- `.btn-ghost`

---

## Responsiveness

**Desktop (> 640px):** 2×2 own / 3×1 other. Chart heights 200px / 180px.

**Mobile (< 640px):**
- Own: 2×2 unchanged (scales with container width)
- Other: `grid-template-columns: 1fr 1fr`, third card `grid-column: span 2`
- Charts: 180px / 160px
- `.stats-chart-header`: `flex-wrap: wrap; gap: 8px`

---

## Accessibility

- Canvas: `role="img"` + `aria-label="Weekly volume chart, last 8 weeks"`
- Stat values: `aria-label="Active streak: 7 consecutive days"`
- Color never the sole indicator — icons reinforce weight direction
- All interactive elements ≥ 48px touch target
- Contrast: lowest meaningful text at `rgba(255,255,255,0.35)` (WCAG AA on `#0d0d10`)

---

## Notes for @angular-developer

- `StatsTabComponent` is standalone at `features/social/social-profile/stats-tab/stats-tab.component.ts`
- Wire in `social-profile.component.html` with `@if (activeTab() === 'stats')` — same pattern as existing tabs
- Update `.profile-tabs` CSS to `grid-template-columns: 1fr 1fr 1fr 1fr`
- Own profile aggregation (streak, avg calories, volume per week) in `StatsHelperService` using `computed()` from facade data
- `plugins.legend.display = false` on all Chart.js instances — use custom HTML legends
- Volume ≥ 1000 kg: display as `X.Xt`
- `takeUntilDestroyed()` for any subscriptions; prefer `computed()` signals
- Import `BaseChartDirective` from `ng2-charts` and `ChartConfiguration` from `chart.js`
