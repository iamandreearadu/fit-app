using System.Net;
using System.Net.Http.Json;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace FitApp.Api.Tests;

public class AiMealDescriptionTests
{
    [Fact]
    public async Task MealDescription_RejectsWhitespaceOnlyInput()
    {
        using var factory = new MealAiWebApplicationFactory();
        var (client, _) = await TestUserFactory.CreateAuthenticatedClientAsync(factory, "meal-ai-invalid");

        var response = await client.PostAsJsonAsync("/api/ai/meal-description", new
        {
            description = "   "
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, factory.RequestCount);
    }

    [Fact]
    public async Task MealDescription_ReturnsStructuredAiResponse()
    {
        using var factory = new MealAiWebApplicationFactory();
        var (client, _) = await TestUserFactory.CreateAuthenticatedClientAsync(factory, "meal-ai-valid");

        var response = await client.PostAsJsonAsync("/api/ai/meal-description", new
        {
            description = "2 eggs and two slices of toast"
        });

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("protein_g", body);
        Assert.Equal(1, factory.RequestCount);
        Assert.Contains("meal_description", factory.LastRequestBody);
        Assert.Contains("\"temperature\":0.05", factory.LastRequestBody);
        Assert.Contains("\"response_format\"", factory.LastRequestBody);
        Assert.Contains("top-level totals equal the item sums", factory.LastRequestBody);
        Assert.Contains("Romanian or English", factory.LastRequestBody);
        Assert.Contains("\"model\":\"openai/gpt-oss-20b\"", factory.LastRequestBody);
        Assert.Contains("\"reasoning_effort\":\"low\"", factory.LastRequestBody);
    }

    private sealed class MealAiWebApplicationFactory : CustomWebApplicationFactory
    {
        private int _requestCount;
        public int RequestCount => _requestCount;
        public string? LastRequestBody { get; private set; }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.ConfigureServices(services =>
            {
                services.AddHttpClient("Groq")
                    .ConfigurePrimaryHttpMessageHandler(() => new StubHandler(this));
            });
        }

        private sealed class StubHandler(MealAiWebApplicationFactory owner) : HttpMessageHandler
        {
            protected override async Task<HttpResponseMessage> SendAsync(
                HttpRequestMessage request,
                CancellationToken cancellationToken)
            {
                Interlocked.Increment(ref owner._requestCount);
                owner.LastRequestBody = await request.Content!.ReadAsStringAsync(cancellationToken);
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"choices":[{"message":{"content":"{\"protein_g\":18,\"carbs_g\":30,\"fats_g\":14,\"calories_kcal\":320,\"items\":[{\"name\":\"eggs and toast\",\"confidence\":0.8,\"protein_g\":18,\"carbs_g\":30,\"fats_g\":14,\"calories_kcal\":320}]}"}}]}""",
                        Encoding.UTF8,
                        "application/json")
                };
            }
        }
    }
}
