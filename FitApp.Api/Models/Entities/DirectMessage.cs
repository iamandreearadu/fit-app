namespace FitApp.Api.Models.Entities;

public class DirectMessage
{
    public int Id { get; set; }
    public int ConversationId { get; set; }
    public string SenderId { get; set; } = string.Empty;
    public string? Content { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; }

    // Navigation
    public Conversation Conversation { get; set; } = null!;
    public User Sender { get; set; } = null!;
}
