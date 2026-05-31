# ADR: Fix 1 — Food Database Integration (USDA FoodData Central)

**Status:** APPROVED  
**Author:** @tech-architect  
**Date:** 2026-05-31  
**Sprint:** 1 (backend) → 2 (frontend)  
**Source:** `.claude/plans/ux-audit-implementation-plan.md` Fix 1  
**Product validation:** @product-strategist recommended USDA FoodData Central over Open Food Facts for MVP — accepted.

---

## Context

### The Problem

Users must manually enter protein, carbs, fat, and calories for every food item when logging a meal. This is the single highest-friction action in the entire nutrition module. Users who attempt nutrition logging more than twice without autofill abandon permanently — this is a confirmed day-2 churn driver.

### Why now

Fix 1 is rated **CRITICAL** priority in the UX audit. Sprint 1 starts the backend; Sprint 2 completes the frontend. The food search backend must be ready before the Angular food search UI can be built.

### Why USDA FoodData Central, not Open Food Facts

@product-strategist evaluated both options and recommended USDA FoodData Central:

| Criterion | USDA FoodData Central | Open Food Facts |
|---|---|---|
| Data quality | High — curated by USDA nutritionists | Variable — community-contributed |
| Nutrient accuracy | Lab-tested values for SR Legacy & Foundation | User-scanned, often incomplete |
| API key required | Yes (free, instant) | No |
| Rate limit | 1,000 req/hour per API key | Informal, no SLA |
| Coverage for generic foods | Excellent (chicken breast, rice, eggs) | Excellent for packaged/branded |
| Coverage for branded foods | Good via "Branded" data type | Excellent |
| Barcode search | Not supported | Supported |
| Response consistency | Structured, stable schema | Variable field population |

**Decision:** Use USDA for MVP text search (generic foods are the primary use case for meal logging). Retain the existing `OpenFoodFactsService` on the frontend for barcode scanning (P2 follow-up). The two APIs serve complementary use cases.

### What already exists

| Component | Location | Relevance |
|---|---|---|
| `FoodItem` entity | `Models/Entities/MealEntry.cs` | The entity that stores individual food items within a meal — **will be modified** |
| `FoodItemDto` | `Models/DTOs/NutritionDtos.cs` | Existing DTO for food items in meal requests — **not changed** |
| `NutritionService` | `Services/NutritionService.cs` | Handles meal CRUD — **not changed** |
| `NutritionController` | `Controllers/NutritionController.cs` | Routes under `/api/nutrition` — **extended with 2 new endpoints** |
| `OpenFoodFactsService` | `api/open-food-facts.service.ts` (frontend) | Calls OFF directly from Angular for barcode lookup — **not changed** |
| `NutritionTabService` | `api/nutrition-tab.service.ts` (frontend) | HTTP calls for meal CRUD — **extended** |
| `NutritionTabFacade` | `core/facade/nutrition-tab.facade.ts` (frontend) | Facade for meal state — **extended** |
| `FoodItem` TS interface | `core/models/nutrition-tab.model.ts` (frontend) | Frontend food item model — **not changed** |
| `BarcodeProduct` TS interface | `core/models/barcode-product.model.ts` (frontend) | Frontend barcode result model — **not changed** |

---

## Decision

### 1. New backend service: `FoodSearchService` (not NutritionService)

**Decision: Create a new `FoodSearchService`, do NOT extend `NutritionService`.**

Rationale:
- `NutritionService` handles meal CRUD against the local database. It has no external API calls, no HTTP client injection, no caching.
- `FoodSearchService` is a fundamentally different concern: it proxies an external API, requires `IHttpClientFactory`, `IMemoryCache`, and `IConfiguration`. Mixing these concerns into `NutritionService` violates single responsibility.
- `FoodSearchService` is the natural home for both the USDA search proxy AND the "recent foods" query — both are food lookup operations, not meal CRUD.

```
NutritionService   → Meal CRUD (create, update, delete, list meals)
FoodSearchService  → Food lookup (USDA search, recent foods query)
```

Both are consumed by `NutritionController` — the controller already owns the `/api/nutrition` route prefix.

### 2. USDA FoodData Central proxy architecture

```
Angular → GET /api/nutrition/foods/search?q=chicken
  → NutritionController.SearchFoods(q, pageSize)
    → FoodSearchService.SearchAsync(q, pageSize)
      → IMemoryCache check (key = "usda:search:{q_lower}")
        → HIT: return cached FoodSearchResultDto[]
        → MISS: HttpClient → https://api.nal.usda.gov/fdc/v1/foods/search
          → Map USDA response → FoodSearchResultDto[]
          → Cache with 30-min sliding TTL
          → Return
```

**Security:** USDA API key stored in `appsettings.json` under `Usda:ApiKey`. Never exposed to Angular. All search requests go through the .NET backend proxy. Angular never knows the USDA API key exists.

