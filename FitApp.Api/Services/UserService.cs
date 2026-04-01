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

        user.UpdatedAt = DateTime.UtcNow;

        // Recalculate metrics if we have enough data
        if (user.WeightKg > 0 && user.HeightCm > 0 && user.Age > 0 && !string.IsNullOrEmpty(user.Gender))
            metrics.CalculateAndApply(user);

        await db.SaveChangesAsync();
        return MapToDto(user);
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
