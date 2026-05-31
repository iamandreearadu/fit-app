using FitApp.Api.Data;
using FitApp.Api.Hubs;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Services;

public class WorkoutSessionService(
    AppDbContext db,
    DailyDataService dailyDataService,
    IHubContext<NotificationHub> notifHub,
    ILogger<WorkoutSessionService> logger)
{
    /// <summary>
    /// Returns the most recent actual weight/reps per exercise name for the given template.
    /// Matches by exercise name (not WorkoutExercise.Id) because UpdateAsync removes and
    /// re-creates all WorkoutExercise rows on every template edit, making IDs unstable.
    /// Returns an empty list when the template has no session history — not an error.
    /// </summary>
    public async Task<List<LastSessionDto>> GetLastSessionAsync(string userId, int templateId)
    {
        // Verify template belongs to this user before exposing any session data
        var templateExists = await db.WorkoutTemplates
            .AsNoTracking()
            .AnyAsync(t => t.Id == templateId && t.UserId == userId);

        if (!templateExists) return [];

        // Load the exercise names defined in this template
        var exerciseNames = await db.WorkoutExercises
            .AsNoTracking()
            .Where(e => e.WorkoutTemplateId == templateId)
            .Select(e => e.Name)
            .Distinct()
            .ToListAsync();

        if (exerciseNames.Count == 0) return [];

        // Load all matching sets for this user in one query; group in memory.
        // In-memory grouping is safe: filtered to this user's exercise names only,
        // and the typical workout has 4–8 exercises with bounded session history.
        var allMatchingSets = await db.WorkoutSessionSets
            .AsNoTracking()
            .Where(ss => exerciseNames.Contains(ss.ExerciseName)
                      && ss.WorkoutSession.UserId == userId)
            .Include(ss => ss.WorkoutSession)
            .OrderByDescending(ss => ss.WorkoutSession.FinishedAt)
            .ToListAsync();

        // Per exercise: take the set from the most recent session (already ordered desc)
        return allMatchingSets
            .GroupBy(ss => ss.ExerciseName)
            .Select(g => g.First())
            .Select(ss => new LastSessionDto(
                ExerciseName: ss.ExerciseName,
                LastWeightKg: ss.ActualWeightKg,
                LastReps: ss.ActualReps,
                LastDate: ss.WorkoutSession.FinishedAt.ToString("yyyy-MM-dd")
            ))
            .ToList();
    }

    /// <summary>
    /// Saves a completed workout session and returns a summary DTO.
    /// After DB save, pushes "workout-completed" to the user's notification hub group
    /// (fire-and-forget — SignalR failure never rolls back the DB write).
    ///
    /// estimatedCaloriesKcal is proportional from the template's estimate:
    ///   round(template.CaloriesEstimateKcal × clamp(setsCompleted / totalTargetSets, 0, 1))
    /// No AI call is made; the AI estimator remains available as a separate on-demand action.
    ///
    /// StreakDay is a read-only snapshot — completing a workout does NOT create a DailyEntry
    /// and does NOT increment the streak.
    /// </summary>
    public async Task<WorkoutCompletionSummaryDto> CompleteSessionAsync(
        string userId, CompleteWorkoutSessionRequest req)
    {
        // --- Validation ---------------------------------------------------------
        if (req.FinishedAt < req.StartedAt)
            throw new ArgumentException("finishedAt must be after startedAt");

        if (req.FinishedAt > DateTime.UtcNow.AddMinutes(5))
            throw new ArgumentException("finishedAt is in the future beyond clock-skew tolerance");

        if (req.Sets.Any(s => s.ActualReps < 1))
            throw new ArgumentException("actualReps must be at least 1");

        // --- Load template (ownership check) ------------------------------------
        var template = await db.WorkoutTemplates
            .AsNoTracking()
            .Include(t => t.Exercises)
            .FirstOrDefaultAsync(t => t.Id == req.WorkoutTemplateId && t.UserId == userId)
            ?? throw new KeyNotFoundException(
                $"WorkoutTemplate {req.WorkoutTemplateId} not found for user.");

        // --- Compute summary fields ---------------------------------------------
        var durationMin = (int)Math.Max(1, Math.Round((req.FinishedAt - req.StartedAt).TotalMinutes));

        var totalTargetSets = template.Exercises.Sum(e => e.Sets);
        var setsCompleted = req.Sets.Count;
        var completionRatio = totalTargetSets > 0
            ? Math.Clamp((double)setsCompleted / totalTargetSets, 0.0, 1.0)
            : 1.0;
        var estimatedCalories = (int)Math.Round(template.CaloriesEstimateKcal * completionRatio);
        var exerciseCount = req.Sets.Select(s => s.ExerciseName.Trim()).Distinct().Count();

        // --- Persist session ----------------------------------------------------
        var session = new WorkoutSession
        {
            UserId = userId,
            WorkoutTemplateId = req.WorkoutTemplateId,
            TemplateTitle = template.Title,      // snapshot — survives template deletion/rename
            StartedAt = req.StartedAt,
            FinishedAt = req.FinishedAt,
            DurationMin = durationMin,
            SetsCompleted = setsCompleted,
            EstimatedCaloriesKcal = estimatedCalories,
            Sets = req.Sets.Select(s => new WorkoutSessionSet
            {
                ExerciseName = s.ExerciseName.Trim(),
                SetNumber = s.SetNumber,
                ActualWeightKg = s.ActualWeightKg,
                ActualReps = s.ActualReps
            }).ToList()
        };

        db.WorkoutSessions.Add(session);
        await db.SaveChangesAsync();

        // --- Read streak snapshot (no write) ------------------------------------
        // GetStreakAsync reads DailyEntry rows only — completing a workout has no effect
        // on the streak. This is informational context for the summary card.
        var streak = await dailyDataService.GetStreakAsync(userId);

        var summary = new WorkoutCompletionSummaryDto(
            SessionId: session.Id,
            TemplateTitle: session.TemplateTitle,
            DurationMin: durationMin,
            ExerciseCount: exerciseCount,
            SetsCompleted: setsCompleted,
            EstimatedCaloriesKcal: estimatedCalories,
            StreakDay: streak.Current,
            CompletedAt: session.FinishedAt.ToString("o")
        );

        // --- Fire-and-forget SignalR push ----------------------------------------
        // Pre-computed summary is a plain value record (no DbContext reference).
        // IHubContext<NotificationHub> is singleton — safe to capture in Task.Run.
        // Pushed ONLY to user-{userId} group — never broadcast to followers.
        _ = Task.Run(() => PushWorkoutCompletedAsync(userId, summary));

        return summary;
    }

    // Pushes "workout-completed" to the user's notification hub group.
    // Wrapped in try/catch: SignalR failure must NEVER surface to the caller or
    // roll back the already-committed DB write.
    private async Task PushWorkoutCompletedAsync(string userId, WorkoutCompletionSummaryDto dto)
    {
        try
        {
            await notifHub.Clients
                .Group($"user-{userId}")
                .SendAsync("workout-completed", dto);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "Failed to push workout-completed to user {UserId} — SignalR delivery failed",
                userId);
        }
    }
}
