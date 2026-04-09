namespace FitApp.Api.Models.Entities;

public class WorkoutTemplate
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;               // Strength | Circuit | HIIT | Crossfit | Cardio | Other
    public int DurationMin { get; set; }
    public int CaloriesEstimateKcal { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsArchived { get; set; } = false;

    public User User { get; set; } = null!;
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
