namespace FitApp.Api.Models.Entities;

/// <summary>
/// Tracks the completion of each onboarding step for a user.
/// Enables resume-on-return (GET /api/onboarding/status) and funnel drop-off analytics.
///
/// Valid step names (enforced by RecordStepRequest validation):
///   "carousel_seen"        — user viewed the value-prop carousel
///   "biometrics_complete"  — biometric data collected and metrics computed
///   "first_action_taken"   — user completed their first workout or meal log
///
/// When "first_action_taken" is recorded, User.OnboardingCompleted is set to true
/// so that the OnboardingGuard fast-path (no step rows needed) works for all future logins.
/// </summary>
public class OnboardingStep
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;

    /// <summary>"carousel_seen" | "biometrics_complete" | "first_action_taken"</summary>
    public string StepName { get; set; } = string.Empty;

    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}
