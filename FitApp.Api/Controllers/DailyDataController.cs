using System.Security.Claims;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FitApp.Api.Controllers;

[ApiController]
[Route("api/daily")]
[Authorize]
public class DailyDataController(DailyDataService dailyService) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")!;

    // GET api/daily?date=2025-01-15
    [HttpGet]
    public async Task<IActionResult> GetForDate([FromQuery] string date)
    {
        if (string.IsNullOrEmpty(date))
            return Problem(statusCode: 400, detail: "date query parameter is required.");

        var entry = await dailyService.GetForDateAsync(UserId, date);
        if (entry is null) return NotFound();
        return Ok(entry);
    }

    // GET api/daily/today/summary — Fix 10
    // Returns today's daily entry enriched with live-computed calorie/macro totals from MealEntries.
    // Private to the authenticated user — must NEVER be exposed via social or public endpoints.
    [HttpGet("today/summary")]
    public async Task<ActionResult<DailyEntrySummaryDto>> GetTodaySummary()
    {
        var summary = await dailyService.GetTodaySummaryAsync(UserId);
        return Ok(summary);
    }

    // GET api/daily/streak
    [HttpGet("streak")]
    public async Task<IActionResult> GetStreak()
    {
        var streak = await dailyService.GetStreakAsync(UserId);
        return Ok(streak);
    }

    // GET api/daily/history
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 30)
    {
        var (items, hasMore) = await dailyService.GetAllAsync(UserId, page, pageSize);
        return Ok(new { items, hasMore, page, pageSize });
    }

    // POST api/daily
    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveDailyEntryRequest req)
    {
        var entry = await dailyService.SaveForDateAsync(UserId, req);
        return Ok(entry);
    }
}
