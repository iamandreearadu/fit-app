# ADR: Fix 4 — Onboarding Aha Moment Restructure

**Author:** @tech-architect  
**Date:** 2026-06-02  
**Status:** DRAFT  
**Sprint:** 3  
**Related:** `.claude/contracts/fix-4-onboarding.md`, `.claude/plans/ux-audit-implementation-plan.md` (Fix 4)

---

## Context

### The Problem

The current onboarding collects 7+ fields (height, weight, age, gender, goal, activity
level, dietary preference) on the user-profile page **after** registration. But the
registration itself only asks for email, password, and full name — then drops the user
onto a blank Dashboard with no profile data, no metrics, and no value demonstration.

The first genuine aha moment — personalized TDEE, BMR, BMI, goal calories — is buried
behind a profile form that most users never complete on day 1. Research shows 60–70%
abandonment on progressive forms longer than 4 steps with no perceived payoff.

### Current Flow (broken)

```
Register (email + password + name)
  → Auto-login → Dashboard (blank, no metrics)
  → User must discover user-profile page → Fill biometrics → See metrics (maybe)
```

There is no value demonstration between registration and the first screen. The user sees
an empty dashboard with zero personalization. The `OnboardingCompleted` flag exists on the
User entity but is only toggled manually via `PUT /api/users/me`.

### Desired Flow (Fix 4)

```
Value Carousel (2 screens, pre-registration — frontend-only, no backend)
  → Register (email + password + fullName + primaryGoal)
  → Auto-login → Onboarding Guard intercepts → /onboarding/biometrics
  → Biometrics Form (height, weight, age, gender, activityLevel, dietaryPreference)
  → POST /api/onboarding/biometrics → metrics calculated server-side
  → "Your Numbers" Reveal (TDEE, BMR, BMI, goalCalories) ← THE AHA MOMENT
  → First Action CTA ("Log your first workout" or "Analyze your first meal")
  → Dashboard (now personalized)
```

---

## Decision

### 1. Extend registration to accept `primaryGoal`

Add an optional `Goal` field to the existing `RegisterRequest`. This is a **backward-
compatible** change — the field is optional with a default of `"maintain"`. Existing
clients that don't send it continue to work.

**Why not a separate endpoint:** The implementation plan says "collect email + password +
primary goal at registration." A single registration call is simpler than register-then-
immediately-PATCH. The `AuthService.RegisterAsync` method already creates the `User`
entity — adding one more field assignment is trivial.

### 2. New `POST /api/onboarding/biometrics` endpoint

A dedicated endpoint that:
- Accepts height, weight, age, gender, activityLevel, dietaryPreference
- Validates all fields are present (this is the biometrics **completion** step, not a patch)
- Calls `MetricsService.CalculateAndApply()` to compute BMI/BMR/TDEE/GoalCalories
- Marks onboarding step `biometrics_complete`
- Returns the computed `YourNumbersResponse` immediately — no second API call needed

**Why not reuse `PUT /api/users/me`:** The profile update endpoint is a PATCH-style
operation where every field is optional. The biometrics step requires all fields to be
present for metrics calculation. A dedicated endpoint enforces completeness, returns the
computed metrics in the response (enabling the "Your Numbers" reveal without a second
call), and tracks the onboarding step atomically.

### 3. New `OnboardingStep` entity + tracking endpoints

A lightweight entity tracking which onboarding steps the user has completed. This enables:
- **Resume on interrupted onboarding** — if the user closes the app mid-onboarding, the
  frontend can call `GET /api/onboarding/status` on next login to determine where to
  redirect them
- **Analytics** — knowing where users drop off in the funnel

Steps tracked:
| Step name | Set when | Description |
|---|---|---|
| `carousel_seen` | Frontend calls POST after carousel | User saw the value prop |
| `biometrics_complete` | POST /api/onboarding/biometrics succeeds | All biometric data collected + metrics computed |
| `first_action_taken` | Frontend calls POST after first workout/meal | User completed the guided first action |

