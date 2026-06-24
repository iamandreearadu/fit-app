# ADR: Fix 6 — Active Workout Set Logger Redesign

**Status:** APPROVED
**Author:** @tech-architect
**Date:** 2026-05-29
**Sprint:** 2 (Weeks 3–4)
**Source:** `.claude/ux-audits/full-platform-audit.md` §7, `.claude/design-specs/fix-6-workout-set-logger.md`

---

## Context

The current workout feature is a **template editor only** — users can define workout plans
(`WorkoutTemplate` → `WorkoutExercise[]`) but there is no concept of an active session.
When a user actually performs a workout, they have no way to:

1. Log actual reps/weight performed (may differ from template targets)
2. See what they lifted last time ("last time: 80kg × 8")
3. Track a rest timer between sets
4. Get a post-workout summary (streak, calories burned, sets completed)

The UX audit (§7) identifies this as the **highest-friction mobile interaction in NovaFit**:
> "5 exercises × 4 sets = 40+ individual field interactions per workout. Users are sweating
> between sets with time pressure. The accepted patterns NovaFit should steal from Hevy and
> Strong: swipe to complete a set, previous session data auto-populated, quick increment +/-
> buttons, rest timer auto-start."

**What already exists and must NOT be duplicated:**
- `WorkoutTemplate`, `WorkoutExercise`, `CardioDetails` entities and their CRUD
- `WorkoutService` and `WorkoutsController` (`GET/POST/PUT/DELETE /api/workouts`)
- `WorkoutsTabService` / `WorkoutsTabFacade` / `WorkoutsTabComponent` — template editor UI
- `DailyDataService.GetStreakAsync` — reused to populate `StreakDay` in completion summary

---

## Decision

### 1. New entities: `WorkoutSession` and `WorkoutSessionSet`

A **completed session** is a first-class entity, separate from the template that defined it.
This separation is critical because:
- Actual sets/reps/weight often differ from template targets
- Template edits must not corrupt session history
- Session history provides the "last time" data that powers the ghost placeholder UI

`WorkoutSessionSet.ExerciseName` (string) is the **natural key** for cross-session lookups,
not `WorkoutExerciseId`. This survives template edits. Rationale: `WorkoutService.UpdateAsync`
does `db.WorkoutExercises.RemoveRange(workout.Exercises)` then re-adds — EF Core exercise IDs
rotate on every template update. Using the exercise name is the only stable cross-session
identifier.

`WorkoutSession.WorkoutTemplateId` is **nullable** with `DeleteBehavior.SetNull`. Rationale:
`WorkoutsController.Delete` hard-deletes templates. Session history must survive template
deletion — the user's training record is their data, not the template's.

### 2. Session lifecycle: offline-first, single write on finish

All session state (current reps/weight, elapsed timer, rest timer, set states) is managed
**exclusively in the Angular component** during the workout. No "start session" API call is
made mid-workout. A single `POST /api/workouts/sessions` request fires when the user confirms
"Finish Workout". This means:

- Zero network dependency during the workout (gym Wi-Fi is unreliable)
- No partial-session orphan rows in the DB from abandoned sessions
- Simpler failure handling: if the POST fails, the user still has the local state and can retry

### 3. Previous session data: batch load per template, not per exercise

The spec requested `GET /api/workouts/exercises/{exerciseId}/last-session`. This is rejected
for two reasons stated above (ID instability, missing ID in DTO). The replacement:

**`GET /api/workouts/{templateId}/last-session`** — returns one `LastSessionDto` per exercise
in the template in a single call. Triggered when `ActiveWorkoutSessionComponent` mounts.

This is O(1) HTTP calls regardless of exercise count, which matters at gym start-time.

### 4. `WorkoutCompletionSummaryDto` — bridges Fix 6 to Fix 8

The `POST /api/workouts/sessions` response is `WorkoutCompletionSummaryDto`. It includes:
- `StreakDay` — current streak snapshot (read from `DailyDataService.GetStreakAsync`).
  **Completing a workout does NOT auto-create a DailyEntry and does NOT increment the streak.**
  `StreakDay` is informational context in the summary card, not a write operation.
