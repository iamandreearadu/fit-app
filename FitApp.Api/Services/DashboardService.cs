using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace FitApp.Api.Services;

public interface IDashboardService
{
    Task<DashboardTodayDto> GetTodayAsync(string userId);
    Task<AiInsightDto> GetAiInsightAsync(string userId);
    Task<PostGridPageDto> GetActivityGridAsync(string targetUserId, int page, int pageSize);
}

public class DashboardService(
    AppDbContext db,
    DailyDataService dailyDataService,
    AiProxyService aiProxy,
    IMemoryCache cache,
    ILogger<DashboardService> logger) : IDashboardService
{
    // ── GET /api/dashboard/today ──────────────────────────────────────────────
    //
    // Single aggregated read: combines User profile, DailyEntry, MealEntry sums,
    // and WorkoutSession weekly grid into one response.
    //
    // Date is always UTC today — no ?date= parameter (prevents date-spoofing,
    // simplifies caching). Historical data lives in GET /api/daily/history.

    public async Task<DashboardTodayDto> GetTodayAsync(string userId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var todayStr = today.ToString("yyyy-MM-dd");

        // Week boundaries (Mon–Sun ISO week)
        var dayOfWeek = (int)today.DayOfWeek;                      // Sunday=0 … Saturday=6
        var daysFromMonday = dayOfWeek == 0 ? 6 : dayOfWeek - 1;
        var weekStart = today.AddDays(-daysFromMonday);
        var weekEnd = weekStart.AddDays(6);

        // ── Fire DB queries in parallel ───────────────────────────────────────

        var userTask = db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new
            {
                u.WeightKg,
                u.GoalCalories,
                u.WaterL,
                u.Goal
            })
            .FirstOrDefaultAsync();

        var dailyEntryTask = db.DailyEntries
            .AsNoTracking()
            .Where(d => d.UserId == userId && d.Date == todayStr)
            .Select(d => new
            {
                d.Steps,
                d.StepTarget,
                d.WaterConsumedL,
                d.CaloriesBurned,
            })
            .FirstOrDefaultAsync();

        var mealTotalsTask = db.MealEntries
            .AsNoTracking()
            .Where(m => m.UserId == userId && m.Date == todayStr)
            .GroupBy(m => 1)
            .Select(g => new
            {
                TotalCalories = g.Sum(m => m.TotalCalories),
                TotalProtein  = g.Sum(m => m.TotalProtein_g),
                TotalCarbs    = g.Sum(m => m.TotalCarbs_g),
                TotalFats     = g.Sum(m => m.TotalFats_g)
            })
            .FirstOrDefaultAsync();

        var weekSessionsTask = db.WorkoutSessions
            .AsNoTracking()
            .Where(s => s.UserId == userId
                && DateOnly.FromDateTime(s.FinishedAt) >= weekStart
                && DateOnly.FromDateTime(s.FinishedAt) <= weekEnd)
            .Select(s => new
            {
                s.FinishedAt,
                s.DurationMin,
                DayOfWeek = s.FinishedAt.DayOfWeek
            })
            .ToListAsync();

        // Streak: delegated to DailyDataService — single source of truth.
        // DashboardService MUST NOT reimplement streak counting here.
        var streakTask = dailyDataService.GetStreakAsync(userId);

        await Task.WhenAll(userTask, dailyEntryTask, mealTotalsTask, weekSessionsTask, streakTask);

        var user        = await userTask;
        var entry       = await dailyEntryTask;
        var mealTotals  = await mealTotalsTask;
        var weekSessions = await weekSessionsTask;
        var streak      = await streakTask;

        // ── Goal calorie baseline ─────────────────────────────────────────────
        // Read from User.GoalCalories (persisted by MetricsService.CalculateAndApply).
        // DashboardService is read-only — never calls MetricsService here.
        var goalCalories = (int)Math.Round(user?.GoalCalories ?? 2000.0);

        // ── Calorie balance ───────────────────────────────────────────────────
        var eaten   = (int)Math.Round(mealTotals?.TotalCalories ?? 0.0);
        var burned  = entry?.CaloriesBurned ?? 0;
        var net     = eaten - burned;
        var remaining = Math.Max(0, goalCalories - net);

        var calorieBalance = new CalorieBalanceDto
        {
            Eaten     = eaten,
            Burned    = burned,
            Goal      = goalCalories,
            Net       = net,
            Remaining = remaining,
            OnTrack   = net <= goalCalories
        };

        // ── Macro targets (30 / 45 / 25 split, single source of truth) ───────
        // Moving derivation server-side so frontend never recomputes.
        // Formula: protein = round(goalCal × 0.30 / 4), carbs = round(goalCal × 0.45 / 4),
        //          fat     = round(goalCal × 0.25 / 9)
        var proteinTarget = Math.Round(goalCalories * 0.30 / 4, 1);
        var carbsTarget   = Math.Round(goalCalories * 0.45 / 4, 1);
        var fatTarget     = Math.Round(goalCalories * 0.25 / 9, 1);

        var macros = new List<MacroProgressItemDto>(3)
        {
            new() { Name = "Protein", Consumed = Math.Round(mealTotals?.TotalProtein ?? 0.0, 1), Target = proteinTarget, Unit = "g" },
            new() { Name = "Carbs",   Consumed = Math.Round(mealTotals?.TotalCarbs   ?? 0.0, 1), Target = carbsTarget,   Unit = "g" },
            new() { Name = "Fat",     Consumed = Math.Round(mealTotals?.TotalFats    ?? 0.0, 1), Target = fatTarget,     Unit = "g" }
        };

        // ── Ring metrics ──────────────────────────────────────────────────────

        // BURNED RING: counter — no synthetic burn target exists on User.
        // Goal = 0 signals to the frontend that this ring has no fill arc.
        var burnedRing = new RingMetricDto
        {
            Value = burned,
            Goal  = 0,
            Unit  = "kcal"
        };

        // WATER RING: value in ml, goal = User.WaterL × 1000 (fallback 2000 ml).
        var waterGoalMl = (int)Math.Round((user?.WaterL ?? 2.0) * 1000);
        var waterMl     = (int)Math.Round((entry?.WaterConsumedL ?? 0.0) * 1000);
        var waterRing   = new RingMetricDto
        {
            Value = waterMl,
            Goal  = waterGoalMl,
            Unit  = "ml"
        };

        // STEPS RING: value from DailyEntry.Steps, goal from DailyEntry.StepTarget (fallback 3000).
        var stepsValue = entry?.Steps ?? 0;
        var stepsGoal  = entry?.StepTarget ?? 3000;
        var stepsRing  = new RingMetricDto
        {
            Value = stepsValue,
            Goal  = stepsGoal,
            Unit  = "steps"
        };

        // ── Streak (delegated — never recomputed here) ────────────────────────
        var streakDto = new DashboardStreakDto
        {
            Current = streak.Current,
            Best    = streak.Longest
        };

        // ── Meta ──────────────────────────────────────────────────────────────
        var statusBadge = (user?.Goal?.ToLowerInvariant()) switch
        {
            "lose"     => "CUTTING",
            "gain"     => "BULKING",
            _          => "MAINTENANCE"
        };

        var meta = new DashboardMetaDto
        {
            Date        = todayStr,
            StatusBadge = statusBadge
        };

        // ── Weekly workouts grid (Mon–Sun) ────────────────────────────────────
        var dayLabels = new[] { "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" };
        var days = new List<DayWorkoutDto>(7);

        for (int i = 0; i < 7; i++)
        {
            var day = weekStart.AddDays(i);
            var sessionsOnDay = weekSessions
                .Where(s => DateOnly.FromDateTime(s.FinishedAt) == day)
                .ToList();

            days.Add(new DayWorkoutDto
            {
                DayLabel        = dayLabels[i],
                HasWorkout      = sessionsOnDay.Count > 0,
                DurationMinutes = sessionsOnDay.Sum(s => s.DurationMin),
                IsToday         = day == today
            });
        }

        DateTime? lastWorkoutAt = weekSessions.Count > 0
            ? weekSessions.Max(s => s.FinishedAt)
            : null;

        var weeklyWorkouts = new WeeklyWorkoutsDto
        {
            Days          = days,
            LastWorkoutAt = lastWorkoutAt,
            TotalThisWeek = weekSessions.Count
        };

        // ── Assemble top-level DTO ────────────────────────────────────────────
        return new DashboardTodayDto
        {
            CalorieBalance = calorieBalance,
            Macros         = macros,
            Burned         = burnedRing,
            Water          = waterRing,
            Steps          = stepsRing,
            Streak         = streakDto,
            Meta           = meta,
            WeeklyWorkouts = weeklyWorkouts
        };
    }

    // ── GET /api/dashboard/ai-insight ────────────────────────────────────────
    // Kept unchanged: separate endpoint, cached per user per day,
    // external Groq call — deliberately not bundled into GetTodayAsync
    // so the main dashboard does not block on AI latency.

    public async Task<AiInsightDto> GetAiInsightAsync(string userId)
    {
        var cacheKey = $"ai-insight:{userId}:{DateTime.UtcNow:yyyyMMdd}";

        if (cache.TryGetValue(cacheKey, out AiInsightDto? cached) && cached is not null)
        {
            logger.LogDebug("AI insight cache hit for user {UserId}", userId);
            return cached;
        }

        // Gather context data for the prompt (no health metrics — operational data only)
        var today    = DateOnly.FromDateTime(DateTime.UtcNow);
        var todayStr = today.ToString("yyyy-MM-dd");

        var dayOfWeek = (int)today.DayOfWeek;
        var daysFromMonday = dayOfWeek == 0 ? 6 : dayOfWeek - 1;
        var weekStart = today.AddDays(-daysFromMonday);
        var weekEnd   = weekStart.AddDays(6);

        var caloriesConsumed = (int)Math.Round(
            await db.MealEntries
                .Where(m => m.UserId == userId && m.Date == todayStr)
                .SumAsync(m => m.TotalCalories));

        var workoutsThisWeek = await db.WorkoutSessions
            .Where(s => s.UserId == userId
                && DateOnly.FromDateTime(s.FinishedAt) >= weekStart
                && DateOnly.FromDateTime(s.FinishedAt) <= weekEnd)
            .CountAsync();

        // Streak — reuse GetStreakAsync to avoid a third independent implementation.
        // (GetAiInsightAsync is intentionally kept simple; full parallelism is not
        // needed here because AI latency dominates the response time.)
        var streak = await dailyDataService.GetStreakAsync(userId);

        var prompt = $"You are a fitness coach. In exactly one motivational sentence (max 120 characters), " +
                     $"give today's insight for a user who has consumed {caloriesConsumed} kcal, " +
                     $"done {workoutsThisWeek} workouts this week, and is on a {streak.Current}-day streak. " +
                     $"Be specific and positive.";

        string insight;
        try
        {
            var aiRequest = new AiTextRequest
            {
                Prompt        = prompt,
                SystemPrompt  = null,
                ModuleContext = null
            };

            var response = await aiProxy.AskTextAsync(aiRequest, userId);
            insight = response.Content?.Trim() ?? "Keep going — every logged day builds your streak!";

            // Trim to 120 chars if the model exceeded the limit
            if (insight.Length > 120)
                insight = insight[..117] + "...";
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "AI insight generation failed for user {UserId}, using fallback.", userId);
            insight = "Stay consistent — small daily wins compound into big results!";
        }

        var dto = new AiInsightDto
        {
            Insight     = insight,
            GeneratedAt = DateTime.UtcNow
        };

        // Cache until midnight UTC tonight
        cache.Set(cacheKey, dto, new MemoryCacheEntryOptions
        {
            AbsoluteExpiration = DateTime.UtcNow.Date.AddDays(1)
        });

        return dto;
    }

    // ── GET /api/users/{id}/activity-grid ────────────────────────────────────
    // Kept unchanged. Lean projection — zero calorie/weight/health data.

    public async Task<PostGridPageDto> GetActivityGridAsync(string targetUserId, int page, int pageSize)
    {
        pageSize = Math.Min(pageSize, 9);

        var raw = await db.Posts
            .AsNoTracking()
            .Where(p => p.UserId == targetUserId
                && !p.IsArchived
                && p.LinkedWorkoutId != null)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize + 1)   // +1 to determine HasMore without a second COUNT query
            .Select(p => new
            {
                p.Id,
                p.ImageUrl,
                p.CreatedAt,
                WorkoutType = p.LinkedWorkout != null ? p.LinkedWorkout.Type : null,
                DurationMin = p.LinkedWorkout != null ? (int?)p.LinkedWorkout.DurationMin : null
            })
            .ToListAsync();

        var hasMore = raw.Count > pageSize;
        var items = raw.Take(pageSize).Select(p => new PostGridItemDto
        {
            PostId      = p.Id,
            WorkoutType = p.WorkoutType,
            DurationMin = p.DurationMin,
            CreatedAt   = p.CreatedAt,
            ThumbnailUrl = p.ImageUrl
        }).ToList();

        return new PostGridPageDto
        {
            Items   = items,
            HasMore = hasMore,
            Page    = page
        };
    }
}