After `first_action_taken` is recorded, `User.OnboardingCompleted` is set to `true`.

### 4. New `GET /api/users/me/numbers` endpoint

Returns the "Your Numbers" reveal data. This is a **private** endpoint — Bearer JWT only,
returns data exclusively for the authenticated user. This data MUST NEVER appear in any
social endpoint, feed response, or public profile.

**Why a dedicated endpoint instead of reading from `GET /api/users/me`:** The profile
endpoint returns `UserProfileDto` which includes metrics nested inside an optional
`UserMetricsDto` object. The "Your Numbers" reveal needs a purpose-built response with
display-friendly fields (e.g., `dailyCalorieTarget` as a distinct concept from raw
`GoalCalories`, BMI category as a string). It also provides a clean contract for the
frontend reveal component without parsing the full profile DTO.

---

## Clean Architecture Boundaries

- **Controller responsibility:** HTTP binding only — extract userId from JWT, delegate to
  service, return appropriate status code. The new `OnboardingController` handles all
  onboarding routes.
- **Service responsibility:** All business logic — `OnboardingService` validates biometrics,
  delegates to `MetricsService` for calculations, persists onboarding steps, determines
  next step. Reuses existing `MetricsService` — does NOT duplicate calculation logic.
- **What stays out of controllers:** No biometrics validation, no metrics calculation, no
  step determination logic.
- **What stays out of components:** No HTTP calls, no metrics computation — components call
  facade methods. The "Your Numbers" reveal component receives data via input binding from
  the facade, never fetches directly.

---

## Data Model

### New EF Entity: `OnboardingStep`

```csharp
namespace FitApp.Api.Models.Entities;

/// <summary>
/// Tracks completion of individual onboarding steps for a user.
/// Enables resume-on-return (GET /api/onboarding/status) and funnel analytics.
/// </summary>
public class OnboardingStep
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// Step identifier: "carousel_seen" | "biometrics_complete" | "first_action_taken"
    /// </summary>
    public string StepName { get; set; } = string.Empty;

    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}
```

**Entity configuration (AppDbContext):**
```csharp
modelBuilder.Entity<OnboardingStep>(e =>
{
    e.HasKey(o => o.Id);
    e.HasIndex(o => new { o.UserId, o.StepName }).IsUnique();
    e.HasOne(o => o.User)
        .WithMany()
        .HasForeignKey(o => o.UserId)
        .OnDelete(DeleteBehavior.Cascade);
});
```

**User entity change:** Add navigation collection (optional, for cascade):
```csharp
// In User.cs — add to navigation section:
public ICollection<OnboardingStep> OnboardingSteps { get; set; } = [];
```

### Modified DTO: `RegisterRequest`

```csharp
public class RegisterRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(6)]
    public string Password { get; set; } = string.Empty;

    [Required, MinLength(2)]
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Primary fitness goal: "lose" | "gain" | "maintain".
    /// Optional for backward compatibility — defaults to "maintain" if omitted.
    /// </summary>
    [RegularExpression("^(lose|gain|maintain)$", ErrorMessage = "Goal must be 'lose', 'gain', or 'maintain'.")]
    public string? Goal { get; set; }
}
```

### New DTOs (FitApp.Api/Models/DTOs/OnboardingDtos.cs)