**HTTP Client registration in `Program.cs`:**
```csharp
builder.Services.AddHttpClient("USDA", client =>
{
    client.BaseAddress = new Uri("https://api.nal.usda.gov/fdc/v1/");
    client.Timeout = TimeSpan.FromSeconds(15);
});
```

Note: Unlike the Groq client, the USDA API key is passed as a query parameter (`api_key=`), NOT as a Bearer header. The key is appended per-request inside `FoodSearchService`.

### 3. Nutrient ID mapping

USDA FoodData Central returns nutrients as an array of `{nutrientId, nutrientName, value, unitName}` objects. The backend must map specific nutrient IDs to flat DTO fields:

| USDA Nutrient ID | Nutrient | DTO field | Unit |
|---|---|---|---|
| 1008 | Energy | `calories` | kcal |
| 1003 | Protein | `protein_g` | g |
| 1005 | Carbohydrate, by difference | `carbs_g` | g |
| 1004 | Total lipid (fat) | `fat_g` | g |

**Data type filtering:** The USDA search API returns results from multiple data types:
- `SR Legacy` — curated standard reference foods (highest quality)
- `Foundation` — detailed nutrient profiles for key foods
- `Survey (FNDDS)` — foods as consumed in dietary surveys
- `Branded` — manufacturer-reported data (huge volume, variable quality)

**Decision:** Pass `dataType=SR Legacy,Foundation` in the USDA API request to filter results. This ensures search results are curated generic foods (chicken breast, rice, banana) rather than branded items (Tyson Chicken Breast 12oz). Branded food search is a P2 follow-up — users who want specific branded products can use barcode scanning (existing Open Food Facts integration).

**Max results:** Request `pageSize=25` from USDA, then take the first 10 results after mapping. This allows headroom for filtering out items with missing nutrient data.

### 4. Endpoint: `GET /api/nutrition/foods/search`

Proxies USDA FoodData Central, returns flat DTO array.

| Aspect | Detail |
|---|---|
| Route | `GET /api/nutrition/foods/search?q={query}&pageSize={n}` |
| Auth | Bearer (JWT) — `[Authorize]` inherited from `NutritionController` |
| Query params | `q` (required, min 2 chars), `pageSize` (optional, default 10, max 10) |
| Response | `FoodSearchResultDto[]` (max 10 items) |
| Cache | `IMemoryCache`, key = `usda:search:{q.ToLowerInvariant().Trim()}`, 30-min sliding expiration |
| Error handling | USDA timeout/error → return empty array + log warning (do not propagate 500) |

**Cache-first strategy as USDA rate limit mitigation:**
- USDA allows 1,000 requests/hour per API key.
- Common searches ("chicken", "rice", "egg", "banana") will be cached after the first request.
- 30-minute sliding TTL means popular queries stay cached as long as anyone searches for them within 30 minutes.
- Estimated unique queries per hour in early stage: <100. Cache hit rate expected: >60% for common foods.
- If rate limit is hit, USDA returns 429. `FoodSearchService` catches this and returns an empty array — the user sees "No results" and can retry after cache-miss cooldown.
- Future mitigation: if the app scales, upgrade to a USDA "DEMO_KEY" replacement with higher limits, or implement a local food database seeded from USDA bulk download.

### 5. Endpoint: `GET /api/nutrition/foods/recent`

Returns the last 10 distinct food items logged by the authenticated user, ordered by most recent use. **Zero external API calls** — queries existing `FoodItem` records from the local database only.

| Aspect | Detail |
|---|---|
| Route | `GET /api/nutrition/foods/recent` |
| Auth | Bearer (JWT) — user ID from `sub` claim |
| Response | `RecentFoodItemDto[]` (max 10 items) |
| Data source | `FoodItems` table joined to `MealEntries` for the user |
| Ordering | Most recently used first (by `MealEntry.UpdatedAt` desc) |
| Deduplication | By `FoodItem.Name` (case-insensitive) — take the most recent occurrence |

**Query strategy:**
```sql
SELECT DISTINCT ON (LOWER(fi.Name))
    fi.Name, fi.Grams, fi.Calories, fi.Protein_g, fi.Carbs_g, fi.Fats_g, fi.Source,
    me.UpdatedAt AS LastUsed
FROM FoodItems fi
JOIN MealEntries me ON fi.MealEntryId = me.Id
WHERE me.UserId = @userId
ORDER BY me.UpdatedAt DESC
LIMIT 10
```

This query leverages the existing `FoodItem` → `MealEntry` relationship. No new join table or tracking entity needed.

### 6. `FoodItem` entity modification: add `Source` field

A new nullable `Source` field on the existing `FoodItem` entity to track where the food item data originated:

