# API Contract: Fix 7 — First Login Guided Empty States

**Status:** `COMPLETE`
**Author:** @dotnet-developer
**Date:** 2026-05-29
**Design Spec:** `.claude/design-specs/fix-7-empty-states.md`

---

## Overview

Fix 7 delivers two backend changes that power the guided empty states:

1. **System Workout Templates** — three globally-seeded templates (Push Day, Pull Day, Full Body)
   flagged `IsSystemTemplate: true`. They appear in `GET /api/workouts` only when the user
   has zero personal templates, giving the frontend a consistent `isSystemTemplate` signal.

2. **Suggested Users endpoint** — new `GET /api/social/discover/suggested` returns up to 5
   follow suggestions for the social-feed guided empty state. Same-goal users are surfaced
   first; secondary sort is workouts completed this month. Privacy-safe: no BMI, weight,
   calories, BMR, or TDEE is ever returned.

---

## Endpoint 1 — Workout Templates List (modified)

### `GET /api/workouts`

Behaviour unchanged for users who have personal templates.

**New fallback behaviour (zero personal templates):**  
When the user has no personal templates (i.e. no `WorkoutTemplate` rows with their `UserId`
and `IsSystemTemplate = false`), the endpoint returns the 3 seeded system templates instead
of an empty list. All items in the fallback response have `isSystemTemplate: true`.

**Frontend trigger condition (guided empty state):**  
```typescript
// Replaces the old: workoutTemplates().length === 0
workoutTemplates().every(t => t.isSystemTemplate)   // true → show guided state
```

**Response shape — no change to existing fields, one field added:**

```json
{
  "items": [
    {
      "id": 1,
      "title": "Push Day",
      "type": "Strength",
      "durationMin": 60,
      "caloriesEstimateKcal": 320,
      "notes": "Chest · Shoulders · Triceps",
      "isSystemTemplate": true,
      "exercises": [
        { "name": "Bench Press",      "sets": 4, "reps": 10, "weightKg": 60 },
        { "name": "Overhead Press",   "sets": 3, "reps": 10, "weightKg": 40 },
        { "name": "Tricep Pushdowns", "sets": 3, "reps": 12, "weightKg": 20 },
        { "name": "Lateral Raises",   "sets": 3, "reps": 15, "weightKg": 8  },
        { "name": "Push-ups",         "sets": 3, "reps": 15, "weightKg": 0  }
      ],
      "cardio": null,
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-01T00:00:00Z"
    }
    // … Pull Day, Full Body (same shape)
  ],
  "hasMore": false,
  "page": 1,
  "pageSize": 20
}
```

**Constraints on system templates:**
- `isSystemTemplate: true` — frontend must never show Edit / Delete actions.
- Attempting to `PUT /api/workouts/{id}` or `DELETE /api/workouts/{id}` for a system
  template returns `404` (the `UserId == requestingUserId` guard rejects it naturally
  since system templates have a null UserId).
- Once the user saves any personal template via `POST /api/workouts`, the fallback is
  no longer triggered and system templates are hidden from subsequent list calls.

---

## Endpoint 2 — Suggested Users (new)

### `GET /api/social/discover/suggested`

| Property | Value |
|----------|-------|
| Method | GET |
| Route | `/api/social/discover/suggested` |
| Auth | Bearer (JWT) |
| Controller | `SocialController` |
| Service | `ISocialService.GetSuggestedUsersAsync` |

**Query parameters:**

| Param | Type | Default | Max | Description |
|-------|------|---------|-----|-------------|
| `limit` | int | 5 | 5 | Number of suggestions to return. Hard-capped at 5 server-side. |

**Response: 200 OK**

```json
[
  {
    "userId": "abc123",
    "displayName": "Jane Doe",
    "avatarUrl": "https://...",
    "fitnessGoal": "gain",
    "workoutsThisMonth": 7
  },
  {
    "userId": "def456",
    "displayName": "John Smith",
    "avatarUrl": null,
    "fitnessGoal": "lose",
    "workoutsThisMonth": 3
  }
]
```

**Field definitions:**

| Field | Type | Null? | Description |
|-------|------|-------|-------------|
| `userId` | string | no | User ID string (not int) |
| `displayName` | string | no | User's full name |
| `avatarUrl` | string? | yes | Profile image URL, null if not set |
| `fitnessGoal` | string? | yes | Raw User.Goal: `"lose"` \| `"gain"` \| `"maintain"` — null if not set |
| `workoutsThisMonth` | int | no | Count of completed WorkoutSessions in current UTC month |

**Sorting algorithm:**
1. Exclude self and already-followed users.
2. Users whose `fitnessGoal` matches the requesting user's goal come first.
3. Within each priority group, sort descending by `workoutsThisMonth`.
4. Return top N (≤ 5).