```csharp
using System.ComponentModel.DataAnnotations;

namespace FitApp.Api.Models.DTOs;

/// <summary>
/// Request for POST /api/onboarding/biometrics.
/// All fields required — this is the completion step, not a partial patch.
/// </summary>
public class BiometricsRequest
{
    [Required, Range(100, 250)]
    public double HeightCm { get; set; }

    [Required, Range(30, 300)]
    public double WeightKg { get; set; }

    [Required, Range(13, 120)]
    public int Age { get; set; }

    [Required, RegularExpression("^(male|female|other)$")]
    public string Gender { get; set; } = string.Empty;

    [Required, RegularExpression("^(sedentary|light|moderate|active|athlete)$")]
    public string ActivityLevel { get; set; } = string.Empty;

    [RegularExpression("^(no-restriction|vegetarian|vegan|high-protein)$")]
    public string? DietaryPreference { get; set; }
}

/// <summary>
/// Response for POST /api/onboarding/biometrics.
/// Returns computed metrics immediately so the "Your Numbers" reveal screen
/// can render without a second API call.
/// PRIVACY: Bearer-only, NEVER in social or public endpoints.
/// </summary>
public class YourNumbersResponse
{
    public double Bmi { get; set; }
    public string BmiCategory { get; set; } = string.Empty;
    public double Bmr { get; set; }
    public double Tdee { get; set; }
    public double GoalCalories { get; set; }
    public double DailyCalorieTarget { get; set; }
    public double WaterLiters { get; set; }
    public string Goal { get; set; } = string.Empty;
}

/// <summary>
/// Request for POST /api/onboarding/step.
/// </summary>
public class RecordStepRequest
{
    [Required, RegularExpression("^(carousel_seen|biometrics_complete|first_action_taken)$")]
    public string StepName { get; set; } = string.Empty;
}

/// <summary>
/// Response for GET /api/onboarding/status.
/// Used by OnboardingGuard to determine where to redirect on app entry.
/// </summary>
public class OnboardingStatusResponse
{
    public bool IsComplete { get; set; }
    public string? LastCompletedStep { get; set; }
    public string? NextStep { get; set; }
}
```

### TypeScript Interfaces (fit-app/src/app/core/models/onboarding.model.ts)

```typescript
export interface BiometricsRequest {
  heightCm: number;
  weightKg: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
  dietaryPreference?: 'no-restriction' | 'vegetarian' | 'vegan' | 'high-protein';
}

export interface YourNumbersResponse {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  goalCalories: number;
  dailyCalorieTarget: number;
  waterLiters: number;
  goal: string;
}

export interface RecordStepRequest {
  stepName: 'carousel_seen' | 'biometrics_complete' | 'first_action_taken';
}

export interface OnboardingStatusResponse {
  isComplete: boolean;
  lastCompletedStep: string | null;
  nextStep: string | null;
}
```

---

## API Contract

| Method | Route | Auth | Request Body | Response | Status |
|--------|-------|------|-------------|----------|--------|
| POST | `/api/auth/register` | Public | `RegisterRequest` (+ optional Goal) | `AuthResponse` | 200 OK |
| POST | `/api/onboarding/biometrics` | Bearer | `BiometricsRequest` | `YourNumbersResponse` | 200 OK |
| POST | `/api/onboarding/step` | Bearer | `RecordStepRequest` | 204 No Content | 204 |
| GET | `/api/onboarding/status` | Bearer | — | `OnboardingStatusResponse` | 200 OK |
| GET | `/api/users/me/numbers` | Bearer | — | `YourNumbersResponse` | 200 OK |

### POST /api/auth/register (modified)

**Change:** Add optional `Goal` field to `RegisterRequest`.

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `email` | string | Yes | — | Valid email, unique |
| `password` | string | Yes | — | MinLength(6) |
| `fullName` | string | Yes | — | MinLength(2) |
| `goal` | string? | No | `"maintain"` | `"lose"` \| `"gain"` \| `"maintain"` |

**Backward compatibility:** Existing clients that don't send `goal` get `"maintain"` as
default. The `AuthResponse` shape is unchanged.

**Implementation:** In `AuthService.RegisterAsync`, add:
```csharp
Goal = req.Goal ?? "maintain"
```
to the `User` entity creation block.

### POST /api/onboarding/biometrics

Called after first login when the user completes the biometrics form.

**Request body — `BiometricsRequest`:**
```json
{
  "heightCm": 175,
  "weightKg": 72.5,
  "age": 28,
  "gender": "male",
  "activityLevel": "moderate",
  "dietaryPreference": "high-protein"
}
```