| Value | Meaning |
|---|---|
| `"search"` | Selected from USDA food search results |
| `"recent"` | Selected from the recent foods list (originally from any source) |
| `"manual"` | Manually entered by the user (all existing records default to this) |
| `"ai_analyzer"` | Auto-populated by the AI meal analyzer (Groq vision) |
| `null` | Legacy records created before this field existed |

**Migration impact:** One new nullable `TEXT` column on `FoodItems` table. No data loss. Existing records will have `NULL` (equivalent to `"manual"` semantically). No default value constraint — nullable is sufficient.

**Why string, not enum:** SQLite stores TEXT. Using a C# string avoids the need for enum-to-int mapping and makes the source values human-readable in the database. The values are validated in the DTO/service layer, not at the database level.

### 7. Privacy constraints

`FoodSearchResultDto` and `RecentFoodItemDto` must **NEVER** include:
- BMI, body weight, goal calories, BMR, TDEE, or any user health metrics
- User ID (the endpoints are scoped to the authenticated user — no need to return it)

These DTOs contain only food-level data: name, macros per 100g, serving size, brand, source.

---

## Clean Architecture Boundaries

- **Controller responsibility (`NutritionController`):** Extract `UserId` from JWT, validate query parameters, delegate to `FoodSearchService`, return results. No caching logic, no USDA URL construction, no nutrient mapping in the controller.
- **Service responsibility (`FoodSearchService`):** All USDA proxy logic — URL construction, API key injection, HTTP call, nutrient ID mapping, result filtering, caching. Also: recent foods query with deduplication.
- **What stays out of controllers:** Cache management, USDA response parsing, nutrient ID → DTO field mapping, deduplication logic.
- **What stays out of components:** HTTP calls (always through `NutritionTabFacade`), USDA URL knowledge, API key awareness. Angular never calls USDA directly.

---

## Data Model

### Modified EF Entity (`FitApp.Api/Models/Entities/MealEntry.cs` — `FoodItem` class)

```csharp
public class FoodItem
{
    public int Id { get; set; }
    public int MealEntryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public double Grams { get; set; }
    public double Calories { get; set; }
    public double Protein_g { get; set; }
    public double Carbs_g { get; set; }
    public double Fats_g { get; set; }
    public int Order { get; set; }

    // Fix 1: Track where the food item data originated
    // Values: "search" | "recent" | "manual" | "ai_analyzer" | null (legacy)
    public string? Source { get; set; }

    public MealEntry MealEntry { get; set; } = null!;
}
```

**Migration required:** One new nullable TEXT column on `FoodItems` table.

### New DTOs (`FitApp.Api/Models/DTOs/NutritionDtos.cs`)

```csharp
/// <summary>
/// A single food search result from USDA FoodData Central.
/// All nutrient values are per 100g. Never includes user health metrics.
/// </summary>
public class FoodSearchResultDto
{
    public int FdcId { get; set; }                    // USDA FoodData Central ID
    public string Name { get; set; } = string.Empty;  // "Chicken breast, raw" etc.
    public double Calories { get; set; }               // per 100g
    public double Protein_g { get; set; }              // per 100g
    public double Carbs_g { get; set; }                // per 100g
    public double Fat_g { get; set; }                  // per 100g
    public string? ServingSize { get; set; }           // e.g. "1 breast, 174g" — nullable
    public string? Brand { get; set; }                 // nullable — null for SR Legacy/Foundation
    public string? DataType { get; set; }              // "SR Legacy", "Foundation", etc.
}

/// <summary>
/// A recently used food item for the authenticated user.
/// Derived from existing FoodItem records — zero external API calls.
/// </summary>
public class RecentFoodItemDto
{
    public string Name { get; set; } = string.Empty;
    public double Grams { get; set; }
    public double Calories { get; set; }
    public double Protein_g { get; set; }
    public double Carbs_g { get; set; }
    public double Fats_g { get; set; }
    public string? Source { get; set; }                // "search" | "recent" | "manual" | "ai_analyzer"
    public DateTime LastUsed { get; set; }             // MealEntry.UpdatedAt of the most recent usage
}
```

### TypeScript Interfaces (`fit-app/src/app/core/models/nutrition-tab.model.ts`)

```typescript
// Fix 1 — USDA food search result (per 100g values)
export interface FoodSearchResult {
  fdcId: number;
  name: string;
  calories: number;      // per 100g
  protein_g: number;     // per 100g
  carbs_g: number;       // per 100g
  fat_g: number;         // per 100g
  servingSize?: string;  // e.g. "1 breast, 174g"
  brand?: string;        // null for generic foods
  dataType?: string;     // "SR Legacy", "Foundation", etc.
}

// Fix 1 — recently used food item from user's history
export interface RecentFoodItem {
  name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  source?: string;       // "search" | "recent" | "manual" | "ai_analyzer"
  lastUsed: string;      // ISO date string
}
```

### Extended `FoodItem` interface (add `source`)

```typescript
export interface FoodItem {
  name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  source?: string;  // Fix 1: "search" | "recent" | "manual" | "ai_analyzer"
}
```

