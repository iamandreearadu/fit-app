using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Services;

public class WorkoutService(AppDbContext db)
{
    public async Task<List<WorkoutTemplateDto>> ListAsync(string userId)
    {
        var workouts = await db.WorkoutTemplates
            .Include(w => w.Exercises.OrderBy(e => e.Order))
            .Include(w => w.Cardio)
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.UpdatedAt)
            .ToListAsync();
        return workouts.Select(MapToDto).ToList();
    }

    public async Task<WorkoutTemplateDto?> GetAsync(string userId, int id)
    {
        var workout = await db.WorkoutTemplates
            .Include(w => w.Exercises.OrderBy(e => e.Order))
            .Include(w => w.Cardio)
            .FirstOrDefaultAsync(w => w.Id == id && w.UserId == userId);
        return workout is null ? null : MapToDto(workout);
    }

    public async Task<WorkoutTemplateDto> CreateAsync(string userId, SaveWorkoutRequest req)
    {
        var workout = new WorkoutTemplate
        {
            UserId = userId,
            Title = req.Title,
            Type = req.Type,
            DurationMin = req.DurationMin,
            CaloriesEstimateKcal = req.CaloriesEstimateKcal,
            Notes = req.Notes
        };

        ApplyExercisesAndCardio(workout, req);
        db.WorkoutTemplates.Add(workout);
        await db.SaveChangesAsync();
        return MapToDto(workout);
    }

    public async Task<WorkoutTemplateDto?> UpdateAsync(string userId, int id, SaveWorkoutRequest req)
    {
        var workout = await db.WorkoutTemplates
            .Include(w => w.Exercises)
            .Include(w => w.Cardio)
            .FirstOrDefaultAsync(w => w.Id == id && w.UserId == userId);

        if (workout is null) return null;

        workout.Title = req.Title;
        workout.Type = req.Type;
        workout.DurationMin = req.DurationMin;
        workout.CaloriesEstimateKcal = req.CaloriesEstimateKcal;
        workout.Notes = req.Notes;
        workout.UpdatedAt = DateTime.UtcNow;

        // Remove old and re-add
        db.WorkoutExercises.RemoveRange(workout.Exercises);
        if (workout.Cardio is not null)
            db.CardioDetails.Remove(workout.Cardio);

        workout.Exercises.Clear();
        workout.Cardio = null;
        ApplyExercisesAndCardio(workout, req);

        await db.SaveChangesAsync();
        return MapToDto(workout);
    }

    public async Task<bool> DeleteAsync(string userId, int id)
    {
        var workout = await db.WorkoutTemplates
            .FirstOrDefaultAsync(w => w.Id == id && w.UserId == userId);
        if (workout is null) return false;
        db.WorkoutTemplates.Remove(workout);
        await db.SaveChangesAsync();
        return true;
    }

    private static void ApplyExercisesAndCardio(WorkoutTemplate workout, SaveWorkoutRequest req)
    {
        workout.Exercises = req.Exercises.Select((e, i) => new WorkoutExercise
        {
            Name = e.Name,
            Sets = e.Sets,
            Reps = e.Reps,
            WeightKg = e.WeightKg,
            Notes = e.Notes,
            Order = i
        }).ToList();

        if (req.Cardio is not null)
        {
            workout.Cardio = new CardioDetails
            {
                Km = req.Cardio.Km,
                Incline = req.Cardio.Incline,
                Notes = req.Cardio.Notes
            };
        }
    }

    private static WorkoutTemplateDto MapToDto(WorkoutTemplate w) => new()
    {
        Id = w.Id,
        Title = w.Title,
        Type = w.Type,
        DurationMin = w.DurationMin,
        CaloriesEstimateKcal = w.CaloriesEstimateKcal,
        Notes = w.Notes,
        CreatedAt = w.CreatedAt,
        UpdatedAt = w.UpdatedAt,
        Exercises = w.Exercises.OrderBy(e => e.Order).Select(e => new WorkoutExerciseDto
        {
            Name = e.Name,
            Sets = e.Sets,
            Reps = e.Reps,
            WeightKg = e.WeightKg,
            Notes = e.Notes
        }).ToList(),
        Cardio = w.Cardio is null ? null : new CardioDetailsDto
        {
            Km = w.Cardio.Km,
            Incline = w.Cardio.Incline,
            Notes = w.Cardio.Notes
        }
    };
}