**Server-side behavior:**
1. Load User entity by JWT userId
2. Set `HeightCm`, `WeightKg`, `Age`, `Gender`, `Activity`, `DietaryPreference` on User
3. Call `MetricsService.CalculateAndApply(user)` — computes BMI, BMR, TDEE, GoalCalories, WaterL
4. Record `biometrics_complete` onboarding step (idempotent — upsert if already exists)
5. Save changes
6. Return `YourNumbersResponse` built from the freshly-computed metrics

**Response — 200 OK — `YourNumbersResponse`:**
```json
{
  "bmi": 23.7,
  "bmiCategory": "Normal weight",
  "bmr": 1724,
  "tdee": 2672,
  "goalCalories": 2172,
  "dailyCalorieTarget": 2172,
  "waterLiters": 2.4,
  "goal": "lose"
}
```

`dailyCalorieTarget` equals `goalCalories` — they are the same value presented under a
user-friendly name for the reveal screen. This avoids the frontend needing to understand
the distinction.

**Error responses:**

| Status | Condition |
|--------|-----------|
| 400 | Validation failure (missing/out-of-range fields) |
| 401 | Missing/invalid JWT |

### POST /api/onboarding/step

Records a completed onboarding step. Idempotent — calling twice with the same step is a
no-op (204 both times).

**Request body — `RecordStepRequest`:**
```json
{
  "stepName": "carousel_seen"
}
```

**Server-side behavior:**
1. Check if step already exists for this user (by `UserId + StepName` unique index)
2. If exists → return 204 (idempotent)
3. If not → insert `OnboardingStep` row
4. If `stepName == "first_action_taken"` → also set `User.OnboardingCompleted = true`
5. Save changes
6. Return 204 No Content

**Valid step names (enforced via regex validation):**
- `carousel_seen`
- `biometrics_complete`
- `first_action_taken`

**Error responses:**

| Status | Condition |
|--------|-----------|
| 400 | Invalid step name |
| 401 | Missing/invalid JWT |

### GET /api/onboarding/status

Returns the user's onboarding progress. Called by the frontend `OnboardingGuard` on every
authenticated route activation to decide whether to redirect to onboarding.

**Response — 200 OK — `OnboardingStatusResponse`:**
```json
{
  "isComplete": false,
  "lastCompletedStep": "carousel_seen",
  "nextStep": "biometrics"
}
```

**Step progression logic:**

| Completed steps | `isComplete` | `lastCompletedStep` | `nextStep` |
|---|---|---|---|
| None | false | null | `"carousel"` |
| `carousel_seen` | false | `"carousel_seen"` | `"biometrics"` |
| `biometrics_complete` | false | `"biometrics_complete"` | `"first_action"` |
| `first_action_taken` | true | `"first_action_taken"` | null |

**Also returns `isComplete: true` if `User.OnboardingCompleted == true`** — this handles
existing users who completed onboarding before Fix 4 was deployed (they have no
`OnboardingStep` rows but their `OnboardingCompleted` flag is already true).

**Error responses:**

| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid JWT |

### GET /api/users/me/numbers

Returns the "Your Numbers" reveal data for the authenticated user. Can be called at any
time after biometrics are complete — not just during onboarding.

**Response — 200 OK — `YourNumbersResponse`:**
```json
{
  "bmi": 23.7,
  "bmiCategory": "Normal weight",
  "bmr": 1724,
  "tdee": 2672,
  "goalCalories": 2172,
  "dailyCalorieTarget": 2172,
  "waterLiters": 2.4,
  "goal": "lose"
}
```

Returns 200 with zero/null-safe defaults if metrics haven't been computed yet (user
hasn't completed biometrics). All values default to 0 / empty string.

**PRIVACY CONSTRAINT:** This endpoint returns private health data. It MUST:
- Require Bearer JWT authentication
- Return data ONLY for the authenticated user (userId from JWT, never from route param)
- NEVER be called from any social service, feed endpoint, or public profile endpoint

**Error responses:**

| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid JWT |

---

## Frontend Architecture

### New files:

**Model:** `core/models/onboarding.model.ts` — interfaces listed above

