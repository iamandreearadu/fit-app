using System.ComponentModel.DataAnnotations;

namespace FitApp.Api.Models.DTOs;

public class LoginRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(6)]
    public string Password { get; set; } = string.Empty;
}

public class RegisterRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(6)]
    public string Password { get; set; } = string.Empty;

    [Required, MinLength(2)]
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Primary fitness goal — optional for backward compatibility.
    /// Defaults to "maintain" when omitted. Stored on User.Goal and used by
    /// MetricsService to compute GoalCalories (lose = TDEE-500, gain = TDEE+500, maintain = TDEE).
    /// </summary>
    [RegularExpression("^(lose|gain|maintain)$",
        ErrorMessage = "Goal must be 'lose', 'gain', or 'maintain'.")]
    public string? Goal { get; set; }
}

public class AuthResponse
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public bool IsAdmin { get; set; } = false;
}
