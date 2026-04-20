using FitApp.Api.Models.DTOs;
using FitApp.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace FitApp.Api.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public class AuthController(AuthService auth, ILogger<AuthController> logger) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        try
        {
            var result = await auth.LoginAsync(req);
            if (result is null)
                return Unauthorized(new { message = "Invalid email or password." });
            return Ok(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error during login");
            return Problem("An unexpected error occurred.", statusCode: 500);
        }
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        try
        {
            var (response, error) = await auth.RegisterAsync(req);
            if (error is not null)
                return Conflict(new { message = error });
            return Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error during registration");
            return Problem("An unexpected error occurred.", statusCode: 500);
        }
    }
}