- `EstimatedCaloriesKcal` — proportional from `WorkoutTemplate.CaloriesEstimateKcal ×
  (setsCompleted / totalTemplateSets)`. Synchronous, no AI call. The AI calorie estimator
  (`POST /api/ai/workout-calories`) remains available as a separate on-demand action.
- `SessionId` — allows Fix 8 (post-workout summary card) and Fix 7 (beSocial share prompt)
  to reference the session without re-fetching.

### 5. Route and navigation

`ActiveWorkoutSessionComponent` is a **full-page lazy-loaded route** at
`/workout-session/:templateId`, protected by `AuthGuard`. Both mobile and desktop use
the same route — CSS handles the bottom-sheet appearance on mobile (`< 640px`).

The mobile "bottom sheet feel" is achieved via CSS on the component, not `MatBottomSheet`.
Rationale: `MatBottomSheet` does not participate in Angular routing, making deep-links,
back-button handling, and browser history impossible. A full route is the correct choice.

"Start Workout" CTA will be added to the existing template list row in
`workouts-tab.component.html` — a `[routerLink]` to `/workout-session/:id`.

---

## Clean Architecture Boundaries

- **Controller responsibility:** Extract `UserId` from JWT; validate request body; delegate
  to `WorkoutSessionService`; return DTOs. No session logic in the controller.
- **Service responsibility (`WorkoutSessionService`):** Save `WorkoutSession` +
  `WorkoutSessionSet` rows; query last-session data by exercise name; compute summary
  fields (`DurationMin`, `ExerciseCount`, `EstimatedCaloriesKcal`, `StreakDay`).
- **What stays out of controllers:** Session duration math, calorie proration, streak read,
  exercise-name → last-session mapping.
- **What stays out of components:** HTTP calls (facade), session persistence (service),
  streak computation (existing `DailyDataService`).
- **`WorkoutsTabFacade`** gets two new methods: `getLastSession(templateId)` and
  `completeSession(req)`. No new facade is created — these naturally extend the existing
  workout facade that already manages template state.
- **`WorkoutsTabService`** gets two new HTTP methods: `getLastSession` and `completeSession`.
  Extends the existing service that already knows the `/api/workouts` base URL.

---

## Data Model

### New EF Entity — `WorkoutSession`
**File:** `FitApp.Api/Models/Entities/WorkoutTemplate.cs` (append to bottom of existing file)

```csharp
public class WorkoutSession
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;

    // Nullable: template may be deleted; session history is preserved.
    public int? WorkoutTemplateId { get; set; }
    public string TemplateTitle { get; set; } = string.Empty;   // snapshot at session time

    public DateTime StartedAt { get; set; }
    public DateTime FinishedAt { get; set; }
    public int DurationMin { get; set; }         // computed: (FinishedAt - StartedAt).TotalMinutes
    public int SetsCompleted { get; set; }
    public int EstimatedCaloriesKcal { get; set; }

    public User User { get; set; } = null!;
    public WorkoutTemplate? WorkoutTemplate { get; set; }
    public ICollection<WorkoutSessionSet> Sets { get; set; } = [];
}

public class WorkoutSessionSet
{
    public int Id { get; set; }
    public int WorkoutSessionId { get; set; }
    public string ExerciseName { get; set; } = string.Empty;   // natural key — survives template edits
    public int SetNumber { get; set; }
    public double ActualWeightKg { get; set; }
    public int ActualReps { get; set; }

    public WorkoutSession WorkoutSession { get; set; } = null!;
}
```

**Why `TemplateTitle` is snapshotted:** If the template is deleted, the summary card
(Fix 8) still needs to display the workout name. Snapshotting is the standard pattern
(same as how `DirectMessage.Content` is stored rather than referenced).

### AppDbContext additions
**File:** `FitApp.Api/Data/AppDbContext.cs`

