namespace FitApp.Api.Models.DTOs;

/// <summary>
/// Top-level response for GET /api/dashboard/today.
/// Contains ONLY the authenticated user's own data — NEVER exposed on social or public endpoints.
/// Fields: weight, goal calories, macro targets and water target are private health data.
/// MUST NOT be reused on any social/public profile endpoint.
/// </summary>
public class DashboardTodayDto
{
    public CalorieBalanceDto CalorieBalance { get; set; } = null!;
    public List<MacroProgressItemDto> Macros { get; set; } = [];
    public RingMetricDto Burned { get; set; } = null!;
    public RingMetricDto Water { get; set; } = null!;
    public RingMetricDto Steps { get; set; } = null!;
    public DashboardStreakDto Streak { get; set; } = null!;
    public DashboardMetaDto Meta { get; set; } = null!;
    public WeeklyWorkoutsDto WeeklyWorkouts { get; set; } = null!;
}

/// <summary>
/// Calorie-balance hero ring.
/// Net = eaten − burned. Remaining = max(0, goal − net). OnTrack = net ≤ goal.
/// </summary>
public class CalorieBalanceDto
{
    /// <summary>SUM(MealEntry.TotalCalories) for today.</summary>
    public int Eaten { get; set; }

    /// <summary>DailyEntry.CaloriesBurned (0 if no entry).</summary>
    public int Burned { get; set; }

    /// <summary>User.GoalCalories (fallback: 2000).</summary>
    public int Goal { get; set; }

    /// <summary>Eaten − Burned.</summary>
    public int Net { get; set; }

    /// <summary>max(0, Goal − Net).</summary>
    public int Remaining { get; set; }

    /// <summary>Net ≤ Goal.</summary>
    public bool OnTrack { get; set; }
}

/// <summary>
/// One macro progress bar row.
/// Array on parent DTO always contains exactly 3 items: Protein, Carbs, Fat — in that order.
/// </summary>
public class MacroProgressItemDto
{
    /// <summary>"Protein" | "Carbs" | "Fat"</summary>
    public string Name { get; set; } = "";

    /// <summary>Grams consumed today.</summary>
    public double Consumed { get; set; }

    /// <summary>Gram target derived from GoalCalories × macro split.</summary>
    public double Target { get; set; }

    public string Unit { get; set; } = "g";
}

/// <summary>
/// One radial ring metric (water / steps).
/// For the Burned counter: Goal is always 0 — there is no "burn target" on User.
/// The burned ring is a counter (open value), not a gauge. Do not render a fill arc for it.
/// </summary>
public class RingMetricDto
{
    public double Value { get; set; }

    /// <summary>
    /// Real target for water (User.WaterL × 1000) and steps (DailyEntry.StepTarget).
    /// Always 0 for the burned ring — no burn goal exists; ring is a counter.
    /// </summary>
    public double Goal { get; set; }

    /// <summary>"kcal" | "ml" | "steps"</summary>
    public string Unit { get; set; } = "";
}

/// <summary>
/// Current and best streak for the dashboard streak chip.
/// Sourced exclusively from DailyDataService.GetStreakAsync() — never recomputed here.
/// </summary>
public class DashboardStreakDto
{
    public int Current { get; set; }
    public int Best { get; set; }
}

/// <summary>
/// Dashboard metadata — date and goal status badge.
/// </summary>
public class DashboardMetaDto
{
    /// <summary>ISO date string, e.g. "2026-06-12".</summary>
    public string Date { get; set; } = "";

    /// <summary>"MAINTENANCE" | "CUTTING" | "BULKING" — derived from User.Goal.</summary>
    public string StatusBadge { get; set; } = "";
}

// ── Keep existing DTOs below unchanged ──────────────────────────────────────

/// <summary>
/// Weekly workout summary (Mon–Sun) for the weekly workout card.
/// </summary>
public class WeeklyWorkoutsDto
{
    public List<DayWorkoutDto> Days { get; set; } = [];
    public DateTime? LastWorkoutAt { get; set; }
    public int TotalThisWeek { get; set; }
}

/// <summary>
/// One day's workout status in the weekly strip.
/// </summary>
public class DayWorkoutDto
{
    public string DayLabel { get; set; } = "";   // "Mon", "Tue", etc.
    public bool HasWorkout { get; set; }
    public int DurationMinutes { get; set; }
    public bool IsToday { get; set; }
}

/// <summary>
/// AI-generated daily insight for GET /api/dashboard/ai-insight.
/// Cached per user per day — never stores health metrics.
/// </summary>
public class AiInsightDto
{
    public string Insight { get; set; } = "";
    public DateTime GeneratedAt { get; set; }
}

/// <summary>
/// One item in the activity grid for GET /api/users/{id}/activity-grid.
/// PRIVACY: Contains ONLY public workout metadata — zero calorie, weight, or health data.
/// </summary>
public class PostGridItemDto
{
    public int PostId { get; set; }
    public string? WorkoutType { get; set; }
    public int? DurationMin { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? ThumbnailUrl { get; set; }
}

/// <summary>
/// Paginated page of PostGridItemDto for GET /api/users/{id}/activity-grid.
/// </summary>
public class PostGridPageDto
{
    public List<PostGridItemDto> Items { get; set; } = [];
    public bool HasMore { get; set; }
    public int Page { get; set; }
}
