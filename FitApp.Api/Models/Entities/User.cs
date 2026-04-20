namespace FitApp.Api.Models.Entities;

public class User
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Gender { get; set; } = string.Empty;       // male | female | other
    public int Age { get; set; }
    public double HeightCm { get; set; }
    public double WeightKg { get; set; }
    public string Goal { get; set; } = string.Empty;         // lose | gain | maintain
    public string Activity { get; set; } = string.Empty;     // sedentary | light | moderate | active | athlete
    public string? ImageUrl { get; set; }
    public string? Bio { get; set; }
    public bool IsAdmin { get; set; } = false;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Fitness Metrics (stored inline)
    public double? Bmi { get; set; }
    public double? Bmr { get; set; }
    public double? Tdee { get; set; }
    public double? GoalCalories { get; set; }
    public double? WaterL { get; set; }
    public string? BmiCat { get; set; }
    public DateTime? MetricsUpdatedAt { get; set; }

    // Navigation
    public ICollection<DailyEntry> DailyEntries { get; set; } = [];
    public ICollection<WorkoutTemplate> WorkoutTemplates { get; set; } = [];
    public ICollection<MealEntry> MealEntries { get; set; } = [];
    public ICollection<ChatConversation> ChatConversations { get; set; } = [];

    // Social navigation
    public ICollection<Post> Posts { get; set; } = [];
    public ICollection<Like> Likes { get; set; } = [];
    public ICollection<Comment> Comments { get; set; } = [];
    public ICollection<Follow> Followers { get; set; } = [];       // users who follow this user (FollowingId == this.Id)
    public ICollection<Follow> Following { get; set; } = [];       // users this user follows (FollowerId == this.Id)
    public ICollection<ConversationParticipant> ConversationParticipants { get; set; } = [];
    public ICollection<Notification> ReceivedNotifications { get; set; } = [];
}