**API service:** `api/onboarding.service.ts`
- `submitBiometrics(req: BiometricsRequest): Observable<YourNumbersResponse>`
- `recordStep(req: RecordStepRequest): Observable<void>`
- `getStatus(): Observable<OnboardingStatusResponse>`
- `getYourNumbers(): Observable<YourNumbersResponse>`

**Facade:** `core/facade/onboarding.facade.ts`
- `readonly yourNumbers = signal<YourNumbersResponse | null>(null)`
- `readonly onboardingStatus = signal<OnboardingStatusResponse | null>(null)`
- `async submitBiometrics(req: BiometricsRequest): Promise<YourNumbersResponse | null>`
- `async recordStep(stepName: RecordStepRequest['stepName']): Promise<void>`
- `async loadStatus(): Promise<OnboardingStatusResponse | null>`
- `async loadYourNumbers(): Promise<void>`

**Guard:** `core/guards/onboarding.guard.ts`
- Checks `onboardingFacade.onboardingStatus()` or calls `loadStatus()`
- If `isComplete === false` → redirect to `/onboarding/{nextStep}`
- If `isComplete === true` → allow navigation

### New components (lazy-loaded under `/onboarding`):

| Component | Path | Description |
|---|---|---|
| `OnboardingCarouselComponent` | `/onboarding/carousel` | 2-screen value prop carousel (frontend-only, no API call) |
| `OnboardingBiometricsComponent` | `/onboarding/biometrics` | Biometrics form → POST /api/onboarding/biometrics |
| `YourNumbersRevealComponent` | `/onboarding/your-numbers` | Full-screen metrics reveal with animation |
| `OnboardingFirstActionComponent` | `/onboarding/first-action` | CTA: "Log first workout" or "Analyze first meal" |

### Modified files:

**`RegisterRequest` model (auth-credentials or new):** Add optional `goal` field  
**`RegisterComponent`:** Add goal selector (3 buttons: Lose / Maintain / Gain)  
**`AccountFacade.register()`:** Pass goal in registration payload  
**`AccountService.register()`:** Include goal in POST body  
**`AuthGuard`:** Integrate with OnboardingGuard — after auth check, check onboarding status  
**`app.routes.ts`:** Add `/onboarding` parent route with children

### Route structure:

```typescript
{
  path: 'onboarding',
  canActivate: [AuthGuard],
  children: [
    { path: 'carousel', loadComponent: () => import(...OnboardingCarouselComponent) },
    { path: 'biometrics', loadComponent: () => import(...OnboardingBiometricsComponent) },
    { path: 'your-numbers', loadComponent: () => import(...YourNumbersRevealComponent) },
    { path: 'first-action', loadComponent: () => import(...OnboardingFirstActionComponent) },
    { path: '', redirectTo: 'carousel', pathMatch: 'full' },
  ],
}
```

### Navigation flow (frontend logic):

1. **After register:** `AccountFacade.register()` succeeds → navigate to `/onboarding/carousel`
   (not `/user-dashboard`)
2. **After login (returning user with incomplete onboarding):** `AuthGuard` or app init
   calls `GET /api/onboarding/status`. If `isComplete === false`, redirect to
   `/onboarding/{nextStep}` based on `nextStep` value.
3. **Carousel done:** Record `carousel_seen` step → navigate to `/onboarding/biometrics`
4. **Biometrics submitted:** POST returns `YourNumbersResponse` → store in facade signal →
   navigate to `/onboarding/your-numbers`
5. **Your Numbers seen:** Navigate to `/onboarding/first-action`
6. **First action taken:** Record `first_action_taken` step → navigate to `/user-dashboard`

---

## Instructions for @dotnet-developer

### New files to create:
1. **`Models/Entities/OnboardingStep.cs`** — new entity (see Data Model section)
2. **`Models/DTOs/OnboardingDtos.cs`** — `BiometricsRequest`, `YourNumbersResponse`,
   `RecordStepRequest`, `OnboardingStatusResponse`
