# API Contract: Stats Tab

**Status:** `COMPLETE`  
**Author:** @tech-architect  
**Date:** 2026-04-11

---

## Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /api/users/{userId}/stats | Bearer | Public aggregated stats for any user profile |

**Reused existing endpoints (own profile only — no changes needed):**

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /api/daily | Bearer | Raw daily entries (weight, calories) — own user only |
| GET | /api/workouts | Bearer | Workout templates with exercises — own user only |

---

## New Endpoint Detail

### `GET /api/users/{userId}/stats`

Returns **public-only** aggregated stats for any user. Does NOT expose raw weight or calorie data.

**Path param:** `userId` — string (GUID or int, match existing User PK type)

**Response: 200 OK**

```json
{
  "activeStreak": 7,
  "workoutsThisMonth": 12,
  "volumeThisMonth": 18450.0,
  "weeklyVolumes": [
    { "weekStart": "2026-03-16", "volumeKg": 2100.5 },
    { "weekStart": "2026-03-23", "volumeKg": 2450.0 },
    { "weekStart": "2026-03-30", "volumeKg": 1980.0 },
    { "weekStart": "2026-04-06", "volumeKg": 2600.0 }
  ],
  "recentWorkouts": [
    { "id": 42, "name": "Push Day A", "date": "2026-04-10", "volumeKg": 3200.0 },
    { "id": 41, "name": "Pull Day", "date": "2026-04-08", "volumeKg": 2800.5 },
    { "id": 40, "name": "Leg Day", "date": "2026-04-06", "volumeKg": 4100.0 }
  ]
}
```

**Response: 404 Not Found** — user does not exist

---

## Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `activeStreak` | int | Consecutive days with at least one workout OR daily entry, counting back from today |
| `workoutsThisMonth` | int | WorkoutTemplate count where CreatedAt is in current calendar month |
| `volumeThisMonth` | double | Sum of (sets × reps × weightKg) for all exercises this month. Use 0 for cardio/bodyweight |
| `weeklyVolumes` | array | Last 8 weeks, Monday–Sunday. `weekStart` = ISO date string of Monday. Empty weeks included with `volumeKg: 0` |
| `recentWorkouts[].id` | int | WorkoutTemplate.Id |
| `recentWorkouts[].name` | string | WorkoutTemplate.Name |
| `recentWorkouts[].date` | string | ISO date (yyyy-MM-dd) of WorkoutTemplate.CreatedAt |
| `recentWorkouts[].volumeKg` | double | Total volume for that session |

**Volume formula:** `SUM(exercise.Sets × exercise.Reps × exercise.WeightKg)` across all exercises in a workout. Cardio exercises or those with WeightKg = 0 contribute 0.

---

## Response DTOs (C#)

```csharp
// Models/DTOs/StatsDtos.cs

public record WeeklyVolumeDto(
    DateOnly WeekStart,
    double VolumeKg
);

public record RecentWorkoutDto(
    int Id,
    string Name,
    DateOnly Date,
    double VolumeKg
);

public record UserPublicStatsResponse(
    int ActiveStreak,
    int WorkoutsThisMonth,
    double VolumeThisMonth,
    List<WeeklyVolumeDto> WeeklyVolumes,
    List<RecentWorkoutDto> RecentWorkouts
);
```

---

## TypeScript Interfaces

```typescript
// core/models/stats.model.ts

export interface WeeklyVolume {
  weekStart: string;   // ISO date string "2026-03-16"
  volumeKg: number;
}

export interface RecentWorkout {
  id: number;
  name: string;
  date: string;        // ISO date string "2026-04-10"
  volumeKg: number;
}

export interface UserPublicStats {
  activeStreak: number;
  workoutsThisMonth: number;
  volumeThisMonth: number;
  weeklyVolumes: WeeklyVolume[];
  recentWorkouts: RecentWorkout[];
}

// Used only for own profile — aggregated on frontend from /api/daily + /api/workouts
export interface OwnProfileStats {
  activeStreak: number;
  workoutsThisMonth: number;
  avgCaloriesLast7Days: number;
  weightChangeLast30Days: number | null;  // null if insufficient data
  weeklyVolumes: WeeklyVolume[];
  recentWorkouts: RecentWorkout[];
  weightHistory: { date: string; weightKg: number }[];      // last 90 days
  caloriesHistory: { date: string; calories: number; target: number }[];  // last 30 days
}
```

---

## Error Responses

| Status | When |
|--------|------|
| 401 | Missing/invalid JWT |
| 404 | userId not found |
| 500 | Unexpected server error |

---

## Notes for @dotnet-developer

- [ ] Create `StatsDtos.cs` in `Models/DTOs/`
- [ ] Add `GetPublicStatsAsync(string userId)` to `IUsersService` / `UsersService`
- [ ] Add `GET /api/users/{userId}/stats` action in `UsersController`
- [ ] EF query: join WorkoutTemplate → WorkoutExercise → CardioDetails to compute volume
- [ ] Streak logic: iterate DailyEntry dates backwards from today; count consecutive days where entry exists OR a workout was created that day
- [ ] WeeklyVolumes: always return 8 entries (last 8 Monday–Sunday weeks), fill missing weeks with 0
- [ ] RecentWorkouts: last 5 workouts ordered by CreatedAt desc
- [ ] No migration needed — reads existing data only

## Notes for @angular-developer

- [ ] Create `core/models/stats.model.ts` with interfaces above
- [ ] Create `api/stats.service.ts` — single GET method for public stats
- [ ] Add `loadPublicStats(userId)` to `SocialFacade` (public stats for other profiles)
- [ ] Own profile stats: aggregate in component or dedicated `StatsHelperService` from existing `DailyFacade` + `WorkoutsFacade` data
- [ ] Create `features/social/social-profile/stats-tab/stats-tab.component.ts` — standalone component
- [ ] Charts: use `BaseChartDirective` from ng2-charts, `ChartConfiguration` from chart.js
- [ ] Wire new tab in `social-profile.component.html` alongside existing Posts/Workouts/Articles tabs

---

## Implementation Log

```
2026-04-11 - DRAFT created by @tech-architect
2026-04-11 - BACKEND_READY confirmed by @dotnet-developer
             - StatsDtos.cs created
             - UserService.GetPublicStatsAsync() implemented
             - GET /api/users/{userId}/stats added to UsersController
             - Note: DailyEntry has no WeightKg field — weight history chart not available for own profile
               (weight lives only on User.WeightKg — single current value, not historical)
               Frontend should skip the weight chart or substitute with DailyEntry.CaloriesIntake history
```
