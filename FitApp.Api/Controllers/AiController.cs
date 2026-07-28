using System.Security.Claims;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace FitApp.Api.Controllers;

[ApiController]
[Route("api/ai")]
[Authorize]
[EnableRateLimiting("ai")]
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
    public async Task<IActionResult> AnalyzeImage(
        [FromBody] AiImageRequest req,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await aiProxy.AnalyzeImageAsync(req, cancellationToken);
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

    [HttpPost("meal-description")]
    public async Task<IActionResult> AnalyzeMealDescription(
        [FromBody] AiMealDescriptionRequest req,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        req.Description = req.Description.Trim();
        if (req.Description.Length < 3)
        {
            ModelState.AddModelError(nameof(req.Description), "Add a little more detail so the meal can be estimated.");
            return ValidationProblem(ModelState);
        }

        try
        {
            return Ok(await aiProxy.AnalyzeMealDescriptionAsync(req, cancellationToken));
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Groq meal description API error");
            return Problem("Meal analysis is temporarily unavailable. Please try again.", statusCode: 502);
        }
        catch (TaskCanceledException ex)
        {
            logger.LogError(ex, "Groq meal description API timeout");
            return Problem("Meal analysis took too long. Please try again.", statusCode: 504);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AI meal description request failed");
            return Problem("The meal could not be estimated reliably. Please try again.", statusCode: 500);
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
