# NovaFit Visual & Interaction Redesign — Prioritized Backlog
**Date:** 2026-06-04  
**Source:** @product-strategist Phase 6A analysis  
**Feeds into:** redesign-implementation-plan.md

---

## Verdict

- [x] Build it — the redesign addresses validated retention gaps (no daily progress visualization, invisible fitness data in social, zero post-completion feedback) that directly cause D1/D7 churn

## Problem Statement

NovaFit's current UI was built feature-by-feature without a unified design system. The result: 11 different border opacity levels, 57 hardcoded `#fff` instances, no progress rings on the dashboard, fitness data in social cards rendered at metadata size (11–13px), and zero emotional feedback when users complete daily goals. Competitors (Apple Fitness+, Strava, MyFitnessPal) have validated that progress rings, inline fitness data, and post-completion celebration are table-stakes for D7 retention in fitness apps.

## Impact / Effort

| Dimension | Assessment |
|-----------|------------|
| User impact | High — addresses the top 8 UX audit findings rated Critical or High |
| Retention effect | High — progress rings and emotional feedback directly target the "am I done today?" loop |
| Effort | XL — 50+ discrete items across 4 modules, estimated 6–8 sprints |
| Priority | P1 — this is the next major initiative after the 10 UX fixes ship |

## Success Metric

D7 retention +15% (measured from the day progress rings + completion celebrations ship). Secondary: social post creation rate +3x (measured from the day fitness data blocks + reaction system ship).

## Monetization Placement

- [x] Free tier — the visual redesign is retention infrastructure, not a premium feature. Gating progress rings behind a paywall would destroy the core daily habit loop.

---

## TIER 0 — Design System Foundation (Sprint 0 / Parallel Track)

These are prerequisites for the entire redesign. They can run in parallel with Tier 1 feature work because they are mechanical find-and-replace operations with zero visual change.

**[ITEM-0A] Add new tokens to :root block in styles.css**
- Category: Design System
- Retention Impact: L — no user-facing change, but blocks all redesign work
- Effort: S
- Depends on: none
- Required by: every other item in this backlog
- Backend API change: No
- New shared component: No
- Sprint assignment: Sprint 0 (day 1)

**[ITEM-0B] Phase 1 hardcoded color replacement**
- Category: Design System
- Retention Impact: L — zero visual change, maintainability improvement
- Effort: M — 150+ instances across 30+ files
- Depends on: ITEM-0A
- Required by: ITEM-0C, all Tier 1–4 items
- Backend API change: No
- New shared component: No
- Sprint assignment: Sprint 0
- Scope: Replace `#fff`/`#ffffff` → `var(--white)` (57 instances), `#7c4dff` → `var(--primary)` (30+), `#a78bfa` → `var(--primary-light)` (25+), `#ff4081` → `var(--accent)` (12), `#0d0d10` → `var(--surface)` (10), `#4ade80` → `var(--color-success)`, `#38bdf8` → `var(--color-info)`

**[ITEM-0C] Phase 2 semantic token migration — rgba values to semantic tokens**
- Category: Design System
- Retention Impact: L — zero visual change
- Effort: M — 100+ instances of rgba border/surface/text values
- Depends on: ITEM-0A, ITEM-0B
- Required by: All Tier 2+ items
- Backend API change: No
- New shared component: No
- Sprint assignment: Sprint 0 (can overlap with Sprint 1)
- Scope: Collapse 11 border opacity levels to 5 tokens (--border-subtle/default/strong/focus/primary). Collapse surface backgrounds to 4 tokens. Replace hardcoded text rgba with --text-primary/secondary/tertiary/muted/disabled. Replace hardcoded transition durations with --duration-* tokens.

**[ITEM-0D] RelativeTimePipe shared utility**
- Category: Design System
- Retention Impact: L
- Effort: S — single pipe file, pure function
- Depends on: none
- Required by: ITEM-13, ITEM-8, ITEM-16
- Backend API change: No
- New shared component: Yes — `shared/pipes/relative-time.pipe.ts`
- Sprint assignment: Sprint 0

