using System.Security.Claims;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace FitApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProgressController(
    IProgressService progressService,
    ILogger<ProgressController> logger) : ControllerBase
{
    private string? UserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub");

    [HttpGet("summary")]
    public async Task<ActionResult<ProgressSummaryDto>> GetSummary(
        [FromQuery] int window = 7)
    {
        if (UserId is not { } userId)
            return Unauthorized();

        try
        {
            return Ok(await progressService.GetSummaryAsync(userId, window));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to load progress summary for user {UserId}", userId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    [HttpPost("report/refresh")]
    [EnableRateLimiting("ai")]
    public async Task<ActionResult<NutritionistWeeklyReportDto>> RefreshReport()
    {
        if (UserId is not { } userId)
            return Unauthorized();

        try
        {
            var report = await progressService.GetWeeklyReportAsync(userId, forceRefresh: true);
            if (report is null)
            {
                return Problem(
                    statusCode: 400,
                    title: "Weekly report is locked",
                    detail: "Complete seven consecutive days to unlock the report.");
            }
            return Ok(report);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to refresh weekly report for user {UserId}", userId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }
}
