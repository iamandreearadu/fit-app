namespace FitApp.Api.Models.Entities;

public class ConversationParticipant
{
    public int Id { get; set; }
    public int ConversationId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastReadAt { get; set; }

    // Navigation
    public Conversation Conversation { get; set; } = null!;
    public User User { get; set; } = null!;
}
