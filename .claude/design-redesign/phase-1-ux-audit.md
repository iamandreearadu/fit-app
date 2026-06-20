# Phase 1 UX Audit — Dashboard & beSocial
## NovaFit Redesign Initiative

**Auditor:** @uiux-designer
**Date:** 2026-06-04
**Source files read:**
- `fit-app/src/app/features/dashboard/dashboard/dashboard.component.html` + `.css`
- `fit-app/src/app/features/dashboard/daily-user-data/daily-user-data.component.html` + `.css`
- `fit-app/src/app/features/dashboard/daily-entry-calorie-summary/daily-entry-calorie-summary.component.html`
- `fit-app/src/app/features/dashboard/previous-daily-user-data/previous-daily-user-data.component.html`
- `fit-app/src/app/features/dashboard/calorie-balance-card/calorie-balance-card.component.html`
- `fit-app/src/app/features/dashboard/dashboard-page.component.html` + `.css`
- `fit-app/src/app/features/social/social-shell.component.html`
- `fit-app/src/app/features/social/feed/social-feed.component.html` + `.css`
- `fit-app/src/app/features/social/components/post-card/post-card.component.html` + `.css`
- `fit-app/src/app/features/social/discover/social-discover.component.html`
- `fit-app/src/app/features/social/notifications/social-notifications.component.html`
- `fit-app/src/app/features/social/social-profile/social-profile.component.html`
- `fit-app/src/app/features/social/components/side-nav/social-side-nav.component.html`
- `fit-app/src/app/features/social/components/bottom-nav/social-bottom-nav.component.html`
- `fit-app/src/app/features/social/components/create-content/create-content.component.html`
- `fit-app/src/app/features/social/components/daily-panel/social-daily-panel.component.html`
- `fit-app/src/app/features/social/feed/guided-empty/social-feed-guided-empty.component.html`
- `fit-app/src/app/features/social/components/suggested-users/suggested-users.component.html`
- `fit-app/src/app/shared/components/header/header.component.html`
- `fit-app/src/app/shared/components/streak-badge/streak-badge.component.html`
- `.claude/ux-audits/full-platform-audit.md` (prior audit — not repeated, extended below)
- `.claude/plans/ux-audit-implementation-plan.md`

**Scope note:** This audit extends and deepens the existing full-platform-audit.md. Items already identified at a high level there (food database gap, post-log reward void, onboarding restructure) are not repeated — only new, evidence-based, template-level findings are added.

---

## PART 1 — DASHBOARD AUDIT

### Q1: Primary metric clarity — what does the user see first?

The first rendered element is the `.greeting-strip` in `dashboard.component.html` (lines 4–37). It contains:
1. A greeting line: `"{{ greeting }}, {{ firstName }}!"` at 28–32px/800
2. A streak chip: `{{ s.current }} day streak` at 11px/700 — inline, same row as greeting
3. A subtitle row: date · goal badge · BMI value · longest streak record

The streak chip sits inline within the greeting row at `.gs-main` level. At 11px font size and tucked between the greeting text and the date sub-row, it carries the visual weight of a label, not a primary metric. There is no above-the-fold progress ring, no percentage-to-goal indicator, and no "how am I doing today" answer in the greeting strip. The user sees their name and date — orientation data, not progress data.

Below the greeting strip, the dominant visual element is the `.ctrl-bar` — a 52px-tall horizontal toolbar containing: Today's date, Activity picker, AI Analyze, Weekly Balance, and a save badge. This is a navigation/action bar. It provides no progress communication — it communicates available actions.

Below the ctrl-bar is the `.content-grid` — a 3-column grid of cards: Nutrition, Calories Burned, and Hydration & Steps. Each card has a header badge showing a raw number (e.g., "1,240 kcal"). There are progress bars only inside the Hydration & Steps card, and only for water and steps — not for the most critical daily goal: calorie balance relative to the user's TDEE target.

**Verdict:** The primary metric — calorie balance against the user's daily goal — is not shown above the fold. The user must read three separate card headers plus a net-calories row to reconstruct their current position. There is no single "you are X% to your goal" element anywhere on the page.

---

### Q2: Progress vs data display

The Dashboard communicates data, not progress.

Evidence from templates:

**Calorie Nutrition card** (`daily-user-data.component.html`, lines 147–254): The card header shows a badge with `{{ caloriesFromNutritionLog }} kcal`. Below it, `<app-daily-entry-calorie-summary />` shows the number and a "from your nutrition log" label. There is no progress bar comparing intake to the TDEE goal. The macro fields (protein, carbs, fats) are text inputs — the user enters values manually, no visual progress is shown against macro targets.

**Calories Burned card** (lines 257–328): Shows a raw `{{ caloriesBurned }} kcal` badge and a net-calories row at the bottom. The net-calories row (`{{ netCalories }} kcal`) is displayed as a static number — no color-coding relative to a surplus/deficit target, no visual position relative to the goal.

**Hydration & Steps card** (lines 330–431): This is the only section that shows actual progress (`mat-progress-bar` for water at `[value]="facade.waterProgress()"` and steps at `[value]="facade.dailyDataStats().stepsProgress"`). These are the only progress-oriented elements on the entire page.

**Previous Daily User Data** (`previous-daily-user-data.component.html`, lines 47–68): Shows raw stat numbers (steps, calories in, calories burned) per day row. No streak-relative highlighting, no color coding for good vs bad days.

**Conclusion:** 2 of the 3 main tracking cards (Nutrition, Calories Burned) are pure data displays. Only Hydration & Steps has progress bars. Progress relative to a personalized daily goal exists nowhere on the page.

---

### Q3: Emotional tone

The Dashboard is **neutral to clinical**. Evidence:

