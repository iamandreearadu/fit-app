using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using FitApp.Api.Models.DTOs;

namespace FitApp.Api.Services;

public class AiProxyService(IConfiguration config, IHttpClientFactory httpFactory)
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    public async Task<AiResponse> AskTextAsync(AiTextRequest req)
    {
        var messages = new List<object>();
        if (!string.IsNullOrEmpty(req.SystemPrompt))
            messages.Add(new { role = "system", content = req.SystemPrompt });
        messages.Add(new { role = "user", content = req.Prompt });

        return await CallGroqAsync(config["Groq:TextModel"]!, messages);
    }

    public async Task<AiResponse> AnalyzeImageAsync(AiImageRequest req)
    {
        // Vision models don't support system role — prepend system prompt as text in user message
        var textContent = string.IsNullOrEmpty(req.SystemPrompt)
            ? req.Prompt
            : $"{req.SystemPrompt}\n\n{req.Prompt}";

        var messages = new List<object>
        {
            new
            {
                role = "user",
                content = new object[]
                {
                    new { type = "text", text = textContent },
                    new { type = "image_url", image_url = new { url = $"data:{req.MimeType};base64,{req.Base64Image}" } }
                }
            }
        };

        return await CallGroqAsync(config["Groq:VisionModel"]!, messages);
    }

    public async Task<AiResponse> EstimateWorkoutCaloriesAsync(WorkoutCaloriesRequest req)
    {
        var prompt = BuildWorkoutCaloriesPrompt(req);
        var messages = new List<object>
        {
            new { role = "system", content = "You are a fitness expert. Estimate calories burned based on the workout and user details. Respond with a single JSON object: {\"calories\": number, \"explanation\": string}" },
            new { role = "user", content = prompt }
        };

        return await CallGroqAsync(config["Groq:TextModel"]!, messages);
    }

    private async Task<AiResponse> CallGroqAsync(string model, List<object> messages)
    {
        var client = httpFactory.CreateClient("Groq");
        var body = JsonSerializer.Serialize(new { model, messages, temperature = 0.7 }, JsonOpts);
        var content = new StringContent(body, Encoding.UTF8, "application/json");

        var response = await client.PostAsync("/openai/v1/chat/completions", content);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"Groq API error {(int)response.StatusCode}: {json}");

        using var doc = JsonDocument.Parse(json);
        var text = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? string.Empty;

        return new AiResponse { Content = text };
    }

    private static string BuildWorkoutCaloriesPrompt(WorkoutCaloriesRequest req)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"User: {req.User.Gender}, age {req.User.Age}, weight {req.User.WeightKg}kg, height {req.User.HeightCm}cm, activity level: {req.User.Activity}");
        sb.AppendLine($"Workout: {req.Workout.Title} ({req.Workout.Type}), duration: {req.Workout.DurationMin} minutes");

        if (req.Workout.Exercises.Count > 0)
        {
            sb.AppendLine("Exercises:");
            foreach (var e in req.Workout.Exercises)
                sb.AppendLine($"  - {e.Name}: {e.Sets}x{e.Reps} @ {e.WeightKg}kg");
        }

        if (req.Workout.Cardio is not null)
            sb.AppendLine($"Cardio: {req.Workout.Cardio.Km}km, incline {req.Workout.Cardio.Incline}%");

        return sb.ToString();
    }
}
