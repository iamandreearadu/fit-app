# API Contract: Fix 4 — Onboarding Aha Moment Restructure

**Author:** @tech-architect  
**Date:** 2026-06-02  
**Status:** COMPLETE  
**ADR:** `.claude/decisions/fix-4-onboarding.md`  
**Sprint:** 3  
**Dependencies:** Fix 7 (empty states — pre-built templates for first action CTA)

---

## Status History

| Date | Status | Changed by | Note |
|---|---|---|---|
| 2026-06-02 | DRAFT | @tech-architect | ADR + contract created |
| 2026-06-03 | BACKEND_READY | @dotnet-developer | All 5 endpoints implemented; migration applied |
| 2026-06-03 | COMPLETE | @angular-developer | Frontend implemented: model, service, facade, guard, carousel, biometrics, your-numbers, register update, routes |

---

## IMPLEMENTED: 2026-06-03

**Final endpoints:**

| Method | Route | Response DTO | Status Code |
|---|---|---|---|
| POST | `/api/auth/register` | `AuthResponse` (unchanged shape) | 200 OK |
| POST | `/api/onboarding/biometrics` | `YourNumbersResponse` | 200 OK |
| POST | `/api/onboarding/step` | — | 204 No Content |
| GET | `/api/onboarding/status` | `OnboardingStatusResponse` | 200 OK |
| GET | `/api/users/me/numbers` | `YourNumbersResponse` | 200 OK |

**Breaking change on `POST /api/auth/register`:**
None — `Goal` is optional with default `"maintain"`. Existing clients that omit `goal` continue to work unchanged.

**Migration added:** `20260603063819_AddOnboardingSteps`
- Creates `OnboardingSteps` table: `Id` (PK autoincrement), `UserId` (FK → Users, CASCADE), `StepName` (TEXT), `CompletedAt` (TEXT/datetime)
- Unique index: `IX_OnboardingSteps_UserId_StepName`
- No columns changed on existing tables

**Services registered:** `OnboardingService` (scoped) added to `Program.cs`

**New files:**
- `Models/Entities/OnboardingStep.cs`
- `Models/DTOs/OnboardingDtos.cs` — `BiometricsRequest`, `YourNumbersResponse`, `RecordStepRequest`, `OnboardingStatusResponse`
- `Services/OnboardingService.cs`
- `Controllers/OnboardingController.cs`
- `Migrations/20260603063819_AddOnboardingSteps.cs`

**Modified files:**
- `Models/DTOs/AuthDtos.cs` — added optional `Goal` field to `RegisterRequest`
- `Models/Entities/User.cs` — added `ICollection<OnboardingStep> OnboardingSteps` navigation
- `Services/AuthService.cs` — added `Goal = req.Goal ?? "maintain"` to `RegisterAsync`
- `Data/AppDbContext.cs` — added `DbSet<OnboardingStep>` + entity config (unique index, cascade)
- `Controllers/UsersController.cs` — added `GET me/numbers` action; injected `OnboardingService`
- `Program.cs` — registered `OnboardingService`

**Privacy verification (completed):**
- ✅ `YourNumbersResponse` returned only by Bearer-protected endpoints
- ✅ `GET /api/users/me/numbers` extracts userId from JWT — no route param
- ✅ BMI, BMR, TDEE, GoalCalories never added to any social DTO
- ✅ `OnboardingService` has no dependency on `SocialService` or `INotificationService`
- ✅ `GetYourNumbersAsync` is not referenced from `SocialController` or `SocialService`

**Implementation notes:**
- `SubmitBiometricsAsync` records `biometrics_complete` internally (single `SaveChangesAsync`) — frontend makes one call, not two
- `RecordStepAsync` is idempotent — `AnyAsync` check before insert prevents unique-constraint violations
- `GetStatusAsync` fast path: if `User.OnboardingCompleted == true`, returns complete without loading step rows (backward compat for pre-Fix-4 users)
- `BuildLinkedContentPreview` in `SocialService` was NOT touched — it already had its calorie leak fixed in the Fix 2 code review

---

## Overview

