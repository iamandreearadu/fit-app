# NovaFit — Custom Daily Targets Implementation Plan

Date: 2026-07-28  
Status: Ready for implementation

## Objective

Allow users to customize their daily calorie, water, and step targets from `Account → Physical`, while preserving the values calculated by NovaFit as recommendations.

The customized targets must be used consistently by Dashboard, Nutrition, Progress, streak calculations, weekly reports, and future daily entries.

## Core product decision

Calculated recommendations and user-defined targets must be stored separately.

```text
effective target = custom target ?? recommended target
```

NovaFit may recalculate recommendations when the user changes their weight, height, age, gender, activity level, or fitness goal. Those recalculations must never overwrite explicit user choices.

## Target types

### Recommended targets

Calculated or supplied by NovaFit:

- calories: `User.GoalCalories`, derived from TDEE and fitness goal;
- water: `User.WaterL`, derived from body weight;
- steps: initial system recommendation, currently `3000`.

### Custom targets

Optional values entered by the user:

- `CustomCaloriesTarget`;
- `CustomWaterTargetL`;
- `CustomStepsTarget`.

### Effective targets

Values used by the application:

- `EffectiveCaloriesTarget`;
- `EffectiveWaterTargetL`;
- `EffectiveStepsTarget`.

Effective targets are derived values and do not need separate persisted columns.

## Phase 1 — Database

Add nullable fields to `User`:

```csharp
double? CustomCaloriesTarget
double? CustomWaterTargetL
int? CustomStepsTarget
```

Create an EF Core migration with nullable columns so existing users continue to use NovaFit recommendations.

No existing calculated fields should be renamed or repurposed.

## Phase 2 — Backend contract

### Response model

Extend the authenticated profile/metrics contract with:

```json
{
  "targets": {
    "recommendedCalories": 2100,
    "recommendedWaterL": 2.4,
    "recommendedSteps": 3000,
    "customCalories": 1900,
    "customWaterL": 3.0,
    "customSteps": 8000,
    "effectiveCalories": 1900,
    "effectiveWaterL": 3.0,
    "effectiveSteps": 8000
  }
}
```

This makes the source of every displayed value explicit and prevents frontend components from reimplementing fallback logic differently.

### Endpoints

Add:

```http
PUT /api/users/me/targets
```

Request:

```json
{
  "calories": 1900,
  "waterL": 3.0,
  "steps": 8000
}
```

Response: the complete updated target object.

Add:

```http
DELETE /api/users/me/targets
```

This removes all custom values and restores NovaFit recommendations.

The update request should also accept individual `null` values to reset only one target.

## Phase 3 — Validation

Server validation ranges:

- calories: `800–8000 kcal`;
- water: `0.5–10 L`;
- steps: `500–100000`.

Reject:

- negative values;
- non-finite numbers;
- values outside the accepted range;
- malformed requests.

The frontend mirrors these rules for immediate feedback, but the API remains authoritative.

## Phase 4 — Calculation behavior

`MetricsService` continues to calculate:

- BMI;
- BMI category;
- BMR;
- TDEE;
- recommended calories;
- recommended water.

It must not update custom target fields.

Create a centralized backend mapper or resolver for effective targets. All consumers must use this resolver instead of independently implementing `custom ?? recommended`.

## Phase 5 — Account / Physical UI

Extend the existing `Daily targets` area in `FitnessMetricsComponent`.

### Default state

Display:

- effective calorie target;
- effective water target;
- effective step target;
- a subtle `Custom` indicator for overridden values;
- the NovaFit recommendation beneath a custom value.

Example:

```text
1,900 kcal  · Custom
NovaFit recommends 2,100 kcal
```

### Edit state

Add one `Edit targets` action that reveals three inputs:

- Calories;
- Water;
- Steps.

Actions:

- `Cancel`;
- `Save targets`;
- `Use all recommended`.

Each custom row should also support `Use recommended` for individual reset.

### UI states

Implement:

- initial loading;
- saving;
- success;
- inline validation error;
- API error;
- custom state;
- recommended state;
- no changes state.

Disable saving when:

- the form is invalid;
- no values changed;
- a request is already running.

### Responsive behavior

Desktop:

- keep the targets in the right metrics rail;
- preserve the existing information hierarchy.

Mobile:

- stack inputs vertically;
- minimum 48 px input/button touch height;
- keep units visible without shrinking input text;
- ensure actions do not sit behind the bottom navigation.

## Phase 6 — Frontend state and API integration

