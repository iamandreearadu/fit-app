using System.Security.Claims;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FitApp.Api.Controllers;

[ApiController]
[Route("api/nutrition")]
[Authorize]
public class NutritionController(NutritionService nutritionService) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")!;

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var meals = await nutritionService.ListAsync(UserId);
        return Ok(meals);
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
}