Restructures user onboarding into a multi-step guided flow that delivers the "aha moment"
(personalized TDEE, BMR, BMI, calorie target) before the user sees an empty dashboard.

**Four API changes:**
1. Extend `POST /api/auth/register` with optional `goal` field (backward compatible)
2. New `POST /api/onboarding/biometrics` — submits biometric data + returns computed metrics
3. New `POST /api/onboarding/step` — tracks step completion for resume-on-return
4. New `GET /api/onboarding/status` — returns onboarding progress for routing guard
5. New `GET /api/users/me/numbers` — returns "Your Numbers" reveal data (reusable beyond onboarding)

---

## Endpoints

| Method | Route | Auth | Request Body | Response | Status Code |
|--------|-------|------|-------------|----------|-------------|
| POST | `/api/auth/register` | Public | `RegisterRequest` (+ optional `goal`) | `AuthResponse` | 200 OK |
| POST | `/api/onboarding/biometrics` | Bearer | `BiometricsRequest` | `YourNumbersResponse` | 200 OK |
| POST | `/api/onboarding/step` | Bearer | `RecordStepRequest` | — | 204 No Content |
| GET | `/api/onboarding/status` | Bearer | — | `OnboardingStatusResponse` | 200 OK |
| GET | `/api/users/me/numbers` | Bearer | — | `YourNumbersResponse` | 200 OK |

---

## Endpoint 1 — POST /api/auth/register (modified)

### Change

Add optional `Goal` field to `RegisterRequest`. Backward compatible — omitting the field
defaults to `"maintain"`.

### Request Body — `RegisterRequest` (updated)

```json
{
  "email": "user@example.com",
  "password": "securepass123",
  "fullName": "Jane Doe",
  "goal": "lose"
}
```

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `email` | string | Yes | — | `[EmailAddress]` — valid format, unique |
| `password` | string | Yes | — | `[MinLength(6)]` |
| `fullName` | string | Yes | — | `[MinLength(2)]` |
| `goal` | string? | No | `"maintain"` | Regex: `^(lose\|gain\|maintain)$` |

### Response — unchanged

```json
{
  "id": "abc-123",
  "email": "user@example.com",
  "fullName": "Jane Doe",
  "token": "eyJhbG...",
  "isAdmin": false
}
```

### Implementation Detail

In `AuthService.RegisterAsync`, add to the User entity creation:
```csharp
Goal = req.Goal ?? "maintain"
```

No other changes to auth flow. The `AuthResponse` shape is unchanged. The `OnboardingCompleted`
flag remains `false` (default) — the onboarding flow sets it to `true` when the user
completes the final step.

### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Validation failure (invalid email, short password, invalid goal value) |
| 409 | Email already in use |

---

## Endpoint 2 — POST /api/onboarding/biometrics

Submits biometric data, computes all fitness metrics server-side, and returns them for
the "Your Numbers" reveal screen. Also records the `biometrics_complete` onboarding step
atomically.

### Authentication

`Authorization: Bearer <token>` — required.  
UserId extracted from JWT `sub` claim only.

### Request Body — `BiometricsRequest`

