using System.Security.Claims;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FitApp.Api.Controllers;

/// <summary>
/// Handles the guided onboarding flow introduced in Fix 4.
///
/// All actions require Bearer authentication — userId is always extracted from the JWT,
/// never from request body or route parameters.
///
/// PRIVACY: no action on this controller may expose health metrics (BMI, BMR, TDEE,
/// GoalCalories) to any social, feed, or public endpoint. The YourNumbersResponse
/// returned by POST biometrics is for the authenticated user's own view only.
/// </summary>
[ApiController]
[Route("api/onboarding")]
[Authorize]
public class OnboardingController(
    OnboardingService onboardingService,
    ILogger<OnboardingController> logger) : ControllerBase
{
    private string UserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException("User identity not resolved.");

    /// <summary>
    /// POST /api/onboarding/biometrics
    ///
    /// Stores biometric data, computes BMI / BMR / TDEE / GoalCalories server-side via
    /// MetricsService, atomically records the "biometrics_complete" onboarding step, and
    /// returns the YourNumbersResponse so the reveal screen renders without a second call.
    ///
    /// Idempotent — safe to call multiple times (re-submitting overwrites previous values).
    /// </summary>
    [HttpPost("biometrics")]
    public async Task<ActionResult<YourNumbersResponse>> SubmitBiometrics(
        [FromBody] BiometricsRequest request)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        try
        {
            var result = await onboardingService.SubmitBiometricsAsync(UserId, request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return Problem(statusCode: 404, detail: ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error submitting biometrics for user {UserId}", UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    /// <summary>
    /// POST /api/onboarding/step
    ///
    /// Records a completed onboarding step. Idempotent — posting the same step name twice
    /// returns 204 both times without creating a duplicate row.
    ///
    /// Valid step names: "carousel_seen" | "biometrics_complete" | "first_action_taken"
    ///
    /// When "first_action_taken" is recorded, User.OnboardingCompleted is set to true
    /// so the OnboardingGuard fast-path works for all subsequent logins.
    /// </summary>
    [HttpPost("step")]
    public async Task<IActionResult> RecordStep([FromBody] RecordStepRequest request)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        try
        {
            await onboardingService.RecordStepAsync(UserId, request);
            return NoContent();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error recording onboarding step '{StepName}' for user {UserId}",
                request.StepName, UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    /// <summary>
    /// GET /api/onboarding/status
    ///
    /// Returns onboarding progress for the Angular OnboardingGuard.
    /// Fast path: if User.OnboardingCompleted == true, returns complete immediately
    /// without loading any OnboardingStep rows (handles pre-Fix-4 users).
    ///
    /// nextStep values: "carousel" | "biometrics" | "first_action" | null (complete)
    /// </summary>
    [HttpGet("status")]
    public async Task<ActionResult<OnboardingStatusResponse>> GetStatus()
    {
        try
        {
            var result = await onboardingService.GetStatusAsync(UserId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error getting onboarding status for user {UserId}", UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }
}
