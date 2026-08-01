# NovaFit — Custom Daily Targets Implementation Plan

**Date:** 2026-07-28  
**Status:** Ready for implementation  
**Scope:** Account / Physical, Dashboard, Progress, reports and all consumers of daily targets

## 1. Objective

Allow users to manually customize their daily targets for:

- calories (kcal/day);
- water (litres/day);
- steps/day.

NovaFit will continue calculating recommended values from the user's physical data and goal. A manual value must override only the target used by the application, without replacing or corrupting the calculated recommendation.

## 2. Core product decision

For every target, keep three distinct values:

1. **Recommended target** — calculated by NovaFit from profile data.
2. **Custom target** — optional value entered by the user.
3. **Effective target** — value actually used throughout the application.

```text
effectiveTarget = customTarget ?? recommendedTarget
```

This separation lets users return to the recommendation at any time and prevents recalculation after a profile update from deleting their custom preferences.

## 3. Backend data model

Add nullable fields to the user/profile entity:

- `CustomCaloriesTarget`
- `CustomWaterTargetL`
- `CustomStepsTarget`

The existing calculated calorie and water values remain recommendations. If a recommended steps field does not exist yet, introduce one or centralize the current default/recommendation in the metrics service.

Create an EF Core migration and update:

- database model;
- model snapshot;
- development seed data only where necessary.

Do not migrate existing effective values into custom fields. Existing users must continue using calculated recommendations until they explicitly choose custom targets.

## 4. API contract

### Read targets

Return a normalized target model from the authenticated user endpoint or a dedicated endpoint:

```json
{
  "recommendedCalories": 2200,
  "recommendedWaterL": 2.3,
  "recommendedSteps": 8000,
  "customCalories": 2000,
  "customWaterL": null,
  "customSteps": 10000,
  "effectiveCalories": 2000,
  "effectiveWaterL": 2.3,
  "effectiveSteps": 10000
}
```

### Update targets

Add:

```http
PUT /api/users/me/targets
```

The request supports updating one or all custom values. A `null` value restores the recommendation for that individual target.

Example:

```json
{
  "calories": 2000,
  "waterL": 2.5,
  "steps": 10000
}
```

### Reset targets

Either use nullable values through the update endpoint or expose:

```http
DELETE /api/users/me/targets
```

The reset operation clears all custom target values and returns the newly effective calculated recommendations.

### Validation

Apply backend validation as the source of truth:

- calories: `800–8000 kcal`;
- water: `0.5–10 L`;
- steps: `500–100000`;
- reject `NaN`, infinity, negative values and invalid decimal formats;
- return field-specific validation errors.

## 5. Metrics and recalculation rules

Update the metrics calculation flow so it recalculates only recommended values:

- BMI;
- BMR;
- TDEE;
- recommended calories;
- recommended water;
- recommended steps, if derived.

It must never overwrite custom targets.

Create or centralize reusable helpers for effective targets so individual features do not duplicate:

```text
GetEffectiveCaloriesTarget(user)
GetEffectiveWaterTarget(user)
GetEffectiveStepsTarget(user)
```

## 6. Account / Physical UI

Add a **Daily targets** section in the Physical tab containing:

- Calories;
- Water;
- Steps.

For each target display:

- effective value prominently;
- unit;
- recommended value as subtle supporting text;
- a small `Custom` indicator when an override is active;
- edit control;
- `Use recommended` action when applicable.

Recommended interaction:

1. Default state shows current effective targets.
2. `Edit targets` switches the section into edit mode.
3. Inputs use the current NovaFit underline style.
4. Actions:
   - `Cancel`;
   - `Save targets`;
   - `Use all recommended`.
5. Saving updates the UI immediately after the API succeeds.

Mobile requirements:

- one target per row;
- minimum touch target of 44–48 px;
- labels and units remain readable;
- no parent container border;
- no horizontal overflow;
- actions stay visible and do not sit behind the bottom navigation.

Desktop requirements:

- compact three-column layout where space allows;
- preserve the current Physical tab hierarchy and glassmorphism theme.

## 7. Frontend state and models

Introduce a normalized `DailyTargets` model containing recommended, custom and effective values.

Update:

- user/profile models;
- user API service;
- user facade/store;
- physical metrics state;
- shared metrics utilities.

Use the server response as the authoritative state after saving. Avoid independently recomputing effective values in multiple components.

Required UI states:

- loading;
- view mode;
- edit mode;
- saving;
- field validation error;
- API error;
- custom value active;
- recommendation active;
- reset success.

Disable save when:

