# API Contract: Fix 2 — Share to beSocial at Workout/Meal Completion

**Author:** @tech-architect  
**Date:** 2026-06-02  
**Status:** COMPLETE  
**ADR:** `.claude/decisions/fix-2-share-besocial.md`  
**Design spec dependency:** `.claude/design-specs/fix-3-post-log-reward.md` (share CTA integration)  
**Related contracts:** `.claude/contracts/fix-3-post-log-reward.md`, `.claude/contracts/fix-6-workout-set-logger.md`

---

## Status History

| Date | Status | Changed by | Note |
|---|---|---|---|
| 2026-06-02 | DRAFT | @tech-architect | ADR + contract created |
| 2026-06-02 | BACKEND_READY | @dotnet-developer | Both endpoints implemented; privacy invariant enforced at query level |

---

## IMPLEMENTED: 2026-06-02

**Final endpoints:**

| Method | Route | Response DTO | Status Code |
|---|---|---|---|
| POST | `/api/social/posts/from-workout/{sessionId}` | `SharePostResponse` | 201 Created |
| POST | `/api/social/posts/from-meal/{mealId}` | `SharePostResponse` | 201 Created |

**Migration added:** None — both endpoints use the existing `Post` entity and FK columns.

**Services registered:** None — `ISocialService`/`SocialService` already registered in `Program.cs`.

**Modified files:**

| File | Change |
|---|---|
| `Models/DTOs/SocialDtos.cs` | Added `PostFromWorkoutRequest`, `PostFromMealRequest`, `SharePostResponse` |
| `Services/ISocialService.cs` | Added `CreatePostFromWorkoutAsync`, `CreatePostFromMealAsync` signatures |
| `Services/SocialService.cs` | Implemented both methods |
| `Controllers/SocialController.cs` | Added `ShareFromWorkout`, `ShareFromMeal` actions |

**Privacy verification (completed):**
- ✅ `Post.Content` for workout posts: contains only `TemplateTitle`, `DurationMin`, `exerciseCount`, `SetsCompleted`
- ✅ `EstimatedCaloriesKcal` is never referenced in `CreatePostFromWorkoutAsync`
- ✅ `CaloriesEstimateKcal` is never referenced in `CreatePostFromWorkoutAsync`
- ✅ `ActualWeightKg` / `ActualReps` are never referenced in `CreatePostFromWorkoutAsync`
- ✅ `Post.Content` for meal posts: contains only `MealEntry.Name`
- ✅ `TotalCalories`, `TotalProtein_g`, `TotalCarbs_g`, `TotalFats_g`, `TotalGrams` are never loaded — the DB query projects **only** `m.Id` and `m.Name`
- ✅ `FoodItem` collection is never loaded or read in `CreatePostFromMealAsync`
- ✅ `SharePostResponse.PreviewText` equals `Post.Content` exactly

---

## Overview

Two new endpoints that create pre-composed social posts from completed workout sessions
and logged meals. Called by the "Share to beSocial" CTA in the Fix 3 completion screens.

**Privacy invariant:** Neither endpoint ever includes calories, macros, BMI, weight, BMR,
TDEE, or any health metric in the generated post content or response payload.

---

## Endpoints

| Method | Route | Auth | Request Body | Response | Status Code |
|--------|-------|------|-------------|----------|-------------|
| POST | `/api/social/posts/from-workout/{sessionId}` | Bearer | `PostFromWorkoutRequest` | `SharePostResponse` | 201 Created |
| POST | `/api/social/posts/from-meal/{mealId}` | Bearer | `PostFromMealRequest` | `SharePostResponse` | 201 Created |

---

## Endpoint 1 — POST /api/social/posts/from-workout/{sessionId}

Creates a social post from a completed workout session.

### Route Parameters

| Param | Type | Description |
|-------|------|-------------|
| `sessionId` | int | `WorkoutSession.Id` — the completed session to share |

### Authentication

`Authorization: Bearer <token>` — required.  
UserId extracted from JWT `sub` claim only.

### Request Body — `PostFromWorkoutRequest`

