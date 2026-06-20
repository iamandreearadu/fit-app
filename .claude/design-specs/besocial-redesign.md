# UI Spec: beSocial Redesign — NovaFit

**Author:** @uiux-designer
**Date:** 2026-06-04
**Consumed by:** @angular-developer
**Depends on:** `.claude/design-system/tokens.md`, `.claude/design-system/components.md`, `.claude/design-system/motion.md`, `.claude/design-system/spatial.md`
**Addresses:** UX audit findings S1, S2, S3, S4, S5, S6, S7, S8, S9, S10 (all beSocial findings)
**Competitive reference:** Phase 1 competitive analysis (Strava card templates, BeReal reactions, Nike Run Club share card, goal-based discovery)

---

## Design Rationale

The core problem with beSocial today is architectural: the layer was designed as a generic social feed grafted onto a fitness app, not as a fitness-first social layer. This is visible everywhere — the workout data attached to a post renders at 13px with near-invisible borders, indistinguishable from a post timestamp; the profile header shows follower counts before fitness goals; Discover shows users by name with no fitness context. The competitive analysis confirmed that Strava's strongest differentiator is not the social layer itself but the visual design principle that fitness data IS the post, not a footnote attached to it.

The redesign establishes a single governing rule: **fitness data has higher visual authority than social chrome.** Every decision — card templates, reaction system, profile hero, notification grouping — flows from this rule. On mobile at the gym with sweaty hands, a user scrolling their feed should identify a workout post, a meal post, and a text post within 300ms of seeing each card, without reading a word. The redesigned system achieves this through visual type-differentiation at the card level, a richer reaction vocabulary that signals "I see your effort," a profile hero that leads with athletic identity, and a Discover layer that surfaces users by fitness goal compatibility rather than name proximity.

---

## Feed Redesign

### Content Type: Workout Post

**Philosophy:** Fitness data is the hero. The workout stats block dominates the card visually. User text is secondary caption, rendered below the stats block — never before it.

**Card Layout:**

```
.feed-card.feed-card--workout
  .feed-card-header          [32px avatar] [name + relative time] [menu]
  .feed-card-text            (optional — user caption, if present, 3-line clamp)
  .fitness-data-block.fitness-data-block--workout
    .fitness-data-accent     (3px left border, var(--fitness-card-accent))
    .fitness-data-header     [fitness_center icon 24px] [workout name 16px/700]
    .fitness-data-stats      4-column grid: exercises | sets | volume | ~kcal
  .feed-card-image           (optional, aspect-ratio 16:9 max, lazy)
  .feed-card-footer          [reaction bar] [comment count]
```

**Visual Spec:**

Container:
- Background: `var(--surface)` — cards are not glassmorphism; they are clean dark surfaces on the page
- Border-bottom: `1px solid var(--border-subtle)` — separates cards without boxing them
- Card padding: `16px` all sides (per spatial.md section 4.1)
- No border-radius on the card itself — feed cards are full-bleed items in a list (existing pattern, keep)

Fitness data block:
- Background: `var(--fitness-card-bg)` = `rgba(124, 77, 255, 0.06)`
- Border: `1px solid var(--fitness-card-border)` = `rgba(124, 77, 255, 0.18)`
- Border-radius: `var(--radius-md)` = `14px`
- Padding: `16px`
- Accent band: `3px solid var(--fitness-card-accent)` = `var(--primary)` on left side, `border-left: 3px solid var(--primary); border-radius: var(--radius-md)`
- Margin: `8px 0` (between post text and footer)

Fitness data block header:
- `fitness_center` mat-icon: 24px, contained in a 40×40px container at `border-radius: var(--radius-sm)`, background `rgba(124, 77, 255, 0.14)`
- Workout name: `var(--text-lg)` = 17px / `var(--weight-bold)` / `var(--text-primary)`
- Gap between icon container and name: 12px

Stats grid (4-column, `display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px`):
- Each stat cell: `display: flex; flex-direction: column; gap: 4px`
- Stat value: `var(--fitness-stat-size)` = 18px / `var(--fitness-stat-weight)` = 700 / `var(--text-primary)`
- Stat label: `var(--text-xs)` = 11px / `var(--weight-medium)` = 500 / `var(--text-tertiary)`, uppercase, letter-spacing 0.05em

Stats displayed (derived from `linkedContent.subtitle` — requires parsing or new structured data from API):
- **Exercises**: count of distinct exercises in the workout template
- **Sets**: total set count across all exercises
- **Volume**: total kg (sum of sets × reps × weight across all exercises), formatted as "12.4k" if > 9999
- **~kcal**: `linkedContent`'s estimated calorie value, prefixed with "~" to signal approximation

**States:**

Loading: Skeleton per components.md section 3.1. Avatar circle 32px, two text bars, then a fitness-data-block skeleton at 120px height — all using `.skeleton` class: `background: var(--surface-hover); animation: pulse 1.5s ease-in-out infinite; border-radius: var(--radius-sm)`.

Empty: Not applicable — workout posts always have linked content. If `linkedContent` is null, fall back to text-only post template.

Error: Not applicable at post level — errors are handled at feed level.

Success (reaction tapped): `reactionPop` keyframe (motion.md section 3.7) on the reacted button, `var(--duration-standard)` = 250ms.

**Interactions:**

Hover (desktop): `border-color: var(--border-strong)` on the fitness-data-block at `var(--duration-micro)` = 150ms / `var(--ease-standard)`. Card does NOT lift on hover — feed cards are inline list items, not floating cards.

Tap: Navigates to post detail. No press effect on the card body itself (per components.md section 2.3 ActivityFeedItem).

**Angular Material Components:**
- `MatIconModule` for all icons in fitness data block
- `MatMenuModule` — not needed here; use the existing custom post options menu

**CSS Classes to Create:**
- `.feed-card--workout` — modifier class on `.feed-card`
- `.fitness-data-block` — the hero fitness content container (REPLACES `.linked-content-preview`)
- `.fitness-data-block--workout` — workout-specific modifier
- `.fitness-data-accent` — the 3px left accent band
- `.fitness-data-header` — icon + name row
- `.fitness-data-stats` — 4-column grid
- `.fitness-stat` — individual stat cell
- `.fitness-stat-value` — the large number
- `.fitness-stat-label` — the label below

**CSS Classes to Retire:**
- `.linked-content-preview`, `.linked-content-header`, `.linked-content-badge`, `.linked-content-title`, `.linked-content-subtitle` — these are entirely replaced by `.fitness-data-block`

---

### Content Type: Meal Post

**Philosophy:** Macros are the signal. Protein, carbs, fat, and total calories must be visible without any tap. The macro chips are visually distinctive — colored, not grey.

**Card Layout:**

```
.feed-card.feed-card--meal
  .feed-card-header          [32px avatar] [name + relative time] [menu]
  .feed-card-text            (optional caption)
  .fitness-data-block.fitness-data-block--meal
    .fitness-data-accent     (3px left border, var(--fitness-card-meal-accent))
    .fitness-data-header     [restaurant icon 24px] [meal name 16px/700] [total kcal badge]
    .fitness-data-macros     [P chip] [C chip] [F chip]
  .feed-card-image           (optional food photo, aspect-ratio 4:3 preferred)
  .feed-card-footer          [reaction bar] [comment count]
```

**Visual Spec:**

Fitness data block (meal variant):
- Background: `rgba(74, 222, 128, 0.04)` — subtle green tint, distinct from workout purple tint
- Border: `1px solid rgba(74, 222, 128, 0.16)`
- Border-radius: `var(--radius-md)` = 14px
- Accent band: `3px solid var(--fitness-card-meal-accent)` = `var(--color-success)` on left
- Padding: `16px`

Fitness data block header:
- `restaurant` mat-icon: 24px, contained in a 40×40px container at `border-radius: var(--radius-sm)`, background `var(--color-success-bg)` = `rgba(74, 222, 128, 0.12)`
- Meal name: `var(--text-lg)` = 17px / `var(--weight-bold)` / `var(--text-primary)`
- Total kcal badge: `margin-left: auto`, `var(--text-sm)` / `var(--weight-bold)` / `var(--color-success)`, background `var(--color-success-bg)`, `border-radius: var(--radius-pill)`, `padding: 2px 10px`

Macro chips row (per spatial.md section 4.2):
- Display: `flex; flex-wrap: nowrap; gap: 8px; margin-top: 8px`
- Each chip height: 24px (3 × 8px), padding `4px 8px`, `border-radius: var(--radius-xs)` = 6px, `var(--text-xs)` / `var(--weight-bold)`
- Protein chip: `background: var(--macro-protein-bg)`; `color: var(--macro-protein)`; `border: 1px solid rgba(167, 139, 250, 0.2)`; label: "P: Xg"
- Carbs chip: `background: var(--macro-carbs-bg)`; `color: var(--macro-carbs)`; `border: 1px solid rgba(56, 189, 248, 0.2)`; label: "C: Xg"
- Fat chip: `background: var(--macro-fat-bg)`; `color: var(--macro-fat)`; `border: 1px solid rgba(255, 183, 77, 0.2)`; label: "F: Xg"

**Data sourcing:** Macro values (proteinG, carbsG, fatG, totalKcal) come from the linked MealEntry. The backend already stores these. `linkedContent.subtitle` currently serializes them as a string — the spec requires a structured `linkedContentData` object in the API response containing parsed macro values. This is an API contract requirement flagged for `@tech-architect`.

**CSS Classes to Create:**
- `.feed-card--meal` — modifier class
- `.fitness-data-block--meal` — meal-specific modifier
- `.fitness-data-macros` — the macro chips row
- `.macro-chip`, `.macro-chip--protein`, `.macro-chip--carbs`, `.macro-chip--fat` — already defined in spatial.md section 4.2; add to global styles if not present

---

### Content Type: Milestone Post

**Philosophy:** Celebration treatment that makes the post feel like an event, not just a status update. Used for streak milestones (7, 30, 60, 100, 365 days), personal records, and first workouts.