**Empty response (200 OK, empty array):**  
Returned when there are no other users, or all other users are already followed.

**Error responses:**

| Status | When |
|--------|------|
| 401 | Missing or invalid JWT |
| 500 | Unexpected server error (ProblemDetails) |

**Privacy constraints (hard rules):**
- MUST NOT include: BMI, weight, height, body fat %, calories, BMR, TDEE, GoalCalories, WaterL.
- `fitnessGoal` is the raw goal category string — a goal classification, not a caloric target. Safe to expose.
- `workoutsThisMonth` is a count integer with no health data embedded.

---

## TypeScript Interfaces (for `@angular-developer`)

### `core/models/workout.model.ts` — add `isSystemTemplate`

```typescript
export interface WorkoutTemplate {
  id: number;
  title: string;
  type: string;
  durationMin: number;
  caloriesEstimateKcal: number;
  notes?: string;
  exercises: WorkoutExercise[];
  cardio?: CardioDetails;
  createdAt: string;
  updatedAt: string;
  isSystemTemplate: boolean;   // ← NEW — false for all user-owned templates
}
```

### `core/models/social.model.ts` — add `SuggestedUser`

```typescript
export interface SuggestedUser {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  fitnessGoal: 'lose' | 'gain' | 'maintain' | null;
  workoutsThisMonth: number;
}
```

### Guided-state trigger change (workouts)

```typescript
// WorkoutsTabFacade — change empty-state detection:

// OLD (triggers when API returns 0 items):
// workoutTemplates().length === 0

// NEW (triggers when API returns only system templates):
workoutTemplates().every(t => t.isSystemTemplate)
// This is equivalent to: no personal templates exist yet.
// Once the user saves one via POST /api/workouts, the system templates
// are replaced by personal ones and the above condition becomes false.
```

### Social facade — add `getSuggestedUsers`

```typescript
// api/social.service.ts
getSuggestedUsers(limit = 5): Observable<SuggestedUser[]> {
  return this.http.get<SuggestedUser[]>(
    `${this.baseUrl}/api/social/discover/suggested`,
    { params: { limit } }
  );
}
```

---

## Database Schema Changes

**Migration:** `20260529084321_AddSystemWorkoutTemplates`

| Table | Change |
|-------|--------|
| `WorkoutTemplates` | `UserId` → nullable TEXT (was non-nullable) |
| `WorkoutTemplates` | `IsSystemTemplate` INTEGER NOT NULL DEFAULT 0 (new column) |

**Seeded data** (3 rows, `UserId = null`, `IsSystemTemplate = 1`):

| Title | Type | DurationMin | CaloriesEstimateKcal | Exercises |
|-------|------|-------------|----------------------|-----------|
| Push Day | Strength | 60 | 320 | 5 (Bench Press, Overhead Press, Tricep Pushdowns, Lateral Raises, Push-ups) |
| Pull Day | Strength | 55 | 290 | 5 (Pull-ups, Barbell Rows, Lat Pulldown, Bicep Curls, Face Pulls) |
| Full Body | Strength | 70 | 400 | 5 (Back Squats, Bench Press, Romanian Deadlift, Pull-ups, Shoulder Press) |

---

## Files Changed

```
FitApp.Api/Models/Entities/WorkoutTemplate.cs
  + IsSystemTemplate: bool (default false)
  ~ UserId: string → string? (nullable — null for system templates)
  ~ User: User → User? (nullable nav property)

FitApp.Api/Data/AppDbContext.cs
  ~ WorkoutTemplate FK: .IsRequired(false) + explicit .OnDelete(Cascade)

FitApp.Api/Models/DTOs/WorkoutDtos.cs
  + WorkoutTemplateDto.IsSystemTemplate: bool

FitApp.Api/Services/WorkoutService.cs
  ~ ListAsync: fallback to system templates when user has 0 personal templates
  ~ MapToDto: propagates IsSystemTemplate

FitApp.Api/Models/DTOs/SocialDtos.cs
  + SuggestedUserResponse class (userId, displayName, avatarUrl, fitnessGoal, workoutsThisMonth)

FitApp.Api/Services/ISocialService.cs
  + GetSuggestedUsersAsync(requestingUserId, limit) → Task<List<SuggestedUserResponse>>

FitApp.Api/Services/SocialService.cs
  + GetSuggestedUsersAsync implementation

FitApp.Api/Controllers/SocialController.cs
  + GET /api/social/discover/suggested → GetSuggestedUsers([FromQuery] int limit = 5)

FitApp.Api/Data/Seeds/WorkoutTemplateSeeder.cs   (NEW)
  + SeedAsync — idempotent, seeds 3 system templates

FitApp.Api/Program.cs
  + WorkoutTemplateSeeder.SeedAsync(db) call

FitApp.Api/Migrations/20260529084321_AddSystemWorkoutTemplates.cs   (NEW)
```