---

## API Contract

| Method | Route | Auth | Query Params | Request Body | Response |
|--------|-------|------|-------------|-------------|---------|
| GET | /api/nutrition/foods/search | Bearer | `q` (string, required, min 2 chars), `pageSize` (int, optional, default 10, max 10) | — | `FoodSearchResultDto[]` |
| GET | /api/nutrition/foods/recent | Bearer | — | — | `RecentFoodItemDto[]` |

Full contract detail in `.claude/contracts/fix-1-food-database.md`.

---

## Frontend Architecture

- **Extended model:** `core/models/nutrition-tab.model.ts` — add `FoodSearchResult` and `RecentFoodItem` interfaces; add `source?` field to existing `FoodItem` interface
- **Extended API service:** `api/nutrition-tab.service.ts` — add `searchFoods(query: string): Promise<FoodSearchResult[]>` and `getRecentFoods(): Promise<RecentFoodItem[]>`
- **Extended facade:** `core/facade/nutrition-tab.facade.ts` — add:
  - `readonly searchResults: Signal<FoodSearchResult[]>`
  - `readonly recentFoods: Signal<RecentFoodItem[]>`
  - `readonly searchLoading: Signal<boolean>`
  - `searchFoods(query: string): Promise<void>`
  - `loadRecentFoods(): Promise<void>`
- **New components (Sprint 2 — @angular-developer):**
  - `features/nutrition/food-search/food-search.component.ts` — search input with debounce (300ms), results list, tap to select → autofills `FoodItem` form fields
  - `features/nutrition/recent-foods/recent-foods.component.ts` — horizontal chip list or vertical list of last 10 foods, tap to select → autofills
- **Route:** No new routes — these components are embedded in the existing Add Meal dialog/flow

---

## Instructions for @dotnet-developer

### 1. Configuration — `appsettings.json`

Add USDA section alongside existing Groq section:

```json
{
  "Usda": {
    "ApiKey": "DEMO_KEY",
    "BaseUrl": "https://api.nal.usda.gov/fdc/v1/"
  }
}
```

> Note: `DEMO_KEY` is USDA's free demo key — rate limited to 30 req/hour. For production, register at https://api.data.gov/signup/ for a free API key (1,000 req/hour). Replace `DEMO_KEY` with the production key.

### 2. Entity change + Migration

**`FitApp.Api/Models/Entities/MealEntry.cs`** — add to `FoodItem` class:

```csharp
// Fix 1: Track where the food item data originated
// Values: "search" | "recent" | "manual" | "ai_analyzer" | null (legacy)
public string? Source { get; set; }
```

Run migration:
```bash
cd FitApp.Api
dotnet ef migrations add AddFoodItemSource
```

One new nullable TEXT column on `FoodItems` table. No data loss. No default value.

### 3. New DTOs

**`FitApp.Api/Models/DTOs/NutritionDtos.cs`** — add `FoodSearchResultDto` and `RecentFoodItemDto` classes (definitions in Data Model section above). Place after existing `SaveMealRequest`.

### 4. HTTP Client registration

**`FitApp.Api/Program.cs`** — add after the existing Groq HTTP client:

```csharp
// ── HTTP Client for USDA FoodData Central ────────────────────────────────────
builder.Services.AddHttpClient("USDA", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Usda:BaseUrl"]!);
    client.Timeout = TimeSpan.FromSeconds(15);
});
```

### 5. Memory cache registration

**`FitApp.Api/Program.cs`** — add (if not already present):

```csharp
builder.Services.AddMemoryCache();
```

### 6. New service: `FoodSearchService`

**`FitApp.Api/Services/FoodSearchService.cs`** — create new file:

