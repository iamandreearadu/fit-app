using System.Net.Http.Headers;
using System.Net.Http.Json;
using FitApp.Api.Models.DTOs;

namespace FitApp.Api.Tests;

/// <summary>Registers a throwaway user through the real /api/auth/register endpoint and
/// returns an HttpClient pre-configured with that user's Bearer token, so every test exercises
/// the real JWT issuance + validation pipeline rather than a hand-minted token.</summary>
internal static class TestUserFactory
{
    public static async Task<(HttpClient Client, AuthResponse User)> CreateAuthenticatedClientAsync(
        CustomWebApplicationFactory factory, string? emailPrefix = null)
    {
        var client = factory.CreateClient();
        var email = $"{emailPrefix ?? "user"}-{Guid.NewGuid():N}@example.com";

        var registerResp = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "Password123!",
            fullName = "Test User",
            goal = "maintain"
        });
        registerResp.EnsureSuccessStatusCode();

        var auth = await registerResp.Content.ReadFromJsonAsync<AuthResponse>()
            ?? throw new InvalidOperationException("Register did not return an AuthResponse.");

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth.Token);

        return (client, auth);
    }
}
