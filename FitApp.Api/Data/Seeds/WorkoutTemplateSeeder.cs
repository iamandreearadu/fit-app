using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Data.Seeds;

/// <summary>
/// Seeds the 3 system workout templates that appear in the guided empty state
/// for new users who have no personal workout templates yet.
///
/// These templates:
///   - Have IsSystemTemplate = true
///   - Have UserId = null  (no owner — globally accessible)
///   - Are NEVER returned by the standard user-scoped list endpoint
///   - Cannot be edited or deleted by end users
///   - Match the static GUIDED_TEMPLATES data defined in WorkoutsGuidedEmptyComponent
///
/// Seeding is idempotent — checks by title before inserting.
/// </summary>
public static class WorkoutTemplateSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        // Already seeded? Nothing to do.
        if (await db.WorkoutTemplates.AnyAsync(t => t.IsSystemTemplate))
            return;

        var now = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc); // stable seed timestamp

        var pushDay = new WorkoutTemplate
        {
            Title                 = "Push Day",
            Type                  = "Strength",
            DurationMin           = 60,
            CaloriesEstimateKcal  = 320,
            Notes                 = "Chest · Shoulders · Triceps",
            IsSystemTemplate      = true,
            UserId                = null,
            CreatedAt             = now,
            UpdatedAt             = now,
            Exercises =
            [
                new WorkoutExercise { Name = "Bench Press",      Sets = 4, Reps = 10, WeightKg = 60, Order = 0 },
                new WorkoutExercise { Name = "Overhead Press",   Sets = 3, Reps = 10, WeightKg = 40, Order = 1 },
                new WorkoutExercise { Name = "Tricep Pushdowns", Sets = 3, Reps = 12, WeightKg = 20, Order = 2 },
                new WorkoutExercise { Name = "Lateral Raises",   Sets = 3, Reps = 15, WeightKg = 8,  Order = 3 },
                new WorkoutExercise { Name = "Push-ups",         Sets = 3, Reps = 15, WeightKg = 0,  Order = 4 },
            ]
        };

        var pullDay = new WorkoutTemplate
        {
            Title                 = "Pull Day",
            Type                  = "Strength",
            DurationMin           = 55,
            CaloriesEstimateKcal  = 290,
            Notes                 = "Back · Biceps · Rear Delts",
            IsSystemTemplate      = true,
            UserId                = null,
            CreatedAt             = now,
            UpdatedAt             = now,
            Exercises =
            [
                new WorkoutExercise { Name = "Pull-ups",     Sets = 4, Reps = 8,  WeightKg = 0,  Order = 0 },
                new WorkoutExercise { Name = "Barbell Rows", Sets = 4, Reps = 10, WeightKg = 60, Order = 1 },
                new WorkoutExercise { Name = "Lat Pulldown", Sets = 3, Reps = 12, WeightKg = 50, Order = 2 },
                new WorkoutExercise { Name = "Bicep Curls",  Sets = 3, Reps = 12, WeightKg = 15, Order = 3 },
                new WorkoutExercise { Name = "Face Pulls",   Sets = 3, Reps = 15, WeightKg = 12, Order = 4 },
            ]
        };

        var fullBody = new WorkoutTemplate
        {
            Title                 = "Full Body",
            Type                  = "Strength",
            DurationMin           = 70,
            CaloriesEstimateKcal  = 400,
            Notes                 = "Legs · Chest · Back · Shoulders",
            IsSystemTemplate      = true,
            UserId                = null,
            CreatedAt             = now,
            UpdatedAt             = now,
            Exercises =
            [
                new WorkoutExercise { Name = "Back Squats",       Sets = 4, Reps = 10, WeightKg = 80, Order = 0 },
                new WorkoutExercise { Name = "Bench Press",       Sets = 3, Reps = 10, WeightKg = 60, Order = 1 },
                new WorkoutExercise { Name = "Romanian Deadlift", Sets = 3, Reps = 10, WeightKg = 70, Order = 2 },
                new WorkoutExercise { Name = "Pull-ups",          Sets = 3, Reps = 8,  WeightKg = 0,  Order = 3 },
                new WorkoutExercise { Name = "Shoulder Press",    Sets = 3, Reps = 12, WeightKg = 35, Order = 4 },
            ]
        };

        db.WorkoutTemplates.AddRange(pushDay, pullDay, fullBody);
        await db.SaveChangesAsync();
    }
}
