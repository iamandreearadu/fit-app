using System.ComponentModel.DataAnnotations;

namespace FitApp.Api.Models.DTOs;

public class ConversationDto
{
    public string Id { get; set; } = string.Empty;
    public long CreatedAt { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Preview { get; set; } = string.Empty;
    public List<ChatMessageDto> Messages { get; set; } = [];
}

public class ChatMessageDto
{
    public string? Id { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public long Timestamp { get; set; }
}

public class SaveMessageRequest
{
    [Required]
    [AllowedValues("user", "assistant")]
    public string Role { get; set; } = string.Empty;

    [Required]
    [MaxLength(16000)]
    public string Content { get; set; } = string.Empty;

    [MaxLength(2097152)] // ~2MB base64
    public string? ImageUrl { get; set; }

    public long Timestamp { get; set; }
}