```csharp
// DbSet properties — add to the class:
public DbSet<WorkoutSession> WorkoutSessions => Set<WorkoutSession>();
public DbSet<WorkoutSessionSet> WorkoutSessionSets => Set<WorkoutSessionSet>();

// OnModelCreating — add after the WorkoutTemplate configuration:
modelBuilder.Entity<WorkoutSession>(e =>
{
    e.HasKey(s => s.Id);
    e.HasOne(s => s.User)
        .WithMany()
        .HasForeignKey(s => s.UserId)
        .OnDelete(DeleteBehavior.Cascade);
    e.HasOne(s => s.WorkoutTemplate)
        .WithMany()
        .HasForeignKey(s => s.WorkoutTemplateId)
        .OnDelete(DeleteBehavior.SetNull);              // preserve session when template deleted
    e.HasMany(s => s.Sets)
        .WithOne(ss => ss.WorkoutSession)
        .HasForeignKey(ss => ss.WorkoutSessionId)
        .OnDelete(DeleteBehavior.Cascade);
    e.HasIndex(s => new { s.UserId, s.FinishedAt });   // last-session query perf
});

modelBuilder.Entity<WorkoutSessionSet>(e =>
{
    e.HasKey(ss => ss.Id);
    e.HasIndex(ss => new { ss.WorkoutSessionId, ss.ExerciseName });
});
```

### New DTOs
**File:** `FitApp.Api/Models/DTOs/WorkoutDtos.cs` — append to existing file

```csharp
// ── Session DTOs ─────────────────────────────────────────────────────────────

/// <summary>
/// One entry per exercise in the template's last completed session.
/// ExerciseName is the lookup key; matches WorkoutSessionSet.ExerciseName.
/// </summary>
public record LastSessionDto(
    string ExerciseName,
    double LastWeightKg,
    int LastReps,
    string LastDate   // "yyyy-MM-dd" UTC — displayed as ghost text in set row
);

/// <summary>
/// Per-set data submitted when the user finishes a session.
/// </summary>
public record CompletedSetDto(
    string ExerciseName,
    int SetNumber,
    double ActualWeightKg,
    int ActualReps
);

/// <summary>
/// Request body for POST /api/workouts/sessions.
/// All session state is accumulated client-side; submitted once on finish.
/// </summary>
public class CompleteWorkoutSessionRequest
{
    public int WorkoutTemplateId { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime FinishedAt { get; set; }
    public List<CompletedSetDto> Sets { get; set; } = [];
}

/// <summary>
/// Response for POST /api/workouts/sessions.
/// Consumed by Fix 8 (post-workout summary card) and Fix 7 (beSocial share).
/// EstimatedCaloriesKcal: proportional from template estimate — no AI call.
/// StreakDay: current streak snapshot — workout completion does NOT write DailyEntry.
/// </summary>
public record WorkoutCompletionSummaryDto(
    int SessionId,
    string TemplateTitle,
    int DurationMin,
    int ExerciseCount,         // distinct exercise names in completed sets
    int SetsCompleted,
    int EstimatedCaloriesKcal,
    int StreakDay,             // current streak at finish time (read-only snapshot)
    string CompletedAt        // ISO 8601 UTC
);
```

### TypeScript interfaces
**File:** `fit-app/src/app/core/models/workouts-tab.model.ts` — append to existing file

```typescript
// ── Session models (Fix 6) ────────────────────────────────────────────────────

/** Previous session data per exercise — populates ghost "last time" text in set rows. */
export interface LastExerciseSession {
  exerciseName: string;
  lastWeightKg: number;
  lastReps: number;
  lastDate: string;   // "yyyy-MM-dd"
}

/** Per-set actuals accumulated locally during the session. */
export interface CompletedSet {
  exerciseName: string;
  setNumber: number;
  actualWeightKg: number;
  actualReps: number;
}

/** Request body for POST /api/workouts/sessions. */
export interface CompleteSessionRequest {
  workoutTemplateId: number;
  startedAt: string;   // ISO 8601 — from session start timestamp
  finishedAt: string;  // ISO 8601 — from "Finish Workout" confirm tap
  sets: CompletedSet[];
}

/**
 * Response from POST /api/workouts/sessions.
 * Also the input model for the Fix 8 post-workout summary card.
 */
export interface WorkoutCompletionSummary {
  sessionId: number;
  templateTitle: string;
  durationMin: number;
  exerciseCount: number;
  setsCompleted: number;
  estimatedCaloriesKcal: number;
  streakDay: number;
  completedAt: string;   // ISO 8601
}
```

---

## API Contract