- values have not changed;
- any value is invalid;
- a request is already running.

## 8. Dashboard integration

Replace direct use of calculated/default values with effective targets in:

- calorie target and nutritional progress;
- net calorie context where the target is shown;
- water target and progress;
- steps target and progress.

After saving targets from Account / Physical:

- Dashboard must show the new values without requiring logout;
- progress bars must recalculate;
- values must remain correct after reload.

Changing a target must not alter logged intake, burned calories, water or steps.

## 9. Historical data policy

Targets are time-dependent. Changing today's preference must not rewrite past performance.

Preferred implementation:

- store the effective target or target snapshot with each daily record when the day is created/updated;
- current and future daily records use the latest effective target;
- previous daily data and reports use the target active for each recorded day.

If historical target snapshots cannot be introduced in the first migration, document the temporary limitation and do not silently present retroactively recalculated completion percentages as historical truth.

## 10. Other consumers to update

Audit and replace hardcoded, calculated-only or default targets in:

- Nutrition macro/calorie progress;
- Weekly Balance;
- Progress page;
- nutritionist weekly report;
- complete-day logic;
- streak logic, if target completion affects it;
- onboarding and `Your numbers`;
- previous daily user data;
- AI Assistant context and generated reports;
- Social/Profile stats if they expose target-dependent completion data.

All consumers must use the same effective-target source.

## 11. Reports and AI behavior

The nutritionist report must:

- compare each day with that day's target snapshot;
- distinguish estimated calorie target from actual intake;
- avoid interpreting a custom target as a medical recommendation;
- mention user-selected targets neutrally where relevant;
- continue considering the goal stored in Account / Physical.

## 12. Expected affected areas

Backend candidates:

- user/profile entity;
- user DTOs;
- metrics service;
- user service;
- users controller;
- daily data service/entity;
- progress/report services;
- EF Core migration and snapshot.

Frontend candidates:

- Account / Physical tab components;
- user and fitness metrics models;
- user API service and facade;
- dashboard nutrition, hydration and steps cards;
- daily user data service;
- Progress and weekly report components;
- onboarding numbers summary;
- shared target utilities.

Exact files must be confirmed during implementation by tracing all current target reads.

## 13. Testing plan

### Backend tests

- returns recommendations when custom values are null;
- returns custom values as effective when present;
- updates one target without changing the other two;
- resets one target;
- resets all targets;
- rejects values outside validation limits;
- recalculating physical metrics preserves custom targets;
- authorization prevents editing another user's targets;
- historical daily records keep their target snapshot.

### Frontend tests

- renders recommended targets initially;
- enters and exits edit mode;
- displays field-specific validation;
- saves valid custom targets;
- resets to recommended values;
- keeps modal/form controls above mobile navigation;
- Dashboard updates after saving;
- reload preserves the values;
- progress bars use effective targets.

### Manual regression checks

- edit height, weight, age, gender, activity level and goal;
- verify recommendations recalculate while custom targets remain;
- reset custom targets and verify latest recommendations become effective;
- verify Dashboard on mobile and desktop;
- verify Progress and weekly report;
- verify previous days are not retroactively changed;
- verify seeded user and a newly registered user.

## 14. Implementation order

1. Trace all current calorie, water and steps target sources and consumers.
2. Add backend fields, DTOs, validation and migration.
3. Centralize recommended and effective target resolution.
4. Add API update/reset behavior and backend tests.
5. Implement the Account / Physical UI and frontend state.
6. Migrate Dashboard, Progress, reports and remaining consumers.
7. Add target snapshots to daily data and verify historical behavior.
8. Run backend tests, frontend tests, builds and responsive manual checks.
9. Document the completed implementation in `.claude/plans`.

## 15. Acceptance criteria

- The user can manually set calorie, water and steps targets in Account / Physical.
- The calculated recommendation remains visible and is not destroyed.
- Each target can independently return to its recommendation.
- Custom values persist after reload and login.
- Updating physical profile data does not overwrite custom values.
- Dashboard consistently uses effective targets.
- Progress and reports use the same target rules.
- Previous-day results are not rewritten by a current target change.
- Validation errors appear next to the relevant field.
- The feature works cleanly on mobile and desktop.
- No target value is hardcoded independently in a consumer component.

## 16. Definition of done

The feature is complete only after:

- migration applies successfully;
- backend tests pass;
- frontend tests and production build pass;
- all target consumers have been audited;
- mobile and desktop behavior has been manually verified;
- implementation details and actual changed files are recorded in a new document under `.claude/plans`.
