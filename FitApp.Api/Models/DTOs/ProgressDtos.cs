namespace FitApp.Api.Models.DTOs;

public class ProgressSummaryDto
{
    public ProgressTrendsDto Trends { get; set; } = new();
    public CompleteStreakStatusDto Streak { get; set; } = new();
    public NutritionistWeeklyReportDto? WeeklyReport { get; set; }
}

public class ProgressTrendsDto
{
    public int Window { get; set; }
    public List<string> Dates { get; set; } = [];
    public List<double?> WeightKg { get; set; } = [];
    public List<int?> EnergyLevel { get; set; } = [];
    public List<int> CaloriesIn { get; set; } = [];
    public List<int> CaloriesBurned { get; set; } = [];
    public double Tdee { get; set; }
    public List<double> ProteinG { get; set; } = [];
    public List<double> CarbsG { get; set; } = [];
    public List<double> FatG { get; set; } = [];
    public List<double> WaterL { get; set; } = [];
    public double WaterTargetL { get; set; }
    public List<int> Steps { get; set; } = [];
    public List<int> StepTarget { get; set; } = [];
}

public class CompleteStreakStatusDto
{
    public int CompleteDayStreak { get; set; }
    public bool LoggedTodayComplete { get; set; }
    public List<string> MissingToday { get; set; } = [];
    public int DaysUntilUnlock { get; set; }
}

public class NutritionistWeeklyReportDto
{
    public string WindowStart { get; set; } = string.Empty;
    public string WindowEnd { get; set; } = string.Empty;
    public string UserGoal { get; set; } = "maintain";
    public double GoalCalories { get; set; }
    public double AvgCaloriesIn { get; set; }
    public double Tdee { get; set; }
    public double NetCaloriesTotal { get; set; }
    public double EstimatedWeightChangeKg { get; set; }
    public double? ActualWeightChangeKg { get; set; }
    public double AvgWaterL { get; set; }
    public double WaterTargetL { get; set; }
    public double WaterAdherencePct { get; set; }
    public double AvgSteps { get; set; }
    public int StepTarget { get; set; }
    public int MealsLogged { get; set; }
    public double AvgProteinPct { get; set; }
    public double AvgCarbsPct { get; set; }
    public double AvgFatPct { get; set; }
    public double TargetProteinPct { get; set; } = 30;
    public double TargetCarbsPct { get; set; } = 45;
    public double TargetFatPct { get; set; } = 25;
    public string AiNarrative { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
}
