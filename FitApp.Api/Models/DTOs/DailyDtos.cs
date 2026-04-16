namespace FitApp.Api.Models.DTOs;

public class DailyEntryDto
{
    public string Date { get; set; } = string.Empty;
    public string? ActivityType { get; set; }
    public double WaterConsumedL { get; set; }
    public int Steps { get; set; }
    public int StepTarget { get; set; }
    public MacrosPctDto MacrosPct { get; set; } = new();
    public int CaloriesBurned { get; set; }
    public int CaloriesIntake { get; set; }
    public int CaloriesTotal { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class MacrosPctDto
{
    public double Protein { get; set; }
    public double Carbs { get; set; }
    public double Fats { get; set; }
}

public class SaveDailyEntryRequest
{
    public string Date { get; set; } = string.Empty;
    public string? ActivityType { get; set; }
    public double WaterConsumedL { get; set; }
    public int Steps { get; set; }
    public int StepTarget { get; set; } = 3000;
    public MacrosPctDto MacrosPct { get; set; } = new();
    public int CaloriesBurned { get; set; }
    public int CaloriesIntake { get; set; }
}
