namespace FitApp.Api.Models.Entities;

public class Conversation
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<ConversationParticipant> Participants { get; set; } = [];
    public ICollection<DirectMessage> Messages { get; set; } = [];
}
