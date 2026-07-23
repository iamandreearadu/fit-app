# Progress Tab & Nutritionist Report — Implementation

**Date:** 2026-07-23  
**Status:** Implemented and verified  
**Source plan:** `.claude/decisions/progress-tab-nutritionist-report-plan-2026-07-23.md`

## Outcome

The `/account/progress` tab is now a functional progress dashboard built from the user's real daily, nutrition and activity data. It includes:

- a complete-day streak, separate from the application's general streak;
- a weekly nutritionist report with deterministic metrics and an optional AI narrative;
- 7-day and 30-day progress windows;
- weight and energy check-ins;
- weight, calories, macros, hydration and steps trends;
- loading, error and empty states;
- responsive mobile and desktop layouts;
- accessible controls and reduced-motion support.

## Backend implementation

### New API surface

- `GET /api/progress/summary?window=7|30`
  - returns the complete-day streak;
  - returns the weekly nutritionist report;
  - returns chart series for the selected time window;
  - returns the latest weight and energy values.
- `POST /api/progress/report/refresh`
  - explicitly regenerates the weekly AI narrative;
  - invalidates the current cached narrative before regeneration.
- `PATCH /api/daily/check-in`
  - safely updates only `manualWeight` and `energyLevel` for the selected date.

The check-in uses a dedicated `PATCH` operation because the existing `POST /api/daily` endpoint represents a complete daily record replacement. Reusing it for a partial check-in could overwrite water, steps, activity or nutrition data.

### Complete-day streak

A day is considered complete when it meets the required daily tracking criteria defined in `ProgressService`. The progress streak is intentionally separate from the existing general application streak. An incomplete current day does not immediately break the historical streak.

### Weekly nutritionist report

The numeric report is calculated deterministically from persisted data:

- calorie intake and target adherence;
- protein, carbohydrate and fat distribution;
- hydration adherence;
- step adherence;
- logged-day consistency;
- weight and energy context where data exists.

Only aggregated statistics are sent to the AI provider. Raw meal records and unrelated personal data are not included in the narrative prompt. If the AI provider is unavailable or returns an invalid response, the API returns a deterministic fallback narrative so the report remains usable.

Generated narratives are cached until the next UTC day boundary. A per-user/week cache lock prevents concurrent requests from generating the same narrative multiple times.

### Data conventions

- Daily progress continues to use UTC dates, matching the existing daily-data storage and the frontend's ISO date convention.
- Nutrition totals use actual daily meal entries and exclude saved-meal templates (`IsSavedMeal == false`).
- Macro percentages are calculated from the aggregate weekly macro totals.

### Persistence and indexes

No database migration was required. Existing indexes were verified:

- unique daily entry index on `(UserId, Date)`;
- meal entry index on `(UserId, Date)`.

## Frontend implementation

### Page composition

The Progress tab was decomposed into focused components:

- `CompleteStreakHeroComponent`
- `NutritionistReportCardComponent`
- `ProgressWeightCardComponent`
- `ProgressTrendChartComponent`

State loading and API coordination are handled by `ProgressFacade`, while `ProgressService` owns the HTTP contract.

### User experience

- 7-day and 30-day selectors reload the corresponding chart window.
- Weight and energy can be saved independently through the check-in card.
- Successful check-ins are announced through an accessible live region.
- The weekly narrative can be manually refreshed.
- Weight charts show raw values and a 7-day moving average.
- Trend charts cover calories, macros, hydration and steps.
- Chart colors resolve from the application design tokens.
- Touch targets meet the intended mobile sizing, including range selectors and energy controls.
- The streak ring is driven by the actual streak value and caps its visual weekly progress at seven days.

## Main files

### Backend

- `FitApp.Api/Controllers/ProgressController.cs`
- `FitApp.Api/Models/DTOs/ProgressDtos.cs`
- `FitApp.Api/Services/IProgressService.cs`
- `FitApp.Api/Services/ProgressService.cs`
- `FitApp.Api/Controllers/DailyDataController.cs`
- `FitApp.Api/Services/DailyDataService.cs`
- `FitApp.Api/Services/AiProxyService.cs`
- `FitApp.Api/Program.cs`
- `FitApp.Api.Tests/ProgressApiTests.cs`

### Frontend

- `fit-app/src/app/api/progress.service.ts`
- `fit-app/src/app/core/facade/progress.facade.ts`
- `fit-app/src/app/core/models/progress.model.ts`
- `fit-app/src/app/core/models/daily-user-data.model.ts`
- `fit-app/src/app/features/user/progress-tab/`
- `fit-app/src/styles.css`

### Contract

- `.claude/contracts/progress-tab-nutritionist-report.md`

## Verification

- Backend test suite: **45 passed, 0 failed**
- Frontend unit test suite: **90 passed, 0 failed**
- Angular production build: **passed**
- Backend Release build: **passed**

The frontend test runner still reports existing missing-asset warnings for `assets/fitapp-wb.png`. The Angular build also retains an unrelated existing CSS budget warning for `daily-user-data.component.css` (470 bytes over its configured component budget). Neither warning is introduced by the Progress implementation.

## Follow-up opportunities

- Add Cypress coverage for the full check-in and report-refresh browser flows when an E2E setup is available.
- Consolidate progress aggregation queries if production profiling shows that the current indexed queries need further optimization.
- Invalidate the narrative cache immediately after every nutrition or daily-data mutation if real-time narrative updates become preferable to the current manual-refresh/daily-expiry behavior.

