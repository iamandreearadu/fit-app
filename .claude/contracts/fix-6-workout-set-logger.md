# API Contract: Fix 6 — Active Workout Set Logger

**Author:** @tech-architect
**Date:** 2026-05-29
**Status:** COMPLETE
**ADR:** `.claude/decisions/fix-6-workout-set-logger.md`
**Design spec:** `.claude/design-specs/fix-6-workout-set-logger.md`

---

## Status History

| Date | Status | Changed by | Note |
|---|---|---|---|
| 2026-05-29 | DRAFT | @tech-architect | Initial contract |
| 2026-05-29 | BACKEND_READY | @dotnet-developer | All endpoints implemented; migration applied |
| 2026-05-29 | COMPLETE | @angular-developer | Frontend integration complete |

## IMPLEMENTED: 2026-05-29 — Frontend

**New files:**
- `fit-app/src/app/core/models/workouts-tab.model.ts` — appended `LastExerciseSession`, `CompletedSet`, `CompleteSessionRequest`, `WorkoutCompletionSummary`
- `fit-app/src/app/api/workouts-tab.service.ts` — added `getLastSession(templateId)`, `completeSession(req)`
- `fit-app/src/app/core/facade/workouts-tab.facade.ts` — added `lastSession` signal, `completionSummary` signal, `lastSessionMap` computed, `loadLastSession()`, `completeSession()`
- `fit-app/src/app/shared/components/workout-set-row/` — `WorkoutSetRowComponent` (standalone, OnPush, pointer-event swipe, long-press edit, +/− steppers, ghost text, sr-only complete button)
- `fit-app/src/app/features/workouts/active-session/` — `ActiveWorkoutSessionComponent` (session shell, elapsed timer, rest timer toast, finish FAB, confirm sheet)

**Modified files:**
- `fit-app/src/app/app.routes.ts` — added `/workout-session/:templateId` route (lazy, AuthGuard)
- `fit-app/src/app/features/user/workouts-tab/workouts-tab.component.html` — added "Start Workout" button in expanded preview
- `fit-app/src/app/features/user/workouts-tab/workouts-tab.component.ts` — added `router` inject + `startWorkout()` method
- `fit-app/src/app/features/user/workouts-tab/workouts-tab.component.css` — added `.btn-start-workout` styles

---

## IMPLEMENTED: 2026-05-29

**Final endpoints:**
- `GET /api/workouts/{templateId:int}/last-session` → `List<LastSessionDto>`
- `POST /api/workouts/sessions` → `WorkoutCompletionSummaryDto` (201 Created)

**SignalR event added (amendment to ADR):**
- Event name: `workout-completed`
- Hub: `/hubs/notifications` → `user-{userId}` group only
- Payload: `WorkoutCompletionSummaryDto`
- Pattern: fire-and-forget, wrapped in try/catch — DB write is never affected by SignalR failure
- `estimatedCaloriesKcal` is present in payload — pushed ONLY to the authenticated user's own group, never broadcast

**Migration added:** `20260529072707_AddWorkoutSession`
- `WorkoutSessions` table — `WorkoutTemplateId INTEGER NULL`, `SetNull` FK to `WorkoutTemplates`
- `WorkoutSessionSets` table — `WorkoutSessionId INTEGER NOT NULL`, `Cascade` FK to `WorkoutSessions`
- Index: `IX_WorkoutSessions_UserId_FinishedAt`
- Index: `IX_WorkoutSessionSets_WorkoutSessionId_ExerciseName`

**Services registered:**
- `WorkoutSessionService` (scoped)

**New files:**
- `FitApp.Api/Models/Entities/WorkoutTemplate.cs` — appended `WorkoutSession`, `WorkoutSessionSet`
- `FitApp.Api/Models/DTOs/WorkoutDtos.cs` — appended `LastSessionDto`, `CompletedSetDto`, `CompleteWorkoutSessionRequest`, `WorkoutCompletionSummaryDto`
- `FitApp.Api/Data/AppDbContext.cs` — added DbSets + entity configuration
- `FitApp.Api/Services/WorkoutSessionService.cs` — new service
- `FitApp.Api/Controllers/WorkoutSessionsController.cs` — new controller
- `FitApp.Api/Program.cs` — registered `WorkoutSessionService`

