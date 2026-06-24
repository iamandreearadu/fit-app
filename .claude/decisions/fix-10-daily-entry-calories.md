# ADR: Fix 10 — Daily Entry Calorie Auto-Population from Nutrition Log

**Status:** APPROVED  
**Author:** @tech-architect  
**Date:** 2026-05-29  
**Sprint:** 1 (Weeks 1–2)  
**Source:** `.claude/plans/ux-audit-implementation-plan.md` Fix 10

---

## Context

The daily entry form (`DailyUserDataComponent`) asks users to manually input calorie intake — but total calories are **already tracked** in the Nutrition module through `MealEntry` records. This creates:

1. **Data redundancy.** Users who log meals in the Nutrition tab must re-enter the same calorie total in the Daily Entry form. Entering the same data twice signals bad product design and erodes trust.

2. **Data inconsistency.** The manually entered `CaloriesIntake` on `DailyEntry` and the sum of `MealEntry.TotalCalories` for the same date diverge silently. There is no synchronization — the systems are completely disconnected.

3. **Fragmented product perception.** Users correctly infer that the Nutrition module and the Dashboard's daily tracker don't talk to each other. This undermines confidence in the data and reduces completion rates for the daily entry form.

**What already exists and must NOT be duplicated:**

| Entity/Field | Location | Current state |
|---|---|---|
| `DailyEntry.CaloriesIntake` | `Models/Entities/DailyEntry.cs` | Manually entered int, stored per user+date |
| `DailyEntry.CaloriesTotal` | `Models/Entities/DailyEntry.cs` | `CaloriesIntake - CaloriesBurned`, computed on save |
| `MealEntry.TotalCalories` | `Models/Entities/MealEntry.cs` | Stored per meal, computed from food items on save |
| `MealEntry.TotalProtein_g/Carbs_g/Fats_g` | `Models/Entities/MealEntry.cs` | Macro totals per meal |
| `MealEntry.Date` + `MealEntry.UserId` | `Models/Entities/MealEntry.cs` | ISO date string + user FK — the join keys |
| `SaveDailyEntryRequest.CaloriesIntake` | `Models/DTOs/DailyDtos.cs` | Currently accepted from client — **this is the field being removed** |
| `DailyUserData.caloriesIntake` | `core/models/daily-user-data.model.ts` | Frontend model, currently editable in the form |
| `DailyUserDataComponent` | `features/dashboard/daily-user-data/` | Has `caloriesIntake` form control + meal picker + AI analyzer that all mutate calories |

**What does NOT exist and is needed:**

- No endpoint that joins `DailyEntry` + `MealEntry` data for a date
- No `ManualWeight` (daily weigh-in) field on `DailyEntry` — weight is only on `User.WeightKg`
- No `EnergyLevel` field on `DailyEntry`
- No water logging entity — water is tracked manually on `DailyEntry.WaterConsumedL`. Therefore `waterFromLogs` is **not applicable** (there is no separate water log to sum from)

---

## Decision

### 1. New endpoint: `GET /api/daily/today/summary`

A new endpoint on `DailyDataController` that returns today's daily entry **enriched with computed nutrition totals** from `MealEntry` records. This is semantically different from the existing `GET /api/daily?date=`:

| | `GET /api/daily?date=` (existing) | `GET /api/daily/today/summary` (new) |
|---|---|---|
| DTO | `DailyEntryDto` | `DailyEntrySummaryDto` |
| Calories source | Stored `CaloriesIntake` on entity | Live-computed from `MealEntry` SUM |
| Macros source | Stored `MacrosProtein/Carbs/Fats` on entity | Live-computed from `MealEntry` SUM + stored |
| Extra fields | — | `caloriesFromNutritionLog`, `mealCount`, `macrosFromNutritionLog`, `manualWeight`, `energyLevel` |
| Date scope | Any date (query param) | Today only (server-determined UTC) |
| Consumer | History views, existing daily form (unchanged) | Dashboard daily entry summary (Fix 10) |

The new endpoint always computes `caloriesFromNutritionLog` live from `MealEntry` — it is never stale for today's data.