**[ITEM-0E] animateCounter shared utility**
- Category: Design System
- Retention Impact: L
- Effort: S — single utility function, requestAnimationFrame-based
- Depends on: none
- Required by: ITEM-1
- Backend API change: No
- New shared component: Yes — `shared/utils/animate-counter.ts`
- Sprint assignment: Sprint 0

---

## TIER 1 — High Retention Impact, S/M Effort (Ship First)

**[ITEM-1] ProgressRingComponent (shared reusable)**
- Category: Dashboard / Design System
- Retention Impact: H — core visual primitive for "am I done today?"; Apple reports ring-closing is the #1 cited reason users return daily
- Effort: M — SVG ring with stroke-dashoffset math, 3 size variants, ring-close celebration keyframe, counter animation
- Depends on: ITEM-0A, ITEM-0E
- Required by: ITEM-2, ITEM-24
- Backend API change: No
- New shared component: Yes — `shared/components/progress-ring/`
- Sprint assignment: Sprint 1

**[ITEM-2] ProgressRingsHeroComponent (Dashboard hero)**
- Category: Dashboard
- Retention Impact: H — transforms Dashboard from "10 cognitive elements" to "1 glanceable ring"
- Effort: M — 3 ProgressRing instances, computed signals for goalsComplete/completionPercent, "calories remaining" framing, ring-close celebration
- Depends on: ITEM-1, ITEM-3
- Required by: ITEM-5 (Day 1 guide), ITEM-6 (celebration states)
- Backend API change: No — all data already in existing signals
- New shared component: Yes — `features/dashboard/progress-rings-hero/`
- Sprint assignment: Sprint 1

**[ITEM-3] DashboardFacade signal extensions**
- Category: Dashboard
- Retention Impact: H — enables all dashboard progress visualization
- Effort: S — 6 computed signals: goalsComplete, completionPercent, caloriesRemaining, proteinTargetG, carbsTargetG, fatTargetG, isFirstDay
- Depends on: none
- Required by: ITEM-2, ITEM-4, ITEM-5, ITEM-7, ITEM-24
- Backend API change: No
- New shared component: No
- Sprint assignment: Sprint 1

**[ITEM-4] DashboardGreetingComponent redesign (streak hero)**
- Category: Dashboard
- Retention Impact: H — promotes streak from 11px inline chip to 24px dominant row with 32px flame icon
- Effort: S
- Depends on: ITEM-0A
- Required by: none
- Backend API change: No
- New shared component: No — modifies existing
- Sprint assignment: Sprint 1

**[ITEM-5] QuickActionsStripComponent**
- Category: Dashboard
- Retention Impact: H — puts 5 daily actions above the fold as single-tap chips; dissolves ctrl-bar
- Effort: M — horizontal scroll strip, 5 action chips, inline water confirmation, weight bottom sheet, routing shortcuts
- Depends on: ITEM-0A
- Required by: none
- Backend API change: No
- New shared component: Yes — `features/dashboard/quick-actions-strip/`
- Sprint assignment: Sprint 1

**[ITEM-6] Emotional feedback states (completion celebrations)**
- Category: Dashboard
- Retention Impact: H — zero positive reinforcement currently exists for any achieved goal
- Effort: S — contextual encouragement strings per goalsComplete count, day-complete banner, celebration animation, green checkmark dots on completed cards
- Depends on: ITEM-2, ITEM-3
- Required by: none
- Backend API change: No
- Sprint assignment: Sprint 1

