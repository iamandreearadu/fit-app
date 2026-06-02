using System.Security.Claims;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FitApp.Api.Controllers;

[ApiController]
[Route("api/nutrition")]
[Authorize]
public class NutritionController(
    NutritionService nutritionService,
    FoodSearchService foodSearchService) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")!;

    // ── Meal CRUD ─────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var (items, hasMore) = await nutritionService.ListAsync(UserId, page, pageSize);
        return Ok(new { items, hasMore, page, pageSize });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveMealRequest req)
    {
        var meal = await nutritionService.CreateAsync(UserId, req);
        return Created($"api/nutrition/{meal.Id}", meal);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] SaveMealRequest req)
    {
        var meal = await nutritionService.UpdateAsync(UserId, id, req);
        if (meal is null) return NotFound();
        return Ok(meal);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await nutritionService.DeleteAsync(UserId, id);
        if (!deleted) return NotFound();
        return NoContent();
    }

    // ── Fix 3: Today's Macro Progress ────────────────────────────────────────

    /// <summary>
    /// GET /api/nutrition/today/macro-progress
    ///
    /// Returns today's logged macro totals vs TDEE-derived macro targets.
    /// Consumed by MealCompletionFeedbackComponent immediately after each meal save
    /// so the inline progress bars update to reflect the current running totals.
    ///
    /// Private user health data — Bearer required.
    /// MUST NEVER be proxied to social endpoints or included in feed responses.
    /// </summary>
    [HttpGet("today/macro-progress")]
    public async Task<ActionResult<MacroProgressDto>> GetTodayMacroProgress()
        => Ok(await nutritionService.GetTodayMacroProgressAsync(UserId));

    // ── Food Search (Fix 1) ───────────────────────────────────────────────────

    /// <summary>
    /// GET /api/nutrition/foods/search?q=chicken&amp;pageSize=10
    /// Proxies USDA FoodData Central. Cached 30 min. Returns per-100g values.
    /// Always returns 200 — empty array on short query or USDA error.
    /// </summary>
    [HttpGet("foods/search")]
    public async Task<ActionResult<IEnumerable<FoodSearchResultDto>>> SearchFoods(
        [FromQuery] string? q,
        [FromQuery] int pageSize = 10)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            return Ok(Array.Empty<FoodSearchResultDto>());

        var results = await foodSearchService.SearchAsync(q, pageSize);
        return Ok(results);
    }

    /// <summary>
    /// GET /api/nutrition/foods/recent
    /// Last 10 distinct food items logged by the authenticated user, ordered by most recent use.
    /// Zero external API calls. Always returns 200.
    /// </summary>
    [HttpGet("foods/recent")]
    public async Task<ActionResult<IEnumerable<RecentFoodItemDto>>> GetRecentFoods()
    {
        var results = await foodSearchService.GetRecentFoodsAsync(UserId);
        return Ok(results);
    }
}
