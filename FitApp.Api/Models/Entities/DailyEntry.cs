namespace FitApp.Api.Models.Entities;

public class DailyEntry
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;               // ISO format: 2025-01-15
    public string? ActivityType { get; set; }                       // Strength Training | Cardio | HIIT Training | Active Rest Day | Rest Day
    public double WaterConsumedL { get; set; }
    public int Steps { get; set; }
    public int StepTarget { get; set; } = 3000;
    public double MacrosProtein { get; set; }                       // percentage
    public double MacrosCarbs { get; set; }                         // percentage
    public double MacrosFats { get; set; }                          // percentage
    public int CaloriesBurned { get; set; }
    public int CaloriesIntake { get; set; }
    public int CaloriesTotal { get; set; }                          // intake - burned
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
