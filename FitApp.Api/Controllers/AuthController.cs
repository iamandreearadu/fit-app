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
                return Problem(statusCode: 401, detail: "Invalid email or password.");
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
                return Problem(statusCode: 409, detail: error);
            return Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error during registration");
            return Problem("An unexpected error occurred.", statusCode: 500);
        }
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req)
    {
        try
        {
            await auth.RequestPasswordResetAsync(req);
            return Ok(new { message = AuthService.ResetRequestMessage });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error while requesting a password reset");
            return Ok(new { message = AuthService.ResetRequestMessage });
        }
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req)
    {
        try
        {
            var updated = await auth.ResetPasswordAsync(req);
            if (!updated)
                return Problem(statusCode: 400, detail: "This reset link is invalid or has expired.");

            return Ok(new { message = "Your password has been updated." });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error while resetting a password");
            return Problem("An unexpected error occurred.", statusCode: 500);
        }
    }
}
