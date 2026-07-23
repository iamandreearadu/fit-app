using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Services;

public class UserService(AppDbContext db, MetricsService metrics, IFileStorageService fileStorage, DailyDataService dailyDataService)
{
    public async Task<bool> DeleteAccountAsync(string userId)
    {
        var user = await db.Users.FindAsync(userId);
        if (user is null) return false;

        await using var transaction = await db.Database.BeginTransactionAsync();

        // Relationships configured with Restrict must be removed explicitly before
        // the user row. Conversations are removed as a whole so no orphaned private
        // chat data remains after either participant deletes their account.
        await db.Follows
            .Where(follow => follow.FollowerId == userId || follow.FollowingId == userId)
            .ExecuteDeleteAsync();
        await db.Notifications
            .Where(notification => notification.ActorId == userId)
            .ExecuteDeleteAsync();
        await db.DirectMessages
            .Where(message => message.SenderId == userId)
            .ExecuteDeleteAsync();
        await db.Conversations
            .Where(conversation => conversation.Participants.Any(participant => participant.UserId == userId))
            .ExecuteDeleteAsync();

        db.Users.Remove(user);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return true;
    }

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
        if (req.ImageUrl is not null)
            user.ImageUrl = await fileStorage.NormalizeImageAsync(req.ImageUrl, "avatars");
        if (req.DietaryPreference is not null) user.DietaryPreference = req.DietaryPreference;
        if (req.OnboardingCompleted.HasValue) user.OnboardingCompleted = req.OnboardingCompleted.Value;

        user.UpdatedAt = DateTime.UtcNow;
        if (user.WeightKg > 0 && user.HeightCm > 0 && user.Age > 0 && !string.IsNullOrEmpty(user.Gender))
            metrics.CalculateAndApply(user);

        await db.SaveChangesAsync();
        return MapToDto(user);
    }

    public async Task<UserPublicStatsResponse?> GetPublicStatsAsync(string userId)
    {
        if (!await db.Users.AnyAsync(u => u.Id == userId)) return null;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var windowStart = today.AddDays(-6);
        var streak = await dailyDataService.GetStreakAsync(userId);
        var activities = await db.DailyEntries
            .Where(d => d.UserId == userId
                && d.Date.CompareTo(windowStart.ToString("yyyy-MM-dd")) >= 0
                && d.Date.CompareTo(today.ToString("yyyy-MM-dd")) <= 0
                && d.ActivityType != null
                && d.ActivityType != ""
                && !d.ActivityType.Contains("Rest"))
            .OrderByDescending(d => d.Date)
            .Select(d => new { d.Id, d.Date, d.ActivityType })
            .ToListAsync();

        var activeDates = activities.Select(d => d.Date).ToHashSet(StringComparer.Ordinal);
        var sevenDayActivity = Enumerable.Range(0, 7)
            .Select(offset =>
            {
                var date = windowStart.AddDays(offset);
                return new WeeklyVolumeDto(date, activeDates.Contains(date.ToString("yyyy-MM-dd")) ? 1 : 0);
            })
            .ToList();
        var recent = activities
            .Select(d => new RecentWorkoutDto(d.Id, d.ActivityType!, DateOnly.Parse(d.Date), 0))
            .ToList();

        // Legacy field names remain in the wire contract for compatibility:
        // WorkoutsThisMonth = active days in the last 7 days; WeeklyVolumes = daily activity flags.
        return new UserPublicStatsResponse(streak.Current, activities.Count, 0, sevenDayActivity, recent);
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
