using System.Security.Claims;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FitApp.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(UserService userService, DailyDataService dailyService) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")!;

    [HttpGet("me")]
    public async Task<IActionResult> GetProfile()
    {
        var profile = await userService.GetProfileAsync(UserId);
        if (profile is null) return Unauthorized(); // valid JWT but account no longer exists — stale session
        return Ok(profile);
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserProfileRequest req)
    {
        var profile = await userService.UpdateProfileAsync(UserId, req);
        if (profile is null) return NotFound();
        return Ok(profile);
    }

    [HttpGet("{userId}/stats")]
    public async Task<IActionResult> GetUserStats(string userId)
    {
        var stats = await userService.GetPublicStatsAsync(userId);
        if (stats is null) return NotFound();
        return Ok(stats);
    }

    // GET /api/users/me/streak — navigation badge data (minimal, no health metrics)
    [HttpGet("me/streak")]
    public async Task<IActionResult> GetMyStreak()
    {
        var dto = await dailyService.GetUserStreakAsync(UserId);
        return Ok(dto);
    }
}