```csharp
using System.Text.Json;
using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace FitApp.Api.Services;

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
    /// Filters to SR Legacy and Foundation data types.
    /// </summary>
    public async Task<List<FoodSearchResultDto>> SearchAsync(string query, int pageSize = 10)
    {
        pageSize = Math.Min(pageSize, 10);
        if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 2)
            return [];

        var cacheKey = $"usda:search:{query.ToLowerInvariant().Trim()}";

        if (cache.TryGetValue(cacheKey, out List<FoodSearchResultDto>? cached) && cached is not null)
        {
            logger.LogDebug("USDA cache HIT for '{Query}'", query);
            return cached.Take(pageSize).ToList();
        }

        try
        {
            var apiKey = config["Usda:ApiKey"]!;
            var client = httpFactory.CreateClient("USDA");

            var encodedQuery = Uri.EscapeDataString(query.Trim());
            var url = $"foods/search?query={encodedQuery}&dataType=SR%20Legacy,Foundation&pageSize=25&api_key={apiKey}";

            logger.LogInformation("USDA search → query='{Query}'", query);
            var response = await client.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("USDA API error: {Status}", (int)response.StatusCode);
                return [];
            }

            var json = await response.Content.ReadAsStringAsync();
            var searchResult = JsonSerializer.Deserialize<UsdaSearchResponse>(json, JsonOpts);

            var results = (searchResult?.Foods ?? [])
                .Select(MapToDto)
                .Where(r => r.Calories > 0) // Filter out items with no calorie data
                .Take(10)
                .ToList();

            // Cache with 30-minute sliding expiration
            cache.Set(cacheKey, results, new MemoryCacheEntryOptions
            {
                SlidingExpiration = TimeSpan.FromMinutes(30)
            });

            logger.LogInformation("USDA search ← {Count} results for '{Query}'", results.Count, query);
            return results.Take(pageSize).ToList();
        }
        catch (TaskCanceledException ex)
        {
            logger.LogWarning(ex, "USDA search timeout for '{Query}'", query);
            return [];
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "USDA search HTTP error for '{Query}'", query);
            return [];
        }
    }

    /// <summary>
    /// Returns last 10 distinct food items logged by the user, ordered by most recent usage.
    /// Zero external API calls — queries local FoodItem records only.
    /// Deduplicates by name (case-insensitive).
    /// </summary>
    public async Task<List<RecentFoodItemDto>> GetRecentFoodsAsync(string userId)
    {
        var recentItems = await db.FoodItems
            .AsNoTracking()
            .Include(f => f.MealEntry)
            .Where(f => f.MealEntry.UserId == userId)
            .OrderByDescending(f => f.MealEntry.UpdatedAt)
            .Select(f => new RecentFoodItemDto
            {
                Name = f.Name,
                Grams = f.Grams,
                Calories = f.Calories,
                Protein_g = f.Protein_g,
                Carbs_g = f.Carbs_g,
                Fats_g = f.Fats_g,
                Source = f.Source,
                LastUsed = f.MealEntry.UpdatedAt
            })
            .ToListAsync();

        // Deduplicate by name (case-insensitive), keep most recent occurrence
        return recentItems
            .GroupBy(f => f.Name.ToLowerInvariant())
            .Select(g => g.First())
            .Take(10)
            .ToList();
    }

    // ── USDA response mapping ────────────────────────────────────────────────

    private static FoodSearchResultDto MapToDto(UsdaFoodItem food)
    {
        var nutrients = food.FoodNutrients ?? [];

        return new FoodSearchResultDto
        {
            FdcId = food.FdcId,
            Name = food.Description ?? "Unknown",
            Calories = GetNutrientValue(nutrients, NutrientIdCalories),
            Protein_g = GetNutrientValue(nutrients, NutrientIdProtein),
            Carbs_g = GetNutrientValue(nutrients, NutrientIdCarbs),
            Fat_g = GetNutrientValue(nutrients, NutrientIdFat),
            ServingSize = food.ServingSize.HasValue
                ? $"{food.ServingSizeUnit ?? ""} ({food.ServingSize}g)".Trim()
                : null,
            Brand = food.BrandName,
            DataType = food.DataType,
        };
    }

    private static double GetNutrientValue(List<UsdaFoodNutrient> nutrients, int nutrientId)
    {
        var nutrient = nutrients.FirstOrDefault(n => n.NutrientId == nutrientId);
        return Math.Round(nutrient?.Value ?? 0, 1);
    }

    // ── USDA API response models (internal, not DTOs) ────────────────────────

    private class UsdaSearchResponse
    {
        public List<UsdaFoodItem> Foods { get; set; } = [];
        public int TotalHits { get; set; }
    }

    private class UsdaFoodItem
    {
        public int FdcId { get; set; }
        public string? Description { get; set; }
        public string? DataType { get; set; }
        public string? BrandName { get; set; }
        public double? ServingSize { get; set; }
        public string? ServingSizeUnit { get; set; }
        public List<UsdaFoodNutrient> FoodNutrients { get; set; } = [];
    }

    private class UsdaFoodNutrient
    {
        public int NutrientId { get; set; }
        public string? NutrientName { get; set; }
        public double Value { get; set; }
        public string? UnitName { get; set; }
    }
}
```

### 7. Register service

**`FitApp.Api/Program.cs`** — add in the Application Services section:

```csharp
builder.Services.AddScoped<FoodSearchService>();
```

### 8. Controller endpoints

**`FitApp.Api/Controllers/NutritionController.cs`** — add `FoodSearchService` to constructor injection and two new endpoints:

