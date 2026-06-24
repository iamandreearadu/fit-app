# ADR: Fix 2 — Share to beSocial at Workout/Meal Completion

**Author:** @tech-architect  
**Date:** 2026-06-02  
**Status:** DRAFT  
**Sprint:** 2  
**Related:** `.claude/contracts/fix-2-share-besocial.md`, `.claude/contracts/fix-3-post-log-reward.md`, `.claude/design-specs/fix-3-post-log-reward.md`

---

## Context

beSocial is a separate navigation shell. Users who complete a workout or log a meal must
intentionally navigate to beSocial, manually construct a post, and optionally link their
content. Share rates are near zero because the friction is too high. Social sharing is the
primary viral loop for organic growth — every unsent post is a missed network effect.

Fix 3 (post-log reward screens) introduces `WorkoutCompletionCardComponent` and
`MealCompletionFeedbackComponent`, both with a "Share to beSocial" CTA button. Fix 2
provides the backend endpoints those CTAs call: one-tap publish from the completion screen.

**Critical privacy constraint (from UX audit + implementation plan):**
- Workout posts must NOT include `estimatedCaloriesKcal` — calories burned is a health metric
- Meal posts must NOT include macro totals (protein, carbs, fat) or calorie counts
- Only exercise names, duration, set count (workout) and meal name (meal) are safe to share

### Why New Endpoints Instead of Reusing `POST /api/social/posts`

The existing `CreatePostRequest` requires the frontend to compose the post content manually
and pass it in the request body. For share-from-completion, we want:

1. **Server-side content generation** — the backend composes the post text from the
   workout session or meal entry data, ensuring privacy constraints are enforced server-side
   (no calories/macros leak even if frontend is compromised)
2. **Atomic validation** — the endpoint verifies the workout session or meal belongs to the
   user AND hasn't already been shared, in one transaction
3. **No refactoring of existing post creation** — the implementation plan explicitly says:
   "Constrain Fix 2 to creating a post via a single new endpoint. Do not refactor existing
   post creation."

---

## Decision

Add two new endpoints to `SocialController` that create pre-composed posts from completed
workout sessions and logged meals respectively. Both endpoints:

- Accept minimal input (optional caption only)
- Generate post content server-side from the referenced entity
- Strip all health metrics (calories, macros, BMI, weight) before composing post text
- Link the post to the source entity via existing `Post.LinkedWorkoutId` / `Post.LinkedMealId`
- Return a slim response with the created post ID and a preview of the generated text

**Key decision: Link workout posts to `WorkoutTemplate` (not `WorkoutSession`).**  
The `Post` entity already has `LinkedWorkoutId` → `WorkoutTemplate` FK. Adding a
`LinkedWorkoutSessionId` would require a migration and schema change for a minimal gain.
Instead, the endpoint accepts a `sessionId`, looks up the session to extract display data
(title, duration, exercise count, set count), but links the created `Post` to
`session.WorkoutTemplateId`. The session data (duration, exercise names) is composed into
the post content text — it doesn't need a persistent FK relationship.

If the session's template was deleted (WorkoutTemplateId is null), the post is still
created with `LinkedWorkoutId = null` — the content text is self-contained.

---

## Clean Architecture Boundaries

- **Controller responsibility:** HTTP binding only — extract userId from JWT, validate route
  params, delegate to `SocialService`, return appropriate status code
- **Service responsibility:** All business logic — load session/meal, verify ownership,
  check for duplicate share, compose post content, strip health metrics, persist post,
  build response DTO
- **What stays out of controllers:** No content composition, no DB queries, no privacy filtering
- **What stays out of components:** No post content generation, no direct HTTP calls —
  components call facade methods which call API service methods

---

## Data Model

### No New EF Entities

Both endpoints create standard `Post` rows using existing entity + existing FK columns
(`LinkedWorkoutId`, `LinkedMealId`). No migration required.

### New DTOs (FitApp.Api/Models/DTOs/SocialDtos.cs)

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