### 2. Breaking change: `CaloriesIntake` removed from `SaveDailyEntryRequest`

**This is a documented breaking change.**

Currently, `POST /api/daily` accepts `CaloriesIntake` in `SaveDailyEntryRequest` and stores it directly:

```csharp
// CURRENT (before Fix 10):
entry.CaloriesIntake = req.CaloriesIntake;          // ← from client
entry.CaloriesTotal = req.CaloriesIntake - req.CaloriesBurned;
```

After Fix 10, the backend **ignores any client-provided calories** and computes from `MealEntry`:

```csharp
// AFTER Fix 10:
var mealCalories = await db.MealEntries
    .Where(m => m.UserId == userId && m.Date == req.Date)
    .SumAsync(m => m.TotalCalories);
entry.CaloriesIntake = (int)Math.Round(mealCalories);   // ← from DB
entry.CaloriesTotal = entry.CaloriesIntake - req.CaloriesBurned;
```

**Impact assessment:**
- `CaloriesIntake` is removed from `SaveDailyEntryRequest` DTO. System.Text.Json silently ignores unknown properties during model binding, so existing clients sending this field will NOT get a 400 error — the field is simply ignored. This is a **soft breaking change**.
- The `MacrosPct` fields remain on `SaveDailyEntryRequest` and `DailyEntry`. They are **not** auto-populated from nutrition log in this fix — only calories. Macro auto-population is a follow-up improvement.
- The `DailyEntry.CaloriesIntake` column is **retained** on the entity. It becomes a denormalized cache updated on every `POST /api/daily` save. Historical entries remain accurate as of their last save.

### 3. New fields on `DailyEntry` entity: `ManualWeight` and `EnergyLevel`

Two new nullable fields to support the daily entry becoming a **confirmation summary** (not just a re-entry form):

| Field | Type | Purpose |
|---|---|---|
| `ManualWeight` | `double?` | Daily weigh-in in kg. Separate from `User.WeightKg` (which is the profile weight). Nullable — user may not weigh in every day. |
| `EnergyLevel` | `int?` | Subjective energy rating, 1–5 scale. Nullable — optional. |

**Migration required.** Two new nullable columns on `DailyEntries` table — no data loss, no default needed (nullable).

### 4. `waterFromLogs` — NOT APPLICABLE

Water intake is tracked manually via `DailyEntry.WaterConsumedL`. There is no separate water logging entity (no `WaterEntry` table, no water items on `MealEntry`). Therefore `waterFromLogs` cannot be computed from any log.

The existing `WaterConsumedL` field remains as a manual entry on `DailyEntry`. It is included in `DailyEntrySummaryDto` as-is (no "from logs" variant). If a water logging feature is added in the future, this can be revisited.

### 5. Macros from nutrition log: included as informational fields

Since we're already querying `MealEntry` for calorie totals, we include macro sums at zero additional DB cost:

- `proteinFromNutritionLog_g` = `SUM(MealEntry.TotalProtein_g)` for today
- `carbsFromNutritionLog_g` = `SUM(MealEntry.TotalCarbs_g)` for today
- `fatsFromNutritionLog_g` = `SUM(MealEntry.TotalFats_g)` for today

These are **informational** in the summary DTO. The existing `MacrosPct` fields on `DailyEntry` remain editable for now. A follow-up fix can make macros read-only too, once the UX for the macro display is finalized.

### 6. Stale data strategy

| Scenario | Behavior |
|---|---|
| User loads Dashboard | `GET /api/daily/today/summary` computes live from MealEntries — always fresh |
| User saves daily entry | `POST /api/daily` recomputes `CaloriesIntake` from MealEntries — entity stays in sync |
| User adds a meal THEN views Dashboard | Summary endpoint shows updated total immediately |
| User adds a meal but never re-saves daily entry | `DailyEntry.CaloriesIntake` is stale until next save. Summary endpoint is still fresh. |
| User views a past date via `GET /api/daily?date=` | Returns stored `CaloriesIntake` — reflects the value at last save time. Acceptable for historical data. |

**Future optimization:** Hook into `NutritionService.CreateAsync/UpdateAsync/DeleteAsync` to update `DailyEntry.CaloriesIntake` whenever a meal for that date changes. This adds cross-service coupling and is deferred to a follow-up.