3. **`Services/OnboardingService.cs`** — new service with methods:
   - `Task<YourNumbersResponse> SubmitBiometricsAsync(string userId, BiometricsRequest req)`
   - `Task RecordStepAsync(string userId, RecordStepRequest req)`
   - `Task<OnboardingStatusResponse> GetStatusAsync(string userId)`
   - `Task<YourNumbersResponse> GetYourNumbersAsync(string userId)`
4. **`Controllers/OnboardingController.cs`** — new controller, `[Authorize]`, route
   `api/onboarding` with 3 actions (biometrics, step, status)

### Existing files to modify:
5. **`Models/DTOs/AuthDtos.cs`** — Add optional `Goal` field to `RegisterRequest`
6. **`Models/Entities/User.cs`** — Add `OnboardingSteps` navigation collection
7. **`Services/AuthService.cs`** — Set `Goal = req.Goal ?? "maintain"` in `RegisterAsync`
8. **`Data/AppDbContext.cs`** — Add `DbSet<OnboardingStep>`, entity configuration with
   unique index on `(UserId, StepName)`, cascade delete
9. **`Controllers/UsersController.cs`** — Add `GET me/numbers` action
10. **`Program.cs`** — Register `builder.Services.AddScoped<OnboardingService>()`

### Migration:
11. **Run:** `dotnet ef migrations add AddOnboardingSteps` — adds `OnboardingSteps` table

### Implementation notes:
- `OnboardingService` must inject `MetricsService` and call `CalculateAndApply(user)` — do
  NOT duplicate the Mifflin-St Jeor formula or activity multiplier logic
- `SubmitBiometricsAsync` must also call `RecordStepAsync` internally for
  `biometrics_complete` — the frontend should NOT need to make two calls
- `RecordStepAsync` must be idempotent — check for existing step by unique index before insert
- When `first_action_taken` is recorded, set `User.OnboardingCompleted = true` and save
- `GetStatusAsync` must check `User.OnboardingCompleted` first — if already `true`, return
  `{ isComplete: true, lastCompletedStep: "first_action_taken", nextStep: null }` even if
  no `OnboardingStep` rows exist (backward compat with pre-Fix-4 users)

### PRIVACY CHECKLIST:
- [ ] `YourNumbersResponse` is returned ONLY by Bearer-protected endpoints
- [ ] `GET /api/users/me/numbers` extracts userId from JWT — never from route param
- [ ] BMI, BMR, TDEE, GoalCalories are NEVER added to any social DTO or feed response
- [ ] `OnboardingService` does NOT expose any health metric via SignalR or notification

---

## Instructions for @angular-developer

### New files to create:
1. **`core/models/onboarding.model.ts`** — TypeScript interfaces (see Data Model section)
2. **`api/onboarding.service.ts`** — HTTP calls for all 4 endpoints
3. **`core/facade/onboarding.facade.ts`** — business logic + signals
4. **`core/guards/onboarding.guard.ts`** — route guard checking onboarding status
5. **`features/onboarding/carousel/onboarding-carousel.component.ts`** — value prop
   carousel (2 screens, swipeable, no API call)
6. **`features/onboarding/biometrics/onboarding-biometrics.component.ts`** — biometrics
   form with validation
7. **`features/onboarding/your-numbers/your-numbers-reveal.component.ts`** — animated
   reveal of TDEE/BMR/BMI/goalCalories
8. **`features/onboarding/first-action/onboarding-first-action.component.ts`** — CTA
   screen linking to Fix 7 pre-built templates or AI meal analyzer

### Existing files to modify:
9. **`core/models/auth-credentials.model.ts`** — Add optional `goal` field to
   `AuthCredentials` (or create a `RegisterCredentials` type extending it)
10. **`api/account.service.ts`** — Include `goal` in register POST body
11. **`core/facade/account.facade.ts`** — Pass goal in `register()`, change post-register
    redirect from `/user-dashboard` to `/onboarding/carousel`