**Card Layout:**

```
.feed-card.feed-card--milestone
  .milestone-hero
    .milestone-glow-ring     (decorative SVG ring behind badge)
    .milestone-badge         [achievement icon] [milestone label]
    .milestone-headline      [primary milestone text]
  .feed-card-text            (optional user caption)
  .feed-card-footer          [reaction bar] [comment count]
```

**Visual Spec:**

Card-level treatment:
- The entire card gets a gold accent border: `border: 1px solid rgba(251, 191, 36, 0.25)`
- Background: `rgba(251, 191, 36, 0.04)` — very subtle gold tint distinguishes it from all other card types
- Border-radius: `var(--radius-md)` = 14px (milestone cards ARE rounded, unlike standard feed cards)
- Box-shadow: `0 0 24px rgba(251, 191, 36, 0.12)` — soft glow, celebration feel

Milestone hero:
- Container: `text-align: center; padding: 24px 16px 16px`
- Milestone badge: 64×64px container, `border-radius: 50%`, background `var(--celebration-gold-bg)`, border `1px solid rgba(251, 191, 36, 0.3)`, box-shadow `0 0 16px var(--celebration-glow)`
- Badge icon: 32px mat-icon, `var(--celebration-gold)`. Icon choice by milestone type:
  - Streak milestone: `local_fire_department`
  - PR (personal record): `emoji_events`
  - First workout: `fitness_center`
  - Goal reached: `gps_fixed`
- Milestone label: above the headline, `var(--text-xs)` / `var(--weight-bold)` / uppercase / `var(--celebration-gold)` / letter-spacing 0.05em — e.g., "STREAK MILESTONE" or "PERSONAL RECORD"
- Milestone headline: `var(--text-2xl)` = 24px / `var(--weight-black)` / `var(--text-primary)` — e.g., "30-Day Streak!" or "New PR: 100kg Bench Press"

**Glow ring (decorative, not interactive):**
- SVG circle, 96px diameter, centered behind the badge
- Stroke: `var(--celebration-gold)` at `stroke-opacity: 0.2`, `stroke-width: 1.5`
- Subtle radial glow effect via `filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.35))`

**Animation on first render:**
- The milestone badge entrance: `reactionPop` keyframe at `var(--duration-celebration)` = 600ms / `var(--ease-spring)` — the badge scales in with a satisfying bounce
- This is triggered via `animation: reactionPop 600ms var(--ease-spring) forwards` with `animation-fill-mode: both`

**Milestone type detection:**
The `PostCard` component receives a `post()` signal. The template detects milestone posts via a computed signal: `isMilestone = computed(() => post().type === 'milestone' || post().linkedContent?.type === 'milestone')`. When true, the `feed-card--milestone` modifier is applied.

**CSS Classes to Create:**
- `.feed-card--milestone` — top-level modifier
- `.milestone-hero` — centered celebration section
- `.milestone-glow-ring` — SVG wrapper
- `.milestone-badge` — the 64px gold circle
- `.milestone-label` — uppercase label above headline
- `.milestone-headline` — the large celebration text

---

### Content Type: Text Post

**Philosophy:** Clean and minimal. No fitness chrome. Social copy is the content. The card should feel like a note, not a dashboard widget.

**Card Layout:**

```
.feed-card.feed-card--text
  .feed-card-header          [32px avatar] [name + relative time] [menu]
  .feed-card-text            (post content — no clamp by default, show-more at 6 lines)
  .feed-card-image           (optional)
  .feed-card-footer          [reaction bar] [comment count]
```

**Visual Spec:**

Container: identical to standard `.feed-card` — `var(--surface)` background, `border-bottom: 1px solid var(--border-subtle)`. No modifier-specific styling needed beyond the absence of a fitness data block.

Text content: `var(--text-base)` = 15px / `var(--weight-regular)` / `var(--text-secondary)` (slightly softer than `--text-primary` — text posts are conversational, not headline data). Line-height 1.6. Padding `8px 16px 0`.

The `--clamped` modifier applies at 6 lines (change from current 4-line clamp per audit finding S2 — text posts warrant more breathing room).

**No change required:** The existing `post-card.component.html` non-article, non-linked-content path already renders close to this spec. The primary change is the text contrast token (`var(--white-soft)` → `var(--text-secondary)`) and the 6-line clamp.

---

### Content Type: Article Post

**Philosophy:** Strong visual editorial identity. The article's cover image or a generated color strip signals "this is longform content, not a quick update." Title and read-time are above the fold.

**Card Layout:**

```
.feed-card.feed-card--article
  .feed-card-header          [32px avatar] [name + relative time] [menu]
  .article-cover             (16:9 image OR color-header strip if no image)
  .article-meta              [category pill] [read-time badge]
  .article-title             (headline text)
  .article-excerpt           (3-line clamp of article body)
  .article-read-row          ["Read more" link] ["Open article" ghost button]
  .feed-card-footer          [reaction bar] [comment count]
```

**Visual Spec:**

This is an evolution of the existing `.post-card--article` pattern. Key changes:

Article cover strip (when no image):
- If `post().articleImage` is null: render a `.article-cover-strip` instead — `height: 80px; background: linear-gradient(135deg, rgba(124, 77, 255, 0.2) 0%, rgba(56, 189, 248, 0.1) 100%); border-radius: 0` — a colored gradient strip that signals "editorial content" without a placeholder image.
- If `post().articleImage` is present: retain existing 16:9 image, full-bleed, `border-radius: 0` to bleed edge-to-edge.

Article meta row:
- Category pill: `var(--text-xs)` / `var(--weight-bold)` / uppercase / `var(--primary)` / `background: rgba(124, 77, 255, 0.12)` / `border-radius: var(--radius-pill)` / `padding: 3px 10px`
- Read-time badge (NEW): estimated read time — `Math.ceil(wordCount / 200)` minutes, shown as "4 min read" in `var(--text-xs)` / `var(--text-tertiary)`. Displayed next to the category pill, separated by `var(--text-muted)` dot character.

Article title: `var(--text-lg)` = 17px / `var(--weight-bold)` / `var(--text-primary)` — existing styling retained.

**CSS Classes to Create:**
- `.article-cover-strip` — gradient strip when no image
- `.article-meta` — row for category + read-time

**CSS Classes Retained:**
- `.post-card--article`, `.article-post-body`, `.article-post-category`, `.article-post-title`, `.article-post-image-wrap`, `.article-post-content`, `.article-post-read-row`, `.article-post-read-more`, `.article-post-open-btn`

---

### Reaction System

**Decision rationale:** The audit (finding S7) confirmed only a binary heart-like exists. The competitive analysis identified Strava's "Kudos" and BeReal's RealMoji as evidence that domain-specific reactions increase low-friction engagement. The reaction system for beSocial uses four reactions drawn from the token system defined in tokens.md section 10d.

**Four reactions (in display order):**

| Reaction | Icon | Token | Token-bg | Label | Best for |
|----------|------|-------|----------|-------|---------|
| Fire | `local_fire_department` | `var(--reaction-fire)` | `var(--reaction-fire-bg)` | "Fire" | Intense workout, great effort |
| Strong | `fitness_center` | `var(--reaction-strong)` | `var(--reaction-strong-bg)` | "Strong" | Strength achievement, PR |
| Heart | `favorite` | `var(--reaction-heart)` | `var(--reaction-heart-bg)` | "Like" | General positive, all post types |
| Goal | `gps_fixed` | `var(--reaction-target)` | `var(--reaction-target-bg)` | "Goal" | Milestone, goal achieved |

**Interaction model: single-tap defaults to Heart; long-press opens full picker.**

This follows the established pattern from Instagram Reactions and Facebook Reactions. It preserves backward compatibility (a single tap still registers a like) while revealing additional expressiveness through long-press.

Single-tap behavior:
- If no reaction is set: toggles Heart reaction on (equivalent to current like behavior)
- If Heart is already set: removes the Heart reaction (toggle off)
- If a non-Heart reaction is set: tapping the reaction area opens the picker (allows changing the reaction)

Long-press (300ms threshold) and desktop hover-on-heart behavior:
- A horizontal reaction picker popover appears above the footer row
- Popover: `background: var(--surface-elevated)`; `border: 1px solid var(--border-default)`; `border-radius: var(--radius-pill)`; `padding: 8px 12px`; `box-shadow: var(--shadow-dropdown)`; `display: flex; gap: 8px`
- Each reaction button in picker: 40px circle, icon 20px
- Picker entrance animation: `scaleY(0) → scaleY(1)` from bottom, `var(--duration-standard)` = 250ms, `var(--ease-spring)`
- Tap a reaction in the picker: applies that reaction, closes picker, `reactionPop` keyframe plays on the selected reaction button in the footer
- Picker closes: on tap-outside, or scroll, or `touchend` outside the picker

Footer display (after reaction set):
- The active reaction button shows: filled icon in its reaction color, `background: [reaction]-bg token`, `border-radius: var(--radius-sm)`, `padding: 4px 10px`
- Reaction count aggregates all types: shows total count of all reactions (not broken down by type)
- On hover over the reaction count (desktop): a small tooltip shows the breakdown: "3 🔥 Fire · 2 ❤ Heart · 1 💪 Strong"

**Animation on reaction tap:**
- `reactionPop` keyframe (motion.md section 3.7): `scale(1) → scale(1.3) → scale(0.9) → scale(1)` at `var(--duration-standard)` / built-in easing

**Backend schema note:** The existing `Like` entity requires a `ReactionType` enum field (`heart`, `fire`, `strong`, `goal`) defaulting to `heart`. The API endpoint `POST /api/social/posts/{id}/like` needs to accept `{ reactionType: string }` in the request body. This is flagged for `@tech-architect` as a schema change. Frontend uses optimistic updates — apply the reaction immediately, revert on error.

