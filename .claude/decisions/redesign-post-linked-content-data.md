# ADR: Structured linkedContentData on Post API Responses

**ID:** REDESIGN-ADR-1
**Status:** Proposed
**Date:** 2026-06-04
**Author:** @tech-architect
**Consumed by:** @dotnet-developer, @angular-developer
**Blocks:** Sprint 1 — FitnessDataBlockComponent (ITEM-7), PostCard type branching (ITEM-8)
**Supersedes:** `.claude/decisions/redesign-adr-1.md` (draft)

---

## Context

The beSocial redesign introduces type-differentiated feed cards. Workout posts must display a 4-stat grid (exercises, sets, volume, ~kcal) and meal posts must display colored macro chips (P/C/F + total kcal).

The current `LinkedContentPreview` DTO (`SocialDtos.cs:15–20`) returns:

```csharp
public class LinkedContentPreview
{
    public string Type { get; set; } = string.Empty;   // "workout" | "meal" | "daily"
    public string Title { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
}
```

The `BuildLinkedContentPreview` method (`SocialService.cs:1090–1117`) populates `Subtitle` as:
- Workout: `"{DurationMin} min · {Type}"` — **missing** exercise count, set count, volume, calorie estimate
- Meal: `"{MealEntry.Type}"` (e.g., "Lunch") — **missing** protein, carbs, fat, total calories

The frontend cannot derive the required numbers from these strings because:
1. The data is absent from the string, not just unstructured
2. String parsing is fragile and ties the API to a format
3. The linked entities may be deleted or edited after post creation

## Decision

**Add a nullable JSON column `LinkedContentDataJson` to the `Post` entity.** Populate it at post creation time as a snapshot of the linked entity's fitness data. Return it as a `LinkedContentData` object on `PostResponse`.

### Why snapshot-at-creation (not query-at-read)

The linked `WorkoutTemplate` or `MealEntry` may be deleted or modified after the post is created. The `WorkoutTemplate.Exercises` collection is unstable — `WorkoutService.UpdateAsync` removes and re-creates all `WorkoutExercise` rows on template edits. A snapshot ensures the post always shows what the user did at the time of sharing.

### Why JSON column (not separate table)

The data is 1:1 with the Post, fixed at creation, and never queried independently. A JSON column avoids a join and keeps the migration minimal.

---

## Entity Change

**File:** `FitApp.Api/Models/Entities/Post.cs`

Add after line 22 (`IsArchived`):

```csharp
/// <summary>
/// JSON-serialized fitness data snapshot, populated at post creation time.
/// Null for text-only posts, daily-entry posts, and legacy posts created before this migration.
/// Deserialized to LinkedContentDataDto in PostResponse.
/// </summary>
public string? LinkedContentDataJson { get; set; }
```

No navigation property changes. No entity configuration changes in `AppDbContext`.

---

## Migration

```bash
dotnet ef migrations add AddLinkedContentDataJsonToPost --project FitApp.Api
```

Adds a nullable `TEXT` column `LinkedContentDataJson` to the `Posts` table. Default value: `NULL`. **No data migration needed** — existing posts will have `null`, handled gracefully by the frontend fallback path.

Migration runs automatically on startup via `db.Database.Migrate()` in `Program.cs`.

---

## DTO Changes

**File:** `FitApp.Api/Models/DTOs/SocialDtos.cs`

### New class — add after `LinkedContentPreview` (after line 20):

```csharp
/// <summary>
/// Structured fitness data snapshot stored at post creation time.
/// Returned alongside the existing LinkedContentPreview in PostResponse.
/// Null for text-only posts, daily-entry posts, and legacy posts pre-migration.
/// </summary>
public class LinkedContentDataDto
{
    // Workout fields (null for meal posts)
    public int? ExerciseCount { get; set; }
    public int? TotalSets { get; set; }
    public double? TotalVolumeKg { get; set; }
    public int? EstimatedCaloriesKcal { get; set; }

    // Meal fields (null for workout posts)
    public double? ProteinG { get; set; }
    public double? CarbsG { get; set; }
    public double? FatG { get; set; }
    public double? TotalCalories { get; set; }
}
```

### PostResponse — add field (after `LinkedContent`, line 60):

```csharp
public LinkedContentDataDto? LinkedContentData { get; set; }
```

### No changes to `LinkedContentPreview` or `BuildLinkedContentPreview`

The existing subtitle field and method are preserved for backward compatibility. The frontend fallback path continues to work for legacy posts.

---

## Service Changes

**File:** `FitApp.Api/Services/SocialService.cs`

### 1. Populate in `CreatePostAsync` (line 174)

After the post entity is created (line 201–209) and before `db.Posts.Add(post)` (line 211), add:

```csharp
// Snapshot structured fitness data for the linked entity
if (request.LinkedWorkoutId.HasValue)
{
    var workout = await db.WorkoutTemplates
        .Include(w => w.Exercises)
        .FirstOrDefaultAsync(w => w.Id == request.LinkedWorkoutId.Value && w.UserId == userId);

    if (workout != null)
    {
        post.LinkedContentDataJson = JsonSerializer.Serialize(new LinkedContentDataDto
        {
            ExerciseCount = workout.Exercises.Count,
            TotalSets = workout.Exercises.Sum(e => e.Sets),
            TotalVolumeKg = Math.Round(workout.Exercises.Sum(e => (double)e.Sets * e.Reps * e.WeightKg), 1),
            EstimatedCaloriesKcal = workout.CaloriesEstimateKcal
        });
    }
}
else if (request.LinkedMealId.HasValue)
{
    var meal = await db.MealEntries
        .FirstOrDefaultAsync(m => m.Id == request.LinkedMealId.Value && m.UserId == userId);

    if (meal != null)
    {
        post.LinkedContentDataJson = JsonSerializer.Serialize(new LinkedContentDataDto
        {
            ProteinG = Math.Round(meal.TotalProtein_g, 1),
            CarbsG = Math.Round(meal.TotalCarbs_g, 1),
            FatG = Math.Round(meal.TotalFats_g, 1),
            TotalCalories = Math.Round(meal.TotalCalories, 0)
        });
    }
}
```

**Note:** The workout query above uses `Include(w => w.Exercises)` which is already done for ownership validation at line 185. To avoid a second query, restructure to load the full workout (with exercises) once, use it for both validation and data extraction.

### 2. Populate in `CreatePostFromWorkoutAsync` (line 997)

After `var session` is loaded (line 1002–1006), before `db.Posts.Add(post)` (line 1031):

```csharp
// Volume: sum of (ActualWeightKg × ActualReps) across all session sets
var totalVolumeKg = session.Sets.Sum(s => s.ActualWeightKg * s.ActualReps);

post.LinkedContentDataJson = JsonSerializer.Serialize(new LinkedContentDataDto
{
    ExerciseCount = exerciseCount,               // already computed at line 1010
    TotalSets = session.SetsCompleted,
    TotalVolumeKg = Math.Round(totalVolumeKg, 1),
    EstimatedCaloriesKcal = session.EstimatedCaloriesKcal
});
```

### 3. Populate in `CreatePostFromMealAsync` (line 1058)

The current implementation **projects only `Id` and `Name`** at line 1063–1066 for privacy enforcement. To populate `LinkedContentDataJson`, the projection must be extended:

```csharp
var meal = await db.MealEntries
    .AsNoTracking()
    .Where(m => m.Id == mealId && m.UserId == userId)
    .Select(m => new { m.Id, m.Name, m.TotalProtein_g, m.TotalCarbs_g, m.TotalFats_g, m.TotalCalories })
    .FirstOrDefaultAsync()
    ?? throw new KeyNotFoundException("Meal entry not found.");
```

Then before `db.Posts.Add(post)`:

```csharp
post.LinkedContentDataJson = JsonSerializer.Serialize(new LinkedContentDataDto
{
    ProteinG = Math.Round(meal.TotalProtein_g, 1),
    CarbsG = Math.Round(meal.TotalCarbs_g, 1),
    FatG = Math.Round(meal.TotalFats_g, 1),
    TotalCalories = Math.Round(meal.TotalCalories, 0)
});
```

### 4. Deserialize in `MapToPostResponse` (line 645)

Add to the return object (after `LinkedContent = BuildLinkedContentPreview(post)`, line 657):

```csharp
LinkedContentData = post.LinkedContentDataJson != null
    ? JsonSerializer.Deserialize<LinkedContentDataDto>(post.LinkedContentDataJson)
    : null,
```

**Add `using System.Text.Json;`** at the top of the file if not already present.

---

## Privacy Constraint

### What IS in `LinkedContentDataJson`

| Post type | Data stored | Justification |
|-----------|-------------|---------------|
| Workout | ExerciseCount, TotalSets, TotalVolumeKg, EstimatedCaloriesKcal | All derived from the workout definition (template exercises) or session performance. EstimatedCaloriesKcal is an AI approximation, not a biometric measurement. The user explicitly chose to share this workout. |
| Meal | ProteinG, CarbsG, FatG, TotalCalories | Macros from the user's logged meal. The user explicitly chose to share this meal entry. Analogous to MyFitnessPal's shared food diary entries. |

### What is NEVER in `LinkedContentDataJson`

| Field | Reason |
|-------|--------|
| `User.Bmi` | Private biometric |
| `User.Bmr` | Private biometric |
| `User.Tdee` | Private biometric |
| `User.GoalCalories` | Private health metric |
| `User.WeightKg` | Private biometric |
| `DailyEntry.ManualWeight` | Private biometric |
| `DailyEntry.EnergyLevel` | Private subjective health data |
| `DailyEntry.CaloriesIntake` | Private health metric (differs from meal macros — intake is a total daily metric) |

