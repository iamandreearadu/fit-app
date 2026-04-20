namespace FitApp.Api.Models.Entities;

public enum NotificationType
{
    Like = 0,
    Comment = 1,
    Follow = 2,
    NewMessage = 3
}

public class Notification
{
    public int Id { get; set; }
    public string RecipientId { get; set; } = string.Empty;
    public string ActorId { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    public int? ReferenceId { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User Recipient { get; set; } = null!;
    public User Actor { get; set; } = null!;
}
