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

    public async Task<List<DailyEntryDto>> GetAllAsync(string userId)
    {
        var entries = await db.DailyEntries
            .Where(d => d.UserId == userId)
            .OrderByDescending(d => d.Date)
            .ToListAsync();
        return entries.Select(MapToDto).ToList();
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
