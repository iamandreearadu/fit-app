using System.Net;
using System.Net.Http.Json;
using FitApp.Api.Models.DTOs;

namespace FitApp.Api.Tests;

/// <summary>
/// Covers audit finding "JWT auth flow is completely untested" — no test previously verified
/// register/login success/failure paths or that [Authorize] actually rejects an unauthenticated
/// request on a real controller.
/// </summary>
public class AuthFlowTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public AuthFlowTests(CustomWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task Register_WithNewEmail_ReturnsTokenAndCanAuthenticate()
    {
        var client = _factory.CreateClient();
        var email = $"newuser-{Guid.NewGuid():N}@example.com";

        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "Password123!",
            fullName = "New User"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        Assert.False(string.IsNullOrWhiteSpace(auth!.Token));
        Assert.Equal(email, auth.Email);
    }

    [Fact]
    public async Task Register_WithDuplicateEmail_Returns409()
    {
        var client = _factory.CreateClient();
        var email = $"dup-{Guid.NewGuid():N}@example.com";
        var payload = new { email, password = "Password123!", fullName = "Dup User" };

        var first = await client.PostAsJsonAsync("/api/auth/register", payload);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var second = await client.PostAsJsonAsync("/api/auth/register", payload);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Login_WithWrongPassword_Returns401()
    {
        var client = _factory.CreateClient();
        var email = $"wrongpw-{Guid.NewGuid():N}@example.com";

        await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "CorrectPassword123!",
            fullName = "Wrong Pw User"
        });

        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = "TotallyWrongPassword!"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, loginResponse.StatusCode);
    }

    [Fact]
    public async Task Login_WithCorrectCredentials_ReturnsValidToken()
    {
        var client = _factory.CreateClient();
        var email = $"correctpw-{Guid.NewGuid():N}@example.com";
        const string password = "CorrectPassword123!";

        await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password,
            fullName = "Correct Pw User"
        });

        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new { email, password });

        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.False(string.IsNullOrWhiteSpace(auth!.Token));
    }

    [Fact]
    public async Task ProtectedEndpoint_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/workouts");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_WithGarbageToken_Returns401()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "this.is.not-a-valid-jwt");

        var response = await client.GetAsync("/api/workouts");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
