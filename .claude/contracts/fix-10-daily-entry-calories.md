# API Contract: Fix 10 — Daily Entry Calorie Auto-Population from Nutrition Log

**Status:** `COMPLETE`  
**Author:** @tech-architect  
**Date:** 2026-05-29  
**Sprint:** 1 (Weeks 1–2)  
**ADR:** `.claude/decisions/fix-10-daily-entry-calories.md`

---

## Overview

Fix 10 auto-populates the daily entry calorie field by summing all `MealEntry` records for the user + date. It introduces a new summary endpoint, removes `CaloriesIntake` from the save request (breaking change), and adds two new fields (`ManualWeight`, `EnergyLevel`) to the `DailyEntry` entity.

**Existing endpoints that ARE changed:**

| Method | Route | Auth | Change |
|--------|-------|------|--------|
| POST | /api/daily | Bearer | `CaloriesIntake` removed from request; backend computes from MealEntries; `ManualWeight` and `EnergyLevel` added to request |

**Existing endpoints that are NOT changed:**

| Method | Route | Auth | Consumer |
|--------|-------|------|----------|
| GET | /api/daily?date= | Bearer | History views, existing daily form — unchanged DTO |
| GET | /api/daily/history | Bearer | Daily history — unchanged |
| GET | /api/daily/streak | Bearer | Dashboard streak widget — unchanged |
| CRUD | /api/nutrition | Bearer | Meal CRUD — unchanged |

**New endpoint added by this fix:**

| Method | Route | Auth | Consumer |
|--------|-------|------|----------|
| GET | /api/daily/today/summary | Bearer | Dashboard daily entry summary (Fix 10) |

---

## REST Endpoint Detail

### `GET /api/daily/today/summary`

Returns today's daily entry enriched with live-computed nutrition totals from `MealEntry` records. The date is server-determined (UTC today) — there is no date parameter.

**Controller:** `DailyDataController`  
**Service method:** `DailyDataService.GetTodaySummaryAsync(string userId)`  
**Auth:** Bearer (JWT) — `[Authorize]` inherited from controller

**Request:** No body, no query params.

**Response: 200 OK — meals logged today**

```json
{
  "date": "2026-05-29",
  "caloriesFromNutritionLog": 1850.0,
  "proteinFromNutritionLog_g": 142.5,
  "carbsFromNutritionLog_g": 210.0,
  "fatsFromNutritionLog_g": 58.3,
  "mealCount": 3,
  "activityType": "Strength Training",
  "waterConsumedL": 2.5,
  "steps": 8200,
  "stepTarget": 10000,
  "caloriesBurned": 450,
  "caloriesTotal": 1400,
  "manualWeight": 72.5,
  "energyLevel": 4,
  "macrosPct": {
    "protein": 30,
    "carbs": 45,
    "fats": 25
  },
  "updatedAt": "2026-05-29T14:30:00Z"
}
```

**Response: 200 OK — no meals logged today, no daily entry exists**

```json
{
  "date": "2026-05-29",
  "caloriesFromNutritionLog": 0,
  "proteinFromNutritionLog_g": 0,
  "carbsFromNutritionLog_g": 0,
  "fatsFromNutritionLog_g": 0,
  "mealCount": 0,
  "activityType": null,
  "waterConsumedL": 0,
  "steps": 0,
  "stepTarget": 3000,
  "caloriesBurned": 0,
  "caloriesTotal": 0,
  "manualWeight": null,
  "energyLevel": null,
  "macrosPct": {
    "protein": 0,
    "carbs": 0,
    "fats": 0
  },
  "updatedAt": "0001-01-01T00:00:00"
}
```

**Response: 200 OK — meals logged but no daily entry saved yet**

```json
{
  "date": "2026-05-29",
  "caloriesFromNutritionLog": 620.0,
  "proteinFromNutritionLog_g": 45.2,
  "carbsFromNutritionLog_g": 72.0,
  "fatsFromNutritionLog_g": 18.5,
  "mealCount": 1,
  "activityType": null,
  "waterConsumedL": 0,
  "steps": 0,
  "stepTarget": 3000,
  "caloriesBurned": 0,
  "caloriesTotal": 620,
  "manualWeight": null,
  "energyLevel": null,
  "macrosPct": {
    "protein": 0,
    "carbs": 0,
    "fats": 0
  },
  "updatedAt": "0001-01-01T00:00:00"
}
```

