namespace FitApp.Api.Models.Entities;

public class UserArticle
{
    public int Id { get; set; }
    public string AuthorId { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Caption { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Image { get; set; } = string.Empty;
    public string? Category { get; set; }
    public bool IsArchived { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User Author { get; set; } = null!;
    public ICollection<Post> Posts { get; set; } = [];
}