```csharp
[ApiController]
[Route("api/nutrition")]
[Authorize]
public class NutritionController(
    NutritionService nutritionService,
    FoodSearchService foodSearchService) : ControllerBase
{
    // ... existing endpoints unchanged ...

    // GET api/nutrition/foods/search?q=chicken&pageSize=10
    [HttpGet("foods/search")]
    public async Task<IActionResult> SearchFoods(
        [FromQuery] string q,
        [FromQuery] int pageSize = 10)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            return Ok(Array.Empty<FoodSearchResultDto>());

        var results = await foodSearchService.SearchAsync(q, pageSize);
        return Ok(results);
    }

    // GET api/nutrition/foods/recent
    [HttpGet("foods/recent")]
    public async Task<IActionResult> GetRecentFoods()
    {
        var results = await foodSearchService.GetRecentFoodsAsync(UserId);
        return Ok(results);
    }
}
```

### 9. Update `ApplyItemsAndTotals` to preserve Source

**`FitApp.Api/Services/NutritionService.cs`** — in `ApplyItemsAndTotals`, pass through the `Source` field:

```csharp
private static void ApplyItemsAndTotals(MealEntry meal, List<FoodItemDto> items)
{
    meal.Items = items.Select((f, i) => new FoodItem
    {
        Name = f.Name,
        Grams = f.Grams,
        Calories = f.Calories,
        Protein_g = f.Protein_g,
        Carbs_g = f.Carbs_g,
        Fats_g = f.Fats_g,
        Source = f.Source,   // Fix 1: preserve food source
        Order = i
    }).ToList();

    meal.TotalGrams = items.Sum(f => f.Grams);
    meal.TotalCalories = items.Sum(f => f.Calories);
    meal.TotalProtein_g = items.Sum(f => f.Protein_g);
    meal.TotalCarbs_g = items.Sum(f => f.Carbs_g);
    meal.TotalFats_g = items.Sum(f => f.Fats_g);
}
```

### 10. Update `FoodItemDto` — add `Source`

**`FitApp.Api/Models/DTOs/NutritionDtos.cs`** — add `Source` to existing `FoodItemDto`:

```csharp
public class FoodItemDto
{
    public string Name { get; set; } = string.Empty;
    public double Grams { get; set; }
    public double Calories { get; set; }
    public double Protein_g { get; set; }
    public double Carbs_g { get; set; }
    public double Fats_g { get; set; }
    public string? Source { get; set; }   // Fix 1: "search" | "recent" | "manual" | "ai_analyzer"
}
```

### 11. Update `MapToDto` to include Source

**`FitApp.Api/Services/NutritionService.cs`** — in `MapToDto`, add `Source`:

```csharp
Items = m.Items.OrderBy(f => f.Order).Select(f => new FoodItemDto
{
    Name = f.Name,
    Grams = f.Grams,
    Calories = f.Calories,
    Protein_g = f.Protein_g,
    Carbs_g = f.Carbs_g,
    Fats_g = f.Fats_g,
    Source = f.Source   // Fix 1
}).ToList()
```

### 12. Verify backward compatibility

