using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Services;

/// <summary>
/// Business logic for the guided onboarding flow (Fix 4).
///
/// Responsibilities:
///   - SubmitBiometricsAsync  — stores biometric data, triggers metric computation, records step
///   - RecordStepAsync        — idempotent step tracker; sets OnboardingCompleted on final step
///   - GetStatusAsync         — returns progress for the Angular OnboardingGuard
///   - GetYourNumbersAsync    — returns computed metrics for the reveal screen or profile page
///
/// PRIVACY: all computed metrics (BMI, BMR, TDEE, GoalCalories) are private to the
/// authenticated user. This service MUST NOT be called from SocialService, SocialController,
/// or any public/feed endpoint.
/// </summary>
public class OnboardingService(AppDbContext db, MetricsService metricsService)
{
    // Fixed step progression (order is authoritative — not based on timestamps).
    // Index in this array determines the step's position in the funnel.
    private static readonly string[] StepOrder =
        ["carousel_seen", "biometrics_complete", "first_action_taken"];

    // Maps "last completed step name" → "next route segment for the frontend".
    // null signals onboarding is complete (no redirect needed).
    private static readonly Dictionary<string, string?> NextStepRoutes = new()
    {
        { "carousel_seen",       "biometrics"    },
        { "biometrics_complete", "first_action"  },
        { "first_action_taken",  null            }
    };

    // ── Biometrics ────────────────────────────────────────────────────────────

    /// <summary>
    /// Stores biometric data, recomputes all fitness metrics via MetricsService, records
    /// the "biometrics_complete" onboarding step atomically, and returns YourNumbersResponse
    /// so the reveal screen renders without a second API call.
    ///
    /// Idempotent: calling multiple times overwrites previous values and recomputes metrics.
    /// The biometrics_complete step is upserted — not duplicated.
    /// </summary>
    public async Task<YourNumbersResponse> SubmitBiometricsAsync(
        string userId, BiometricsRequest req)
    {
        var user = await db.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        // Apply biometric data.
        // ActivityLevel from the request maps to User.Activity (existing column name).
        user.HeightCm         = req.HeightCm;
        user.WeightKg         = req.WeightKg;
        user.Age              = req.Age;
        user.Gender           = req.Gender;
        user.Activity         = req.ActivityLevel;
        user.DietaryPreference = req.DietaryPreference;
        user.UpdatedAt        = DateTime.UtcNow;

        // Reuse existing MetricsService — never duplicate Mifflin-St Jeor formula.
        // Computes: BMI, BmiCat, BMR, TDEE, GoalCalories, WaterL (all stored on user).
        metricsService.CalculateAndApply(user);

        // Atomically upsert "biometrics_complete" step.
        // Check first to avoid a unique-constraint violation on re-submission.
        var stepExists = await db.OnboardingSteps
            .AnyAsync(s => s.UserId == userId && s.StepName == "biometrics_complete");

        if (!stepExists)
            db.OnboardingSteps.Add(new OnboardingStep
            {
                UserId    = userId,
                StepName  = "biometrics_complete",
                CompletedAt = DateTime.UtcNow
            });

        await db.SaveChangesAsync();

        return BuildYourNumbersResponse(user);
    }

    // ── Step tracking ─────────────────────────────────────────────────────────

    /// <summary>
    /// Records a completed onboarding step. Idempotent — if the step already exists,
    /// returns without error (204 both times from the controller).
    ///
    /// Special case: "first_action_taken" also sets User.OnboardingCompleted = true,
    /// saved in the same transaction so the OnboardingGuard fast-path works immediately.
    /// </summary>
    public async Task RecordStepAsync(string userId, RecordStepRequest req)
    {
        // Idempotency check — avoids unique-index violation on duplicate calls.
        var exists = await db.OnboardingSteps
            .AnyAsync(s => s.UserId == userId && s.StepName == req.StepName);

        if (exists) return;

        db.OnboardingSteps.Add(new OnboardingStep
        {
            UserId    = userId,
            StepName  = req.StepName,
            CompletedAt = DateTime.UtcNow
        });

        // Final step: flag the user record so the OnboardingGuard short-circuits on
        // future logins without needing to load any OnboardingStep rows.
        if (req.StepName == "first_action_taken")
        {
            var user = await db.Users.FindAsync(userId);
            if (user is not null)
                user.OnboardingCompleted = true;
        }

        await db.SaveChangesAsync();
    }

