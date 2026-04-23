using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Services;

public class UserService(AppDbContext db, MetricsService metrics)
{
    public async Task<UserProfileDto?> GetProfileAsync(string userId)
    {
        var user = await db.Users.FindAsync(userId);
        return user is null ? null : MapToDto(user);
    }

    public async Task<UserProfileDto?> UpdateProfileAsync(string userId, UpdateUserProfileRequest req)
    {
        var user = await db.Users.FindAsync(userId);
        if (user is null) return null;

        if (req.FullName is not null) user.FullName = req.FullName;
        if (req.Gender is not null) user.Gender = req.Gender;
        if (req.Age.HasValue) user.Age = req.Age.Value;
        if (req.HeightCm.HasValue) user.HeightCm = req.HeightCm.Value;
        if (req.WeightKg.HasValue) user.WeightKg = req.WeightKg.Value;
        if (req.Goal is not null) user.Goal = req.Goal;
        if (req.Activity is not null) user.Activity = req.Activity;
        if (req.ImageUrl is not null) user.ImageUrl = req.ImageUrl;
        if (req.DietaryPreference is not null) user.DietaryPreference = req.DietaryPreference;
        if (req.OnboardingCompleted.HasValue) user.OnboardingCompleted = req.OnboardingCompleted.Value;

        user.UpdatedAt = DateTime.UtcNow;

        // Recalculate metrics if we have enough data
        if (user.WeightKg > 0 && user.HeightCm > 0 && user.Age > 0 && !string.IsNullOrEmpty(user.Gender))
            metrics.CalculateAndApply(user);

        await db.SaveChangesAsync();
        return MapToDto(user);
    }

    public async Task<UserPublicStatsResponse?> GetPublicStatsAsync(string userId)
    {
        var userExists = await db.Users.AnyAsync(u => u.Id == userId);
        if (!userExists) return null;

        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);

        // ── Active streak ─────────────────────────────────────────────────────────
        var streakCutoff = today.AddDays(-365).ToString("yyyy-MM-dd");
        var dailyDates = await db.DailyEntries
            .Where(d => d.UserId == userId && string.Compare(d.Date, streakCutoff) >= 0)
            .Select(d => d.Date)
            .ToListAsync();

        var streakCutoffDt = today.AddDays(-365).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var workoutDates = await db.WorkoutTemplates
            .Where(w => w.UserId == userId && !w.IsArchived && w.CreatedAt >= streakCutoffDt)
            .Select(w => w.CreatedAt)
            .ToListAsync();

        var activeDays = new HashSet<DateOnly>();
        foreach (var d in dailyDates)
        {
            if (DateOnly.TryParseExact(d, "yyyy-MM-dd", null,
                    System.Globalization.DateTimeStyles.None, out var parsed))
                activeDays.Add(parsed);
        }
        foreach (var dt in workoutDates)
            activeDays.Add(DateOnly.FromDateTime(dt));

        var streak = 0;
        var cursor = today;
        while (activeDays.Contains(cursor))
        {
            streak++;
            cursor = cursor.AddDays(-1);
        }

        // ── Weekly window: last 8 Monday–Sunday weeks ─────────────────────────────
        var dow = (int)today.DayOfWeek;
        var daysFromMonday = dow == 0 ? 6 : dow - 1;
        var currentMonday = today.AddDays(-daysFromMonday);
        var windowStart = currentMonday.AddDays(-7 * 7);
        var windowStartDt = windowStart.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        var firstOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        // Project only what's needed — no client-side exercise loading
        var workoutsInWindow = await db.WorkoutTemplates
            .Where(w => w.UserId == userId && !w.IsArchived && w.CreatedAt >= windowStartDt)
            .Select(w => new
            {
                w.Id,
                w.Title,
                w.CreatedAt,
                Volume = w.Exercises.Sum(e => (double)(e.Sets * e.Reps) * e.WeightKg)
            })
            .ToListAsync();

        var workoutsThisMonth = await db.WorkoutTemplates
            .Where(w => w.UserId == userId && !w.IsArchived && w.CreatedAt >= firstOfMonth)
            .CountAsync();

        var volumeThisMonth = workoutsInWindow
            .Where(w => w.CreatedAt >= firstOfMonth)
            .Sum(w => w.Volume);

        var weeklyVolumes = new List<WeeklyVolumeDto>(8);
        for (var i = 7; i >= 0; i--)
        {
            var weekStart = currentMonday.AddDays(-7 * i);
            var weekEnd = weekStart.AddDays(7);
            var weekStartDt = weekStart.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var weekEndDt = weekEnd.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

            var weekVolume = workoutsInWindow
                .Where(w => w.CreatedAt >= weekStartDt && w.CreatedAt < weekEndDt)
                .Sum(w => w.Volume);

            weeklyVolumes.Add(new WeeklyVolumeDto(weekStart, weekVolume));
        }

        var recentDtos = workoutsInWindow
            .OrderByDescending(w => w.CreatedAt)
            .Take(5)
            .Select(w => new RecentWorkoutDto(w.Id, w.Title, DateOnly.FromDateTime(w.CreatedAt), w.Volume))
            .ToList();

        return new UserPublicStatsResponse(
            streak,
            workoutsThisMonth,
            volumeThisMonth,
            weeklyVolumes,
            recentDtos
        );
    }

    private static UserProfileDto MapToDto(Models.Entities.User user) => new()
    {
        Id = user.Id,
        Email = user.Email,
        FullName = user.FullName,
        Gender = user.Gender,
        Age = user.Age,
        HeightCm = user.HeightCm,
        WeightKg = user.WeightKg,
        Goal = user.Goal,
        Activity = user.Activity,
        ImageUrl = user.ImageUrl,
        OnboardingCompleted = user.OnboardingCompleted,
        DietaryPreference = user.DietaryPreference,
        UpdatedAt = user.UpdatedAt,
        MetricsUpdatedAt = user.MetricsUpdatedAt,
        Metrics = user.Bmi.HasValue ? new UserMetricsDto
        {
            Bmi = user.Bmi,
            Bmr = user.Bmr,
            Tdee = user.Tdee,
            GoalCalories = user.GoalCalories,
            WaterL = user.WaterL,
            BmiCat = user.BmiCat
        } : null
    };
}
