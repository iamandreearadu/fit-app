using System.ComponentModel.DataAnnotations;

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
    [MaxLength(7_000_000)]
    public string? ImageUrl { get; set; }
    public bool OnboardingCompleted { get; set; }
    public string? DietaryPreference { get; set; }
    public UserMetricsDto? Metrics { get; set; }
    public DailyTargetsDto Targets { get; set; } = new();
    public DateTime? MetricsUpdatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class DailyTargetsDto
{
    public double RecommendedCalories { get; set; }
    public double RecommendedWaterL { get; set; }
    public int RecommendedSteps { get; set; }
    public double? CustomCalories { get; set; }
    public double? CustomWaterL { get; set; }
    public int? CustomSteps { get; set; }
    public double EffectiveCalories { get; set; }
    public double EffectiveWaterL { get; set; }
    public int EffectiveSteps { get; set; }
}

public class UpdateDailyTargetsRequest : IValidatableObject
{
    public double? Calories { get; set; }
    public double? WaterL { get; set; }
    public int? Steps { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Calories is < 800 or > 8000 || Calories is double.NaN || Calories is double.PositiveInfinity || Calories is double.NegativeInfinity)
            yield return new ValidationResult("Calories must be between 800 and 8000 kcal.", [nameof(Calories)]);
        if (WaterL is < 0.5 or > 10 || WaterL is double.NaN || WaterL is double.PositiveInfinity || WaterL is double.NegativeInfinity)
            yield return new ValidationResult("Water must be between 0.5 and 10 litres.", [nameof(WaterL)]);
        if (Steps is < 500 or > 100000)
            yield return new ValidationResult("Steps must be between 500 and 100000.", [nameof(Steps)]);
    }
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

public record StreakDto(int Current, int Longest, bool LoggedToday, bool AtRisk);

// Navigation badge streak — minimal fields; deliberately excludes health metrics
// (no BMI, weight, BMR, TDEE, goal calories). Consumed by GET /api/users/me/streak.
public record UserStreakDto(
    int CurrentStreak,
    string? LastLogDate,  // "yyyy-MM-dd" of most recent complete day; null if none
    bool AtRiskToday,     // !loggedToday && currentStreak > 0 && UTC hour >= 18
    bool LoggedToday,     // today satisfies meals + activity + steps + water
    bool IsNewRecord      // currentStreak > 0 && currentStreak == allTimeLongest
);

public class UpdateUserProfileRequest
{
    public string? FullName { get; set; }
    public string? Gender { get; set; }
    [Range(1, 120)]
    public int? Age { get; set; }
    [Range(50, 300)]
    public double? HeightCm { get; set; }
    [Range(20, 500)]
    public double? WeightKg { get; set; }
    public string? Goal { get; set; }
    public string? Activity { get; set; }
    public string? ImageUrl { get; set; }
    public bool? OnboardingCompleted { get; set; }
    public string? DietaryPreference { get; set; }
}