---

## Clean Architecture Boundaries

- **Controller responsibility (`DailyDataController`):** Extract `UserId` from JWT, call `DailyDataService.GetTodaySummaryAsync(userId)`, return result. No computation in the controller.
- **Service responsibility (`DailyDataService`):** Query `MealEntries` + `DailyEntries`, compute nutrition totals, assemble `DailyEntrySummaryDto`. All business logic (SUM, rounding, CaloriesTotal computation) lives here.
- **What stays out of controllers:** Calorie summation, MealEntry queries, CaloriesTotal computation.
- **What stays out of components:** HTTP calls (go through `UserFacade`), calorie computation logic. `DailyUserDataComponent` reads the summary signal from the facade, never calls API services directly.

---

## Data Model

### Modified EF Entity (`FitApp.Api/Models/Entities/DailyEntry.cs`)

Add two nullable fields:

```csharp
public class DailyEntry
{
    // ... existing fields unchanged ...

    // Fix 10: new fields
    public double? ManualWeight { get; set; }     // Daily weigh-in (kg), nullable
    public int? EnergyLevel { get; set; }          // 1-5 subjective scale, nullable
}
```

**Migration required** — two new nullable columns. No data loss. No default values needed.

### New DTO (`FitApp.Api/Models/DTOs/DailyDtos.cs`)

```csharp
/// <summary>
/// Today's daily entry enriched with live-computed nutrition totals from MealEntry.
/// Used by GET /api/daily/today/summary. Calories are ALWAYS server-computed — never from client.
/// </summary>
public class DailyEntrySummaryDto
{
    public string Date { get; set; } = string.Empty;

    // ── Computed from MealEntries (read-only, server-computed) ──
    public double CaloriesFromNutritionLog { get; set; }
    public double ProteinFromNutritionLog_g { get; set; }
    public double CarbsFromNutritionLog_g { get; set; }
    public double FatsFromNutritionLog_g { get; set; }
    public int MealCount { get; set; }

    // ── From DailyEntry (existing fields) ──
    public string? ActivityType { get; set; }
    public double WaterConsumedL { get; set; }
    public int Steps { get; set; }
    public int StepTarget { get; set; }
    public int CaloriesBurned { get; set; }
    public int CaloriesTotal { get; set; }          // caloriesFromNutritionLog - caloriesBurned

    // ── From DailyEntry (new fields — Fix 10) ──
    public double? ManualWeight { get; set; }
    public int? EnergyLevel { get; set; }

    // ── Existing macro percentages (still manual, not yet auto-populated) ──
    public MacrosPctDto MacrosPct { get; set; } = new();

    public DateTime UpdatedAt { get; set; }
}
```

### Modified DTO: `SaveDailyEntryRequest` — BREAKING CHANGE

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
    // REMOVED in Fix 10: public int CaloriesIntake { get; set; }
    // CaloriesIntake is now server-computed from MealEntries. Clients sending this field
    // will NOT get an error — System.Text.Json silently ignores unknown properties.
    public double? ManualWeight { get; set; }       // NEW — daily weigh-in (kg)
    public int? EnergyLevel { get; set; }            // NEW — 1-5 scale
}
```

### TypeScript Interface (`fit-app/src/app/core/models/daily-user-data.model.ts`)

```typescript
// NEW — response from GET /api/daily/today/summary
export interface DailyEntrySummary {
  date: string;

  // Computed from MealEntries — read-only
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

  // From DailyEntry (new)
  manualWeight?: number;
  energyLevel?: number;

  // Existing macro percentages (still manual)
  macrosPct: { protein: number; carbs: number; fats: number };

