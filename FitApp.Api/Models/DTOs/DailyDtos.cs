using System.ComponentModel.DataAnnotations;

namespace FitApp.Api.Models.DTOs;

// Returned by GET /api/daily?date= and POST /api/daily — DO NOT CHANGE (backward compat)
public class DailyEntryDto
{
    public string Date { get; set; } = string.Empty;
    public string? ActivityType { get; set; }
    public double WaterConsumedL { get; set; }
    public int Steps { get; set; }
    public int StepTarget { get; set; }
    public MacrosPctDto MacrosPct { get; set; } = new();
    public int CaloriesBurned { get; set; }
    public int CaloriesIntake { get; set; }      // Now server-computed from MealEntries, but field kept for compat
    public int CaloriesTotal { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Today's daily entry enriched with live-computed nutrition totals from MealEntry.
/// Used exclusively by GET /api/daily/today/summary.
/// CaloriesFromNutritionLog is ALWAYS server-computed — never overridable by client.
/// This DTO must NEVER appear in any social or public-facing endpoint.
/// </summary>
public class DailyEntrySummaryDto
{
    public string Date { get; set; } = string.Empty;

    // ── Computed from MealEntries (read-only, server-computed) ──
    public double CaloriesFromNutritionLog { get; set; }
    public double ProteinFromNutritionLog_g { get; set; }
    public double CarbsFromNutritionLog_g { get; set; }
    public double FatsFromNutritionLog_g { get; set; }
    public int MealCount { get; set; }

    // ── From DailyEntry (existing fields) ──
    public string? ActivityType { get; set; }
    public double WaterConsumedL { get; set; }
    public int Steps { get; set; }
    public int StepTarget { get; set; }
    public int CaloriesBurned { get; set; }
    public int CaloriesTotal { get; set; }          // ROUND(caloriesFromNutritionLog) - caloriesBurned

    // ── Existing macro percentages (still manual, not yet auto-populated) ──
    public MacrosPctDto MacrosPct { get; set; } = new();

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
    [RegularExpression(@"^\d{4}-\d{2}-\d{2}$", ErrorMessage = "Date must be in yyyy-MM-dd format.")]
    public string Date { get; set; } = string.Empty;
    public string? ActivityType { get; set; }
    public double WaterConsumedL { get; set; }
    public int Steps { get; set; }
    public int StepTarget { get; set; } = 3000;
    public MacrosPctDto MacrosPct { get; set; } = new();
    public int CaloriesBurned { get; set; }
    // CaloriesIntake REMOVED (Fix 10) — now server-computed from MealEntries.
    // Clients sending this field will NOT get a 400; System.Text.Json silently ignores it.
}
