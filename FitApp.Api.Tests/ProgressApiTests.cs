using System.Net;
using System.Net.Http.Json;
using System.Text;
using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace FitApp.Api.Tests;

public class ProgressApiTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public ProgressApiTests(CustomWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task Summary_UsesGracePeriod_AndFallsBackToSevenDayWindow()
    {
        var (client, user) =
            await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "progress-streak");
        var today = UtcToday();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            for (var offset = 1; offset <= 3; offset++)
            {
                var date = today.AddDays(-offset).ToString("yyyy-MM-dd");
                db.DailyEntries.Add(new DailyEntry
                {
                    UserId = user.Id,
                    Date = date,
                    ActivityType = offset == 2 ? "Rest Day" : "Strength Training",
                    Steps = 4000,
                    StepTarget = 3000,
                    WaterConsumedL = 2
                });
                db.MealEntries.Add(new MealEntry
                {
                    UserId = user.Id,
                    Name = $"Meal {offset}",
                    Type = "Dinner",
                    Date = date,
                    TotalCalories = 600,
                    TotalProtein_g = 40,
                    TotalCarbs_g = 70,
                    TotalFats_g = 18,
                    IsSavedMeal = false
                });
            }
            await db.SaveChangesAsync();
        }

        var response = await client.GetAsync("/api/progress/summary?window=12");
        response.EnsureSuccessStatusCode();
        var summary = await response.Content.ReadFromJsonAsync<ProgressSummaryDto>();

        Assert.NotNull(summary);
        Assert.Equal(7, summary.Trends.Window);
        Assert.Equal(7, summary.Trends.Dates.Count);
        Assert.Equal(3, summary.Streak.CompleteDayStreak);
        Assert.False(summary.Streak.LoggedTodayComplete);
        Assert.Equal(4, summary.Streak.DaysUntilUnlock);
        Assert.Equal(["meals", "activity", "steps", "water"], summary.Streak.MissingToday);
        Assert.Null(summary.WeeklyReport);
    }

    [Fact]
    public async Task SavedMealTemplate_DoesNotCompleteDay()
    {
        var (client, user) =
            await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "progress-template");
        var today = UtcToday().ToString("yyyy-MM-dd");

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.DailyEntries.Add(new DailyEntry
            {
                UserId = user.Id,
                Date = today,
                ActivityType = "Rest Day",
                Steps = 1,
                WaterConsumedL = 0.1
            });
            db.MealEntries.Add(new MealEntry
            {
                UserId = user.Id,
                Date = today,
                Name = "Reusable template",
                Type = "Breakfast",
                IsSavedMeal = true
            });
            await db.SaveChangesAsync();
        }

        var summary =
            await client.GetFromJsonAsync<ProgressSummaryDto>("/api/progress/summary?window=7");

        Assert.NotNull(summary);
        Assert.False(summary.Streak.LoggedTodayComplete);
        Assert.Contains("meals", summary.Streak.MissingToday);
    }

    [Fact]
    public async Task Refresh_ReturnsBadRequestWhileReportIsLocked()
    {
        var (client, _) =
            await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "progress-locked");

        var response = await client.PostAsync("/api/progress/report/refresh", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SevenCompleteDays_UnlockReport_AndNarrativeCacheRefreshesExplicitly()
    {
        using var factory = new ProgressAiWebApplicationFactory();
        var (client, user) =
            await TestUserFactory.CreateAuthenticatedClientAsync(factory, "progress-unlocked");
        var today = UtcToday();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var storedUser = await db.Users.FindAsync(user.Id);
            storedUser!.Tdee = 2000;
            storedUser.WaterL = 2;

            for (var offset = 0; offset < 7; offset++)
            {
                var date = today.AddDays(-offset).ToString("yyyy-MM-dd");
                db.DailyEntries.Add(new DailyEntry
                {
                    UserId = user.Id,
                    Date = date,
                    ActivityType = "Rest Day",
                    Steps = 6000,
                    StepTarget = 5000,
                    WaterConsumedL = 2,
                    ManualWeight = offset is 0 or 6 ? 70 + offset : null
                });
                db.MealEntries.Add(new MealEntry
                {
                    UserId = user.Id,
                    Name = $"Complete meal {offset}",
                    Type = "Dinner",
                    Date = date,
                    TotalCalories = 1800,
                    TotalProtein_g = 100,
                    TotalCarbs_g = 200,
                    TotalFats_g = 60,
                    IsSavedMeal = false
                });
            }
            await db.SaveChangesAsync();
        }

        var first =
            await client.GetFromJsonAsync<ProgressSummaryDto>("/api/progress/summary?window=30");
        var second =
            await client.GetFromJsonAsync<ProgressSummaryDto>("/api/progress/summary?window=30");

        Assert.NotNull(first?.WeeklyReport);
        Assert.Equal(7, first.Streak.CompleteDayStreak);
        Assert.Equal(1800, first.WeeklyReport.AvgCaloriesIn);
        Assert.Equal(-1400, first.WeeklyReport.NetCaloriesTotal);
        Assert.Equal(-0.182, first.WeeklyReport.EstimatedWeightChangeKg);
        Assert.Equal(-6, first.WeeklyReport.ActualWeightChangeKg);
        Assert.Equal(7, first.WeeklyReport.MealsLogged);
        Assert.Contains("estimează", second!.WeeklyReport!.AiNarrative);
        Assert.Contains("cântăririle", second.WeeklyReport.AiNarrative);
        Assert.Equal(1, factory.GroqRequestCount);

        var refresh = await client.PostAsync("/api/progress/report/refresh", null);

        refresh.EnsureSuccessStatusCode();
        Assert.Equal(2, factory.GroqRequestCount);
    }

    [Fact]
    public async Task ProgressEndpoints_RequireAuthentication()
    {
        var client = _factory.CreateClient();

        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await client.GetAsync("/api/progress/summary")).StatusCode);
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await client.PostAsync("/api/progress/report/refresh", null)).StatusCode);
    }

    [Fact]
    public async Task MariaDemoSeed_HasSevenCompleteDays_AndUnlockedReport()
    {
        var client = _factory.CreateClient();
        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "maria@novafit.com",
            password = "Maria2026!"
        });
        loginResponse.EnsureSuccessStatusCode();

        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth.Token);

        var summary =
            await client.GetFromJsonAsync<ProgressSummaryDto>("/api/progress/summary?window=7");

        Assert.NotNull(summary);
        Assert.Equal(7, summary.Streak.CompleteDayStreak);
        Assert.True(summary.Streak.LoggedTodayComplete);
        Assert.Empty(summary.Streak.MissingToday);
        Assert.NotNull(summary.WeeklyReport);
        Assert.Equal("maintain", summary.WeeklyReport.UserGoal);
        Assert.Equal(1976, summary.WeeklyReport.GoalCalories);
        Assert.Equal(7, summary.Trends.Dates.Count);
        Assert.Equal(7, summary.Trends.WeightKg.Count(value => value.HasValue));

        var dashboardStreak =
            await client.GetFromJsonAsync<StreakDto>("/api/daily/streak");
        var navigationStreak =
            await client.GetFromJsonAsync<UserStreakDto>("/api/users/me/streak");

        Assert.NotNull(dashboardStreak);
        Assert.NotNull(navigationStreak);
        Assert.Equal(summary.Streak.CompleteDayStreak, dashboardStreak.Current);
        Assert.Equal(summary.Streak.CompleteDayStreak, navigationStreak.CurrentStreak);
        Assert.Equal(summary.Streak.LoggedTodayComplete, dashboardStreak.LoggedToday);
        Assert.Equal(summary.Streak.LoggedTodayComplete, navigationStreak.LoggedToday);
    }

    [Fact]
    public async Task CheckIn_ChangesOnlyWeightAndEnergy_AndFullSavePreservesThem()
    {
        var (client, _) =
            await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "daily-checkin");
        var date = UtcToday().ToString("yyyy-MM-dd");

        var initialSave = await client.PostAsJsonAsync("/api/daily", new
        {
            date,
            activityType = "Rest Day",
            waterConsumedL = 1.7,
            steps = 3210,
            stepTarget = 4000,
            macrosPct = new { protein = 30, carbs = 45, fats = 25 },
            caloriesBurned = 120
        });
        initialSave.EnsureSuccessStatusCode();

        var checkIn = await client.PatchAsJsonAsync("/api/daily/check-in", new
        {
            date,
            manualWeight = 72.4,
            energyLevel = 4
        });
        checkIn.EnsureSuccessStatusCode();
        var checkedIn = await checkIn.Content.ReadFromJsonAsync<DailyEntryDto>();
        Assert.Equal(72.4, checkedIn!.ManualWeight);
        Assert.Equal(4, checkedIn.EnergyLevel);
        Assert.Equal(3210, checkedIn.Steps);
        Assert.Equal(1.7, checkedIn.WaterConsumedL);
        Assert.Equal("Rest Day", checkedIn.ActivityType);

        var laterAutoSave = await client.PostAsJsonAsync("/api/daily", new
        {
            date,
            activityType = "Rest Day",
            waterConsumedL = 2,
            steps = 5000,
            stepTarget = 4000,
            macrosPct = new { protein = 30, carbs = 45, fats = 25 },
            caloriesBurned = 150
        });
        laterAutoSave.EnsureSuccessStatusCode();
        var afterAutoSave = await laterAutoSave.Content.ReadFromJsonAsync<DailyEntryDto>();

        Assert.Equal(72.4, afterAutoSave!.ManualWeight);
        Assert.Equal(4, afterAutoSave.EnergyLevel);
        Assert.Equal(5000, afterAutoSave.Steps);
    }

    [Theory]
    [InlineData(29, 3)]
    [InlineData(301, 3)]
    [InlineData(70, 0)]
    [InlineData(70, 6)]
    public async Task CheckIn_ValidatesWeightAndEnergy(double weight, int energy)
    {
        var (client, _) =
            await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "checkin-invalid");

        var response = await client.PatchAsJsonAsync("/api/daily/check-in", new
        {
            date = UtcToday().ToString("yyyy-MM-dd"),
            manualWeight = weight,
            energyLevel = energy
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static DateOnly UtcToday() => DateOnly.FromDateTime(DateTime.UtcNow);

    private sealed class ProgressAiWebApplicationFactory : CustomWebApplicationFactory
    {
        private int _groqRequestCount;
        public int GroqRequestCount => _groqRequestCount;

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.ConfigureServices(services =>
            {
                services.AddHttpClient("Groq")
                    .ConfigurePrimaryHttpMessageHandler(() =>
                        new StubHandler(() => Interlocked.Increment(ref _groqRequestCount)));
            });
        }
    }

    private sealed class StubHandler(Action onRequest) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            onRequest();
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    """{"choices":[{"message":{"content":"Balanța calorică estimează -0,18 kg, iar cântăririle măsurate indică -6,00 kg; pe șapte zile diferența poate reflecta apa și momentul cântăririi."}}]}""",
                    Encoding.UTF8,
                    "application/json")
            });
        }
    }
}
