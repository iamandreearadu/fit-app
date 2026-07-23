using System.Net;
using System.Net.Http.Json;
using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.Extensions.DependencyInjection;

namespace FitApp.Api.Tests;

public class AddActivityPostTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public AddActivityPostTests(CustomWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task CreatePost_AllowsOwnedSavedWorkoutAsOnlyContent()
    {
        var (client, user) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "activity-owner");
        var workoutId = await AddWorkoutAsync(user.Id, "Core Pilates");

        var response = await client.PostAsJsonAsync("/api/social/posts", new
        {
            content = "",
            linkedWorkoutId = workoutId
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var post = await response.Content.ReadFromJsonAsync<PostResponse>();
        Assert.NotNull(post?.LinkedContent);
        Assert.Equal("workout", post.LinkedContent.Type);
        Assert.Equal("Core Pilates", post.LinkedContent.Title);
        Assert.Equal("45 min · Other", post.LinkedContent.Subtitle);
    }

    [Fact]
    public async Task CreatePost_RejectsAnotherUsersWorkout()
    {
        var (ownerClient, owner) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "activity-a");
        var (_, other) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "activity-b");
        var workoutId = await AddWorkoutAsync(other.Id, "Private workout");

        var response = await ownerClient.PostAsJsonAsync("/api/social/posts", new
        {
            content = "Trying to link another account",
            linkedWorkoutId = workoutId
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CreatePost_ReturnsNotFoundForDeletedOrUnknownWorkout()
    {
        var (client, _) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "activity-missing");

        var response = await client.PostAsJsonAsync("/api/social/posts", new
        {
            content = "Missing workout",
            linkedWorkoutId = int.MaxValue
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CreatePost_RejectsUnsavedSystemWorkout()
    {
        var (client, _) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "activity-system");
        var workoutId = await AddWorkoutAsync(null, "System starter", isSystemTemplate: true);

        var response = await client.PostAsJsonAsync("/api/social/posts", new
        {
            content = "Unsaved starter",
            linkedWorkoutId = workoutId
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private async Task<int> AddWorkoutAsync(
        string? userId, string title, bool isSystemTemplate = false)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var workout = new WorkoutTemplate
        {
            UserId = userId,
            Title = title,
            Type = "Other",
            DurationMin = 45,
            IsSystemTemplate = isSystemTemplate
        };
        db.WorkoutTemplates.Add(workout);
        await db.SaveChangesAsync();
        return workout.Id;
    }
}