```json
{
  "caption": "Crushed it today! 💪"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `caption` | string? | No | MaxLength(300) | Optional user text prepended to auto-generated content |

Body may be omitted entirely (empty body) or sent as `{}` — caption defaults to null.

### Server-Side Content Composition

The service loads the `WorkoutSession` (with its `Sets` collection) and composes:

```
[caption + "\n\n" if caption is non-empty]
🏋️ {session.TemplateTitle}
⏱️ {session.DurationMin} min · {exerciseCount} exercises · {session.SetsCompleted} sets
```

Where `exerciseCount = session.Sets.Select(s => s.ExerciseName).Distinct().Count()`.

**Examples:**

No caption:
```
🏋️ Pull Day A
⏱️ 47 min · 3 exercises · 12 sets
```

With caption:
```
Crushed it today! 💪

🏋️ Pull Day A
⏱️ 47 min · 3 exercises · 12 sets
```

### PRIVACY — Fields EXCLUDED from content (enforced server-side)

| Field | Source | Why excluded |
|-------|--------|-------------|
| `EstimatedCaloriesKcal` | `WorkoutSession` | Calories burned = health metric |
| `CaloriesEstimateKcal` | `WorkoutTemplate` | Template calorie estimate = health metric |
| `ActualWeightKg` | `WorkoutSessionSet` | Exercise weight = body capacity metric |
| `ActualReps` | `WorkoutSessionSet` | Not excluded per se, but not included in v1 for simplicity |

### Post Entity Created

| Post Field | Value |
|------------|-------|
| `UserId` | From JWT |
| `Content` | Server-composed text (see above) |
| `LinkedWorkoutId` | `session.WorkoutTemplateId` (nullable — null if template was deleted) |
| `LinkedMealId` | null |
| `LinkedDailyEntryId` | null |
| `ImageUrl` | null |
| `ArticleId` | null |

### Success Response — 201 Created

```json
{
  "postId": 42,
  "previewText": "🏋️ Pull Day A\n⏱️ 47 min · 3 exercises · 12 sets"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `postId` | int | The created `Post.Id` |
| `previewText` | string | The full generated content (matches `Post.Content`) |

### Error Responses

| Status | Condition | ProblemDetails detail |
|--------|-----------|----------------------|
| 401 | Missing or invalid JWT | (framework default) |
| 404 | Session not found or `session.UserId != jwt.sub` | "Workout session not found." |

---

## Endpoint 2 — POST /api/social/posts/from-meal/{mealId}

Creates a social post from a logged meal entry.

### Route Parameters

| Param | Type | Description |
|-------|------|-------------|
| `mealId` | int | `MealEntry.Id` — the meal to share |

### Authentication

`Authorization: Bearer <token>` — required.  
UserId extracted from JWT `sub` claim only.

### Request Body — `PostFromMealRequest`

```json
{
  "caption": "Post-workout fuel 🔥"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `caption` | string? | No | MaxLength(300) | Optional user text prepended to auto-generated content |

Body may be omitted entirely (empty body) or sent as `{}` — caption defaults to null.

### Server-Side Content Composition

The service loads the `MealEntry` and composes:

```
[caption + "\n\n" if caption is non-empty]
🍽️ {mealEntry.Name}
```

**Examples:**

No caption:
```
🍽️ Chicken & Rice Bowl
```

With caption:
```
Post-workout fuel 🔥

🍽️ Chicken & Rice Bowl
```

### PRIVACY — Fields EXCLUDED from content (enforced server-side)

| Field | Source | Why excluded |
|-------|--------|-------------|
| `TotalCalories` | `MealEntry` | Calorie intake = health metric |
| `TotalProtein_g` | `MealEntry` | Macro data = health metric |
| `TotalCarbs_g` | `MealEntry` | Macro data = health metric |
| `TotalFats_g` | `MealEntry` | Macro data = health metric |
| `TotalGrams` | `MealEntry` | Weight of food = not useful publicly |
| `FoodItem.*` | `FoodItem` children | Individual food macros = health metric |

### Post Entity Created

| Post Field | Value |
|------------|-------|
| `UserId` | From JWT |
| `Content` | Server-composed text (see above) |
| `LinkedWorkoutId` | null |
| `LinkedMealId` | `mealId` |
| `LinkedDailyEntryId` | null |
| `ImageUrl` | null |
| `ArticleId` | null |

### Success Response — 201 Created

```json
{
  "postId": 43,
  "previewText": "🍽️ Chicken & Rice Bowl"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `postId` | int | The created `Post.Id` |
| `previewText` | string | The full generated content (matches `Post.Content`) |

### Error Responses

| Status | Condition | ProblemDetails detail |
|--------|-----------|----------------------|
| 401 | Missing or invalid JWT | (framework default) |
| 404 | Meal not found or `meal.UserId != jwt.sub` | "Meal entry not found." |

---

## Request DTOs

```csharp
/// <summary>
/// Request body for POST /api/social/posts/from-workout/{sessionId}.
/// Caption is optional — if omitted, the post uses only the auto-generated content.
/// </summary>
public class PostFromWorkoutRequest
{
    [MaxLength(300)]
    public string? Caption { get; set; }
}

/// <summary>
/// Request body for POST /api/social/posts/from-meal/{mealId}.
/// Caption is optional — if omitted, the post uses only the auto-generated content.
/// </summary>
public class PostFromMealRequest
{
    [MaxLength(300)]
    public string? Caption { get; set; }
}
```

---

## Response DTO

```csharp
/// <summary>
/// Response for both from-workout and from-meal share endpoints.
/// PreviewText is the server-generated post content (what appears in the feed).
/// PRIVACY: previewText NEVER contains calories, macros, BMI, weight, or any health metric.
/// </summary>
public class SharePostResponse
{
    public int PostId { get; set; }
    public string PreviewText { get; set; } = string.Empty;
}
```

---

## TypeScript Interfaces (fit-app/src/app/core/models/social.model.ts)

```typescript
export interface PostFromWorkoutRequest {
  caption?: string;
}

export interface PostFromMealRequest {
  caption?: string;
}

export interface SharePostResponse {
  postId: number;
  previewText: string;
}
```

---

## TypeScript API Service Methods (fit-app/src/app/api/social.service.ts)

```typescript
shareWorkout(sessionId: number, req?: PostFromWorkoutRequest): Observable<SharePostResponse> {
  return this.http.post<SharePostResponse>(
    `${this.baseUrl}/posts/from-workout/${sessionId}`,
    req ?? {}
  );
}

shareMeal(mealId: number, req?: PostFromMealRequest): Observable<SharePostResponse> {
  return this.http.post<SharePostResponse>(
    `${this.baseUrl}/posts/from-meal/${mealId}`,
    req ?? {}
  );
}
```

---

## TypeScript Facade Methods (fit-app/src/app/core/facade/social.facade.ts)

```typescript
async shareWorkout(sessionId: number, caption?: string): Promise<SharePostResponse | null> {
  try {
    const req: PostFromWorkoutRequest | undefined = caption ? { caption } : undefined;
    return await firstValueFrom(this.socialSvc.shareWorkout(sessionId, req));
  } catch {
    this.alerts.error('Failed to share workout. Please try again.');
    return null;
  }
}

async shareMeal(mealId: number, caption?: string): Promise<SharePostResponse | null> {
  try {
    const req: PostFromMealRequest | undefined = caption ? { caption } : undefined;
    return await firstValueFrom(this.socialSvc.shareMeal(mealId, req));
  } catch {
    this.alerts.error('Failed to share meal. Please try again.');
    return null;
  }
}
```

---

## ShareToSocialBottomSheetComponent Data Contract

The bottom sheet receives data via `MAT_BOTTOM_SHEET_DATA` injection token.

```typescript
/**
 * Discriminated union for share bottom sheet input data.
 * PRIVACY: estimatedCaloriesKcal intentionally absent from workout variant.
 * PRIVACY: macro totals intentionally absent from meal variant.
 */
export type ShareToSocialData =
  | {
      type: 'workout';
      sessionId: number;
      templateTitle: string;
      durationMin: number;
      exerciseCount: number;
      // estimatedCaloriesKcal: INTENTIONALLY OMITTED — health metric
    }
  | {
      type: 'meal';
      mealId: number;
      mealName: string;
      mealType: string;
      // totalCalories / totalProtein_g / etc: INTENTIONALLY OMITTED — health metrics
    };
```

**Client-side preview text generation** (mirrors server logic for instant display):

```typescript
function buildPreviewText(data: ShareToSocialData): string {
  if (data.type === 'workout') {
    return `🏋️ ${data.templateTitle}\n⏱️ ${data.durationMin} min · ${data.exerciseCount} exercises`;
  }
  return `🍽️ ${data.mealName}`;
}
```

Note: The client preview is approximate (omits `setsCompleted` which is not in the
bottom sheet data). The server response `previewText` is the canonical version displayed
after publish.

---

## Notes for @dotnet-developer

### Implementation checklist:

- [ ] Add `PostFromWorkoutRequest`, `PostFromMealRequest`, `SharePostResponse` to `Models/DTOs/SocialDtos.cs`
- [ ] Add `CreatePostFromWorkoutAsync` and `CreatePostFromMealAsync` signatures to `Services/ISocialService.cs`
- [ ] Implement both methods in `Services/SocialService.cs`:
  - Load session/meal with ownership check (`entity.UserId == userId`)
  - For workout: include `Sets` navigation to count distinct exercise names
  - Compose content string (see content composition sections above)
  - Create `Post` entity, save, return `SharePostResponse`
  - Throw `KeyNotFoundException` when entity not found or not owned
- [ ] Add two controller actions in `Controllers/SocialController.cs`:
  - `[HttpPost("posts/from-workout/{sessionId:int}")]`
  - `[HttpPost("posts/from-meal/{mealId:int}")]`
  - Follow existing pattern: try/catch → KeyNotFoundException → 404, Exception → 500
  - Return `StatusCode(201, result)`
- [ ] No migration needed — uses existing Post entity

### PRIVACY VERIFICATION (for @code-reviewer):
- [ ] `Content` does NOT contain any calorie value (EstimatedCaloriesKcal, CaloriesEstimateKcal, TotalCalories)
- [ ] `Content` does NOT contain any macro value (protein, carbs, fat)
- [ ] `Content` does NOT contain exercise weight (ActualWeightKg)
- [ ] `SharePostResponse.PreviewText` matches `Post.Content` exactly
- [ ] No health metric appears anywhere in the 201 response body

---

## Notes for @angular-developer

### Implementation checklist:

- [ ] Add `PostFromWorkoutRequest`, `PostFromMealRequest`, `SharePostResponse` interfaces to `core/models/social.model.ts`
- [ ] Add `shareWorkout()` and `shareMeal()` methods to `api/social.service.ts`
- [ ] Add `shareWorkout()` and `shareMeal()` methods to `core/facade/social.facade.ts`
- [ ] Create `shared/components/share-to-social-bottom-sheet/` component:
  - Standalone component
  - Receives `ShareToSocialData` via `MAT_BOTTOM_SHEET_DATA`
  - Shows client-side preview of post content
  - Optional caption textarea (maxlength 300, character counter)
  - "Publish" button → calls facade method → success toast → close
  - "Cancel" / backdrop click → close without action
  - Loading state on publish button (disable + spinner)
- [ ] Wire `WorkoutCompletionCardComponent` share button to open bottom sheet with workout data
- [ ] Wire `MealCompletionFeedbackComponent` share button to open bottom sheet with meal data
- [ ] **CRITICAL:** Verify `ShareToSocialData` type does NOT include `estimatedCaloriesKcal` or any macro field — the TypeScript type system is the first line of defense

---

## Pre-existing Issue (flagged, not Fix 2 scope)

`SocialService.BuildLinkedContentPreview()` includes calories in the subtitle for linked
workout and meal posts. This predates Fix 2 and affects ALL posts with linked content
(including posts created via the existing `POST /api/social/posts` endpoint). A follow-up
ticket should sanitize `BuildLinkedContentPreview()` to remove calorie data from the
subtitle. Fix 2 does NOT modify this helper.

---

## Implementation Log

```
2026-06-02 - DRAFT created by @tech-architect
2026-06-02 - BACKEND_READY by @dotnet-developer
2026-06-02 - COMPLETE by @angular-developer
  - Added PostFromWorkoutRequest, PostFromMealRequest, SharePostResponse,
    ShareToSocialData, ShareSheetResult to core/models/social.model.ts
  - Added shareWorkout(), shareMeal() to api/social.service.ts
  - Added shareWorkout(), shareMeal() + AlertService to core/facade/social.facade.ts
  - Created shared/components/share-to-social-bottom-sheet/ (ts + html + css)
  - Added MatBottomSheetModule to core/material/material.module.ts
  - Added .char-green/.char-yellow/.char-red + share-sheet-panel panel styles to styles.css
  - Wired WorkoutCompletionCardComponent.onShare() (replaced placeholder)
  - Wired MealCompletionFeedbackComponent.onShare() (new method, template updated)
  - Privacy verified: ShareToSocialData workout variant has no estimatedCaloriesKcal;
    meal variant has no macro totals
```
