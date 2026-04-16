namespace FitApp.Api.Models.DTOs;

public class UserProfileDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Gender { get; set; } = string.Empty;
    public int Age { get; set; }
    public double HeightCm { get; set; }
    public double WeightKg { get; set; }
    public string Goal { get; set; } = string.Empty;
    public string Activity { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public UserMetricsDto? Metrics { get; set; }
    public DateTime? MetricsUpdatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UserMetricsDto
{
    public double? Bmi { get; set; }
    public double? Bmr { get; set; }
    public double? Tdee { get; set; }
    public double? GoalCalories { get; set; }
    public double? WaterL { get; set; }
    public string? BmiCat { get; set; }
}

public class UpdateUserProfileRequest
{
    public string? FullName { get; set; }
    public string? Gender { get; set; }
    public int? Age { get; set; }
    public double? HeightCm { get; set; }
    public double? WeightKg { get; set; }
    public string? Goal { get; set; }
    public string? Activity { get; set; }
    public string? ImageUrl { get; set; }
}
