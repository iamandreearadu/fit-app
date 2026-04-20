# ADR: Stats Tab in Social Profile

**Status:** APPROVED  
**Author:** @tech-architect  
**Date:** 2026-04-11

---

## Context

FitApp already collects rich fitness data per user: daily entries (weight, calories), workouts (exercises, sets, reps, weights), and nutrition. This data lives in the main app but is invisible in the social context. Users visiting a social profile see posts and articles but have no sense of the person's actual fitness progress or consistency.

Adding a "Stats" tab to the social profile ties the fitness tracking and social layers together — giving users a meaningful public signal of progress (workout consistency, volume) while keeping sensitive data (body weight, calorie intake) private.

---

## Decision

### 1. Data Strategy — Two separate data paths

**Own profile (isOwnProfile = true):**  
Reuse existing authenticated endpoints directly via existing facades:
- `GET /api/daily` — already in `DailyFacade`, returns full DailyEntry[] for current user
- `GET /api/workouts` — already in `WorkoutsFacade`, returns WorkoutTemplate[] with exercises

The Angular component aggregates these on the frontend (streak calculation, averages, volume per week). No new backend work needed for own profile.

**Other user's profile (isOwnProfile = false):**  
A new endpoint `GET /api/users/{userId}/stats` returns pre-aggregated **public-only** metrics. Raw data (weight, calories) is never exposed. The backend aggregates and filters before returning.

### 2. Privacy Model

| Metric | Own profile | Other profile |
|--------|-------------|---------------|
| Weight (kg, chart) | ✅ Full chart | ❌ Hidden |
| Calories (chart + average) | ✅ Full chart | ❌ Hidden |
| Active day streak | ✅ | ✅ Public |
| Workouts this month | ✅ | ✅ Public |
| Weekly workout volume (kg) | ✅ Full chart | ✅ Public (chart only, no raw weights) |
| Recent workouts (names) | ✅ | ✅ Public (name + date only) |

Rationale: weight and calories are sensitive health data. Workout consistency and volume are social signals athletes voluntarily share (similar to Strava public activities).

### 3. Aggregation Location

- **Own profile:** Frontend aggregates (streak, averages, volume per week) from raw API data already loaded. Keeps backend simple, no duplication.
- **Other profiles:** Backend aggregates in `UsersService`. Reasons: (a) we cannot send another user's raw data to the frontend, (b) DB-side aggregation is more efficient than fetching hundreds of entries over HTTP.

### 4. Chart Library

Chart.js + ng2-charts already installed (`chart.js@4.5.1`, `ng2-charts@4.1.1`). Use `BaseChartDirective` from ng2-charts. No new dependencies.

### 5. Tab placement

Fourth tab in `SocialProfileComponent`, after Posts / Workouts / Articles. Tab icon: `bar_chart`. Label: "Stats". Only shown when `activeTab() === 'stats'`.

---

## New Endpoint

`GET /api/users/{userId}/stats` — see contract in `.claude/contracts/stats-tab.md`

Placed in `UsersController`. Returns 404 if user not found, 200 with `UserPublicStatsResponse` otherwise. No auth required beyond standard JWT (any authenticated user can view any other user's public stats).

---

## Clean Architecture Boundaries

- `UsersController` → `UsersService.GetPublicStatsAsync(userId)` → EF Core aggregation queries
- No business logic in controller
- New `UserPublicStatsResponse` DTO — never expose EF entities
- Angular: new `StatsProfileComponent` (standalone, lazy within profile tab) — injects `SocialFacade` (for public stats) and existing `DailyFacade` + `WorkoutsFacade` (for own stats)
- Components never call API services directly — only through facades

---

## Consequences

### Gains
- Rich social profiles with real fitness signal
- Zero new backend work for own profile view
- Privacy-safe public stats for other users
- Chart.js already available — no bundle cost

### Trade-offs
- Frontend aggregation for own profile means streak/volume recalculated on every tab open (acceptable — data is already in memory from facades)
- New endpoint needed for public stats (small, read-only, simple aggregation)

### Must NOT happen
- Raw DailyEntry (weight, calories) of another user must never appear in any API response
- Components must not call `DailyService` or `WorkoutsService` directly — only through facades
- No new RxJS subscriptions without `takeUntilDestroyed()`