---

## Implementation Log

```
2026-05-29 - BACKEND_READY confirmed by @dotnet-developer

  Migration: 20260529084321_AddSystemWorkoutTemplates
    - WorkoutTemplates.UserId: TEXT non-nullable → TEXT nullable
    - WorkoutTemplates.IsSystemTemplate: INTEGER NOT NULL DEFAULT 0 (new)

  Services registered: no new DI registrations (ISocialService already registered)

  Build: dotnet build → 0 errors, 2 warnings (pre-existing MailKit advisory)

  Notes:
    - System templates are seeded via WorkoutTemplateSeeder.SeedAsync (idempotent).
      They have UserId = null. The existing UserId == requestingUserId guard in
      UpdateAsync / DeleteAsync already prevents users from modifying them — no
      explicit guard added.
    - ListAsync fallback: when AnyAsync(w.UserId == userId && !w.IsSystemTemplate)
      returns false, system templates are returned so the frontend always gets 3
      items with isSystemTemplate = true. Frontend trigger changes from
      `length === 0` to `every(t => t.isSystemTemplate)`.
    - GET /api/social/discover/suggested: hard cap at 5 users, never exposes
      BMI/weight/calories/BMR/TDEE. fitnessGoal is the raw Goal category string.
      workoutsThisMonth uses WorkoutSession.FinishedAt >= month-start UTC.

  Ready for: @angular-developer

2026-05-29 - COMPLETE confirmed by @angular-developer

  Frontend implementation:
    WorkoutsGuidedEmptyComponent
      features/workouts/guided-empty/workouts-guided-empty.component.{ts,html,css}
      - Receives WorkoutTemplate[] input from workouts-tab parent
      - Static TemplateVisualConfig map (badge, icon, muscleGroups) keyed by template.title
      - startingId signal tracks per-card loading state
      - cloneSystemTemplate(template) → POST /api/workouts → navigate /workout-session/:id
      - (createOwn) output → parent calls openCreate()
      - Desktop: 3-col grid; mobile: horizontal scroll with snap points

    NutritionGuidedEmptyComponent
      features/user/nutrition-tab/guided-empty/nutrition-guided-empty.component.{ts,html,css}
      - @Input isLoading (skeleton), @Input hasError (error banner)
      - @Output openAiAnalyzer → parent navigates to /user-dashboard?openAnalyzer=1
      - @Output openManualEntry → parent calls openCreate()
      - Single column, max-width 400px, mobile-optimised

    SocialFeedGuidedEmptyComponent
      features/social/feed/guided-empty/social-feed-guided-empty.component.{ts,html,css}
      - Self-contained: calls facade.loadSuggestedUsers(5) on init
      - followingSet / pendingFollowSet signals (component-local)
      - allFollowed computed → promotes Explore CTA + updates headline
      - follow(user) → facade.toggleFollow() → facade.incrementMyFollowingCount()
      - 5-skeleton pulse loading state; error banner with retry; no-users state
      - Staggered skeleton animation-delay; card-level pending spinner

  Model changes:
    WorkoutTemplate.isSystemTemplate: boolean (workouts-tab.model.ts)
    SuggestedUser interface (social.model.ts)

  Service changes:
    workouts-tab.service.ts: mapTemplate propagates isSystemTemplate
    social.service.ts: getSuggestedUsers(limit) → GET /api/social/discover/suggested

  Facade changes:
    WorkoutsTabFacade: templatesSignal, loadingSignal (readonly), cloneSystemTemplate()
    SocialFacade: myFollowingCount, isLoadingMyProfile, suggestedUsers, isLoadingSuggestions,
                  suggestionsError, loadMyFollowingCount(), incrementMyFollowingCount(),
                  loadSuggestedUsers()
    NutritionTabFacade: _error signal + error readonly, loadMeals() catches errors

  Trigger conditions:
    Workouts:  workoutTemplates().every(t => t.isSystemTemplate)  (workouts-tab.component)
    Nutrition: meals.length === 0  (nutrition-tab.component)
    Social:    feed.length === 0 && myFollowingCount() === 0 && !isLoadingMyProfile()

  Global styles (styles.css):
    @keyframes pulse added
    .guided-empty-container, .guided-empty-icon, .guided-empty-headline,
    .guided-empty-sub, .guided-empty-escape — all shared guided-empty classes added
```
