using System.Text;
using System.Text.Json;
using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Services;

public class AiProxyService(
    IConfiguration config,
    IHttpClientFactory httpFactory,
    ILogger<AiProxyService> logger,
    NutritionService nutritionService,
    DailyDataService dailyDataService,
    AppDbContext db)
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    /// <summary>
    /// Sends a text prompt to Groq, optionally enriching the system prompt with the user's
    /// live operational data from the specified module.
    ///
    /// Message construction order when moduleContext is set:
    ///   [0] system  — module context supplement (operational data only, no health metrics)
    ///   [1] system  — client's systemPrompt (if provided)
    ///   [2] user    — user's prompt
    ///
    /// PRIVACY: the context supplement is injected into the Groq request only.
    /// It is NOT stored in any entity and NOT returned in AiResponse.
    /// </summary>
    public async Task<AiResponse> AskTextAsync(AiTextRequest req, string userId)
    {
        var messages = new List<object>();

        // Inject module context as the first system message (server-side only)
        if (!string.IsNullOrEmpty(req.ModuleContext))
        {
            var contextSupplement = await BuildModuleContextAsync(userId, req.ModuleContext);
            if (contextSupplement is not null)
            {
                messages.Add(new { role = "system", content = contextSupplement });
                logger.LogDebug("Module context injected for user {UserId}, module={Module}", userId, req.ModuleContext);
            }
        }

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

        return await CallGroqAsync(config["Groq:VisionModel"]!, messages, req.JsonMode);
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

    /// <summary>
    /// Generates the weekly nutritionist narrative from aggregate statistics only.
    /// No meal names, food items, free-form notes, or other raw history leave the API.
    /// </summary>
    public async Task<string> GenerateWeeklyNutritionistNarrativeAsync(
        string userId,
        NutritionistWeeklyReportDto statsOnly)
    {
        var aggregatePayload = JsonSerializer.Serialize(new
        {
            statsOnly.WindowStart,
            statsOnly.WindowEnd,
            statsOnly.UserGoal,
            statsOnly.GoalCalories,
            statsOnly.AvgCaloriesIn,
            statsOnly.Tdee,
            statsOnly.NetCaloriesTotal,
            statsOnly.EstimatedWeightChangeKg,
            statsOnly.ActualWeightChangeKg,
            statsOnly.AvgWaterL,
            statsOnly.WaterTargetL,
            statsOnly.WaterAdherencePct,
            statsOnly.AvgSteps,
            statsOnly.StepTarget,
            statsOnly.MealsLogged,
            statsOnly.AvgProteinPct,
            statsOnly.AvgCarbsPct,
            statsOnly.AvgFatPct,
            statsOnly.TargetProteinPct,
            statsOnly.TargetCarbsPct,
            statsOnly.TargetFatPct
        }, JsonOpts);

        var messages = new List<object>
        {
            new
            {
                role = "system",
                content = """
                    You are Nova, NovaFit's evidence-aware nutrition coach. Write one
                    neutral, direct paragraph of 3 to 4 short sentences in Romanian.

                    Interpret the data relative to UserGoal from Account / Physical:
                    "lose" means fat-loss intent, "gain" means weight-gain intent, and
                    "maintain" means weight-maintenance intent. Compare AvgCaloriesIn
                    with GoalCalories when discussing adherence to that goal.

                    EstimatedWeightChangeKg is a mathematical estimate derived from the
                    seven-day energy balance. ActualWeightChangeKg is only the difference
                    between the first and last scale readings. Never present these values
                    as equivalent or as proof of fat gained or lost. If both exist, state
                    both clearly and explain briefly that short-term scale changes can
                    reflect water, glycogen, digestion, sodium, or weighing time. Seven
                    days are not enough to establish a body-weight trend.

                    Use restrained wording. Do not use superlatives or celebratory claims
                    such as "remarcabil", "impresionant", "excelent", "extraordinar",
                    "fantastic" or equivalents. Do not describe a diet as healthy based
                    only on calories and macros. Do not invent causes, certainty, foods,
                    diagnoses, prescriptions or facts beyond the aggregate JSON. Mention
                    at most one concrete next action and keep it proportional to the data.
                    """
            },
            new { role = "user", content = aggregatePayload }
        };

        logger.LogDebug(
            "Generating aggregate weekly nutrition narrative for user {UserId}, window {WindowStart}-{WindowEnd}",
            userId,
            statsOnly.WindowStart,
            statsOnly.WindowEnd);

        var response = await CallGroqAsync(config["Groq:TextModel"]!, messages);
        return response.Content.Trim();
    }

    // ── Context builders ──────────────────────────────────────────────────────────

    /// <summary>
    /// Loads operational data for the given module and formats it as a context string
    /// to prepend to the Groq system prompt.
    ///
    /// Returns null when no relevant data exists (new user with no entries) — in that
    /// case no context system message is added and the request proceeds as-is.
    ///
    /// PRIVACY constraints (enforced here):
    /// - No BMI, BMR, TDEE, GoalCalories, WeightKg, or HeightCm are included
    /// - Only operational/behavioural data: macro totals vs targets, workout names/durations,
    ///   session counts, steps, water
    /// - Never logged at INFO level
    /// </summary>
    private async Task<string?> BuildModuleContextAsync(string userId, string moduleContext)
    {
        try
        {
            return moduleContext switch
            {
                "nutrition"  => await BuildNutritionContextAsync(userId),
                "workouts"   => await BuildWorkoutsContextAsync(userId),
                "dashboard"  => await BuildDashboardContextAsync(userId),
                "social"     => "User is browsing the social feed. Respond about fitness community topics, motivation, or social engagement.",
                _            => null
            };
        }
        catch (Exception ex)
        {
            // Context injection failure must NEVER break the AI request — degrade gracefully
            logger.LogWarning(ex, "BuildModuleContextAsync failed for user {UserId}, module={Module}. Proceeding without context.", userId, moduleContext);
            return null;
        }
    }

    private async Task<string?> BuildNutritionContextAsync(string userId)
    {
        var macros = await nutritionService.GetTodayMacroProgressAsync(userId);
        var dietaryPreference = await db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.DietaryPreference)
            .FirstOrDefaultAsync();

        // No meals logged today — skip context (avoids confusing "0g protein" responses)
        if (macros.TotalCalories == 0 && macros.TargetCalories == 0)
            return null;

        var preference = string.IsNullOrWhiteSpace(dietaryPreference)
            ? string.Empty
            : $" Dietary preference: {dietaryPreference}.";
        return $"User's nutrition today: " +
               $"{macros.TotalProtein}g protein of {macros.TargetProtein}g target, " +
               $"{macros.TotalCarbs}g carbs of {macros.TargetCarbs}g target, " +
               $"{macros.TotalFat}g fat of {macros.TargetFat}g target. " +
               $"Total calories: {macros.TotalCalories} of {macros.TargetCalories} target.{preference}";
    }

    private async Task<string?> BuildWorkoutsContextAsync(string userId)
    {
        // Most recent non-archived workout template owned by this user
        var template = await db.WorkoutTemplates
            .AsNoTracking()
            .Where(t => t.UserId == userId && !t.IsArchived)
            .OrderByDescending(t => t.UpdatedAt)
            .Select(t => new { t.Title, t.Type, t.DurationMin })
            .FirstOrDefaultAsync();

        // Most recent completed session
        var session = await db.WorkoutSessions
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.FinishedAt)
            .Select(s => new { s.TemplateTitle, s.FinishedAt, s.SetsCompleted, s.DurationMin })
            .FirstOrDefaultAsync();

        if (template is null && session is null)
            return null;

        var parts = new List<string>();

        if (template is not null)
            parts.Add($"Most recent workout template: '{template.Title}' ({template.Type}, {template.DurationMin} min)");

        if (session is not null)
            parts.Add($"Last completed session: '{session.TemplateTitle}' on {session.FinishedAt:yyyy-MM-dd}, {session.SetsCompleted} sets, {session.DurationMin} min");

        return "User's workout context: " + string.Join(". ", parts) + ".";
    }

    private async Task<string?> BuildDashboardContextAsync(string userId)
    {
        var streak = await dailyDataService.GetStreakAsync(userId);

        var today = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");
        var entry = await db.DailyEntries
            .AsNoTracking()
            .Where(d => d.UserId == userId && d.Date == today)
            .Select(d => new { d.Steps, d.WaterConsumedL })
            .FirstOrDefaultAsync();

        // No streak and no today entry — skip context
        if (streak.Current == 0 && entry is null)
            return null;

        var sb = new StringBuilder("User's dashboard context: ");
        sb.Append($"Current streak: {streak.Current} days.");

        if (entry is not null)
        {
            sb.Append($" Today: {entry.Steps} steps, {entry.WaterConsumedL}L water");
            sb.Append('.');
        }

        return sb.ToString();
    }

    // ── Groq HTTP layer ───────────────────────────────────────────────────────────

    private async Task<AiResponse> CallGroqAsync(
        string model,
        List<object> messages,
        bool jsonMode = false)
    {
        var client = httpFactory.CreateClient("Groq");
        var requestBody = new Dictionary<string, object>
        {
            ["model"] = model,
            ["messages"] = messages,
            ["temperature"] = 0.7
        };

        // Qwen enables raw thinking output by default. Besides wasting tokens for this
        // use case, the <think> block can contain braces that break the meal JSON parser.
        // Non-thinking mode returns only the final image analysis.
        if (model.Equals("qwen/qwen3.6-27b", StringComparison.OrdinalIgnoreCase))
            requestBody["reasoning_effort"] = "none";

        if (jsonMode)
            requestBody["response_format"] = new { type = "json_object" };

        var body = JsonSerializer.Serialize(requestBody, JsonOpts);
        var content = new StringContent(body, Encoding.UTF8, "application/json");

        logger.LogInformation("Groq request → model={Model}, messages={Count}", model, messages.Count);

        var response = await client.PostAsync("/openai/v1/chat/completions", content);
        var json = await response.Content.ReadAsStringAsync();

        logger.LogInformation("Groq response ← status={Status}", (int)response.StatusCode);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Groq error body: {Body}", json);
            throw new HttpRequestException($"Groq {(int)response.StatusCode}: {json}");
        }

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
