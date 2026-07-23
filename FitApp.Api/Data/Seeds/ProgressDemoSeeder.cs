using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Data.Seeds;

/// <summary>
/// Keeps the Maria demo account ready to showcase the Progress experience.
/// The seed is deliberately incremental so it also works with an existing local database.
/// </summary>
public static class ProgressDemoSeeder
{
    private const string DemoEmail = "maria@novafit.com";

    private static readonly string[] Activities =
    [
        "Strength Training",
        "Cardio",
        "Active Rest Day",
        "Strength Training",
        "Rest Day",
        "Cardio",
        "Active Rest Day"
    ];

    private static readonly int[] Calories = [1940, 1875, 2010, 1920, 1810, 1985, 1895];
    private static readonly double[] Water = [2.5, 2.4, 2.7, 2.3, 2.5, 2.6, 2.4];
    private static readonly int[] Steps = [9_250, 8_430, 10_120, 7_980, 8_760, 11_340, 9_610];
    private static readonly int[] Energy = [4, 4, 5, 3, 4, 5, 4];

    public static async Task SeedAsync(AppDbContext db)
    {
        var maria = await db.Users
            .SingleOrDefaultAsync(user => user.Email == DemoEmail);

        if (maria is null)
            return;

        var today = DateTime.UtcNow.Date;

        for (var offset = 0; offset < 7; offset++)
        {
            var day = today.AddDays(-offset);
            var date = day.ToString("yyyy-MM-dd");
            var daily = await db.DailyEntries
                .SingleOrDefaultAsync(entry => entry.UserId == maria.Id && entry.Date == date);

            if (daily is null)
            {
                daily = new DailyEntry
                {
                    UserId = maria.Id,
                    Date = date
                };
                db.DailyEntries.Add(daily);
            }

            daily.ActivityType = Activities[offset];
            daily.WaterConsumedL = Water[offset];
            daily.Steps = Steps[offset];
            daily.StepTarget = 8_000;
            daily.CaloriesIntake = Calories[offset];
            daily.CaloriesBurned = Activities[offset] == "Rest Day" ? 220 : 320 + offset * 12;
            daily.CaloriesTotal = daily.CaloriesIntake - daily.CaloriesBurned;
            daily.MacrosProtein = 25;
            daily.MacrosCarbs = 48;
            daily.MacrosFats = 27;
            daily.ManualWeight = Math.Round(58.1 + offset * 0.1, 1);
            daily.EnergyLevel = Energy[offset];
            daily.UpdatedAt = day.AddHours(20);

            await SeedNutritionForDayAsync(db, maria.Id, date, Calories[offset], day);
        }

        await db.SaveChangesAsync();
    }

    private static async Task SeedNutritionForDayAsync(
        AppDbContext db,
        string userId,
        string date,
        int calorieTarget,
        DateTime day)
    {
        var existingCalories = await db.MealEntries
            .Where(meal =>
                meal.UserId == userId
                && meal.Date == date
                && !meal.IsSavedMeal)
            .SumAsync(meal => meal.TotalCalories);

        var remainingCalories = Math.Max(0, calorieTarget - existingCalories);
        if (remainingCalories < 25)
            return;

        var existingMeals = await db.MealEntries
            .CountAsync(meal =>
                meal.UserId == userId
                && meal.Date == date
                && !meal.IsSavedMeal);

        if (existingMeals == 0)
        {
            AddMeal(db, userId, date, day, "Protein oats & berries", "Breakfast", remainingCalories * 0.27);
            AddMeal(db, userId, date, day, "Mediterranean chicken bowl", "Lunch", remainingCalories * 0.38);
            AddMeal(db, userId, date, day, "Salmon rice plate", "Dinner", remainingCalories * 0.35);
            return;
        }

        AddMeal(db, userId, date, day, "Progress nutrition balance", "Snack", remainingCalories);
    }

    private static void AddMeal(
        AppDbContext db,
        string userId,
        string date,
        DateTime day,
        string name,
        string type,
        double calories)
    {
        var roundedCalories = Math.Round(calories);
        var protein = Math.Round(roundedCalories * 0.25 / 4, 1);
        var carbs = Math.Round(roundedCalories * 0.48 / 4, 1);
        var fats = Math.Round(roundedCalories * 0.27 / 9, 1);

        db.MealEntries.Add(new MealEntry
        {
            UserId = userId,
            Name = name,
            Type = type,
            Date = date,
            TotalGrams = Math.Round(roundedCalories * 0.55),
            TotalCalories = roundedCalories,
            TotalProtein_g = protein,
            TotalCarbs_g = carbs,
            TotalFats_g = fats,
            Notes = "NovaFit Progress demo data",
            IsSavedMeal = false,
            IsHiddenFromProfile = true,
            CreatedAt = day.AddHours(type == "Breakfast" ? 8 : type == "Lunch" ? 13 : 19),
            UpdatedAt = day.AddHours(20),
            Items =
            [
                new FoodItem
                {
                    Name = name,
                    Grams = Math.Round(roundedCalories * 0.55),
                    Calories = roundedCalories,
                    Protein_g = protein,
                    Carbs_g = carbs,
                    Fats_g = fats,
                    Order = 1,
                    Source = "seed"
                }
            ]
        });
    }
}