See `.claude/contracts/fix-6-workout-set-logger.md` for full request/response shapes,
error codes, and field-level mapping.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/workouts/{templateId}/last-session` | Bearer | Previous per-exercise values for template |
| POST | `/api/workouts/sessions` | Bearer | Save completed session; returns summary |

**No new SignalR events for Fix 6.** The streak badge already updates in real time via
the existing `streak-updated` push (Fix 5) — that fires when the user logs their daily
entry, not on workout completion.

---

## Frontend Architecture

### Modified files (extend, do not replace)

| File | Change |
|---|---|
| `api/workouts-tab.service.ts` | Add `getLastSession(templateId: number)` and `completeSession(req: CompleteSessionRequest)` methods |
| `core/facade/workouts-tab.facade.ts` | Add `lastSession` signal, `getLastSession(templateId)`, `completeSession(req)` methods |
| `core/models/workouts-tab.model.ts` | Append `LastExerciseSession`, `CompletedSet`, `CompleteSessionRequest`, `WorkoutCompletionSummary` interfaces |
| `features/user/workouts-tab/workouts-tab.component.html` | Add "Start Workout" button to each template row — `[routerLink]="['/workout-session', w.id]"` |
| `app.routes.ts` | Add `/workout-session/:templateId` lazy-loaded route under `AuthGuard` |

### New files

| File | Description |
|---|---|
| `features/workouts/active-session/active-workout-session.component.ts` | Full session shell — elapsed timer, exercise sections, finish FAB, rest timer |
| `shared/components/workout-set-row/workout-set-row.component.ts` | Atomic set row — steppers, swipe gestures, states |

### New signals on `WorkoutsTabFacade`

```typescript
readonly lastSession = signal<LastExerciseSession[]>([]);
readonly completionSummary = signal<WorkoutCompletionSummary | null>(null);
```

`lastSession` is a flat array — keyed by `exerciseName`. The facade transforms it into a
`Map<string, LastExerciseSession>` (computed) for O(1) lookup in set rows.

### Route

```typescript
// Add to app.routes.ts, before the ** catch-all:
{
  path: 'workout-session/:templateId',
  loadComponent: () =>
    import('./features/workouts/active-session/active-workout-session.component')
      .then(m => m.ActiveWorkoutSessionComponent),
  canActivate: [AuthGuard],
},
```

---

## Migration

**Migration name:** `AddWorkoutSession`
**Command:** `dotnet ef migrations add AddWorkoutSession`

Two new tables: `WorkoutSessions`, `WorkoutSessionSets`.
One index on `WorkoutSessions(UserId, FinishedAt)`.
One index on `WorkoutSessionSets(WorkoutSessionId, ExerciseName)`.

`WorkoutTemplateId` on `WorkoutSession` is nullable — migration must reflect this.
The `OnDelete(DeleteBehavior.SetNull)` relationship must be configured before migration.

---

## Instructions for @dotnet-developer

### 1. Entities — `FitApp.Api/Models/Entities/WorkoutTemplate.cs`
Append `WorkoutSession` and `WorkoutSessionSet` class definitions (exact code in Data Model
section above). Do NOT modify any existing class in the file.

### 2. AppDbContext — `FitApp.Api/Data/AppDbContext.cs`
- Add two `DbSet` properties: `WorkoutSessions`, `WorkoutSessionSets`
- Add two entity configurations in `OnModelCreating` (exact code above)

### 3. DTOs — `FitApp.Api/Models/DTOs/WorkoutDtos.cs`
Append `LastSessionDto`, `CompletedSetDto`, `CompleteWorkoutSessionRequest`,
`WorkoutCompletionSummaryDto` records (exact definitions above).

### 4. New service — `FitApp.Api/Services/WorkoutSessionService.cs`

```csharp
public class WorkoutSessionService(AppDbContext db, DailyDataService dailyService)
{
    /// <summary>
    /// Returns the most recent actual weight/reps per exercise name for a given template.
    /// Uses exercise names (not IDs) so results survive template edits.
    /// </summary>
    public async Task<List<LastSessionDto>> GetLastSessionAsync(string userId, int templateId)
    {
        // 1. Load exercise names from template
        var exerciseNames = await db.WorkoutExercises
            .AsNoTracking()
            .Where(e => e.WorkoutTemplateId == templateId)
            .Select(e => e.Name)
            .ToListAsync();

        if (exerciseNames.Count == 0) return [];

        // 2. For each exercise name, find the most recent completed set
        // One query using grouping to avoid N+1
        var lastSets = await db.WorkoutSessionSets
            .AsNoTracking()
            .Where(ss => exerciseNames.Contains(ss.ExerciseName)
                      && ss.WorkoutSession.UserId == userId)
            .Include(ss => ss.WorkoutSession)
            .GroupBy(ss => ss.ExerciseName)
            .Select(g => g.OrderByDescending(ss => ss.WorkoutSession.FinishedAt).First())
            .ToListAsync();

        return lastSets.Select(ss => new LastSessionDto(
            ExerciseName: ss.ExerciseName,
            LastWeightKg: ss.ActualWeightKg,
            LastReps: ss.ActualReps,
            LastDate: ss.WorkoutSession.FinishedAt.ToString("yyyy-MM-dd")
        )).ToList();
    }

