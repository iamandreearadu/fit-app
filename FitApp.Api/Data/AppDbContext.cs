using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<DailyEntry> DailyEntries => Set<DailyEntry>();
    public DbSet<WorkoutTemplate> WorkoutTemplates => Set<WorkoutTemplate>();
    public DbSet<WorkoutExercise> WorkoutExercises => Set<WorkoutExercise>();
    public DbSet<CardioDetails> CardioDetails => Set<CardioDetails>();
    public DbSet<MealEntry> MealEntries => Set<MealEntry>();
    public DbSet<FoodItem> FoodItems => Set<FoodItem>();
    public DbSet<BlogPost> BlogPosts => Set<BlogPost>();
    public DbSet<UserArticle> UserArticles => Set<UserArticle>();
    public DbSet<ChatConversation> ChatConversations => Set<ChatConversation>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();

    // Social / Messaging / Notifications
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<Like> Likes => Set<Like>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Follow> Follows => Set<Follow>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<ConversationParticipant> ConversationParticipants => Set<ConversationParticipant>();
    public DbSet<DirectMessage> DirectMessages => Set<DirectMessage>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<DailyEntry>(e =>
        {
            e.HasKey(d => d.Id);
            e.HasIndex(d => new { d.UserId, d.Date }).IsUnique();
            e.HasOne(d => d.User).WithMany(u => u.DailyEntries).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<WorkoutTemplate>(e =>
        {
            e.HasKey(w => w.Id);
            e.HasOne(w => w.User).WithMany(u => u.WorkoutTemplates).HasForeignKey(w => w.UserId);
            e.HasMany(w => w.Exercises).WithOne(ex => ex.WorkoutTemplate).HasForeignKey(ex => ex.WorkoutTemplateId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(w => w.Cardio).WithOne(c => c.WorkoutTemplate).HasForeignKey<CardioDetails>(c => c.WorkoutTemplateId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MealEntry>(e =>
        {
            e.HasKey(m => m.Id);
            e.HasOne(m => m.User).WithMany(u => u.MealEntries).HasForeignKey(m => m.UserId);
            e.HasMany(m => m.Items).WithOne(f => f.MealEntry).HasForeignKey(f => f.MealEntryId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BlogPost>(e =>
        {
            e.HasKey(b => b.Id);
        });

        modelBuilder.Entity<UserArticle>(e =>
        {
            e.HasKey(a => a.Id);
            e.HasOne(a => a.Author)
                .WithMany(u => u.UserArticles)
                .HasForeignKey(a => a.AuthorId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ChatConversation>(e =>
        {
            e.HasKey(c => c.Id);
            e.HasOne(c => c.User).WithMany(u => u.ChatConversations).HasForeignKey(c => c.UserId);
            e.HasMany(c => c.Messages).WithOne(m => m.Conversation).HasForeignKey(m => m.ConversationId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ChatMessage>(e =>
        {
            e.HasKey(m => m.Id);
        });

        // ── Social ────────────────────────────────────────────────────────────

        modelBuilder.Entity<Post>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.Content).HasMaxLength(500);
            e.HasOne(p => p.User)
                .WithMany(u => u.Posts)
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(p => p.LinkedWorkout)
                .WithMany()
                .HasForeignKey(p => p.LinkedWorkoutId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(p => p.LinkedMeal)
                .WithMany()
                .HasForeignKey(p => p.LinkedMealId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(p => p.LinkedDailyEntry)
                .WithMany()
                .HasForeignKey(p => p.LinkedDailyEntryId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(p => new { p.UserId, p.CreatedAt });
            e.HasOne(p => p.Article)
                .WithMany(a => a.Posts)
                .HasForeignKey(p => p.ArticleId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Like>(e =>
        {
            e.HasKey(l => l.Id);
            e.HasIndex(l => new { l.UserId, l.PostId }).IsUnique();
            e.HasOne(l => l.User)
                .WithMany(u => u.Likes)
                .HasForeignKey(l => l.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(l => l.Post)
                .WithMany(p => p.Likes)
                .HasForeignKey(l => l.PostId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Comment>(e =>
        {
            e.HasKey(c => c.Id);
            e.Property(c => c.Content).HasMaxLength(300);
            e.HasOne(c => c.User)
                .WithMany(u => u.Comments)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(c => c.Post)
                .WithMany(p => p.Comments)
                .HasForeignKey(c => c.PostId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Follow>(e =>
        {
            e.HasKey(f => f.Id);
            e.HasIndex(f => new { f.FollowerId, f.FollowingId }).IsUnique();
            // Both FKs use Restrict to avoid cascade delete cycles
            e.HasOne(f => f.Follower)
                .WithMany(u => u.Following)
                .HasForeignKey(f => f.FollowerId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(f => f.Following)
                .WithMany(u => u.Followers)
                .HasForeignKey(f => f.FollowingId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Direct Messaging ──────────────────────────────────────────────────

        modelBuilder.Entity<Conversation>(e =>
        {
            e.HasKey(c => c.Id);
            e.HasMany(c => c.Participants)
                .WithOne(p => p.Conversation)
                .HasForeignKey(p => p.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasMany(c => c.Messages)
                .WithOne(m => m.Conversation)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ConversationParticipant>(e =>
        {
            e.HasKey(cp => cp.Id);
            e.HasIndex(cp => new { cp.ConversationId, cp.UserId }).IsUnique();
            e.HasOne(cp => cp.User)
                .WithMany(u => u.ConversationParticipants)
                .HasForeignKey(cp => cp.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DirectMessage>(e =>
        {
            e.HasKey(m => m.Id);
            e.HasOne(m => m.Sender)
                .WithMany()
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(m => new { m.ConversationId, m.SentAt });
        });

        // ── Notifications ─────────────────────────────────────────────────────

        modelBuilder.Entity<Notification>(e =>
        {
            e.HasKey(n => n.Id);
            e.HasOne(n => n.Recipient)
                .WithMany(u => u.ReceivedNotifications)
                .HasForeignKey(n => n.RecipientId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(n => n.Actor)
                .WithMany()
                .HasForeignKey(n => n.ActorId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(n => new { n.RecipientId, n.IsRead, n.CreatedAt });
        });
    }
}