**[ITEM-7] FitnessDataBlockComponent (social feed fitness cards)**
- Category: beSocial
- Retention Impact: H — workout data currently renders at 11–13px with near-invisible borders; this makes fitness the HERO
- Effort: M — replaces linked-content-preview. Workout variant: 4-column stats grid with 3px purple accent band. Meal variant: macro chips with green accent band.
- Depends on: ITEM-0A (fitness-card-* tokens)
- Required by: ITEM-8, ITEM-16
- Backend API change: **Yes — structured linkedContentData object needed. See ADR-1.**
- New shared component: Yes — `features/social/components/fitness-data-block/`
- Sprint assignment: Sprint 1

**[ITEM-8] PostCard type-specific template branching**
- Category: beSocial
- Retention Impact: H — workout/meal/article/milestone/text posts become visually distinguishable
- Effort: M — @if branches for each type, avatar 36px→32px, FitnessDataBlockComponent replaces linked-content-preview
- Depends on: ITEM-7
- Required by: ITEM-9
- Backend API change: Same as ITEM-7 (ADR-1)
- New shared component: No — modifies existing PostCard
- Sprint assignment: Sprint 1

**[ITEM-9] Pull-to-refresh on social feed**
- Category: beSocial
- Retention Impact: H — mandatory mobile interaction currently missing; stale feed with no refresh = users stop returning
- Effort: S — touchstart/touchmove/touchend handlers, mat-spinner at top, facade.loadFeed(true) on release >60px
- Depends on: none
- Required by: none
- Backend API change: No
- Sprint assignment: Sprint 1

---

## TIER 2 — High Retention Impact, L Effort (Critical Path)

**[ITEM-10] MetricCardsGridComponent (full Dashboard card restructure)**
- Category: Dashboard
- Retention Impact: H — replaces monolithic 3-card layout with responsive metric grid
- Effort: L — 6 card variants, MacroProgressCard, TodaysTimelineCard, DailyUserData refactored to signal-based (ADR-3)
- Depends on: ITEM-1, ITEM-3, ITEM-5
- Required by: ITEM-11, ITEM-12
- Backend API change: No — see ADR-3 for DailyUserData refactor strategy
- New shared components: `features/dashboard/metric-cards-grid/`, `macro-progress-card/`, `todays-timeline-card/`
- Sprint assignment: Sprint 2

**[ITEM-11] DashboardPageComponent restructure (new component tree)**
- Category: Dashboard
- Retention Impact: H — integration item that assembles the full redesigned Dashboard
- Effort: M — template rewrite assembling: GreetingComponent → ProgressRingsHero → QuickActionsStrip → MetricCardsGrid → AiDailyInsight → HistoryAccordion
- Depends on: ITEM-2, ITEM-4, ITEM-5, ITEM-10, ITEM-14, ITEM-15
- Required by: none (capstone)
- Backend API change: No
- Sprint assignment: Sprint 2

**[ITEM-12] Day 1 guide (DayOneGuideComponent)**
- Category: Dashboard
- Retention Impact: H — new user currently sees empty forms identical to returning user; reads as broken
- Effort: M — detect isFirstDay signal, replace MetricCardsGrid with 3-step guided card (Log weight / Add meal / Set water), progress bar 0/3, celebration on 3/3
- Depends on: ITEM-3 (isFirstDay signal), ITEM-2 (rings at 0% above guide)
- Required by: none
- Backend API change: No
- New shared component: Yes — `features/dashboard/day-one-guide/`
- Sprint assignment: Sprint 2

**[ITEM-13] Reaction system (ReactionBarComponent)**
- Category: beSocial
- Retention Impact: H — binary heart → 4 reactions (fire/strong/heart/goal); Strava data: athletes receiving ≥3 Kudos have 40% higher 30-day retention
- Effort: L — ReactionBarComponent with single-tap default, long-press picker popover, 4 types with color tokens, optimistic UI, reactionPop animation
- Depends on: ITEM-0A (reaction-* tokens)
- Required by: ITEM-8 (PostCard footer)
- Backend API change: **Yes — Like.ReactionType enum. See ADR-2.**
- New shared component: Yes — `features/social/components/reaction-bar/`
- Sprint assignment: Sprint 2