    /// <summary>
    /// Saves a completed session and returns the summary for the post-workout card.
    /// EstimatedCaloriesKcal is proportional from the template's estimate.
    /// StreakDay is a read-only snapshot — completing a workout does NOT create a DailyEntry.
    /// </summary>
    public async Task<WorkoutCompletionSummaryDto> CompleteSessionAsync(
        string userId, CompleteWorkoutSessionRequest req)
    {
        // Load template for title + calorie estimate
        var template = await db.WorkoutTemplates
            .AsNoTracking()
            .Include(t => t.Exercises)
            .FirstOrDefaultAsync(t => t.Id == req.WorkoutTemplateId && t.UserId == userId)
            ?? throw new KeyNotFoundException($"WorkoutTemplate {req.WorkoutTemplateId} not found for user.");

        // Compute duration
        var durationMin = (int)Math.Max(1, (req.FinishedAt - req.StartedAt).TotalMinutes);

        // Compute calorie proration: actual / target sets
        var totalTargetSets = template.Exercises.Sum(e => e.Sets);
        var setsCompleted = req.Sets.Count;
        var calorieRatio = totalTargetSets > 0
            ? Math.Clamp((double)setsCompleted / totalTargetSets, 0.0, 1.0)
            : 1.0;
        var estimatedCalories = (int)Math.Round(template.CaloriesEstimateKcal * calorieRatio);

        // Build session entity
        var session = new WorkoutSession
        {
            UserId = userId,
            WorkoutTemplateId = req.WorkoutTemplateId,
            TemplateTitle = template.Title,
            StartedAt = req.StartedAt,
            FinishedAt = req.FinishedAt,
            DurationMin = durationMin,
            SetsCompleted = setsCompleted,
            EstimatedCaloriesKcal = estimatedCalories,
            Sets = req.Sets.Select(s => new WorkoutSessionSet
            {
                ExerciseName = s.ExerciseName,
                SetNumber = s.SetNumber,
                ActualWeightKg = s.ActualWeightKg,
                ActualReps = s.ActualReps
            }).ToList()
        };

        db.WorkoutSessions.Add(session);
        await db.SaveChangesAsync();

        // Read streak (snapshot — no write)
        var streak = await dailyService.GetStreakAsync(userId);

        return new WorkoutCompletionSummaryDto(
            SessionId: session.Id,
            TemplateTitle: session.TemplateTitle,
            DurationMin: durationMin,
            ExerciseCount: req.Sets.Select(s => s.ExerciseName).Distinct().Count(),
            SetsCompleted: setsCompleted,
            EstimatedCaloriesKcal: estimatedCalories,
            StreakDay: streak.Current,
            CompletedAt: session.FinishedAt.ToString("o")
        );
    }
}
```

### 5. New controller — `FitApp.Api/Controllers/WorkoutSessionsController.cs`

```csharp
[ApiController]
[Route("api/workouts")]
[Authorize]
public class WorkoutSessionsController(WorkoutSessionService sessionService) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")!;

    // GET /api/workouts/{templateId}/last-session
    [HttpGet("{templateId:int}/last-session")]
    public async Task<IActionResult> GetLastSession(int templateId)
    {
        var result = await sessionService.GetLastSessionAsync(UserId, templateId);
        return Ok(result);
    }

    // POST /api/workouts/sessions
    [HttpPost("sessions")]
    public async Task<IActionResult> CompleteSession([FromBody] CompleteWorkoutSessionRequest req)
    {
        try
        {
            var summary = await sessionService.CompleteSessionAsync(UserId, req);
            return Created($"api/workouts/sessions/{summary.SessionId}", summary);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ProblemDetails { Detail = ex.Message });
        }
    }
}
```

### 6. Program.cs — register the new service

```csharp
// Add alongside WorkoutService registration:
builder.Services.AddScoped<WorkoutSessionService>();
```

### 7. Migration

Run `dotnet ef migrations add AddWorkoutSession` and verify:
- `WorkoutSessions` table with nullable `WorkoutTemplateId`
- `WorkoutSessionSets` table with cascade FK to `WorkoutSessions`
- Index on `WorkoutSessions(UserId, FinishedAt)`
- No changes to existing `WorkoutTemplates` or `WorkoutExercises` tables

---

## Instructions for @angular-developer

### 1. `core/models/workouts-tab.model.ts`
Append the four new TypeScript interfaces (exact definitions in Data Model section above).

### 2. `api/workouts-tab.service.ts`
Add two methods to the existing `WorkoutsTabService` class:

```typescript
async getLastSession(templateId: number): Promise<LastExerciseSession[]> {
  try {
    return await firstValueFrom(
      this.http.get<LastExerciseSession[]>(`${this.baseUrl}/${templateId}/last-session`)
    );
  } catch {
    return [];  // empty — no ghost text shown; non-fatal
  }
}