  updatedAt: string;
}
```

---

## API Contract

See `.claude/contracts/fix-10-daily-entry-calories.md` for full response shapes, error codes, and field mapping.

| Method | Route | Auth | Request Body | Response |
|--------|-------|------|-------------|---------|
| GET | /api/daily/today/summary | Bearer | — | `DailyEntrySummaryDto` |
| POST | /api/daily | Bearer | `SaveDailyEntryRequest` (modified — no `CaloriesIntake`) | `DailyEntryDto` (unchanged) |

**Breaking change on `POST /api/daily`:** `CaloriesIntake` field removed from request. Backend always computes from `MealEntry` records.

---

## Frontend Architecture

- **New model:** `core/models/daily-user-data.model.ts` — add `DailyEntrySummary` interface
- **Modified model:** `DailyUserData` — `caloriesIntake` remains for backward compat on existing flows but is no longer sent in save requests
- **New API method:** `api/user.service.ts` — add `getTodaySummary(): Promise<DailyEntrySummary | null>` calling `GET /api/daily/today/summary`
- **Modified API method:** `api/user.service.ts` — update `saveDailyForDate()` to stop sending `caloriesIntake` in the request body
- **New signal:** `DailyUserDataService` — add `readonly todaySummary = signal<DailyEntrySummary | null>(null)` for the summary data
- **Modified facade:** `core/facade/user.facade.ts` — add `loadTodaySummary()` method, expose `todaySummary` signal
- **Modified component:** `features/dashboard/daily-user-data/daily-user-data.component.ts`:
  - Remove `caloriesIntake` from the form group
  - Remove `applyMealToForm` calorie increment logic (meals go to Nutrition module, not daily form)
  - Read `caloriesFromNutritionLog` from `facade.todaySummary()` signal
  - Display calories as read-only with "from your nutrition log" label
  - Add `mealCount === 0` empty state: "Log meals to track calories" CTA → route to Nutrition tab
- **Modified component template:** `daily-user-data.component.html`:
  - Replace calorie intake form field with read-only display
  - Add `manualWeight` and `energyLevel` form controls (optional)
- **Route:** No new routes — this modifies the existing Dashboard

---

## Instructions for @dotnet-developer

### 1. Entity change + Migration

**`FitApp.Api/Models/Entities/DailyEntry.cs`** — add:
```csharp
public double? ManualWeight { get; set; }     // Daily weigh-in (kg)
public int? EnergyLevel { get; set; }          // 1-5 subjective energy scale
```

Run migration:
```bash
cd FitApp.Api
dotnet ef migrations add AddDailyEntryWeightAndEnergy
```

No manual edits to the migration — two nullable columns, no data loss.

### 2. New DTO

**`FitApp.Api/Models/DTOs/DailyDtos.cs`** — add `DailyEntrySummaryDto` class (definition in Data Model section above). Place after `DailyEntryDto`.

### 3. Modify `SaveDailyEntryRequest`

**`FitApp.Api/Models/DTOs/DailyDtos.cs`** — remove `CaloriesIntake` property. Add `ManualWeight` and `EnergyLevel` properties (definition in Data Model section above).

### 4. New service method

**`FitApp.Api/Services/DailyDataService.cs`** — add:

```csharp
public async Task<DailyEntrySummaryDto> GetTodaySummaryAsync(string userId)
{
    var today = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");

    var entry = await db.DailyEntries
        .AsNoTracking()
        .FirstOrDefaultAsync(d => d.UserId == userId && d.Date == today);

    var nutritionTotals = await db.MealEntries
        .Where(m => m.UserId == userId && m.Date == today)
        .GroupBy(m => 1)
        .Select(g => new
        {
            TotalCalories = g.Sum(m => m.TotalCalories),
            TotalProtein = g.Sum(m => m.TotalProtein_g),
            TotalCarbs = g.Sum(m => m.TotalCarbs_g),
            TotalFats = g.Sum(m => m.TotalFats_g),
            MealCount = g.Count()
        })
        .FirstOrDefaultAsync();

    var caloriesFromLog = nutritionTotals?.TotalCalories ?? 0;
    var caloriesBurned = entry?.CaloriesBurned ?? 0;

    return new DailyEntrySummaryDto
    {
        Date = today,
        CaloriesFromNutritionLog = caloriesFromLog,
        ProteinFromNutritionLog_g = nutritionTotals?.TotalProtein ?? 0,
        CarbsFromNutritionLog_g = nutritionTotals?.TotalCarbs ?? 0,
        FatsFromNutritionLog_g = nutritionTotals?.TotalFats ?? 0,
        MealCount = nutritionTotals?.MealCount ?? 0,
        ActivityType = entry?.ActivityType,
        WaterConsumedL = entry?.WaterConsumedL ?? 0,
        Steps = entry?.Steps ?? 0,
        StepTarget = entry?.StepTarget ?? 3000,
        CaloriesBurned = caloriesBurned,
        CaloriesTotal = (int)Math.Round(caloriesFromLog) - caloriesBurned,
        ManualWeight = entry?.ManualWeight,
        EnergyLevel = entry?.EnergyLevel,
        MacrosPct = new MacrosPctDto
        {
            Protein = entry?.MacrosProtein ?? 0,
            Carbs = entry?.MacrosCarbs ?? 0,
            Fats = entry?.MacrosFats ?? 0,
        },
        UpdatedAt = entry?.UpdatedAt ?? DateTime.MinValue,
    };
}
```

### 5. Modify `SaveForDateAsync`

**`FitApp.Api/Services/DailyDataService.cs`** — in `SaveForDateAsync`, replace:
```csharp
// REMOVE these two lines:
entry.CaloriesIntake = req.CaloriesIntake;
entry.CaloriesTotal = req.CaloriesIntake - req.CaloriesBurned;
```
With:
```csharp
// Fix 10: compute CaloriesIntake from MealEntries
var mealCalories = await db.MealEntries
    .Where(m => m.UserId == userId && m.Date == req.Date)
    .SumAsync(m => m.TotalCalories);