Add target types to the user/metrics models.

Extend `UserService` with:

- `updateDailyTargets`;
- `resetDailyTargets`.

Extend `UserFacade` so it:

- exposes recommended, custom, and effective targets;
- updates the user store immediately after a successful save;
- propagates target changes to Dashboard without page refresh;
- restores the previous form values when a save fails.

The target fallback rule must exist in one frontend location only.

## Phase 7 — Dashboard integration

Update Dashboard to consume:

- `effectiveCalories`;
- `effectiveWaterL`;
- `effectiveSteps`.

Affected UI:

- calorie target/progress;
- hydration progress;
- step progress;
- Today summary;
- target labels.

When targets change, currently visible Dashboard values should update reactively.

## Phase 8 — Daily history behavior

Step targets currently exist on `DailyEntry`.

Required behavior:

- new daily entries receive the current effective step target;
- the current day may be updated to the new target immediately;
- historical daily entries keep the target active on that date;
- changing account targets must not rewrite previous days.

This preserves truthful historical progress.

If calorie and water target history is required for accurate reports, add target snapshot fields to `DailyEntry`:

```csharp
double? CaloriesTargetSnapshot
double? WaterTargetLSnapshot
int? StepsTargetSnapshot
```

The implementation audit should confirm whether reports currently compare historical consumption against live user metrics. If they do, snapshots are required in the same migration or a follow-up migration before releasing the feature.

## Phase 9 — Nutrition integration

Update macro progress and calorie goal calculations to use the effective calorie target.

Affected areas:

- `GET /api/nutrition/today/macro-progress`;
- target calories;
- protein/carbohydrate/fat target derivation;
- Weekly Balance;
- nutrition progress UI.

Macro targets should be recalculated from the effective calorie target while preserving the existing macro distribution logic.

## Phase 10 — Progress and reports

Review and update:

- Progress summary;
- weekly nutritionist report;
- estimated energy balance;
- goal adherence;
- complete-day logic;
- streak requirements;
- previous daily data.

Reports must use the target active during each reported day. They must not apply today's target retroactively to previous records.

The report language should distinguish:

- `your target` for an effective custom value;
- `NovaFit recommendation` for a calculated value.

## Phase 11 — Onboarding and AI context

Onboarding `Your numbers` should continue to present calculated recommendations.

If a user already has custom targets:

- do not overwrite them when onboarding is replayed;
- display recommendations as recommendations, not active targets.

Update AI Assistant context, where applicable, to include:

- effective targets;
- whether each target is custom;
- recommended values.

The AI must not describe a custom target as medically calculated or automatically recommended.

## Phase 12 — Tests

### Backend

Test:

- saving all custom targets;
- saving one target;
- resetting one target;
- resetting all targets;
- validation boundaries;
- invalid/non-finite values;
- fallback to recommendations;
- recalculation without custom-value overwrite;
- effective target response mapping;
- current-day step target update;
- historical target preservation;
- Nutrition and Progress use effective targets.

### Frontend

Test:

- form initialization;
- edit/cancel behavior;
- valid and invalid values;
- save loading state;
- API failure recovery;
- individual reset;
- reset all;
- reactive Dashboard update;
- persistence after logout/login;
- mobile and desktop layouts.

### Build and regression checks

- `dotnet build`;
- backend tests;
- `npm run build`;
- Angular unit tests;
- manual check at 360 px, 390 px, 768 px, and desktop;
- verify existing users without custom values see no behavioral regression.

## Recommended implementation order

1. Audit every target consumer and confirm historical snapshot requirements.
2. Add user custom target fields and migration.
3. Add centralized effective-target resolver.
4. Add DTOs, validation, and API endpoints.
5. Extend frontend models, service, facade, and store.
6. Implement editing in `Account → Physical`.
7. Integrate Dashboard and Nutrition.
8. Integrate daily history, Progress, streak, reports, onboarding, and AI context.
9. Add automated tests.
10. Run complete backend/frontend regression verification.

## Acceptance criteria

- Users can edit calorie, water, and step targets from `Account → Physical`.
- Custom values remain after logout/login.
- Recalculating physical metrics does not overwrite custom targets.
- Users can restore one or all NovaFit recommendations.
- Dashboard updates immediately after saving.
- Nutrition uses the effective calorie target.
- New daily entries use the effective targets.
- Historical data is not silently rewritten.
- Progress and reports use historically correct targets.
- Invalid values cannot be persisted.
- Mobile and desktop layouts remain clean and accessible.