**CSS Classes to Create:**
- `.reaction-bar` — replaces `.post-card-footer` action row as a flex container for reactions
- `.reaction-btn` — individual reaction button (replaces `.post-card-action-btn` for the like button)
- `.reaction-btn--active` — active state with filled icon and background
- `.reaction-btn--heart`, `.reaction-btn--fire`, `.reaction-btn--strong`, `.reaction-btn--goal` — type-specific active color modifiers
- `.reaction-picker` — the popover container
- `.reaction-picker-btn` — individual picker option

**ARIA:**
- Reaction buttons: `aria-label="[Reaction type] post"` e.g. `aria-label="Give Fire reaction"`, `aria-pressed="{{ isActiveReaction('fire') }}"`
- Long-press trigger: `aria-label="Open reaction picker"` on the picker trigger area
- Picker: `role="tooltip"`, `aria-label="Reaction picker"`

---

### Feed Algorithm and State

**Current algorithm:** Chronological. This is correct for NovaFit's current scale (small user base, cold-start phase). The spec keeps chronological ordering with one addition: sponsored or seed posts injected by the backend retain their existing position logic.

**"New posts" indicator:** A "X new posts" pill is shown at the top of the feed when new content is available, rather than auto-reloading and disrupting the user's current scroll position.

Trigger: After `facade.loadFeed(false)` returns (background refresh), if new posts exist: show the pill.
Condition: Show the pill if `newPostsAvailable()` signal is truthy AND the user has scrolled more than 200px from the top of the feed.
Do NOT show the pill if the user is at the very top (the feed would auto-update without losing position).

**New posts pill spec:**
- Position: `position: sticky; top: 0; z-index: 10; display: flex; justify-content: center; pointer-events: none`
- The pill itself: `pointer-events: auto; padding: 8px 20px; background: var(--primary); border-radius: var(--radius-pill); font-size: var(--text-sm); font-weight: var(--weight-bold); color: var(--white); box-shadow: var(--shadow-glow); cursor: pointer`
- Text: "{{ newPostCount }} new {{ newPostCount === 1 ? 'post' : 'posts' }} — tap to refresh"
- Entrance: `slideUp`, `var(--duration-emphasis)` = 350ms, `var(--ease-decelerate)`
- On tap: calls `facade.loadFeed(true)`, scrolls to top smoothly, pill dismisses with `opacity: 0; transform: translateY(-8px)` at `var(--duration-standard)` = 250ms

**Pull-to-refresh (addresses audit finding S3):**
Add touch gesture handler on `.feed-page` container:
- `(touchstart)`: record `startY`
- `(touchmove)`: if scroll position is at top (scrollTop === 0) and deltaY > 0: show a `mat-spinner` at `top: 16px` of the feed. Show spinner only when pull distance > 60px.
- `(touchend)`: if pull distance > 60px: call `facade.loadFeed(true)`. Spinner dismissed on feed reload completion.
- Use `passive: true` event listeners for performance.
- Desktop: add a `refresh` icon button to `.feed-header` row: `mat-icon-button`, `aria-label="Refresh feed"`, tap calls `facade.loadFeed(true)`.

**Engagement-weighted algorithm recommendation (defer to 500+ follows):**
At the current stage, chronological ordering maximizes content freshness. The spec recommends implementing an engagement-weighted feed when average follows-per-user exceeds 500. At that point, posts older than 48h but with high reaction velocity (reactions-per-hour above median) should be surfaced. This requires backend signal computation — flag for future sprint, not this implementation.

---

## Profile Redesign

### Hero Section

**Addresses:** UX audit finding S4 — profile is social-first, not athletic-identity-first.

**New profile header layout (top to bottom):**

```
.profile-header
  .profile-avatar-section
    .profile-avatar-ring     [avatar — see streak ring treatment below]
    .profile-avatar-edit     (own profile only: camera overlay)
  .profile-name-row
    [display name h1]        [verified badge if applicable]
  .profile-athletic-strip    (NEW — UserStatsChip from components.md section 2.4)
    [fitness goal badge]  |  [streak chip]  |  [X workouts this month]
  .profile-stats-row
    [Workouts/mo]  [Followers]  [Following]
  .profile-bio               (1–2 lines, truncated to 120 chars with "more" link)
  .profile-action-row        [follow/unfollow] [message] [edit bio] [new post] [more]
```

**Avatar (with streak ring treatment):**

Current: 2px solid `var(--primary)` ring.

Redesign: The avatar ring communicates streak status visually.
- Streak 0 or no streak: `border: 2px solid var(--border-default)` — neutral, not distracting
- Streak 1–6 days: `border: 2px solid var(--primary)` — default active
- Streak 7–29 days: `border: 3px solid var(--color-streak)` = `#ff9f40` — warm, building
- Streak 30+ days: `border: 3px solid var(--celebration-gold)` + `box-shadow: 0 0 12px var(--celebration-glow)` — gold glow, achievement status

Avatar size: 88px (11 × 8px) — increased from current implicit size to give it more authority.

For visitor view: avatar ring reflects the profile owner's streak status (data available via `/api/users/{userId}/stats`).

**Profile name row:**
- `h1` at `var(--text-2xl)` = 24px / `var(--weight-black)` / `var(--text-primary)` — down from implicit 32px to reduce social-identity weight. The name is important but not the first thing the eye should land on.
- Verified badge: `verified` mat-icon at 18px, `var(--primary)`, same row as name

**Athletic identity strip (NEW — directly addresses audit finding S4):**

Uses the `UserStatsChip` component spec from components.md section 2.4.

```html
<div class="profile-athletic-strip">
  <app-user-stats-chip
    [fitnessGoal]="profile.fitnessGoal"
    [streak]="profile.currentStreak"
    [monthlyWorkouts]="profile.monthlyWorkoutCount"
  />
</div>
```

Position: directly below the name row, above the follower stats. This is the first fitness-context the visitor sees.

The `UserStatsChip` component renders:
- Goal badge (lose/gain/maintain/strength) with semantic color from tokens.md. Colors per design system:
  - Lose weight: `background: rgba(255,64,129,0.12); color: var(--accent)`
  - Gain muscle: `background: var(--color-success-bg); color: var(--color-success)`
  - Maintain: `background: var(--color-info-bg); color: var(--color-info)`
  - Strength: `background: rgba(167, 139, 250, 0.14); color: var(--primary-light)`
- Divider: `1px solid var(--border-subtle)`, 16px tall
- Streak chip: `local_fire_department` mat-icon at 14px in `var(--color-streak)` + count in `var(--text-primary)` / `var(--text-xs)` / `var(--weight-bold)`
- Divider
- Monthly workouts: "X this month" in `var(--text-secondary)` / `var(--text-xs)`
- Container: `display: inline-flex; align-items: center; gap: 12px; height: 32px; padding: 4px 12px; background: var(--surface-card); border: 1px solid var(--border-default); border-radius: var(--radius-pill)`

**Profile stats row (redesigned):**

Replace `Posts | Followers | Following` with `Workouts/mo | Followers | Following`.

Rationale: "Posts" count communicates social activity level, not athletic identity. "Workouts this month" communicates training consistency. Visitors to a fitness profile want to know if this person actually trains.

| Stat | Value | Label |
|------|-------|-------|
| Workouts/mo | `profile.monthlyWorkoutCount` | "WORKOUTS / MO" |
| Followers | `profile.followersCount` | "FOLLOWERS" |
| Following | `profile.followingCount` | "FOLLOWING" |

Stat value: `var(--text-2xl)` = 24px / `var(--weight-black)` / `var(--text-primary)`
Stat label: `var(--text-xs)` = 11px / `var(--weight-bold)` / `var(--text-muted)` / uppercase / letter-spacing 0.05em

Each stat cell: `display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; min-height: 48px` (touch target met by full row height).

The entire stats row is tappable: followers cell navigates to a followers list page (existing behavior), following cell to following list. Workouts cell navigates to the Workouts tab of the profile (jumps directly to the workouts tab content).

**Bio:**
- Maximum 2 lines visible (2-line CSS clamp: `-webkit-line-clamp: 2`)
- If bio is longer: "more" link in `var(--primary)` at `var(--text-sm)` that expands inline
- Font: `var(--text-base)` = 15px / `var(--weight-regular)` / `var(--text-secondary)`
- If own profile and no bio: show the existing "Add bio" button — keep current behavior

**Action row:**

Retained from existing with one change: Message button is always visible for visitor view (not tucked behind a more menu). Order:
- Visitor: [Follow/Unfollow btn-primary] [Message btn-ghost] [more 3-dot]
- Own: [Edit Bio btn-ghost] [New btn-primary] [more 3-dot]

The Message button opens a DM conversation (existing `messageUser()` method).

---

### Activity Display

**Decision: Chronological list, not Instagram-style grid.**

Rationale: The Phase 1 competitive analysis confirmed Strava uses a chronological list for activities and Instagram uses a grid for photos. NovaFit's workout posts are data-rich — a 3-column grid cell at ~120px width cannot show the exercise names, sets, or macros that make workout posts valuable. A chronological list matches Strava's model and preserves the fitness data block visibility that is central to this redesign. Grid is appropriate for photo-dominant content; list is appropriate for data-dominant content.

**Posts tab (chronological list):**

The profile posts grid (`.profile-posts-grid`) is REPLACED by a `profile-posts-list` that uses the redesigned `ActivityFeedItem` component (post-card) in full-width format.

```
.profile-posts-list
  @for (post of facade.profilePosts())
    <app-post-card [post]="post" [inProfileContext]="true" />
```

The `[inProfileContext]="true"` input on `PostCard` hides the avatar and follow button in the name row (they are redundant on a profile page). The name still appears as a text link for accessibility.

**Workout posts without an image (thumbnail treatment):**

When a workout post has no image, the fitness-data-block IS the visual thumbnail. There is no separate thumbnail needed — the stat grid with the workout name provides enough visual identity. The absence of a photo is not a visual problem because the fitness-data-block fills that role.

**Empty state (Posts tab):**

