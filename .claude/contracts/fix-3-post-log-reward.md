# API Contract: Fix 3 — Post-Log Reward Screens

**Author:** @dotnet-developer
**Date:** 2026-06-02
**Status:** COMPLETE
**Design spec:** `.claude/design-specs/fix-3-post-log-reward.md`
**Related contract:** `.claude/contracts/fix-6-workout-set-logger.md`

---

## Status History

| Date | Status | Changed by | Note |
|---|---|---|---|
| 2026-06-02 | BACKEND_READY | @dotnet-developer | Macro-progress endpoint implemented; SignalR event verified |
| 2026-06-02 | COMPLETE | @angular-developer | Frontend implemented: WorkoutCompletionCardComponent, MealCompletionFeedbackComponent, NutritionTabFacade macro progress signal, NotificationHubService workout-completed event |

---

## IMPLEMENTED: 2026-06-02

**Final endpoints:**

| Method | Route | Response DTO |
|---|---|---|
| GET | `/api/nutrition/today/macro-progress` | `MacroProgressDto` |

**SignalR event (pre-existing, verified correct):**

| Event | Hub | Group | Payload |
|---|---|---|---|
| `workout-completed` | `/hubs/notifications` | `user-{userId}` | `WorkoutCompletionSummaryDto` |

**Migration added:** None — endpoint reads existing `MealEntry` and `User` columns only.

**Services registered:** None — `NutritionService` was already scoped in `Program.cs`.

---

## Part 1 — SignalR: `workout-completed` Event Verification

**Status: VERIFIED — already implemented in Fix 6.**

`WorkoutSessionService.CompleteSessionAsync` (line 152) fires and forgets
`PushWorkoutCompletedAsync` after the DB write commits:

```csharp
_ = Task.Run(() => PushWorkoutCompletedAsync(userId, summary));
```

`PushWorkoutCompletedAsync` sends the full `WorkoutCompletionSummaryDto` to
`user-{userId}` group on `/hubs/notifications`:

```csharp
await notifHub.Clients
    .Group($"user-{userId}")
    .SendAsync("workout-completed", dto);
```

**Guarantees:**
- DB write is never blocked or rolled back by SignalR failure (try/catch + fire-and-forget)
- Pushed **only** to the authenticated user's own group — never broadcast
- `estimatedCaloriesKcal` is in the payload because it is sent exclusively to the user who
  owns the session; it **must not** appear in any social DTO or public endpoint

**No code changes were required for Part 1.**

---

## Part 2 — `GET /api/nutrition/today/macro-progress`

### `GET /api/nutrition/today/macro-progress`

Returns today's logged macro totals (summed from the user's `MealEntry` rows for
the current UTC date) vs TDEE-derived per-macro gram targets computed from
`user.GoalCalories`.

Consumed by `MealCompletionFeedbackComponent` (Fix 3) immediately after each
`POST /api/nutrition` save, to refresh the inline macro progress bars.

#### Authentication
`Authorization: Bearer <token>` — required.  
UserId extracted from JWT only — never from request body or query string.  
**Private user health data — MUST NEVER appear in social endpoints or feed responses.**

#### Request
No request body. No query parameters.

#### Success Response — `200 OK`

```json
{
  "totalProtein":  68.4,
  "targetProtein": 150.0,
  "totalCarbs":    192.1,
  "targetCarbs":   200.0,
  "totalFat":      28.7,
  "targetFat":     66.7,
  "totalCalories": 1240.0,
  "targetCalories": 2000.0
}
```

#### Response DTO — `MacroProgressDto`

```csharp
public record MacroProgressDto(
    double TotalProtein,
    double TargetProtein,
    double TotalCarbs,
    double TargetCarbs,
    double TotalFat,
    double TargetFat,
    double TotalCalories,
    double TargetCalories
);
```

| Field | Source | Notes |
|---|---|---|
| `totalProtein` | `SUM(MealEntry.TotalProtein_g)` for today UTC | 0.0 when no meals logged today |
| `targetProtein` | `GoalCalories * 0.30 / 4` | 0.0 when `GoalCalories` is null (onboarding incomplete) |
| `totalCarbs` | `SUM(MealEntry.TotalCarbs_g)` for today UTC | 0.0 when no meals logged today |
| `targetCarbs` | `GoalCalories * 0.40 / 4` | 0.0 when `GoalCalories` is null |
| `totalFat` | `SUM(MealEntry.TotalFats_g)` for today UTC | 0.0 when no meals logged today |
| `targetFat` | `GoalCalories * 0.30 / 9` | 0.0 when `GoalCalories` is null |
| `totalCalories` | `SUM(MealEntry.TotalCalories)` for today UTC | 0.0 when no meals logged today |
| `targetCalories` | `User.GoalCalories` | 0.0 when `GoalCalories` is null |

**Macro target formula (30 / 40 / 30 split):**

| Macro | % of GoalCalories | kcal/g | Formula |
|---|---|---|---|
| Protein | 30 % | 4 | `round(GoalCalories × 0.30 / 4, 1)` |
| Carbs | 40 % | 4 | `round(GoalCalories × 0.40 / 4, 1)` |
| Fat | 30 % | 9 | `round(GoalCalories × 0.30 / 9, 1)` |

All values rounded to 1 decimal place.

**Date filter:** `MealEntry.Date == DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd")`  
Exact string match — consistent with existing `DailyEntry.Date` filtering pattern.

#### Error Responses

| Code | Condition |
|---|---|
| `401 Unauthorized` | No or invalid JWT |

No `404` is possible — a user with no meals logged today receives `200` with all totals set to `0.0`.

---

## Modified Files

| File | Change |
|---|---|
| `FitApp.Api/Models/DTOs/NutritionDtos.cs` | Added `MacroProgressDto` record |
| `FitApp.Api/Services/NutritionService.cs` | Added `GetTodayMacroProgressAsync(string userId)` |
| `FitApp.Api/Controllers/NutritionController.cs` | Added `GET today/macro-progress` action |

---

## TypeScript Service Mapping

**`api/nutrition-tab.service.ts` — new method:**

```typescript
async getTodayMacroProgress(): Promise<MacroProgressDto>
// GET /api/nutrition/today/macro-progress
// Called after every successful POST /api/nutrition or PUT /api/nutrition/{id}
```

**`core/models/nutrition-tab.model.ts` — new interface:**

```typescript
export interface MacroProgressDto {
  totalProtein:  number;
  targetProtein: number;
  totalCarbs:    number;
  targetCarbs:   number;
  totalFat:      number;
  targetFat:     number;
  totalCalories: number;
  targetCalories: number;
}
```

**`core/facade/nutrition-tab.facade.ts` — new signal:**

```typescript
readonly macroProgress = signal<MacroProgressDto | null>(null);

// Called after saveMeal() resolves:
async refreshMacroProgress(): Promise<void>
```

---

## Privacy Constraints (re-stated from design spec)

1. `MacroProgressDto` — shown ONLY to the authenticated user in their own nutrition tab.
   **MUST NOT** be passed to any social endpoint, shared in posts, or included in feed responses.

2. The share payload from `MealCompletionFeedbackComponent` contains ONLY `mealName` and
   `mealType` — macro totals are intentionally omitted.

3. `@code-reviewer` must verify on Fix 3 frontend implementation that:
   - No macro field from `MacroProgressDto` appears in any `SocialService` call
   - No macro field appears in the `ShareToSocialBottomSheetComponent` payload

---

## Ready for: @angular-developer
