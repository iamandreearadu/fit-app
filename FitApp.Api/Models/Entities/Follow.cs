namespace FitApp.Api.Models.Entities;

public class Follow
{
    public int Id { get; set; }
    public string FollowerId { get; set; } = string.Empty;    // the user who follows
    public string FollowingId { get; set; } = string.Empty;   // the user being followed
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User Follower { get; set; } = null!;
    public User Following { get; set; } = null!;
}
