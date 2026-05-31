using System.Text.Json;
using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace FitApp.Api.Services;

/// <summary>
/// Proxies USDA FoodData Central for food search and queries local FoodItem records for recent foods.
/// Separated from NutritionService (single responsibility — no meal CRUD here).
/// </summary>
public class FoodSearchService(
    AppDbContext db,
    IHttpClientFactory httpFactory,
    IMemoryCache cache,
    IConfiguration config,
    ILogger<FoodSearchService> logger)
{
    // USDA nutrient IDs → DTO field mapping
    private const int NutrientIdCalories = 1008;
    private const int NutrientIdProtein  = 1003;
    private const int NutrientIdFat      = 1004;
    private const int NutrientIdCarbs    = 1005;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    /// <summary>
    /// Searches USDA FoodData Central with cache-first strategy.
    /// Returns max <paramref name="pageSize"/> results (capped at 10).
    /// Filters to SR Legacy and Foundation data types (curated generic foods).
    /// Returns empty list on USDA errors — never propagates exceptions to callers.
    /// </summary>
    public async Task<List<FoodSearchResultDto>> SearchAsync(string query, int pageSize = 10)
    {
        pageSize = Math.Min(pageSize, 10);

        if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 2)
            return [];

        var normalizedQuery = query.ToLowerInvariant().Trim();
        var cacheKey = $"usda:search:{normalizedQuery}";

        // GetOrCreateAsync eliminates the TryGetValue → Set race window.
        // Failed or empty responses are not cached: AbsoluteExpirationRelativeToNow = 1 s
        // overrides the SlidingExpiration set at entry creation, so the entry expires
        // before any realistic caller can observe it.
        var allResults = await cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.SlidingExpiration = TimeSpan.FromMinutes(30);

            try
            {
                var apiKey = config["Usda:ApiKey"]!;
                var client = httpFactory.CreateClient("USDA");

                // Request 25 from USDA to allow headroom for filtering incomplete nutrient records
                var encodedQuery = Uri.EscapeDataString(query.Trim());
                var url = $"foods/search?query={encodedQuery}&dataType=SR%20Legacy,Foundation&pageSize=25&api_key={apiKey}";

                logger.LogDebug("USDA search → query='{Query}'", normalizedQuery);
                var response = await client.GetAsync(url);

                if (!response.IsSuccessStatusCode)
                {
                    logger.LogWarning("USDA API returned {Status} for query '{Query}' — returning empty results",
                        (int)response.StatusCode, normalizedQuery);
                    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(1); // do not cache errors
                    return [];
                }

                var json = await response.Content.ReadAsStringAsync();
                var searchResult = JsonSerializer.Deserialize<UsdaSearchResponse>(json, JsonOpts);

                var results = (searchResult?.Foods ?? [])
                    .Select(MapToDto)
                    .Where(r => r.Calories > 0)   // Only items with calorie data
                    .Take(10)
                    .ToList();

                if (results.Count == 0)
                {
                    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(1); // do not cache empty responses
                    return [];
                }

                logger.LogDebug("USDA search ← {Count} results for '{Query}'", results.Count, normalizedQuery);
                return results;
            }
            catch (TaskCanceledException ex)
            {
                logger.LogWarning(ex, "USDA search timed out for '{Query}' — returning empty results", normalizedQuery);
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(1);
                return [];
            }
            catch (HttpRequestException ex)
            {
                logger.LogWarning(ex, "USDA search HTTP error for '{Query}' — returning empty results", normalizedQuery);
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(1);
                return [];
            }
            catch (JsonException ex)
            {
                logger.LogWarning(ex, "USDA search response parse error for '{Query}' — returning empty results", normalizedQuery);
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(1);
                return [];
            }
        }) ?? [];

        return allResults.Take(pageSize).ToList();
    }

    /// <summary>
    /// Returns the last 10 distinct food items logged by the user, ordered by most recent usage.
    /// Zero external API calls — queries existing FoodItem + MealEntry records only.
    /// Deduplicates by name (case-insensitive), keeping the most recent occurrence.
    /// </summary>
    public async Task<List<RecentFoodItemDto>> GetRecentFoodsAsync(string userId)
    {
        // Pull all food items for this user ordered by meal's most-recent update.
        // Deduplication is done in-memory after EF materialises the (ORDER BY + LIMIT-aware) set.
        var items = await db.FoodItems
            .AsNoTracking()
            .Include(f => f.MealEntry)
            .Where(f => f.MealEntry.UserId == userId)
            .OrderByDescending(f => f.MealEntry.UpdatedAt)
            .Select(f => new RecentFoodItemDto
            {
                Name      = f.Name,
                Grams     = f.Grams,
                Calories  = f.Calories,
                Protein_g = f.Protein_g,
                Carbs_g   = f.Carbs_g,
                Fats_g    = f.Fats_g,
                Source    = f.Source,
                LastUsed  = f.MealEntry.UpdatedAt
            })
            .Take(100)
            .ToListAsync();

        // Deduplicate by name (case-insensitive) — keep the first (most recent) occurrence
        return items
            .GroupBy(f => f.Name.ToLowerInvariant())
            .Select(g => g.First())
            .Take(10)
            .ToList();
    }

    // ── USDA response → DTO mapping ──────────────────────────────────────────────

    private static FoodSearchResultDto MapToDto(UsdaFoodItem food)
    {
        var nutrients = food.FoodNutrients ?? [];

        string? servingSize = null;
        if (food.ServingSize.HasValue)
        {
            servingSize = food.ServingSizeUnit?.Trim().ToLower() switch
            {
                "g" or null or "" => $"{food.ServingSize}g",
                var unit          => $"{unit} ({food.ServingSize}g)"
            };
        }

        return new FoodSearchResultDto
        {
            FdcId      = food.FdcId,
            Name       = food.Description ?? "Unknown",
            Calories   = GetNutrientValue(nutrients, NutrientIdCalories),
            Protein_g  = GetNutrientValue(nutrients, NutrientIdProtein),
            Carbs_g    = GetNutrientValue(nutrients, NutrientIdCarbs),
            Fat_g      = GetNutrientValue(nutrients, NutrientIdFat),
            ServingSize = servingSize,
            Brand      = food.BrandName,
            DataType   = food.DataType
        };
    }

    private static double GetNutrientValue(List<UsdaFoodNutrient> nutrients, int nutrientId)
    {
        var match = nutrients.FirstOrDefault(n => n.NutrientId == nutrientId);
        return Math.Round(match?.Value ?? 0.0, 1);
    }

    // ── USDA API internal response models (not exposed as DTOs) ─────────────────

    private sealed class UsdaSearchResponse
    {
        public List<UsdaFoodItem> Foods { get; set; } = [];
        public int TotalHits { get; set; }
    }

    private sealed class UsdaFoodItem
    {
        public int FdcId { get; set; }
        public string? Description { get; set; }
        public string? DataType { get; set; }
        public string? BrandName { get; set; }
        public double? ServingSize { get; set; }
        public string? ServingSizeUnit { get; set; }
        public List<UsdaFoodNutrient> FoodNutrients { get; set; } = [];
    }

    private sealed class UsdaFoodNutrient
    {
        public int NutrientId { get; set; }
        public string? NutrientName { get; set; }
        public double Value { get; set; }
        public string? UnitName { get; set; }
    }
}
