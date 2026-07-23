using System.Net;
using System.Net.Http.Json;
using FitApp.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;
using System.Text.Json;
using FitApp.Api.Models.Entities;
using FitApp.Api.Services;

namespace FitApp.Api.Tests;

public class PushSubscriptionTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    public PushSubscriptionTests(CustomWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task Endpoints_RequireJwt()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/notifications/push-subscribe", Request("unauthorized"));
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Subscribe_IsIdempotent_AndUpdatesKeys()
    {
        var (client, user) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "push-upsert");
        var endpoint = Endpoint("upsert");

        Assert.Equal(HttpStatusCode.NoContent,
            (await client.PostAsJsonAsync("/api/notifications/push-subscribe", Request(endpoint, "first"))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,
            (await client.PostAsJsonAsync("/api/notifications/push-subscribe", Request(endpoint, "second"))).StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var stored = await db.PushSubscriptions.SingleAsync(item => item.Endpoint == endpoint);
        Assert.Equal(user.Id, stored.UserId);
        Assert.Equal("second", stored.P256dh);
        Assert.Equal(1, await db.PushSubscriptions.CountAsync(item => item.Endpoint == endpoint));
    }

    [Fact]
    public async Task Subscribe_ReassignsEndpointToCurrentAccount()
    {
        var (first, _) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "push-first");
        var (second, secondUser) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "push-second");
        var endpoint = Endpoint("reassign");
        await first.PostAsJsonAsync("/api/notifications/push-subscribe", Request(endpoint, "first"));

        var response = await second.PostAsJsonAsync("/api/notifications/push-subscribe", Request(endpoint, "second"));
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(secondUser.Id, (await db.PushSubscriptions.SingleAsync(item => item.Endpoint == endpoint)).UserId);
    }

    [Fact]
    public async Task Delete_CannotRemoveAnotherUsersEndpoint_AndIsIdempotent()
    {
        var (owner, _) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "push-owner");
        var (other, _) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "push-other");
        var endpoint = Endpoint("owned");
        await owner.PostAsJsonAsync("/api/notifications/push-subscribe", Request(endpoint));

        var foreignDelete = await other.SendAsync(DeleteRequest(endpoint));
        Assert.Equal(HttpStatusCode.NoContent, foreignDelete.StatusCode);
        using (var scope = _factory.Services.CreateScope())
            Assert.True(await scope.ServiceProvider.GetRequiredService<AppDbContext>().PushSubscriptions.AnyAsync(x => x.Endpoint == endpoint));

        Assert.Equal(HttpStatusCode.NoContent, (await owner.SendAsync(DeleteRequest(endpoint))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await owner.SendAsync(DeleteRequest(endpoint))).StatusCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("http://push.example/subscription")]
    [InlineData("not-a-url")]
    public async Task Subscribe_RejectsInvalidEndpoint(string endpoint)
    {
        var (client, _) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "push-invalid");
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PostAsJsonAsync("/api/notifications/push-subscribe", Request(endpoint))).StatusCode);
    }

    [Fact]
    public async Task DeletingUser_CascadesSubscriptions()
    {
        var (client, user) = await TestUserFactory.CreateAuthenticatedClientAsync(_factory, "push-cascade");
        var endpoint = Endpoint("cascade");
        await client.PostAsJsonAsync("/api/notifications/push-subscribe", Request(endpoint));

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Users.Where(item => item.Id == user.Id).ExecuteDeleteAsync();
        Assert.False(await db.PushSubscriptions.AnyAsync(item => item.Endpoint == endpoint));
    }

    [Theory]
    [InlineData(NotificationType.Like, 42, "/social/post/42")]
    [InlineData(NotificationType.NewMessage, 7, "/social/chat/7")]
    [InlineData(NotificationType.Follow, null, "/social/notifications")]
    public void Payload_IsGenericAndUsesAllowlistedDeepLink(NotificationType type, int? referenceId, string url)
    {
        var method = typeof(PushNotificationService).GetMethod("BuildPayload", BindingFlags.NonPublic | BindingFlags.Static)!;
        var json = JsonSerializer.Serialize(method.Invoke(null, [type, referenceId]));
        using var document = JsonDocument.Parse(json);
        var notification = document.RootElement.GetProperty("notification");

        Assert.Equal("NovaFit", notification.GetProperty("title").GetString());
        Assert.Equal("Ai o notificare nouă.", notification.GetProperty("body").GetString());
        Assert.Equal(url, notification.GetProperty("data").GetProperty("url").GetString());
        foreach (var forbidden in new[] { "bmi", "bmr", "tdee", "weight", "calories", "email", "token", "actor", "userId" })
            Assert.DoesNotContain(forbidden, json, StringComparison.OrdinalIgnoreCase);
    }

    private static object Request(string endpoint, string key = "valid_key") =>
        new { endpoint = endpoint.Contains("://") || endpoint is "" or "not-a-url" ? endpoint : Endpoint(endpoint), keys = new { p256dh = key, auth = "valid_auth" } };

    private static string Endpoint(string suffix) => $"https://push.example/{suffix}-{Guid.NewGuid():N}";

    private static HttpRequestMessage DeleteRequest(string endpoint) => new(HttpMethod.Delete, "/api/notifications/push-subscribe")
    {
        Content = JsonContent.Create(new { endpoint })
    };
}