**ADR deviation — route change:**
The original task requested `GET /api/workouts/exercises/{exerciseId}/last-session`.
This was replaced with `GET /api/workouts/{templateId}/last-session` per the approved ADR.
Reason: `WorkoutExercise.Id` is unstable — `WorkoutService.UpdateAsync` removes and re-creates
all exercise rows on every template edit. The batch-per-template endpoint is O(1) HTTP calls
and matches exercise history by stable name string.

**Ready for: @angular-developer**

---

## Summary

Two new endpoints in the workout domain. Both extend the existing `/api/workouts` base path
and the existing `WorkoutsController` route prefix.

| # | Method | Route | Purpose |
|---|---|---|---|
| 1 | GET | `/api/workouts/{templateId}/last-session` | Fetch previous exercise values for ghost placeholder text |
| 2 | POST | `/api/workouts/sessions` | Save completed session; return summary for Fix 8 card |

**No new SignalR events.** The existing `streak-updated` push (Fix 5) fires when the user
subsequently logs their daily entry.

---

## Endpoint 1 — Get Last Session

### `GET /api/workouts/{templateId}/last-session`

Returns the most recent actual weight and reps per exercise for the named template. Called
once when `ActiveWorkoutSessionComponent` mounts, before the user starts logging.

#### Authentication
`Authorization: Bearer <token>` — required. Returns only the calling user's data.

#### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `templateId` | `int` | Yes | ID of the `WorkoutTemplate` to look up |

#### Request Body
None.

#### Success Response — `200 OK`

```json
[
  {
    "exerciseName": "Bench Press",
    "lastWeightKg": 80.0,
    "lastReps": 8,
    "lastDate": "2026-05-20"
  },
  {
    "exerciseName": "Incline Dumbbell Press",
    "lastWeightKg": 30.0,
    "lastReps": 10,
    "lastDate": "2026-05-20"
  }
]
```

**Empty array `[]`** is returned (not an error) when:
- The template has never been used in a completed session
- The template exists but has no exercises (edge case)
- All exercises in the template have no matching session history

**Field definitions:**

| Field | Type | Notes |
|---|---|---|
| `exerciseName` | `string` | Exact name from `WorkoutExercise.Name` — used as lookup key in frontend |
| `lastWeightKg` | `double` | Most recent `ActualWeightKg` from any completed set for this exercise name |
| `lastReps` | `int` | Most recent `ActualReps` |
| `lastDate` | `string` | `"yyyy-MM-dd"` format, UTC. Displayed as `"last time: 80kg × 8"` in set row ghost text |

**Uniqueness:** One entry per distinct `exerciseName` in the template. If an exercise appears
in multiple sets in the last session, only the most recent set (by `WorkoutSession.FinishedAt`)
is returned.

#### Error Responses

| Code | Condition |
|---|---|
| `401 Unauthorized` | No or invalid JWT |
| `404 Not Found` | `templateId` does not exist OR belongs to a different user |

**Important:** `404` is returned if the template doesn't belong to the calling user —
never expose another user's session history.

---

## Endpoint 2 — Complete Session

### `POST /api/workouts/sessions`

Saves a completed workout session (all sets logged during the active session) and returns
a summary DTO. This is the **single write call** at the end of a workout session —
no intermediate API calls are made during the session.

#### Authentication
`Authorization: Bearer <token>` — required.

#### Request Body — `CompleteWorkoutSessionRequest`

```json
{
  "workoutTemplateId": 42,
  "startedAt": "2026-05-29T10:15:00Z",
  "finishedAt": "2026-05-29T11:02:30Z",
  "sets": [
    {
      "exerciseName": "Bench Press",
      "setNumber": 1,
      "actualWeightKg": 80.0,
      "actualReps": 8
    },
    {
      "exerciseName": "Bench Press",
      "setNumber": 2,
      "actualWeightKg": 80.0,
      "actualReps": 7
    },
    {
      "exerciseName": "Lat Pulldown",
      "setNumber": 1,
      "actualWeightKg": 65.0,
      "actualReps": 10
    }
  ]
}
```

