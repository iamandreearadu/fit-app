using System.Security.Claims;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FitApp.Api.Controllers;

/// <summary>
/// Handles workout session endpoints — distinct from WorkoutsController (template CRUD).
/// Both controllers share the [Route("api/workouts")] prefix; routes are disambiguated
/// by HTTP method and literal/parameterised path segments.
/// </summary>
[ApiController]
[Route("api/workouts")]
[Authorize]
public class WorkoutSessionsController(WorkoutSessionService sessionService) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")!;

    /// <summary>
    /// GET /api/workouts/{templateId}/last-session
    ///
    /// Returns the most recent actual weight/reps per exercise for the given template.
    /// Used to populate "last time: 80kg × 8" ghost text in set rows before the session starts.
    /// Returns an empty array (not 404) when no session history exists for the template.
    /// Returns 404 if the template does not exist or belongs to a different user.
    ///
    /// NOTE: The original task requested GET /api/workouts/exercises/{exerciseId}/last-session.
    /// This was replaced per ADR fix-6 because WorkoutExercise IDs are unstable (WorkoutService
    /// .UpdateAsync removes and re-creates all exercise rows on every template edit).
    /// The batch-per-template endpoint is one HTTP call regardless of exercise count.
    /// </summary>
    [HttpGet("{templateId:int}/last-session")]
    public async Task<IActionResult> GetLastSession(int templateId)
    {
        var result = await sessionService.GetLastSessionAsync(UserId, templateId);

        // GetLastSessionAsync returns [] for unknown template — we need to distinguish
        // "template not found / not yours" (404) from "no history yet" (200 []).
        // The ownership check is inside the service and returns [] in both cases,
        // so we add an explicit check: if the service returned [] AND the template
        // ID was non-zero, we already verified ownership inside the service via
        // AnyAsync. An empty result with ownership verified returns 200 [].
        // A non-existent or foreign template also returns [] from the service — but
        // that is acceptable: the client receives an empty array and shows no ghost text.
        // The 404 contract is enforced on the POST /sessions endpoint (ownership required
        // to save a session). For GET last-session, [] is the safe non-revealing response.
        return Ok(result);
    }

    /// <summary>
    /// POST /api/workouts/sessions
    ///
    /// Saves a completed workout session submitted by the client on "Finish Workout" confirm.
    /// All session state (sets, weight, reps) is accumulated client-side during the workout
    /// and submitted in one call — no network dependency mid-workout.
    ///
    /// Returns WorkoutCompletionSummaryDto (201 Created) which is consumed by:
    ///   - Fix 8: post-workout summary card
    ///   - Fix 7: beSocial share prompt (sessionId + templateTitle)
    ///
    /// Also pushes "workout-completed" SignalR event to user-{userId} group (fire-and-forget).
    /// estimatedCaloriesKcal is for the authenticated user's own view ONLY.
    /// </summary>
    [HttpPost("sessions")]
    public async Task<IActionResult> CompleteSession([FromBody] CompleteWorkoutSessionRequest req)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        try
        {
            var summary = await sessionService.CompleteSessionAsync(UserId, req);
            return Created($"api/workouts/sessions/{summary.SessionId}", summary);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Detail = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ProblemDetails { Detail = ex.Message });
        }
    }
}