> **Note:** There is no 404. If the user has no `DailyEntry` for today AND no `MealEntry` for today, the endpoint returns a valid zero-state with all numeric fields at 0 and nullable fields as null.

**Error Responses:**

| Status | When |
|--------|------|
| 401 | Missing or invalid JWT |
| 500 | Unexpected server error (ProblemDetails) |

---

### `POST /api/daily` — MODIFIED (Breaking Change)

**What changed:** `CaloriesIntake` removed from `SaveDailyEntryRequest`. `ManualWeight` and `EnergyLevel` added.

**What did NOT change:** Response format (`DailyEntryDto`), all other request fields, auth requirements.

**Breaking change impact:** Clients sending `CaloriesIntake` in the request body will NOT receive a 400 error. System.Text.Json silently ignores unknown properties during ASP.NET Core model binding. The field is simply ignored — **soft breaking change**.

**Request Body (after Fix 10):**

```json
{
  "date": "2026-05-29",
  "activityType": "Strength Training",
  "waterConsumedL": 2.5,
  "steps": 8200,
  "stepTarget": 10000,
  "macrosPct": {
    "protein": 30,
    "carbs": 45,
    "fats": 25
  },
  "caloriesBurned": 450,
  "manualWeight": 72.5,
  "energyLevel": 4
}
```

**Server behavior on save:**

```
1. Upsert DailyEntry for (UserId, Date)
2. Apply all request fields to entity (activityType, waterConsumedL, steps, etc.)
3. Compute: CaloriesIntake = ROUND(SUM(MealEntries.TotalCalories WHERE UserId + Date))
4. Compute: CaloriesTotal = CaloriesIntake - CaloriesBurned
5. Persist ManualWeight, EnergyLevel
6. SaveChangesAsync()
7. Push streak-updated via SignalR (existing Fix 5 behavior)
8. Return DailyEntryDto
```

**Response: 200 OK** — same `DailyEntryDto` shape as before:

```json
{
  "date": "2026-05-29",
  "activityType": "Strength Training",
  "waterConsumedL": 2.5,
  "steps": 8200,
  "stepTarget": 10000,
  "macrosPct": {
    "protein": 30,
    "carbs": 45,
    "fats": 25
  },
  "caloriesBurned": 450,
  "caloriesIntake": 1850,
  "caloriesTotal": 1400,
  "updatedAt": "2026-05-29T14:30:00Z"
}
```

> **Note:** `caloriesIntake` in the **response** still appears (from `DailyEntryDto`). It now reflects the server-computed value from MealEntries, not a client-provided value. `DailyEntryDto` is unchanged — this ensures backward compatibility for any consumers reading the response.

---

## Field Definitions

### `DailyEntrySummaryDto` fields