    // ── Status ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns onboarding progress for the Angular OnboardingGuard routing decision.
    ///
    /// Fast path: if User.OnboardingCompleted == true (pre-Fix-4 users or returning users),
    /// the complete status is returned without loading any OnboardingStep rows.
    ///
    /// Slow path: loads step rows, determines the highest completed step, and maps to
    /// the next route segment using the fixed progression table.
    /// </summary>
    public async Task<OnboardingStatusResponse> GetStatusAsync(string userId)
    {
        // Fast path — handles pre-Fix-4 users who have no OnboardingStep rows.
        var onboardingCompleted = await db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.OnboardingCompleted)
            .FirstOrDefaultAsync();

        if (onboardingCompleted)
        {
            return new OnboardingStatusResponse
            {
                IsComplete       = true,
                LastCompletedStep = "first_action_taken",
                NextStep         = null
            };
        }

        // Load completed step names for this user.
        var completedStepNames = await db.OnboardingSteps
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .Select(s => s.StepName)
            .ToHashSetAsync();

        // Walk StepOrder from the end to find the last completed step.
        string? lastCompleted = null;
        for (var i = StepOrder.Length - 1; i >= 0; i--)
        {
            if (completedStepNames.Contains(StepOrder[i]))
            {
                lastCompleted = StepOrder[i];
                break;
            }
        }

        // No steps completed → nextStep is "carousel".
        if (lastCompleted is null)
        {
            return new OnboardingStatusResponse
            {
                IsComplete        = false,
                LastCompletedStep = null,
                NextStep          = "carousel"
            };
        }

        // "first_action_taken" completed → onboarding is done.
        if (lastCompleted == "first_action_taken")
        {
            return new OnboardingStatusResponse
            {
                IsComplete        = true,
                LastCompletedStep = "first_action_taken",
                NextStep          = null
            };
        }

        return new OnboardingStatusResponse
        {
            IsComplete        = false,
            LastCompletedStep = lastCompleted,
            NextStep          = NextStepRoutes[lastCompleted]
        };
    }

    // ── Your Numbers ──────────────────────────────────────────────────────────

    /// <summary>
    /// Returns computed fitness metrics for the authenticated user.
    /// Used by GET /api/users/me/numbers — reusable beyond the onboarding flow
    /// (profile page, settings, etc.).
    ///
    /// Returns all-zero/empty-string response when the user has not yet submitted
    /// biometrics (BMI is null) — never 404.
    ///
    /// PRIVACY: returns data for userId from JWT only; MUST NEVER be surfaced via
    /// social, feed, or notification endpoints.
    /// </summary>
    public async Task<YourNumbersResponse> GetYourNumbersAsync(string userId)
    {
        var user = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null)
            return new YourNumbersResponse();   // user not found — return safe defaults

        return BuildYourNumbersResponse(user);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static YourNumbersResponse BuildYourNumbersResponse(User user)
    {
        // Null-safe defaults for users who haven't submitted biometrics yet.
        var goalCalories = user.GoalCalories ?? 0.0;

        return new YourNumbersResponse
        {
            Bmi               = user.Bmi             ?? 0.0,
            BmiCategory       = user.BmiCat          ?? string.Empty,
            Bmr               = user.Bmr             ?? 0.0,
            Tdee              = user.Tdee            ?? 0.0,
            GoalCalories      = goalCalories,
            DailyCalorieTarget = goalCalories,       // UX alias — same value as GoalCalories
            WaterLiters       = user.WaterL          ?? 0.0,
            Goal              = user.Goal            ?? string.Empty
        };
    }
}
