# NovaFit — Custom Daily Targets Implementation

**Implemented:** 2026-07-28  
**Source decision:** `.claude/decisions/custom-daily-targets/custom-daily-targets-implementation-plan-2026-07-28.md`

## Outcome

Users can now customize daily calorie, water and step targets from Account / Physical while keeping NovaFit's calculated recommendations available.

The application distinguishes between:

- recommended targets;
- optional custom targets;
- effective targets used by the application.

## Backend implementation

- Added nullable user overrides:
  - `CustomCaloriesTarget`;
  - `CustomWaterTargetL`;
  - `CustomStepsTarget`.
- Added daily target snapshots:
  - `CaloriesTarget`;
  - `WaterTargetL`;
  - existing `StepTarget`.
- Added `DailyTargetsDto` containing recommended, custom and effective values.
- Added validated `UpdateDailyTargetsRequest`.
- Added endpoints:
  - `PUT /api/users/me/targets`;
  - `DELETE /api/users/me/targets`.
- Centralized target resolution in `MetricsService.GetTargets`.
- Kept physical-metric recalculation independent from custom overrides.
- New daily records capture the effective targets active when the record is created.
- Updating targets refreshes today's snapshot only; previous days remain unchanged.
- Dashboard calorie, water and step goals now use effective targets.
- Nutrition macro targets now use effective calories.
- Progress trends and nutritionist reports use effective targets and historical snapshots where available.
- Onboarding numbers use effective calorie and water targets.

## Frontend implementation

- Added `DailyTargets` and server metrics models to the user profile.
- Preserved target data returned by the profile API.
- Added API and facade methods for save and reset.
- Added a responsive Daily targets editor to Account / Physical.
- The editor supports:
  - calorie, water and step overrides;
  - inline validation;
  - recommendation placeholders;
  - individual recommendation behavior by leaving a field empty;
  - reset of all values to recommendations;
  - loading and API error states.
- Target changes update shared frontend state immediately.
- Water and step progress react to the new effective targets.

## Database migration

Created the EF Core migration `AddCustomDailyTargets`, including the three user override columns and two additional daily snapshot columns.

## Validation

- Calories: 800–8000 kcal/day.
- Water: 0.5–10 litres/day.
- Steps: 500–100000/day.

Validation is enforced by the backend and mirrored in the Physical tab form.

## Verification

- `dotnet test FitApp.Api.Tests/FitApp.Api.Tests.csproj -c Release --no-restore`
  - 46 passed, 0 failed.
- `npm run build`
  - production Angular build passed.
  - existing CSS budget warning remains for `daily-user-data.component.css` (476 bytes over its configured budget).

## Main changed files

### Backend

- `FitApp.Api/Models/Entities/User.cs`
- `FitApp.Api/Models/Entities/DailyEntry.cs`
- `FitApp.Api/Models/DTOs/UserDtos.cs`
- `FitApp.Api/Services/MetricsService.cs`
- `FitApp.Api/Services/UserService.cs`
- `FitApp.Api/Services/DailyDataService.cs`
- `FitApp.Api/Services/DashboardService.cs`
- `FitApp.Api/Services/NutritionService.cs`
- `FitApp.Api/Services/ProgressService.cs`
- `FitApp.Api/Services/OnboardingService.cs`
- `FitApp.Api/Controllers/UsersController.cs`
- `FitApp.Api/Migrations/*AddCustomDailyTargets*`
- `FitApp.Api/Migrations/AppDbContextModelSnapshot.cs`

### Frontend

- `fit-app/src/app/core/models/user.model.ts`
- `fit-app/src/app/api/user.service.ts`
- `fit-app/src/app/core/facade/user.facade.ts`
- `fit-app/src/app/core/services/user-metrics.service.ts`
- `fit-app/src/app/core/services/daily-user-data.service.ts`
- `fit-app/src/app/features/user/fitness-metrics/fitness-metrics.component.ts`
- `fit-app/src/app/features/user/fitness-metrics/fitness-metrics.component.html`
- `fit-app/src/app/features/user/fitness-metrics/fitness-metrics.component.css`