**Field constraints:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `workoutTemplateId` | `int` | Yes | Must belong to calling user; returns 404 otherwise |
| `startedAt` | `DateTime` (ISO 8601) | Yes | Must be ≤ `finishedAt` |
| `finishedAt` | `DateTime` (ISO 8601) | Yes | Must be ≤ `DateTime.UtcNow + 5min` (clock skew tolerance) |
| `sets` | `CompletedSetDto[]` | Yes | May be empty (user finished with zero sets logged) |
| `sets[].exerciseName` | `string` | Yes | Max length 200 chars; trimmed on save |
| `sets[].setNumber` | `int` | Yes | 1-based; used for ordering display only |
| `sets[].actualWeightKg` | `double` | Yes | ≥ 0 |
| `sets[].actualReps` | `int` | Yes | ≥ 1 |

#### Success Response — `201 Created`

```json
{
  "sessionId": 101,
  "templateTitle": "Pull Day A",
  "durationMin": 47,
  "exerciseCount": 2,
  "setsCompleted": 3,
  "estimatedCaloriesKcal": 285,
  "streakDay": 8,
  "completedAt": "2026-05-29T11:02:30.000Z"
}
```

**Field definitions:**

| Field | Type | Source | Notes |
|---|---|---|---|
| `sessionId` | `int` | `WorkoutSession.Id` after save | Used by Fix 8 (summary card) and Fix 7 (share) to reference the session |
| `templateTitle` | `string` | `WorkoutTemplate.Title` snapshot | Survives template deletion |
| `durationMin` | `int` | `(FinishedAt - StartedAt).TotalMinutes` | Minimum 1 minute regardless of timestamp delta |
| `exerciseCount` | `int` | `sets.Select(s => s.ExerciseName).Distinct().Count()` | Number of unique exercises performed |
| `setsCompleted` | `int` | `sets.Count` | Total sets submitted |
| `estimatedCaloriesKcal` | `int` | `round(template.CaloriesEstimateKcal × min(setsCompleted / totalTargetSets, 1.0))` | Proportional estimate. No AI call. |
| `streakDay` | `int` | `DailyDataService.GetStreakAsync(userId).Current` | Current streak snapshot. **Does NOT create a DailyEntry. Does NOT modify streak.** |
| `completedAt` | `string` | `FinishedAt.ToString("o")` | ISO 8601 with timezone |

**`streakDay` disambiguation:** The post-workout summary card (Fix 8) should display this
as "Current streak: 8 days" — not "Workout added to streak" — because the streak is
controlled by `DailyEntry` saves, not workout sessions. This distinction must be reflected
in the Fix 8 UI copy.

#### Error Responses

| Code | Condition | `ProblemDetails.Detail` |
|---|---|---|
| `400 Bad Request` | `finishedAt` < `startedAt` | `"finishedAt must be after startedAt"` |
| `400 Bad Request` | Any set has `actualReps` < 1 | `"actualReps must be at least 1"` |
| `401 Unauthorized` | No or invalid JWT | — |
| `404 Not Found` | `workoutTemplateId` not found or belongs to different user | `"WorkoutTemplate {id} not found for user."` |

---

## Data Flow Diagram

```
Angular ActiveWorkoutSessionComponent
│
├─ ON MOUNT
│   ├─ GET /api/workouts/{id}           (existing — load template exercises)
│   └─ GET /api/workouts/{id}/last-session  (new — load ghost placeholder data)
│
├─ DURING SESSION (all client-side — no HTTP calls)
│   ├─ elapsed timer (setInterval)
│   ├─ rest timer (setTimeout per set completion)
│   ├─ WorkoutSetRowComponent signals (weightKg, reps, state)
│   └─ local CompletedSet[] accumulation on each swipe-complete
│
└─ ON "FINISH" CONFIRM
    └─ POST /api/workouts/sessions
        ├─ Saves WorkoutSession + WorkoutSessionSet rows
        └─ Returns WorkoutCompletionSummaryDto
            ├─ → Fix 8: post-workout summary card (reads sessionId + fields)
            └─ → Fix 7: beSocial share prompt (reads sessionId + templateTitle)
```

