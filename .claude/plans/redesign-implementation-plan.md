# NovaFit Visual & Interaction Redesign — Complete Implementation Plan

**Author:** @tech-architect
**Date:** 2026-06-04  
**Last updated:** 2026-06-10 — Dashboard sprint plan revised (see Dashboard Sprint section below)
**Status:** Ready for implementation — canonical reference document
**Version:** 2.1 — dashboard sprint isolated and simplified

---

## Table of Contents

1. [Tech Stack Constraints](#tech-stack-constraints)
2. [Source Specifications](#source-specifications)
3. [Architecture Decision Records (ADRs)](#architecture-decision-records)
   - ADR-1: LinkedContentData JSON column
   - ADR-2: Like.ReactionType
   - ADR-3: DailyUserData signal refactor
   - ADR-4: monthlyWorkoutCount + mutualFollowersCount
4. [Sprint Plan](#sprint-plan)
   - Sprint 0: Foundation
   - Sprint 1: Tier 1 Visual Changes
   - Sprint 2: Dashboard + Profile + Reactions
   - Sprint 3: AI Insight, Notifications, Discover, Nutrition
   - Sprint 4: Polish Pass
5. [Complete Component Inventory](#complete-component-inventory)
6. [API Contract Changes](#api-contract-changes)
7. [Backend Files Modified](#backend-files-modified)
8. [Prioritized Backlog (ITEM-0A through ITEM-37)](#prioritized-backlog)
9. [Dependency Graph](#dependency-graph)
10. [Privacy Verification Checklist](#privacy-verification-checklist)
11. [Success Metrics](#success-metrics)

---

## Tech Stack Constraints — NEVER VIOLATE

- **Frontend:** Angular 19, Signals + Facade pattern. Components NEVER call API directly.
- **Backend:** .NET 10 / ASP.NET Core, clean architecture. Controllers thin. Logic in Services. EF entities never in API responses — always DTOs.
- **Database:** SQLite via EF Core 10.
- **Real-time:** SignalR — already live for chat and notifications.
- **Auth:** JWT HS256 — user ID ALWAYS from token, NEVER from request body.
- **Privacy absolute:** BMI, body weight, goal calories, BMR, TDEE NEVER in social or public endpoints.
- **Design:** Dark-only #0D0D10, primary #7C4DFF, accent #FF4081, Poppins, glassmorphism. CSS variables for all colors — hardcoded hex is a code review failure.
- **Every data view:** three states — loading skeleton, empty (with converting CTA), error + retry.
- **Touch targets:** minimum 48×48px.

---

## Source Specifications

| Spec | Path | Author | Scope |
|------|------|--------|-------|
| Dashboard Redesign | `.claude/design-specs/dashboard-redesign.md` | @uiux-designer | Full dashboard restructure: rings, metric cards, quick actions, AI insight |
| beSocial Redesign | `.claude/design-specs/besocial-redesign.md` | @uiux-designer | Feed cards, reactions, profile, discover, notifications, DMs |
| Modules Consistency | `.claude/design-specs/modules-consistency-pass.md` | @uiux-designer | Workouts, nutrition, AI chat, Me tab token alignment |
| Design System Tokens | `.claude/design-system/tokens.md` | @design-system-architect | ~100 CSS custom properties |
| Components Spec | `.claude/design-system/components.md` | @design-system-architect | MetricCard, ProgressRing, UserStatsChip, EmptyState, etc. |
| Motion Spec | `.claude/design-system/motion.md` | @design-system-architect | Keyframes, durations, easing, reduced-motion |
| Spatial Spec | `.claude/design-system/spatial.md` | @design-system-architect | 8px grid, breakpoints, ring sizes, card layout |
| UX Audit | `.claude/design-redesign/phase-1-ux-audit.md` | @uiux-designer | 18 findings (D1–D8, S1–S10) rated Critical/High/Medium |
| Competitive Analysis | `.claude/design-redesign/phase-1-competitive-analysis.md` | @competitor-analyst | Apple Fitness+, Strava, MyFitnessPal, Whoop, BeReal |
| Backlog | `.claude/plans/redesign-backlog.md` | @product-strategist | Prioritized items ITEM-0A through ITEM-37 |

---

## Architecture Decision Records

### ADR-1: Structured linkedContentData in Post API Responses

**ID:** REDESIGN-ADR-1 (RISK-1)
**Status:** Proposed
**Full spec:** `.claude/decisions/redesign-adr-1.md`
**Blocks:** Sprint 1 FitnessDataBlock (ITEM-7)
**Consumed by:** @dotnet-developer, @angular-developer

**Problem:** The beSocial redesign requires workout posts to display a 4-stat grid (exercises, sets, volume, ~kcal) and meal posts to display colored macro chips (P/C/F + total kcal). The current `LinkedContentPreview` DTO returns a flat string `subtitle` field that cannot be parsed reliably and lacks the required data points.

**Decision:** Store structured data at post creation time in a new nullable JSON column `LinkedContentDataJson` on the `Post` entity. Return it as a `LinkedContentData` field on `PostResponse`.

**Data Model Changes:**

```csharp
// Post.cs — add property
public string? LinkedContentDataJson { get; set; }

// SocialDtos.cs — add class
public class LinkedContentDataDto
{
    public int? ExerciseCount { get; set; }
    public int? TotalSets { get; set; }
    public double? TotalVolumeKg { get; set; }
    public int? EstimatedCaloriesKcal { get; set; }
    public double? ProteinG { get; set; }
    public double? CarbsG { get; set; }
    public double? FatG { get; set; }
    public double? TotalCalories { get; set; }
}

// PostResponse — add field
public LinkedContentDataDto? LinkedContentData { get; set; }
```

```typescript
// social.model.ts — add interface
export interface LinkedContentData {
  exerciseCount?: number;
  totalSets?: number;
  totalVolumeKg?: number;
  estimatedCaloriesKcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  totalCalories?: number;
}
// Update Post interface: linkedContentData?: LinkedContentData;
```

**Migration:** `dotnet ef migrations add AddLinkedContentDataJsonToPost`
**Backward compatible:** Existing posts have `null` — frontend falls back to subtitle string rendering.

**@dotnet-developer instructions:**
1. Add `LinkedContentDataJson` to `Post.cs`
2. Create migration
3. Add `LinkedContentDataDto` to `SocialDtos.cs`
4. Add `LinkedContentData` to `PostResponse`
5. Populate at creation in `CreatePostAsync` (workout and meal paths)
6. Deserialize in post-to-response mapping

**@angular-developer instructions:**
1. Add `LinkedContentData` interface to `social.model.ts`
2. Add `linkedContentData?` to `Post` interface
3. Add computed signals `isWorkoutPost`, `isMealPost` in PostCard
4. Render `FitnessDataBlockComponent` when data present; fallback to subtitle when absent

---

### ADR-2: Like.ReactionType Enum

**ID:** REDESIGN-ADR-2 (RISK-2)
**Status:** Proposed
**Full spec:** `.claude/decisions/redesign-adr-2.md`
**Blocks:** Sprint 2 reaction picker (ITEM-13)
**Consumed by:** @dotnet-developer, @angular-developer

**Problem:** The redesign introduces four reaction types (heart, fire, strong, goal). The current `Like` entity is binary — no reaction type exists.

**Decision:** Add a nullable `ReactionType` string column to `Like`. Use string (not enum) for future extensibility.

**Allowed values:** `"heart"` | `"fire"` | `"strong"` | `"goal"` — validated in application code.
**Legacy handling:** Existing likes have `null`, treated as `"heart"` by application layer.

**Toggle logic (3 cases):**
1. No existing Like → create with specified type (default: "heart")
2. Existing Like, same type → remove (toggle off)
3. Existing Like, different type → update type (change reaction, no count change)

**Data Model Changes:**

```csharp
// Like.cs — add property
public string? ReactionType { get; set; }

// SocialDtos.cs — add
public class LikeToggleRequest { public string? ReactionType { get; set; } }

// LikeToggleResponse — add
public string? MyReactionType { get; set; }
public Dictionary<string, int>? ReactionCounts { get; set; }

// PostResponse — add
public string? MyReactionType { get; set; }
public Dictionary<string, int>? ReactionCounts { get; set; }
```

```typescript
// social.model.ts updates
export interface LikeToggleResponse {
  isLiked: boolean;
  likesCount: number;
  myReactionType?: string | null;
  reactionCounts?: Record<string, number> | null;
}
// Update Post: myReactionType?, reactionCounts?
```

**Migration:** `dotnet ef migrations add AddReactionTypeToLike`
**Controller change:** `ToggleLike` accepts `[FromBody] LikeToggleRequest? request` — nullable body preserves backward compat.

**@dotnet-developer instructions:** (10 steps — see full ADR)
**@angular-developer instructions:** (5 steps — see full ADR)

---

### ADR-3: DailyUserDataComponent Refactor Strategy

**ID:** REDESIGN-ADR-3 (RISK-3)
**Status:** Proposed
**Full spec:** `.claude/decisions/redesign-adr-3.md`
**Blocks:** Sprint 2 MetricCardsGrid (ITEM-10)
**Consumed by:** @angular-developer (frontend-only)

**Problem:** Dashboard redesign replaces monolithic `DailyUserDataComponent` (ReactiveFormsModule form) with individual `MetricCardComponent` instances. How do individual cards write data back without the form group?

**Decision:** Signal-based per-card binding with a debounced save `effect()` in `DashboardFacade`.

**Architecture:**
- Each metric card writes to writable signals in `DashboardFacade`
- Single `effect()` watches all signals, triggers debounced (1.5s) auto-save
- `isHydrated` signal gates the effect to prevent save-on-load
- Per-card validation via computed signals (`weightError`, `energyError`)
- `autoSaveStatus` signal replaces form-based save status

**New Signals in DashboardFacade:**

```typescript
// Writable
readonly weightKg = signal<number | null>(null);
readonly energyLevel = signal<number | null>(null);
readonly waterConsumedL = signal<number>(0);
readonly activityType = signal<DayType | null>(null);
readonly steps = signal<number>(0);
readonly macrosPct = signal<{ protein: number; carbs: number; fats: number }>({ protein: 40, carbs: 30, fats: 30 });
readonly caloriesBurned = signal<number>(0);
readonly autoSaveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

// Computed
readonly goalsComplete = computed(() => { /* ... */ });
readonly completionPercent = computed(() => Math.round((this.goalsComplete() / 4) * 100));
readonly proteinTargetG = computed(() => /* TDEE * 0.30 / 4 */);
readonly carbsTargetG = computed(() => /* TDEE * 0.45 / 4 */);
readonly fatTargetG = computed(() => /* TDEE * 0.25 / 9 */);
readonly caloriesRemaining = computed(() => /* tdee - consumed + burned */);
readonly isFirstDay = computed(() => this.historyEntries().length === 0);
```

**Migration path:** DailyUserDataComponent is NOT deleted immediately — gradually emptied as metric cards take over. Backend API unchanged.

**@angular-developer instructions:** (9 steps — see full ADR)

---

### ADR-4: API Additions for monthlyWorkoutCount and mutualFollowersCount

**ID:** REDESIGN-ADR-4 (RISK-4)
**Status:** Proposed
**Full spec:** `.claude/decisions/redesign-adr-4.md`
**Blocks:** Sprint 2 profile hero (ITEM-14) and Sprint 3 Discover (ITEM-19)
**Consumed by:** @dotnet-developer, @angular-developer

**Problem:** Profile and Discover surfaces need `monthlyWorkoutCount` (completed sessions this calendar month) and `mutualFollowersCount` (users the viewer follows who also follow the target).

**Decision:** Compute both at query time via EF Core subqueries. Add composite index on `WorkoutSessions(UserId, FinishedAt)`.

**Data Model Changes:**

```csharp
// UserSocialProfileResponse — add
public int MonthlyWorkoutCount { get; set; }
public int CurrentStreak { get; set; }
public string? FitnessGoal { get; set; }

// SuggestedUserResponse — add
public int MutualFollowersCount { get; set; }

// New DTO
public class DiscoverUserCardResponse
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? FitnessGoal { get; set; }
    public int CurrentStreak { get; set; }
    public int MonthlyWorkoutCount { get; set; }
    public int MutualFollowersCount { get; set; }
    public bool IsFollowedByMe { get; set; }
}
```

```typescript
// social.model.ts updates
export interface UserSocialProfile {
  // ... existing ...
  monthlyWorkoutCount: number;
  currentStreak: number;
  fitnessGoal?: string | null;
}

export interface DiscoverUserCard {
  id: string;
  displayName: string;
  avatarUrl?: string;
  fitnessGoal?: string | null;
  currentStreak: number;
  monthlyWorkoutCount: number;
  mutualFollowersCount: number;
  isFollowedByMe: boolean;
}
```

**New endpoint:** `GET /api/social/discover/users?page=1&pageSize=20`
**Migration:** `dotnet ef migrations add AddWorkoutSessionUserIdFinishedAtIndex` (index only)

**@dotnet-developer instructions:** (9 steps — see full ADR)
**@angular-developer instructions:** (7 steps — see full ADR)

---

## Sprint Plan

### Sprint 0 — Foundation (1 week, parallelizable)

**Goal:** Add all missing CSS tokens to `:root`, replace hardcoded colors in global `styles.css`, create shared `RelativeTimePipe` and `animateCounter` utility. No backend changes. No visible user-facing changes.

**Visual milestone:** `styles.css` `:root` block contains all ~100 tokens from `tokens.md` Section 11.

**Agent assignments:**
- @angular-developer: all items

**Dependencies:** None.

**Items:**

| ID | Task | Priority | Effort | Details |
|----|------|----------|--------|---------|
| S0-1 | Add missing CSS tokens to `:root` | HIGH | S | ~80 tokens across surface, text, border, radius, shadow, typography, motion, macro, fitness, reaction, celebration, ring, overlay, layout categories. See tokens.md Section 11. |
| S0-2 | Create `RelativeTimePipe` | HIGH | S | `shared/pipes/relative-time.pipe.ts`. Pure standalone pipe. <60s="just now", <60m="Xm ago", <24h="Xh ago", <48h="Yesterday", <7d="Xd ago", ≥7d="MMM d". |
| S0-3 | Add reduced-motion global block | MEDIUM | XS | `@media (prefers-reduced-motion: reduce)` in `styles.css` — suppresses all animation-duration/transition-duration. |
| S0-4 | Add global keyframe animations | MEDIUM | XS | `slideUp`, `reactionPop`, `pulse`, `ringFill`, `followConfirm` in `styles.css`. |
| S0-5 | Create `animateCounter` utility | LOW | S | `shared/utils/animate-counter.ts`. requestAnimationFrame-based number animation. |

**Acceptance criteria:**
- All tokens present in `:root`
- `RelativeTimePipe` created and exportable
- No runtime regressions

---

### Sprint 1 — Tier 1 Visual Changes (2 weeks)

**Goal:** Deliver highest-impact visual changes: fitness-data-blocks in feed, reaction system UI (frontend-only, heart-only until ADR-2 lands), token migration on workouts/nutrition/AI chat/Me tab modules. Backend starts ADR-1 + ADR-2 in parallel.

**Visual milestone:** Feed cards show type-differentiated workout/meal blocks. Post footer shows reaction bar. Active workout, nutrition, AI chat, and workouts content use tokenized colors.

**Agent assignments:**
- @dotnet-developer: S1-BE-1 (ADR-1) + S1-BE-2 (ADR-2) — parallel with frontend
- @angular-developer: S1-1 through S1-8

**Items:**

| ID | Task | Priority | Effort | Backlog | Agent |
|----|------|----------|--------|---------|-------|
| S1-1 | Create `FitnessDataBlockComponent` | HIGH | M | ITEM-7 | @angular-developer |
| S1-2 | Create `ReactionBarComponent` (heart-only Phase 1) | HIGH | M | ITEM-13 | @angular-developer |
| S1-3 | Integrate into `PostCard` (type branching + reaction bar) | HIGH | M | ITEM-8 | @angular-developer |
| S1-4 | Token migration: Active Workout Session | HIGH | S | ITEM-26 | @angular-developer |
| S1-5 | Token migration: Nutrition Tab | HIGH | S | ITEM-27 | @angular-developer |
| S1-6 | Token migration: AI Chat Bottom Sheet | MEDIUM | S | ITEM-28 | @angular-developer |
| S1-7 | Token migration: Workouts Content | MEDIUM | S | ITEM-25 | @angular-developer |
| S1-8 | Token migration: Me/Profile tab inline colors | LOW | XS | ITEM-29 | @angular-developer |
| S1-BE-1 | Backend: ADR-1 LinkedContentData | HIGH | M | RISK-1 | @dotnet-developer |
| S1-BE-2 | Backend: ADR-2 ReactionType | HIGH | M | RISK-2 | @dotnet-developer |

**S1-1 Details: FitnessDataBlockComponent**
- Path: `features/social/components/fitness-data-block/`
- Inputs: `type: 'workout' | 'meal'`, `linkedContent`, `linkedContentData`
- Workout template: 4-stat grid (exercises, sets, volume, ~kcal), 3px purple accent band
- Meal template: macro chips (P/C/F colored), green accent band, kcal badge
- Fallback: when `linkedContentData` is null, render subtitle string
- Tokens: `--fitness-card-bg`, `--fitness-card-border`, `--fitness-card-accent`, `--macro-*`

**S1-2 Details: ReactionBarComponent**
- Path: `features/social/components/reaction-bar/`
- Phase 1: Single-tap heart toggle (backward-compat with existing API)
- Phase 2 (after ADR-2): Long-press (300ms) → 4-reaction picker popover
- Tokens: `--reaction-fire/strong/heart/target` + `-bg` variants
- Animation: `reactionPop` keyframe on tap

**S1-3 Details: PostCard Integration**
- Add computed signals: `isWorkoutPost`, `isMealPost`, `isMilestonePost`, `isArticlePost`
- Add `inProfileContext` input (hides avatar+follow)
- Replace `.linked-content-preview` with `<app-fitness-data-block>`
- Replace like button with `<app-reaction-bar>`
- Replace `date:'short'` with `RelativeTimePipe`
- Model changes: add `LinkedContentData` interface, reaction fields to `Post` and `LikeToggleResponse`

**S1-4 Details: Active Workout Session tokens** (12 replacements)
- `rgba(255,255,255,0.5)` → `var(--text-tertiary)`, `#4ade80` → `var(--color-success)`, etc.
- Font size increases: exercise name 15px→20px, title 16px→17px

**S1-5 Details: Nutrition Tab tokens**
- Accent, pill, card, row, toolbar replacements
- Add `.macro-chip--protein/carbs/fat` classes
- 8px grid spacing fixes

**S1-BE-1 Details: Backend ADR-1**
- Files: `Post.cs`, `SocialDtos.cs`, `SocialService.cs`
- Migration: `AddLinkedContentDataJsonToPost`
- Populate JSON at creation for workout/meal posts
- Deserialize in response mapping

**S1-BE-2 Details: Backend ADR-2**
- Files: `Like.cs`, `SocialDtos.cs`, `SocialService.cs`, `SocialController.cs`
- Migration: `AddReactionTypeToLike`
- 3-case toggle logic + `GetReactionCountsAsync`
- Controller: `[FromBody] LikeToggleRequest? request` (nullable)

**Risk flags:**
- ADR-1 backend may lag — frontend MUST work with null `linkedContentData`
- ADR-2 backend adds reactionType — frontend `toggleLike` must be backward-compatible

---

### Sprint 2 — Dashboard + Profile + Reactions (2 weeks)

**Goal:** Dashboard restructure (progress rings, metric cards, quick actions), profile redesign (athletic identity strip), full 4-type reaction picker, Discover user cards. Backend ADR-4 lands.

**Visual milestone:** Dashboard shows progress rings hero. Profile shows UserStatsChip. Reaction picker shows 4 types on long-press. Discover user cards show fitness context.

**Agent assignments:**
- @dotnet-developer: S2-BE-1 (ADR-4)
- @angular-developer: S2-1 through S2-8

**Items:**

| ID | Task | Priority | Effort | Backlog | Agent |
|----|------|----------|--------|---------|-------|
| S2-1 | Create `ProgressRingComponent` | HIGH | M | ITEM-1 | @angular-developer |
| S2-2 | Create `ProgressRingsHeroComponent` | HIGH | M | ITEM-2 | @angular-developer |
| S2-3 | Create `MetricCardsGrid` + individual cards (ADR-3 facade) | HIGH | L | ITEM-10 | @angular-developer |
| S2-4 | Create `QuickActionsStripComponent` | MEDIUM | S | ITEM-5 | @angular-developer |
| S2-5 | Create `UserStatsChipComponent` | HIGH | S | ITEM-18 | @angular-developer |
| S2-6 | Profile hero redesign | HIGH | M | ITEM-14 | @angular-developer |
| S2-7 | Reaction picker (full 4-type system) | MEDIUM | M | ITEM-13 | @angular-developer |
| S2-8 | Discover user cards redesign | MEDIUM | M | ITEM-19 | @angular-developer |
| S2-BE-1 | Backend: ADR-4 profile + discover data | HIGH | M | RISK-4 | @dotnet-developer |

**S2-1 Details: ProgressRingComponent**
- Path: `features/dashboard/progress-ring/` (reusable — also used in nutrition S3-3)
- Inputs: `size: 'sm'|'md'|'lg'`, `percentage`, `trackColor`, `fillColor`, `centerValue`, `centerLabel`
- SVG circle with `stroke-dasharray`/`stroke-dashoffset`
- `ringFill` animation on initial render
- Sizes: 96px (sm), 128px (md), 176px (lg)

**S2-2 Details: ProgressRingsHeroComponent**
- Path: `features/dashboard/progress-rings-hero/`
- Three rings: calorie (md, right), completion (lg, center), water (md, left)
- Data: `DashboardFacade` computed signals
- `dayComplete` celebration when all rings close
- Completion label: dynamic text per `goalsComplete` (0/4 through 4/4)

**S2-3 Details: MetricCardsGrid + DashboardFacade (ADR-3)**
- Create `DashboardFacade` with writable + computed signals (see ADR-3)
- Metric cards: CaloriesRemaining, NetCalories, MacroProgress (full-span), Weight, Energy, TodaysTimeline (full-span)
- Each card reads/writes its signal from facade
- Debounced auto-save `effect()` with `isHydrated` guard

**S2-5 Details: UserStatsChipComponent**
- Path: `features/social/components/user-stats-chip/`
- Inputs: `fitnessGoal`, `streak`, `monthlyWorkouts`
- Renders: goal badge (colored) | divider | flame icon + count | divider | "X this month"
- Inline-flex pill container

**S2-6 Details: Profile hero redesign**
- Add `UserStatsChip` between name and stats row
- Stats row: Posts → Workouts/mo
- Avatar: 88px, streak-tier ring (none/active/building/milestone)
- Replace posts grid with chronological `PostCard` list (`[inProfileContext]="true"`)
- Model: add `monthlyWorkoutCount`, `currentStreak`, `fitnessGoal` to `UserSocialProfile`

**S2-BE-1 Details: Backend ADR-4**
- Files: `SocialDtos.cs`, `SocialService.cs`, `SocialController.cs`, `AppDbContext.cs`
- Migration: `AddWorkoutSessionUserIdFinishedAtIndex`
- Add `monthlyWorkoutCount`, `currentStreak`, `fitnessGoal` to profile response
- Add `mutualFollowersCount` to suggested users
- New endpoint: `GET /api/social/discover/users`
- Streak computation helper + batch queries

---

### Sprint 3 — AI Insight, Notifications, Discover Featured, Nutrition Rings (2 weeks)

**Goal:** AI daily insight on dashboard, notification grouping with temporal sections, Discover featured block + filter bar, nutrition macro rings, daily panel enhancements, feed improvements.

**Visual milestone:** AI insight renders contextual sentence. Notifications show grouped entries with temporal headers. Discover shows featured content + filter chips. Nutrition shows macro progress rings.

**Agent assignments:**
- @dotnet-developer: new notification types (future — flag only)
- @angular-developer: all frontend items

**Items:**

| ID | Task | Priority | Effort | Backlog | Agent |
|----|------|----------|--------|---------|-------|
| S3-1 | Create `AiDailyInsightComponent` | MEDIUM | S | ITEM-16 | @angular-developer |
| S3-2 | Notification redesign (grouping + temporal + relative time) | MEDIUM | L | ITEM-17 | @angular-developer |
| S3-3 | Nutrition summary header with macro rings | MEDIUM | M | ITEM-24 | @angular-developer |
| S3-4 | Discover filter bar + featured block | MEDIUM | M | ITEM-19 | @angular-developer |
| S3-5 | Social daily panel enhancement | LOW | S | ITEM-20 | @angular-developer |
| S3-6 | Feed: new posts pill + pull-to-refresh | LOW | S | ITEM-23, ITEM-9 | @angular-developer |
| S3-7 | Create content dialog reorder (text-first) | LOW | S | ITEM-21 | @angular-developer |
| S3-8 | Bottom nav tracking bridge | LOW | XS | ITEM-22 | @angular-developer |
| S3-9 | DashboardGreetingComponent redesign (streak hero) | MEDIUM | S | ITEM-4 | @angular-developer |
| S3-10 | Emotional feedback states (completion celebrations) | MEDIUM | S | ITEM-6 | @angular-developer |

**S3-1 Details: AiDailyInsightComponent**
- Path: `features/dashboard/ai-daily-insight/`
- Groq API call once/day, cached in localStorage per date
- System prompt includes: calories vs target, macros, water, streak, energy, goal, yesterday summary
- States: loading skeleton, loaded text, error (silently hidden), dismissed (X button, per day)

**S3-2 Details: Notification redesign**
- Facade: `groupedNotifications` computed signal (groups by referenceId+type for like/follow/workout_kudos)
- Facade: `temporalGroups` computed signal (today / thisWeek / earlier)
- Replace `date:'short'` with `RelativeTimePipe`
- Avatar stacks (up to 3, -8px overlap)
- Type icon overlay (20×20px circle at bottom-right)
- Unread state: `var(--surface-hover)` bg + `3px solid var(--primary)` left border
- Replace "Load more" with IntersectionObserver infinite scroll

**S3-3 Details: Nutrition macro rings**
- 3 `ProgressRingComponent` instances (protein, carbs, fat) above filter row
- `NutritionTabFacade`: add `todayTotals` computed signal

**S3-4 Details: Discover filter bar + featured block**
- Filter chips: All | Weight Loss | Muscle Gain | Endurance | Maintenance | Trending
- Client-side filtering on `fitnessGoal`
- Featured block: 3 cards (Challenge, Trending Exercise, Featured Athlete) — initially static/mock data

---

### Sprint 4 — Polish Pass (1 week)

**Goal:** Me tab restructure (achievements, settings), milestone post template, history accordion, remaining token violations, final review.

**Visual milestone:** Me tab shows achievements placeholder + organized settings. Milestone posts render with gold treatment.

**Agent assignments:**
- @angular-developer: all items
- @code-reviewer: final review of all sprints
- @security-auditor: privacy verification before production

**Items:**

| ID | Task | Priority | Effort | Backlog | Agent |
|----|------|----------|--------|---------|-------|
| S4-1 | Me tab: achievements placeholder | MEDIUM | S | ITEM-29 | @angular-developer |
| S4-2 | Me tab: settings organization | MEDIUM | S | ITEM-29 | @angular-developer |
| S4-3 | Profile tab: "Preview my profile" button | LOW | XS | ITEM-29 | @angular-developer |
| S4-4 | Bottom nav tracking bridge (if not done in S3) | LOW | XS | ITEM-22 | @angular-developer |
| S4-5 | Create content: text-first reorder | LOW | XS | ITEM-21 | @angular-developer |
| S4-6 | Milestone post template in PostCard | LOW | S | ITEM-32 | @angular-developer |
| S4-7 | DashboardHistoryAccordionComponent | LOW | S | ITEM-15 | @angular-developer |
| S4-8 | Day 1 guide (DayOneGuideComponent) | MEDIUM | M | ITEM-12 | @angular-developer |
| S4-9 | DashboardPageComponent full restructure | HIGH | M | ITEM-11 | @angular-developer |

---

## Complete Component Inventory

### New Angular Components (19 total)

| # | Component | Path | Sprint | Priority | Purpose |
|---|-----------|------|--------|----------|---------|
| 1 | `RelativeTimePipe` | `shared/pipes/relative-time.pipe.ts` | S0 | P0 | "2h ago" / "3d ago" display |
| 2 | `animateCounter` | `shared/utils/animate-counter.ts` | S0 | P1 | requestAnimationFrame number animation |
| 3 | `FitnessDataBlockComponent` | `features/social/components/fitness-data-block/` | S1 | P0 | Workout/meal data display block |
| 4 | `ReactionBarComponent` | `features/social/components/reaction-bar/` | S1 | P0 | Reaction system with picker popover |
| 5 | `ProgressRingComponent` | `features/dashboard/progress-ring/` | S2 | P0 | SVG progress ring (sm/md/lg) |
| 6 | `ProgressRingsHeroComponent` | `features/dashboard/progress-rings-hero/` | S2 | P0 | Three-ring hero section |
| 7 | `MetricCardsGridComponent` | `features/dashboard/metric-cards-grid/` | S2 | P0 | 2-col metric card layout |
| 8 | `CaloriesRemainingCardComponent` | `features/dashboard/metric-cards-grid/` | S2 | P0 | Inline ring + "X kcal remaining" |
| 9 | `MacroProgressCardComponent` | `features/dashboard/metric-cards-grid/` | S2 | P0 | Full-span 3-bar macro progress |
| 10 | `WeightCardComponent` | `features/dashboard/metric-cards-grid/` | S2 | P1 | Quick-input weight card |
| 11 | `EnergyCardComponent` | `features/dashboard/metric-cards-grid/` | S2 | P1 | Emoji selector energy card |
| 12 | `QuickActionsStripComponent` | `features/dashboard/quick-actions-strip/` | S2 | P1 | Horizontal action chip row |
| 13 | `UserStatsChipComponent` | `features/social/components/user-stats-chip/` | S2 | P0 | Athletic identity pill |
| 14 | `DiscoverUserCardComponent` | `features/social/discover/user-card/` | S2 | P1 | User card with fitness context |
| 15 | `AiDailyInsightComponent` | `features/dashboard/ai-daily-insight/` | S3 | P1 | AI insight sentence |
| 16 | `DiscoverFilterBarComponent` | `features/social/discover/filter-bar/` | S3 | P1 | Horizontal scrollable filter chips |
| 17 | `FeaturedBlockComponent` | `features/social/discover/featured-block/` | S3 | P1 | 3-card featured content |
| 18 | `DashboardHistoryAccordionComponent` | `features/dashboard/dashboard-history-accordion/` | S4 | P2 | Collapsed accordion for history |
| 19 | `DashboardFacade` | `core/facade/dashboard.facade.ts` | S2 | P0 | Writable metric signals + auto-save |

### Modified Angular Components (21 total)

| # | Component | Sprint(s) | Key Changes |
|---|-----------|-----------|-------------|
| 1 | `PostCardComponent` | S1, S4 | Type branching, ReactionBar, FitnessDataBlock, inProfileContext, RelativeTimePipe |
| 2 | `SocialProfileComponent` | S2 | UserStatsChip, workouts/mo stat, streak avatar ring, chronological post list |
| 3 | `SocialDiscoverComponent` | S2, S3 | User card grid, filter bar, featured block |
| 4 | `SocialNotificationsComponent` | S3 | Grouped notifications, temporal sections, avatar stacks |
| 5 | `SocialFeedComponent` | S3 | New posts pill, pull-to-refresh, refresh button |
| 6 | `SocialDailyPanelComponent` | S3 | Quick-log footer with water + nav buttons |
| 7 | `SocialBottomNavComponent` | S3/S4 | "Track" tab replaces "Me" tab |
| 8 | `CreateContentComponent` | S3/S4 | Text-first layout, compact image strip |
| 9 | `UserPageComponent` | S1, S4 | Inline color removal, achievements tab, settings restructure |
| 10 | `ProfileTabComponent` | S4 | "Preview my profile" button |
| 11 | `NutritionTabComponent` | S1, S3 | Token migration, macro summary header |
| 12 | `ActiveWorkoutSessionComponent` | S1 | Token migration, font size increases |
| 13 | `WorkoutsContentComponent` | S1 | Token migration, stagger animation, empty state |
| 14 | `AiChatBottomSheetComponent` | S1 | Token migration, AI avatar, touch targets |
| 15 | `DailyUserDataComponent` | S2 | Gradually emptied as metric cards take over (ADR-3) |
| 16 | `SocialFacade` | S1, S2, S3 | toggleLike with reactionType, newPostsAvailable signal |
| 17 | `SocialNotificationsFacade` | S3 | groupedNotifications, temporalGroups signals |
| 18 | `NutritionTabFacade` | S3 | todayTotals computed signal |
| 19 | `UserFacade` | S2 | proteinTargetG, carbsTargetG, fatTargetG signals |
| 20 | `SocialService (API)` | S1, S2 | toggleLike body, getDiscoverUsers method |
| 21 | `social.model.ts` | S1, S2 | LinkedContentData, reaction fields, DiscoverUserCard, profile fields |

---

## API Contract Changes

### Modified Endpoints

| Method | Route | Auth | Change | Sprint | ADR |
|--------|-------|------|--------|--------|-----|
| POST | `/api/social/posts/{id}/like` | Bearer | Accepts `LikeToggleRequest?` body; response adds `myReactionType`, `reactionCounts` | S1-BE-2 | ADR-2 |
| GET | `/api/social/feed` | Bearer | `PostResponse` adds `linkedContentData`, `myReactionType`, `reactionCounts` | S1-BE-1/2 | ADR-1,2 |
| GET | `/api/social/discover` | Bearer | Same extensions | S1-BE-1/2 | ADR-1,2 |
| GET | `/api/social/posts/{id}` | Bearer | Same extensions | S1-BE-1/2 | ADR-1,2 |
| GET | `/api/social/profile/{userId}/posts` | Bearer | Same extensions | S1-BE-1/2 | ADR-1,2 |
| POST | `/api/social/posts` | Bearer | Populates `LinkedContentDataJson` on creation | S1-BE-1 | ADR-1 |
| GET | `/api/social/profile/{userId}` | Bearer | Adds `monthlyWorkoutCount`, `currentStreak`, `fitnessGoal` | S2-BE-1 | ADR-4 |

### New Endpoints

| Method | Route | Auth | Request | Response | Sprint | ADR |
|--------|-------|------|---------|----------|--------|-----|
| GET | `/api/social/discover/users` | Bearer | `?page=1&pageSize=20` | `PaginatedResponse<DiscoverUserCardResponse>` | S2-BE-1 | ADR-4 |

### Unchanged Endpoints

All auth, daily, nutrition, workouts, blog, AI, chat, conversations, and notifications endpoints remain unchanged.

---

## Backend Files Modified

| File | Sprint | Changes |
|------|--------|---------|
| `Models/Entities/Post.cs` | S1-BE-1 | Add `LinkedContentDataJson` nullable string |
| `Models/Entities/Like.cs` | S1-BE-2 | Add `ReactionType` nullable string |
| `Models/DTOs/SocialDtos.cs` | S1-BE-1, S1-BE-2, S2-BE-1 | `LinkedContentDataDto`, `LikeToggleRequest`, `DiscoverUserCardResponse`, extended responses |
| `Services/SocialService.cs` | S1-BE-1, S1-BE-2, S2-BE-1 | Populate LinkedContentData, 3-case toggle, reaction counts, discover users, monthly counts, mutual follows |
| `Controllers/SocialController.cs` | S1-BE-2, S2-BE-1 | ToggleLike signature, GET discover/users |
| `Data/AppDbContext.cs` | S2-BE-1 | WorkoutSessions(UserId, FinishedAt) index |

### EF Migrations (3 total)

1. `AddLinkedContentDataJsonToPost` — Sprint 1 (nullable TEXT column, no data migration)
2. `AddReactionTypeToLike` — Sprint 1 (nullable TEXT column, no data migration)
3. `AddWorkoutSessionUserIdFinishedAtIndex` — Sprint 2 (index only, no column changes)

---

## Prioritized Backlog

### TIER 0 — Design System Foundation (Sprint 0)

| ID | Category | Retention | Effort | Backend? | Sprint |
|----|----------|-----------|--------|----------|--------|
| ITEM-0A | Design System | L | S | No | S0 |
| ITEM-0B | Design System | L | M | No | S0 |
| ITEM-0C | Design System | L | M | No | S0–S1 |
| ITEM-0D | Design System | L | S | No | S0 |
| ITEM-0E | Design System | L | S | No | S0 |

### TIER 1 — High Retention, S/M Effort (Sprint 1)

| ID | Category | Retention | Effort | Backend? | Sprint |
|----|----------|-----------|--------|----------|--------|
| ITEM-1 | Dashboard | H | M | No | S2 |
| ITEM-2 | Dashboard | H | M | No | S2 |
| ITEM-3 | Dashboard | H | S | No | S2 |
| ITEM-4 | Dashboard | H | S | No | S3 |
| ITEM-5 | Dashboard | H | M | No | S2 |
| ITEM-6 | Dashboard | H | S | No | S3 |
| ITEM-7 | beSocial | H | M | **Yes (ADR-1)** | S1 |
| ITEM-8 | beSocial | H | M | Same | S1 |
| ITEM-9 | beSocial | H | S | No | S3 |

### TIER 2 — High Retention, L Effort (Sprint 2)

| ID | Category | Retention | Effort | Backend? | Sprint |
|----|----------|-----------|--------|----------|--------|
| ITEM-10 | Dashboard | H | L | No (ADR-3) | S2 |
| ITEM-11 | Dashboard | H | M | No | S4 |
| ITEM-12 | Dashboard | H | M | No | S4 |
| ITEM-13 | beSocial | H | L | **Yes (ADR-2)** | S1–S2 |
| ITEM-14 | beSocial | M | M | **Yes (ADR-4)** | S2 |
| ITEM-15 | Dashboard | M | S | No | S4 |

### TIER 3 — Medium Retention (Sprint 3)

| ID | Category | Retention | Effort | Backend? | Sprint |
|----|----------|-----------|--------|----------|--------|
| ITEM-16 | Dashboard | M | M | No | S3 |
| ITEM-17 | beSocial | M | L | No | S3 |
| ITEM-18 | beSocial | M | S | No | S2 |
| ITEM-19 | beSocial | M | L | **Yes (ADR-4)** | S2–S3 |
| ITEM-20 | beSocial | M | S | No | S3 |
| ITEM-21 | beSocial | M | S | No | S3/S4 |
| ITEM-22 | beSocial | M | S | No | S3/S4 |
| ITEM-23 | beSocial | M | S | No | S3 |
| ITEM-24 | Nutrition | M | M | No | S3 |

### TIER 4 — Low Retention (Sprint 4)

| ID | Category | Retention | Effort | Backend? | Sprint |
|----|----------|-----------|--------|----------|--------|
| ITEM-25 | Workouts | L | S | No | S1 |
| ITEM-26 | Workouts | L | S | No | S1 |
| ITEM-27 | Nutrition | L | S | No | S1 |
| ITEM-28 | AI Chat | L | S | No | S1 |
| ITEM-29 | Me Tab | L | M | No | S1/S4 |
| ITEM-30 | beSocial | L | S | No | S4 |
| ITEM-31 | beSocial | L | S | No | S4 |

### TIER 5 — Future Consideration (Parked)

| ID | Item | Blocker |
|----|------|---------|
| ITEM-32 | Milestone post card type | Backend PR detection doesn't exist |
| ITEM-33 | Featured content block (real data) | Backend featured content endpoints don't exist |
| ITEM-34 | Group DMs | Depends on challenge system |
| ITEM-35 | Fitness content sharing in DMs | Backend MessageType enum change needed |
| ITEM-36 | New notification types | Depends on ITEM-13 + ITEM-32 |
| ITEM-37 | Engagement-weighted feed | Premature at current scale |

---

## Dependency Graph

```
Sprint 0 (parallel — 1 week):
  ITEM-0A (tokens) → ITEM-0B (hardcoded colors) → ITEM-0C (semantic migration)
  ITEM-0D (RelativeTimePipe) — independent
  ITEM-0E (animateCounter) — independent

Sprint 1 (2 weeks):
  ITEM-0A → ITEM-7 (FitnessDataBlock) → ITEM-8 (PostCard branching)
  ITEM-0A → ITEM-13 Phase 1 (ReactionBar heart-only)
  ITEM-0A → ITEM-25/26/27/28/29 (token migrations)
  [Backend parallel] ADR-1 migration + ADR-2 migration

Sprint 2 (2 weeks):
  ITEM-0A + ITEM-0E → ITEM-1 (ProgressRing) → ITEM-2 (RingsHero)
  ITEM-3 (facade signals) → ITEM-2, ITEM-10
  ITEM-1 + ITEM-3 → ITEM-10 (MetricCardsGrid) → ITEM-11 (DashboardPage capstone)
  ITEM-0A → ITEM-18 (UserStatsChip) → ITEM-14 (Profile hero)
  ITEM-0A → ITEM-5 (QuickActionsStrip)
  ADR-2 backend → ITEM-13 Phase 2 (full reaction picker)
  [Backend parallel] ADR-4 migration + endpoints

Sprint 3 (2 weeks):
  ITEM-3 → ITEM-16 (AI insight)
  ITEM-0D → ITEM-17 (notification redesign)
  ITEM-18 → ITEM-19 (Discover redesign)
  ITEM-9 (pull-to-refresh) — independent
  ITEM-4 (greeting streak hero) — independent
  ITEM-6 (celebrations) — depends on ITEM-2, ITEM-3
  ITEM-20, ITEM-21, ITEM-22, ITEM-23 — independent

Sprint 4 (1 week):
  ITEM-3 → ITEM-12 (Day 1 guide)
  ITEM-2 + ITEM-10 + ITEM-16 + ITEM-15 → ITEM-11 (DashboardPage capstone)
  ITEM-25–ITEM-31 — independent polish
```

**Critical path:** S0-1 → S1-1 (FitnessDataBlock) → S1-3 (PostCard) → S2-1 (ProgressRing) → S2-2 (RingsHero) → S2-3 (MetricCards) → S4-9 (DashboardPage)

**Backend critical path:** ADR-1 (S1) → ADR-2 (S1) → ADR-4 (S2)

---

## Risk Register

| ID | Risk | Impact | Mitigation | ADR |
|----|------|--------|-----------|-----|
| RISK-1 | FitnessDataBlock needs structured API data | S1 blocked | Frontend falls back to subtitle string when `linkedContentData` is null | ADR-1 |
| RISK-2 | Like.ReactionType schema migration | S2 reaction picker blocked | Existing likes default to "heart"; nullable column, no data migration | ADR-2 |
| RISK-3 | DailyUserData form → signal refactor | S2 MetricCards regression risk | Incremental migration; old form preserved during transition | ADR-3 |
| RISK-4 | monthlyWorkoutCount + mutualFollowersCount N+1 | Discover page latency | Composite index; batch queries; pageSize capped at 50 | ADR-4 |
| RISK-5 | Privacy leak in profile redesign | Weight trend visible to visitors | `@if (isOwnProfile)` guards; @security-auditor verification | — |
| RISK-6 | Milestone posts need backend PR detection | ITEM-32 blocked | Correctly parked in Tier 5 | — |

---

## Privacy Verification Checklist

Before each sprint ships, @code-reviewer verifies:

- [ ] No `Bmi`, `Bmr`, `Tdee`, `GoalCalories`, `ManualWeight` fields in any social/public endpoint response
- [ ] `UserSocialProfileResponse` does NOT include `bmi`, `bmr`, `tdee`, `goalCalories`
- [ ] `DiscoverUserCardResponse` does NOT include any health metric
- [ ] `LinkedContentData` for meals includes macros (user chose to share) but NOT private health metrics
- [ ] Stats tab hides weight trend chart for `isOwnProfile === false`
- [ ] UserId always from JWT claims in all new/modified endpoints
- [ ] No private data in SignalR broadcast payloads

---

## Success Metrics

| Metric | Target | Measured When |
|--------|--------|---------------|
| D7 retention | +15% | After progress rings + completion celebrations ship (Sprint 2) |
| Social post creation rate | +3x | After fitness data blocks + reaction system ship (Sprint 1–2) |
| Dashboard comprehension time | <3 seconds (from 8–15s) | After rings hero ships |
| Feed engagement (reactions/post) | +2x | After 4-type reaction system ships |

---

## Agent Assignment Summary

| Agent | Sprint 0 | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 |
|-------|----------|----------|----------|----------|----------|
| @angular-developer | S0-1 through S0-5 | S1-1 through S1-8 | S2-1 through S2-8 | S3-1 through S3-10 | S4-1 through S4-9 |
| @dotnet-developer | — | S1-BE-1, S1-BE-2 | S2-BE-1 | Flag new notif types | — |
| @code-reviewer | — | — | — | — | Final review all sprints |
| @security-auditor | — | — | — | — | Privacy audit before prod |
| @test-engineer | — | — | — | — | Regression suite |

---

## How to Use This Document

1. **Before starting any sprint:** Read this document + the relevant ADR(s)
2. **@dotnet-developer:** Search for "S*-BE-*" items — those are your tasks
3. **@angular-developer:** Search for "S*-*" items (excluding BE) — those are your tasks
4. **Component specs:** For visual details, read the `design-specs/` files referenced in each item
5. **Token values:** Always reference `design-system/tokens.md` Section 11 — never hardcode colors
6. **ADR details:** Full ADR files are in `.claude/decisions/redesign-adr-{1,2,3,4}.md`
7. **When in doubt:** This document is the single source of truth for scope, ordering, and contracts

---

## Dashboard Sprint — Isolated Plan (2026-06-10)

> Supersedes the Sprint 2 dashboard section above. The Sprint 2 dashboard was built but reverted because it replaced the interactive logging cards with a read-only view. This new plan adds the progress visualization layer ON TOP of the unchanged logging cards.

### Design spec: `.claude/design-specs/dashboard-redesign.md` (updated 2026-06-10)

### Sprint tasks — ordered by dependency

**DASH-1** Add 4 computed signals to `DashboardFacade`
- `caloriesTarget`, `proteinTargetG`, `carbsTargetG`, `fatTargetG`
- Source: `userFacade.metrics()?.tdee` — no new API calls
- Unblocks: DASH-2, DASH-3

**DASH-2** Wire `RingsHeroComponent` into `DashboardPageComponent`
- Component exists, just needs `@Input()` bindings from `DashboardFacade` + `UserFacade`
- Position: between `<app-dashboard>` (greeting) and `<app-daily-user-data>`
- Unblocks: nothing (visual addition)

**DASH-3** Wire `MacroProgressCardComponent` into `DashboardPageComponent`
- Component exists, bindings need `proteinTargetG`, `carbsTargetG`, `fatTargetG` from DASH-1
- Position: between rings hero and `<app-daily-user-data>`

**DASH-4** Wire `AiInsightCardComponent` into `DashboardPageComponent`
- Component exists, `DashboardFacade.loadAiInsight()` exists
- Call `loadAiInsight()` in `DashboardPageComponent.ngOnInit()`
- Position: below `<app-daily-user-data>`, above history

**DASH-5** Create `QuickActionsStripComponent`
- Replaces visual role of ctrl-bar in `DailyUserDataComponent`
- Chips: +500ml, Log Meal, AI Analyze, Weekly Balance, Activity, Reset
- Outputs to parent → parent calls existing handlers
- Depends on: nothing (ctrl-bar removal is separate)

**DASH-6** Remove ctrl-bar from `DailyUserDataComponent`
- Remove `.ctrl-wrap` block from template and ctrl-bar CSS from stylesheet
- Autosave badge: keep as `position: fixed; bottom: 24px; right: 16px` floating indicator
- Depends on: DASH-5 (must exist before removal)

**DASH-7** Create `DashboardHistoryAccordionComponent`
- Simple wrapper around `<app-previous-daily-user-data>`
- `isOpen = signal(false)` — default closed
- Replaces direct `<app-previous-daily-user-data>` in `DashboardPageComponent`

### Estimated effort

| Task | Complexity |
|------|-----------|
| DASH-1 | XS (4 computed signals) |
| DASH-2 | XS (template bindings only) |
| DASH-3 | XS (template bindings only) |
| DASH-4 | XS (template bindings + ngOnInit call) |
| DASH-5 | S (new component, ~120 lines) |
| DASH-6 | XS (template deletion + CSS cleanup) |
| DASH-7 | XS (new component, ~50 lines) |

Total: ~4–6 hours of implementation.

### What does NOT change

- All 3 logging cards (Nutrition, Calories Burned, Hydration & Steps)
- Auto-save logic (`autoSaveStatus`)
- All modals (meal picker, calorie balance, AI analyzer)
- `PreviousDailyUserDataComponent` internals
- Backend — no API changes needed
