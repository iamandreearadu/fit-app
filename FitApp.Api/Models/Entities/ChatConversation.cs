namespace FitApp.Api.Models.Entities;

public class ChatConversation
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public long CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public ICollection<ChatMessage> Messages { get; set; } = [];
}

public class ChatMessage
{
    public int Id { get; set; }
    public int ConversationId { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public long Timestamp { get; set; }

    public ChatConversation Conversation { get; set; } = null!;
}
