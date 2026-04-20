using System.ComponentModel.DataAnnotations;

namespace FitApp.Api.Models.Entities;

public class Comment
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int PostId { get; set; }

    [MaxLength(300)]
    public string Content { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public Post Post { get; set; } = null!;
}
