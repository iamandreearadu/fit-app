using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Data.Seeds;

public static class BlogPostSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        var seedData = BuildSeedData();

        if (!await db.BlogPosts.AnyAsync())
        {
            db.BlogPosts.AddRange(seedData);
            await db.SaveChangesAsync();
            return;
        }

        // Update images on existing posts that were seeded without them
        var existing = await db.BlogPosts.Where(p => p.Image == "").ToListAsync();
        if (existing.Count > 0)
        {
            var imageMap = seedData.ToDictionary(p => p.Title, p => p.Image);
            foreach (var post in existing)
                if (imageMap.TryGetValue(post.Title, out var img))
                    post.Image = img;
            await db.SaveChangesAsync();
        }
    }

    private static List<BlogPost> BuildSeedData() =>
    [
        new()
        {
            Title = "The Science of Progressive Overload",
            Caption = "The single most important principle for building strength and muscle over time.",
            Description = """
                Progressive overload is the gradual increase of stress placed on the body during training. Without it, your body adapts to the current workload and stops making progress.

                The principle is simple: each week, aim to do a little more than the week before — whether that's one more rep, a slightly heavier weight, or a shorter rest period. Over months and years, these small increments compound into dramatic results.

                There are several ways to apply progressive overload: increase load (add weight), increase volume (more sets or reps), increase frequency (train the muscle more often), decrease rest time, or improve form and range of motion. You don't need to progress on all variables at once — focus on one at a time.

                A practical approach for beginners is to add 2.5 kg to lower body exercises and 1.25 kg to upper body exercises every week. When you can no longer progress weekly, switch to bi-weekly progression. This simple framework, known as linear progression, can drive gains for 6–12 months before you need a more advanced approach.

                Track every session. You cannot manage what you don't measure.
                """,
            Image = "https://images.unsplash.com/photo-1692369608036-59e48759b6e3?fm=jpg&q=80&w=1200&auto=format&fit=crop",
            Category = "Training",
            Date = "January 2026",
            CreatedAt = new DateTime(2026, 1, 10, 10, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2026, 1, 10, 10, 0, 0, DateTimeKind.Utc)
        },
        new()
        {
            Title = "Nutrition Timing: What to Eat Before and After Your Workout",
            Caption = "Fuel your training correctly and recover faster with these evidence-based guidelines.",
            Description = """
                Nutrition timing can meaningfully impact performance and recovery — though total daily intake still matters more than when you eat.

                Pre-workout (60–90 minutes before): Aim for a meal containing complex carbohydrates and moderate protein. Carbs top up muscle glycogen — your primary fuel for intense exercise. Examples: oats with protein powder, rice with chicken, or a banana with Greek yogurt. Avoid large amounts of fat or fiber right before training, as they slow digestion.

                Intra-workout: For sessions under 60 minutes, water is sufficient. For longer sessions or intense cardio, 30–60 g of fast-digesting carbs per hour (sports drink, banana, dates) can sustain performance.

                Post-workout (within 2 hours): The "anabolic window" is wider than once thought, but eating protein and carbs within 2 hours of training still accelerates glycogen replenishment and muscle protein synthesis. Target 0.3–0.4 g of protein per kg of bodyweight (20–40 g for most people) and 0.5–1 g of carbs per kg. A protein shake with fruit, or rice with salmon, works well.

                If you train fasted in the morning, prioritize a protein-rich breakfast immediately after. The muscle protein synthesis signal is still elevated for hours post-exercise.
                """,
            Image = "https://images.unsplash.com/photo-1498837167922-ddd27525d352?fm=jpg&q=80&w=1200&auto=format&fit=crop",
            Category = "Nutrition",
            Date = "January 2026",
            CreatedAt = new DateTime(2026, 1, 15, 10, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2026, 1, 15, 10, 0, 0, DateTimeKind.Utc)
        },
        new()
        {
            Title = "How to Build a Sustainable Fitness Habit",
            Caption = "Most people start strong and fade. Here's how to be different.",
            Description = """
                The biggest obstacle to fitness is not knowledge — it's consistency. Most people know what to do; few do it for years. Building a sustainable habit requires understanding how habits work.

                Start smaller than you think you need to. The goal in month one is not transformation — it's showing up. A 20-minute workout you do consistently beats a 90-minute program you abandon after two weeks. Lower the activation energy: pack your gym bag the night before, sleep in your workout clothes if you train in the morning, keep equipment visible at home.

                Use identity-based habit formation. Instead of "I want to lose weight," the goal is "I am someone who trains regularly." Every workout you complete is a vote for that identity. Missing once is fine. Missing twice starts a new habit.

                Attach your new habit to an existing one (habit stacking). "After I pour my morning coffee, I put on my training shoes." The existing habit becomes the trigger for the new one.

                Track streaks, but plan for breaks. Life will interrupt your routine. The rule is: never miss twice. One missed session is an accident; two is the beginning of a new (bad) habit.

                Finally, vary the stimulus but keep the structure. You can change the exercises, the location, the playlist — but keep the time slot and the frequency fixed. Routine reduces decision fatigue.
                """,
            Image = "https://images.unsplash.com/photo-1590646299178-1b26ab821e34?fm=jpg&q=80&w=1200&auto=format&fit=crop",
            Category = "Lifestyle",
            Date = "February 2026",
            CreatedAt = new DateTime(2026, 2, 3, 10, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2026, 2, 3, 10, 0, 0, DateTimeKind.Utc)
        },
        new()
        {
            Title = "Understanding Macronutrients: Protein, Carbs, and Fats",
            Caption = "A clear breakdown of the three macros and how to balance them for your goal.",
            Description = """
                Every food you eat is made up of three macronutrients: protein, carbohydrates, and fat. Understanding their roles helps you make informed food choices without obsessing over every meal.

                Protein (4 kcal/g) is the most important macro for body composition. It builds and repairs muscle, keeps you satiated, and has the highest thermic effect — meaning your body burns more calories digesting it. Target 1.6–2.2 g per kg of bodyweight daily. For a 75 kg person, that's 120–165 g of protein per day. Prioritize lean sources: chicken breast, eggs, Greek yogurt, cottage cheese, fish, legumes.

                Carbohydrates (4 kcal/g) are your body's preferred energy source, especially during high-intensity exercise. They are not the enemy — the type and quantity matter. Prioritize whole food sources (oats, rice, sweet potatoes, fruit) over refined sources (white bread, sweets, juice). Around your workouts, carbs are especially beneficial.

                Fats (9 kcal/g) are essential for hormone production (including testosterone), fat-soluble vitamin absorption, and joint health. Do not drop below 0.5 g per kg of bodyweight. Prioritize unsaturated fats from olive oil, avocado, nuts, and fatty fish. Limit saturated fats and avoid trans fats.

                A practical starting point: set protein first, then split the remaining calories between carbs and fat based on preference. High-carb works well for athletes; moderate-fat works for most others.
                """,
            Image = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?fm=jpg&q=80&w=1200&auto=format&fit=crop",
            Category = "Nutrition",
            Date = "February 2026",
            CreatedAt = new DateTime(2026, 2, 12, 10, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2026, 2, 12, 10, 0, 0, DateTimeKind.Utc)
        },
        new()
        {
            Title = "The Benefits of Rest Days: Why Recovery is Part of Training",
            Caption = "You don't get stronger in the gym — you get stronger while you recover.",
            Description = """
                Many beginners believe that more training always means more results. This is one of the most common and damaging misconceptions in fitness. Muscle growth, strength gains, and improved endurance happen during recovery — not during the workout itself.

                During exercise, you create micro-tears in muscle fibers and deplete glycogen stores. Recovery is the process by which your body repairs these fibers, making them thicker and stronger, and restores energy stores. If you don't allow sufficient recovery, performance declines, injury risk increases, and progress stalls — a state called overreaching, which can evolve into overtraining syndrome.

                Signs you need more recovery: persistent muscle soreness, declining performance, poor sleep, irritability, and loss of motivation to train. These are not signs of weakness — they are data.

                Active recovery on rest days (light walking, stretching, yoga, swimming) promotes blood flow without adding significant stress. It often feels better than complete rest.

                Sleep is the most powerful recovery tool available. 7–9 hours of quality sleep per night is non-negotiable for serious progress. Growth hormone peaks during deep sleep; protein synthesis is elevated overnight. Sacrificing sleep for an extra workout session is counterproductive.

                A well-structured program for most people: 3–5 training sessions per week, with at least 2 rest or active recovery days.
                """,
            Image = "https://images.unsplash.com/photo-1692369608023-a3822e070ee9?fm=jpg&q=80&w=1200&auto=format&fit=crop",
            Category = "Recovery",
            Date = "February 2026",
            CreatedAt = new DateTime(2026, 2, 20, 10, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2026, 2, 20, 10, 0, 0, DateTimeKind.Utc)
        },
        new()
        {
            Title = "Cardio vs Strength Training: Which is Better for Fat Loss?",
            Caption = "The debate is settled — here's what the evidence actually says.",
            Description = """
                The cardio-vs-weights debate has persisted for decades. The short answer: both work, but they work differently, and combining them is optimal.

                Cardio burns more calories per session. A 45-minute run burns significantly more than a 45-minute weight session of similar intensity. This makes cardio effective for creating a caloric deficit in the short term.

                Strength training builds muscle, which increases your resting metabolic rate (RMR). Every kilogram of muscle burns approximately 13 kcal per day at rest. Add 5 kg of muscle and you burn ~65 additional kcal daily without doing anything. Over a year, this compounds significantly. Strength training also produces excess post-exercise oxygen consumption (EPOC) — elevated calorie burning for hours after the session.

                For fat loss specifically, research consistently shows that combining cardio and strength training produces better body composition outcomes than either alone. You lose more fat and preserve (or gain) more muscle.

                Practical recommendation: prioritize strength training (3–4 sessions per week) and add 2–3 cardio sessions as needed to maintain the caloric deficit. Choose cardio you enjoy — adherence is the variable that matters most.

                If time is limited, HIIT (High-Intensity Interval Training) offers cardiovascular benefit with some muscle-preserving stimulus in shorter sessions.
                """,
            Image = "https://images.unsplash.com/photo-1759167581561-3b1fbe906b52?fm=jpg&q=80&w=1200&auto=format&fit=crop",
            Category = "Training",
            Date = "March 2026",
            CreatedAt = new DateTime(2026, 3, 5, 10, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2026, 3, 5, 10, 0, 0, DateTimeKind.Utc)
        },
        new()
        {
            Title = "Hydration and Performance: How Water Affects Your Training",
            Caption = "Even mild dehydration measurably degrades strength, endurance, and focus.",
            Description = """
                Water makes up approximately 60% of your body weight and is involved in virtually every physiological process — including muscle contraction, nutrient transport, temperature regulation, and joint lubrication. Its impact on athletic performance is direct and significant.

                Research shows that losing just 2% of body weight through sweat (about 1.4 kg for a 70 kg person) reduces strength by up to 6%, endurance by up to 22%, and cognitive performance measurably. At 4–5% dehydration, performance drops dramatically and heat illness risk increases.

                General intake guidelines: 35–45 ml per kg of bodyweight daily as a baseline, plus 500–750 ml per hour of exercise. In hot or humid environments, increase by 20–30%. Urine color is the simplest indicator — pale yellow is ideal; dark yellow means drink more.

                Electrolytes matter during prolonged exercise (over 60–90 minutes). Sweat contains sodium, potassium, magnesium, and calcium. For short workouts, water is sufficient. For longer sessions, an electrolyte drink or sodium-containing snack helps maintain fluid balance and prevent hyponatremia (dangerously low sodium from drinking too much plain water).

                Practical habits: start every morning with 500 ml of water before coffee, keep a water bottle at your desk, drink 300–500 ml in the 30 minutes before training, and sip regularly during workouts rather than drinking large amounts at once.
                """,
            Image = "https://images.unsplash.com/photo-1624948465121-96e87ae34a87?fm=jpg&q=80&w=1200&auto=format&fit=crop",
            Category = "Nutrition",
            Date = "March 2026",
            CreatedAt = new DateTime(2026, 3, 14, 10, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2026, 3, 14, 10, 0, 0, DateTimeKind.Utc)
        },
        new()
        {
            Title = "Sleep and Fitness: The Missing Piece of Your Training Puzzle",
            Caption = "You can optimize nutrition and training perfectly and still underperform if you neglect sleep.",
            Description = """
                Sleep is the most underrated performance enhancer available — and it's free. Yet most people treat it as negotiable, cutting it to fit more work, screen time, or social activity.

                During sleep, your body releases the majority of its daily growth hormone (GH), which drives muscle protein synthesis and fat metabolism. Testosterone levels are strongly correlated with sleep duration — one week of sleeping 5 hours per night reduces testosterone by 10–15% in young men, comparable to aging 10–15 years. REM sleep consolidates motor memory and skill learning — critical for sport-specific performance.

                Sleep deprivation impairs glucose metabolism, increasing insulin resistance and making it harder to lose fat. It also elevates cortisol (a stress hormone that promotes muscle breakdown and fat storage), reduces pain tolerance, and impairs decision-making — including food choices. People who sleep less tend to eat more, especially high-calorie foods.

                For athletes and active individuals, 8–9 hours is the target. Here's how to improve sleep quality: keep a consistent sleep and wake time 7 days a week (this is the single highest-impact change), avoid bright screens and blue light for 60 minutes before bed, keep the bedroom cool (18–20°C), and avoid caffeine after 14:00.

                Naps of 20–25 minutes (before 15:00) can partially offset a poor night without affecting nighttime sleep. If you're serious about your fitness results, treat sleep as non-negotiable training.
                """,
            Image = "https://images.unsplash.com/photo-1647942678809-bc501a2c2b6a?fm=jpg&q=80&w=1200&auto=format&fit=crop",
            Category = "Recovery",
            Date = "March 2026",
            CreatedAt = new DateTime(2026, 3, 22, 10, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2026, 3, 22, 10, 0, 0, DateTimeKind.Utc)
        },
        new()
        {
            Title = "Beginner's Guide to Tracking Your Calories",
            Caption = "You don't need to count calories forever — but doing it once changes everything.",
            Description = """
                Calorie tracking is one of the most powerful tools for understanding your nutrition. Most people significantly underestimate how much they eat — studies show the average underestimation is 20–40%. Tracking even for 4–8 weeks creates an intuitive sense of portions that persists long after you stop.

                Start with your Total Daily Energy Expenditure (TDEE). FitApp calculates this for you based on your age, weight, height, and activity level. This is your maintenance calorie level. To lose fat, aim for a deficit of 300–500 kcal per day (0.3–0.5 kg loss per week). To gain muscle, add 200–300 kcal above maintenance.

                Use a kitchen scale for the first few weeks — visual estimation is notoriously inaccurate. Weigh foods raw or note whether nutritional values are for cooked or raw weight (they differ significantly). Log everything, including cooking oils, sauces, and drinks. These "invisible" calories are often where the discrepancy hides.

                FitApp's barcode scanner and AI meal analyzer make logging faster: scan packaged foods or photograph your plate for instant nutritional estimates.

                Practical tips: log before you eat, not after (it reduces mindless eating); batch cook so you know exactly what's in your meals; prioritize protein at every meal (it's the most satiating macro and the hardest to overeat).

                Don't aim for perfection. Hitting your targets 80–90% of the time will produce results. Obsessing over every gram leads to an unsustainable relationship with food.
                """,
            Image = "https://images.unsplash.com/photo-1521986329282-0436c1f1e212?fm=jpg&q=80&w=1200&auto=format&fit=crop",
            Category = "Beginner",
            Date = "April 2026",
            CreatedAt = new DateTime(2026, 4, 2, 10, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2026, 4, 2, 10, 0, 0, DateTimeKind.Utc)
        },
        new()
        {
            Title = "How to Set SMART Fitness Goals That Actually Work",
            Caption = "Vague goals produce vague results. Here's how to set goals that drive real action.",
            Description = """
                "I want to get fit" is not a goal — it's a wish. Goals that drive behavior are specific, measurable, and time-bound. The SMART framework is the most practical tool for setting them.

                Specific: Define exactly what you want to achieve. Not "get stronger" but "increase my squat from 60 kg to 100 kg." Not "eat better" but "eat 150 g of protein per day."

                Measurable: If you can't measure it, you can't track progress. Body weight, lifts, body measurements, resting heart rate, VO2 max estimates — all give you concrete data points.

                Achievable: Goals should stretch you without being so extreme they feel impossible. Losing 20 kg in 2 months is not achievable safely. Losing 1 kg per month over a year is. Sustainable rates: 0.3–0.5 kg fat loss per week, 0.5–1 kg muscle gain per month for beginners.

                Relevant: The goal should matter to you personally — not because someone else told you it should. Intrinsic motivation (wanting the outcome for yourself) dramatically outperforms extrinsic motivation (wanting to please others or avoid shame).

                Time-bound: Set a deadline. "I will lose 8 kg by September 1st" creates urgency and a clear checkpoint for evaluation. Review your goal at the halfway point and adjust if needed — no plan survives contact with reality unchanged.

                Finally, focus on process goals alongside outcome goals. "I will train 4 times per week" is a process goal you control entirely. "I will lose 8 kg" is an outcome influenced by factors you don't fully control. Consistent process leads to consistent outcomes.
                """,
            Image = "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?fm=jpg&q=80&w=1200&auto=format&fit=crop",
            Category = "Beginner",
            Date = "April 2026",
            CreatedAt = new DateTime(2026, 4, 10, 10, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2026, 4, 10, 10, 0, 0, DateTimeKind.Utc)
        }
    ];
}
