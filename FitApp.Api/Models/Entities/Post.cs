using System.ComponentModel.DataAnnotations;

namespace FitApp.Api.Models.Entities;

public class Post
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Content { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }
    public int? LinkedWorkoutId { get; set; }
    public int? LinkedMealId { get; set; }
    public int? LinkedDailyEntryId { get; set; }
    public int LikesCount { get; set; }
    public int CommentsCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsArchived { get; set; } = false;
    public int? ArticleId { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public BlogPost? Article { get; set; }
    public WorkoutTemplate? LinkedWorkout { get; set; }
    public MealEntry? LinkedMeal { get; set; }
    public DailyEntry? LinkedDailyEntry { get; set; }
    public ICollection<Like> Likes { get; set; } = [];
    public ICollection<Comment> Comments { get; set; } = [];
}