| Field | Type | Null? | Source | Description |
|-------|------|-------|--------|-------------|
| `date` | string | no | `DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd")` | Today's date, server-determined (UTC) |
| `caloriesFromNutritionLog` | double | no | `SUM(MealEntry.TotalCalories) WHERE UserId + Date` | Total calories from all meals logged today. 0 if no meals. |
| `proteinFromNutritionLog_g` | double | no | `SUM(MealEntry.TotalProtein_g)` | Total protein (grams) from all meals today. 0 if no meals. |
| `carbsFromNutritionLog_g` | double | no | `SUM(MealEntry.TotalCarbs_g)` | Total carbs (grams) from all meals today. 0 if no meals. |
| `fatsFromNutritionLog_g` | double | no | `SUM(MealEntry.TotalFats_g)` | Total fats (grams) from all meals today. 0 if no meals. |
| `mealCount` | int | no | `COUNT(MealEntry) WHERE UserId + Date` | Number of meals logged today. 0 if none. |
| `activityType` | string? | yes | `DailyEntry.ActivityType` | Selected activity type. Null if no daily entry exists. |
| `waterConsumedL` | double | no | `DailyEntry.WaterConsumedL` | Water consumed in liters (manual). 0 default. |
| `steps` | int | no | `DailyEntry.Steps` | Steps count (manual). 0 default. |
| `stepTarget` | int | no | `DailyEntry.StepTarget` | Step target. 3000 default. |
| `caloriesBurned` | int | no | `DailyEntry.CaloriesBurned` | Calories burned (manual). 0 default. |
| `caloriesTotal` | int | no | `ROUND(caloriesFromNutritionLog) - caloriesBurned` | Net calorie balance (computed). |
| `manualWeight` | double? | yes | `DailyEntry.ManualWeight` | Daily weigh-in in kg. Null if not recorded. |
| `energyLevel` | int? | yes | `DailyEntry.EnergyLevel` | 1–5 subjective scale. Null if not recorded. |
| `macrosPct` | object | no | `DailyEntry.MacrosProtein/Carbs/Fats` | Existing manual macro percentages. Zero defaults. |
| `updatedAt` | DateTime | no | `DailyEntry.UpdatedAt` | Last update timestamp. `DateTime.MinValue` if no entry exists. |

### `SaveDailyEntryRequest` fields (after modification)

| Field | Type | Null? | Status | Description |
|-------|------|-------|--------|-------------|
| `date` | string | no | Existing | ISO date `yyyy-MM-dd` (validated with regex) |
| `activityType` | string? | yes | Existing | Activity type string |
| `waterConsumedL` | double | no | Existing | Water in liters |
| `steps` | int | no | Existing | Step count |
| `stepTarget` | int | no | Existing | Step target (default 3000) |
| `macrosPct` | object | no | Existing | `{ protein, carbs, fats }` |
| `caloriesBurned` | int | no | Existing | Manual calories burned |
| `caloriesIntake` | ~~int~~ | — | **REMOVED** | ~~Was accepted from client. Now server-computed.~~ |
| `manualWeight` | double? | yes | **NEW** | Daily weigh-in in kg |
| `energyLevel` | int? | yes | **NEW** | 1–5 energy scale |

### New `DailyEntry` entity fields

| Field | Type | Column | Null? | Default | Description |
|-------|------|--------|-------|---------|-------------|
| `ManualWeight` | `double?` | `ManualWeight` | yes | NULL | Daily weigh-in (kg) |
| `EnergyLevel` | `int?` | `EnergyLevel` | yes | NULL | 1–5 subjective energy |

---

## Response DTOs (C#)

### Add to `FitApp.Api/Models/DTOs/DailyDtos.cs`

Place immediately after the existing `DailyEntryDto`:

```csharp
/// <summary>
/// Today's daily entry enriched with live-computed nutrition totals.
/// Calories are ALWAYS server-computed from MealEntry — never from client.
/// </summary>
public class DailyEntrySummaryDto
{
    public string Date { get; set; } = string.Empty;

    // Computed from MealEntries (read-only, server-computed)
    public double CaloriesFromNutritionLog { get; set; }
    public double ProteinFromNutritionLog_g { get; set; }
    public double CarbsFromNutritionLog_g { get; set; }
    public double FatsFromNutritionLog_g { get; set; }
    public int MealCount { get; set; }

    // From DailyEntry (existing)
    public string? ActivityType { get; set; }
    public double WaterConsumedL { get; set; }
    public int Steps { get; set; }
    public int StepTarget { get; set; }
    public int CaloriesBurned { get; set; }
    public int CaloriesTotal { get; set; }

    // From DailyEntry (new — Fix 10)
    public double? ManualWeight { get; set; }
    public int? EnergyLevel { get; set; }

    // Existing manual macro percentages (not yet auto-populated)
    public MacrosPctDto MacrosPct { get; set; } = new();

    public DateTime UpdatedAt { get; set; }
}
```

### Modify existing `SaveDailyEntryRequest`