**[ITEM-14] Profile hero redesign (athletic-identity-first)**
- Category: beSocial
- Retention Impact: M — visitors cannot determine fitness goal, training frequency, or streak from profile header
- Effort: M — UserStatsChip between name and stats row, stats row Workouts-mo/Followers/Following, avatar streak ring tier, 2-line bio clamp
- Depends on: ITEM-18 (UserStatsChipComponent)
- Required by: none
- Backend API change: **Yes — monthlyWorkoutCount in profile response. See ADR-4.**
- Sprint assignment: Sprint 2

**[ITEM-15] DashboardHistoryAccordionComponent**
- Category: Dashboard
- Retention Impact: M — Previous Days currently competes visually with Today; collapsing removes the competition
- Effort: S — wrap PreviousDailyUserDataComponent in collapsible accordion, default closed, lazy-load on first open
- Depends on: none
- Required by: ITEM-11
- Backend API change: No
- New shared component: Yes — `features/dashboard/dashboard-history-accordion/`
- Sprint assignment: Sprint 2

---

## TIER 3 — Medium Retention, Any Effort (Fill Sprints)

**[ITEM-16] AiDailyInsightComponent**
- Category: Dashboard
- Retention Impact: M — NovaFit's primary differentiation; no competitor surfaces AI interpretation of daily data on the dashboard
- Effort: M — Groq API call once/day, localStorage cache per date, single contextual sentence, dismiss per day, loading/error/dismissed states
- Depends on: ITEM-3 (today's data for prompt context)
- Required by: ITEM-11
- Backend API change: No — uses existing POST /api/ai/text
- New shared component: Yes — `features/dashboard/ai-daily-insight/`
- Sprint assignment: Sprint 3

**[ITEM-17] Notification redesign (grouping + temporal sections + relative time)**
- Category: beSocial
- Retention Impact: M — flat list, wrong timestamp format, no grouping
- Effort: L — grouped notifications computed signal, temporal sections (Today/This Week/Earlier), avatar stacking, RelativeTimePipe, infinite scroll
- Depends on: ITEM-0D (RelativeTimePipe)
- Required by: none
- Backend API change: No — grouping computed client-side
- Sprint assignment: Sprint 3

**[ITEM-18] UserStatsChipComponent**
- Category: beSocial
- Retention Impact: M — enables athletic identity display in profile + discover cards
- Effort: S — compact pill: goal badge + streak + monthly workouts
- Depends on: ITEM-0A
- Required by: ITEM-14, ITEM-19
- Backend API change: No (receives data via inputs)
- New shared component: Yes — `features/social/components/user-stats-chip/`
- Sprint assignment: Sprint 3

**[ITEM-19] Discover page redesign (filter bar + user cards + empty states)**
- Category: beSocial
- Retention Impact: M — empty Discover is the highest-churn moment in a social app
- Effort: L — DiscoverFilterBarComponent (goal-based: All/Weight Loss/Muscle Gain/Endurance/Maintenance/Trending), DiscoverUserCardComponent (56px avatar, streak ring, goal badge, mutual followers, monthly workouts, follow button), EmptyStateTemplate CTAs
- Depends on: ITEM-18
- Required by: none
- Backend API change: **Yes — mutualFollowersCount + monthlyWorkoutCount in discover response. See ADR-4.**
- New shared components: `features/social/discover/filter-bar/`, `features/social/discover/user-card/`
- Sprint assignment: Sprint 3

**[ITEM-20] Social daily panel actionable footer**
- Category: beSocial
- Retention Impact: M — daily panel FAB is currently a read-only dead end on mobile
- Effort: S — add footer: +250ml water quick-log, "Log data" ghost → /user-dashboard, "Start workout" primary → /workouts
- Depends on: none
- Backend API change: No — uses existing facade.adjustWaterMl()
- Sprint assignment: Sprint 3

**[ITEM-21] Create content dialog reorder (text-first)**
- Category: beSocial
- Retention Impact: M — image-before-text order reduces post frequency
- Effort: S — reverse Post mode order: textarea auto-focused first, compact image attachment row below
- Depends on: none
- Backend API change: No
- Sprint assignment: Sprint 3

**[ITEM-22] Bottom nav tracking bridge**
- Category: beSocial
- Retention Impact: M — no bridge from beSocial to tracking on mobile
- Effort: S — replace 5th tab "Me" with "Track" linking to /user-dashboard
- Depends on: none
- Backend API change: No
- Sprint assignment: Sprint 3

**[ITEM-23] New posts indicator pill**
- Category: beSocial
- Retention Impact: M — returning feed users see stale content; pill surfaces new content without disrupting scroll
- Effort: S — sticky pill, shows "X new posts — tap to refresh" when background refresh detects new content and user scrolled >200px
- Depends on: none
- Sprint assignment: Sprint 3

**[ITEM-24] Nutrition summary header with macro rings**
- Category: Nutrition
- Retention Impact: M — Nutrition tab has no daily progress visualization
- Effort: M — 3 ProgressRingComponent instances (protein/carbs/fat), NutritionTabFacade todayTotals signal, macro targets from UserFacade
- Depends on: ITEM-1 (ProgressRingComponent), ITEM-3 (macro target signals)
- Backend API change: No
- Sprint assignment: Sprint 3

---

## TIER 4 — Low Retention, S/M Effort (Quick Wins in Downtime)

**[ITEM-25] Workouts module token migration + stagger animation**
- Category: Workouts
- Retention Impact: L
- Effort: S — badge color tokens, card hover tokens, stagger entrance animation, EmptyStateTemplate
- Depends on: ITEM-0A, ITEM-0B
- Sprint assignment: Sprint 4

**[ITEM-26] Active workout session token migration + gym-first font sizing**
- Category: Workouts
- Retention Impact: L
- Effort: S — 12 hardcoded color replacements, exercise name 15px → var(--text-xl) = 20px
- Depends on: ITEM-0A
- Sprint assignment: Sprint 4

**[ITEM-27] Nutrition meal card token alignment + calorie badge**
- Category: Nutrition
- Retention Impact: L
- Effort: S — macro chip --macro-* tokens, calorie badge on collapsed row, skeleton loading state
- Depends on: ITEM-0A, ITEM-0C
- Sprint assignment: Sprint 4

**[ITEM-28] AI Chat bottom sheet spec alignment**
- Category: AI Chat
- Retention Impact: L
- Effort: S — handle color token, bubble bg tokens, AI avatar 24px circle, send button 48×48, context badge styling
- Depends on: ITEM-0A
- Sprint assignment: Sprint 4

**[ITEM-29] Me/Profile tab IA restructure**
- Category: Me
- Retention Impact: L
- Effort: M — remove Progress/Goals placeholders, add Achievements placeholder, restructure Settings to 4-section grouped layout, "Preview my profile" ghost button
- Depends on: ITEM-0A
- Sprint assignment: Sprint 4

**[ITEM-30] Post card chrome reduction**
- Category: beSocial
- Retention Impact: L
- Effort: S — reduce name row padding, avatar 36px→32px, compact footer to 40px height
- Depends on: ITEM-8
- Sprint assignment: Sprint 4

**[ITEM-31] Article post cover strip + read-time badge**
- Category: beSocial
- Retention Impact: L
- Effort: S — gradient strip when no cover, read-time badge (Math.ceil(wordCount/200) + " min read")
- Depends on: none
- Sprint assignment: Sprint 4

---

## TIER 5 — Future Consideration

**[ITEM-32] Milestone post card type** — Depends on backend milestone/PR detection system (doesn't exist). Park.

**[ITEM-33] Featured content block on Discover** — Depends on backend featured content endpoints and admin curation system (don't exist). Park.

**[ITEM-34] Group DMs** — Architecturally dependent on challenge system. Park.

**[ITEM-35] Fitness content sharing in DMs** — L effort, lower priority than all Tier 1–3 items. Backend MessageType enum change needed.

**[ITEM-36] New notification types (workout_kudos, streak_milestone, pr_achieved, weekly_summary)** — Depends on ITEM-13 reaction system and ITEM-32 milestone system.

**[ITEM-37] Engagement-weighted feed algorithm** — Premature at current scale. Relevant when average follows >500/user.

---

## PRIORITY SIGNAL — Top 5 Items for Sprint 1

1. **ITEM-1 + ITEM-2 + ITEM-3** (ProgressRing + Hero + Facade signals) — Dashboard "10 cognitive elements → 1 glanceable ring". Estimated: D1 comprehension time from 8–15s to <3s.
2. **ITEM-7 + ITEM-8** (FitnessDataBlock + PostCard branching) — Social feed "all posts look the same → instantly distinguishable". Estimated: feed engagement (likes per post) +2×.
3. **ITEM-4** (Streak hero in greeting) — S effort, H impact. Promotes the highest-retention mechanic to visual authority.
4. **ITEM-5** (QuickActionsStrip) — Dissolves ctrl-bar, single-tap daily actions above fold.
5. **ITEM-9** (Pull-to-refresh) — S effort, mandatory mobile interaction, currently missing.

---

## Risk Items

**RISK-1:** ITEM-7 requires structured linkedContentData from API → **ADR-1** (blocks Sprint 1 FitnessDataBlock)

**RISK-2:** ITEM-13 requires Like.ReactionType schema migration → **ADR-2** (rollback: existing likes default to 'heart')

**RISK-3:** ITEM-10 MetricCardsGrid refactors monolithic DailyUserDataComponent → **ADR-3** (signal-based per-card binding)

**RISK-4:** ITEM-14 and ITEM-19 need monthlyWorkoutCount + mutualFollowersCount from API → **ADR-4** (N+1 risk on Discover page)

**RISK-5:** Privacy concern on profile redesign — weight trend charts need @if (isOwnProfile) guards. @security-auditor must verify before profile redesign ships.

**RISK-6:** ITEM-32 milestone posts require backend PR detection + streak milestone triggers that don't exist. Correctly in Tier 5.

---

## Dependency Graph (Critical Path)

```
Sprint 0 (parallel):
  ITEM-0A → ITEM-0B → ITEM-0C
  ITEM-0D (RelativeTimePipe)
  ITEM-0E (animateCounter)

Sprint 1 (feature):
  ITEM-0A → ITEM-1 (ProgressRing) → ITEM-2 (RingsHero) → ITEM-6 (celebrations)
  ITEM-3 (facade signals) → ITEM-2
  ITEM-0A → ITEM-4 (greeting streak hero)
  ITEM-0A → ITEM-5 (quick actions strip)
  ITEM-0A → ITEM-7 (FitnessDataBlock) → ITEM-8 (PostCard branching)
  ITEM-9 (pull-to-refresh) — independent

Sprint 2 (feature):
  ITEM-1 + ITEM-3 → ITEM-10 (MetricCardsGrid) → ITEM-11 (DashboardPage)
  ITEM-3 → ITEM-12 (Day 1 guide)
  ITEM-0A → ITEM-13 (reaction system) — feeds ITEM-8
  ITEM-18 → ITEM-14 (profile hero)
  ITEM-15 (history accordion) → ITEM-11

Sprint 3 (feature):
  ITEM-3 → ITEM-16 (AI insight) → ITEM-11
  ITEM-0D → ITEM-17 (notification redesign)
  ITEM-0A → ITEM-18 (UserStatsChip) → ITEM-19 (Discover redesign)
  ITEM-20, ITEM-21, ITEM-22, ITEM-23 — independent

Sprint 4 (polish):
  ITEM-25 through ITEM-31 — independent
```