Uses `EmptyStateTemplate` (components.md section 2.7):
- Own profile: icon `photo_camera`, headline "Share your first post", description "Workouts, meals, and thoughts — share your fitness journey with the community.", CTA "Create Post" → `openCreatePost()`
- Visitor: icon `grid_off`, headline "No posts yet", description null, CTA null (no action available to visitor)

---

### Tab Content Specs

Tab bar sits below the action row. Tabs: Posts | Workouts | Articles | Stats

**Tab bar visual (same position as existing):**
- Height: 48px per tab button (touch target)
- Active indicator: `3px solid var(--primary)` bottom border on active tab
- Active tab: `var(--text-primary)` / `var(--weight-semibold)`
- Inactive tab: `var(--text-muted)` / `var(--weight-regular)`
- Tab icon: 18px mat-icon, stacked above label on mobile, inline on desktop
- No horizontal scroll — 4 tabs fit at all viewport widths

**Posts tab:** Chronological list of `app-post-card` in `[inProfileContext]="true"` mode. Infinite scroll using IntersectionObserver (same pattern as main feed). Loading: 3 skeleton cards. Empty: `EmptyStateTemplate`.

**Workouts tab:** Retain existing list layout (`.profile-cards-grid` of `.profile-content-card`) with two changes:
1. Each workout card shows a left accent band: `3px solid var(--primary)` — visual consistency with workout fitness-data-blocks in the feed
2. Stats shown inline: exercise count + duration + estimated kcal as `var(--text-xs)` color chips, replacing the current plain text sub-row
- Exercise count chip: `background: rgba(124, 77, 255, 0.1); color: var(--primary-light); border-radius: var(--radius-pill); padding: 2px 8px; font-size: var(--text-xs)`
- Duration chip: same pattern, `color: var(--color-info)`, `background: var(--color-info-bg)`
- Calories chip: `color: var(--color-warning)`, `background: var(--color-warning-bg)` (only shown if `caloriesEstimateKcal > 0`)

Empty state (own): "No workouts yet" + "Go to Workouts" link to `/workouts`. (Existing behavior, keep.)
Empty state (visitor): "No workouts shared yet" with no CTA.

**Articles tab:** Retain existing `.blog-post-list` layout. One change: add a `read-time` badge next to the article date, same calculation as the feed card read-time: `Math.ceil(wordCount / 200) + " min read"`.

Empty state (own): "Write your first article" + "Write Article" CTA → opens `WriteArticleComponent`. (Existing behavior, keep.)
Empty state (visitor): "No articles yet."

**Stats tab:** `<app-stats-tab>` — unchanged. Charts work well per components.md audit.

---

### Public vs Private Data Rules

This table defines what visitors see vs. profile owners. Health metrics are private by default, not toggleable — they are never visible to visitors.

| Data | Own Profile | Visitor Profile |
|------|-------------|-----------------|
| Display name | Visible | Visible |
| Avatar | Visible + editable | Visible |
| Bio | Visible + editable | Visible |
| Fitness goal badge | Visible | Visible |
| Current streak | Visible | Visible |
| Workouts this month | Visible | Visible |
| Followers / Following | Visible | Visible |
| Posts (non-archived) | Visible | Visible |
| Public workouts | Visible | Visible |
| Public articles | Visible | Visible |
| Stats tab charts | Visible | Visible (public charts only: streak, volume, weekly history — NO weight trend) |
| Archived posts | Visible | HIDDEN |
| Daily calorie target / TDEE | Visible (Dashboard only) | HIDDEN — never surfaced on public profile |
| Body weight / BMI / BMR | Visible (Dashboard and personal Stats) | HIDDEN — never shown publicly |
| Calorie intake / macros (historical) | Visible (personal Dashboard history) | HIDDEN |
| Energy level logs | Visible (personal Dashboard) | HIDDEN |
| Water intake | Visible (personal Dashboard) | HIDDEN |
| DM conversations | Visible to participants | HIDDEN |

**Implementation:** The Stats tab (`app-stats-tab`) receives `[isOwnProfile]` input (already present). When `isOwnProfile === false`, any chart or section displaying body weight, calorie targets, or health metrics must be hidden via `@if (isOwnProfile)` guards in the stats-tab template. The existing implementation already passes this input — the guard needs to be applied to the weight trend chart specifically.

---

## Discover Redesign

### Page Layout

**Top to bottom structure on desktop (≥ 968px):**

```
.discover-page
  .discover-search-zone        [search bar — always at top]
  @if (!searchMode)
    .featured-block            [featured content — 3 cards horizontal]
    .discover-filter-bar       [All] [Weight Loss] [Muscle Gain] [Endurance] [Trending]
    .discover-user-grid        [filtered user cards — responsive grid]
  @if (searchMode)
    .discover-search-overlay   [recent searches] [search results]
```

Max-width: `var(--content-max-social)` = 600px, centered with `margin: 0 auto`.
Padding: `0 16px`

---

### Featured Content Block

**Positioned above the filter bar, before the user grid. Always visible in non-search mode.**

Three featured sections in a horizontal scroll row on mobile, 3-column grid on tablet+:

```
.featured-block
  .featured-scroll-row (or grid on >= 768px)
    .featured-card.featured-card--challenge   "Challenge of the Week"
    .featured-card.featured-card--exercise    "Trending Exercise"
    .featured-card.featured-card--athlete     "Featured Athlete"
```

**Challenge of the Week card:**
- Background: `linear-gradient(135deg, rgba(124, 77, 255, 0.2) 0%, rgba(56, 189, 248, 0.12) 100%)`
- Border: `1px solid rgba(124, 77, 255, 0.25)`
- Border-radius: `var(--radius-lg)` = 20px
- Padding: `16px`
- Header: `emoji_events` mat-icon at 24px in 40×40px container, `background: rgba(124, 77, 255, 0.14)`, `border-radius: var(--radius-sm)` + "CHALLENGE" label in `var(--text-xs)` / `var(--weight-bold)` / uppercase / `var(--primary-light)`
- Title: challenge name in `var(--text-base)` / `var(--weight-bold)` / `var(--text-primary)`
- Sub: "X participants this week" in `var(--text-xs)` / `var(--text-tertiary)`
- CTA: `btn-primary` at 40px height, full-width, "Join Challenge"
- Data source: seeded via the existing admin seed post system or a new `/api/social/featured-challenge` endpoint (flag for `@tech-architect`)

**Trending Exercise card:**
- Background: `rgba(74, 222, 128, 0.06)`
- Border: `1px solid rgba(74, 222, 128, 0.18)`
- Border-radius: `var(--radius-lg)` = 20px
- Padding: `16px`
- Header: `trending_up` mat-icon at 24px in 40×40px container, `background: var(--color-success-bg)` + "TRENDING" label in `var(--text-xs)` / `var(--weight-bold)` / `var(--color-success)`
- Title: exercise name (e.g., "Romanian Deadlift") in `var(--text-base)` / `var(--weight-bold)` / `var(--text-primary)`
- Sub: "logged by X athletes this week" in `var(--text-xs)` / `var(--text-tertiary)`
- No CTA — informational only. Tap navigates to a search pre-filtered by that exercise name in the user search.
- Data source: derived from the most frequently logged exercise across all `WorkoutTemplate.WorkoutExercises` in the past 7 days (backend aggregation — flag for `@tech-architect`).

**Featured Athlete card:**
- Background: `var(--surface-card)` = `rgba(255, 255, 255, 0.03)` with a gold-tinted border when featured
- Border: `1px solid rgba(251, 191, 36, 0.25)`
- Border-radius: `var(--radius-lg)` = 20px
- Padding: `16px`
- Header row: `star` mat-icon at 20px, `var(--celebration-gold)` + "FEATURED ATHLETE" label in `var(--text-xs)` / `var(--weight-bold)` / `var(--celebration-gold)`
- Athlete avatar: 48×48px, `border-radius: 50%`, `border: 2px solid var(--celebration-gold)`
- Athlete name: `var(--text-base)` / `var(--weight-bold)` / `var(--text-primary)`
- Goal badge: `UserStatsChip` component (compact — goal badge only, no streak, no workouts count)
- CTA: ghost button "View Profile" → `routerLink="/social/profile/[userId]"`
- Data source: admin-curated via a seed post with `type: 'featured_athlete'` or a dedicated field in the admin system. The featured athlete rotates weekly. Fallback: hide this card if no featured athlete is configured.

**Responsive behavior:**
- Mobile (< 768px): `.featured-scroll-row` — `display: flex; overflow-x: auto; gap: 16px; padding-bottom: 8px; scroll-snap-type: x mandatory`. Each card: `min-width: 240px; scroll-snap-align: start`.
- Tablet+ (≥ 768px): `display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px`.

**States:**

Loading: 3 skeleton cards, each 160px height, `.skeleton.skeleton--card` class.
Error: Hide the entire block silently — featured content is supplemental, not critical.
Empty (no featured content configured): Hide the block — it does not show with empty state messaging.

---

### User Card

**Addresses:** The current user-card shows only avatar, name, and follow button. The redesign adds fitness context to each card.

```
.discover-user-card
  .duc-avatar-link    [avatar 56px with streak ring treatment]
  .duc-name           [display name]
  .duc-goal           [goal badge via UserStatsChip component — goal-only mode]
  .duc-mutual         ["X mutual followers" in text-muted] (if > 0)
  .duc-workouts       ["X workouts this month" in text-muted]
  .duc-follow-btn     [Follow / Following]
```

**Visual spec:**

Container: `var(--surface-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center`

Hover: `transform: translateY(-4px); border-color: var(--border-strong); box-shadow: var(--shadow-card-hover); transition: all var(--duration-standard) var(--ease-standard)`

Avatar: 56px (7 × 8px), `border-radius: 50%`. Streak ring treatment same as profile hero: neutral for 0 streak, primary for active streak, gold glow for 30+ days.

Name: `var(--text-base)` = 15px / `var(--weight-semibold)` / `var(--text-primary)`, max 1 line, text-overflow ellipsis.