- `GET /api/nutrition` (list meals) — unchanged, `MealEntryDto.Items` now includes `Source` (nullable, non-breaking)
- `POST /api/nutrition` (create meal) — unchanged, `FoodItemDto.Source` is nullable (new clients can send it, old clients won't — defaults to null)
- `PUT /api/nutrition/{id}` — unchanged
- `DELETE /api/nutrition/{id}` — unchanged

---

## Instructions for @angular-developer

### 1. New interfaces

**`core/models/nutrition-tab.model.ts`** — add `FoodSearchResult` and `RecentFoodItem` interfaces. Add `source?` to existing `FoodItem` interface. (Definitions in Data Model section above.)

### 2. New API methods

**`api/nutrition-tab.service.ts`** — add:

```typescript
async searchFoods(query: string): Promise<FoodSearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const encoded = encodeURIComponent(query.trim());
    return await firstValueFrom(
      this.http.get<FoodSearchResult[]>(
        `${environment.apiUrl}/api/nutrition/foods/search?q=${encoded}&pageSize=10`
      )
    );
  } catch {
    this.alerts?.warn('Food search failed');
    return [];
  }
}

async getRecentFoods(): Promise<RecentFoodItem[]> {
  try {
    return await firstValueFrom(
      this.http.get<RecentFoodItem[]>(
        `${environment.apiUrl}/api/nutrition/foods/recent`
      )
    );
  } catch {
    this.alerts?.warn('Failed to load recent foods');
    return [];
  }
}
```

### 3. Facade extension

**`core/facade/nutrition-tab.facade.ts`** — add:

```typescript
// Fix 1: Food search signals
private readonly _searchResults = signal<FoodSearchResult[]>([]);
private readonly _recentFoods = signal<RecentFoodItem[]>([]);
private readonly _searchLoading = signal(false);

readonly searchResults = this._searchResults.asReadonly();
readonly recentFoods = this._recentFoods.asReadonly();
readonly searchLoading = this._searchLoading.asReadonly();

async searchFoods(query: string): Promise<void> {
  this._searchLoading.set(true);
  try {
    const results = await this.svc.searchFoods(query);
    this._searchResults.set(results);
  } finally {
    this._searchLoading.set(false);
  }
}

async loadRecentFoods(): Promise<void> {
  const recent = await this.svc.getRecentFoods();
  this._recentFoods.set(recent);
}

clearSearchResults(): void {
  this._searchResults.set([]);
}
```

### 4. Update `FoodItem` interface

**`core/models/nutrition-tab.model.ts`** — add `source?` to `FoodItem`:

```typescript
export interface FoodItem {
  name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  source?: string;  // Fix 1: "search" | "recent" | "manual" | "ai_analyzer"
}
```

### 5. New components (Sprint 2)

- `features/nutrition/food-search/food-search.component.ts` — search input with 300ms debounce, results list, select handler that converts `FoodSearchResult` → `FoodItem` (scaling from per-100g to user-specified grams). **Must show helper text** `Search in English for best results (e.g., 'chicken breast', 'brown rice')` when search returns zero results.
- `features/nutrition/recent-foods/recent-foods.component.ts` — list of recent foods, shown above search, tap to select

**Components call `NutritionTabFacade` — never `NutritionTabService` directly.**

### 6. Add `source` to save request

When a food item is selected from search, set `source: 'search'`. When selected from recent, set `source: 'recent'`. When manually entered, set `source: 'manual'`. When from AI analyzer, set `source: 'ai_analyzer'`. Pass through in the `SaveMealRequest.items` array.

### 7. Optional Sprint 2 enhancement: Romanian→English food lookup (frontend-only)

A small client-side lookup table mapping the ~50 most common Romanian food terms to their English equivalents. This is a **UX convenience** — not a backend change.

**Implementation:**
- New file: `core/data/food-translations.ts` — a `Record<string, string>` map
- When the user types a query, check if `query.toLowerCase()` matches a key in the map
- If matched, silently substitute the English equivalent before calling `facade.searchFoods(englishTerm)`
- Show a subtle hint below the search bar: `Searching for "{englishTerm}" (translated from "{originalQuery}")`

**Example entries:**
```typescript
export const ROMANIAN_FOOD_MAP: Record<string, string> = {
  'piept de pui': 'chicken breast',
  'branza': 'cheese',
  'mamaliga': 'cornmeal porridge',
  'orez': 'rice',
  'oua': 'eggs',
  'lapte': 'milk',
  'paine': 'bread',
  'cartofi': 'potatoes',
  'rosii': 'tomatoes',
  'castraveti': 'cucumbers',
  'mere': 'apples',
  'banane': 'bananas',
  'somon': 'salmon',
  'ton': 'tuna',
  'fasole': 'beans',
  'linte': 'lentils',
  'naut': 'chickpeas',
  'spanac': 'spinach',
  'broccoli': 'broccoli',
  'morcovi': 'carrots',
  'ardei': 'bell pepper',
  'ceapa': 'onion',
  'usturoi': 'garlic',
  'ulei de masline': 'olive oil',
  'unt': 'butter',
  'smantana': 'sour cream',
  'iaurt': 'yogurt',
  'cascaval': 'yellow cheese',
  'sunca': 'ham',
  'salam': 'salami',
  'carne de vita': 'beef',
  'carne de porc': 'pork',
  'carne tocata': 'ground meat',
  'ficatei de pui': 'chicken liver',
  'pulpa de pui': 'chicken thigh',
  'aripioare de pui': 'chicken wings',
  'peste': 'fish',
  'creveti': 'shrimp',
  'paste': 'pasta',
  'fulgi de ovaz': 'oat flakes',
  'miere': 'honey',
  'zahar': 'sugar',
  'ciocolata': 'chocolate',
  'nuci': 'walnuts',
  'migdale': 'almonds',
  'seminte de floarea soarelui': 'sunflower seeds',
  'avocado': 'avocado',
  'varza': 'cabbage',
  'conopida': 'cauliflower',
  'dovlecei': 'zucchini',
};
```

**This is optional** — implement only if time permits in Sprint 2. The primary mitigation is the English-search helper text (required).

---

## Instructions for @uiux-designer

Spec required: `.claude/design-specs/fix-1-food-database.md`

1. **Food search input:** Prominent search bar at top of Add Meal dialog/flow. Placeholder: "Search foods (e.g., chicken breast)". Magnifying glass icon. Results appear below as cards/list items.
2. **Search result card:** Food name (bold), macros row (kcal · P · C · F per 100g), data type badge ("USDA" label). Tap to select → opens gram quantity input → autofills FoodItem form fields.
3. **Recent foods list:** Shown above the search bar on Add Meal open. Horizontal scrollable chips or vertical compact list. Each chip: food name + last-used date. Tap to select → same autofill flow.
4. **Empty search state:** Two variants:
   - Before typing: "Type at least 2 characters to search"
   - No results returned: "No results found for '{query}'" **with helper text below:** `Search in English for best results (e.g., 'chicken breast', 'brown rice')` — always visible when results array is empty after a search. This guides users who may attempt non-English queries.
5. **Loading state:** Skeleton shimmer on search results area during API call.
6. **Error state:** "Search unavailable — try again or enter manually" with manual entry fallback prominent.
7. **Gram quantity dialog:** After selecting a food, user enters grams. Show per-100g values and computed values for entered grams side by side. "Add to meal" CTA.

---

## Sprint 2 UX Requirements (Language & Discoverability)

### Required: English-search helper text on empty results

**Context:** USDA FoodData Central is an English-only database. Romanian food queries (e.g., "piept de pui", "branza", "mamaliga") will return zero relevant results. This was initially documented incorrectly as returning valid hits — corrected on 2026-05-31 per @product-strategist confirmation that the app UI and search are English-only.

**Requirement:** When the food search returns an empty results array after a valid search (≥2 characters), the `food-search.component` must display:

```
No results found for "{query}"
Search in English for best results (e.g., 'chicken breast', 'brown rice')
```

The helper text is always visible on empty search results — not just for non-English queries, since the backend cannot detect query language. This serves as a universal discoverability hint.

**Owner:** @angular-developer (Sprint 2)  
**Design spec:** @uiux-designer — update empty state in `.claude/design-specs/fix-1-food-database.md`

### Optional: Romanian→English food lookup table (frontend-only UX improvement)

**Context:** While the app UI is English, some users may instinctively type food names in Romanian. A small client-side translation map for the ~50 most common foods can silently convert Romanian queries to English before hitting the USDA API.

**Scope:** Frontend-only. No backend changes. No new API endpoints. A simple `Record<string, string>` lookup in `core/data/food-translations.ts`.

**Behavior:**
1. User types "piept de pui" in the search box
2. Frontend detects a match in the Romanian→English map
3. Search request sent as "chicken breast" (English) to `/api/nutrition/foods/search?q=chicken+breast`
4. Results display normally, with a subtle hint: `Searching for "chicken breast" (translated from "piept de pui")`

**Priority:** Optional — implement only if Sprint 2 time permits. The required English-search helper text is the primary mitigation.

**Owner:** @angular-developer (Sprint 2, stretch goal)

---

## Consequences & Trade-offs

### Gains
- **Eliminates manual macro entry** — users select a food, enter grams, macros are autofilled
- **Recent foods accelerate repeat logging** — most users eat similar foods repeatedly; recent list reduces the flow to 2 taps
- **USDA data quality** — curated, lab-tested nutrient values from SR Legacy and Foundation databases
- **API key secured** — never exposed to the frontend; all requests proxied through backend
- **Cache reduces external dependency** — common searches cached for 30 minutes; reduces USDA API calls by estimated 60%+
- **Source tracking** — enables future analytics on how users add food items (search vs manual vs AI)

### Trade-offs
- **USDA rate limit (1,000 req/hour)** — mitigated by cache-first strategy. If the app scales beyond this, options: (a) register additional API keys, (b) seed a local food database from USDA bulk CSV download, (c) add Redis distributed cache
- **No branded food search in MVP** — USDA filtered to SR Legacy + Foundation only. Users wanting specific branded products use barcode scanning (existing Open Food Facts) or manual entry. Branded search is a P2 follow-up.
- **No barcode search via USDA** — USDA doesn't support barcode lookup. Existing `OpenFoodFactsService` on the frontend handles barcode scanning. The two APIs are complementary, not competing.
- **Recent foods query complexity** — deduplication by name requires in-memory grouping after the EF query. For users with large food item history (>1,000 items), this could be slow. Mitigation: the query is ordered by most recent and takes the top results — EF Core will generate an efficient ORDER BY + LIMIT query. The in-memory dedup is on the returned set, not the full table.
- **Migration required** — one new nullable column on `FoodItems`. Low risk, no data loss, no default value needed.
- **English-only text search (USDA limitation)** — USDA FoodData Central is an English-only database. Non-English search queries (e.g., Romanian: "piept de pui", "branza", "mamaliga") return zero relevant results. This is an accepted trade-off per the @product-strategist decision: the FitApp UI is English, the target audience searches in English, and text search is English. Sprint 2 mitigations: (a) empty-state helper text guiding users to search in English, (b) optional frontend-only Romanian→English lookup table for the 50 most common foods (see Sprint 2 UX below).

### Must NOT happen
- Angular must NEVER call USDA directly — always through the backend proxy
- `FoodSearchResultDto` must NEVER include user health metrics (BMI, weight, TDEE, etc.)
- `RecentFoodItemDto` must NEVER include `UserId` — scoped by JWT
- The USDA API key must NEVER appear in any frontend code, response body, or log message at INFO level
- `FoodItemDto.Source` must remain nullable — existing records and manual entries may not have it set
- `NutritionService` must NOT be modified to include USDA logic — use `FoodSearchService`
