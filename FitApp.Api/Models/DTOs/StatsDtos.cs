namespace FitApp.Api.Models.DTOs;

public record WeeklyVolumeDto(
    DateOnly WeekStart,
    double VolumeKg
);

public record RecentWorkoutDto(
    int Id,
    string Name,
    DateOnly Date,
    double VolumeKg
);

public record UserPublicStatsResponse(
    int ActiveStreak,
    int WorkoutsThisMonth,
    double VolumeThisMonth,
    List<WeeklyVolumeDto> WeeklyVolumes,
    List<RecentWorkoutDto> RecentWorkouts
);
