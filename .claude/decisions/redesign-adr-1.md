# ADR: Structured linkedContentData in Post API Responses

**ID:** REDESIGN-ADR-1 (RISK-1)
**Status:** Proposed
**Date:** 2026-06-04
**Author:** @tech-architect
**Consumed by:** @dotnet-developer, @angular-developer

---

## Context

The beSocial redesign introduces type-differentiated feed cards: workout posts display a 4-stat grid (exercises, sets, volume, ~kcal) and meal posts display colored macro chips (P/C/F + total kcal). The current `LinkedContentPreview` DTO returns a flat string `subtitle` field:

- Workout: `"45 min · Strength"` — no exercise count, no set count, no volume, no calorie estimate
- Meal: `"Lunch"` — no protein, carbs, fat, or calorie totals

The frontend cannot parse these strings reliably because their format is not contractually stable. The redesigned fitness-data-block component requires structured numeric data to render the stat grid and macro chips.

## Decision

**Option (b): Store structured data at post creation time and return it in a new `LinkedContentData` field on `PostResponse`.**

Option (a) — parsing the subtitle string at query time — is rejected because: (1) the current subtitle does not contain the required data (exercise count, volume, macros are absent), (2) string parsing is fragile and ties the API to a specific format, (3) the linked entities may be deleted or modified after post creation, making at-query-time lookups return stale or missing data.

### Implementation

**1. New nullable JSON column on Post entity:**

```csharp
// FitApp.Api/Models/Entities/Post.cs — add property
public string? LinkedContentDataJson { get; set; }
```

This column stores a JSON-serialized object at post creation time. It is a snapshot — once written, it does not change if the underlying workout or meal is later edited or deleted. This is the correct semantic: the post records what the user did at the time of sharing.

**2. New DTO classes:**

```csharp
// FitApp.Api/Models/DTOs/SocialDtos.cs — add these records

/// <summary>
/// Structured fitness data snapshot stored at post creation time.
/// Returned alongside the existing LinkedContentPreview in PostResponse.
/// Null for text-only posts, daily entry posts, and legacy posts created before this migration.
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

**3. Add field to PostResponse:**

```csharp
// FitApp.Api/Models/DTOs/SocialDtos.cs — add to PostResponse class
public LinkedContentDataDto? LinkedContentData { get; set; }
```

**4. Populate at creation time in SocialService:**

In `CreatePostAsync` (for direct post creation with linked content) and `CreatePostFromWorkoutAsync` / `CreatePostFromMealAsync` (for share-flow creation):

```csharp
// When creating a post with LinkedWorkoutId:
if (request.LinkedWorkoutId.HasValue)
{
    var workout = await db.WorkoutTemplates
        .Include(w => w.Exercises)
        .FirstOrDefaultAsync(w => w.Id == request.LinkedWorkoutId.Value && w.UserId == userId);
    
    if (workout != null)
    {
        var data = new LinkedContentDataDto
        {
            ExerciseCount = workout.Exercises.Count,
            TotalSets = workout.Exercises.Sum(e => e.Sets),
            TotalVolumeKg = Math.Round(workout.Exercises.Sum(e => e.Sets * e.Reps * e.WeightKg), 1),
            EstimatedCaloriesKcal = workout.CaloriesEstimateKcal
        };
        post.LinkedContentDataJson = JsonSerializer.Serialize(data);
    }
}

// When creating a post with LinkedMealId:
if (request.LinkedMealId.HasValue)
{
    var meal = await db.MealEntries
        .FirstOrDefaultAsync(m => m.Id == request.LinkedMealId.Value && m.UserId == userId);
    
    if (meal != null)
    {
        var data = new LinkedContentDataDto
        {
            ProteinG = Math.Round(meal.TotalProtein_g, 1),
            CarbsG = Math.Round(meal.TotalCarbs_g, 1),
            FatG = Math.Round(meal.TotalFats_g, 1),
            TotalCalories = Math.Round(meal.TotalCalories, 0)
        };
        post.LinkedContentDataJson = JsonSerializer.Serialize(data);
    }
}
```

**5. Deserialize in PostResponse mapping:**

In the `BuildPostResponse` / `MapToPostResponse` method:

```csharp
LinkedContentData = post.LinkedContentDataJson != null
    ? JsonSerializer.Deserialize<LinkedContentDataDto>(post.LinkedContentDataJson)
    : null,
