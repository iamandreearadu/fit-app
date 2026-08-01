# Progress tab & NovaFit Nutritionist report — API contract

**Date:** 2026-07-23  
**Status:** Backend implemented

## Data model

No schema migration is required. `DailyEntry.ManualWeight` and
`DailyEntry.EnergyLevel` already exist. The query indexes required by the
feature are already configured:

- `DailyEntry(UserId, Date)` — unique
- `MealEntry(UserId, Date)`

## Daily check-in

### `PATCH /api/daily/check-in`

This dedicated partial-update route avoids losing a weigh-in when an older
Dashboard client subsequently auto-saves the full daily form.

Request:

```json
{
  "date": "2026-07-23",
  "manualWeight": 72.4,
  "energyLevel": 4
}
```

- `date`: required ISO date (`yyyy-MM-dd`)
- `manualWeight`: required number, 30–300 kg
- `energyLevel`: optional integer, 1–5

The endpoint creates a default `DailyEntry` when needed and changes only
`ManualWeight`, `EnergyLevel`, and `UpdatedAt`. Response:
`DailyEntryDto`.

For backward compatibility, `POST /api/daily` also accepts the two optional
fields, but omitted fields preserve an existing check-in. Both fields are
returned by `DailyEntryDto` and `DailyEntrySummaryDto`.

## Progress endpoints

All routes require a Bearer token. The user identifier is read only from the
JWT.

### `GET /api/progress/summary?window=7|30`

Invalid or missing `window` values fall back to `7`.

Response: `ProgressSummaryDto`

- `trends`: daily points ordered ascending, including zero/null points for
  dates without data
- `streak`: the independent complete-day streak
- `weeklyReport`: `null` until the complete-day streak reaches 7

A complete day requires a non-template meal, an explicitly selected activity
(including Rest Day), steps greater than zero, and water greater than zero.
An incomplete current day receives a grace period and does not break the
existing run ending yesterday.

### `POST /api/progress/report/refresh`

Invalidates the authenticated user's current weekly narrative cache and
regenerates it from aggregate statistics only.

- `200`: `NutritionistWeeklyReportDto`
- `400`: report is still locked because the complete-day streak is below 7
- `429`: existing global AI rate-limit policy

## Privacy and caching

Groq receives aggregate seven-day statistics only; it never receives
meal-by-meal records. Narratives are cached per user and report window end
until the next UTC midnight, consistently with the existing Daily API date
semantics. Manual refresh removes that exact cache entry.

## Implementation record

**IMPLEMENTED:** 2026-07-23

Final endpoints:

- `PATCH /api/daily/check-in` → `DailyEntryDto`
- `GET /api/progress/summary?window=7|30` → `ProgressSummaryDto`
- `POST /api/progress/report/refresh` → `NutritionistWeeklyReportDto`

Migration added: none; both required indexes and check-in columns already
exist.

Services registered: `IProgressService` → `ProgressService`.

Ready for frontend integration.