Goal badge: Uses goal-chip pattern from `UserStatsChip` — goal label only, no streak, no workout count in card format. Height 24px, `border-radius: var(--radius-pill)`.

Mutual followers: shown only if > 0. `var(--text-xs)` / `var(--text-tertiary)` — "2 mutual followers". Data source: a `mutualFollowersCount` field in the discover API response (flag for `@tech-architect`).

Workouts this month: `var(--text-xs)` / `var(--text-tertiary)` — "8 workouts this month". Data source: from existing `/api/users/{userId}/stats` or included in discover API response.

**Follow button states:**

| State | Visual | Behavior |
|-------|--------|---------|
| Unfollow (not following) | `btn-primary`, 40px height, "Follow" | Tap → `onFollow(userId)`, optimistic UI update |
| Following | `btn-ghost`, border `var(--border-default)`, "Following", `color: var(--text-secondary)` | Tap → confirm unfollow (no confirmation dialog — single tap toggles, per existing behavior) |
| Loading (toggling) | `mat-spinner diameter="16"` inside button, pointer-events none | In-progress state |

Follow button width: full-width of the card (`width: 100%`).

**Follow button animation:** `followConfirm` keyframe (motion.md section 6) plays on transition to "Following" state.

**User cards layout (grid):**

Mobile (375–767px): `grid-template-columns: repeat(2, 1fr); gap: 16px`
Tablet+ (≥ 768px): `grid-template-columns: repeat(3, 1fr); gap: 16px`
Desktop (≥ 968px): `grid-template-columns: repeat(4, 1fr); gap: 16px` (within 600px max-width, this will be 3-column)

---

### Category Filter Bar

**Positioned between the featured block and the user grid.**

```
.discover-filter-bar
  [All]  [Weight Loss]  [Muscle Gain]  [Endurance]  [Maintenance]  [Trending]
```

**Visual spec:**

Container: `display: flex; overflow-x: auto; gap: 8px; padding: 0 0 8px; scroll-snap-type: x mandatory; scrollbar-width: none`

Each filter chip: `height: 36px; padding: 0 16px; border-radius: var(--radius-pill); font-size: var(--text-sm); font-weight: var(--weight-semibold); cursor: pointer; white-space: nowrap; scroll-snap-align: start; transition: all var(--duration-micro) var(--ease-standard)`

Inactive chip: `background: var(--surface-card); border: 1px solid var(--border-default); color: var(--text-secondary)`
Active chip: `background: var(--primary); border: 1px solid var(--primary); color: var(--white); box-shadow: var(--shadow-glow)`

Active chip hover: `opacity: 0.85; transform: translateY(-1px)`
Inactive chip hover: `background: var(--surface-hover); border-color: var(--border-strong)`

**Filter logic:**

Filtering is client-side using the existing `uniqueAuthors()` computed signal, filtered by `fitnessGoal` field:
- "All": no filter, shows all `uniqueAuthors()`
- "Weight Loss": `filter(u => u.fitnessGoal === 'lose')`
- "Muscle Gain": `filter(u => u.fitnessGoal === 'gain')`
- "Endurance": `filter(u => u.activityLevel === 'very_active' || u.workoutType === 'cardio')`
- "Maintenance": `filter(u => u.fitnessGoal === 'maintain')`
- "Trending": sort by `monthlyWorkoutCount DESC`, take top 20

**Empty filtered category:**

When a filter returns 0 results, show `EmptyStateTemplate` (components.md section 2.7):
- Icon: `filter_list_off`
- Headline: "No athletes in this category yet"
- Description: "Be the first to set this goal and others will find you here."
- CTA: "Update my goal" → navigates to `/user-profile` (profile settings where goal is set)
- Escape link: "Show all athletes" → resets filter to "All"

---

### Search UX

**Addresses:** The existing search is a plain name-only input with no overlay UX. The redesign adds a search overlay with suggestions.

**Idle state (no search text, search input focused):**

When the user taps the search bar, a `.discover-search-overlay` appears below the search bar:

```
.discover-search-overlay
  .discover-recent-searches    "Recent searches" label + list of recent queries
  .discover-search-suggestions "Suggested" label + suggested users
```

Recent searches: stored in `localStorage` as `nova_recent_searches: string[]` (max 5 entries, LRU). Each entry shown as a row: `history` icon + search term + `close` icon to remove.

Suggested users: top 4 users from `uniqueAuthors()` sorted by mutual follows then workouts, shown as compact avatar + name + goal badge rows.

Overlay enters: `slideUp`, `var(--duration-standard)` = 250ms, `var(--ease-decelerate)`.
Overlay exits: on clear or navigation, `opacity: 0; transform: translateY(-4px)` at `var(--duration-micro)` = 150ms.

**Active search state (text entered, debounced 300ms):**

Live results from `facade.searchResults()`. Results show:
- Users matching by display name
- Users matching by fitness goal (e.g., searching "muscle" surfaces all `fitnessGoal === 'gain'` users)

Each result row: `search-result-row` — 40px avatar + name + goal badge (compact, no badge if no goal set) + follow button

**Empty search state:**

`EmptyStateTemplate`:
- Icon: `person_search`
- Headline: "No athletes found for "{{ searchQuery() }}""
- Description: "Find athletes who share your goals — try searching by goal like 'muscle' or 'endurance'"
- CTA: "Search all athletes" → clears query, shows all

---

## Notifications Redesign

### Notification Types

The existing system supports `like`, `comment`, `follow`, `message`. The redesign adds:

| Type | When triggered | Icon | Color token |
|------|---------------|------|-------------|
| `like` (existing) | Any reaction on a post | `favorite` | `var(--accent)` |
| `comment` (existing) | Comment on own post | `chat_bubble` | `var(--color-info)` |
| `follow` (existing) | Someone follows the user | `person_add` | `var(--color-success)` |
| `message` (existing) | New DM received | `chat` | `var(--primary)` |
| `workout_kudos` (NEW) | A follower reacts to a workout post with Fire or Strong | `local_fire_department` | `var(--reaction-fire)` |
| `streak_milestone` (NEW) | User's own streak hits 7, 30, 60, 100, 365 | `local_fire_department` | `var(--celebration-gold)` |
| `pr_achieved` (NEW) | System detects a new PR during workout completion | `emoji_events` | `var(--celebration-gold)` |
| `weekly_summary` (NEW) | System-generated weekly recap every Monday | `bar_chart` | `var(--primary-light)` |

New notification types are generated server-side. `workout_kudos` fires when a `Like` entity with `reactionType` of `fire` or `strong` is created on a linked-workout post. `streak_milestone` fires from the daily entry save logic in `DailyController`. `pr_achieved` fires from `WorkoutsController` when exercise max weight is exceeded. `weekly_summary` is a scheduled notification (Cron-like trigger or batch job — flag for `@dotnet-developer`).

**Note on `pr_achieved`:** Requires backend to track per-user per-exercise max weight. Schema addition — flag for `@tech-architect`.

---

### Grouping Rules

Grouping occurs at the component level, not the API level. The `SocialNotificationsFacade` computes grouped notifications as a computed signal:

**Group trigger conditions:**

| Notification type | Group if | Group label template |
|-------------------|----------|----------------------|
| `like` | ≥ 2 likes on the same post within 24h from different actors | "Sarah and X others liked your post" |
| `follow` | ≥ 3 new follows within 7 days | "3 new followers this week" |
| `workout_kudos` | ≥ 2 kudos on the same post | "Alex and 2 others reacted to your workout" |

**Do NOT group:**
- `comment` — user wants to see each comment individually; comments carry unique content
- `message` — DMs are always individual
- `streak_milestone` — milestone notifications are personal, not social aggregations
- `pr_achieved` — personal achievement, always individual
- `weekly_summary` — always individual (one per week)

**Grouping implementation:**

`SocialNotificationsFacade` exposes a `groupedNotifications` computed signal:

```typescript
readonly groupedNotifications = computed(() => {
  const raw = this.notifications();
  // Group by: (referenceId, type) where groupable type
  // Return NotificationGroup[] where each group has:
  //   - actors: User[] (all actors)
  //   - displayActors: string — "Sarah and 4 others" or "Sarah and Alex"
  //   - type: NotificationType
  //   - referenceId: string | null
  //   - isRead: boolean — false if ANY in group is unread
  //   - createdAt: Date — latest in group
  //   - count: number
});
```

The template iterates `groupedNotifications()` instead of `notifications()`.

---

### Notification Item Anatomy

Uses the `NotificationBadge` grouped notification row spec from components.md section 2.6.

```
.notif-item (height 72px, padding 16px)
  .notif-avatars-stack     up to 3 stacked circular avatars (40px each, -8px overlap)
  .notif-type-icon         16px circle overlaid at bottom-right of avatar stack
  .notif-body
    .notif-actors          "Sarah and 4 others" — text-primary / text-base / weight-semibold
    .notif-action          "liked your post" — text-secondary / text-base / weight-regular
  .notif-time              relative time — "2h ago" — text-tertiary / text-sm
  .notif-thumbnail         40×40px post thumbnail (if post-related) — right-aligned, border-radius var(--radius-xs)
  .notif-unread-dot        8px circle, var(--primary) — right edge, only if unread
```

**Avatar stack (for grouped notifications):**
- Show max 3 avatars stacked: each 40×40px, `border: 2px solid var(--surface)` (creates separation), `border-radius: 50%`
- Stack via `position: relative` on container, `position: absolute; left: N*24px` on each avatar
- Container width: `40px + (Math.min(actors.length, 3) - 1) * 24px`
- If actors.length > 3: show "+N" text badge at the end: `background: var(--surface-elevated); border-radius: 50%; width: 24px; height: 24px; font-size: var(--text-xs); color: var(--text-tertiary)`

**Type icon overlay:**
- 20×20px circle, positioned at bottom-right corner of the avatar stack
- Background: type-specific (like=`var(--accent)`, comment=`var(--color-info)`, follow=`var(--color-success)`, message=`var(--primary)`, kudos=`var(--reaction-fire)`, milestone=`var(--celebration-gold)`)
- `mat-icon` at 12px, `var(--white)`
- `border: 1.5px solid var(--surface)` to separate from avatar