```

**6. Existing subtitle in LinkedContentPreview:**

The existing `LinkedContentPreview.Subtitle` field continues to be returned as-is for backward compatibility. The `BuildLinkedContentPreview` method is unchanged. Frontend components that do not yet use the new `linkedContentData` can continue reading the subtitle string.

Update the subtitle string to include richer summary text for display contexts that do not use the structured data (e.g., notifications):
- Workout: `"{Title} - {ExerciseCount} exercises - {DurationMin} min"`
- Meal: `"{MealName} - {TotalCalories} kcal"`

### Migration Strategy

**EF Migration:**

```
dotnet ef migrations add AddLinkedContentDataJsonToPost
```

The migration adds a nullable `TEXT` column `LinkedContentDataJson` to the `Posts` table. No data migration is needed — existing posts will have `null` for this column, which the frontend handles gracefully.

**Existing posts (null-safe frontend):**

The Angular `PostCard` component must handle `linkedContentData === null || linkedContentData === undefined` by falling back to the existing `linkedContent.subtitle` string rendering. This means the old flat-string rendering path is preserved as a fallback. The new fitness-data-block rendering activates only when `linkedContentData` is present with the required fields.

```typescript
// In PostCard component
readonly isWorkoutPost = computed(() => 
  this.post().linkedContent?.type === 'workout' && 
  this.post().linkedContentData?.exerciseCount != null
);
```

### TypeScript Interface

```typescript
// fit-app/src/app/core/models/social.model.ts — add

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

// Update Post interface — add field:
// linkedContentData?: LinkedContentData;
```

### Endpoints Affected

| Endpoint | Change |
|----------|--------|
| `GET /api/social/feed` | PostResponse now includes `linkedContentData` field |
| `GET /api/social/discover` | Same |
| `GET /api/social/posts/{id}` | Same |
| `GET /api/social/profile/{userId}/posts` | Same |
| `POST /api/social/posts` | Populates `LinkedContentDataJson` on the entity at creation |
| `POST /api/social/posts/from-workout/{sessionId}` | Same — populate from session data |
| `POST /api/social/posts/from-meal/{mealId}` | Same — populate from meal data |

### Privacy Note

The `LinkedContentData` for meal posts includes macro values (proteinG, carbsG, fatG, totalCalories). This data is already present on the MealEntry entity and was chosen by the user to share publicly via the post. The existing `CreatePostFromMealAsync` strips health metrics — but when the user explicitly links a meal to a post, the macro data is part of the shared content, not a private health metric. This is consistent with Strava showing pace/distance and MyFitnessPal showing food diary entries in shared posts.

However: the `LinkedContentData` for workout posts includes `EstimatedCaloriesKcal`. This value is already present on the `WorkoutTemplate.CaloriesEstimateKcal` field. Since this is an AI-estimated approximation (prefixed with "~" in the UI), it is acceptable in shared workout posts. The `CreatePostFromWorkoutAsync` privacy constraint (no calorie data in `PreviewText`) applies to the auto-generated text caption, not to the structured data block that the user explicitly chose to share.

## Consequences

- **Gain:** Frontend can render rich fitness-data-blocks with exact numeric values, no string parsing
- **Gain:** Data is snapshot-at-creation: immune to post-creation edits or deletions of linked entities
- **Accept:** Existing posts will not have structured data; frontend must maintain the fallback rendering path
- **Accept:** Slight storage increase (~200 bytes per post with linked content)
- **Rollback:** Drop the column via a reverse migration; frontend falls back to subtitle rendering automatically since the fallback path is always present

## Instructions for @dotnet-developer

1. Add `LinkedContentDataJson` (nullable string) to `Post.cs` entity
2. Create EF migration: `dotnet ef migrations add AddLinkedContentDataJsonToPost`
3. Add `LinkedContentDataDto` record to `SocialDtos.cs`
4. Add `LinkedContentData` property to `PostResponse`
5. Update `CreatePostAsync` in `SocialService.cs` to populate `LinkedContentDataJson` when `LinkedWorkoutId` or `LinkedMealId` is provided
6. Update `CreatePostFromWorkoutAsync` to populate from `WorkoutSession` data (use session's `SetsCompleted`, exercise count from template, volume from session sets)
7. Update `CreatePostFromMealAsync` to populate from `MealEntry` macro data
8. Update the post-to-response mapping method to deserialize `LinkedContentDataJson` into the DTO
9. No changes to the `BuildLinkedContentPreview` method — keep it as-is for backward compatibility

## Instructions for @angular-developer

1. Add `LinkedContentData` interface to `social.model.ts`
2. Add `linkedContentData?: LinkedContentData` field to `Post` interface
3. In `PostCard` component, add computed signals `isWorkoutPost`, `isMealPost` that check both `linkedContent.type` AND `linkedContentData` presence
4. Render the new `FitnessDataBlockComponent` when `linkedContentData` is present; fall back to existing `linkedContent` subtitle rendering when absent
