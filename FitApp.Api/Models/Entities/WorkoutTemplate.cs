namespace FitApp.Api.Models.Entities;

public class WorkoutTemplate
{
    public int Id { get; set; }

    /// <summary>
    /// Null for system templates (IsSystemTemplate = true); required for all user-owned templates.
    /// </summary>
    public string? UserId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;               // Strength | Circuit | HIIT | Crossfit | Cardio | Other
    public int DurationMin { get; set; }
    public int CaloriesEstimateKcal { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsArchived { get; set; } = false;

    /// <summary>
    /// True for the 3 globally-seeded starter templates (Push Day, Pull Day, Full Body).
    /// System templates have UserId = null and are never returned via the standard user-scoped
    /// list endpoint — they exist as reference data for admin and future features.
    /// </summary>
    public bool IsSystemTemplate { get; set; } = false;

    /// <summary>Null for system templates; non-null for all user-owned templates.</summary>
    public User? User { get; set; }

    public ICollection<WorkoutExercise> Exercises { get; set; } = [];
    public CardioDetails? Cardio { get; set; }
}

public class WorkoutExercise
{
    public int Id { get; set; }
    public int WorkoutTemplateId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Sets { get; set; }
    public int Reps { get; set; }
    public double WeightKg { get; set; }
    public string? Notes { get; set; }
    public int Order { get; set; }

    public WorkoutTemplate WorkoutTemplate { get; set; } = null!;
}

public class CardioDetails
{
    public int Id { get; set; }
    public int WorkoutTemplateId { get; set; }
    public double Km { get; set; }
    public double Incline { get; set; }
    public string? Notes { get; set; }

    public WorkoutTemplate WorkoutTemplate { get; set; } = null!;
}

// ── Session entities (Fix 6) ──────────────────────────────────────────────────

/// <summary>
/// Records one completed workout session.
/// WorkoutTemplateId is nullable: templates can be hard-deleted (WorkoutService.DeleteAsync
/// calls db.WorkoutTemplates.Remove). SetNull preserves session history for the user.
/// TemplateTitle is snapshotted at session time for the same reason.
/// </summary>
public class WorkoutSession
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;

    // Nullable — preserved when template is deleted (DeleteBehavior.SetNull in AppDbContext)
    public int? WorkoutTemplateId { get; set; }

    // Snapshot: survives template deletion or title edits
    public string TemplateTitle { get; set; } = string.Empty;

    public DateTime StartedAt { get; set; }
    public DateTime FinishedAt { get; set; }
    public int DurationMin { get; set; }
    public int SetsCompleted { get; set; }
    public int EstimatedCaloriesKcal { get; set; }

    public User User { get; set; } = null!;
    public WorkoutTemplate? WorkoutTemplate { get; set; }
    public ICollection<WorkoutSessionSet> Sets { get; set; } = [];
}

/// <summary>
/// One completed set within a WorkoutSession.
/// ExerciseName (not WorkoutExerciseId) is the natural key — WorkoutService.UpdateAsync
/// removes and re-creates all WorkoutExercise rows on each template update, so their IDs
/// are unstable across template edits.
/// </summary>
public class WorkoutSessionSet
{
    public int Id { get; set; }
    public int WorkoutSessionId { get; set; }

    // Natural key: matches WorkoutExercise.Name; stable across template edits
    public string ExerciseName { get; set; } = string.Empty;
    public int SetNumber { get; set; }
    public double ActualWeightKg { get; set; }
    public int ActualReps { get; set; }

    public WorkoutSession WorkoutSession { get; set; } = null!;
}