entry.CaloriesIntake = (int)Math.Round(mealCalories);
entry.CaloriesTotal = entry.CaloriesIntake - req.CaloriesBurned;

// Fix 10: persist new fields
entry.ManualWeight = req.ManualWeight;
entry.EnergyLevel = req.EnergyLevel;
```

### 6. New controller endpoint

**`FitApp.Api/Controllers/DailyDataController.cs`** — add:
```csharp
// GET api/daily/today/summary
[HttpGet("today/summary")]
public async Task<IActionResult> GetTodaySummary()
{
    var summary = await dailyService.GetTodaySummaryAsync(UserId);
    return Ok(summary);
}
```

### 7. Verify backward compatibility

- `GET /api/daily?date=` must still return `DailyEntryDto` unchanged
- `GET /api/daily/history` must still work unchanged
- `GET /api/daily/streak` must still work unchanged
- `POST /api/daily` must still accept the request body (minus `CaloriesIntake`) and return `DailyEntryDto`

---

## Instructions for @angular-developer

### 1. New model

**`core/models/daily-user-data.model.ts`** — add `DailyEntrySummary` interface (definition in Data Model section above).

### 2. New API method

**`api/user.service.ts`** — add:
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

### 3. Modify save request

**`api/user.service.ts`** — in `saveDailyForDate()`, remove `caloriesIntake` from the request body. Add `manualWeight` and `energyLevel`:
```typescript
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
```

### 4. New signal in store

**`core/services/daily-user-data.service.ts`** — add:
```typescript
private readonly _todaySummary = signal<DailyEntrySummary | null>(null);
readonly todaySummary = this._todaySummary.asReadonly();

public setTodaySummary(s: DailyEntrySummary | null): void {
  this._todaySummary.set(s);
}
```

### 5. Facade method

**`core/facade/user.facade.ts`** — add:
```typescript
get todaySummary() {
  return this.dailyUserSrv.todaySummary;
}

