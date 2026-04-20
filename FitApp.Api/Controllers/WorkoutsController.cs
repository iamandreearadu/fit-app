using System.Security.Claims;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FitApp.Api.Controllers;

[ApiController]
[Route("api/workouts")]
[Authorize]
public class WorkoutsController(WorkoutService workoutService) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")!;

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var workouts = await workoutService.ListAsync(UserId);
        return Ok(workouts);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var workout = await workoutService.GetAsync(UserId, id);
        if (workout is null) return NotFound();
        return Ok(workout);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveWorkoutRequest req)
    {
        var workout = await workoutService.CreateAsync(UserId, req);
        return Created($"api/workouts/{workout.Id}", workout);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] SaveWorkoutRequest req)
    {
        var workout = await workoutService.UpdateAsync(UserId, id, req);
        if (workout is null) return NotFound();
        return Ok(workout);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await workoutService.DeleteAsync(UserId, id);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
