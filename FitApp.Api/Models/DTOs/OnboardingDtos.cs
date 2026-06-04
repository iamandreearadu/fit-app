using System.ComponentModel.DataAnnotations;

namespace FitApp.Api.Models.DTOs;

/// <summary>
/// Request for POST /api/onboarding/biometrics.
/// All six fields are required — this is the biometrics *completion* step, not a partial
/// patch. Every field must be present for MetricsService.CalculateAndApply() to succeed.
/// </summary>
public class BiometricsRequest
{
    [Required, Range(100, 250, ErrorMessage = "Height must be between 100 and 250 cm.")]
    public double HeightCm { get; set; }

    [Required, Range(30, 300, ErrorMessage = "Weight must be between 30 and 300 kg.")]
    public double WeightKg { get; set; }

    [Required, Range(13, 120, ErrorMessage = "Age must be between 13 and 120.")]
    public int Age { get; set; }

    [Required, RegularExpression("^(male|female|other)$",
        ErrorMessage = "Gender must be 'male', 'female', or 'other'.")]
    public string Gender { get; set; } = string.Empty;

    [Required, RegularExpression("^(sedentary|light|moderate|active|athlete)$",
        ErrorMessage = "Activity level must be one of: sedentary, light, moderate, active, athlete.")]
    public string ActivityLevel { get; set; } = string.Empty;

    [RegularExpression("^(no-restriction|vegetarian|vegan|high-protein)$",
        ErrorMessage = "Dietary preference must be one of: no-restriction, vegetarian, vegan, high-protein.")]
    public string? DietaryPreference { get; set; }
}

/// <summary>
/// Response for POST /api/onboarding/biometrics and GET /api/users/me/numbers.
/// Returns all computed fitness metrics so the "Your Numbers" reveal screen renders
/// without a second API call.
///
/// PRIVACY INVARIANT: Bearer-protected endpoints only.
/// MUST NEVER appear in SocialController, feed responses, or any public endpoint.
/// </summary>
public class YourNumbersResponse
{
    public double Bmi { get; set; }
    public string BmiCategory { get; set; } = string.Empty;
    public double Bmr { get; set; }
    public double Tdee { get; set; }
    public double GoalCalories { get; set; }

    /// <summary>
    /// UX-friendly alias for GoalCalories — same value, displayed as "Daily Calorie Target"
    /// on the reveal screen so the frontend doesn't need to understand the domain distinction.
    /// </summary>
    public double DailyCalorieTarget { get; set; }

    public double WaterLiters { get; set; }

    /// <summary>"lose" | "gain" | "maintain"</summary>
    public string Goal { get; set; } = string.Empty;
}

/// <summary>
/// Request for POST /api/onboarding/step.
/// StepName is validated against the fixed progression sequence.
/// The endpoint is idempotent — posting the same step twice is a no-op.
/// </summary>
public class RecordStepRequest
{
    [Required]
    [RegularExpression("^(carousel_seen|biometrics_complete|first_action_taken)$",
        ErrorMessage = "Invalid step name. Valid values: carousel_seen, biometrics_complete, first_action_taken.")]
    public string StepName { get; set; } = string.Empty;
}

/// <summary>
/// Response for GET /api/onboarding/status.
/// Used by the Angular OnboardingGuard to decide routing on every authenticated activation.
/// </summary>
public class OnboardingStatusResponse
{
    /// <summary>
    /// True when all three steps are completed OR when User.OnboardingCompleted == true
    /// (backward compat: pre-Fix-4 users have no OnboardingStep rows but their flag is already set).
    /// </summary>
    public bool IsComplete { get; set; }

    /// <summary>Name of the last completed step, or null if no steps completed yet.</summary>
    public string? LastCompletedStep { get; set; }

    /// <summary>
    /// Frontend route segment to redirect to, or null when onboarding is complete.
    /// Values: "carousel" | "biometrics" | "first_action" | null
    /// </summary>
    public string? NextStep { get; set; }
}
