using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Services;

public class NutritionService(AppDbContext db)
{
    private static readonly HashSet<string> ValidSources =
        ["search", "recent", "manual", "ai_analyzer"];
    public async Task<(List<MealEntryDto> Items, bool HasMore)> ListAsync(string userId, int page = 1, int pageSize = 20)
    {
        pageSize = Math.Min(pageSize, 50);
        var query = db.MealEntries
            .AsNoTracking()
            .Include(m => m.Items.OrderBy(f => f.Order))
            .Where(m => m.UserId == userId)
            .OrderByDescending(m => m.UpdatedAt);
        var total = await query.CountAsync();
        var meals = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        return (meals.Select(MapToDto).ToList(), page * pageSize < total);
    }

    public async Task<MealEntryDto> CreateAsync(string userId, SaveMealRequest req)
    {
        var meal = new MealEntry
        {
            UserId = userId,
            Name = req.Name,
            Type = req.Type,
            Date = req.Date,
            Notes = req.Notes
        };

        ApplyItemsAndTotals(meal, req.Items);
        db.MealEntries.Add(meal);
        await db.SaveChangesAsync();
        return MapToDto(meal);
    }

    public async Task<MealEntryDto?> UpdateAsync(string userId, int id, SaveMealRequest req)
    {
        var meal = await db.MealEntries
            .Include(m => m.Items)
            .FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId);

        if (meal is null) return null;

        meal.Name = req.Name;
        meal.Type = req.Type;
        meal.Date = req.Date;
        meal.Notes = req.Notes;
        meal.UpdatedAt = DateTime.UtcNow;

        db.FoodItems.RemoveRange(meal.Items);
        meal.Items.Clear();
        ApplyItemsAndTotals(meal, req.Items);

        await db.SaveChangesAsync();
        return MapToDto(meal);
    }

    public async Task<bool> DeleteAsync(string userId, int id)
    {
        var meal = await db.MealEntries.FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId);
        if (meal is null) return false;
        db.MealEntries.Remove(meal);
        await db.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Returns today's logged macro totals (summed from MealEntry rows for today's UTC date)
    /// vs TDEE-derived macro targets (computed from user.GoalCalories).
    ///
    /// Macro targets use the standard 30 / 40 / 30 split:
    ///   Protein  30 % of GoalCalories / 4 kcal/g
    ///   Carbs    40 % of GoalCalories / 4 kcal/g
    ///   Fat      30 % of GoalCalories / 9 kcal/g
    ///
    /// All target fields are 0 when the user has not set their physical profile (GoalCalories is null).
    /// Date filter uses the UTC date string "yyyy-MM-dd" to match MealEntry.Date exactly.
    /// </summary>
    public async Task<MacroProgressDto> GetTodayMacroProgressAsync(string userId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");

        // Aggregate today's meal totals in a single DB round-trip.
        // GroupBy(1) collapses all rows into one aggregate row; returns null when no rows exist.
        var totals = await db.MealEntries
            .AsNoTracking()
            .Where(m => m.UserId == userId && m.Date == today)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                TotalProtein  = g.Sum(m => m.TotalProtein_g),
                TotalCarbs    = g.Sum(m => m.TotalCarbs_g),
                TotalFat      = g.Sum(m => m.TotalFats_g),
                TotalCalories = g.Sum(m => m.TotalCalories)
            })
            .FirstOrDefaultAsync();

        // Load only GoalCalories — no need to materialise the full User entity.
        var goalCalories = await db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.GoalCalories)
            .FirstOrDefaultAsync();

        var targetKcal = goalCalories ?? 0.0;

        // Derive per-macro gram targets from GoalCalories using a 30 / 40 / 30 split.
        // Rounded to one decimal place — consistent with frontend display precision.
        var targetProtein = Math.Round(targetKcal * 0.30 / 4.0, 1);
        var targetCarbs   = Math.Round(targetKcal * 0.40 / 4.0, 1);
        var targetFat     = Math.Round(targetKcal * 0.30 / 9.0, 1);

        return new MacroProgressDto(
            TotalProtein:  Math.Round(totals?.TotalProtein  ?? 0.0, 1),
            TargetProtein: targetProtein,
            TotalCarbs:    Math.Round(totals?.TotalCarbs    ?? 0.0, 1),
            TargetCarbs:   targetCarbs,
            TotalFat:      Math.Round(totals?.TotalFat      ?? 0.0, 1),
            TargetFat:     targetFat,
            TotalCalories: Math.Round(totals?.TotalCalories ?? 0.0, 1),
            TargetCalories: Math.Round(targetKcal, 1)
        );
    }

    private static void ApplyItemsAndTotals(MealEntry meal, List<FoodItemDto> items)
    {
        meal.Items = items.Select((f, i) => new FoodItem
        {
            Name = f.Name,
            Grams = f.Grams,
            Calories = f.Calories,
            Protein_g = f.Protein_g,
            Carbs_g = f.Carbs_g,
            Fats_g = f.Fats_g,
            Source = f.Source is not null && ValidSources.Contains(f.Source) ? f.Source : null,
            Order = i
        }).ToList();

        meal.TotalGrams = items.Sum(f => f.Grams);
        meal.TotalCalories = items.Sum(f => f.Calories);
        meal.TotalProtein_g = items.Sum(f => f.Protein_g);
        meal.TotalCarbs_g = items.Sum(f => f.Carbs_g);
        meal.TotalFats_g = items.Sum(f => f.Fats_g);
    }

    private static MealEntryDto MapToDto(MealEntry m) => new()
    {
        Id = m.Id,
        Name = m.Name,
        Type = m.Type,
        Date = m.Date,
        Notes = m.Notes,
        TotalGrams = m.TotalGrams,
        TotalCalories = m.TotalCalories,
        TotalProtein_g = m.TotalProtein_g,
        TotalCarbs_g = m.TotalCarbs_g,
        TotalFats_g = m.TotalFats_g,
        CreatedAt = m.CreatedAt,
        UpdatedAt = m.UpdatedAt,
        Items = m.Items.OrderBy(f => f.Order).Select(f => new FoodItemDto
        {
            Name = f.Name,
            Grams = f.Grams,
            Calories = f.Calories,
            Protein_g = f.Protein_g,
            Carbs_g = f.Carbs_g,
            Fats_g = f.Fats_g,
            Source = f.Source   // Fix 1
        }).ToList()
    };
}