12. **`features/auth/register/register.component.ts`** — Add goal selector (3 buttons)
    to the registration form
13. **`app.routes.ts`** — Add `/onboarding` route with children (see route structure above)
14. **`core/guards/auth.guard.ts`** — After confirming auth, check onboarding status and
    redirect to `/onboarding/{nextStep}` if incomplete

### Key integration points:
- `YourNumbersRevealComponent` reads `onboardingFacade.yourNumbers()` signal — data is
  set by `submitBiometrics()` which returns `YourNumbersResponse` directly
- `OnboardingFirstActionComponent` links to Fix 7 pre-built workout templates
  (`/workout-session/:templateId` with a system template) and AI meal analyzer
- After `first_action_taken` is recorded, redirect to `/user-dashboard` and
  `onboardingFacade` clears its state
- **CRITICAL:** `YourNumbersResponse` data is shown ONLY in the onboarding reveal screen
  and the user's own profile metrics display — NEVER in social components

---

## Instructions for @uiux-designer

Full onboarding flow spec needed (Sprint 3):
- **Value carousel:** 2 screens showing NovaFit value props, swipe/tap navigation, CTA
  to register
- **Biometrics form:** Split into logical groups (body metrics → activity → diet), progress
  indicator, input validation inline
- **Your Numbers reveal:** Full-screen dramatic reveal — animate each metric appearing
  sequentially (BMI → BMR → TDEE → Goal Calories), glassmorphism card treatment, confetti
  or celebration animation optional
- **First action CTA:** Two options side by side — "Log your first workout" (links to
  pre-built template) and "Analyze your first meal" (opens AI analyzer). One-tap to start.
- Follow existing design system: dark #0D0D10, primary #7C4DFF, accent #FF4081, Poppins,
  glassmorphism

---

## Consequences & Trade-offs

### What we gain
- **Aha moment before blank dashboard** — users see personalized metrics (TDEE, BMR, BMI,
  calorie target) immediately after providing biometrics, before they ever see an empty
  list view
- **Resumable onboarding** — step tracking via `OnboardingStep` entity means interrupted
  onboarding resumes where the user left off on next login
- **Funnel analytics** — per-step completion timestamps enable dropout analysis
- **Backward compatible registration** — existing clients that don't send `goal` continue
  to work (defaults to `"maintain"`)
- **Single-call biometrics + metrics** — `POST /api/onboarding/biometrics` returns computed
  metrics immediately, no second API call for the reveal screen

### What we accept
- **New entity + migration** — `OnboardingStep` adds a table. Low risk (no existing data
  to migrate, only new rows for new users). Auto-applied via `db.Database.Migrate()`.
- **Guard complexity** — `OnboardingGuard` adds a check on every authenticated route
  activation. Mitigated by: (a) caching status in a signal after first fetch, (b) short-
  circuiting if `User.OnboardingCompleted` is already true in the user store (no API call
  needed for completed users).
- **Existing users not retroactively onboarded** — users who registered before Fix 4 and
  already set `OnboardingCompleted = true` via the profile page will never see the new
  onboarding flow. This is correct — they already have their metrics. Users who registered
  but never completed onboarding will be caught by the guard on next login and redirected
  to `/onboarding/biometrics` (or earlier steps).
- **`dailyCalorieTarget` = `goalCalories`** — the "Your Numbers" response includes both
  fields with the same value. `dailyCalorieTarget` is a UX-friendly alias. This minor
  redundancy avoids forcing the frontend to understand the domain distinction.

### Privacy constraints (re-stated for @code-reviewer)
- `YourNumbersResponse` (BMI, BMR, TDEE, GoalCalories, WaterL) — PRIVATE user data
- Returned ONLY by Bearer-protected endpoints (`POST /api/onboarding/biometrics`,
  `GET /api/users/me/numbers`)
- NEVER included in any social DTO, feed response, profile response viewed by other users,
  or SignalR push to other users
- `OnboardingStep` data (step names + timestamps) — private to the authenticated user,
  no social exposure