```csharp
public class SaveDailyEntryRequest
{
    [RegularExpression(@"^\d{4}-\d{2}-\d{2}$", ErrorMessage = "Date must be in yyyy-MM-dd format.")]
    public string Date { get; set; } = string.Empty;
    public string? ActivityType { get; set; }
    public double WaterConsumedL { get; set; }
    public int Steps { get; set; }
    public int StepTarget { get; set; } = 3000;
    public MacrosPctDto MacrosPct { get; set; } = new();
    public int CaloriesBurned { get; set; }
    // REMOVED: CaloriesIntake — now server-computed from MealEntries
    public double? ManualWeight { get; set; }       // Fix 10: daily weigh-in (kg)
    public int? EnergyLevel { get; set; }            // Fix 10: 1-5 energy scale
}
```

### Existing `DailyEntryDto` — **DO NOT CHANGE**

```csharp
// Existing — returned by GET /api/daily?date= and POST /api/daily — unchanged
public class DailyEntryDto
{
    public string Date { get; set; } = string.Empty;
    public string? ActivityType { get; set; }
    public double WaterConsumedL { get; set; }
    public int Steps { get; set; }
    public int StepTarget { get; set; }
    public MacrosPctDto MacrosPct { get; set; } = new();
    public int CaloriesBurned { get; set; }
    public int CaloriesIntake { get; set; }      // Now server-computed, but field kept for compat
    public int CaloriesTotal { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

---

## TypeScript Interfaces

### Add `DailyEntrySummary` to `fit-app/src/app/core/models/daily-user-data.model.ts`

```typescript
// Fix 10 — response from GET /api/daily/today/summary
export interface DailyEntrySummary {
  date: string;

  // Computed from MealEntries — read-only, server-computed
  caloriesFromNutritionLog: number;
  proteinFromNutritionLog_g: number;
  carbsFromNutritionLog_g: number;
  fatsFromNutritionLog_g: number;
  mealCount: number;

  // From DailyEntry (existing)
  activityType?: DayType;
  waterConsumedL: number;
  steps: number;
  stepTarget: number;
  caloriesBurned: number;
  caloriesTotal: number;

  // From DailyEntry (new — Fix 10)
  manualWeight?: number;
  energyLevel?: number;

  // Existing manual macro percentages
  macrosPct: { protein: number; carbs: number; fats: number };