### Privacy enforcement

The `LinkedContentDataDto` class has exactly 8 fields. **No field references `User`, `DailyEntry`, or any biometric entity.** The DTO structure prevents accidental inclusion. Code review should verify that no additional fields are added to this DTO without privacy review.

The existing privacy constraint in `CreatePostFromMealAsync` (lines 1037–1056) is preserved: `Post.Content` (the text body) still contains **only the meal name** — no macros. The structured data goes into `LinkedContentDataJson`, which is a separate field with separate rendering. The meal's macros appear in the structured data block (visible to anyone viewing the post) because the user chose to share that meal.

---

## TypeScript Interface

**File:** `fit-app/src/app/core/models/social.model.ts`

Add after `LinkedContentPreview` (after line 25):

```typescript
export interface LinkedContentData {
  // Workout fields (null/undefined for meal posts)
  exerciseCount?: number;
  totalSets?: number;
  totalVolumeKg?: number;
  estimatedCaloriesKcal?: number;

  // Meal fields (null/undefined for workout posts)
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  totalCalories?: number;
}
```

Update `Post` interface — add after `linkedContent?` (line 32):

```typescript
linkedContentData?: LinkedContentData;
```

---

## Endpoints Affected

| Endpoint | Change |
|----------|--------|
| `GET /api/social/feed` | `PostResponse` now includes `linkedContentData` field |
| `GET /api/social/discover` | Same |
| `GET /api/social/posts/{id}` | Same |
| `GET /api/social/profile/{userId}/posts` | Same |
| `POST /api/social/posts` | Populates `LinkedContentDataJson` on the entity at creation |
| `POST /api/social/posts/from-workout/{sessionId}` | Same — populate from session data |
| `POST /api/social/posts/from-meal/{mealId}` | Same — populate from meal data |

---

## Frontend Fallback (null-safe)

The `FitnessDataBlockComponent` and `PostCard` must handle `linkedContentData === null || linkedContentData === undefined` by falling back to the existing `linkedContent.subtitle` string rendering. This means the old rendering path is always preserved:

```typescript
readonly isWorkoutPost = computed(() =>
  this.post().linkedContent?.type === 'workout' &&
  this.post().linkedContentData?.exerciseCount != null
);

readonly isWorkoutPostLegacy = computed(() =>
  this.post().linkedContent?.type === 'workout' &&
  this.post().linkedContentData?.exerciseCount == null
);
```

---

## Consequences

- **Gain:** Frontend renders rich fitness-data-blocks with exact numeric values, no string parsing
- **Gain:** Data is snapshot-at-creation — immune to post-creation edits or deletions
- **Gain:** No changes to `BuildLinkedContentPreview` — backward compatible
- **Accept:** Existing posts will not have structured data; frontend maintains fallback path
- **Accept:** ~200 bytes additional storage per post with linked content
- **Accept:** `CreatePostFromMealAsync` projection extended from 2 to 6 fields
- **Rollback:** Drop the column via reverse migration; frontend falls back to subtitle rendering automatically

---

## Instructions for @dotnet-developer

1. Add `LinkedContentDataJson` (nullable string) to `Post.cs` after `IsArchived`
2. Create EF migration: `dotnet ef migrations add AddLinkedContentDataJsonToPost --project FitApp.Api`
3. Add `LinkedContentDataDto` class to `SocialDtos.cs` after `LinkedContentPreview`
4. Add `LinkedContentData` property to `PostResponse` after `LinkedContent`
5. In `CreatePostAsync` — populate `LinkedContentDataJson` when `LinkedWorkoutId` or `LinkedMealId` is provided (load exercises for workout; extend meal projection for macros)
6. In `CreatePostFromWorkoutAsync` — populate from `WorkoutSession.Sets` data (exercise count already computed, add volume calculation)
7. In `CreatePostFromMealAsync` — extend the projection to include `TotalProtein_g`, `TotalCarbs_g`, `TotalFats_g`, `TotalCalories`; populate `LinkedContentDataJson`
8. In `MapToPostResponse` — deserialize `LinkedContentDataJson` into the DTO (null-safe)
9. Add `using System.Text.Json;` if not present
10. **Do NOT modify** `BuildLinkedContentPreview` — keep it unchanged for backward compatibility

## Instructions for @angular-developer

1. Add `LinkedContentData` interface to `social.model.ts` after `LinkedContentPreview`
2. Add `linkedContentData?: LinkedContentData` to `Post` interface after `linkedContent`
3. In `PostCard` component, add computed signals `isWorkoutPost`, `isMealPost` checking both `linkedContent.type` AND `linkedContentData` presence
4. Render `FitnessDataBlockComponent` when `linkedContentData` is present; fall back to existing subtitle rendering when absent
5. **Never import or reference `LinkedContentData` in any component that doesn't render social post cards**
