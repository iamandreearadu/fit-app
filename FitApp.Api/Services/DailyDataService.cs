using FitApp.Api.Data;
using FitApp.Api.Hubs;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Services;

public class DailyDataService(
    AppDbContext db,
    IHubContext<NotificationHub> notifHub,
    ILogger<DailyDataService> logger)
{
    public async Task<DailyEntryDto?> GetForDateAsync(string userId, string date)
    {
        var entry = await db.DailyEntries
            .FirstOrDefaultAsync(d => d.UserId == userId && d.Date == date);
        return entry is null ? null : MapToDto(entry);
    }

    public async Task<DailyEntryDto> SaveForDateAsync(string userId, SaveDailyEntryRequest req)
    {
        var entry = await db.DailyEntries
            .FirstOrDefaultAsync(d => d.UserId == userId && d.Date == req.Date);

        if (entry is null)
        {
            entry = new DailyEntry { UserId = userId, Date = req.Date };
            db.DailyEntries.Add(entry);
        }

        entry.ActivityType = req.ActivityType;
        entry.WaterConsumedL = req.WaterConsumedL;
        entry.Steps = req.Steps;
        entry.StepTarget = req.StepTarget;
        entry.MacrosProtein = req.MacrosPct.Protein;
        entry.MacrosCarbs = req.MacrosPct.Carbs;
        entry.MacrosFats = req.MacrosPct.Fats;
        entry.CaloriesBurned = req.CaloriesBurned;

        // Fix 10: CaloriesIntake is always server-computed from MealEntries — never from client.
        var mealCalories = await db.MealEntries
            .Where(m => m.UserId == userId && m.Date == req.Date)
            .SumAsync(m => m.TotalCalories);
        entry.CaloriesIntake = (int)Math.Round(mealCalories);
        entry.CaloriesTotal = entry.CaloriesIntake - req.CaloriesBurned;

        entry.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        // Pre-compute streak inside the request scope (AppDbContext is scoped and will
        // be disposed after this method returns). Only the SignalR push is fire-and-forget.
        var streakDto = await GetUserStreakAsync(userId);
        _ = Task.Run(() => PushStreakUpdatedAsync(userId, streakDto));

        return MapToDto(entry);
    }

    public async Task<(List<DailyEntryDto> Items, bool HasMore)> GetAllAsync(string userId, int page = 1, int pageSize = 30)
    {
        pageSize = Math.Min(pageSize, 50);
        var query = db.DailyEntries
            .Where(d => d.UserId == userId)
            .OrderByDescending(d => d.Date);
        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        return (items.Select(MapToDto).ToList(), page * pageSize < total);
    }

    // Used by GET /api/daily/today/summary (Fix 10)
    // Returns today's daily entry enriched with live-computed nutrition totals from MealEntries.
    // CaloriesFromNutritionLog is ALWAYS server-computed — private to the authenticated user.
    public async Task<DailyEntrySummaryDto> GetTodaySummaryAsync(string userId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var entry = await db.DailyEntries
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.UserId == userId && d.Date == today.ToString("yyyy-MM-dd"));

        var nutritionTotals = await db.MealEntries
            .Where(m => m.UserId == userId && m.Date == today.ToString("yyyy-MM-dd"))
            .GroupBy(m => 1)
            .Select(g => new
            {
                TotalCalories = g.Sum(m => m.TotalCalories),
                TotalProtein  = g.Sum(m => m.TotalProtein_g),
                TotalCarbs    = g.Sum(m => m.TotalCarbs_g),
                TotalFats     = g.Sum(m => m.TotalFats_g),
                MealCount     = g.Count()
            })
            .FirstOrDefaultAsync();

        var caloriesFromLog = nutritionTotals?.TotalCalories ?? 0;
        var caloriesBurned  = entry?.CaloriesBurned ?? 0;

        return new DailyEntrySummaryDto
        {
            Date                     = today.ToString("yyyy-MM-dd"),
            CaloriesFromNutritionLog = caloriesFromLog,
            ProteinFromNutritionLog_g = nutritionTotals?.TotalProtein ?? 0,
            CarbsFromNutritionLog_g  = nutritionTotals?.TotalCarbs    ?? 0,
            FatsFromNutritionLog_g   = nutritionTotals?.TotalFats     ?? 0,
            MealCount                = nutritionTotals?.MealCount     ?? 0,
            ActivityType             = entry?.ActivityType,
            WaterConsumedL           = entry?.WaterConsumedL           ?? 0,
            Steps                    = entry?.Steps                    ?? 0,
            StepTarget               = entry?.StepTarget               ?? 3000,
            CaloriesBurned           = caloriesBurned,
            CaloriesTotal            = (int)Math.Round(caloriesFromLog) - caloriesBurned,
            MacrosPct = new MacrosPctDto
            {
                Protein = entry?.MacrosProtein ?? 0,
                Carbs   = entry?.MacrosCarbs   ?? 0,
                Fats    = entry?.MacrosFats    ?? 0,
            },
            UpdatedAt = entry?.UpdatedAt ?? DateTime.MinValue,
        };
    }

    // Used by GET /api/daily/streak (Dashboard widget — unchanged contract)
    public async Task<StreakDto> GetStreakAsync(string userId)
    {
        var (_, current, longest, loggedToday, atRisk) = await ComputeStreakCoreAsync(userId);
        return new StreakDto(current, longest, loggedToday, atRisk);
    }

    // Used by GET /api/users/me/streak (navigation badge) and PushStreakUpdatedAsync
    public async Task<UserStreakDto> GetUserStreakAsync(string userId)
    {
        var (dateSet, current, longest, loggedToday, atRisk) = await ComputeStreakCoreAsync(userId);
        var lastLogDate = dateSet.Count > 0 ? dateSet.Max().ToString("yyyy-MM-dd") : null;
        var isNewRecord = current > 0 && current == longest;
        return new UserStreakDto(current, lastLogDate, atRisk, loggedToday, isNewRecord);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    // Shared streak computation; eliminates duplication between GetStreakAsync and
    // GetUserStreakAsync. Returns the full DateSet so callers can derive extra fields
    // (e.g. lastLogDate = dateSet.Max()) without a second DB round-trip.
    private async Task<(HashSet<DateOnly> DateSet, int Current, int Longest, bool LoggedToday, bool AtRisk)>
        ComputeStreakCoreAsync(string userId)
    {
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);

        var rawDates = await db.DailyEntries
            .Where(d => d.UserId == userId)
            .Select(d => d.Date)
            .ToListAsync();

        if (rawDates.Count == 0)
            return ([], 0, 0, false, false);

        var dateSet = rawDates
            .Select(d => DateOnly.Parse(d))
            .ToHashSet();

        var loggedToday = dateSet.Contains(today);

        // Current streak — count backwards from today (or yesterday if no entry today)
        int current = 0;
        var cursor = loggedToday ? today : today.AddDays(-1);
        while (dateSet.Contains(cursor))
        {
            current++;
            cursor = cursor.AddDays(-1);
        }

        // Longest streak — find the longest consecutive run
        var sorted = dateSet.OrderBy(d => d).ToList();
        int longest = 1, run = 1;
        for (int i = 1; i < sorted.Count; i++)
        {
            if (sorted[i] == sorted[i - 1].AddDays(1)) { run++; if (run > longest) longest = run; }
            else run = 1;
        }
        longest = Math.Max(longest, current);

        // At risk: active streak, no entry today, and it's past 18:00 UTC
        var atRisk = !loggedToday && current > 0 && now.Hour >= 18;

        return (dateSet, current, longest, loggedToday, atRisk);
    }

    // Fire-and-forget: pushes streak-updated to the user's notification hub group.
    // Only IHubContext is used here — it is singleton and safe to capture in Task.Run.
    // The DTO is pre-computed in the request scope (see SaveForDateAsync) to avoid
    // using a disposed AppDbContext on the thread pool thread.
    private async Task PushStreakUpdatedAsync(string userId, UserStreakDto dto)
    {
        try
        {
            await notifHub.Clients
                .Group($"user-{userId}")
                .SendAsync("streak-updated", new { currentStreak = dto.CurrentStreak, isNewRecord = dto.IsNewRecord });
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to push streak-updated to user {UserId} — SignalR delivery failed", userId);
        }
    }

    private static DailyEntryDto MapToDto(DailyEntry e) => new()
    {
        Date = e.Date,
        ActivityType = e.ActivityType,
        WaterConsumedL = e.WaterConsumedL,
        Steps = e.Steps,
        StepTarget = e.StepTarget,
        MacrosPct = new MacrosPctDto { Protein = e.MacrosProtein, Carbs = e.MacrosCarbs, Fats = e.MacrosFats },
        CaloriesBurned = e.CaloriesBurned,
        CaloriesIntake = e.CaloriesIntake,
        CaloriesTotal = e.CaloriesTotal,
        UpdatedAt = e.UpdatedAt
    };
}