/// <summary>
/// Response for both from-workout and from-meal post creation.
/// PreviewText is the server-generated post content (what appears in the feed).
/// PRIVACY: previewText never contains calories, macros, BMI, weight, or any health metric.
/// </summary>
public class SharePostResponse
{
    public int PostId { get; set; }
    public string PreviewText { get; set; } = string.Empty;
}
```

### TypeScript Interfaces (fit-app/src/app/core/models/social.model.ts)

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

## API Contract

| Method | Route | Auth | Request Body | Response | Status |
|--------|-------|------|-------------|----------|--------|
| POST | `/api/social/posts/from-workout/{sessionId}` | Bearer | `PostFromWorkoutRequest` (optional body) | `SharePostResponse` | 201 Created |
| POST | `/api/social/posts/from-meal/{mealId}` | Bearer | `PostFromMealRequest` (optional body) | `SharePostResponse` | 201 Created |

### POST /api/social/posts/from-workout/{sessionId}

**Route param:** `sessionId` (int) — the `WorkoutSession.Id` from the just-completed session.

**Server-side content composition:**
```
[caption + "\n\n" if caption provided]
🏋️ [TemplateTitle]
⏱️ [DurationMin] min · [ExerciseCount] exercises · [SetsCompleted] sets
```

Example generated content (no caption):
```
🏋️ Pull Day A
⏱️ 47 min · 3 exercises · 12 sets
```

Example with caption:
```
Crushed it today! 💪

🏋️ Pull Day A
⏱️ 47 min · 3 exercises · 12 sets
```

**PRIVACY ENFORCEMENT (server-side):**
- `EstimatedCaloriesKcal` from WorkoutSession → NEVER included in content
- `CaloriesEstimateKcal` from WorkoutTemplate → NEVER included in content
- Exercise weight values → NEVER included (body weight is a health metric proxy)
- Only: template title, duration, exercise count, set count

**Linked content:** `Post.LinkedWorkoutId = session.WorkoutTemplateId` (nullable — if
template was deleted, post is still created with LinkedWorkoutId = null).

**Error responses:**

| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid JWT |
| 404 | Session not found or doesn't belong to user |

### POST /api/social/posts/from-meal/{mealId}

**Route param:** `mealId` (int) — the `MealEntry.Id` from the just-logged meal.

**Server-side content composition:**
```
[caption + "\n\n" if caption provided]
🍽️ [MealEntry.Name]
```

Example generated content (no caption):
```
🍽️ Chicken & Rice Bowl
```

Example with caption:
```
Post-workout fuel 🔥

