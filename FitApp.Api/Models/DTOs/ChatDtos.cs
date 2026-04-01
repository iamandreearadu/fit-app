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
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public long Timestamp { get; set; }
}