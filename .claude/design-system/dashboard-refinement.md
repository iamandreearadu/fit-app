# Dashboard Visual Refinement Spec

Derived from: `.claude/ux-audits/dashboard-visual-audit.md`

---

## Card Tier System

### TIER 1 — Hero (`RingsHeroComponent` only)
- No card background, no border, no box-shadow
- The rings float directly on `--nova-surface-base`
- Padding: `24px 0` (vertical breathing room only)
- On mobile ≤640px: remove `border-radius: 0; border-left: none; border-right: none` override — no longer needed as there is no border

### TIER 2 — Primary Data (`MacroProgressCardComponent`, `WeeklyWorkoutCardComponent`)
- `background: var(--nova-card-tier2-bg)` → `rgba(255,255,255,0.03)`
- `border: var(--nova-card-tier2-border)` → `1px solid rgba(255,255,255,0.06)`
- `border-radius: var(--nova-card-tier2-radius)` → `20px`
- `padding: 20px 20px 16px`
- No `box-shadow`

### TIER 3 — Secondary (`QuickActionsStripComponent`, `AiInsightCardComponent`, `RecentActivityFeedComponent`, `QuickStatsRowComponent`, `DashboardHistoryAccordionComponent`)
- `background: var(--nova-card-tier3-bg)` → `rgba(255,255,255,0.018)`
- `border: var(--nova-card-tier3-border)` → `1px solid rgba(255,255,255,0.04)`
- `border-radius: var(--nova-card-tier3-radius)` → `16px`
- `padding: 16px`

---

## New CSS Custom Properties (add to `styles.css :root`)

```css
--nova-card-tier2-bg:      rgba(255,255,255,0.03);
--nova-card-tier2-border:  1px solid rgba(255,255,255,0.06);
--nova-card-tier2-radius:  20px;
--nova-card-tier3-bg:      rgba(255,255,255,0.018);
--nova-card-tier3-border:  1px solid rgba(255,255,255,0.04);
--nova-card-tier3-radius:  16px;
--nova-dash-title-size:    15px;
--nova-dash-label-size:    11px;
--nova-dash-metric-primary:   28px;
--nova-dash-metric-secondary: 18px;
```

---

## Typography Refinement Rules

| Element | Size | Weight | Color | Extras |
|---------|------|--------|-------|--------|
| Card title | `var(--nova-dash-title-size)` = 15px | 600 | `--nova-text-primary` | — |
| Section label / subtitle | `var(--nova-dash-label-size)` = 11px | 500 | `--nova-text-hint` | `letter-spacing: 0.06em`, `text-transform: uppercase` |
| Primary metric value | `var(--nova-dash-metric-primary)` = 28px | 700 | `#fff` (use `--nova-text-primary`) | — |
| Secondary metric value | `var(--nova-dash-metric-secondary)` = 18px | 600 | `--nova-text-primary` | — |
| Supporting label | 12px | 400 | `--nova-text-hint` | — |

---

## Spacing Rules

- Gap between page sections: `16px` (keep `.page-content { gap: 16px }`)
- Horizontal padding: `var(--nova-space-5)` (20px) on each side — apply at `.page-content` level via `padding: 0 var(--nova-space-5)`; remove per-card horizontal padding drift
- Card header separator: none — remove any `border-bottom` on card headers; use margin/gap instead
- Internal card content gap: `12px` (`var(--nova-space-3)`)
- Remove `app-dashboard + app-rings-hero { margin-top: -4px }` — rings hero needs free breathing room

---

## Progress Elements

### Macro Bars
- Height: `6px`
- Track: `rgba(255,255,255,0.06)` (already `var(--nova-white-alpha-06)` in macro card — keep)
- Border-radius: `3px` (pill)
- Fill transition: `width 0.5s cubic-bezier(0.4, 0, 0.2, 1)` (Material standard easing)
- No `box-shadow` on bars — remove `macroNearPulse` box-shadow effect (keep pulse keyframe animation but remove the box-shadow within it)

### Progress Rings (`ProgressRingComponent`)
- Track stroke-opacity: `0.08` — change `stroke-opacity="0.12"` → `stroke-opacity="0.08"` in template
- Stroke-width by size (TypeScript getter — already controlled in TS): `sm=3`, `md=4`, `lg=5`
  - Current values in TS: `{ sm: 4, md: 6, lg: 8 }` — reduce these in the TS component getter
  - Note: stroke-width is set via TypeScript `strokeWidth` getter, not CSS. The TS file must be updated.