  updatedAt: string;
}
```

### Extend `DailyUserData` in same file

```typescript
export interface DailyUserData {
  // ... existing fields unchanged ...
  manualWeight?: number;    // Fix 10: daily weigh-in (kg)
  energyLevel?: number;     // Fix 10: 1-5 energy scale
}
```

> **Privacy constraint:** `DailyEntrySummary` contains calorie and weight data. It must NEVER appear in any social or public-facing endpoint. The endpoint requires Bearer auth and returns data only for the authenticated user.

---

## Field Mapping: C# → TypeScript

### `DailyEntrySummaryDto` → `DailyEntrySummary`

| C# | TypeScript | Notes |
|----|-----------|-------|
| `Date` | `date` | Direct, camelCase |
| `CaloriesFromNutritionLog` | `caloriesFromNutritionLog` | Direct, camelCase |
| `ProteinFromNutritionLog_g` | `proteinFromNutritionLog_g` | Direct — underscore is intentional (unit suffix) |
| `CarbsFromNutritionLog_g` | `carbsFromNutritionLog_g` | Direct |
| `FatsFromNutritionLog_g` | `fatsFromNutritionLog_g` | Direct |
| `MealCount` | `mealCount` | Direct |
| `ActivityType` | `activityType` | Optional, maps to `DayType` union |
| `WaterConsumedL` | `waterConsumedL` | Direct |
| `Steps` | `steps` | Direct |
| `StepTarget` | `stepTarget` | Direct |
| `CaloriesBurned` | `caloriesBurned` | Direct |
| `CaloriesTotal` | `caloriesTotal` | Direct |
| `ManualWeight` | `manualWeight` | Optional, null → undefined |
| `EnergyLevel` | `energyLevel` | Optional, null → undefined |
| `MacrosPct` | `macrosPct` | Nested object |
| `UpdatedAt` | `updatedAt` | DateTime → string (JSON serialization) |

### `user.service.ts` — new `getTodaySummary()` method

```typescript
public async getTodaySummary(): Promise<DailyEntrySummary | null> {
  try {
    return await firstValueFrom(
      this.http.get<DailyEntrySummary>(`${this.baseUrl}/api/daily/today/summary`)
    );
  } catch (err: any) {
    this.alerts.warn('Failed to load daily summary');
    return null;
  }
}
```

### `user.service.ts` — modified `saveDailyForDate()` request body

```typescript
public async saveDailyForDate(dateIso: string, data: DailyUserData): Promise<void> {
  try {
    await firstValueFrom(
      this.http.post(`${this.baseUrl}/api/daily`, {
        date: data.date,
        activityType: data.activityType,
        waterConsumedL: data.waterConsumedL,
        steps: data.steps,
        stepTarget: data.stepTarget,
        macrosPct: data.macrosPct,
        caloriesBurned: data.caloriesBurned,
        // caloriesIntake REMOVED — server-computed from MealEntries
        manualWeight: data.manualWeight ?? null,
        energyLevel: data.energyLevel ?? null,
      })
    );
  } catch (err) {
    this.alerts.warn('Failed to save daily data');
  }
}
```

---

## Backend Implementation Checklist (`@dotnet-developer`)

- [ ] **`FitApp.Api/Models/Entities/DailyEntry.cs`** — add `ManualWeight` (double?) and `EnergyLevel` (int?)
- [ ] **Run migration:** `dotnet ef migrations add AddDailyEntryWeightAndEnergy` — two nullable columns, no data loss
- [ ] **`FitApp.Api/Models/DTOs/DailyDtos.cs`**:
  - [ ] Add `DailyEntrySummaryDto` class after `DailyEntryDto`
  - [ ] Modify `SaveDailyEntryRequest`: remove `CaloriesIntake`, add `ManualWeight` and `EnergyLevel`
- [ ] **`FitApp.Api/Services/DailyDataService.cs`**:
  - [ ] Add `public async Task<DailyEntrySummaryDto> GetTodaySummaryAsync(string userId)` — queries both `DailyEntries` and `MealEntries` for today's date, computes nutrition totals
  - [ ] Modify `SaveForDateAsync`: replace `entry.CaloriesIntake = req.CaloriesIntake` with `SUM(MealEntries.TotalCalories)` query; add `entry.ManualWeight = req.ManualWeight` and `entry.EnergyLevel = req.EnergyLevel`
  - [ ] Modify `MapToDto` to include `ManualWeight` and `EnergyLevel` if `DailyEntryDto` is extended (or leave `DailyEntryDto` unchanged — the new fields are only in `DailyEntrySummaryDto`)
- [ ] **`FitApp.Api/Controllers/DailyDataController.cs`** — add `[HttpGet("today/summary")]` endpoint calling `GetTodaySummaryAsync`
- [ ] **Verify** existing endpoints unchanged: `GET /api/daily?date=`, `GET /api/daily/history`, `GET /api/daily/streak`, `POST /api/daily` (accepts modified request, returns unchanged response)

---

## Frontend Implementation Checklist (`@angular-developer`)

- [ ] **`core/models/daily-user-data.model.ts`** — add `DailyEntrySummary` interface; extend `DailyUserData` with `manualWeight?` and `energyLevel?`
- [ ] **`api/user.service.ts`**:
  - [ ] Add `getTodaySummary()` method calling `GET /api/daily/today/summary`
  - [ ] Modify `saveDailyForDate()` — remove `caloriesIntake` from request body, add `manualWeight` and `energyLevel`
- [ ] **`core/services/daily-user-data.service.ts`**:
  - [ ] Add `_todaySummary` signal and `todaySummary` readonly
  - [ ] Add `setTodaySummary()` method
- [ ] **`core/facade/user.facade.ts`**:
  - [ ] Add `todaySummary` getter
  - [ ] Add `loadTodaySummary()` method
- [ ] **`features/dashboard/daily-user-data/daily-user-data.component.ts`**:
  - [ ] Call `facade.loadTodaySummary()` in `ngOnInit()`
  - [ ] Remove `caloriesIntake` form control from `buildForm()`
  - [ ] Remove calorie increment logic from `applyMealToForm()` — meal picker should add meals to Nutrition module, not mutate daily form calories
  - [ ] Read calorie display from `facade.todaySummary()?.caloriesFromNutritionLog`
  - [ ] Add `manualWeight` and `energyLevel` form controls (optional, nullable)
- [ ] **`features/dashboard/daily-user-data/daily-user-data.component.html`**:
  - [ ] Replace calorie intake input with read-only display + "from your nutrition log" label
  - [ ] Add empty state CTA when `mealCount === 0`: "Log meals to track calories" → route to Nutrition tab
  - [ ] Add weight input and energy level selector UI

---

## Constraints

- `DailyEntrySummaryDto.CaloriesFromNutritionLog` is ALWAYS server-computed — never overridable by client
- `SaveDailyEntryRequest` must NOT re-add `CaloriesIntake` in future PRs — code review must reject it
- Calorie and weight data is private to the authenticated user — must NEVER appear in social endpoints
- `GET /api/daily?date=` must remain unchanged — `DailyEntryDto` is NOT modified
- `DailyUserDataComponent` must NEVER call `UserService` or any API service directly — only through `UserFacade`
- `EnergyLevel` accepted range: 1–5 (validate server-side; reject values outside range)
- `ManualWeight` must be positive if provided (validate server-side)
- Historical `DailyEntry` records are NOT retroactively updated — past `CaloriesIntake` values remain as-is

---

## Implementation Log

```
2026-05-29 - DRAFT created by @tech-architect
2026-05-29 - BACKEND_READY implemented by @dotnet-developer
2026-05-29 - COMPLETE implemented by @angular-developer

