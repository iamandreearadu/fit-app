# ADR: Fix 7 — First Login Guided Empty States

**Status:** APPROVED  
**Author:** @tech-architect  
**Date:** 2026-05-29  
**Sprint:** 2 (Weeks 3–4)  
**Source:** `.claude/ux-audits/full-platform-audit.md` §6, `.claude/design-specs/fix-7-empty-states.md`

---

## Context

New users who register and land on the three main modules — Workouts, Nutrition, and
Social Feed — see entirely blank screens. There is no guidance, no sample content, and
no obvious first action. This is the highest-churn moment in any fitness app: if the
first session feels empty, the user never returns.

**What already exists and must NOT be duplicated:**
- `WorkoutTemplate`, `WorkoutExercise`, `CardioDetails` entities and CRUD
- `WorkoutService`, `WorkoutsController` — template management
- `SocialService`, `SocialController` — feed, discover, follow
- `NutritionTabService`, `NutritionTabFacade` — meal CRUD
- `User.Goal` field — stores fitness goal category (`"lose"` / `"gain"` / `"maintain"`)

---

## Decision

### 1. System Workout Templates (seeded, fallback-served)

Three globally seeded `WorkoutTemplate` rows (`Push Day`, `Pull Day`, `Full Body`) with
`IsSystemTemplate = true` and `UserId = null`. When `GET /api/workouts` detects a user
with zero personal templates, it returns these system templates as a fallback. The
frontend uses `workoutTemplates().every(t => t.isSystemTemplate)` as the trigger for the
guided empty state, replacing the previous `length === 0` check.

System templates cannot be edited or deleted by users — the existing `UserId == requestingUserId`
ownership guard rejects them naturally since their `UserId` is null.

### 2. Suggested Users Endpoint

New `GET /api/social/discover/suggested` returns up to 5 follow suggestions for the
social feed guided empty state. Sorting: same-goal users first, then by workouts completed
this month (descending). Hard-capped at 5 server-side.

### 3. Nutrition Guided Empty State (frontend-only)

No backend changes — the nutrition guided state triggers on `meals.length === 0` and
offers two paths: AI meal analyzer and manual entry.

---

## Privacy Decision: Social-Facing Health Data Boundary

The `fitnessGoal` field (goal category: `"lose"` / `"gain"` / `"maintain"`) is considered a
public social signal and is intentionally surfaced in `SuggestedUserResponse`. Specific health
metrics — BMI, weight, BMR, TDEE, and goalCalories — remain private and are absent from all
social-facing DTOs.

**Rationale:** `fitnessGoal` is a coarse goal classification (3 possible values) that users
expect to share in a social fitness context — it enables "find people with similar goals"
without revealing body composition or caloric targets. The boundary is enforced at the DTO
level: `SuggestedUserResponse` contains only `userId`, `displayName`, `avatarUrl`,
`fitnessGoal`, and `workoutsThisMonth`. Future maintainers must not add BMI, weight, height,
body fat %, calories, BMR, TDEE, or goalCalories to any social-facing response without an
explicit privacy review and a new ADR.

---

## Clean Architecture Boundaries

- **Controller responsibility:** Parse query params, extract userId from JWT claims, delegate
  to service, return result. No business logic.
- **Service responsibility:** System template fallback logic in `WorkoutService.ListAsync`.
  Suggested-user ranking algorithm in `SocialService.GetSuggestedUsersAsync`.
- **What stays out of controllers:** Sorting algorithm, fallback logic, privacy filtering.
- **What stays out of components:** HTTP calls, follow-state management, template cloning
  orchestration — all go through facades.

---

## Data Model

### Modified Entity: `WorkoutTemplate`

```csharp
public class WorkoutTemplate
{
    // ... existing fields unchanged ...
    public string? UserId { get; set; }       // was string (non-nullable) → now nullable
    public User? User { get; set; }           // was User → now User?
    public bool IsSystemTemplate { get; set; } // NEW — default false
}
```

### New DTO: `SuggestedUserResponse`

```csharp
public class SuggestedUserResponse
{
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? FitnessGoal { get; set; }    // "lose" | "gain" | "maintain" | null
    public int WorkoutsThisMonth { get; set; }
}
```

### Modified DTO: `WorkoutTemplateDto`

```csharp
// Added field:
public bool IsSystemTemplate { get; set; }
```

### TypeScript Interfaces

```typescript
// core/models/workout.model.ts — added field
export interface WorkoutTemplate {
  // ... existing fields ...
  isSystemTemplate: boolean;
}

// core/models/social.model.ts — new interface
export interface SuggestedUser {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  fitnessGoal: 'lose' | 'gain' | 'maintain' | null;
  workoutsThisMonth: number;
}
```

---

## API Contract

| Method | Route | Auth | Request | Response |
|--------|-------|------|---------|----------|
| GET | `/api/workouts` | Bearer | — | `WorkoutTemplateDto[]` (system templates as fallback) |
| GET | `/api/social/discover/suggested` | Bearer | `?limit=5` | `SuggestedUserResponse[]` |

Full contract: `.claude/contracts/fix-7-empty-states.md`

---

## Frontend Architecture

- **New components:**
  - `features/workouts/guided-empty/workouts-guided-empty.component.ts`
  - `features/user/nutrition-tab/guided-empty/nutrition-guided-empty.component.ts`
  - `features/social/feed/guided-empty/social-feed-guided-empty.component.ts`
- **Modified facades:**
  - `WorkoutsTabFacade` — `cloneSystemTemplate()`, template/loading signals
  - `SocialFacade` — `loadSuggestedUsers()`, `suggestedUsers` signal, `myFollowingCount` signal
  - `NutritionTabFacade` — `_error` signal for error state propagation
- **New API method:** `social.service.ts → getSuggestedUsers(limit)`
- **Trigger conditions:**
  - Workouts: `workoutTemplates().every(t => t.isSystemTemplate)`
  - Nutrition: `meals.length === 0`
  - Social: `feed.length === 0 && myFollowingCount() === 0 && !isLoadingMyProfile()`

---

## Consequences & Trade-offs

**Gains:**
- New users see actionable content on first visit across all three modules
- System templates are zero-maintenance (seeded once, served as fallback)
- Suggested users create immediate social graph momentum
- Privacy boundary is explicitly documented and enforced at the DTO level

**Accepted:**
- `WorkoutTemplate.UserId` becoming nullable adds a null-check concern for existing queries
- System template seeder runs on every startup (idempotent but still executes a query)
- Suggested users algorithm is simple (goal match + workout count) — no collaborative filtering