public async loadTodaySummary(): Promise<void> {
  const summary = await this.userSrv.getTodaySummary();
  this.dailyUserSrv.setTodaySummary(summary);
}
```

### 6. Component changes

**`features/dashboard/daily-user-data/daily-user-data.component.ts`**:
- Call `facade.loadTodaySummary()` in `ngOnInit()` alongside `facade.loadDaily()`
- Remove `caloriesIntake` from `buildForm()` (remove the form control entirely)
- Remove calorie increment logic from `applyMealToForm()` and `undoLastMeal()` — the "Pick from saved meals" button should navigate to Nutrition tab instead
- Read `facade.todaySummary()?.caloriesFromNutritionLog` for the calorie display
- Add `manualWeight` and `energyLevel` form controls (optional)

**`features/dashboard/daily-user-data/daily-user-data.component.html`**:
- Replace the calorie intake section with a read-only display:
  ```html
  <div class="cal-from-log">
    <span class="cal-value">{{ facade.todaySummary()?.caloriesFromNutritionLog ?? 0 }}</span>
    <span class="cal-label">kcal from your nutrition log</span>
    @if ((facade.todaySummary()?.mealCount ?? 0) === 0) {
      <a class="cal-cta" routerLink="/user" fragment="nutrition">Log meals to track calories</a>
    }
  </div>
  ```
- Add optional weight input and energy level selector (1–5 scale)

### 7. Update `DailyUserData` model

**`core/models/daily-user-data.model.ts`** — extend `DailyUserData`:
```typescript
export interface DailyUserData {
  // ... existing fields ...
  manualWeight?: number;
  energyLevel?: number;
}
```

---

## Instructions for @uiux-designer

Spec required: `.claude/design-specs/fix-10-daily-entry-calories.md`

1. **Read-only calorie display:** Replace the calorie intake form field with a prominent read-only number (large font, `var(--primary)` accent) + "from your nutrition log" sublabel in `var(--text-secondary)`. Show meal count badge (e.g., "3 meals").
2. **Empty state (0 meals):** Show "0 kcal" with a "Log meals to track calories" inline CTA (text link style, `var(--accent)` color) that routes to the Nutrition tab.
3. **Manual weight input:** Small inline input (kg) with `var(--text-secondary)` label "Today's weight". Optional — hidden behind a "Log weight" tap target if not yet entered.
4. **Energy level selector:** 5 circular icons or emoji (😴 → ⚡) in a horizontal row. Tap to select. `var(--primary)` highlight on selected.
5. **Net calories display:** Keep existing `CaloriesBurned` manual entry + `CaloriesTotal = caloriesFromNutritionLog - caloriesBurned` display. This row stays interactive (burned is manual).
6. **Transition note:** Macros section (protein/carbs/fats) remains editable for now. Add a small info icon or "from daily tracker" label to distinguish from the auto-populated calorie field.

---

## Consequences & Trade-offs

### Gains
- **Eliminates data redundancy** — calories entered once (via Nutrition module), displayed everywhere
- **Increases trust** — the daily summary and the nutrition log show the same number
- **Reduces daily entry form friction** — one fewer manual field to complete
- **Enables daily weigh-in tracking** — `ManualWeight` on `DailyEntry` is a better home than `User.WeightKg` for longitudinal weight tracking
- **Adds energy level tracking** — subjective wellness data alongside objective nutrition data
- **No breaking 400 errors** — old clients sending `CaloriesIntake` get silent ignore, not an error

### Trade-offs
- **Macros remain disconnected** — macro fields on `DailyEntry` are still manual while calories are auto-computed. This is a transitional state. Follow-up fix: auto-populate macros from nutrition log too.
- **Stale `DailyEntry.CaloriesIntake`** — if a meal is added/deleted and the daily entry is not re-saved, the entity's stored calorie value is stale. Mitigated: the summary endpoint always computes live; the entity is updated on next save.
- **Migration required** — two new nullable columns. Low risk (nullable, no default, no data loss), but must be tested.
- **Existing daily history values** — historical `CaloriesIntake` values on past `DailyEntry` records remain as they were (manually entered). They are NOT retroactively recomputed. This is acceptable — past data reflects what the user entered at the time.

### Must NOT happen
- `DailyEntrySummaryDto.CaloriesFromNutritionLog` must NEVER be overridable by the client — it is always server-computed
- `SaveDailyEntryRequest` must NOT re-add `CaloriesIntake` — if it appears in future PRs, code review must reject it
- Calorie data in the summary is **private to the authenticated user** (Bearer required) — must never appear in social endpoints
- The `GET /api/daily?date=` endpoint must remain unchanged — do not modify `DailyEntryDto` or `GetForDateAsync`
- `DailyUserDataComponent` must NEVER call `UserService` or `NutritionService` directly — always through `UserFacade`
