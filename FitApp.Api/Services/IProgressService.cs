using FitApp.Api.Models.DTOs;

namespace FitApp.Api.Services;

public interface IProgressService
{
    Task<ProgressTrendsDto> GetTrendsAsync(string userId, int window);
    Task<CompleteStreakStatusDto> GetCompleteStreakStatusAsync(string userId);
    Task<NutritionistWeeklyReportDto?> GetWeeklyReportAsync(
        string userId,
        bool forceRefresh = false);
    Task<ProgressSummaryDto> GetSummaryAsync(string userId, int window);
}
