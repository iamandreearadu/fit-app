using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Data.Seeds;

/// <summary>
/// Seeds the NovaFit Official account with 10 posts and 3 articles.
///
/// The account is:
///   - IsSystemAccount = true  → excluded from suggested users, user search
///   - IsVerified     = true  → renders verification badge on posts and profile
///   - IsAdmin        = true  → can be managed via admin blog endpoints
///   - OnboardingCompleted = true → skips onboarding guard
///
/// PRIVACY: No biometric data (weight/height/BMI/calories) on the account or posts.
///
/// Idempotent: returns immediately if the official user already exists.
/// </summary>
public static class NovaFitOfficialSeeder
{
    private const string OfficialUserId = "novafit-official-001";

    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Users.AnyAsync(u => u.Id == OfficialUserId))
            return;

        // ── Official Account ──────────────────────────────────────────────────

        var official = new User
        {
            Id                  = OfficialUserId,
            Email               = "official@novafit.com",
            FullName            = "NovaFit Official",
            PasswordHash        = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()), // random — no real login
            Gender              = string.Empty,
            Age                 = 0,
            HeightCm            = 0,
            WeightKg            = 0,
            Goal                = string.Empty,
            Activity            = string.Empty,
            ImageUrl            = "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?fm=jpg&q=80&w=400&h=400&auto=format&fit=crop",
            Bio                 = "Official NovaFit account. Workout tips, nutrition advice, and motivation. 💪🌱",
            IsAdmin             = true,
            IsVerified          = true,
            IsSystemAccount     = true,
            OnboardingCompleted = true,
            UpdatedAt           = DateTime.UtcNow
        };

        db.Users.Add(official);
        await db.SaveChangesAsync();   // flush user so FK on BlogPost/Post resolves

        // ── Articles (3) ──────────────────────────────────────────────────────

        var articleTraining = new BlogPost
        {
            Title       = "The Beginner's Guide to Building Your First Workout Plan",
            Caption     = "Start strong. Build smarter. Your first plan doesn't need to be perfect — it needs to be consistent.",
            Description = "Building your first workout plan can feel overwhelming, but it doesn't have to be. " +
                          "Start with 3 days per week and choose compound movements: squat, hinge, push, pull. " +
                          "Add 5–10 minutes of warm-up and cool-down. Track your sessions and aim to improve one variable each week — " +
                          "more weight, more reps, or less rest. Consistency beats perfection every time. " +
                          "After 4–6 weeks, reassess and adjust based on your progress. Remember: the best workout plan is the one you'll actually follow.",
            Category    = "Training",
            Image       = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?fm=jpg&q=80&w=1200&h=630&auto=format&fit=crop",
            Date        = "June 3, 2026",
            AuthorId    = OfficialUserId,
            CreatedAt   = DateTime.UtcNow.AddDays(-5),
            UpdatedAt   = DateTime.UtcNow.AddDays(-5)
        };

        var articleNutrition = new BlogPost
        {
            Title       = "Understanding Your Macros: A No-BS Guide",
            Caption     = "Protein, carbs, fats — what they do, how much you need, and why the ratio matters.",
            Description = "Macronutrients are the building blocks of your diet. Protein (4 kcal/g) repairs and builds muscle — " +
                          "aim for 1.6–2.2g per kg of bodyweight. Carbohydrates (4 kcal/g) are your body's primary fuel source — " +
                          "especially important around workouts. Fats (9 kcal/g) support hormone production and nutrient absorption — " +
                          "don't cut them too low. A balanced split to start: 30% protein, 40% carbs, 30% fat. " +
                          "Adjust based on your goal: higher protein for muscle gain, lower carbs for fat loss. " +
                          "Track for 2 weeks to understand your baseline before making changes.",
            Category    = "Nutrition",
            Image       = "https://images.unsplash.com/photo-1490645935967-10de6ba17061?fm=jpg&q=80&w=1200&h=630&auto=format&fit=crop",
            Date        = "June 2, 2026",
            AuthorId    = OfficialUserId,
            CreatedAt   = DateTime.UtcNow.AddDays(-6),
            UpdatedAt   = DateTime.UtcNow.AddDays(-6)
        };

        var articleWellness = new BlogPost
        {
            Title       = "Sleep and Recovery: The Missing Piece of Your Fitness Puzzle",
            Caption     = "You don't grow in the gym. You grow when you recover. Here's how to make that happen.",
            Description = "Most people obsess over training and nutrition but neglect recovery. Sleep is when your body repairs muscle, " +
                          "balances hormones, and consolidates motor patterns learned during training. Aim for 7–9 hours per night. " +
                          "Signs of under-recovery: persistent soreness, performance stagnation, mood changes, disrupted sleep. " +
                          "Active recovery strategies: walking, light stretching, foam rolling, cold/hot contrast showers. " +
                          "Training hard on insufficient sleep is a net negative — the cortisol spike and reduced protein synthesis " +
                          "cancel out much of your effort. Protect your sleep like you protect your training schedule.",
            Category    = "Wellness",
            Image       = "https://images.unsplash.com/photo-1506126613408-eca07ce68773?fm=jpg&q=80&w=1200&h=630&auto=format&fit=crop",
            Date        = "June 1, 2026",
            AuthorId    = OfficialUserId,
            CreatedAt   = DateTime.UtcNow.AddDays(-7),
            UpdatedAt   = DateTime.UtcNow.AddDays(-7)
        };

        db.BlogPosts.AddRange(articleTraining, articleNutrition, articleWellness);
        await db.SaveChangesAsync();   // flush articles so their IDs are available for post FKs

        // ── Posts (10) ────────────────────────────────────────────────────────
        // Posts 1–8: standalone tips (no article link, no linked content).
        // Posts 9–10: article-linked posts (ArticleId points to articles above).
        //
        // PRIVACY: no calories, macros, weight, or health metrics in post content.

        var posts = new List<Post>
        {
            new()
            {
                UserId    = OfficialUserId,
                Content   = "💡 Tip: Progressive overload doesn't mean adding weight every session. " +
                            "You can also overload by adding reps, adding sets, or reducing rest time. " +
                            "Variety keeps your muscles adapting.",
                ImageUrl  = "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?fm=jpg&q=80&w=800&auto=format&fit=crop",
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new()
            {
                UserId    = OfficialUserId,
                Content   = "🍳 Protein at every meal — aim for 25–40g per sitting. " +
                            "Your body can only synthesise so much at once. Spreading intake across 3–4 meals " +
                            "maximises muscle protein synthesis throughout the day.",
                ImageUrl  = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?fm=jpg&q=80&w=800&auto=format&fit=crop",
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new()
            {
                UserId    = OfficialUserId,
                Content   = "🏋️ Rest days are training days. Your muscles grow during recovery, not during the workout itself. " +
                            "Schedule at least 1–2 full rest days per week. Active rest (light walk, stretching) beats total inactivity.",
                ImageUrl  = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?fm=jpg&q=80&w=800&auto=format&fit=crop",
                CreatedAt = DateTime.UtcNow.AddDays(-3)
            },
            new()
            {
                UserId    = OfficialUserId,
                Content   = "💧 Quick hydration check: divide your bodyweight (kg) by 30 to get your minimum daily water target in litres. " +
                            "Add 0.5–1L for every hour of exercise. Thirst is a late signal — don't wait for it.",
                ImageUrl  = "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?fm=jpg&q=80&w=800&auto=format&fit=crop",
                CreatedAt = DateTime.UtcNow.AddDays(-4)
            },
            new()
            {
                UserId    = OfficialUserId,
                Content   = "🔥 The best workout is the one you actually do consistently. " +
                            "A mediocre routine performed for 6 months beats the perfect routine performed for 3 weeks. " +
                            "Show up, do the work, and let compounding do the rest.",
                ImageUrl  = "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?fm=jpg&q=80&w=800&auto=format&fit=crop",
                CreatedAt = DateTime.UtcNow.AddDays(-8)
            },
            new()
            {
                UserId    = OfficialUserId,
                Content   = "📊 Tracking tip: don't aim for perfection. Aim for awareness. " +
                            "Logging your food and workouts — even imperfectly — reveals patterns you'd never notice otherwise. " +
                            "Data beats intuition when it comes to long-term progress.",
                ImageUrl  = "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?fm=jpg&q=80&w=800&auto=format&fit=crop",
                CreatedAt = DateTime.UtcNow.AddDays(-10)
            },
            new()
            {
                UserId    = OfficialUserId,
                Content   = "🧘 Mobility work before strength training = better range of motion, safer lifts, and more muscle engagement. " +
                            "5–10 minutes of dynamic stretching is all it takes. Hip circles, leg swings, shoulder rotations. Do it.",
                ImageUrl  = "https://images.unsplash.com/photo-1552196563-55cd4e45efb3?fm=jpg&q=80&w=800&auto=format&fit=crop",
                CreatedAt = DateTime.UtcNow.AddDays(-12)
            },
            new()
            {
                UserId    = OfficialUserId,
                Content   = "🥗 Eating more vegetables is the single most impactful dietary change most people can make. " +
                            "High volume, high fibre, high micronutrients, low energy density. " +
                            "They fill you up and crowd out less nutritious options naturally.",
                ImageUrl  = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?fm=jpg&q=80&w=800&auto=format&fit=crop",
                CreatedAt = DateTime.UtcNow.AddDays(-14)
            },
            // Article-linked post 1: Training article
            new()
            {
                UserId    = OfficialUserId,
                Content   = articleTraining.Caption,
                ImageUrl  = articleTraining.Image,
                ArticleId = articleTraining.Id,
                CreatedAt = articleTraining.CreatedAt
            },
            // Article-linked post 2: Nutrition article
            new()
            {
                UserId    = OfficialUserId,
                Content   = articleNutrition.Caption,
                ImageUrl  = articleNutrition.Image,
                ArticleId = articleNutrition.Id,
                CreatedAt = articleNutrition.CreatedAt
            }
        };

        db.Posts.AddRange(posts);
        await db.SaveChangesAsync();
    }
}