async completeSession(req: CompleteSessionRequest): Promise<WorkoutCompletionSummary | null> {
  try {
    return await firstValueFrom(
      this.http.post<WorkoutCompletionSummary>(`${this.baseUrl}/sessions`, req)
    );
  } catch {
    this.alerts?.warn('Failed to save workout session');
    return null;
  }
}
```

### 3. `core/facade/workouts-tab.facade.ts`
Add to the existing `WorkoutsTabFacade`:

```typescript
readonly lastSession = signal<LastExerciseSession[]>([]);
readonly completionSummary = signal<WorkoutCompletionSummary | null>(null);

// computed Map for O(1) lookup by exercise name in set rows
readonly lastSessionMap = computed(() =>
  new Map(this.lastSession().map(s => [s.exerciseName, s]))
);

async loadLastSession(templateId: number): Promise<void> {
  const data = await this.workoutsSvc.getLastSession(templateId);
  this.lastSession.set(data);
}

async completeSession(req: CompleteSessionRequest): Promise<WorkoutCompletionSummary | null> {
  this._loading.set(true);
  try {
    const summary = await this.workoutsSvc.completeSession(req);
    if (summary) this.completionSummary.set(summary);
    return summary;
  } finally {
    this._loading.set(false);
  }
}
```

### 4. New `ActiveWorkoutSessionComponent`
File: `features/workouts/active-session/active-workout-session.component.ts`

Key implementation points:
- Inject `WorkoutsTabFacade` and `ActivatedRoute`
- On init: read `templateId` from route params, call `facade.loadTemplates()` then
  `facade.getTemplate(templateId)` + `facade.loadLastSession(templateId)`
- Elapsed timer: `setInterval` from component init, stored in a signal
- Session sets state: `signal<SessionExercise[]>` — local only, not persisted until finish
- Finish flow: `await facade.completeSession(req)` → navigate to summary or back
- See `.claude/design-specs/fix-6-workout-set-logger.md` for full layout and visual spec

### 5. New `WorkoutSetRowComponent`
File: `shared/components/workout-set-row/workout-set-row.component.ts`

Key implementation points:
- Inputs: `@Input() setNumber`, `@Input() exerciseName`, `@Input() targetWeightKg`,
  `@Input() targetReps`, `@Input() lastSession: LastExerciseSession | undefined`
- Outputs: `@Output() completed = new EventEmitter<{weightKg, reps}>()`,
  `@Output() deleted = new EventEmitter<void>()`
- Local signals: `weightKg`, `reps`, `state: 'idle' | 'editing' | 'completed'`
- Swipe: `(pointerdown)`, `(pointermove)`, `(pointerup)` handlers — CSS `transform: translateX()`
- Long-press: 400ms `setTimeout` on `pointerdown`, cleared on `pointermove > 8px` or `pointerup`
- `ChangeDetectionStrategy.OnPush` — all state via signals
- See `.claude/design-specs/fix-6-workout-set-logger.md` for full gesture thresholds and CSS spec

### 6. `app.routes.ts`
Add before the `** catch-all` route:

```typescript
{
  path: 'workout-session/:templateId',
  loadComponent: () =>
    import('./features/workouts/active-session/active-workout-session.component')
      .then(m => m.ActiveWorkoutSessionComponent),
  canActivate: [AuthGuard],
},
```

### 7. `features/user/workouts-tab/workouts-tab.component.html`
Add a "Start Workout" button to each non-Cardio template row (Cardio has no sets):

```html
<button
  type="button"
  class="btn-primary"
  [routerLink]="['/workout-session', w.id]"
  *ngIf="w.type !== 'Cardio'"
  (click)="stop($event)"