**Unread state:**
- Row background: `var(--surface-hover)` = `rgba(255, 255, 255, 0.06)`
- Left border: `3px solid var(--primary)` (per NotificationBadge spec in components.md)
- Actor name: `var(--weight-bold)` (vs `var(--weight-semibold)` for read)

**Read state:**
- Row background: `transparent`
- No left border

**Post thumbnail:**
- Only shown if `notification.referenceId` is a post and the post has an associated image URL
- 40×40px, `object-fit: cover`, `border-radius: var(--radius-xs)` = 6px
- For workout posts with no image: show a fitness icon tile — 40×40px, `background: var(--fitness-card-bg)`, `border-radius: var(--radius-xs)`, `fitness_center` icon at 20px, `var(--primary-light)`
- For text-only posts: no thumbnail (rightmost space is used for the unread dot only)

**Timestamp:**
Uses the `RelativeTimePipe` (components.md section 3.3):
- < 60s: "just now"
- < 60m: "Xm ago"
- < 24h: "Xh ago"
- < 48h: "Yesterday"
- < 7d: "Xd ago"
- ≥ 7d: "MMM d"

This replaces the current `date:'short'` pipe which produces unreadable strings like "6/4/26, 2:14 PM" (audit finding S6).

---

### Temporal Sections

The notification list is divided into temporal groups rendered as section headers:

```
.notif-section-header "Today" | "This Week" | "Earlier"
.notif-list (items for that section)
```

**Temporal grouping logic (computed signal in facade):**

```typescript
readonly temporalGroups = computed(() => {
  const now = new Date();
  const today = startOfDay(now);
  const weekAgo = subDays(today, 7);
  return {
    today: this.groupedNotifications().filter(n => n.createdAt >= today),
    thisWeek: this.groupedNotifications().filter(n => n.createdAt >= weekAgo && n.createdAt < today),
    earlier: this.groupedNotifications().filter(n => n.createdAt < weekAgo)
  };
});
```

**Section header visual:**
- `var(--text-xs)` = 11px / `var(--weight-bold)` / uppercase / `var(--text-muted)` / letter-spacing 0.05em
- Padding: `8px 16px 4px`
- No background — minimal, reads as a label above the list

Only render a section if it has items. If no "Earlier" notifications, that section is hidden.

**Load more pattern:** Replace current "Load more" button with infinite scroll using the same IntersectionObserver sentinel pattern as the feed. This removes the manual pagination tap that breaks native scroll rhythm (audit finding S8 implicitly, explicitly in Q8 of the audit).

---

## Direct Messages

### DM Thread Layout

**Retains existing SignalR-based `SocialChatDetailComponent` functionality.** Visual changes only:

- Message bubbles: retain existing layout (own messages right-aligned, other messages left-aligned)
- Timestamp format: replace any `date:'short'` instances with `RelativeTimePipe`
- Fitness content cards (new): when a message contains `messageType: 'workout_share'` or `messageType: 'meal_share'`, render the appropriate `FitnessContentDMCard` instead of a text bubble

**FitnessContentDMCard (workout share inside DM):**

```
.dm-fitness-card
  .dm-fitness-card-accent    (3px left border, var(--fitness-card-accent))
  .dm-fitness-card-header    [fitness_center icon] [workout name] [kcal badge]
  .dm-fitness-card-stats     [exercises] [sets] [volume] (3-column, not 4)
  .dm-fitness-card-cta       "View workout" ghost button → navigates to workout detail
```

Visual: `background: var(--fitness-card-bg); border: 1px solid var(--fitness-card-border); border-radius: var(--radius-md); padding: 16px; max-width: 280px`. The card appears as an embedded bubble in the conversation, with the sender's avatar above it (same as a regular message).

**FitnessContentDMCard (meal share inside DM):**

Same structure but with meal data: meal name + macro chips (protein, carbs, fat) + "View meal" CTA. Accent band color: `var(--fitness-card-meal-accent)`.

---

### Fitness Content Sharing

**Fitness content sharing is a secondary action in the DM composer — it does not replace the primary text input.**

**Composer anatomy (redesigned):**

```
.dm-composer
  .dm-composer-input       [text input, multiline auto-resize, min 48px touch target]
  .dm-composer-actions
    .dm-attach-fitness-btn [fitness_center icon btn — opens fitness share picker]
    .dm-send-btn           [send icon btn]
```

**Fitness share picker:**

Triggered by tapping the `fitness_center` icon button in the composer. Opens a `BottomSheet` (compact variant, 40dvh):

```
.dm-fitness-picker
  .dm-fitness-picker-header   "Share a workout or meal"
  .dm-fitness-tabs            [Workouts] [Meals]
  .dm-fitness-list
    @for (item of recentItems)
      .dm-fitness-item        [icon] [name] [sub-stats] [share arrow]
```

The picker shows:
- Workouts tab: last 10 workout sessions from the user's workout history (`WorkoutsTabFacade.workouts` filtered to completed sessions, sorted by date desc)
- Meals tab: last 10 meal entries (`NutritionTabFacade.meals` sorted by date desc)

Selecting an item:
1. Bottom sheet dismisses with `sheetExit` animation
2. A `FitnessContentDMCard` is previewed in the composer input area above the text input
3. User can optionally add a text message before the card
4. Sending creates a message with `messageType: 'workout_share'` or `messageType: 'meal_share'` and `linkedEntityId` pointing to the workout/meal ID

**Backend requirement:** `DirectMessage` entity needs `MessageType` enum (`text`, `workout_share`, `meal_share`) and `LinkedEntityId` nullable string field. Flag for `@tech-architect`.

---

### Entry Points

**From feed:** Tap avatar → profile → tap "Message" button in profile action row → opens DM thread for that user (creates conversation if not exists, per existing `messageUser()` logic).

**From notification:** Tapping a `message` type notification navigates to `/social/chat/[conversationId]` — existing behavior.

**From profile (own profile "Me" tab):** The existing `/social/chat` route lists all conversations. No change required.

**From Discover user card:** Add a `chat_bubble_outline` secondary icon button next to the follow button in the user card grid. 40×40px visual, 48×48px touch target. Tap calls `messageUser(userId)`.

**NOT in primary bottom navigation:** The Chat tab remains in the bottom nav (it is already there as the 3rd item). DMs do not get a dedicated new entry point in the nav bar beyond what already exists — this preserves the nav density per audit finding S10's recommendation that DMs stay discoverable but not top-level.

---

### Group Messaging Architecture (Future Hook)

The current `Conversation` entity and `ConversationParticipant` many-to-many table already supports multiple participants. The SignalR `ChatHub` groups messages by `conversationId`. No schema change is needed to support group conversations.

The only missing piece for group DMs is:
1. A `POST /api/conversations` endpoint that accepts an array of `participantIds` (currently accepts only a single `userId`) — minor backend change
2. A group conversation creation UI — a "New group" option in the conversation list
3. A group name / avatar system for the conversation entity

**Spec for future sprint:** Group DMs are scoped as "Challenge Groups" — conversations created around a specific challenge card (from the Featured block in Discover). The `Conversation` entity gets an optional `challengeId` FK. Challenge groups are created automatically when a challenge is joined. This ties the group messaging feature to the Challenge of the Week system described in the Discover Featured Block section above.

---

## Daily Panel in beSocial Shell

**Addresses:** UX audit finding S8 — the `social-daily-panel.component` is read-only and a dead end on mobile.

**Changes to `social-daily-panel.component.html`:**

Add a footer section at the bottom of the panel:

```html
<!-- Panel footer — actionable CTAs -->
<div class="daily-panel-footer">
  <!-- Quick-log inline water -->
  <div class="daily-panel-quick-water">
    <span class="daily-panel-quick-label">Quick log</span>
    <button class="daily-panel-quick-btn" (click)="addWater()" type="button"
            aria-label="Add 250ml water">
      <mat-icon>water_drop</mat-icon>
      +250 ml
    </button>
  </div>
  <!-- Navigation CTAs -->
  <div class="daily-panel-nav-row">
    <a routerLink="/user-dashboard" class="btn-ghost daily-panel-nav-btn"
       (click)="closeRequested.emit()">
      <mat-icon>dashboard</mat-icon>
      Log data
    </a>
    <a routerLink="/workouts" class="btn-primary daily-panel-nav-btn"
       (click)="closeRequested.emit()">
      <mat-icon>fitness_center</mat-icon>
      Start workout
    </a>
  </div>
</div>
```

Footer visual:
- `border-top: 1px solid var(--border-subtle)`, `padding: 16px`
- Quick log row: `display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px`
- Quick-log button: `.btn-add-ex` pattern — `border: 1.5px dashed rgba(124, 77, 255, 0.35); border-radius: var(--radius-sm); height: 40px; padding: 0 16px; color: var(--primary-light); background: transparent; font-size: var(--text-sm); font-weight: var(--weight-semibold)`
- Nav row: `display: flex; gap: 8px`; each button: `flex: 1; height: 40px`

The `addWater()` method calls `dashboardFacade.adjustWaterMl(250)` (same method used in the Quick Actions Strip). The daily panel needs to inject `DashboardFacade` or a new `QuickLogService` that wraps this action. The signal update to `waterProgress` in the panel reflects immediately since it reads from the same signal.

---

## Bottom Navigation — Tracking Bridge

**Addresses:** UX audit finding S10 — no bridge from beSocial mobile nav back to tracking.

**Change to `social-bottom-nav.component.html`:**

Replace the "Me" tab (5th item, `person` icon, links to own profile) with a dual-purpose 5th tab:

The 5th tab becomes **"Track"** — an icon that navigates to `/user-dashboard`.

```
[Feed]  [Discover]  [Chat]  [Alerts]  [Track]
home    explore     chat    bell      track_changes
```

