# Dashboard Visual Audit — FitApp

## (1) VISUAL WEIGHT

**Too heavy:**
- `quick-stats-row.component.css:14–21` — each `.qsr-card` carries its own `background: var(--nova-glass-card-bg)` + `border: var(--nova-glass-card-border)` + `border-radius: 20px`. There are four of these side by side, producing a dense wall of four equal-weight cards that compete visually as a single heavyweight band.
- `ai-insight-card.component.css:3–4` — `border: 1px solid var(--nova-primary)` combined with `box-shadow: 0 0 12px var(--nova-primary-alpha-14)` is the strongest border on the page. A purple glow border used for an ambient "nice to have" card makes it feel more urgent than the rings hero.
- `rings-hero.component.css:3–4` — `.rings-hero` has `background: var(--nova-white-alpha-025)` + `border: var(--nova-glass-card-border)` (1px solid rgba(255,255,255,0.08)). The hero content should float on the page surface, not sit inside a card box. The card treatment compresses visual airiness.

**Competing for attention:**
- Every card uses the same `var(--nova-glass-card-bg)` (`rgba(255,255,255,0.025)`) + `var(--nova-glass-card-border)`. With no differentiation between hero, primary data, and utility cards, all seven sections have identical visual weight. The page reads as a uniform list, not a hierarchy.

---

## (2) HIERARCHY

**What the eye goes to first now:**
The `ai-insight-card` at `ai-insight-card.component.css:3` with its solid `var(--nova-primary)` border and `box-shadow: 0 0 12px var(--nova-primary-alpha-14)` glows the most on the dark surface. It is positioned toward the bottom of the page yet draws the eye away from the rings hero.

**What SHOULD be first:**
`RingsHeroComponent` — the three rings are the summary of the whole day's progress. They should be the undisputed focal point.

**Is `RingsHeroComponent` dominant?**
No. It sits inside a glass card box (`rings-hero.component.css:3–4`) that has the same visual weight as the macro card, the weekly card, and the history accordion. The negative-margin hack `dashboard-page.component.css:11` (`app-dashboard + app-rings-hero { margin-top: -4px }`) actually pulls the rings up into the greeting strip, reducing their breathing room further.

---

## (3) CARD DESIGN

**Adding noise:**
- `rings-hero.component.css:3–4` — the glass card on the hero adds unnecessary container noise. Rings should float.
- `quick-stats-row.component.css:14–21` — four individual glass cards for four simple data points. Each individual block would be better as a content unit inside a single shared Tier 3 container.
- `recent-activity-feed.component.css:43–52` — `.raf-item` has no background but the `.raf-item-icon` at line 48 has `background: var(--nova-white-alpha-06)` — a subtle box around each icon. Combined with `raf-divider` (`border-top: var(--nova-glass-divider)`) it creates dense row-by-row visual segmentation.

**Adding depth correctly:**
- `macro-progress-card.component.css:1–6` — the card itself is fine; the issue is the header at `.mpc-header` shows a 16px title (`var(--nova-text-subtitle)`) and a 20px calorie total (`var(--nova-text-heading)`). The hierarchy within the card is good, but both text sizes are too large relative to the card's importance.

---

## (4) TYPOGRAPHY

**Too large:**
- `macro-progress-card.component.css:16` — `.mpc-title` is `var(--nova-text-subtitle)` = 16px. Card section titles should be 15px.
- `macro-progress-card.component.css:22` — `.mpc-calorie-total` is `var(--nova-text-heading)` = 20px. A supporting total inside a sub-card should be closer to 18px.
- `weekly-workout-card.component.css:16` — `.wwc-title` uses `var(--nova-text-subtitle)` = 16px. Same issue.
- `recent-activity-feed.component.css:15` — `.raf-title` uses `var(--nova-text-subtitle)` = 16px.
- `ai-insight-card.component.css:31` — `.aic-label` is `var(--nova-text-body-md)` = 14px for a section label. This should be 11px uppercase as a label, not 14px as a title.

**Too small / insufficient contrast:**
- `weekly-workout-card.component.css:64–66` — `.wwc-day-label` is `var(--nova-text-xs)` = 10px with color `var(--nova-text-tertiary)` (rgba(255,255,255,0.65)). At 10px on a dark surface this is marginal readability.
- `fitness-data-block.component.css:39–41` — `.fdb-label` is `var(--nova-text-xs)` = 10px. When displayed inside the `qsr-card` wrappers at the current padding this is very small.

**Same size where items should feel different:**
- `rings-hero.component.css:54–58` — `.ring-val--lg` is 22px / extrabold for the center calories ring. This should be more dominant (28px) to clearly distinguish the hero center value from the side ring values at 14px.

---

## (5) SPACING

**Too tight:**
- `dashboard-page.component.css:11` — `app-dashboard + app-rings-hero { margin-top: -4px }` artificially closes the gap between greeting and rings, removing breathing room.
- `quick-actions-strip.component.css:7` — `padding: 4px 20px`. The 4px vertical padding means the strip has almost no vertical breathing room — it reads as squeezed between the rings and macro card.
- `rings-hero.component.css:2` — `padding: var(--nova-space-5) var(--nova-space-4)` = 20px top/bottom, 16px sides. Too tight for the page hero.
- `fitness-data-block.component.css:1–7` — `.fitness-data-block` has only `gap: var(--nova-space-1)` (4px) between icon, value, and label. Content is stacked too tight.

**Too generous:**
- `recent-activity-feed.component.css:100–103` — `.raf-empty` uses `padding: var(--nova-space-8) var(--nova-space-4)` = 32px top/bottom. This is appropriate for a true empty state but excessively tall when the feed appears in a dashboard context.

