using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Data.Seeds;

public static class UserSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Users.AnyAsync(u => u.Email == "alex@novafit.com"))
            return;

        // ── Users ─────────────────────────────────────────────────────────────────

        var alex = new User
        {
            Id = "seed-user-alex-001",
            Email = "alex@novafit.com",
            FullName = "Alex Popescu",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Alex2026!"),
            Gender = "male",
            Age = 28,
            HeightCm = 180,
            WeightKg = 82,
            Goal = "lose",
            Activity = "active",
            OnboardingCompleted = true,
            DietaryPreference = "high-protein",
            Bio = "Fitness enthusiast. Pushing limits daily. 💪",
            ImageUrl = "https://images.unsplash.com/photo-1626724419913-ac60f768c20f?fm=jpg&q=80&w=400&h=400&auto=format&fit=crop&crop=face",
            Bmi = 25.3,
            Bmr = 1943,
            Tdee = 3012,
            GoalCalories = 2512,
            WaterL = 3.2,
            BmiCat = "Normal",
            UpdatedAt = DateTime.UtcNow,
            MetricsUpdatedAt = DateTime.UtcNow
        };

        var maria = new User
        {
            Id = "seed-user-maria-002",
            Email = "maria@novafit.com",
            FullName = "Maria Ionescu",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Maria2026!"),
            Gender = "female",
            Age = 26,
            HeightCm = 165,
            WeightKg = 58,
            Goal = "maintain",
            Activity = "moderate",
            OnboardingCompleted = true,
            DietaryPreference = "no-restriction",
            Bio = "Yoga, pilates & clean eating. Balance is everything. 🧘",
            ImageUrl = "https://images.unsplash.com/photo-1518708909080-704599b19972?fm=jpg&q=80&w=400&h=400&auto=format&fit=crop&crop=face",
            Bmi = 21.3,
            Bmr = 1432,
            Tdee = 1976,
            GoalCalories = 1976,
            WaterL = 2.4,
            BmiCat = "Normal",
            UpdatedAt = DateTime.UtcNow,
            MetricsUpdatedAt = DateTime.UtcNow
        };

        db.Users.AddRange(alex, maria);

        // ── Workouts — Alex ───────────────────────────────────────────────────────

        var alexPushDay = new WorkoutTemplate
        {
            UserId = alex.Id,
            Title = "Push Day",
            Type = "Strength",
            DurationMin = 60,
            CaloriesEstimateKcal = 380,
            Notes = "Chest, shoulders, triceps",
            CreatedAt = Ago(25),
            UpdatedAt = Ago(25),
            Exercises =
            [
                new() { Name = "Bench Press", Sets = 4, Reps = 8, WeightKg = 80, Order = 1 },
                new() { Name = "Incline Dumbbell Press", Sets = 3, Reps = 10, WeightKg = 28, Order = 2 },
                new() { Name = "Overhead Press", Sets = 4, Reps = 8, WeightKg = 55, Order = 3 },
                new() { Name = "Lateral Raises", Sets = 3, Reps = 15, WeightKg = 12, Order = 4 },
                new() { Name = "Tricep Pushdown", Sets = 3, Reps = 12, WeightKg = 25, Order = 5 }
            ]
        };

        var alexPullDay = new WorkoutTemplate
        {
            UserId = alex.Id,
            Title = "Pull Day",
            Type = "Strength",
            DurationMin = 55,
            CaloriesEstimateKcal = 350,
            Notes = "Back, biceps, rear delts",
            CreatedAt = Ago(22),
            UpdatedAt = Ago(22),
            Exercises =
            [
                new() { Name = "Deadlift", Sets = 4, Reps = 5, WeightKg = 120, Order = 1 },
                new() { Name = "Pull-ups", Sets = 4, Reps = 8, WeightKg = 0, Order = 2 },
                new() { Name = "Barbell Row", Sets = 3, Reps = 10, WeightKg = 70, Order = 3 },
                new() { Name = "Face Pulls", Sets = 3, Reps = 15, WeightKg = 20, Order = 4 },
                new() { Name = "Barbell Curl", Sets = 3, Reps = 12, WeightKg = 30, Order = 5 }
            ]
        };

        var alexLegDay = new WorkoutTemplate
        {
            UserId = alex.Id,
            Title = "Leg Day",
            Type = "Strength",
            DurationMin = 70,
            CaloriesEstimateKcal = 480,
            Notes = "Quads, hamstrings, calves",
            CreatedAt = Ago(18),
            UpdatedAt = Ago(18),
            Exercises =
            [
                new() { Name = "Back Squat", Sets = 5, Reps = 5, WeightKg = 100, Order = 1 },
                new() { Name = "Romanian Deadlift", Sets = 4, Reps = 10, WeightKg = 80, Order = 2 },
                new() { Name = "Leg Press", Sets = 3, Reps = 12, WeightKg = 160, Order = 3 },
                new() { Name = "Leg Curl", Sets = 3, Reps = 12, WeightKg = 45, Order = 4 },
                new() { Name = "Standing Calf Raise", Sets = 4, Reps = 15, WeightKg = 60, Order = 5 }
            ]
        };

        var alexHiit = new WorkoutTemplate
        {
            UserId = alex.Id,
            Title = "HIIT Circuit",
            Type = "HIIT",
            DurationMin = 30,
            CaloriesEstimateKcal = 420,
            Notes = "6 rounds, 40s on / 20s off",
            CreatedAt = Ago(12),
            UpdatedAt = Ago(12),
            Exercises =
            [
                new() { Name = "Burpees", Sets = 6, Reps = 10, WeightKg = 0, Order = 1 },
                new() { Name = "Jump Squats", Sets = 6, Reps = 15, WeightKg = 0, Order = 2 },
                new() { Name = "Mountain Climbers", Sets = 6, Reps = 20, WeightKg = 0, Order = 3 },
                new() { Name = "Box Jumps", Sets = 6, Reps = 10, WeightKg = 0, Order = 4 }
            ]
        };

        var alexRun = new WorkoutTemplate
        {
            UserId = alex.Id,
            Title = "Morning Run",
            Type = "Cardio",
            DurationMin = 45,
            CaloriesEstimateKcal = 340,
            CreatedAt = Ago(7),
            UpdatedAt = Ago(7),
            Cardio = new CardioDetails { Km = 7.5, Incline = 1.5, Notes = "Steady state, zone 2" }
        };

        db.WorkoutTemplates.AddRange(alexPushDay, alexPullDay, alexLegDay, alexHiit, alexRun);

        // ── Workouts — Maria ──────────────────────────────────────────────────────

        var mariaFullBody = new WorkoutTemplate
        {
            UserId = maria.Id,
            Title = "Full Body Circuit",
            Type = "Circuit",
            DurationMin = 50,
            CaloriesEstimateKcal = 320,
            Notes = "3 rounds, minimal rest",
            CreatedAt = Ago(20),
            UpdatedAt = Ago(20),
            Exercises =
            [
                new() { Name = "Goblet Squat", Sets = 3, Reps = 12, WeightKg = 16, Order = 1 },
                new() { Name = "Dumbbell Row", Sets = 3, Reps = 12, WeightKg = 14, Order = 2 },
                new() { Name = "Hip Thrust", Sets = 3, Reps = 15, WeightKg = 40, Order = 3 },
                new() { Name = "Push-ups", Sets = 3, Reps = 12, WeightKg = 0, Order = 4 },
                new() { Name = "Romanian Deadlift", Sets = 3, Reps = 12, WeightKg = 30, Order = 5 }
            ]
        };

        var mariaYoga = new WorkoutTemplate
        {
            UserId = maria.Id,
            Title = "Morning Yoga Flow",
            Type = "Other",
            DurationMin = 60,
            CaloriesEstimateKcal = 180,
            Notes = "Sun salutations + hip openers",
            CreatedAt = Ago(15),
            UpdatedAt = Ago(15),
            Exercises =
            [
                new() { Name = "Sun Salutation A", Sets = 5, Reps = 1, WeightKg = 0, Order = 1 },
                new() { Name = "Warrior Sequence", Sets = 3, Reps = 1, WeightKg = 0, Order = 2 },
                new() { Name = "Pigeon Pose", Sets = 2, Reps = 1, WeightKg = 0, Order = 3 }
            ]
        };

        var mariaPilates = new WorkoutTemplate
        {
            UserId = maria.Id,
            Title = "Core Pilates",
            Type = "Other",
            DurationMin = 45,
            CaloriesEstimateKcal = 220,
            Notes = "Reformer-style floor work",
            CreatedAt = Ago(10),
            UpdatedAt = Ago(10),
            Exercises =
            [
                new() { Name = "The Hundred", Sets = 1, Reps = 100, WeightKg = 0, Order = 1 },
                new() { Name = "Roll-up", Sets = 3, Reps = 10, WeightKg = 0, Order = 2 },
                new() { Name = "Leg Circles", Sets = 3, Reps = 10, WeightKg = 0, Order = 3 },
                new() { Name = "Side Kick Series", Sets = 2, Reps = 15, WeightKg = 0, Order = 4 }
            ]
        };

        var mariaRun = new WorkoutTemplate
        {
            UserId = maria.Id,
            Title = "Evening Run",
            Type = "Cardio",
            DurationMin = 40,
            CaloriesEstimateKcal = 280,
            CreatedAt = Ago(5),
            UpdatedAt = Ago(5),
            Cardio = new CardioDetails { Km = 5.5, Incline = 0.5, Notes = "Easy pace, enjoy the sunset" }
        };

        db.WorkoutTemplates.AddRange(mariaFullBody, mariaYoga, mariaPilates, mariaRun);

        // ── Meals — Alex ──────────────────────────────────────────────────────────

        db.MealEntries.AddRange(
            MealOf(alex.Id, "Oats & Protein Shake", "Breakfast", Ago(3).ToString("yyyy-MM-dd"),
                FoodOf("Rolled Oats", 80, 304, 10, 54, 5),
                FoodOf("Whey Protein", 40, 152, 30, 6, 2),
                FoodOf("Banana", 120, 107, 1.3, 27, 0.4),
                FoodOf("Whole Milk", 200, 122, 6.4, 9.6, 6.4)),
            MealOf(alex.Id, "Chicken & Rice", "Lunch", Ago(3).ToString("yyyy-MM-dd"),
                FoodOf("Chicken Breast", 200, 220, 46, 0, 4),
                FoodOf("Basmati Rice", 150, 195, 4, 44, 0.5),
                FoodOf("Broccoli", 100, 34, 2.8, 7, 0.4),
                FoodOf("Olive Oil", 15, 133, 0, 0, 15)),
            MealOf(alex.Id, "Salmon & Sweet Potato", "Dinner", Ago(3).ToString("yyyy-MM-dd"),
                FoodOf("Salmon Fillet", 180, 374, 35, 0, 25),
                FoodOf("Sweet Potato", 200, 172, 3.2, 40, 0.2),
                FoodOf("Spinach", 80, 18, 2.3, 1.2, 0.3)),
            MealOf(alex.Id, "Greek Yogurt & Eggs", "Breakfast", Ago(1).ToString("yyyy-MM-dd"),
                FoodOf("Greek Yogurt 0%", 200, 118, 20, 8, 0.6),
                FoodOf("Scrambled Eggs", 150, 215, 18, 1.5, 15),
                FoodOf("Whole Grain Toast", 60, 162, 6, 30, 2)),
            MealOf(alex.Id, "Pre-Workout Snack", "Pre-workout", Ago(1).ToString("yyyy-MM-dd"),
                FoodOf("Rice Cakes", 40, 148, 2.8, 32, 1),
                FoodOf("Peanut Butter", 20, 118, 4.8, 4, 10),
                FoodOf("Apple", 150, 78, 0.4, 20, 0.2))
        );

        // ── Meals — Maria ─────────────────────────────────────────────────────────

        db.MealEntries.AddRange(
            MealOf(maria.Id, "Avocado Toast", "Breakfast", Ago(4).ToString("yyyy-MM-dd"),
                FoodOf("Sourdough Bread", 70, 182, 6.4, 36, 1.2),
                FoodOf("Avocado", 80, 128, 1.6, 6.4, 11.7),
                FoodOf("Poached Eggs", 110, 157, 13, 0.8, 11),
                FoodOf("Cherry Tomatoes", 60, 18, 0.9, 3.5, 0.2)),
            MealOf(maria.Id, "Quinoa Bowl", "Lunch", Ago(4).ToString("yyyy-MM-dd"),
                FoodOf("Quinoa", 100, 368, 14, 64, 6),
                FoodOf("Chickpeas", 100, 164, 8.9, 27, 2.6),
                FoodOf("Feta Cheese", 30, 80, 4.2, 0.4, 6.4),
                FoodOf("Mixed Greens", 60, 14, 1.4, 2.3, 0.2),
                FoodOf("Lemon Tahini Dressing", 25, 95, 2.8, 2.4, 8.4)),
            MealOf(maria.Id, "Lentil Soup", "Dinner", Ago(4).ToString("yyyy-MM-dd"),
                FoodOf("Red Lentils", 100, 352, 24, 63, 1.1),
                FoodOf("Carrots", 80, 33, 0.7, 7.7, 0.2),
                FoodOf("Crusty Bread", 50, 138, 4.6, 27, 1.2)),
            MealOf(maria.Id, "Post-Workout Smoothie", "Post-workout", Ago(2).ToString("yyyy-MM-dd"),
                FoodOf("Protein Powder", 30, 120, 24, 4, 2),
                FoodOf("Frozen Berries", 100, 57, 0.7, 14, 0.3),
                FoodOf("Oat Milk", 200, 90, 3, 16, 2),
                FoodOf("Flaxseeds", 10, 55, 1.9, 3, 4.3))
        );

        // ── Daily Entries — Alex (21 days) ────────────────────────────────────────

        var alexActivities = new[] { "Strength Training", "Rest Day", "Strength Training", "Cardio", "Strength Training", "Active Rest Day", "Rest Day" };
        for (int i = 21; i >= 1; i--)
        {
            var activity = alexActivities[i % 7];
            var isRestDay = activity is "Rest Day" or "Active Rest Day";
            db.DailyEntries.Add(new DailyEntry
            {
                UserId = alex.Id,
                Date = Ago(i).ToString("yyyy-MM-dd"),
                ActivityType = activity,
                WaterConsumedL = isRestDay ? 2.2 : 3.1 + (i % 3) * 0.2,
                Steps = isRestDay ? 5200 + (i * 130) : 8500 + (i * 200),
                StepTarget = 10000,
                CaloriesIntake = isRestDay ? 2100 + (i * 10) : 2600 + (i * 15),
                CaloriesBurned = isRestDay ? 320 : 480 + (i * 8),
                CaloriesTotal = isRestDay ? 1780 : 2120,
                MacrosProtein = 35 + (i % 5),
                MacrosCarbs = 40 - (i % 4),
                MacrosFats = 25 - (i % 3),
                UpdatedAt = Ago(i)
            });
        }

        // ── Daily Entries — Maria (21 days) ───────────────────────────────────────

        var mariaActivities = new[] { "Cardio", "Rest Day", "Active Rest Day", "Strength Training", "Rest Day", "Cardio", "Active Rest Day" };
        for (int i = 21; i >= 1; i--)
        {
            var activity = mariaActivities[i % 7];
            var isRestDay = activity is "Rest Day";
            db.DailyEntries.Add(new DailyEntry
            {
                UserId = maria.Id,
                Date = Ago(i).ToString("yyyy-MM-dd"),
                ActivityType = activity,
                WaterConsumedL = isRestDay ? 1.8 : 2.5 + (i % 3) * 0.15,
                Steps = isRestDay ? 4800 + (i * 100) : 7200 + (i * 150),
                StepTarget = 8000,
                CaloriesIntake = isRestDay ? 1700 + (i * 8) : 2050 + (i * 10),
                CaloriesBurned = isRestDay ? 250 : 380 + (i * 6),
                CaloriesTotal = isRestDay ? 1450 : 1670,
                MacrosProtein = 25 + (i % 5),
                MacrosCarbs = 48 - (i % 4),
                MacrosFats = 27 - (i % 3),
                UpdatedAt = Ago(i)
            });
        }

        // ── Articles (BlogPost) — Alex (5) ───────────────────────────────────────

        var alexArticles = new List<BlogPost>
        {
            new()
            {
                AuthorId = alex.Id,
                Title = "My Push/Pull/Legs Journey: 6 Months In",
                Caption = "What I learned after committing to PPL for half a year.",
                Description = "Six months ago I started a Push/Pull/Legs split and everything changed. I went from training randomly 4 days a week to a structured 6-day program, and the results have been remarkable.\n\nThe biggest lesson: frequency matters more than volume per session. Hitting each muscle group twice a week with moderate volume beats one mega-session per week. My chest and back responded immediately to the increased frequency.\n\nNutrition was the other half. I dialed in 180g of protein daily — roughly 2.2g per kg — and the muscle retention during my cut improved dramatically. I stopped losing strength at a caloric deficit once I hit that protein target consistently.\n\nMy strength numbers after 6 months: Bench Press 80kg → 102.5kg. Deadlift 120kg → 157.5kg. Back Squat 100kg → 130kg. These aren't elite numbers, but for a natural lifter in 6 months, I'm genuinely happy.\n\nIf you're considering PPL, my advice: start with the 3-day version (one session per day) before jumping to 6 days. Let your body adapt. And don't skip the pull days — most beginners are quad and chest dominant, and balanced back development prevents injury.",
                Image = "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                Category = "Training",
                Date = "March 2026",
                CreatedAt = Ago(20),
                UpdatedAt = Ago(20)
            },
            new()
            {
                AuthorId = alex.Id,
                Title = "High Protein on a Budget: My Weekly Meal Prep",
                Caption = "Hitting 180g of protein daily without spending a fortune.",
                Description = "People think eating high protein is expensive. It doesn't have to be. My weekly grocery bill for 2,500 kcal / 180g protein comes to about 50 RON per day — less than a restaurant lunch.\n\nThe pillars of my budget high-protein diet: chicken thighs (cheaper than breast, more flavour), eggs (the most cost-efficient protein source per gram), canned tuna (quick, no cooking needed), and Greek yogurt (protein-dense and fills the protein gap between meals).\n\nI prep on Sunday. 1.5kg of chicken thighs seasoned three different ways — Italian herbs, paprika-garlic, and teriyaki glaze — roasted at 200°C for 35 minutes. 800g of rice cooked and portioned into containers. A big batch of roasted vegetables. This covers lunch and dinner for 5 days.\n\nBreakfast rotates between oats with whey and Greek yogurt with fruit. Both take under 3 minutes to prepare. Pre-workout is rice cakes with peanut butter — 30g carbs, 10g protein, ready in 30 seconds.\n\nThe key insight: consistency beats perfection. Eating 170g protein every day beats eating 220g on two days and 80g on five days. Meal prep makes consistency automatic.",
                Image = "https://images.unsplash.com/photo-1498837167922-ddd27525d352?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                Category = "Nutrition",
                Date = "March 2026",
                CreatedAt = Ago(15),
                UpdatedAt = Ago(15)
            },
            new()
            {
                AuthorId = alex.Id,
                Title = "Why I Added Zone 2 Cardio to My Strength Program",
                Caption = "Cardio doesn't kill gains — the wrong kind does.",
                Description = "I used to avoid cardio like the plague. Classic strength lifter mentality. But after reading the research on cardiovascular health and its role in recovery between sets, I decided to experiment.\n\nZone 2 cardio means exercising at roughly 60-70% of your max heart rate — the intensity where you can hold a conversation. For me that's a brisk walk or easy jog at around 140-150 bpm. I started with two 40-minute sessions per week, separate from my lifting sessions.\n\nAfter 8 weeks, three things changed. First, my recovery between heavy sets improved — I could do 4x5 squats at 95% without gasping for 3 minutes between sets. Second, my sleep quality improved measurably. Third, my resting heart rate dropped from 68 to 61 bpm.\n\nDid I lose any strength? No. Did I lose muscle? No — I kept protein high and the intensity low enough not to create significant muscle damage. Zone 2 is genuinely different from HIIT in terms of muscle interference effect.\n\nTwo sessions of 40 minutes per week. That's it. The return on investment is too high to ignore. Even if you're purely a strength athlete, your heart is your most important muscle.",
                Image = "https://images.unsplash.com/photo-1759167581561-3b1fbe906b52?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                Category = "Training",
                Date = "April 2026",
                CreatedAt = Ago(10),
                UpdatedAt = Ago(10)
            },
            new()
            {
                AuthorId = alex.Id,
                Title = "Deadlift Form: The Cue That Fixed My Lower Back Pain",
                Caption = "One coaching cue changed my deadlift from injury risk to my strongest lift.",
                Description = "I had lower back pain every time I deadlifted heavy. Not acute injury pain, but the dull ache the next morning that told me something was off. I tried every fix I could find online — bracing harder, keeping the bar closer, hinging not squatting. Nothing worked until a coach gave me one cue: 'push the floor away, don't pull the bar up.'\n\nThis mental shift changed everything. When I focused on pushing the floor, my hips stayed higher and my back stayed flatter through the first pull. The bar path became more vertical. The load transferred from my lumbar to my glutes and hamstrings — where it belongs.\n\nThe technical explanation: most people who feel deadlift in their lower back are actually squatting the weight up, which means the hips drop, the back rounds, and the lumbar extensors do work they shouldn't. The 'push the floor' cue keeps the hips higher, which recruits the posterior chain correctly.\n\nOther cues that helped: 'chest up before you pull' (prevents thoracic rounding), 'squeeze oranges in your armpits' (engages lats and stabilizes the upper back), and 'proud chest at lockout' (prevents hyperextending the lower back at the top).\n\nI went from 120kg with back pain to 157.5kg pain-free in 6 months. If you're experiencing lower back discomfort on deadlifts, this is the first thing to fix.",
                Image = "https://images.unsplash.com/photo-1692369608036-59e48759b6e3?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                Category = "Training",
                Date = "April 2026",
                CreatedAt = Ago(5),
                UpdatedAt = Ago(5)
            },
            new()
            {
                AuthorId = alex.Id,
                Title = "Tracking My Fitness: How NovFit Changed My Approach",
                Caption = "What happens when you actually measure everything for 30 days.",
                Description = "I started using NovFit to track my workouts and nutrition 30 days ago as an experiment. I expected to feel restricted. Instead, the opposite happened — the data gave me freedom.\n\nBefore tracking, I estimated my food intake. I thought I was eating 2,500 kcal and 160g protein. Reality: 1,950 kcal and 118g protein. No wonder my progress had plateaued. I wasn't eating enough to support my training volume.\n\nThe dashboard history is what I found most valuable. Seeing my macros, water intake, and steps in one view over 30 days showed me patterns I couldn't see day-to-day. My protein tanks every Sunday (social meals). My step count drops on home office days. My water intake is consistently low in the evenings.\n\nEach insight is actionable. Now I prepare a high-protein snack before Sunday meals. I take a 20-minute walk at 18:00 on home office days. I set a water reminder at 20:00.\n\nThis is the real value of tracking — not the numbers themselves, but the behavioral patterns they reveal. You can't fix what you can't see.",
                Image = "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                Category = "Lifestyle",
                Date = "May 2026",
                CreatedAt = Ago(2),
                UpdatedAt = Ago(2)
            }
        };

        // ── Articles (BlogPost) — Maria (5) ──────────────────────────────────────

        var mariaArticles = new List<BlogPost>
        {
            new()
            {
                AuthorId = maria.Id,
                Title = "Why I Switched from HIIT to Yoga and Never Looked Back",
                Caption = "The counter-intuitive fitness journey that improved my body composition.",
                Description = "Two years ago I was doing HIIT 5 days a week, eating 1,400 calories, and wondering why I was exhausted, irritable, and not seeing progress. My cortisol was through the roof, my sleep was terrible, and I had lost my period for three months.\n\nA functional medicine doctor told me my body was in chronic stress. The solution felt wrong: rest more, eat more, lower the intensity. I replaced 3 of my HIIT sessions with yoga and pilates. I raised my calories to 1,900. I prioritized 8 hours of sleep.\n\nWithin 6 weeks: energy returned. Sleep improved dramatically. My period came back. And paradoxically — my body composition improved. I lost 2kg of fat and gained visible muscle tone, while training 'less hard' by conventional standards.\n\nThe explanation is simple once you understand physiology. Chronic high-intensity training without adequate recovery and nutrition raises cortisol long-term. Elevated cortisol promotes fat storage (especially abdominal) and breaks down muscle tissue. Lower your stress response, and your body starts cooperating instead of fighting you.\n\nYoga isn't 'easy cardio'. A 60-minute vinyasa flow challenges your strength, balance, and focus. Pilates builds more core stability than most gym programs. The difference is the nervous system response — parasympathetic instead of sympathetic. Recovery instead of stress.",
                Image = "https://images.unsplash.com/photo-1531353826977-0941b4779a1c?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                Category = "Lifestyle",
                Date = "February 2026",
                CreatedAt = Ago(22),
                UpdatedAt = Ago(22)
            },
            new()
            {
                AuthorId = maria.Id,
                Title = "Eating for Energy: My Anti-Inflammatory Food Approach",
                Caption = "Food as medicine — the changes that eliminated my afternoon crashes.",
                Description = "I used to hit a wall at 14:30 every day. Energy crashed, focus gone, craving something sweet. I lived on coffee to push through. Then I started learning about blood sugar regulation and inflammation, and everything changed.\n\nThe biggest culprits in my old diet: refined carbohydrates at lunch (white bread, pasta), skipping breakfast or eating only fruit, and not enough protein to slow glucose absorption. Every meal was spiking and crashing my blood sugar.\n\nThe changes I made: protein at every meal (minimum 25g), complex carbs over simple ones, healthy fats with carbohydrates (avocado, olive oil, nuts), and vegetables as the base of lunch and dinner. I also eliminated seed oils at home and switched to olive oil exclusively.\n\nWithin two weeks the afternoon crashes stopped. I now work with steady energy from 8:00 to 19:00 without coffee after 12:00. My sleep improved because my cortisol rhythm normalized.\n\nThe anti-inflammatory additions that made a real difference: turmeric in my morning routine (with black pepper for bioavailability), salmon or sardines 3x per week, berries daily (frozen is just as good as fresh), and fermented foods like kefir and sauerkraut for gut health.\n\nFood isn't just fuel. It's information for your cells. Choose what you tell them.",
                Image = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                Category = "Nutrition",
                Date = "March 2026",
                CreatedAt = Ago(16),
                UpdatedAt = Ago(16)
            },
            new()
            {
                AuthorId = maria.Id,
                Title = "Morning Routines That Actually Work (Tested for 90 Days)",
                Caption = "I tested 4 different morning routines. Here's what the data showed.",
                Description = "Morning routines are everywhere in productivity content. Most advice is untested anecdote. I decided to run a 90-day experiment, rotating 3 different routines in 30-day blocks, tracking sleep quality, energy, focus, and workout performance.\n\nRoutine A — 'Minimal' (30 min): Wake up, drink 500ml water, 10 minutes yoga/stretching, cold shower, breakfast. No phone for the first 30 minutes.\n\nRoutine B — 'Extended' (90 min): Wake up, 500ml water, 20-minute meditation, 45-minute workout, protein breakfast, journal.\n\nRoutine C — 'Hybrid' (60 min): Wake up, 500ml water, 15 minutes yoga, cold shower, breakfast, 15 minutes reading. No workout in the morning — evening instead.\n\nResults: Routine A won on consistency (completed 28/30 days). Routine B had the best workout performance but the lowest completion rate (19/30 days — too long on busy mornings). Routine C had the best focus scores through the day.\n\nThe common elements in all three routines — water first thing, no phone for the first 15-30 minutes, some form of movement — consistently predicted better days than the days when I skipped them.\n\nConclusion: the best morning routine is the one you actually do. Design for your real life, not your ideal life.",
                Image = "https://images.unsplash.com/photo-1590646299178-1b26ab821e34?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                Category = "Lifestyle",
                Date = "March 2026",
                CreatedAt = Ago(11),
                UpdatedAt = Ago(11)
            },
            new()
            {
                AuthorId = maria.Id,
                Title = "Pilates vs Gym: My Honest 6-Month Comparison",
                Caption = "I did both simultaneously. Here's what each changed.",
                Description = "For the past 6 months I've been doing Pilates twice a week alongside my regular gym sessions. I wanted to know: does Pilates actually add value, or is it just yoga with a German accent?\n\nShort answer: they're not competing. They're complementary, and Pilates fixed problems the gym was creating.\n\nThe posture improvement from Pilates was immediate. After the first month, my gym coach noticed I was no longer hunching during overhead press. My shoulder mobility improved. Lower back pain that I'd had for a year disappeared by month three.\n\nCore strength is another story. I thought I had a strong core — I could plank for 2 minutes. Pilates revealed I had good anterior core strength and almost no deep stabilizer strength. The transversus abdominis work in Pilates is entirely different from crunches or planks. It's isometric, precise, and humbling.\n\nOn body composition: I didn't gain visible muscle from Pilates, but I did develop a different quality of muscle — denser, more defined, less bulky. My waist got smaller while my glutes stayed the same size. That's the Pilates effect.\n\nWould I recommend it? Yes, especially if you lift weights. Two sessions per week is sufficient. The injury prevention alone is worth it.",
                Image = "https://images.unsplash.com/photo-1692369608023-a3822e070ee9?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                Category = "Training",
                Date = "April 2026",
                CreatedAt = Ago(6),
                UpdatedAt = Ago(6)
            },
            new()
            {
                AuthorId = maria.Id,
                Title = "Hydration Habits That Changed My Training",
                Caption = "I thought I was drinking enough water. I was wrong by almost 1 litre.",
                Description = "I always considered myself well-hydrated. I drank water throughout the day, had my coffee and tea, and felt fine. Then I started tracking actual water intake in NovFit and realized I was averaging 1.6 litres per day — about 35% below my target for my activity level.\n\nThe effects of that chronic mild dehydration were things I'd normalized: afternoon headaches, focus dips around 15:00, feeling tired 20 minutes into cardio, occasional muscle cramps during yoga.\n\nI set a target of 2.4 litres per day (35ml per kg of bodyweight) and built a system to hit it: 500ml immediately upon waking, 300ml before each meal (3 meals = 900ml), 500ml during workouts, and a final 500ml glass at 20:00. That's 2,400ml without trying.\n\nThe changes after 3 weeks: headaches gone. Focus improved in the afternoon. Yoga sessions feel easier — I can hold positions longer. Skin looks noticeably better. Sleep improved slightly.\n\nOne unexpected benefit: I eat less. Drinking 300ml before meals reduced portion sizes naturally — I'm genuinely less hungry. I hadn't planned this as a weight management strategy, but it's a useful side effect.\n\nHydration is the most underestimated performance variable. It costs nothing and the return is immediate.",
                Image = "https://images.unsplash.com/photo-1624948465121-96e87ae34a87?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                Category = "Nutrition",
                Date = "May 2026",
                CreatedAt = Ago(3),
                UpdatedAt = Ago(3)
            }
        };

        db.BlogPosts.AddRange(alexArticles);
        db.BlogPosts.AddRange(mariaArticles);

        // Save everything so far to get IDs for posts
        await db.SaveChangesAsync();

        // ── Posts — Alex (9) ──────────────────────────────────────────────────────

        db.Posts.AddRange(
            new Post
            {
                UserId = alex.Id,
                Content = "Week 26 of Push/Pull/Legs. Hit a new deadlift PR today — 157.5kg for 3 reps. Six months ago I was pulling 120kg and my lower back hated me. Consistency and form work pay off. 🏋️",
                ImageUrl = "https://images.unsplash.com/photo-1601106605547-7423365f86e0?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                CreatedAt = Ago(21),
                LikesCount = 14,
                CommentsCount = 3
            },
            new Post
            {
                UserId = alex.Id,
                Content = "Meal prep Sunday done. 1.5kg chicken, 800g rice, roasted veg. Five days of lunch sorted in 90 minutes. Future me is grateful. The teriyaki chicken variant this week is elite 🍱",
                ImageUrl = "https://images.unsplash.com/photo-1543352632-5a4b24e4d2a6?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                CreatedAt = Ago(17),
                LikesCount = 22,
                CommentsCount = 6
            },
            new Post
            {
                UserId = alex.Id,
                Content = "Morning run — 7.5km, zone 2 the whole way. Heart rate stayed under 148bpm. Cardio is finally clicking. My recovery between sets has improved since adding these twice a week. Don't fear the cardio, lifters. 🏃",
                ImageUrl = "https://images.unsplash.com/photo-1594882645126-14020914d58d?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                LinkedWorkoutId = alexRun.Id,
                CreatedAt = Ago(14),
                LikesCount = 18,
                CommentsCount = 2
            },
            new Post
            {
                UserId = alex.Id,
                Content = "Push day numbers this week: Bench 100kg x 5, OHP 60kg x 5, Incline DB 32kg x 8. The shoulder work is finally paying off. Two years ago I couldn't press 60kg bench. Process > results. 💪",
                ImageUrl = "https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                LinkedWorkoutId = alexPushDay.Id,
                CreatedAt = Ago(10),
                LikesCount = 31,
                CommentsCount = 8
            },
            new Post
            {
                UserId = alex.Id,
                Content = "Just hit week 6 of tracking macros in NovFit. Discovered I was consistently 40g under my protein target every day for months. No wonder my progress slowed. Data doesn't lie. Fix is simple: Greek yogurt before bed. ✅",
                ImageUrl = "https://images.unsplash.com/photo-1543352632-fea6d4f83e78?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                CreatedAt = Ago(8),
                LikesCount = 19,
                CommentsCount = 5
            },
            new Post
            {
                UserId = alex.Id,
                Content = "Leg day. Squats 125kg x 5 across 5 sets. Legs were shaking by set 3. Good shaking. The kind that means you showed up and went hard. Take your rest days seriously — they're when you actually get stronger. 🦵",
                ImageUrl = "https://images.unsplash.com/photo-1541600383005-565c949cf777?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                LinkedWorkoutId = alexLegDay.Id,
                CreatedAt = Ago(6),
                LikesCount = 27,
                CommentsCount = 4
            },
            new Post
            {
                UserId = alex.Id,
                Content = "HIIT circuit today — 6 rounds, 40 seconds on, 20 off. Burpees, jump squats, mountain climbers, box jumps. 30 minutes of absolute chaos. Loved every second. Recovery starts now: protein, water, sleep. 🔥",
                ImageUrl = "https://images.unsplash.com/photo-1594381898411-846e7d193883?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                LinkedWorkoutId = alexHiit.Id,
                CreatedAt = Ago(4),
                LikesCount = 15,
                CommentsCount = 1
            },
            new Post
            {
                UserId = alex.Id,
                Content = "Rest day today and not feeling guilty about it. Muscles grow during recovery, not during training. Active rest: 20-minute walk, 10 minutes stretching, sleep by 22:00. This IS the training. 💤",
                CreatedAt = Ago(2),
                LikesCount = 33,
                CommentsCount = 9
            },
            new Post
            {
                UserId = alex.Id,
                Content = "Published a new article about my PPL journey — 6 months of data, lessons, and honest numbers. Link in profile. If you're thinking about starting a structured program, this is for you. 📖",
                ArticleId = alexArticles[0].Id,
                CreatedAt = Ago(1),
                LikesCount = 41,
                CommentsCount = 12
            }
        );

        // ── Posts — Maria (9) ─────────────────────────────────────────────────────

        db.Posts.AddRange(
            new Post
            {
                UserId = maria.Id,
                Content = "Morning yoga flow — 60 minutes of sun salutations and hip openers. My body needed this after three days of training. Movement doesn't always have to be intense to be effective. 🧘‍♀️✨",
                ImageUrl = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                LinkedWorkoutId = mariaYoga.Id,
                CreatedAt = Ago(20),
                LikesCount = 28,
                CommentsCount = 7
            },
            new Post
            {
                UserId = maria.Id,
                Content = "Quinoa bowl for lunch — quinoa, roasted chickpeas, feta, mixed greens, lemon tahini dressing. Delicious, balanced, and keeping me full for 4 hours. Proof that healthy food can actually be good food 🥗",
                ImageUrl = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                CreatedAt = Ago(17),
                LikesCount = 35,
                CommentsCount = 11
            },
            new Post
            {
                UserId = maria.Id,
                Content = "Full body circuit done. 3 rounds, 5 exercises, minimal rest. Goblet squats, rows, hip thrusts, push-ups, RDLs. 50 minutes and I left everything on the mat. Strength training really does go well with pilates 💪🧘‍♀️",
                ImageUrl = "https://images.unsplash.com/photo-1591258370814-01609b341790?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                LinkedWorkoutId = mariaFullBody.Id,
                CreatedAt = Ago(14),
                LikesCount = 22,
                CommentsCount = 4
            },
            new Post
            {
                UserId = maria.Id,
                Content = "Evening run — 5.5km at easy pace. The best kind of cardio is the kind you actually enjoy. Running at sunset with good music is therapy. Legs felt surprisingly good after pilates yesterday 🌅🏃‍♀️",
                ImageUrl = "https://images.unsplash.com/photo-1711598850173-0b0a0f69b4f4?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                LinkedWorkoutId = mariaRun.Id,
                CreatedAt = Ago(11),
                LikesCount = 19,
                CommentsCount = 3
            },
            new Post
            {
                UserId = maria.Id,
                Content = "Day 30 of my anti-inflammatory eating experiment. Results: afternoon energy crashes are gone. Sleep improved. Skin is clearer. The science is right — what you eat is information for your cells. Choose wisely 🌿",
                ImageUrl = "https://images.unsplash.com/photo-1540420773420-3366772f4999?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                CreatedAt = Ago(9),
                LikesCount = 44,
                CommentsCount = 15
            },
            new Post
            {
                UserId = maria.Id,
                Content = "Core pilates session — The Hundred nearly killed me (in the best way). I can do 5 sets of 20 pull-ups in the gym but 100 controlled reps of The Hundred is humbling. Different strength entirely. 🎯",
                ImageUrl = "https://images.unsplash.com/photo-1747239069226-55382c570116?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                LinkedWorkoutId = mariaPilates.Id,
                CreatedAt = Ago(7),
                LikesCount = 26,
                CommentsCount = 6
            },
            new Post
            {
                UserId = maria.Id,
                Content = "Tracking my water intake for a week revealed I was 1 litre under my target every single day. That explains the afternoon headaches. Now drinking 2.4L daily consistently. The difference is real — and immediate. 💧",
                ImageUrl = "https://images.unsplash.com/photo-1523362628745-0c100150b504?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                CreatedAt = Ago(5),
                LikesCount = 38,
                CommentsCount = 10
            },
            new Post
            {
                UserId = maria.Id,
                Content = "Post-workout smoothie: protein powder, frozen berries, oat milk, flaxseeds. Ready in 2 minutes, covers post-workout nutrition perfectly. Recovery doesn't need to be complicated 🫐🥛",
                ImageUrl = "https://images.unsplash.com/photo-1585237672814-8f85a8118bf6?fm=jpg&q=80&w=1200&auto=format&fit=crop",
                CreatedAt = Ago(3),
                LikesCount = 17,
                CommentsCount = 2
            },
            new Post
            {
                UserId = maria.Id,
                Content = "Just published my honest take on switching from HIIT to yoga — with 6 months of data. The results surprised me. Spoiler: doing less hard things made my body composition better, not worse. Read the full article in my profile 📖",
                ArticleId = mariaArticles[0].Id,
                CreatedAt = Ago(1),
                LikesCount = 52,
                CommentsCount = 18
            }
        );

        await db.SaveChangesAsync();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private static DateTime Ago(int days) =>
        DateTime.UtcNow.Date.AddDays(-days);

    private static MealEntry MealOf(string userId, string name, string type, string date, params FoodItem[] items)
    {
        var entry = new MealEntry
        {
            UserId = userId,
            Name = name,
            Type = type,
            Date = date,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Items = items.ToList()
        };
        entry.TotalCalories = items.Sum(i => i.Calories);
        entry.TotalProtein_g = items.Sum(i => i.Protein_g);
        entry.TotalCarbs_g = items.Sum(i => i.Carbs_g);
        entry.TotalFats_g = items.Sum(i => i.Fats_g);
        entry.TotalGrams = items.Sum(i => i.Grams);
        int order = 1;
        foreach (var item in items) item.Order = order++;
        return entry;
    }

    private static FoodItem FoodOf(string name, double grams, double cal, double protein, double carbs, double fats) =>
        new() { Name = name, Grams = grams, Calories = cal, Protein_g = protein, Carbs_g = carbs, Fats_g = fats };
}