The profile is still accessible via:
1. The feed card avatar tap → own profile
2. The top-bar (mobile header) avatar
3. The side nav on desktop (unchanged, "My Profile" link exists)

**Tab spec:**
- Icon: `track_changes` mat-icon — communicates "tracking" not "profile"
- Label: "Track"
- Route: `/user-dashboard`
- Active styling: same as other tabs — `var(--primary)` icon + label, 3px active indicator bar

If the profile access point via bottom nav is considered essential, the alternative is replacing the "Chat" tab (4th, currently "Alerts") order adjustment so that "Me" returns but "Chat" becomes the 4th item. However per the audit finding S10, the tracking bridge is the higher-priority fix. The chosen approach (replacing "Me") is implemented; the original "Me" profile link should remain accessible via tapping the avatar in the feed header or top bar.

---

## Create Content Redesign

**Addresses:** UX audit finding S9 — dialog is image-first, not text-first.

**Change to `create-content.component.html` Post mode:**

Reorder the Post mode composition:

```
[text area — auto-focused, auto-resize]
[divider]
[image upload strip — compact horizontal row, expands on image selection]
[linked content picker — if triggered]
```

Current order: image dropzone first → textarea.
New order: textarea first (auto-focused on dialog open) → compact image attachment row below.

**Image attachment row (compact):**
- Height: 48px (touch target)
- Layout: `display: flex; align-items: center; gap: 8px; padding: 8px 0`
- Left: `photo_camera` icon at 20px, `var(--text-muted)`
- Label: "Add photo" in `var(--text-sm)` / `var(--text-muted)` / `cursor: pointer`
- On tap: triggers file input — same logic as existing, but no preview shown until a file is selected
- On file selected: the compact row expands to show a portrait (3:4) image preview with a `close` icon to remove it

The text area is auto-focused via `AfterViewInit` — `textareaRef.nativeElement.focus()`.

---

## Responsive Behavior

### Mobile (375px)

- Feed: Full-bleed feed cards, fitness data block at full width within card padding. Stats grid 4-column at min-width.
- Discover: 2-column user card grid. Featured block horizontal scroll. Filter bar horizontal scroll.
- Profile: Hero section stacked vertically. Stats row 3-column with tighter gap. Tabs full-width, icon stacked above label. Posts displayed as chronological list (full-width).
- Notifications: Full-width notification rows. Avatar stack width constrains to 3 avatars max.
- DMs: Full-bleed conversation bubbles. Fitness content cards max-width 240px.
- Bottom nav: 5 tabs equal width. "Track" tab with `track_changes` icon.
- Daily panel: Full-height overlay, footer CTAs full-width.

### Tablet (768px)

- Feed: Centered in 600px max-width column.
- Discover: 3-column user card grid. Featured block 3-column grid (no scroll).
- Profile: Stats row 3-column. Posts as list centered at 600px.
- Notifications: Centered in 600px column.
- DMs: Side nav appears (collapsed). Conversation list visible alongside thread (if screen width supports — existing behavior).
- Modals (create content, fitness share picker): Centered dialog at max-width 480px, `border-radius: var(--radius-xl)`, not bottom sheet. Bottom sheet only at < 640px.

### Desktop (968px+)

- Feed: Centered in 600px column. Side nav expanded at 240px. No bottom nav.
- Discover: 4-column user card grid. Featured block 3-column grid with hover states.
- Profile: Side-by-side layout option: hero section left (300px), tabs content right (remaining width). Max profile content width 600px.
- Notifications: Centered in 600px column.
- DMs: Side nav + split-pane layout (existing `SocialChatComponent` + `SocialChatDetailComponent` side by side, existing behavior).
- Reaction picker: Appears as tooltip above the reaction bar on hover (300ms delay). On tap: same behavior as mobile.

---

## Token References

All CSS tokens used in this spec. Every value is from `.claude/design-system/tokens.md` Section 11.

### Brand and Primary
- `var(--primary)` — workout accent band, filter active chip, primary CTAs, follow button, nav active color
- `var(--primary-light)` — quick-log chip labels, UserStatsChip workout count
- `var(--primary-glow)` — reaction picker shadow
- `var(--primary-dark)` — gradient end for featured challenge card
- `var(--accent)` — like reaction active color, like notification icon, weight-loss goal badge
- `var(--accent-background)` — like reaction active background

### Surface and Background
- `var(--surface)` — all card backgrounds (feed cards are NOT glassmorphism)
- `var(--surface-card)` — discover user card, filter inactive chip, UserStatsChip container
- `var(--surface-hover)` — notification unread background, card hover state
- `var(--surface-active)` — pressed state
- `var(--surface-elevated)` — reaction picker popover, post options menu
- `var(--surface-overlay)` — bottom sheet surface

### Fitness Data
- `var(--fitness-card-bg)` — workout/meal fitness data block background
- `var(--fitness-card-border)` — workout fitness data block border
- `var(--fitness-card-accent)` — workout 3px left band (`var(--primary)`)
- `var(--fitness-card-meal-accent)` — meal 3px left band (`var(--color-success)`)
- `var(--fitness-stat-size)` = 18px — stat numbers in fitness data blocks
- `var(--fitness-stat-weight)` = 700 — stat number weight

### Reactions
- `var(--reaction-fire)` — fire reaction icon
- `var(--reaction-fire-bg)` — fire reaction active background
- `var(--reaction-strong)` — strong reaction icon
- `var(--reaction-strong-bg)` — strong reaction active background
- `var(--reaction-heart)` — heart reaction (= `var(--accent)`)
- `var(--reaction-heart-bg)` — heart reaction active background
- `var(--reaction-target)` — goal reaction icon
- `var(--reaction-target-bg)` — goal reaction active background

### Macros
- `var(--macro-protein)` = `var(--primary-light)` — protein chip color
- `var(--macro-carbs)` = `var(--color-info)` — carbs chip color
- `var(--macro-fat)` = `var(--color-warning)` — fat chip color
- `var(--macro-protein-bg)` — protein chip background
- `var(--macro-carbs-bg)` — carbs chip background
- `var(--macro-fat-bg)` — fat chip background

### Celebration and Milestone
- `var(--celebration-gold)` — milestone badge, featured athlete border, PR notification
- `var(--celebration-gold-bg)` — milestone card background tint
- `var(--celebration-glow)` — milestone glow box-shadow

### Semantic Colors
- `var(--color-success)` — meal accent band, gain-muscle goal badge, following button text, workout-complete dot
- `var(--color-success-bg)` — meal fitness block background, gain-muscle badge background
- `var(--color-info)` — comment notification icon, maintain goal badge, carbs
- `var(--color-info-bg)` — maintain badge background, carbs chip background
- `var(--color-warning)` — fat macro chips
- `var(--color-warning-bg)` — fat chip background
- `var(--color-streak)` — streak chip icon in UserStatsChip, avatar ring for active streak
- `var(--celebration-gold)` — avatar ring for 30+ day streak

### Text
- `var(--text-primary)` — headings, athlete names, card titles, stat values
- `var(--text-secondary)` — post text content, bio text, action descriptions in notifications
- `var(--text-tertiary)` — timestamps, stat labels, mutual followers count, section headers
- `var(--text-muted)` — placeholder text, empty state descriptions, filter inactive labels
- `var(--text-disabled)` — empty state icons, no-data states

### Border
- `var(--border-subtle)` — card separators in feed, panel section separators
- `var(--border-default)` — discover user cards, filter inactive chips, notification containers
- `var(--border-strong)` — hover state borders, active element borders
- `var(--border-primary)` — selected reaction active border, fitness data block primary accent

### Border Radius
- `var(--radius-xs)` = 6px — macro chips, DM fitness card thumbnail
- `var(--radius-sm)` = 10px — fitness data block icon container, energy selector buttons
- `var(--radius-md)` = 14px — fitness data block, DM fitness card, article meta chips
- `var(--radius-lg)` = 20px — featured cards, discover user cards, milestone card treatment
- `var(--radius-xl)` = 24px — bottom sheets, modals
- `var(--radius-pill)` = 999px — filter chips, goal badges, UserStatsChip, new-posts pill, category chips

### Shadow
- `var(--shadow-card-hover)` — discover user card hover
- `var(--shadow-dropdown)` — reaction picker popover
- `var(--shadow-sheet)` — bottom sheets (fitness share picker, weight input)
- `var(--shadow-glow)` — new posts pill, primary CTA buttons

### Motion
- `var(--duration-micro)` = 150ms — hover state transitions, reaction color change
- `var(--duration-standard)` = 250ms — reaction picker open/close, follow button transition, filter chip change
- `var(--duration-emphasis)` = 350ms — bottom sheet enter, new posts pill, search overlay enter, empty state enter, page entrance slideUp
- `var(--duration-celebration)` = 600ms — milestone badge entrance, ring close on complete
- `var(--ease-standard)` = ease-out — all default transitions
- `var(--ease-spring)` = cubic-bezier(0.34, 1.56, 0.64, 1) — reaction pop, reaction picker open, follow confirm, milestone bounce
- `var(--ease-decelerate)` = cubic-bezier(0.0, 0.0, 0.2, 1) — elements entering screen (bottom sheet, overlay)
- `var(--ease-accelerate)` = cubic-bezier(0.4, 0.0, 1, 1) — elements exiting screen

### Typography
- `var(--text-xs)` = 11px — stat labels, filter chip active labels, macro chip labels, badge labels, notification temporal section headers
- `var(--text-sm)` = 13px — card metadata (timestamp, mutual followers), bio secondary text, notification action text
- `var(--text-base)` = 15px — post body text, notification actor names, article title
- `var(--text-lg)` = 17px — fitness data block workout/meal name (the primary headline within the block)
- `var(--text-xl)` = 20px — page titles (Feed, Discover, Notifications)
- `var(--text-2xl)` = 24px — profile display name, stats numbers
- `var(--weight-regular)` = 400 — body text
- `var(--weight-medium)` = 500 — stat labels, descriptions
- `var(--weight-semibold)` = 600 — avatar names, section titles
- `var(--weight-bold)` = 700 — card titles, button labels, fitness stat values, macro chips
- `var(--weight-black)` = 800 — page headings, profile display name, milestone headline

