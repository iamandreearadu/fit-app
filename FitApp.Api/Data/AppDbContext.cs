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
    public DbSet<ChatConversation> ChatConversations => Set<ChatConversation>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();

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
    }
}