- The greeting strip uses a soft greeting phrase and goal badge, which is positive.
- The streak chip includes a `flame-pulse` animation when `s.loggedToday && s.current > 0` (dashboard.component.css, lines 107–113). This is the only celebration element on the entire Dashboard.
- The at-risk strip (lines 40–45) uses a warning tone: "Your N-day streak is at risk — log today's data before midnight!" This is the only motivational copy — but it is threat-based, not encouragement-based.
- There are no celebration or completion states. No message when a user hits their water target. No acknowledgment when macros are on track. No positive reinforcement for partial completion.
- The energy level selector (5 emoji buttons) is neutral data collection, not motivational.

**Missing entirely:** Encouragement copy for partial completion ("You're 68% to your protein goal — keep going"), positive reinforcement messages when goals are hit, and any visual celebration on full-day completion.

---

### Q4: Time-to-comprehension — "how am I doing today?"

To answer "how am I doing today?" the user must cognitively parse:

1. Greeting strip — confirms identity and date (1 element)
2. Streak chip — current streak status (1 element)
3. Nutrition card header badge — kcal from nutrition log (1 element)
4. `app-daily-entry-calorie-summary` — same kcal repeated with source label (1 element — redundant with #3)
5. Calories Burned card header badge — kcal burned (1 element)
6. Net calories row — calculated net (1 element)
7. Hydration water progress bar — fraction + bar (2 elements: number and bar)
8. Steps progress bar — fraction + bar (2 elements)

**Cognitive element count: 10 distinct items** to achieve a complete picture. An industry standard dashboard should present "how am I doing today?" in 1–3 glanceable elements (a ring, a progress bar, or a summary stat row). Apple Watch achieves this with 3 rings. MyFitnessPal achieves it with a single calorie remaining number above the fold.

At 375px mobile viewport width, the above-fold area contains: the header, the greeting strip, the ctrl-bar, and the top of the Nutrition card. The user must scroll through all three cards and the previous days section to see all 10 elements. Estimated time to comprehension: 8–15 seconds with scrolling.

---

### Q5: Above-the-fold vs scroll (375px × 812px mobile viewport)

**Above the fold (no scroll):**
- App header (~56px)
- Greeting strip with streak chip (~70px)
- At-risk strip if active (~44px)
- Ctrl-bar (52px)
- Nutrition card header and `app-daily-entry-calorie-summary` and partial macro fields

**Requires scrolling:**
- Remaining macro fields (protein, carbs, fats inputs)
- Pick from saved meals button
- Weight and energy level section (within Nutrition card)
- Entire Calories Burned card
- Entire Hydration & Steps card
- All Previous Daily User Data section

**Hierarchy assessment:** The ctrl-bar is given a position of highest visual prominence (top of content, 52px tall, full-width, styled) but communicates the least important information (available actions). The most goal-relevant content — net calories, water progress, steps progress — is buried below two full card-scrolls. The hierarchy is inverted relative to what a user needs: actions are surfaced first, outcomes last.

**Critical observation:** On mobile (540px breakpoint, `content-grid` becomes single column), all three cards stack vertically. The user must scroll through the entire Nutrition card — which includes macro inputs, weight, energy level — before reaching the Calories Burned card and then the Hydration card. This stacking order puts data-entry forms above progress visualization, which is the wrong priority.

---

### Q6: Quick-log access — water, weight, meal without navigation

**Water:** Available in the Hydration & Steps card with `+500ml`, `+250ml`, `−250ml` adjust buttons. This is on the Dashboard but requires scrolling to the third card on mobile. Tap count from Dashboard open: **1 scroll + 1 tap** (minimum).

**Weight:** Inside the Nutrition card, below the macro fields and a divider. The field is buried beneath the calorie summary, three macro input fields, and a dashed "Pick from saved meals" button. Tap count: **1 scroll + 1 tap to focus field + keyboard entry**. Not quick-log by any definition.

**Meal logging from Dashboard:** The ctrl-bar has an "Analyze your meal" button (AI meal analyzer) which opens a modal. This is a 2-tap flow (ctrl-bar tap + analyzer interaction). However, picking from saved meals requires: ctrl-bar → not accessible from ctrl-bar, user must tap "Pick from saved meals" button inside the Nutrition card. On mobile: **scroll to Nutrition card + 1 tap to open meal picker modal**.

**Verdict:** Water logging is acceptable (1 scroll + 1 tap). Weight and macro logging require multiple scrolls and taps. Critically, there is no truly "above the fold" quick-log for any metric on mobile.

---

### Q7: Day 1 / new user state

The `dashboard.component.html` has a `@else` branch (lines 46–54) for when `user()` returns falsy — showing a `no-data-banner` with "No profile data yet. Go to Profile to add your information."

However, this state fires when user profile data is missing — not specifically when a user is new. There is no distinct new-user / Day 1 guided state for the Dashboard itself. The Daily User Data form renders identically with zero values for both new users and returning users. The ctrl-bar shows the same options.

There is no "Welcome! Here's what to log today" onboarding overlay, no guided card highlighting the first action, and no progressive disclosure that introduces one tracking concept at a time. A Day 1 user sees exactly the same form as a 90-day user, but with empty fields — which reads as a blank form, not a product that is designed for them.

---

### Q8: Streak placement

In `dashboard.component.html`, the streak chip is rendered at line 8–18, inside `.gs-main` — which is the first content row on the page, co-located with the greeting. The streak chip renders inline with the user's name.

**CSS analysis** (dashboard.component.css, lines 77–122): The `.streak-chip` is 11px font / 700 weight / pill shape (border-radius 999px) at roughly 28px height. It is a small pill badge next to the username — not a dominant visual element.

In the app header (`header.component.html`, line 67): `<app-streak-badge />` is rendered inside `.hdr-actions`, next to the user avatar. In `streak-badge.component.html`, this only renders when `streak.current > 0`. The badge shows flame icon + count number.

**Verdict:** The streak IS above the fold — it appears in the header (persistent) and in the Dashboard greeting strip. However, its visual weight is low at both locations. In the header it is a small badge in the actions area. In the Dashboard it is an 11px pill within a line of text. Neither treatment gives the streak the prominence it deserves as the primary retention mechanic. The full-platform-audit.md correctly flagged this, and while the implementation plan noted the streak badge was shipped (Fix 5), the visual weight remains insufficient. The streak renders at 11px inside a greeting that competes with 28–32px display text — it reads as secondary metadata, not as a primary motivational element.

---

## PART 1 — DASHBOARD FINDINGS

---

### Finding D1: No goal-relative progress visualization
**Severity:** Critical
**Current state:** None of the three dashboard cards shows calorie intake as a percentage of the user's TDEE/daily goal. The Nutrition card displays `{{ caloriesFromNutritionLog }} kcal` as a badge and raw number only (`daily-user-data.component.html` lines 167, `daily-entry-calorie-summary.component.html`). No progress bar exists. The user's personalized TDEE target is calculated (it exists in `MetricsService`) but never surfaced on the Dashboard as a "you are X% there" element.
**Best-in-class standard:** MyFitnessPal's home screen leads with "Calories Remaining: 840" in large type above the fold, with a progress ring. Apple Watch shows three activity rings as the primary interface. The core loop feedback — am I on track? — must answer in under 2 seconds with a single glance.
**Recommended fix:** Add a goal progress ring or hero bar immediately below the greeting strip, before the ctrl-bar. Show: calories consumed / daily goal (percentage), water progress, and steps progress as three compact rings or a single horizontal progress bar. This element should be above the fold on mobile at all times. The TDEE target for the calculation is already available via `MetricsService`.
**Design phase:** Dashboard Redesign

---

### Finding D2: Calorie card hierarchy inverted on mobile
**Severity:** High
**Current state:** On mobile (< 540px), `content-grid` becomes single-column (`daily-user-data.component.css` line 1096–1110). The stacking order is: Nutrition card (first) → Calories Burned card (second) → Hydration & Steps card (third). The Nutrition card contains the macro entry form + weight + energy level — requiring the most scroll to get through. The most actionable quick-log items (water adjust buttons, steps adjust buttons) are in the third card, below 2 full form cards.
**Best-in-class standard:** Mobile dashboards should surface the most frequently used action first. For a fitness tracker, water logging and steps are logged 3–5× per day, macros are logged once. The Hydration card should be first (or second) on mobile, not last.
**Recommended fix:** On mobile, reorder the grid: (1) Hydration & Steps, (2) Calories summary (read-only, with goal progress), (3) Macros/Nutrition entry. This can be done with CSS `order` properties at the 540px breakpoint without changing the component structure.
**Design phase:** Dashboard Redesign

---

### Finding D3: Ctrl-bar occupies prime above-fold real estate with action items, not progress
**Severity:** High
**Current state:** The `.ctrl-bar` (52px tall, full-width, visually prominent) is positioned between the greeting strip and the content grid. It contains: date display, activity picker, AI meal analyzer, and weekly calorie balance. At 375px mobile, this bar is one of the most prominent elements above the fold. It communicates available actions, not current progress. The "Weekly balance" button opens a modal — the user must tap to see this data.
**Best-in-class standard:** Above-fold space on a personal health dashboard must be dedicated to "status of today." Actions belong in a secondary bar, FAB, or within individual cards. Google Fit's home screen leads with today's calorie burn ring, then surfaces quick-log actions below. Strava's home shows today's activity summary immediately.
**Recommended fix:** Move the ctrl-bar below the progress visualization (Finding D1 fix). Or collapse it into a single icon button row inside a sticky bottom bar. The activity picker and "Analyze your meal" should be accessible but should not compete with progress data for the prime above-fold position.
**Design phase:** Dashboard Redesign

---

### Finding D4: Zero emotional feedback or completion states
**Severity:** High
**Current state:** The dashboard has exactly one emotional feedback element: the `flame-pulse` CSS animation on the streak chip when `s.loggedToday && s.current > 0`. There are no positive reinforcement messages for any achieved sub-goal (water target hit, protein goal hit, step target reached). The only motivational copy is the threat-based at-risk strip: "Your N-day streak is at risk." No partial completion encouragement exists anywhere.
**Best-in-class standard:** Duolingo celebrates every completed lesson with an animation. MyFitnessPal shows "Great job! You're on track for your calorie goal" when intake is near target. Fitbit shows ring-closing animations. Positive reinforcement at micro-milestones (50% water, 75% steps) dramatically improves daily retention.
**Recommended fix:** Add three inline state-reactive messages within the progress elements: (1) when water reaches 100%, replace the progress bar with a "Hydrated! Goal reached" green confirmation. (2) When steps reach 100%, show an encouraging message. (3) When all three goals are at 100% for the day, trigger a full-surface "Day complete!" micro-celebration using the existing `bounce` keyframe animation. All messages should be dismissible or auto-fade after 3 seconds.
**Design phase:** Dashboard Redesign

---

### Finding D5: Streak visual weight is insufficient for retention value delivered
**Severity:** High
**Current state:** The streak chip in `dashboard.component.html` is styled at 11px/700 (`dashboard.component.css` line 84) inside `.gs-main` which renders at flex layout alongside 28–32px greeting text. The streak chip has a height of approximately 22–26px (3px padding top/bottom + 16px icon + letter height). In the header, `streak-badge.component.html` renders only when `streak.current > 0`, inside `.hdr-actions` at the right side of a 56px header.
**Best-in-class standard:** Snapchat's streak counter is 22px bold centered under the friend's name. Duolingo's streak is the third-largest element on the home screen after the mascot and the day selector — it uses 32px bold with a color animation when increased. The streak is NovaFit's most powerful retention mechanic and must command visual authority proportional to that function.
**Recommended fix:** On the Dashboard, give the streak its own dedicated display row immediately below the greeting strip (above the ctrl-bar). Use 36–40px bold count with a large flame icon (28px), an orange glow effect, and a compact progress indicator showing "3 more days to your personal best." At this size, the streak becomes the emotional anchor of the Dashboard. The header badge can remain small (it is supplementary at-a-glance), but the Dashboard treatment must be the primary motivational element.
**Design phase:** Dashboard Redesign

---

### Finding D6: Day 1 new user state is identical to returning user state (zero differentiation)
**Severity:** High
**Current state:** `dashboard-page.component.html` renders `<app-dashboard>`, `<app-daily-user-data>`, and `<app-previous-daily-user-data>` unconditionally. `dashboard.component.html` shows a `no-data-banner` only when `user()` is falsy (no profile at all), not for new users with a profile but no logged data. A Day 1 user with a complete profile sees the full three-card form with empty/zero values. There is no guided state, no "what to do first" instruction, and no distinction between "never logged" and "logged before."
**Best-in-class standard:** Strava greets new users with an empty state that says "Record your first activity to get started" with a large prominent CTA. MyFitnessPal's Day 1 state shows an animated calorie budget reveal and a "Log your first meal" prompt. The first time the product is empty should feel intentional, not broken.
**Recommended fix:** Detect `isFirstLogin` or "no daily entries ever" via a computed signal on the facade. When `true`, replace the standard three-card layout with a guided onboarding card: "Today is Day 1 — let's set up your daily tracking." Show three sequential quick-start CTAs: (1) Log today's weight, (2) Add your first meal, (3) Track today's water. Each CTA should inline-expand to show just the relevant input — not navigate away. After all three are completed, transition to the standard layout with a brief celebration.
**Design phase:** Dashboard Redesign

---

### Finding D7: Previous Days section competes with Today for attention
**Severity:** Medium
**Current state:** `previous-daily-user-data.component.html` is rendered as a third section in `dashboard-page.component.html` (after the greeting strip and the daily-user-data form). It shows a full "Previous Days" header with week navigation, and a list of clickable day rows showing steps, calories in/out. This section is always visible, always the same visual weight as the today cards.
**Best-in-class standard:** Historical data is a secondary concern on a daily-tracking dashboard. MyFitnessPal's home screen is entirely dedicated to today — the history is accessed via a dedicated "Diary" view. Apple Health puts today's summary first, with trend charts accessible by tapping — not shown by default. Past data should not compete with today's tracking for user attention.
**Recommended fix:** Collapse the Previous Days section into a collapsible accordion (default collapsed) or move it to a secondary "History" tab or route. On mobile, it should be below-the-fold by default and accessible via a "View history" CTA at the bottom of the today section. The section is valuable but should not be on equal footing with today's tracking.
**Design phase:** Dashboard Redesign

---

### Finding D8: Macro entry is form-first, not progress-first
**Severity:** Medium
**Current state:** The Nutrition card in `daily-user-data.component.html` (lines 175–213) shows three `mat-form-field` inputs for protein, carbs, and fats in grams. These are standard text inputs with colored dots to the left. There are no visual targets, no progress bars showing grams consumed vs. daily target, and no context for whether the values entered are on track or off target.
**Best-in-class standard:** MyFitnessPal shows macro progress bars (Protein: 68/150g) with color-coded fills. Cronometer shows a circular progress chart per macro. The macro display should answer "how close am I?" not require the user to remember their target and do mental math.
**Recommended fix:** Replace the three plain number inputs with a progress-bar-plus-input hybrid component. Each macro row shows: a colored progress bar (protein purple, carbs blue, fats orange) with the current value overlaid, a "consumed/target" fraction label, and a small +/- quick-add button. The keyboard-triggered number field is available via tap. This is the same pattern as the water/steps section that already exists and works well — apply it to macros.
**Design phase:** Dashboard Redesign

---

## PART 2 — beSocial AUDIT

### Q1: Feed vitality — does the feed feel alive or static?

The feed is architecturally alive (IntersectionObserver-based infinite scroll is implemented in `social-feed.component.html` lines 79–83, skeleton loading states at lines 22–29) but visually undifferentiated by content type.

Content types supported: standard posts (text + optional portrait image), article posts (16:9 cover + title + body text), and "seed" posts (NovaFit Official editorial content with a distinctive border style). Additionally, posts can carry `linkedContent` — a `linked-content-preview` block showing a badge + title + subtitle for linked workout, meal, or daily entry.

**Do different post types look visually different?** Partially. The article card type (`post-card--article`) has a 16:9 cover image, category label, title in 15px/700, and body text — clearly distinct from a standard post. The seed card (`post-card--seed`) has a distinctive purple border (`border: 1px solid rgba(124, 77, 255, 0.18)`), purple background tint, and a "NovaFit Tip" badge — also visually distinct.

However, the linked-content preview (the workout/meal share block) is styled as a subdued glass card inside the post body (`linked-content-preview` in post-card.component.css, lines 107–163): `background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08)`. The badge showing the content type is tiny (11px). The workout title appears in 13px/600. This data presentation is too quiet — shared fitness data (a workout, a meal) is the most unique and valuable content in a fitness social feed and it is presented at the lowest visual weight.

**Verdict:** The feed has structural variety but fitness-specific content (the linked workout/meal cards) is visually subordinate to text posts. The reverse should be true.

---

### Q2: Content-to-noise ratio per feed card

Anatomy of a standard post card (from `post-card.component.html`):

**Social chrome (navigation/identity elements):**
- Avatar (36px circle, `post-card-avatar-wrap`)
- Author name (`post-card-author-name`, 14px/600)
- Verified badge (optional)
- Date (`post-card-date`, 13px, dimmed)
- Follow button (if not following)
- Three-dot menu (own posts)
- Footer: like button + count, comment button + count

**Content elements:**
- Linked content preview block (if present)
- Post image (if present)
- Post text (if present)

**Ratio analysis for a text-only post with no linked content:**
The post card is nearly all chrome: avatar row (~36px height) + text content + footer action row. On a short text post (1–2 lines), the social chrome (name row + footer) occupies approximately 50–60% of the card height.

**Ratio for a post with linked fitness content:**
The linked-content-preview block adds content, but at low visual weight. A workout linked to a post shows: type badge (11px) + title (13px/600) + subtitle (12px, dimmed). This is equivalent weight to a tweet metadata row, not a workout summary.

**Verdict:** For text posts, the content-to-noise ratio is approximately 40/60 in favor of chrome. For posts with fitness data, the ratio is better but the fitness data itself is visually subordinate. Both cases fail the content-first principle of modern social feeds.

---

### Q3: Fitness data visual weight in workout posts

When a workout is shared as a post with `linkedContent`, the template renders (from `post-card.component.html`, lines 90–99):

```
<div class="linked-content-preview">
  <div class="linked-content-header">
    <span class="linked-content-badge">{{ type | titlecase }}</span>
    <span class="linked-content-title">{{ title }}</span>
  </div>
  <p class="linked-content-subtitle">{{ subtitle }}</p>
</div>
```

CSS: `background: rgba(255,255,255,0.03)` — near-invisible background. `border: 1px solid rgba(255,255,255,0.08)` — near-invisible border. Badge: 11px, uppercase. Title: 13px/600. Subtitle: 12px, `rgba(255,255,255,0.5)` — half-opacity dimmed text.

This renders as a barely-visible glass rectangle with text at 11–13px. The workout name is 13px/600 — the same weight as the post date (`post-card-date`, 13px/dimmed). The linked fitness content has nearly the same visual weight as metadata text.

**Best-in-class standard:** Strava's shared workout card uses a full-width colored card with large activity type icon, km/duration stats at 24px bold, map preview, and pace data. It is the dominant visual element of the post. Hevy's shared workout card shows exercise count, total volume, and duration in large colored stat tiles.

**Verdict:** The fitness data attached to posts is severely under-weighted. It renders at metadata size when it should be the hero content of a fitness-specific social feed.

---

### Q4: Profile — athletic identity communication

The social profile template (`social-profile.component.html`) shows in order:

1. Avatar (circular, with camera overlay for edit)
2. Display name (32px implied from h1 class)
3. Stats row: Posts count, Followers count, Following count
4. Bio text (if set, otherwise an "Add bio" CTA)
5. Action buttons (Follow/Unfollow, Message, Edit Bio, New Post)
6. Tabs: Posts | Workouts | Articles | Stats

**What the profile communicates about athletic identity:**
- The stats row is social-first (Posts, Followers, Following) — identical to Instagram's profile layout
- Fitness metrics are absent from the above-fold profile header: no fitness goal badge, no current streak, no workout count for the month, no most common activity type
- The "Workouts" tab exists but is tab 2, not visible without interaction
- The "Stats" tab (tab 4) contains charts — hidden four taps deep

**Verdict:** The profile is identity-first (name, avatar, bio, social stats) rather than athletic-identity-first. A user visiting another athlete's profile cannot immediately determine: what is their fitness goal, how active are they this month, what type of training do they do. This information exists in the data model but is not surfaced in the profile header.

**Best-in-class standard:** Strava's profile header shows: avatar, name, city, sport type icons, current year stats (km run/ridden/swum, elevation gained). The first thing you learn about a user is their athletic profile, not their social follower count.

---

### Q5: Missing interactions audit

**Present:**
- Like button with count (heart icon, toggle)
- Comment button with count (navigates to post detail)
- Follow button (inline on feed cards)
- Post menu (edit/delete for own posts)
- Infinite scroll via IntersectionObserver
- Loading skeletons on feed and notifications

**Missing interactions vs. social-fitness best practice:**

| Interaction | Present | Expected in fitness social app |
|---|---|---|
| Pull-to-refresh | Not implemented — no gesture handler visible in templates | Expected (Strava, Instagram, Hevy all implement) |
| Swipe-based post actions | Not present | Expected (Archive, Delete via left swipe) |
| Bookmark / Save post | Not present | Expected (save workout templates seen in feed) |
| Share post externally | Not present | Expected (share to Instagram Stories, export workout) |
| Reaction varieties | Only like (heart). No "fire", "strong", "goal met" reactions | Fitness apps use domain-specific reactions |
| Post creation from feed FAB | Present (`feed-fab` button) | Present |
| Story-style ephemeral content | Not present | Optional but expected in modern social |
| Long-press post preview | Not present | Optional |
| Swipe between tabs | Not present on any social sub-page | Expected on mobile |

**Critical missing interaction:** Pull-to-refresh. The feed uses infinite scroll downward but has no pull-to-refresh gesture. On mobile, this is a learned expectation — users pull down when they want new content. Without it, users who return to the feed tab after time away will see stale content without an obvious way to refresh (the only option is the browser reload).

---

### Q6: Navigation — beSocial to workout logging (tap count)

Starting from the beSocial feed (`/social`):

**Desktop path:** Side nav has "Back to NovaFit" link at the bottom (social-side-nav.component.html, lines 76–83). Tap count: 1 tap to "Back to NovaFit" → routes to `/` → 1 tap to navigate to Dashboard → navigate to Workouts tab. **Minimum: 3 taps + route transitions.**

**Mobile path:** Bottom nav has 5 items: Feed, Discover, Chat, Alerts, Me. There is no "Back to NovaFit" in the bottom nav. On mobile, the daily-panel-fab (social-shell.component.html, lines 32–44) provides a "Today" FAB that opens the daily panel — this is adjacent to tracking, but the daily panel is read-only (it shows stats, has no log buttons). To log a workout from beSocial on mobile: tap hamburger/menu is not present in the social bottom nav — user must swipe back or use browser back, which is not surfaced. **Minimum: browser back + navigate to Workouts → 3+ taps.**

**Verdict:** Navigation from beSocial to workout logging requires a minimum of 3 taps on desktop and is unclear/undiscoverable on mobile. The daily panel FAB in the social shell looks like it should be a bridge to tracking, but it is read-only. This represents a critical separation between social and tracking contexts.

---

### Q7: Discover — empty and sparse states

From `social-discover.component.html`:

**Loading state:** Three skeleton card sections exist (user-card skeletons + post skeletons, lines 87–103). These use `.user-card--skeleton` and `.discover-post-skeleton` — correct pattern.

**Error state:** `discover-error` block with icon + message + Retry button (lines 106–111). Correct pattern.

**Empty — Athletes to Follow (line 120–125):**
```html
<div class="discover-empty">
  <mat-icon>explore</mat-icon>
  <p>No athletes to discover yet</p>
</div>
```
No CTA. No call to action. No explanation of why no athletes appear. For a new user, this empty state leaves them stranded with no next action.

**Empty — Recent Posts (lines 166–170):**
```html
<div class="discover-empty">
  <mat-icon>explore</mat-icon>
  <p>No posts to discover yet</p>
</div>
```
Same pattern. Icon + text, no CTA.

**Suggested Users component** (via `<app-suggested-users class="discover-suggested" />`, line 83): This component self-hides when empty (`@if (!loading() || users().length > 0)` wrapper). When `users().length === 0` and not loading, the section silently disappears.

**Verdict:** The Discover page has correct loading/error states but weak empty states. The Athletes to Follow empty state gives users no path forward. The Suggested Users section silently vanishes when empty, leaving a gap in the layout. The overall Discover experience when sparse is: blank header search bar → silent suggested users section → "No athletes to discover yet" → "No posts to discover yet." This is effectively a dead screen with no motivation to stay or return.

---

### Q8: Notification quality — types, grouping, missing elements

From `social-notifications.component.html`:

**Notification types present:** The template renders notifications using `getTypeIcon(n.type)` and `getTypeIconClass(n.type)` for dynamic icons/colors. The underlying `NotificationType` enum (from CLAUDE.md) supports: like, comment, follow, message. The notification body shows: actor avatar, `n.actor.displayName`, `n.message`, timestamp (`n.createdAt | date:'short'`), and an unread dot indicator.

**Grouping:** None. Every notification is a flat individual row. If user A likes 5 posts in sequence, all 5 appear as separate rows. Instagram groups these: "UserA and 12 others liked your post."

**Load more pattern:** A "Load more" button at the bottom (lines 85–95) with a spinner. This is a tap-to-paginate pattern rather than automatic infinite scroll. On mobile, requiring a manual "Load more" tap breaks the native scroll rhythm.

**Missing notification types:**
- Streak at-risk notification (someone in your network is on a streak) — social nudge
- Workout completed by a followed user (real-time activity push, like Strava's segments notifications)
- First like on a new post (celebratory, high emotional value)
- Mention (@username in comments)
- Weekly/monthly achievement unlocked (internal milestone)

**Missing quality features:**
- No grouping by actor or action type
- No "today" / "this week" / "earlier" temporal sections — all notifications appear as a flat undifferentiated chronological list
- Timestamp format: `date:'short'` produces "6/4/26, 2:14 PM" — not human-readable relative time ("2 hours ago" is the standard)
- No notification preview of the content (what post was liked? no thumbnail shown)

---

## PART 2 — beSocial FINDINGS

---

### Finding S1: Linked fitness content is visually subordinate to post metadata
**Severity:** Critical
**Current state:** Workout and meal linked-content previews inside post cards render at `background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08)` — near-invisible. Badge text is 11px. Title is 13px/600. Subtitle is 12px at 50% opacity (`post-card.component.css` lines 107–163). This is the same visual weight as a post timestamp, not a featured content element.
**Best-in-class standard:** Strava's activity cards use a full-width colored surface with large stat tiles (distance, pace, elevation) at 24px bold. The fitness data IS the post. In a fitness social app, the workout/meal data must be the visual anchor — not a whispered footnote.
**Recommended fix:** Redesign the linked-content-preview into a distinct `fitness-data-card` component. Workout card: primary color accent band (left border 3px `var(--primary)`), workout type icon at 24px in a 40px icon container, workout title at 16px/700, key stats (duration, exercises or volume) in stat tiles at 18px/700 with semantic colors. Meal card: green accent band, meal name at 16px/700, macro summary row (P/C/F) as colored chips. The card should have `border-radius: 12px`, `background: rgba(124,77,255,0.06)`, and `border: 1px solid rgba(124,77,255,0.18)`.
**Design phase:** beSocial Redesign

---

### Finding S2: Post card is chrome-heavy — social metadata dominates content
**Severity:** High
**Current state:** For a standard text-only post with no linked content, the name row (avatar + name + date + follow button) occupies approximately 48–56px. The footer action row (like + comment) occupies 48–52px. For a short post (2 lines of text at 14px), the content is roughly 44px. Chrome : content ratio is approximately 65:35 — the social machinery outweighs the actual content. The post card has no internal visual hierarchy that draws attention to the content first.
**Best-in-class standard:** Twitter/X's cards have a compact 40px name row but the text begins immediately and is the visual focal point. Instagram Stories put content at 100% viewport with minimal chrome. The feed reading experience should be "content-first, chrome-secondary."
**Recommended fix:** Reduce name row padding from `12px 16px 8px` to `8px 16px 6px`. Decrease avatar size from 36px to 32px (still above minimum touch target for a link). Move the follow button into the post options menu (three-dot) for followed users — declutter the name row. Make the footer action row more compact: reduce to 40px height, use icon-only buttons at mobile widths. The net result is the content section occupying more proportional space per card.
**Design phase:** beSocial Redesign

---

### Finding S3: No pull-to-refresh on the feed
**Severity:** High
**Current state:** `social-feed.component.html` has infinite scroll downward via IntersectionObserver sentinel (lines 79–83) and a `mat-spinner` for load-more state. There is no pull-to-refresh gesture handler on the feed container or any parent element.
**Best-in-class standard:** Pull-to-refresh is a mandatory mobile interaction on any feed-based screen. iOS and Android users expect it universally. Without it, returning to the feed shows stale content with no obvious refresh mechanism. Strava, Instagram, Hevy, and MyFitnessPal all implement pull-to-refresh.
**Recommended fix:** Add a `(touchstart)`, `(touchmove)`, `(touchend)` handler on `.feed-page` that detects a downward pull gesture from the top of the scroll container. At 60px pull distance, show a `mat-spinner` centered at the top of the feed. On release at >60px, call `facade.loadFeed(true)` (force refresh, which already exists). On desktop, add a refresh icon button to the `.feed-header` row. The `feed-fab` could also incorporate a long-press to refresh.
**Design phase:** beSocial Redesign

---

### Finding S4: Profile header is social-first, not athletic-identity-first
**Severity:** High
**Current state:** The profile header (social-profile.component.html, lines 33–87) shows: avatar → display name → stats row (Posts, Followers, Following) → bio. The only fitness-specific element visible before a tab interaction is whatever appears in the bio if the user has written one. No fitness goal badge, no streak, no training frequency, no sport type — all absent from the profile header.
**Best-in-class standard:** Strava profiles show sport icon strip, location, and year-to-date stats (activities, distance, time) above the content tabs. This communicates athletic identity at a glance — before a visitor scrolls or taps a tab. In a fitness app, this is the primary user identity signal, more relevant than follower count.
**Recommended fix:** Add an "athletic identity strip" below the stats row and above the bio. It contains: (1) fitness goal badge (using the existing `.goal-badge` color system from dashboard.component.css), (2) workout count this month as a compact stat chip, (3) current streak chip (same design as the dashboard streak chip). These three elements are already available in the data model — no new API endpoints required, as `/api/users/{userId}/stats` returns this data. The bio appears below this strip.
**Design phase:** beSocial Redesign

---

### Finding S5: Discover empty states have no conversion CTA
**Severity:** High
**Current state:** `social-discover.component.html`, lines 120–125 and 166–170: both empty states show `<mat-icon>explore</mat-icon>` + a single `<p>` text with no button, no link, no next action. The Suggested Users component (`suggested-users.component.html`) self-hides silently when empty (`@if (!loading() || users().length > 0)`), leaving a visual gap in the layout.
**Best-in-class standard:** An empty Discover state is the highest-churn moment in a social app — the user has actively tried to find community and found nothing. Every empty state in a social product should have a single, direct CTA. Instagram's empty search shows "Trending" content. Strava shows "Join a club" and "Search athletes" CTAs. A dead empty state is a confirmed drop-off point.
**Recommended fix:** Replace both empty state blocks with conversion-optimized versions. "No athletes to discover yet" → add a CTA button "Search by name" that focuses the search input. "No posts to discover yet" → add a CTA "Be the first to post" that opens the create-content dialog. The Suggested Users component should render a fallback message ("No suggestions yet — check back soon") rather than silently hiding, to prevent unexplained layout gaps.
**Design phase:** beSocial Redesign

---

### Finding S6: Notification list uses wrong timestamp format and has no grouping
**Severity:** Medium
**Current state:** Notification timestamps use Angular's `date:'short'` pipe (social-notifications.component.html, line 75), producing "6/4/26, 2:14 PM". Notifications are rendered as a flat undifferentiated list with no temporal grouping. When a user receives 5 likes from 3 different users on 2 different posts, all 5 appear as separate rows — no aggregation.
**Best-in-class standard:** All major social apps (Instagram, Twitter, Strava) use relative timestamps ("2 hours ago", "Yesterday") for notifications under 7 days old. Instagram groups by "Today," "This week," "This month." Strava groups multiple likes into "A and 3 others liked your activity." Ungrouped flat lists create notification fatigue and obscure high-signal events (a new follow) behind low-signal ones (individual likes).
**Recommended fix:** (1) Replace `date:'short'` with a custom relative-time pipe: "just now" < 60s, "X min ago" < 1h, "X hours ago" < 24h, "Yesterday", then `date:'MMM d'`. (2) Add "Today" / "Earlier" section dividers using a grouping computed signal in the facade. (3) For future sprint: group duplicate-actor notifications ("A liked 3 of your posts" instead of 3 separate rows). The relative-time pipe is a shared utility usable across the codebase.
**Design phase:** beSocial Redesign

---

### Finding S7: No fitness-specific reaction types — only a generic heart like
**Severity:** Medium
**Current state:** The post card footer (post-card.component.html, lines 173–188) has exactly two actions: like (heart icon, `favorite` / `favorite_border`) and comment (chat bubble). The like action is a binary toggle with a count.
**Best-in-class standard:** Fitness social apps differentiate reactions by type to create richer social signal. Whoop's community uses "👊" (strong) reactions. Nike Run Club uses a "cheer" reaction distinct from a generic like. Strava uses "kudos" — a deliberate brand term that signals "I recognize your effort" rather than a generic thumbs-up. A fitness-specific reaction system makes the social layer feel purpose-built rather than a feature-checklist item.
**Recommended fix:** Add 2–3 fitness-specific emoji/icon reactions alongside the like button: 🔥 (fire) for a great workout post, 💪 (strong/flexed arm) for a strength achievement, 🎯 (target) for a goal-hit post. React button opens a 3-reaction picker as a small popover (on tap-and-hold or a + button next to the like count). Like count aggregates all reaction types. This is a frontend-only change if all reactions map to the existing `Like` entity with a `reactionType` field (schema addition needed).
**Design phase:** beSocial Redesign

---

### Finding S8: The "Today" daily panel FAB in the social shell is read-only — a dead end for mobile users who want to log
**Severity:** Medium
**Current state:** `social-shell.component.html` (lines 32–44) renders a `daily-panel-fab` button when `isNarrow()`. Tapping it opens the `social-daily-panel` component (read-only stats: calories, water, steps, macros donut). The panel has no log button, no quick-add action, no link to the Dashboard. It shows today's data but provides no action path. On mobile, this is the only bridge between beSocial and tracking — and it is a dead end.
**Best-in-class standard:** Context-sensitive panels in fitness apps (like Strava's "This Week" summary or Garmin's today overview) always include at least one action CTA at the bottom of the panel — typically "Log an activity" or "Start tracking." The panel being informational only is a missed conversion opportunity.
**Recommended fix:** Add a footer to `social-daily-panel.component.html` containing two ghost-style CTA buttons: "Log data" (links to `/user-dashboard`) and "Start workout" (links to `/workouts`). Also add inline quick-log buttons next to the water and steps metrics: a single "+250ml" button next to the water progress bar, and a "+500 steps" button next to steps. These quick-log actions should call the existing dashboard facade methods directly — no navigation required. The panel becomes both informational and actionable.
**Design phase:** beSocial Redesign

---

### Finding S9: The create-content dialog order is article-centric, not post-centric
**Severity:** Medium
**Current state:** `create-content.component.html` opens with a mode toggle: "Post" (default) | "Article." The Post mode shows: image upload dropzone (large, portrait 3:4) → textarea. The image is required to appear before the text. For a quick status-update post (the most common social action), the user must visually skip past a large portrait dropzone before reaching the text field.
**Best-in-class standard:** Instagram, Twitter, and Strava put the text field first in quick-post flows. The image upload is available but secondary. Facebook's composer is text-first with an image pin icon below. Content creation friction is the primary predictor of post frequency — every extra visual element before the text cursor costs conversions.
**Recommended fix:** In Post mode, reverse the component order: text area first (auto-focused on dialog open), image upload below. Reduce the dropzone from a large portrait placeholder to a compact horizontal strip ("Add photo →") that expands to full portrait preview only after an image is selected. The user's first interaction should always be typing their thought, not navigating around a blank image placeholder.
**Design phase:** beSocial Redesign

---

### Finding S10: beSocial mobile navigation has no bridge back to NovaFit tracking modules
**Severity:** Medium
**Current state:** The social bottom nav (social-bottom-nav.component.html) has 5 items: Feed, Discover, Chat, Alerts, Me. There is no "Back to NovaFit" or "Today" navigation item. The desktop side nav has a "Back to NovaFit" link at the bottom (last item, below Logout). On mobile, the only path back to the main app is: browser back gesture, or tapping the "Today" FAB (which opens the read-only daily panel, not the dashboard).
**Best-in-class standard:** Apps with multiple functional shells (Spotify: music + podcast, Strava: tracking + social) always maintain a clear navigation bridge between shells. Spotify's mini-player is persistent. Strava's "Record" tab is available from both social feed and tracking contexts.
**Recommended fix:** Add a sixth navigation item to the social bottom nav — a "Today" icon link (`/user-dashboard`) — or replace one of the existing less-used items. Alternatively, make the daily panel FAB navigate to the dashboard on long-press / a specific tap gesture that isn't used by the panel toggle. The simplest fix: make the existing "Today" FAB a dual-purpose element: short tap = open panel, panel has a footer "Open Dashboard" link button.
**Design phase:** beSocial Redesign

---

## TOP 10 REDESIGN PRIORITIES

Ranked by Severity × User Impact. New findings only — items already in the implementation plan are noted but ranked separately.

| Rank | Finding ID | Title | Severity | Surface | Design Phase |
|---|---|---|---|---|---|
| 1 | D1 | No goal-relative progress visualization — daily goal completion is invisible | Critical | Dashboard | Dashboard Redesign |
| 2 | S1 | Linked fitness content visually subordinate to post metadata | Critical | beSocial | beSocial Redesign |
| 3 | D3 | Ctrl-bar occupies prime above-fold real estate with actions, not progress | High | Dashboard | Dashboard Redesign |
| 4 | D4 | Zero emotional feedback or goal-completion states | High | Dashboard | Dashboard Redesign |
| 5 | S3 | No pull-to-refresh on the feed — stale content with no obvious fix | High | beSocial | beSocial Redesign |
| 6 | D5 | Streak visual weight insufficient — reads as metadata, not primary motivator | High | Dashboard | Dashboard Redesign |
| 7 | S4 | Profile is social-first, not athletic-identity-first | High | beSocial | beSocial Redesign |
| 8 | D6 | Day 1 new user sees identical UI to returning user — no guided state | High | Dashboard | Dashboard Redesign |
| 9 | S5 | Discover empty states have no conversion CTA — highest-churn moment | High | beSocial | beSocial Redesign |
| 10 | S8 | Daily panel FAB is read-only — mobile users have no log-from-social path | Medium | beSocial | beSocial Redesign |

**Just outside top 10 (implement in same sprint):**
- D2: Card hierarchy inverted on mobile (High)
- D8: Macro entry form-first, not progress-first (Medium)
- S2: Post card chrome-heavy (High)
- S6: Notifications flat list with wrong timestamp format (Medium)
- S9: Create-content dialog image-before-text (Medium)
- S10: No mobile bridge from beSocial to tracking (Medium)

---

## FINDINGS NOT IN THE PRIOR AUDIT (new discoveries from template inspection)

The following findings are net-new and not addressed in `full-platform-audit.md` or `ux-audit-implementation-plan.md`:

1. **D1** — Goal-relative progress ring/bar absent from Dashboard entirely (implementation plan addressed streak, not calorie/macro goal progress)
2. **D2** — Mobile card stacking order is inverted (Hydration should be first, not last)
3. **D3** — Ctrl-bar placement priority problem (action items above progress data)
4. **D4** — Zero positive reinforcement states — only threat-based streak warning exists
5. **D8** — Macro inputs have no progress visualization against daily targets
6. **S1** — Linked-content-preview card rendered at near-invisible visual weight
7. **S2** — Post card chrome-to-content ratio favors chrome
8. **S3** — No pull-to-refresh implemented
9. **S7** — No fitness-specific reactions (only generic heart)
10. **S8** — Daily panel FAB in social shell is informational-only, no log actions
11. **S9** — Create-content dialog is image-first, not text-first
12. **S10** — Mobile bottom nav in beSocial has no bridge back to tracking

These 12 findings extend the prior audit and should be scheduled alongside the 10 existing fixes in the implementation plan. Findings D4, S1, and S8 should be prioritized for the next sprint alongside Fix 3 (post-log reward), as they address the same motivational feedback loop at different touch points.
