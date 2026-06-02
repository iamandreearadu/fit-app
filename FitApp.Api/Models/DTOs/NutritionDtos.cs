using System.ComponentModel.DataAnnotations;

namespace FitApp.Api.Models.DTOs;

public class MealEntryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public List<FoodItemDto> Items { get; set; } = [];
    public double TotalGrams { get; set; }
    public double TotalCalories { get; set; }
    public double TotalProtein_g { get; set; }
    public double TotalCarbs_g { get; set; }
    public double TotalFats_g { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class FoodItemDto
{
    public string Name { get; set; } = string.Empty;
    public double Grams { get; set; }
    public double Calories { get; set; }
    public double Protein_g { get; set; }
    public double Carbs_g { get; set; }
    public double Fats_g { get; set; }
    public string? Source { get; set; }   // Fix 1: "search" | "recent" | "manual" | "ai_analyzer"
}

public class SaveMealRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public List<FoodItemDto> Items { get; set; } = [];
    public string? Notes { get; set; }
}

/// <summary>
/// A single food search result from USDA FoodData Central.
/// All nutrient values are per 100g. Never includes user health metrics.
/// </summary>
public class FoodSearchResultDto
{
    public int FdcId { get; set; }
    public string Name { get; set; } = string.Empty;
    public double Calories { get; set; }
    public double Protein_g { get; set; }
    public double Carbs_g { get; set; }
    public double Fat_g { get; set; }
    public string? ServingSize { get; set; }
    public string? Brand { get; set; }
    public string? DataType { get; set; }
}

/// <summary>
/// A recently used food item for the authenticated user.
/// Derived from existing FoodItem records — zero external API calls.
/// </summary>
public class RecentFoodItemDto
{
    public string Name { get; set; } = string.Empty;
    public double Grams { get; set; }
    public double Calories { get; set; }
    public double Protein_g { get; set; }
    public double Carbs_g { get; set; }
    public double Fats_g { get; set; }
    public string? Source { get; set; }
    public DateTime LastUsed { get; set; }
}

/// <summary>
/// Today's macro totals vs TDEE-derived macro targets.
/// Consumed by GET /api/nutrition/today/macro-progress (Fix 3 — MealCompletionFeedbackComponent).
/// Private user health data — Bearer required, MUST NEVER appear in social endpoints or feed.
///
/// Macro targets are derived from GoalCalories using a standard 30 / 40 / 30 split:
///   Protein  30 % of GoalCalories / 4 kcal per gram
///   Carbs    40 % of GoalCalories / 4 kcal per gram
///   Fat      30 % of GoalCalories / 9 kcal per gram
/// All target fields return 0 when the user has not completed onboarding.
/// </summary>
public record MacroProgressDto(
    double TotalProtein,
    double TargetProtein,
    double TotalCarbs,
    double TargetCarbs,
    double TotalFat,
    double TargetFat,
    double TotalCalories,
    double TargetCalories
);
