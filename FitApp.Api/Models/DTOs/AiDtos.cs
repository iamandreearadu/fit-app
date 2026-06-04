using System.ComponentModel.DataAnnotations;

namespace FitApp.Api.Models.DTOs;

public class AiTextRequest
{
    public string Prompt { get; set; } = string.Empty;
    public string? SystemPrompt { get; set; }

    /// <summary>
    /// Module the user is currently viewing when asking the AI.
    /// When non-null, the backend injects the user's real operational data into the
    /// Groq system prompt server-side. Valid values: nutrition | workouts | dashboard | social.
    /// PRIVACY: injected context data is server-side only — never returned in AiResponse.
    /// </summary>
    [RegularExpression("^(nutrition|workouts|dashboard|social)$",
        ErrorMessage = "moduleContext must be 'nutrition', 'workouts', 'dashboard', or 'social'.")]
    public string? ModuleContext { get; set; }
}

public class AiImageRequest
{
    public string Prompt { get; set; } = string.Empty;
    public string Base64Image { get; set; } = string.Empty;
    public string MimeType { get; set; } = "image/jpeg";
    public string? SystemPrompt { get; set; }
}

public class AiResponse
{
    public string Content { get; set; } = string.Empty;
}

public class WorkoutCaloriesRequest
{
    public WorkoutInfoDto Workout { get; set; } = new();
    public UserInfoForAiDto User { get; set; } = new();
}

public class WorkoutInfoDto
{
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int DurationMin { get; set; }
    public List<WorkoutExerciseDto> Exercises { get; set; } = [];
    public CardioDetailsDto? Cardio { get; set; }
}

public class UserInfoForAiDto
{
    public double WeightKg { get; set; }
    public double HeightCm { get; set; }
    public int Age { get; set; }
    public string Gender { get; set; } = string.Empty;
    public string Activity { get; set; } = string.Empty;
}
