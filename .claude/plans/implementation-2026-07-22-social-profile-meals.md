# NovaFit — Social Profile Meals implementation

Date: 2026-07-22
Source decision: `.claude/decisions/social-profile-meals-and-post-linking-plan-2026-07-22.md`

## Implemented

- Added a fourth `Meals` tab to Social Profile, alongside Posts, Workouts and Stats.
- Kept the mobile profile navigation readable with a horizontally scrollable, hidden-scrollbar tab rail.
- Added compact meal cards that expose only social-safe fields: name, category and date.
- Added owner-only `Visible` / `Hidden` views and an inline hide/unhide control for every meal.
- New and migrated meals are private by default (`IsHiddenFromProfile = true`).
- Hide/unhide changes only social-profile visibility. It does not delete the meal and does not modify calories, macro totals, food items or daily nutrition aggregation.
- Added authenticated social endpoints for visible meals, owner-only hidden meals and visibility toggling.
- Enforced ownership for visibility mutations and for linking a meal to a post.
- Generalized New Post → Add activity to support `Workout` and `Meal` sources in the same responsive picker.
- The meal picker uses the authenticated Nutrition list, can search meals, and marks meals hidden from the profile.
- A post can contain only a linked meal; only one workout/meal activity can be attached at a time.
- Added a safe linked-content snapshot (`type`, `title`, `subtitle`) to posts. A post keeps its activity preview if the original workout or meal is later deleted.
- Added the visibility field to the private Nutrition DTO so the owner UI can display its current state.
- Added the composite database index `(UserId, IsHiddenFromProfile, CreatedAt)`.
- Added EF migration `20260722113900_AddMealProfileVisibilityAndLinkedContentSnapshot`.

## Privacy decisions applied

- Public social meal responses never include calories, protein, carbohydrates, fats, grams, notes or food items.
- Profile visibility is opt-in: existing rows are migrated to hidden and new entities default to hidden.
- Hidden meals remain available to their owner in New Post because hiding is presentation privacy, not deletion.

## Verification

- `dotnet build FitApp.Api/FitApp.Api.csproj -c Release --no-restore`: passed, 0 warnings / 0 errors.
- `npm run build`: passed.
- Focused Angular Create Post tests: 5/5 passed, including meal-only publishing.
- Added backend integration coverage in `FitApp.Api.Tests/ProfileMealsTests.cs` for public privacy filtering and non-destructive visibility toggling.
- Backend integration suite could not execute in this Windows environment because Application Control blocks the native `e_sqlite3` test dependency. This affected all existing SQLite integration tests, not only the new tests; compilation passed.
- Debug build/migration initially encountered the already-running `FitApp.Api.exe`; verification and migration generation were therefore performed in Release without stopping the user's active API process.

## Operational note

The API applies EF migrations during startup. Restart the running API once to apply the new columns and index to the configured database.