**8px-grid violations:**
- `rings-hero.component.css:48–49` — `.ring-center-content` gap is `2px` (not on grid).
- `rings-hero.component.css:92–95` — `.rings-streak-badge` padding is `var(--nova-space-1) var(--nova-space-3)` = 4px 12px. The 4px vertical breaks the 8px grid.
- `rings-hero.component.css:76–86` — `.ring-cal-hover-content` uses `gap: 2px` (off grid).

---

## (6) EMPTY / PARTIAL STATES

**Looks broken, not intentional:**
- Weekly workout bars (`weekly-workout-card.component.css:47–52`) — `.wwc-bar` has `border-radius: var(--nova-radius-sm) var(--nova-radius-sm) 0 0` (top-rounded, flat bottom). The flat bottom where bars align to the chart floor makes short bars (1–4px height from `min-height: 4px`) look like rendering artifacts rather than intentional progress indicators.
- `macro-progress-card.component.css:84` — `.macro-bar-fill--low` applies `opacity: 0.6`. A low-opacity bar at less than 10% looks broken against the already low-contrast `rgba(255,255,255,0.08)` track.

**Looks progress-oriented:**
- The `rings-hero` loading arc (`progress-ring.component.css:24–27`) `ring-loading-arc` with 25% dash is a good spinner. Rings at 40%–60% fill look intentional due to the stroke animation.

---

## (7) MICRO-INTERACTIONS

**Purposeful:**
- `progress-ring.component.css:21–23` — `ring-fill` transition with `var(--nova-duration-celebrate)` (600ms) + `var(--nova-ease-spring)` is appropriate for a hero metric — feels rewarding when rings fill.
- `rings-hero.component.css:132–135` — `flamePulse` on the streak icon is subtle and well-timed at 1.5s.
- `macro-progress-card.component.css:68–69` — `macro-bar-fill` transition uses `var(--nova-duration-slow)` (300ms) with `var(--nova-ease-out)`. Appropriate.

**Jarring:**
- `ai-insight-card.component.css:47–51` — `aic-refresh-spinning` animation runs at 600ms linear. Combined with the full-primary-color border and glow the card draws persistent visual attention when loading.
- `quick-stats-row.component.css:23–27` — `.qsr-card:hover` with `transform: translateY(-2px)` adds lift to tiny stat blocks. The lift combined with four individual card backgrounds creates a busy "floating tiles" hover effect.
- `macro-progress-card.component.css:87–92` — `macroNearPulse` at `opacity: 0.6` still pulses a `box-shadow` on an already faint bar. Near-complete pulsing is good intent but the shadow on a thin bar is barely visible, making it feel like a visual bug.

---

## (8) MOBILE (390px)

**Cramped sections:**
- `quick-stats-row.component.css:14–21` — four `qsr-card` blocks at `min-width: 80px` + `flex: 0 0 auto` with `gap: var(--nova-space-3)` (12px) = ~380px minimum total width on a 390px screen with `padding: 0 20px` from `.page-content`. The stats row scrolls horizontally but the horizontal scroll does not have visible affordance (no fade/shadow at edge).
- `quick-actions-strip.component.css:72–75` — at `max-width: 540px` chips shrink to 38px height, 0 12px padding, 12px font-size. On 390px with the strip holding 6 chips this scrolls without any visual cue of more content to the right.
- `rings-hero.component.css:138–142` — at `max-width: 640px` `.ring-slot--center` takes `width: 100%` and reorders to top (`order: -1`). This is correct, but the side rings then wrap into a second row with `gap: var(--nova-space-6)` = 24px. At 390px the two side rings sit at ~175px each — fine, but the total hero takes ~220px of vertical space, which is a significant portion of the viewport above the fold.

---

## Top-10 Ranked Changes (Impact × Speed)

| Rank | Change | Impact | Speed |
|------|--------|--------|-------|
| 1 | Remove card bg/border from `rings-hero` — let rings float directly on page surface | Very high (immediate hierarchy clarity) | Fast (2 CSS lines) |
| 2 | Replace AI insight card full-primary border + glow with subtle `rgba(124,77,255,0.15)` border | High (removes false urgency) | Fast (2 CSS lines) |
| 3 | Merge four `.qsr-card` individual glass cards into one Tier 3 container with dividers | High (reduces visual noise significantly) | Medium (CSS + minor HTML change) |
| 4 | Change card title font-size from 16px (`var(--nova-text-subtitle)`) to 15px across macro, weekly, RAF cards | High (consistent hierarchy) | Fast (token swap) |
| 5 | Change weekly workout bars from top-rounded blocks to full-pill shape (border-radius: 3px) + reduce to 6px width | High (polished look, progress-oriented) | Fast (3 CSS properties) |
| 6 | Remove `<hr class="raf-divider">` between activity rows, replace with `gap: 8px` on the list | Medium (lighter, cleaner) | Fast |
| 7 | Remove `margin-top: -4px` hack on rings hero, give 24px vertical padding | Medium (breathing room) | Fast (1 line delete) |
| 8 | Change `.aic-label` from 14px bold title style to 11px uppercase muted section label | Medium (proper semantic hierarchy) | Fast |
| 9 | Track circle `stroke-opacity` from 0.12 to 0.08 for a lighter, more refined ring track | Medium (visual refinement) | Fast (1 SVG attribute) |
| 10 | Add horizontal padding `padding: 0 var(--nova-space-5)` to `.page-content` to unify edge alignment | Medium (alignment consistency) | Fast |