---

## TypeScript Service Mapping

**`api/workouts-tab.service.ts` — new methods:**

```typescript
async getLastSession(templateId: number): Promise<LastExerciseSession[]>
// GET /api/workouts/{templateId}/last-session
// Returns [] on any error (non-fatal — ghost text simply not shown)

async completeSession(req: CompleteSessionRequest): Promise<WorkoutCompletionSummary | null>
// POST /api/workouts/sessions
// Returns null on error (shows alert toast)
```

**`core/facade/workouts-tab.facade.ts` — new signals and methods:**

```typescript
readonly lastSession = signal<LastExerciseSession[]>([]);
readonly completionSummary = signal<WorkoutCompletionSummary | null>(null);
readonly lastSessionMap = computed(() => new Map(this.lastSession().map(s => [s.exerciseName, s])));

async loadLastSession(templateId: number): Promise<void>
async completeSession(req: CompleteSessionRequest): Promise<WorkoutCompletionSummary | null>
```

---

## Response Field Mapping: Backend C# → Frontend TypeScript

### `LastSessionDto` → `LastExerciseSession`

| C# field | TypeScript field | Notes |
|---|---|---|
| `ExerciseName` | `exerciseName` | Lookup key — must match `WorkoutExercise.Name` exactly |
| `LastWeightKg` | `lastWeightKg` | Pre-fills weight stepper in set row |
| `LastReps` | `lastReps` | Pre-fills reps stepper |
| `LastDate` | `lastDate` | Displayed as `"last time: {lastWeightKg}kg × {lastReps}"` |

### `WorkoutCompletionSummaryDto` → `WorkoutCompletionSummary`

| C# field | TypeScript field | Notes |
|---|---|---|
| `SessionId` | `sessionId` | Referenced by Fix 7 and Fix 8 |
| `TemplateTitle` | `templateTitle` | Display name in summary card |
| `DurationMin` | `durationMin` | Shown as "47 min" in summary |
| `ExerciseCount` | `exerciseCount` | "3 exercises" |
| `SetsCompleted` | `setsCompleted` | "12 sets" |
| `EstimatedCaloriesKcal` | `estimatedCaloriesKcal` | "~285 kcal" |
| `StreakDay` | `streakDay` | "Current streak: 8 days" (NOT "streak incremented") |
| `CompletedAt` | `completedAt` | Date display in summary |

---

## Integration Points with Other Fixes

| Fix | Integration | How |
|---|---|---|
| Fix 5 (streak badge) | Read-only — streak badge updates when user logs `DailyEntry`, not when session completes | No action needed from Fix 6 |
| Fix 7 (beSocial share) | `sessionId` + `templateTitle` from `WorkoutCompletionSummary` pre-populate the share post | Fix 7 reads `facade.completionSummary()` signal |
| Fix 8 (post-workout card) | `WorkoutCompletionSummary` is the complete input model | Fix 8 reads `facade.completionSummary()` signal |

---

## Out of Scope

These are explicitly deferred and must NOT be implemented as part of Fix 6:

| Item | Reason |
|---|---|
| `GET /api/workouts/sessions/{sessionId}` (session history) | Fix 9+ — progress charts feature |
| `GET /api/workouts/sessions` (session list) | Fix 9+ |
| AI calorie estimate on session complete | Fix 8 — summary card context; async post-completion flow |
| Cardio session logging | Different model (no sets); separate spec required |
| LocalStorage mid-session persistence | Fix 9+ — data loss on app close is accepted for now |
| Auto-creating DailyEntry on workout complete | Out of scope by design — streak is DailyEntry-based |
| `WorkoutSession` linked to `Post` (social share) | Fix 7 adds this FK; the entity exists now, the FK is added in Fix 7 |
