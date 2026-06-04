using System.Security.Claims;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FitApp.Api.Controllers;

[ApiController]
[Route("api/ai")]
[Authorize]
public class AiController(AiProxyService aiProxy, ILogger<AiController> logger) : ControllerBase
{
    private string UserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException("User identity not resolved.");

    [HttpPost("text")]
    public async Task<IActionResult> AskText([FromBody] AiTextRequest req)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        try
        {
            var result = await aiProxy.AskTextAsync(req, UserId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AI text request failed");
            return Problem("AI request failed. Please try again.", statusCode: 500);
        }
    }

    [HttpPost("image")]
    public async Task<IActionResult> AnalyzeImage([FromBody] AiImageRequest req)
    {
        try
        {
            var result = await aiProxy.AnalyzeImageAsync(req);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Groq vision API error: {Message}", ex.Message);
            return Problem("Vision AI service is temporarily unavailable. Please try again.", statusCode: 502);
        }
        catch (TaskCanceledException ex)
        {
            logger.LogError(ex, "Groq vision API timeout");
            return Problem("Vision AI timed out — try a smaller image.", statusCode: 504);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AI image request failed");
            return Problem("AI request failed. Please try again.", statusCode: 500);
        }
    }

    [HttpPost("workout-calories")]
    public async Task<IActionResult> EstimateWorkoutCalories([FromBody] WorkoutCaloriesRequest req)
    {
        try
        {
            var result = await aiProxy.EstimateWorkoutCaloriesAsync(req);
            return Ok(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AI workout-calories request failed");
            return Problem("AI request failed. Please try again.", statusCode: 500);
        }
    }
}