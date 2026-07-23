using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Collections.Concurrent;

namespace FitApp.Api.Services;

public class ProgressService(
    AppDbContext db,
    AiProxyService aiProxy,
    IMemoryCache cache,
    ILogger<ProgressService> logger) : IProgressService
{
    private const int UnlockDays = 7;
    private const int StreakLookbackDays = 60;
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> NarrativeLocks = new();

    public async Task<ProgressSummaryDto> GetSummaryAsync(string userId, int window)
    {
        var normalizedWindow = NormalizeWindow(window);
        var trends = await GetTrendsAsync(userId, normalizedWindow);
        var streak = await GetCompleteStreakStatusAsync(userId);
        var report = streak.CompleteDayStreak >= UnlockDays
            ? await GetWeeklyReportAsync(userId)
            : null;

        return new ProgressSummaryDto
        {
            Trends = trends,
            Streak = streak,
            WeeklyReport = report
        };
    }

    public async Task<ProgressTrendsDto> GetTrendsAsync(string userId, int window)
    {
        window = NormalizeWindow(window);
        var today = GetToday();
        var start = today.AddDays(-(window - 1));
        var startString = start.ToString("yyyy-MM-dd");
        var endString = today.ToString("yyyy-MM-dd");

        var userMetrics = await db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { Tdee = u.Tdee ?? 0, WaterTarget = u.WaterL ?? 0 })
            .FirstOrDefaultAsync();

        var entries = await db.DailyEntries
            .AsNoTracking()
            .Where(d => d.UserId == userId
                && string.Compare(d.Date, startString) >= 0
                && string.Compare(d.Date, endString) <= 0)
            .ToDictionaryAsync(d => d.Date);

        var meals = await db.MealEntries
            .AsNoTracking()
            .Where(m => m.UserId == userId
                && !m.IsSavedMeal
                && string.Compare(m.Date, startString) >= 0
                && string.Compare(m.Date, endString) <= 0)
            .GroupBy(m => m.Date)
            .Select(group => new MealTotals(
                group.Key,
                group.Sum(m => m.TotalCalories),
                group.Sum(m => m.TotalProtein_g),
                group.Sum(m => m.TotalCarbs_g),
                group.Sum(m => m.TotalFats_g),
                group.Count()))
            .ToDictionaryAsync(m => m.Date);

        var result = new ProgressTrendsDto
        {
            Window = window,
            Tdee = Round(userMetrics?.Tdee ?? 0),
            WaterTargetL = Round(userMetrics?.WaterTarget ?? 0)
        };

        for (var date = start; date <= today; date = date.AddDays(1))
        {
            var dateString = date.ToString("yyyy-MM-dd");
            entries.TryGetValue(dateString, out var entry);
            meals.TryGetValue(dateString, out var meal);

            result.Dates.Add(dateString);
            result.WeightKg.Add(entry?.ManualWeight);
            result.EnergyLevel.Add(entry?.EnergyLevel);
            result.CaloriesIn.Add((int)Math.Round(meal?.Calories ?? 0));
            result.CaloriesBurned.Add(entry?.CaloriesBurned ?? 0);
            result.ProteinG.Add(Round(meal?.Protein ?? 0));
            result.CarbsG.Add(Round(meal?.Carbs ?? 0));
            result.FatG.Add(Round(meal?.Fat ?? 0));
            result.WaterL.Add(Round(entry?.WaterConsumedL ?? 0));
            result.Steps.Add(entry?.Steps ?? 0);
            result.StepTarget.Add(entry?.StepTarget ?? 3000);
        }

        return result;
    }

    public async Task<CompleteStreakStatusDto> GetCompleteStreakStatusAsync(string userId)
    {
        var today = GetToday();
        var from = today.AddDays(-(StreakLookbackDays - 1));
        var days = await LoadCompletenessAsync(userId, from, today);
        return BuildStreakStatus(days, today);
    }

    public async Task<NutritionistWeeklyReportDto?> GetWeeklyReportAsync(
        string userId,
        bool forceRefresh = false)
    {
        var today = GetToday();
        var from = today.AddDays(-(StreakLookbackDays - 1));
        var completeness = await LoadCompletenessAsync(userId, from, today);
        var streak = BuildStreakStatus(completeness, today);
        if (streak.CompleteDayStreak < UnlockDays)
            return null;

        var windowEnd = completeness.TryGetValue(today, out var todayState) && todayState.IsComplete
            ? today
            : today.AddDays(-1);
        var windowStart = windowEnd.AddDays(-(UnlockDays - 1));
        var report = await CalculateWeeklyReportAsync(userId, windowStart, windowEnd);
        var cacheKey = NarrativeCacheKey(
            userId,
            windowEnd,
            report.UserGoal,
            report.GoalCalories);

        if (forceRefresh)
            cache.Remove(cacheKey);

        if (!forceRefresh
            && cache.TryGetValue(cacheKey, out CachedNarrative? cached)
            && cached is not null)
        {
            report.AiNarrative = cached.Text;
            report.GeneratedAt = cached.GeneratedAt;
            return report;
        }

        var narrativeLock = NarrativeLocks.GetOrAdd(cacheKey, _ => new SemaphoreSlim(1, 1));
        await narrativeLock.WaitAsync();
        try
        {
            // A concurrent request may have populated the cache while this one
            // waited. Reuse it instead of issuing a second Groq request.
            if (!forceRefresh
                && cache.TryGetValue(cacheKey, out cached)
                && cached is not null)
            {
                report.AiNarrative = cached.Text;
                report.GeneratedAt = cached.GeneratedAt;
                return report;
            }

            try
            {
                var generatedNarrative =
                    await aiProxy.GenerateWeeklyNutritionistNarrativeAsync(userId, report);
                report.AiNarrative = IsNarrativeGrounded(report, generatedNarrative)
                    ? generatedNarrative
                    : BuildEvidenceBasedFallbackNarrative(report);
            }
            catch (Exception ex)
            {
                logger.LogWarning(
                    ex,
                    "Weekly nutrition narrative generation failed for user {UserId}; using deterministic fallback.",
                    userId);
                report.AiNarrative = BuildEvidenceBasedFallbackNarrative(report);
            }

            report.GeneratedAt = DateTime.UtcNow;
            cache.Set(
                cacheKey,
                new CachedNarrative(report.AiNarrative, report.GeneratedAt),
                DateTimeOffset.UtcNow.Date.AddDays(1));

            return report;
        }
        finally
        {
            narrativeLock.Release();
        }
    }

    internal static CompleteStreakStatusDto BuildStreakStatus(
        IReadOnlyDictionary<DateOnly, DayCompleteness> days,
        DateOnly today)
    {
        days.TryGetValue(today, out var todayState);
        todayState ??= DayCompleteness.Empty;

        var streak = 0;
        var cursor = todayState.IsComplete ? today : today.AddDays(-1);
        while (days.TryGetValue(cursor, out var state) && state.IsComplete)
        {
            streak++;
            cursor = cursor.AddDays(-1);
        }

        return new CompleteStreakStatusDto
        {
            CompleteDayStreak = streak,
            LoggedTodayComplete = todayState.IsComplete,
            MissingToday = todayState.Missing,
            DaysUntilUnlock = Math.Max(0, UnlockDays - streak)
        };
    }

    private async Task<Dictionary<DateOnly, DayCompleteness>> LoadCompletenessAsync(
        string userId,
        DateOnly from,
        DateOnly to)
    {
        var fromString = from.ToString("yyyy-MM-dd");
        var toString = to.ToString("yyyy-MM-dd");
        var entries = await db.DailyEntries
            .AsNoTracking()
            .Where(d => d.UserId == userId
                && string.Compare(d.Date, fromString) >= 0
                && string.Compare(d.Date, toString) <= 0)
            .Select(d => new
            {
                d.Date,
                d.ActivityType,
                d.Steps,
                d.WaterConsumedL
            })
            .ToListAsync();

        var mealDates = await db.MealEntries
            .AsNoTracking()
            .Where(m => m.UserId == userId
                && !m.IsSavedMeal
                && string.Compare(m.Date, fromString) >= 0
                && string.Compare(m.Date, toString) <= 0)
            .Select(m => m.Date)
            .Distinct()
            .ToListAsync();
        var mealDateSet = mealDates.ToHashSet(StringComparer.Ordinal);

        var result = new Dictionary<DateOnly, DayCompleteness>();
        foreach (var entry in entries)
        {
            if (!DateOnly.TryParse(entry.Date, out var date))
                continue;

            result[date] = DayCompleteness.Create(
                mealDateSet.Contains(entry.Date),
                !string.IsNullOrWhiteSpace(entry.ActivityType),
                entry.Steps > 0,
                entry.WaterConsumedL > 0);
        }

        for (var date = from; date <= to; date = date.AddDays(1))
            result.TryAdd(date, DayCompleteness.Empty);

        return result;
    }

    private async Task<NutritionistWeeklyReportDto> CalculateWeeklyReportAsync(
        string userId,
        DateOnly windowStart,
        DateOnly windowEnd)
    {
        var start = windowStart.ToString("yyyy-MM-dd");
        var end = windowEnd.ToString("yyyy-MM-dd");
        var user = await db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new
            {
                Tdee = u.Tdee ?? 0,
                Goal = string.IsNullOrWhiteSpace(u.Goal) ? "maintain" : u.Goal,
                GoalCalories = u.GoalCalories ?? u.Tdee ?? 0,
                WaterTarget = u.WaterL ?? 0
            })
            .FirstAsync();

        var daily = await db.DailyEntries
            .AsNoTracking()
            .Where(d => d.UserId == userId
                && string.Compare(d.Date, start) >= 0
                && string.Compare(d.Date, end) <= 0)
            .OrderBy(d => d.Date)
            .Select(d => new
            {
                d.Date,
                d.WaterConsumedL,
                d.Steps,
                d.StepTarget,
                d.ManualWeight
            })
            .ToListAsync();

        var mealTotals = await db.MealEntries
            .AsNoTracking()
            .Where(m => m.UserId == userId
                && !m.IsSavedMeal
                && string.Compare(m.Date, start) >= 0
                && string.Compare(m.Date, end) <= 0)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Calories = g.Sum(m => m.TotalCalories),
                Protein = g.Sum(m => m.TotalProtein_g),
                Carbs = g.Sum(m => m.TotalCarbs_g),
                Fat = g.Sum(m => m.TotalFats_g),
                Count = g.Count()
            })
            .FirstOrDefaultAsync();

        var totalCalories = mealTotals?.Calories ?? 0;
        var proteinCalories = (mealTotals?.Protein ?? 0) * 4;
        var carbsCalories = (mealTotals?.Carbs ?? 0) * 4;
        var fatCalories = (mealTotals?.Fat ?? 0) * 9;
        var macroCalories = proteinCalories + carbsCalories + fatCalories;
        var weights = daily
            .Where(d => d.ManualWeight.HasValue)
            .Select(d => d.ManualWeight!.Value)
            .ToList();
        var stepTarget = daily.Count == 0
            ? 3000
            : (int)Math.Round(daily.Average(d => d.StepTarget));

        return new NutritionistWeeklyReportDto
        {
            WindowStart = start,
            WindowEnd = end,
            UserGoal = user.Goal,
            GoalCalories = Round(user.GoalCalories),
            AvgCaloriesIn = Round(totalCalories / UnlockDays),
            Tdee = Round(user.Tdee),
            NetCaloriesTotal = Round(totalCalories - user.Tdee * UnlockDays),
            EstimatedWeightChangeKg =
                Round((totalCalories - user.Tdee * UnlockDays) / 7700, 3),
            ActualWeightChangeKg = weights.Count >= 2
                ? Round(weights[^1] - weights[0], 2)
                : null,
            AvgWaterL = Round(daily.Sum(d => d.WaterConsumedL) / UnlockDays),
            WaterTargetL = Round(user.WaterTarget),
            WaterAdherencePct = user.WaterTarget > 0
                ? Round(daily.Sum(d => d.WaterConsumedL) / UnlockDays / user.WaterTarget * 100)
                : 0,
            AvgSteps = Round(daily.Sum(d => d.Steps) / (double)UnlockDays),
            StepTarget = stepTarget,
            MealsLogged = mealTotals?.Count ?? 0,
            AvgProteinPct = macroCalories > 0 ? Round(proteinCalories / macroCalories * 100) : 0,
            AvgCarbsPct = macroCalories > 0 ? Round(carbsCalories / macroCalories * 100) : 0,
            AvgFatPct = macroCalories > 0 ? Round(fatCalories / macroCalories * 100) : 0
        };
    }

    private static string BuildEvidenceBasedFallbackNarrative(NutritionistWeeklyReportDto report)
    {
        var calorieDifference = report.AvgCaloriesIn - report.GoalCalories;
        var goalContext = report.UserGoal switch
        {
            "lose" => calorieDifference <= 0
                ? "Aportul mediu este în linie cu ținta de slăbire înregistrată."
                : "Aportul mediu este peste ținta de slăbire înregistrată.",
            "gain" => calorieDifference >= 0
                ? "Aportul mediu este în linie cu ținta de creștere în greutate înregistrată."
                : "Aportul mediu este sub ținta de creștere în greutate înregistrată.",
            _ => Math.Abs(calorieDifference) <= 150
                ? "Aportul mediu este apropiat de ținta de menținere înregistrată."
                : "Aportul mediu diferă de ținta de menținere înregistrată."
        };

        var weightContext = report.ActualWeightChangeKg.HasValue
            ? $"Balanța calorică estimează {SignedKg(report.EstimatedWeightChangeKg)}, iar cântăririle indică {SignedKg(report.ActualWeightChangeKg.Value)}; diferența pe șapte zile poate proveni din apă, glicogen sau momentul cântăririi, nu doar din țesut adipos."
            : $"Balanța calorică estimează {SignedKg(report.EstimatedWeightChangeKg)}, dar nu există încă două cântăriri comparabile.";
        var water = report.WaterAdherencePct >= 70
            ? "Hidratarea a fost apropiată de țintă."
            : "Pentru săptămâna următoare, urmărește mai întâi consecvența hidratării.";
        var steps = report.AvgSteps >= report.StepTarget
            ? "Media pașilor a atins ținta setată."
            : "O creștere mică și constantă a pașilor ar apropia media de țintă.";

        return $"{goalContext} {weightContext} {water} {steps}";
    }

    private static bool IsNarrativeGrounded(
        NutritionistWeeklyReportDto report,
        string narrative)
    {
        if (string.IsNullOrWhiteSpace(narrative))
            return false;

        string[] inflatedTerms =
        [
            "remarcabil",
            "impresionant",
            "excelent",
            "extraordinar",
            "fantastic",
            "senzațional",
            "spectaculos"
        ];

        if (inflatedTerms.Any(term =>
                narrative.Contains(term, StringComparison.OrdinalIgnoreCase)))
            return false;

        if (report.ActualWeightChangeKg.HasValue)
        {
            var distinguishesEstimate = narrative.Contains(
                "estimat",
                StringComparison.OrdinalIgnoreCase);
            var distinguishesMeasurement =
                narrative.Contains("cântăr", StringComparison.OrdinalIgnoreCase)
                || narrative.Contains("măsur", StringComparison.OrdinalIgnoreCase);

            if (!distinguishesEstimate || !distinguishesMeasurement)
                return false;
        }

        var closeToMaintenanceTarget =
            report.UserGoal == "maintain"
            && Math.Abs(report.AvgCaloriesIn - report.GoalCalories) <= 150;
        if (closeToMaintenanceTarget
            && (narrative.Contains("pierdere de greutate", StringComparison.OrdinalIgnoreCase)
                || narrative.Contains("creștere în greutate", StringComparison.OrdinalIgnoreCase)
                || narrative.Contains("îngrășare", StringComparison.OrdinalIgnoreCase)))
            return false;

        return true;
    }

    private static string BuildFallbackNarrative(NutritionistWeeklyReportDto report)
    {
        var balance = report.NetCaloriesTotal < 0 ? "deficit" : "surplus";
        var water = report.WaterAdherencePct >= 70
            ? "Hidratarea este aproape de ținta ta."
            : "Hidratarea este zona cu cel mai simplu câștig pentru săptămâna următoare.";
        var steps = report.AvgSteps >= report.StepTarget
            ? "Ai atins în medie obiectivul de pași."
            : "O plimbare scurtă zilnică te poate apropia de obiectivul de pași.";
        return $"Săptămâna aceasta ai avut un {balance} estimat de {Math.Abs(report.NetCaloriesTotal):0} kcal. {water} {steps} Continuă consecvent.";
    }

    private static int NormalizeWindow(int window) => window == 30 ? 30 : 7;
    private static double Round(double value, int decimals = 1) =>
        Math.Round(value, decimals, MidpointRounding.AwayFromZero);
    private static string NarrativeCacheKey(
        string userId,
        DateOnly windowEnd,
        string userGoal,
        double goalCalories) =>
        $"weekly-report-narrative:{userId}:{windowEnd:yyyy-MM-dd}:{userGoal}:{goalCalories:0}";

    private static string SignedKg(double value) =>
        $"{(value > 0 ? "+" : string.Empty)}{value:0.00} kg";

    private static DateOnly GetToday() =>
        DateOnly.FromDateTime(DateTime.UtcNow);

    internal sealed record MealTotals(
        string Date,
        double Calories,
        double Protein,
        double Carbs,
        double Fat,
        int Count);

    internal sealed record CachedNarrative(string Text, DateTime GeneratedAt);

    internal sealed record DayCompleteness(
        bool HasMeals,
        bool HasActivity,
        bool HasSteps,
        bool HasWater)
    {
        public static DayCompleteness Empty { get; } = new(false, false, false, false);
        public bool IsComplete => HasMeals && HasActivity && HasSteps && HasWater;
        public List<string> Missing
        {
            get
            {
                var missing = new List<string>(4);
                if (!HasMeals) missing.Add("meals");
                if (!HasActivity) missing.Add("activity");
                if (!HasSteps) missing.Add("steps");
                if (!HasWater) missing.Add("water");
                return missing;
            }
        }

        public static DayCompleteness Create(
            bool hasMeals,
            bool hasActivity,
            bool hasSteps,
            bool hasWater) =>
            new(hasMeals, hasActivity, hasSteps, hasWater);
    }
}