---

## AI Insight Card

- Remove `border: 1px solid var(--nova-primary)` and `box-shadow: 0 0 12px var(--nova-primary-alpha-14)`
- Replace border: `1px solid var(--nova-primary-alpha-15)` → `rgba(124,77,255,0.15)`
- Background: Tier 3 spec (`var(--nova-card-tier3-bg)`)
- Header: `auto_awesome` icon at 16px in `--nova-primary-light` + "AI Insight" label at 11px uppercase 0.06em `--nova-text-hint`
- Body text: `var(--nova-text-body-md)` = 14px / 400 / `--nova-text-secondary`

Current header label `.aic-label` is `14px / bold / --nova-text-primary`. Change to `11px / 500 / --nova-text-hint / uppercase / letter-spacing: 0.06em`.

---

## Weekly Workout Card Bars

- Bar width: `6px` — change from `max-width: 24px; width: 100%` to `width: 6px`
- Border-radius: `3px` full pill (all corners, not just top)
- Gap between day bar columns: `8px` (currently `var(--nova-space-2)` = 8px — keep)
- Today bar with workout: `var(--nova-primary)` + `box-shadow: 0 0 8px var(--nova-primary-alpha-40)`
- Past days with workout: `var(--nova-primary-alpha-35)` (currently full `var(--nova-primary)`)
- No workout day: `var(--nova-white-alpha-06)` (already correct)
- Day labels: 10px / `--nova-text-hint` (change from `--nova-text-tertiary`)

---

## Quick Stats Row

- `.quick-stats-row` container: Tier 3 card treatment
- Remove card bg/border/shadow from individual `.qsr-card` wrappers — they become layout-only containers
- Add vertical dividers between blocks: `border-right: 1px solid var(--nova-white-alpha-04)` on each `.qsr-card` except last (use `:last-child` selector to remove)
- Hover lift on individual blocks removed — hover on the container level only if desired

---

## Recent Activity Feed Rows

- Container: Tier 3 card treatment (already `var(--nova-glass-card-bg)` — change to Tier 3)
- Individual `.raf-item` rows: no background, no border, no box-shadow
- Remove `<hr class="raf-divider">` from template — use `gap: 8px` on `.raf-list` instead
- Row hover: `background: rgba(255,255,255,0.02); transition: background 0.15s ease; border-radius: 8px` on `.raf-item`
- `.raf-item-icon`: remove `background: var(--nova-white-alpha-06)` — icon stands alone
- Icon size: 16px / `var(--nova-primary)` color

---

## Quick Actions Strip

- The strip itself is Tier 3: wrap `.quick-strip` with Tier 3 background OR ensure parent padding is consistent
- Currently strip uses its own horizontal `padding: 4px 20px` — this will align with `.page-content padding: 0 var(--nova-space-5)`, so internal strip padding on sides should become `0`
- Chip internal spacing kept as-is — chips are already well-designed

---

## Dashboard History Accordion

- `.history-toggle` button: apply Tier 3 card background instead of `var(--nova-glass-card-bg)`
- `.history-toggle:hover`: `background: var(--nova-white-alpha-04)` (lighter than current `var(--nova-white-alpha-05)`)

---

## Implementation Notes

1. `ProgressRingComponent` stroke-width is in TypeScript (`progress-ring.component.ts:23`), not CSS. The getter returns `{ sm: 4, md: 6, lg: 8 }`. Change to `{ sm: 3, md: 4, lg: 5 }`. The `stroke-opacity` is in the HTML template at `progress-ring.component.html:23` as `stroke-opacity="0.12"` — change to `stroke-opacity="0.08"`.

2. The `.page-content` padding change (`padding: 0 var(--nova-space-5)`) means individual card components should NOT add their own horizontal padding via `padding: ... var(--nova-space-5)`. Review each card to avoid double-padding. Cards use `padding: var(--nova-space-4) var(--nova-space-5)` internally today — keep the vertical padding but the horizontal padding will still apply at card level to maintain internal content margins.

3. Do not apply `.page-content` horizontal padding if cards need full-bleed on mobile. The `quick-actions-strip` currently pads itself — review.