```json
{
  "heightCm": 175.0,
  "weightKg": 72.5,
  "age": 28,
  "gender": "male",
  "activityLevel": "moderate",
  "dietaryPreference": "high-protein"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `heightCm` | double | Yes | Range(100, 250) | Height in centimeters |
| `weightKg` | double | Yes | Range(30, 300) | Weight in kilograms |
| `age` | int | Yes | Range(13, 120) | Age in years |
| `gender` | string | Yes | `male` \| `female` \| `other` | Biological sex for BMR formula |
| `activityLevel` | string | Yes | `sedentary` \| `light` \| `moderate` \| `active` \| `athlete` | Activity multiplier for TDEE |
| `dietaryPreference` | string? | No | `no-restriction` \| `vegetarian` \| `vegan` \| `high-protein` | Dietary preference |

### Server-Side Behavior

1. Load `User` entity by JWT userId
2. Set biometric fields on user: `HeightCm`, `WeightKg`, `Age`, `Gender`, `Activity = req.ActivityLevel`, `DietaryPreference`
3. Call `MetricsService.CalculateAndApply(user)` — computes:
   - **BMI** = weight / (height_m²), rounded to 1 decimal
   - **BMI Category** = Underweight / Normal weight / Overweight / Obese
   - **BMR** = Mifflin-St Jeor formula (gender-specific)
   - **TDEE** = BMR × activity multiplier
   - **GoalCalories** = TDEE ± 500 based on goal (lose = -500, gain = +500, maintain = TDEE)
   - **WaterL** = weight × 0.033
4. Record `biometrics_complete` onboarding step (idempotent upsert)
5. `await db.SaveChangesAsync()`
6. Build and return `YourNumbersResponse`

### Response — 200 OK — `YourNumbersResponse`

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

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `bmi` | double | `User.Bmi` | Body Mass Index |
| `bmiCategory` | string | `User.BmiCat` | `"Underweight"` \| `"Normal weight"` \| `"Overweight"` \| `"Obese"` |
| `bmr` | double | `User.Bmr` | Basal Metabolic Rate (kcal/day) |
| `tdee` | double | `User.Tdee` | Total Daily Energy Expenditure (kcal/day) |
| `goalCalories` | double | `User.GoalCalories` | Adjusted calories for goal |
| `dailyCalorieTarget` | double | `User.GoalCalories` | Same as goalCalories — UX-friendly alias |
| `waterLiters` | double | `User.WaterL` | Recommended daily water intake |
| `goal` | string | `User.Goal` | `"lose"` \| `"gain"` \| `"maintain"` |

**PRIVACY:** This response is PRIVATE to the authenticated user. It MUST NEVER appear in
social endpoints, feed responses, or any public-facing API.

### Error Responses

| Status | Condition | Detail |
|--------|-----------|--------|
| 400 | Validation failure | Missing required field, out-of-range value, invalid enum |
| 401 | Missing/invalid JWT | (framework default) |

### Idempotency

Calling this endpoint multiple times is safe — it overwrites previous biometric values and
recomputes metrics. The `biometrics_complete` step is upserted (not duplicated).

---

## Endpoint 3 — POST /api/onboarding/step

Records a completed onboarding step. Idempotent — calling with the same step name twice
returns 204 both times without creating a duplicate.

### Authentication

`Authorization: Bearer <token>` — required.

### Request Body — `RecordStepRequest`

```json
{
  "stepName": "carousel_seen"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `stepName` | string | Yes | Regex: `^(carousel_seen\|biometrics_complete\|first_action_taken)$` | Onboarding step identifier |

### Server-Side Behavior

1. Check if `OnboardingStep` exists for `(UserId, StepName)` — if yes, return 204
2. Insert new `OnboardingStep { UserId, StepName, CompletedAt = UtcNow }`
3. **Special case:** If `stepName == "first_action_taken"`:
   - Load User entity
   - Set `User.OnboardingCompleted = true`
   - Save both the step and the user flag in one transaction
4. Return 204 No Content

### Response — 204 No Content

No response body.

### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Invalid step name (fails regex validation) |
| 401 | Missing/invalid JWT |

---

## Endpoint 4 — GET /api/onboarding/status

Returns the user's onboarding progress. Used by the frontend `OnboardingGuard` to decide
routing on app entry.

### Authentication

`Authorization: Bearer <token>` — required.

### Request

No request body. No query parameters.

### Server-Side Behavior

1. **Fast path:** If `User.OnboardingCompleted == true`, return `{ isComplete: true, lastCompletedStep: "first_action_taken", nextStep: null }` — this handles pre-Fix-4 users with no `OnboardingStep` rows
2. Load all `OnboardingStep` rows for this user
3. Determine `lastCompletedStep` and `nextStep` per progression table:

| Completed steps | `isComplete` | `lastCompletedStep` | `nextStep` |
|---|---|---|---|
| None | `false` | `null` | `"carousel"` |
| `carousel_seen` | `false` | `"carousel_seen"` | `"biometrics"` |
| `biometrics_complete` | `false` | `"biometrics_complete"` | `"first_action"` |
| `first_action_taken` | `true` | `"first_action_taken"` | `null` |

Step ordering is fixed (not based on timestamps): `carousel_seen` → `biometrics_complete`
→ `first_action_taken`. The highest completed step determines the last, and the next is
the first uncompleted step in order.

### Response — 200 OK — `OnboardingStatusResponse`

```json
{
  "isComplete": false,
  "lastCompletedStep": "carousel_seen",
  "nextStep": "biometrics"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `isComplete` | bool | `true` when all steps are done OR `User.OnboardingCompleted == true` |
| `lastCompletedStep` | string? | Last completed step name, or `null` if no steps done |
| `nextStep` | string? | Next step the user should navigate to, or `null` if complete |

### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid JWT |

---

## Endpoint 5 — GET /api/users/me/numbers

Returns the "Your Numbers" reveal data. Reusable beyond onboarding — the user profile or
settings page can also show this data.

### Authentication

`Authorization: Bearer <token>` — required.  
UserId from JWT only — no route parameter.

### Request

No request body. No query parameters.

### Server-Side Behavior

1. Load User entity by JWT userId
2. Build `YourNumbersResponse` from User metrics fields
3. If metrics haven't been computed yet (BMI is null), return all-zeros response

### Response — 200 OK — `YourNumbersResponse`

Same shape as POST /api/onboarding/biometrics response (see Endpoint 2).

If no metrics exist:
```json
{
  "bmi": 0,
  "bmiCategory": "",
  "bmr": 0,
  "tdee": 0,
  "goalCalories": 0,
  "dailyCalorieTarget": 0,
  "waterLiters": 0,
  "goal": ""
}
```

### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid JWT |

### PRIVACY CONSTRAINT

This is a **private health data endpoint**. It MUST:
- Require Bearer JWT
- Return data for the authenticated user ONLY
- NEVER be referenced from `SocialService`, `SocialController`, or any feed/profile endpoint
- **@code-reviewer** must verify no social component imports or calls this endpoint

---

## Request DTOs

```csharp
using System.ComponentModel.DataAnnotations;

namespace FitApp.Api.Models.DTOs;

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

public class RecordStepRequest
{
    [Required]
    [RegularExpression("^(carousel_seen|biometrics_complete|first_action_taken)$",
        ErrorMessage = "Invalid step name.")]
    public string StepName { get; set; } = string.Empty;
}
```

---

## Response DTOs

```csharp
namespace FitApp.Api.Models.DTOs;

/// <summary>
/// Computed fitness metrics for the "Your Numbers" reveal screen.
/// Returned by POST /api/onboarding/biometrics and GET /api/users/me/numbers.
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
/// Onboarding progress for route guard decision-making.
/// </summary>
public class OnboardingStatusResponse
{
    public bool IsComplete { get; set; }
    public string? LastCompletedStep { get; set; }
    public string? NextStep { get; set; }
}
```

---

## Modified DTO

```csharp
// AuthDtos.cs — RegisterRequest (updated)
public class RegisterRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(6)]
    public string Password { get; set; } = string.Empty;

    [Required, MinLength(2)]
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Primary fitness goal. Optional for backward compatibility.
    /// </summary>
    [RegularExpression("^(lose|gain|maintain)$",
        ErrorMessage = "Goal must be 'lose', 'gain', or 'maintain'.")]
    public string? Goal { get; set; }
}
```

---

## New Entity

```csharp
namespace FitApp.Api.Models.Entities;

