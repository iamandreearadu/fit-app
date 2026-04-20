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
            return BadRequest(new { message = "date query parameter is required." });

        var entry = await dailyService.GetForDateAsync(UserId, date);
        if (entry is null) return NotFound();
        return Ok(entry);
    }

    // GET api/daily/history
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        var entries = await dailyService.GetAllAsync(UserId);
        return Ok(entries);
    }

    // POST api/daily
    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveDailyEntryRequest req)
    {
        var entry = await dailyService.SaveForDateAsync(UserId, req);
        return Ok(entry);
    }
}
