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
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int DurationMin { get; set; }
    public int CaloriesEstimateKcal { get; set; }
    public string? Notes { get; set; }
    public List<WorkoutExerciseDto> Exercises { get; set; } = [];
    public CardioDetailsDto? Cardio { get; set; }
}
