using System.Security.Claims;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FitApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController(
    IDashboardService dashboardService,
    ILogger<DashboardController> logger) : ControllerBase
{
    private string? GetUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");

    [HttpGet("today")]
    public async Task<IActionResult> GetToday()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        try
        {
            var result = await dashboardService.GetTodayAsync(userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching dashboard today for user {UserId}", userId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    [HttpGet("ai-insight")]
    public async Task<IActionResult> GetAiInsight()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        try
        {
            var result = await dashboardService.GetAiInsightAsync(userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching AI insight for user {UserId}", userId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }
}