public class OnboardingStep
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string StepName { get; set; } = string.Empty;
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
```

**AppDbContext configuration:**
```csharp
public DbSet<OnboardingStep> OnboardingSteps => Set<OnboardingStep>();

// In OnModelCreating:
modelBuilder.Entity<OnboardingStep>(e =>
{
    e.HasKey(o => o.Id);
    e.HasIndex(o => new { o.UserId, o.StepName }).IsUnique();
    e.HasOne(o => o.User)
        .WithMany(u => u.OnboardingSteps)
        .HasForeignKey(o => o.UserId)
        .OnDelete(DeleteBehavior.Cascade);
});
```

---

## TypeScript Interfaces (fit-app/src/app/core/models/onboarding.model.ts)

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

## TypeScript API Service (fit-app/src/app/api/onboarding.service.ts)

```typescript
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/onboarding`;
  private readonly usersUrl = `${environment.apiUrl}/api/users`;

  submitBiometrics(req: BiometricsRequest): Observable<YourNumbersResponse> {
    return this.http.post<YourNumbersResponse>(`${this.baseUrl}/biometrics`, req);
  }

  recordStep(req: RecordStepRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/step`, req);
  }

  getStatus(): Observable<OnboardingStatusResponse> {
    return this.http.get<OnboardingStatusResponse>(`${this.baseUrl}/status`);
  }

  getYourNumbers(): Observable<YourNumbersResponse> {
    return this.http.get<YourNumbersResponse>(`${this.usersUrl}/me/numbers`);
  }
}
```

---

## TypeScript Facade (fit-app/src/app/core/facade/onboarding.facade.ts)

```typescript
@Injectable({ providedIn: 'root' })
export class OnboardingFacade {
  private svc = inject(OnboardingService);
  private alerts = inject(AlertService);

