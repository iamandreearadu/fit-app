using System.Net;
using System.Net.Http.Json;
using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace FitApp.Api.Tests;

public class ProfileMealsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    public ProfileMealsTests(CustomWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task PublicProfile_ReturnsOnlyVisibleMeals_WithoutNutritionMetrics()
    {
        var (ownerClient, owner) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "meal-owner");
        var (viewerClient, _) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "meal-viewer");
        await AddMealAsync(owner.Id, "Visible bowl", false);
        await AddMealAsync(owner.Id, "Private bowl", true);

        var response = await viewerClient.GetAsync($"/api/social/profile/{owner.Id}/meals");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = await response.Content.ReadFromJsonAsync<PaginatedResponse<ProfileMealSummary>>();
        Assert.Single(page!.Items);
        Assert.Equal("Visible bowl", page.Items[0].Name);
        var json = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("totalCalories", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("protein", json, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Owner_CanHideAndUnhideMeal_WithoutDeletingIt()
    {
        var (client, owner) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "meal-toggle");
        var id = await AddMealAsync(owner.Id, "Oats", true);
        var response = await client.PatchAsJsonAsync($"/api/social/profile/meals/{id}/visibility", new { });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var scope = _factory.Services.CreateScope();
        var meal = await scope.ServiceProvider.GetRequiredService<AppDbContext>().MealEntries.FindAsync(id);
        Assert.NotNull(meal);
        Assert.False(meal.IsHiddenFromProfile);
        Assert.Equal(500, meal.TotalCalories);
    }

    private async Task<int> AddMealAsync(string userId, string name, bool hidden)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var meal = new MealEntry { UserId = userId, Name = name, Type = "Lunch", Date = "2026-07-22", TotalCalories = 500, IsHiddenFromProfile = hidden };
        db.MealEntries.Add(meal);
        await db.SaveChangesAsync();
        return meal.Id;
    }
}