Final endpoints:
  GET  /api/daily/today/summary  → DailyEntrySummaryDto  (new — Fix 10)
  POST /api/daily                → DailyEntryDto          (modified — CaloriesIntake removed from request, ManualWeight/EnergyLevel added)

Unchanged endpoints (backward compatible):
  GET  /api/daily?date=          → DailyEntryDto          (unchanged)
  GET  /api/daily/history        → { items, hasMore }     (unchanged)
  GET  /api/daily/streak         → StreakDto               (unchanged)

Migration added: 20260529174400_AddDailyEntryWeightAndEnergy
  - DailyEntries.ManualWeight  REAL     NULL (no data loss)
  - DailyEntries.EnergyLevel   INTEGER  NULL (no data loss)

Services modified: DailyDataService
  - GetTodaySummaryAsync(string userId) → DailyEntrySummaryDto  (new)
  - SaveForDateAsync — CaloriesIntake now SUM'd from MealEntries; ManualWeight/EnergyLevel persisted

New service registrations: none (DailyDataService was already registered)

Frontend changes (Fix 10):
  - DailyEntrySummary interface added to core/models/daily-user-data.model.ts
  - DailyUserData extended with manualWeight?, energyLevel?
  - UserService.getTodaySummary() added → GET /api/daily/today/summary
  - UserService.saveDailyForDate() modified — caloriesIntake removed, manualWeight/energyLevel added
  - DailyUserDataService — _todaySummary signal + todaySummary readonly + setTodaySummary()
  - UserFacade — todaySummary getter + loadTodaySummary() method
  - DailyEntryCalorieSummaryComponent created (features/dashboard/daily-entry-calorie-summary/)
    - Read-only: displays caloriesFromNutritionLog
    - Label: "from your nutrition log"
    - Empty state (mealCount === 0): "Log meals to track calories" CTA → /user-profile?tab=nutrition
  - DailyUserDataComponent — caloriesIntake removed from form; manualWeight/energyLevel added;
    loadTodaySummary() called in ngOnInit; applyMealToForm/undoLastMeal no longer mutate calories
  - Weight input (manualWeight) + Energy level selector (1-5) added to Nutrition card
  - Net Calories row now prefers todaySummary.caloriesTotal (server-computed)
```