  readonly yourNumbers = signal<YourNumbersResponse | null>(null);
  readonly onboardingStatus = signal<OnboardingStatusResponse | null>(null);
  readonly loading = signal(false);

  async submitBiometrics(req: BiometricsRequest): Promise<YourNumbersResponse | null> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.svc.submitBiometrics(req));
      this.yourNumbers.set(res);
      return res;
    } catch {
      this.alerts.error('Failed to save biometrics. Please try again.');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async recordStep(stepName: RecordStepRequest['stepName']): Promise<void> {
    try {
      await firstValueFrom(this.svc.recordStep({ stepName }));
    } catch {
      // Non-critical — step tracking failure should not block user flow
      console.warn(`Failed to record onboarding step: ${stepName}`);
    }
  }

  async loadStatus(): Promise<OnboardingStatusResponse | null> {
    try {
      const status = await firstValueFrom(this.svc.getStatus());
      this.onboardingStatus.set(status);
      return status;
    } catch {
      return null;
    }
  }

  async loadYourNumbers(): Promise<void> {
    try {
      const numbers = await firstValueFrom(this.svc.getYourNumbers());
      this.yourNumbers.set(numbers);
    } catch {
      this.alerts.error('Failed to load your metrics.');
    }
  }
}
```

---

## Notes for @dotnet-developer

### Implementation checklist:

- [ ] Create `Models/Entities/OnboardingStep.cs` — entity with `Id`, `UserId`, `StepName`, `CompletedAt`
- [ ] Add `OnboardingSteps` navigation collection to `Models/Entities/User.cs`
- [ ] Create `Models/DTOs/OnboardingDtos.cs` — `BiometricsRequest`, `YourNumbersResponse`, `RecordStepRequest`, `OnboardingStatusResponse`
- [ ] Modify `Models/DTOs/AuthDtos.cs` — add optional `Goal` field to `RegisterRequest` with regex validation
- [ ] Modify `Services/AuthService.cs` — set `Goal = req.Goal ?? "maintain"` in `RegisterAsync`
- [ ] Add `DbSet<OnboardingStep>` and entity configuration to `Data/AppDbContext.cs`
- [ ] Create `Services/OnboardingService.cs` with:
  - `SubmitBiometricsAsync(userId, req)` — sets user fields, calls `MetricsService.CalculateAndApply()`, records `biometrics_complete` step, returns `YourNumbersResponse`
  - `RecordStepAsync(userId, req)` — idempotent step insert; sets `User.OnboardingCompleted = true` on `first_action_taken`
  - `GetStatusAsync(userId)` — checks `User.OnboardingCompleted` first (fast path), then loads steps and determines next
  - `GetYourNumbersAsync(userId)` — builds `YourNumbersResponse` from user metrics (null-safe defaults)
- [ ] Create `Controllers/OnboardingController.cs` — `[Authorize]`, route `api/onboarding`, 3 actions
- [ ] Add `GET me/numbers` action to `Controllers/UsersController.cs` — delegates to `OnboardingService.GetYourNumbersAsync()`
- [ ] Register `builder.Services.AddScoped<OnboardingService>()` in `Program.cs`
- [ ] Run migration: `dotnet ef migrations add AddOnboardingSteps`

### Critical implementation notes:
- **Reuse `MetricsService.CalculateAndApply()`** — do NOT duplicate the Mifflin-St Jeor formula
- **`SubmitBiometricsAsync` must record `biometrics_complete` step internally** — the frontend makes ONE call, not two
- **`RecordStepAsync` must be idempotent** — use `AnyAsync` check before insert, return normally if already exists
- **`GetStatusAsync` backward compat** — if `User.OnboardingCompleted == true` but no step rows exist, return complete status

### PRIVACY CHECKLIST:
- [ ] `YourNumbersResponse` is returned ONLY by Bearer-protected endpoints
- [ ] `GET /api/users/me/numbers` extracts userId from JWT — never from route param
- [ ] `OnboardingService` does NOT expose health metrics via any social-facing method
- [ ] BMI, BMR, TDEE, GoalCalories are NEVER added to any social DTO

---

## Notes for @angular-developer

### Implementation checklist:

- [ ] Create `core/models/onboarding.model.ts` — all TypeScript interfaces
- [ ] Create `api/onboarding.service.ts` — HTTP service for all 4 endpoints
- [ ] Create `core/facade/onboarding.facade.ts` — facade with signals and async methods
- [ ] Create `core/guards/onboarding.guard.ts` — route guard checking onboarding status
- [ ] Create `features/onboarding/carousel/onboarding-carousel.component.ts` — 2-screen value prop
- [ ] Create `features/onboarding/biometrics/onboarding-biometrics.component.ts` — biometrics form
- [ ] Create `features/onboarding/your-numbers/your-numbers-reveal.component.ts` — animated reveal
- [ ] Create `features/onboarding/first-action/onboarding-first-action.component.ts` — CTA screen
- [ ] Add `/onboarding` route with children to `app.routes.ts`
- [ ] Modify `core/models/auth-credentials.model.ts` — add optional `goal` field
- [ ] Modify `api/account.service.ts` — include `goal` in register POST body
- [ ] Modify `core/facade/account.facade.ts` — pass goal, redirect to `/onboarding/carousel` after register
- [ ] Modify `features/auth/register/register.component.ts` — add 3-button goal selector
- [ ] Modify `core/guards/auth.guard.ts` — integrate onboarding status check; redirect incomplete users

### Key integration notes:
- **OnboardingGuard optimization:** On first check, call `GET /api/onboarding/status` and cache in `onboardingFacade.onboardingStatus()`. On subsequent checks, read from signal (no API call). Reset signal on logout.
- **Existing users shortcut:** If `userStore.user().onboardingCompleted === true`, skip the API call entirely — the user completed onboarding before Fix 4.
- **BiometricsComponent → YourNumbersReveal flow:** `submitBiometrics()` returns `YourNumbersResponse` directly. Store in `onboardingFacade.yourNumbers()` signal. `YourNumbersRevealComponent` reads this signal — no second API call.
- **FirstActionComponent → Fix 7 integration:** "Log first workout" links to a pre-built system template from Fix 7. "Analyze first meal" opens the AI meal analyzer. After the user completes either action, call `recordStep('first_action_taken')` then navigate to `/user-dashboard`.
- **CRITICAL:** `YourNumbersResponse` data MUST NOT be passed to any social component or rendered in any social view

---

## Migration Instructions

### For @dotnet-developer:

```bash
cd FitApp.Api
dotnet ef migrations add AddOnboardingSteps
```

The migration will create:
- `OnboardingSteps` table with columns: `Id` (PK), `UserId` (FK → Users), `StepName`, `CompletedAt`
- Unique index on `(UserId, StepName)`
- Cascade delete from Users

Auto-applied on next startup via `db.Database.Migrate()` in `Program.cs`.

### For @db-migration-specialist (review):
- No existing data is affected — table is purely additive
- No column changes on `Users` table (the `Goal` and `OnboardingCompleted` columns already exist)
- Index on `(UserId, StepName)` keeps step lookups O(1) — max 3 rows per user

---

## Implementation Log

```
2026-06-02 - DRAFT created by @tech-architect
```
