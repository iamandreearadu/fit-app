namespace FitApp.Api.Models.DTOs;

public class NotificationResponse
{
    public int Id { get; set; }
    public UserSummary Actor { get; set; } = null!;
    public string Type { get; set; } = string.Empty;   // "like" | "comment" | "follow" | "message"
    public string Message { get; set; } = string.Empty;
    public int? ReferenceId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UnreadCountResponse
{
    public int Count { get; set; }
}
