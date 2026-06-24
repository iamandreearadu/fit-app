using System.ComponentModel.DataAnnotations;

namespace FitApp.Api.Models.DTOs;

public class WorkoutTemplateDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int DurationMin { get; set; }
    public int CaloriesEstimateKcal { get; set; }
    public string? Notes { get; set; }
    public List<WorkoutExerciseDto> Exercises { get; set; } = [];
    public CardioDetailsDto? Cardio { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// True for globally-seeded starter templates. Frontend must never show edit/delete
    /// actions for system templates, and must not count them when checking for user-owned
    /// templates (guided-empty-state trigger: every returned template has IsSystemTemplate = true).
    /// </summary>
    public bool IsSystemTemplate { get; set; }
}

public class WorkoutExerciseDto
{
    public string Name { get; set; } = string.Empty;
    public int Sets { get; set; }
    public int Reps { get; set; }
    public double WeightKg { get; set; }
    public string? Notes { get; set; }
}

public class CardioDetailsDto
{
    public double Km { get; set; }
    public double Incline { get; set; }
    public string? Notes { get; set; }
}

public class SaveWorkoutRequest
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int DurationMin { get; set; }
    public int CaloriesEstimateKcal { get; set; }
    public string? Notes { get; set; }
    public List<WorkoutExerciseDto> Exercises { get; set; } = [];
    public CardioDetailsDto? Cardio { get; set; }
}

// ── Session DTOs (Fix 6) ──────────────────────────────────────────────────────

/// <summary>
/// One entry per exercise in the template's last completed session.
/// ExerciseName is the lookup key; matches WorkoutSessionSet.ExerciseName.
/// Consumed by GET /api/workouts/{templateId}/last-session.
/// </summary>
public record LastSessionDto(
    string ExerciseName,
    double LastWeightKg,
    int LastReps,
    string LastDate   // "yyyy-MM-dd" UTC — displayed as ghost text in set row
);

/// <summary>
/// Per-set data from a completed set during an active session.
/// </summary>
public class CompletedSetDto
{
    [Required]
    [MaxLength(200)]
    public string ExerciseName { get; set; } = string.Empty;

    public int SetNumber { get; set; }

    [Range(0, double.MaxValue)]
    public double ActualWeightKg { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "actualReps must be at least 1")]
    public int ActualReps { get; set; }
}

/// <summary>
/// Request body for POST /api/workouts/sessions.
/// All session state is accumulated client-side during the workout; submitted once on finish.
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
/// Also pushed via SignalR event "workout-completed" to user-{userId} group.
/// estimatedCaloriesKcal is for the authenticated user's own view ONLY —
/// must NEVER appear in SocialDtos, feed responses, or any public endpoint.
/// StreakDay is a read-only snapshot; completing a workout does NOT write a DailyEntry.
/// </summary>
public record WorkoutCompletionSummaryDto(
    int SessionId,
    string TemplateTitle,
    int DurationMin,
    int ExerciseCount,
    int SetsCompleted,
    int EstimatedCaloriesKcal,   // private — user's own view only, never in social DTOs
    int StreakDay,               // current streak snapshot, NOT an increment
    string CompletedAt           // ISO 8601 UTC (FinishedAt.ToString("o"))
);