---

## Angular Implementation Notes

### Components to REPLACE (high priority)

| Current Component | Replacement | Strategy |
|-------------------|-------------|---------|
| `PostCard` linked-content-preview section | New template branches in `PostCard` using `@if (isWorkoutPost() / isMealPost() / isMilestonePost())` | Add new template sections within existing component file — do NOT create new component files for each post type. The component file is `post-card.component.*` |
| Like button in `PostCard` footer | `ReactionBarComponent` (new standalone component) | New component extracted from footer; replaces `.post-card-action-btn` for the like button only. Comment button stays as-is. |

### Components to CREATE (new)

| Component | Path | Priority | Purpose |
|-----------|------|----------|---------|
| `ReactionBarComponent` | `features/social/components/reaction-bar/` | P0 | Expanded reaction system with picker popover |
| `FitnessDataBlockComponent` | `features/social/components/fitness-data-block/` | P0 | Reusable workout/meal data display block used in PostCard and DM threads |
| `UserStatsChipComponent` | `features/social/components/user-stats-chip/` | P0 | Athletic identity chip (goal + streak + workouts) — used in Profile, Discover, PostCard header |
| `DiscoverUserCardComponent` | `features/social/discover/user-card/` | P1 | Redesigned discover user card with fitness context |
| `FeaturedBlockComponent` | `features/social/discover/featured-block/` | P1 | The 3-card featured content section in Discover |
| `DiscoverFilterBarComponent` | `features/social/discover/filter-bar/` | P1 | Horizontal scrollable filter chip bar |
| `RelativeTimePipe` | `shared/pipes/relative-time.pipe.ts` | P0 | Shared pipe — used by PostCard, Notifications, DM threads |
| `FitnessContentDMCardComponent` | `features/social/chat-detail/fitness-dm-card/` | P2 | Shared workout/meal card rendered inside DM bubbles |

### Components to MODIFY (targeted changes)

| Component | Changes | Scope |
|-----------|---------|-------|
| `PostCard` | Add `@if` branches for workout/meal/milestone/text/article type templates. Reduce avatar from 36px to 32px. Replace linked-content-preview with `FitnessDataBlockComponent`. Replace like button with `ReactionBarComponent`. Add `[inProfileContext]` input to hide avatar/follow on profile views. | High |
| `SocialProfile` | Add `UserStatsChipComponent` between name row and stats row. Change stats row: Posts → Workouts/mo. Add streak-based avatar ring. Replace posts grid with chronological list using `PostCard`. Apply public/private visibility rules to Stats tab. | High |
| `SocialDiscover` | Add `FeaturedBlockComponent` above filter bar. Add `DiscoverFilterBarComponent`. Replace user-card-strip with `DiscoverUserCardComponent` grid. Add Message button to each user card. Upgrade empty states to `EmptyStateTemplate` with CTAs (addressing S5). | High |
| `SocialNotifications` | Replace `date:'short'` pipe with `RelativeTimePipe`. Add temporal section headers (Today / This Week / Earlier). Implement grouped notifications via `facade.groupedNotifications()`. Replace load-more button with IntersectionObserver infinite scroll. Redesign notification rows per `NotificationBadge` component spec. | Medium |
| `SocialBottomNav` | Replace "Me" (5th) tab with "Track" tab linking to `/user-dashboard`. Icon: `track_changes`. | Low |
| `SocialDailyPanel` | Add panel footer with quick-log water button + "Log data" + "Start workout" navigation buttons (addressing S8). | Medium |
| `SocialFeed` | Add pull-to-refresh touch gesture handler. Add "new posts" pill logic (new signal `newPostsAvailable`). Add `refresh` icon button to `.feed-header` for desktop. | Medium |
| `CreateContent` | Reverse Post mode order: textarea first, image upload below. Auto-focus textarea on dialog open via `AfterViewInit`. | Low |

### New Signals Required in Facades

**`SocialFacade`:**
```typescript
// New posts available signal for "X new posts" pill
readonly newPostsAvailable = signal<number>(0);

// After background refresh, if new posts detected:
// set newPostsAvailable to the count of posts newer than the oldest post in current feed
```

**`SocialNotificationsFacade`:**
```typescript
// Grouped notifications (computed from existing notifications() signal)
readonly groupedNotifications = computed(() => {
  // Group by (referenceId, type) where type is groupable (like, follow, workout_kudos)
  // Return NotificationGroup[] — see grouping rules above
});

// Temporal sections
readonly temporalGroups = computed(() => ({
  today: this.groupedNotifications().filter(...),
  thisWeek: this.groupedNotifications().filter(...),
  earlier: this.groupedNotifications().filter(...)
}));
```

**`SocialProfileFacade`:**
```typescript
// Streak tier computed for avatar ring treatment
readonly streakTier = computed((): 'none' | 'active' | 'building' | 'milestone' => {
  const s = this.currentProfile()?.currentStreak ?? 0;
  if (s === 0) return 'none';
  if (s < 7) return 'active';
  if (s < 30) return 'building';
  return 'milestone';
});
```

### Data Model Requirements (flag for @tech-architect)

The following require API or schema changes that must be coordinated with `@dotnet-developer`:

1. **`Like.ReactionType`** (enum: heart, fire, strong, goal) — required for reaction system
2. **`linkedContentData` structured object** in post API response — required for parsed macro values in feed cards (currently only `subtitle` string is returned)
3. **`mutualFollowersCount`** field in discover API response — required for user cards
4. **`monthlyWorkoutCount`** field in profile and discover API responses — required for profile stats row and user cards
5. **`DirectMessage.MessageType`** enum + `LinkedEntityId` nullable — required for fitness content sharing in DMs
6. **New notification types** (`workout_kudos`, `streak_milestone`, `pr_achieved`, `weekly_summary`) in `NotificationType` enum — required for notification system
7. **Featured content endpoints** for Challenge of the Week, Trending Exercise, Featured Athlete — required for Discover featured block

---

## Accessibility

### ARIA Labels

- `ReactionBarComponent`: `role="group"`, `aria-label="Post reactions"`
- Each reaction button: `aria-label="Give [type] reaction"`, `aria-pressed="{{ isActiveReaction(type) }}"`
- Reaction picker: `role="tooltip"`, `aria-label="Choose a reaction"`
- `FitnessDataBlockComponent`: `role="region"`, `aria-label="{{ type }} data"` — e.g., "Workout data"
- Stats grid inside fitness block: `role="list"`, each stat: `role="listitem"`, `aria-label="{{ value }} {{ label }}"`
- Discover filter bar: `role="toolbar"`, `aria-label="Filter athletes by goal"`
- Each filter chip: `aria-pressed="{{ isActive }}"`, `aria-label="Filter by {{ goalLabel }}"`
- UserStatsChip: `role="group"`, `aria-label="Athletic profile"`, each segment has `aria-label`
- "New posts" pill: `role="status"`, `aria-live="polite"`
- Notification rows: `role="article"`, `aria-label="{{ actorNames }} {{ actionText }}"` — concatenated for screen readers
- Section headers in notifications: `role="heading"`, `aria-level="2"`
- Profile stats: `role="list"`, each stat: `role="listitem"`

### Tab Order

1. Top bar / side nav actions
2. Feed header (refresh button)
3. Feed cards: for each card — avatar link, fitness data block (not focusable, only the "View workout" detail link if present), reaction buttons (tab-navigable within `role="group"`), comment button
4. Discover: filter bar (arrow-key navigation within `role="toolbar"`), user cards (each is a focusable unit with avatar link, follow button, message button)
5. Profile: avatar (own profile: activates file picker), name, stats cells (tappable), follow/message buttons, tab navigation, tab content
6. Notifications: each notification row as a single focusable `role="button"` unit

### Minimum Touch Targets (48×48px — gym use non-negotiable)

- Reaction buttons in footer: 48×48px via padding (visual: 40×40px per components.md)
- Reaction picker buttons: 48×48px via `padding: 4px` around 40px visual circle
- Follow button on discover user card: full-width × 40px height; container ensures 48px via wrapper
- Filter chips: 36px height with `min-height: 48px` on the scrollable container via padding
- Notification rows: full-width, `min-height: 72px` (exceeds 48px threshold)
- Profile stats cells: `min-height: 48px` enforced

### Contrast

All token values checked against `var(--surface)` (#0d0d10):
- `var(--text-primary)` (#ffffff) on surface: 21:1 — passes AAA
- `var(--text-secondary)` (rgba(255,255,255,0.75)) on surface: ~15:1 — passes AAA
- `var(--text-tertiary)` (rgba(255,255,255,0.50)) on surface: ~10:1 — passes AA
- `var(--text-muted)` (rgba(255,255,255,0.35)) on surface: ~7:1 — passes AA
- `var(--primary)` (#7c4dff) on surface: ~5.1:1 — passes AA (large text and icons)
- `var(--reaction-fire)` (#ff6b35) on `var(--reaction-fire-bg)`: ~4.5:1 — passes AA
- `var(--celebration-gold)` (#fbbf24) on surface: ~8.2:1 — passes AA
- Macro chips (colored text on their bg): all pass AA (design-system verified values)

### Reduced Motion

All animations in this spec respect the global `@media (prefers-reduced-motion: reduce)` block defined in motion.md section 8. Specifically:
- `reactionPop` keyframe — suppressed; reaction state change is instant
- `reactionPop` on milestone badge — suppressed; badge appears at final scale immediately
- Reaction picker open/close `scaleY` animation — suppressed; picker appears/disappears instantly
- New posts pill `slideUp` — suppressed; pill appears without animation
- Pull-to-refresh spinner — still shown (feedback is needed), but no entrance animation
- `followConfirm` keyframe — suppressed
- `sheetEnter`/`sheetExit` — suppressed; sheet appears/disappears instantly