>
  <mat-icon>play_arrow</mat-icon>Start
</button>
```

Add `RouterLink` import to `workouts-tab.component.ts`.

---

## Instructions for @db-migration-specialist

1. Run `dotnet ef migrations add AddWorkoutSession` in `FitApp.Api/`
2. Verify migration creates:
   - `WorkoutSessions` with nullable `WorkoutTemplateId` (int? → SQL `INTEGER NULL`)
   - `WorkoutSessionSets` with non-nullable `WorkoutSessionId` FK (cascade delete)
   - `IX_WorkoutSessions_UserId_FinishedAt` composite index
   - `IX_WorkoutSessionSets_WorkoutSessionId_ExerciseName` composite index
3. Verify no existing table modifications — additive-only migration
4. Test rollback: `dotnet ef migrations remove` should cleanly reverse

---

## Consequences & Trade-offs

### Gains
- Gym-first UX: 40+ inputs → swipe gestures + +/− steppers; zero keyboard required for
  standard increments
- Training memory: "last time: 80kg × 8" ghost text eliminates reliance on mental recall
- Offline-first: zero network dependency mid-workout
- Session history foundation: `WorkoutSession` + `WorkoutSessionSet` tables underpin future
  features — progress charts, volume tracking, 1RM calculations (Fix 9+)
- `WorkoutCompletionSummaryDto` ready-shaped for Fix 8 (post-workout card) and Fix 7
  (beSocial share prompt)

### Accepted trade-offs
- **No real-time calorie update.** `EstimatedCaloriesKcal` is proportional from the template
  estimate. The AI calorie estimator (`POST /api/ai/workout-calories`) gives a better estimate
  but requires a separate async call — deferred to Fix 8 (summary card context).
- **StreakDay is informational only.** Workout completion doesn't auto-log the daily entry.
  Users who expect "I worked out = streak logged" will be surprised. This is intentional —
  the streak system is based on `DailyEntry` (weight, water, steps), not workout frequency.
  This should be surfaced clearly in the post-workout summary card (Fix 8).
- **EF Core GroupBy → `First()` limitation.** The `GetLastSessionAsync` GroupBy query
  translates to SQL GROUP BY + subquery. EF Core 10 handles this correctly. If performance
  degrades at scale, replace with a raw SQL query or a `DISTINCT ON` (not applicable for SQLite).
  At FitApp's current scale, acceptable.
- **No partial-session recovery.** If the user closes the app mid-workout before tapping
  "Finish", session data is lost. Angular LocalStorage persistence for in-progress sessions
  is deferred to Fix 9+ (acknowledged here so Fix 8 doesn't inadvertently close this gap
  with a partial solution).

### Must NOT happen
- `WorkoutSessionService` must never modify `WorkoutTemplate`, `WorkoutExercise`, or any
  template data — it is a read + new-session-write service only
- `CompleteSessionAsync` must never create a `DailyEntry` or call `DailyDataService.SaveForDateAsync`
- `WorkoutSetRowComponent` must never call API services directly — only through facade inputs/outputs
- `WorkoutTemplateId` FK must be nullable in the migration — verify before applying
