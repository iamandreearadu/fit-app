using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Services;

public class DailyDataService(AppDbContext db)
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
        entry.CaloriesIntake = req.CaloriesIntake;
        entry.CaloriesTotal = req.CaloriesIntake - req.CaloriesBurned;
        entry.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return MapToDto(entry);
    }

    public async Task<(List<DailyEntryDto> Items, bool HasMore)> GetAllAsync(string userId, int page = 1, int pageSize = 30)
    {
        pageSize = Math.Min(pageSize, 90);
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

    public async Task<StreakDto> GetStreakAsync(string userId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var rawDates = await db.DailyEntries
            .Where(d => d.UserId == userId)
            .Select(d => d.Date)
            .ToListAsync();

        if (rawDates.Count == 0)
            return new StreakDto(0, 0, false, false);

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
        var atRisk = !loggedToday && current > 0 && DateTime.UtcNow.Hour >= 18;

        return new StreakDto(current, longest, loggedToday, atRisk);
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