🍽️ Chicken & Rice Bowl
```

**PRIVACY ENFORCEMENT (server-side):**
- `TotalCalories` → NEVER included
- `TotalProtein_g`, `TotalCarbs_g`, `TotalFats_g` → NEVER included
- `TotalGrams` → NEVER included
- Individual `FoodItem` macro data → NEVER included
- Only: meal name

**Linked content:** `Post.LinkedMealId = mealId`.

**Error responses:**

| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid JWT |
| 404 | Meal not found or doesn't belong to user |

---

## Frontend Architecture

### No new facade or API service file

Both endpoints are social post creation — they belong in existing files.

**API service:** `api/social.service.ts` — add two methods:
- `shareWorkout(sessionId: number, req?: PostFromWorkoutRequest): Observable<SharePostResponse>`
- `shareMeal(mealId: number, req?: PostFromMealRequest): Observable<SharePostResponse>`

**Facade:** `core/facade/social.facade.ts` — add two methods:
- `async shareWorkout(sessionId: number, caption?: string): Promise<SharePostResponse | null>`
- `async shareMeal(mealId: number, caption?: string): Promise<SharePostResponse | null>`

**New component:** `shared/components/share-to-social-bottom-sheet/`
- `ShareToSocialBottomSheetComponent` — standalone, dialog-based (MatBottomSheet)
- Receives share context via `@Inject(MAT_BOTTOM_SHEET_DATA)`
- Shows pre-composed preview text, optional caption input, publish button
- Calls `social.facade.shareWorkout()` or `social.facade.shareMeal()` on publish
- Emits success (with `SharePostResponse`) or dismiss

**Signals:** No new signals needed. The component uses one-shot Promise calls.

**Integration points (Fix 3 components → Fix 2):**
- `WorkoutCompletionCardComponent` "Share to beSocial" button → opens `ShareToSocialBottomSheetComponent` with `{ type: 'workout', sessionId, templateTitle, durationMin, exerciseCount }`
- `MealCompletionFeedbackComponent` "Share to beSocial" button → opens `ShareToSocialBottomSheetComponent` with `{ type: 'meal', mealId, mealName, mealType }`

---

## Instructions for @dotnet-developer

### Files to modify:
1. **`Models/DTOs/SocialDtos.cs`** — Add `PostFromWorkoutRequest`, `PostFromMealRequest`, `SharePostResponse`
2. **`Services/ISocialService.cs`** — Add two method signatures:
   - `Task<SharePostResponse> CreatePostFromWorkoutAsync(string userId, int sessionId, PostFromWorkoutRequest? request)`
   - `Task<SharePostResponse> CreatePostFromMealAsync(string userId, int mealId, PostFromMealRequest? request)`
3. **`Services/SocialService.cs`** — Implement both methods:
   - `CreatePostFromWorkoutAsync`: load `WorkoutSession` (with ownership check via `userId`), compose content from `TemplateTitle` + `DurationMin` + distinct exercise count from `Sets` + `SetsCompleted`, create `Post` with `LinkedWorkoutId = session.WorkoutTemplateId`, return `SharePostResponse`
   - `CreatePostFromMealAsync`: load `MealEntry` (with ownership check via `userId`), compose content from `Name` only, create `Post` with `LinkedMealId = mealId`, return `SharePostResponse`
   - **CRITICAL:** Neither method may include calories, macros, weight, or any health metric in the generated `Content` field
4. **`Controllers/SocialController.cs`** — Add two actions:
   - `POST posts/from-workout/{sessionId:int}` → calls `CreatePostFromWorkoutAsync`, returns `201 Created`
   - `POST posts/from-meal/{mealId:int}` → calls `CreatePostFromMealAsync`, returns `201 Created`
   - Both follow existing controller pattern (try/catch for KeyNotFoundException → 404, UnauthorizedAccessException → Forbid, Exception → 500)

### PRIVACY CHECKLIST (non-negotiable):
- [ ] `Content` field of created Post does NOT contain `EstimatedCaloriesKcal`
- [ ] `Content` field of created Post does NOT contain `CaloriesEstimateKcal`
- [ ] `Content` field of created Post does NOT contain `TotalCalories`
- [ ] `Content` field of created Post does NOT contain `TotalProtein_g`, `TotalCarbs_g`, `TotalFats_g`
- [ ] `Content` field of created Post does NOT contain exercise weight values
- [ ] `SharePostResponse.PreviewText` matches the `Content` field exactly (no additional data)

### No migration needed — uses existing `Post` entity and FKs.

---

## Instructions for @angular-developer

### Files to modify:
1. **`core/models/social.model.ts`** — Add `PostFromWorkoutRequest`, `PostFromMealRequest`, `SharePostResponse` interfaces
2. **`api/social.service.ts`** — Add `shareWorkout()` and `shareMeal()` methods calling the new endpoints
3. **`core/facade/social.facade.ts`** — Add `shareWorkout()` and `shareMeal()` facade methods (async, with error handling via AlertService)

### New component:
4. **`shared/components/share-to-social-bottom-sheet/share-to-social-bottom-sheet.component.ts`**
   - Standalone component using `MatBottomSheet` or custom overlay
   - Input data (via injection token): `ShareToSocialData` discriminated union:
     ```typescript
     type ShareToSocialData =
       | { type: 'workout'; sessionId: number; templateTitle: string; durationMin: number; exerciseCount: number }
       | { type: 'meal'; mealId: number; mealName: string; mealType: string };
     ```
   - Shows preview of what will be posted (client-side preview mirrors server composition)
   - Optional caption `<textarea>` (maxlength 300)
   - "Publish" button calls `socialFacade.shareWorkout()` or `socialFacade.shareMeal()`
   - On success: show toast, close bottom sheet, emit result
   - On error: show error toast, keep bottom sheet open
   - **CRITICAL:** `estimatedCaloriesKcal` is NOT in the `ShareToSocialData` type — it cannot be accidentally passed

### Integration with Fix 3 components:
5. **`features/workouts/active-session/workout-completion-card/`** — Wire "Share to beSocial" button to open `ShareToSocialBottomSheetComponent` with workout data (sessionId, templateTitle, durationMin, exerciseCount — NO calories)
6. **`features/user/nutrition-tab/meal-completion-feedback/`** — Wire "Share to beSocial" button to open `ShareToSocialBottomSheetComponent` with meal data (mealId, mealName, mealType — NO macros)

---

## Instructions for @uiux-designer

Design spec for `ShareToSocialBottomSheetComponent` needed:
- Bottom sheet layout (mobile-first)
- Preview card showing auto-generated post text
- Caption textarea with character count
- Publish + Cancel buttons
- Loading state during publish
- Success confirmation (before auto-dismiss)
- Follow existing glassmorphism design system (dark surface, blur, semi-transparent borders)

---

## Consequences & Trade-offs

### What we gain
- **One-tap sharing** from workout/meal completion screens → dramatically lower friction
- **Server-side privacy enforcement** — health metrics stripped at the API layer, not relying on frontend
- **No schema changes** — reuses existing `Post` entity and FK columns
- **No refactoring of existing post creation** — additive change only

### What we accept
- **Workout post links to WorkoutTemplate, not WorkoutSession** — if two sessions use the same template, the linked content preview in the feed shows the template data, not the specific session. This is acceptable because the post content text contains the session-specific data (duration, exercise count, sets)
- **No duplicate-share prevention in v1** — a user can share the same workout session or meal multiple times. We accept this because: (a) the "Share" CTA only appears once on the completion screen (dismisses after use), (b) adding a unique constraint would require a migration, (c) multiple shares of the same workout are not harmful

### Resolved: `BuildLinkedContentPreview` calorie leak

Previously flagged as a pre-existing privacy issue. **Now fixed** — `BuildLinkedContentPreview()`
(line ~1040 of `SocialService.cs`) was updated during the Fix 2 implementation to strip
calorie data from all linked content subtitles:

| Content type | Old subtitle (leaked calories) | New subtitle (safe) |
|---|---|---|
| Workout | `"{DurationMin} min · {CaloriesEstimateKcal} kcal"` | `"{DurationMin} min · {Type}"` |
| Meal | `"{Type} · {TotalCalories} kcal"` | `"{Type}"` |
| Daily | `"{Steps} steps · {CaloriesBurned} kcal burned"` | `"{Steps} steps"` |

This path is now clean. No further action required.

---

## Follow-up Privacy Audit Items

### FOLLOW-UP-1: `ProfileWorkoutSummary.CaloriesEstimateKcal` in social profile responses

**Flagged by:** @code-reviewer (Fix 2 code review)  
**Date flagged:** 2026-06-02  
**Severity:** Needs product decision — not a blocker for Fix 2 merge  
**Status:** OPEN — pending @product-strategist ruling

#### Finding

`ProfileWorkoutSummary` DTO (`SocialDtos.cs`, line 148) includes a
`CaloriesEstimateKcal` property. This field is populated in two service methods:

| Method | File | Line | Endpoint | Visibility |
|---|---|---|---|---|
| `GetProfileWorkoutsAsync` | `SocialService.cs` | 720 | `GET /api/social/profile/{userId}/workouts` | **Any authenticated user** can view another user's workout calories |
| `GetArchivedWorkoutsAsync` | `SocialService.cs` | 751 | `GET /api/social/profile/{userId}/workouts/archived` | Self-only (controller guards `userId != UserId`) |

After the `BuildLinkedContentPreview` fix, this is the **only remaining path** where
`CaloriesEstimateKcal` appears in a social-facing API response.

#### The question for @product-strategist

Template-level calorie estimates (`WorkoutTemplate.CaloriesEstimateKcal`) are
**user-entered rough estimates** when creating a workout plan (e.g., "I think Pull Day
burns ~350 kcal"). They are NOT the session-level `EstimatedCaloriesKcal` computed from
actual performance data.

Two reasonable positions:

1. **It's an accepted public signal.** Template calorie estimates are self-reported,
   approximate, and voluntarily attached to a workout the user chose to make visible on
   their social profile. Users who share their workout templates implicitly accept that
   the template metadata (including their own calorie estimate) is visible. The profile
   workouts tab is analogous to sharing a recipe with its calorie label — the user opted
   in by creating the template with that value.

2. **It's a privacy violation.** Any calorie figure — even a self-reported template
   estimate — is a health metric under the UX audit's privacy framework. Exposing it on
   a social profile viewed by other users normalizes calorie comparison and contradicts
   the principle that "BMI, body weight, goal calories, BMR, TDEE NEVER in social or
   public endpoints." The template estimate is a proxy for the user's perceived exertion
   and body composition goals.

#### Recommended action (if ruled a violation)

Remove `CaloriesEstimateKcal` from `ProfileWorkoutSummary` DTO in a separate fix:

```csharp
// SocialDtos.cs — ProfileWorkoutSummary
// REMOVE this property:
// public int CaloriesEstimateKcal { get; set; }
```

```csharp
// SocialService.cs lines 720 and 751 — remove these assignments:
// CaloriesEstimateKcal = w.CaloriesEstimateKcal,
```

Frontend impact: remove `caloriesEstimateKcal` from the TypeScript `ProfileWorkoutSummary`
interface and any profile workout card UI that displays it.

**This is a 15-minute change.** It does not require a migration (DTO-only, no entity change).
It does not affect the workout CRUD endpoints (`/api/workouts`) which remain user-private.

#### Why this does NOT block Fix 2

- Fix 2's new endpoints (`from-workout`, `from-meal`) do not touch `ProfileWorkoutSummary`
- Fix 2's `CreatePostFromWorkoutAsync` reads from `WorkoutSession`, not `WorkoutTemplate`
  directly, and explicitly excludes all calorie fields from the composed content
- The profile workout tab existed before Fix 2 and will exist after — this is an
  independent pre-existing exposure that should be evaluated on its own merits
- Blocking Fix 2 on this decision would delay the share flow with zero reduction in the
  existing exposure (the profile endpoint already serves this data today)
