using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Services;

public class NutritionService(AppDbContext db)
{
    public async Task<List<MealEntryDto>> ListAsync(string userId)
    {
        var meals = await db.MealEntries
            .Include(m => m.Items.OrderBy(f => f.Order))
            .Where(m => m.UserId == userId)
            .OrderByDescending(m => m.UpdatedAt)
            .ToListAsync();
        return meals.Select(MapToDto).ToList();
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
            Fats_g = f.Fats_g
        }).ToList()
    };
}
