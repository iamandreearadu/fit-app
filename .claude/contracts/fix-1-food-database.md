# API Contract: Fix 1 — Food Database Integration (USDA FoodData Central)

**Status:** `BACKEND_READY`  
**Author:** @tech-architect  
**Date:** 2026-05-31  
**Sprint:** 1 (backend ✅) → 2 (frontend)  
**ADR:** `.claude/decisions/fix-1-food-database.md`

---

## Overview

Fix 1 integrates USDA FoodData Central as a backend-proxied food search API for macro autofill during meal logging. Adds two new endpoints to `NutritionController`, creates a new `FoodSearchService`, modifies the `FoodItem` entity with a `Source` field, and updates `FoodItemDto` to pass through the source.

**New endpoints:**

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /api/nutrition/foods/search | Bearer | Proxy search to USDA FoodData Central with caching |
| GET | /api/nutrition/foods/recent | Bearer | Last 10 distinct food items logged by authenticated user |

**Modified endpoints:**

| Method | Route | Auth | Change |
|--------|-------|------|--------|
| POST | /api/nutrition | Bearer | `FoodItemDto` now accepts optional `Source` field |
| PUT | /api/nutrition/{id} | Bearer | `FoodItemDto` now accepts optional `Source` field |
| GET | /api/nutrition | Bearer | `FoodItemDto` in response now includes `Source` (nullable) |

**Unchanged endpoints:**

| Method | Route | Auth |
|--------|-------|------|
| DELETE | /api/nutrition/{id} | Bearer |

---

## REST Endpoint Detail

### `GET /api/nutrition/foods/search`

Searches USDA FoodData Central for food items matching the query. Returns nutrient values per 100g. Results are cached in-memory with a 30-minute sliding TTL. Filters to "SR Legacy" and "Foundation" data types (curated, generic foods — no branded items).

**Controller:** `NutritionController`  
**Service method:** `FoodSearchService.SearchAsync(string query, int pageSize)`  
**Auth:** Bearer (JWT) — `[Authorize]` inherited from controller

**Request:**

| Parameter | Type | Source | Required | Constraints |
|---|---|---|---|---|
| `q` | string | query | yes | min 2 characters after trim |
| `pageSize` | int | query | no | default 10, max 10 |

**Response: 200 OK — results found**

```json
[
  {
    "fdcId": 171077,
    "name": "Chicken, broilers or fryers, breast, skinless, boneless, meat only, raw",
    "calories": 120.0,
    "protein_g": 22.5,
    "carbs_g": 0.0,
    "fat_g": 2.6,
    "servingSize": "breast, bone and skin removed (174g)",
    "brand": null,
    "dataType": "SR Legacy"
  },
  {
    "fdcId": 168917,
    "name": "Chicken, breast, rotisserie, skin not eaten",
    "calories": 148.0,
    "protein_g": 24.8,
    "carbs_g": 0.0,
    "fat_g": 4.8,
    "servingSize": null,
    "brand": null,
    "dataType": "Foundation"
  }
]
```

**Response: 200 OK — no results found**

```json
[]
```

**Response: 200 OK — query too short (<2 chars)**

```json
[]
```

> **Note:** There is no 404 or 400 for empty/short queries. The endpoint always returns 200 with an array (empty or populated). This simplifies frontend handling — no error state for "no results", just an empty array.

**Response: 200 OK — USDA API unavailable (timeout, 429, 500)**

```json
[]
```

> **Note:** USDA errors are swallowed — logged server-side at WARN level, empty array returned to client. The user sees "No results" and can retry or enter manually. The API never exposes USDA error details to the client.

**Error Responses:**

| Status | When |
|--------|------|
| 401 | Missing or invalid JWT |
| 500 | Unexpected server error (ProblemDetails) — should not occur in normal operation |

---

### `GET /api/nutrition/foods/recent`

Returns the last 10 distinct food items logged by the authenticated user, ordered by most recent usage (based on `MealEntry.UpdatedAt`). Deduplicated by food name (case-insensitive) — only the most recent occurrence of each food name is returned.

**Zero external API calls.** Queries existing `FoodItem` + `MealEntry` records from the local database only.

**Controller:** `NutritionController`  
**Service method:** `FoodSearchService.GetRecentFoodsAsync(string userId)`  
**Auth:** Bearer (JWT) — user ID extracted from `sub` claim

**Request:** No body, no query params.

**Response: 200 OK — user has logged foods**

```json
[
  {
    "name": "Chicken breast, raw",
    "grams": 150.0,
    "calories": 180.0,
    "protein_g": 33.75,
    "carbs_g": 0.0,
    "fats_g": 3.9,
    "source": "search",
    "lastUsed": "2026-05-31T10:15:00Z"
  },
  {
    "name": "Brown rice, cooked",
    "grams": 200.0,
    "calories": 232.0,
    "protein_g": 4.88,
    "carbs_g": 48.0,
    "fats_g": 1.82,
    "source": "manual",
    "lastUsed": "2026-05-30T18:30:00Z"
  },
  {
    "name": "Banana, raw",
    "grams": 120.0,
    "calories": 107.0,
    "protein_g": 1.3,
    "carbs_g": 27.5,
    "fats_g": 0.4,
    "source": null,
    "lastUsed": "2026-05-29T08:00:00Z"
  }
]
```

**Response: 200 OK — user has never logged any food items**

```json
[]
```

> **Note:** There is no 404 for users with no food history. The endpoint always returns 200 with an array.

**Key behaviors:**
- Deduplication is case-insensitive on `FoodItem.Name`. If a user logged "Chicken Breast" three times across different meals, only the most recent occurrence appears.
- The `grams`, `calories`, `protein_g`, `carbs_g`, `fats_g` values reflect the values from the most recent logged instance — NOT per-100g values. These are the actual gram-scaled values the user used last time.
- `source` is nullable — legacy records created before Fix 1 will have `null`.
- `lastUsed` is `MealEntry.UpdatedAt` — the timestamp of the meal that contains this food item.

**Error Responses:**

| Status | When |
|--------|------|
| 401 | Missing or invalid JWT |
| 500 | Unexpected server error (ProblemDetails) |

---

### `POST /api/nutrition` — MODIFIED (Non-Breaking)

**What changed:** `FoodItemDto` in the `SaveMealRequest.Items` array now accepts an optional `Source` field.

**What did NOT change:** All other request fields, response shape (`MealEntryDto`), auth requirements.

**Non-breaking:** `Source` is nullable. Old clients that don't send `Source` will have it default to `null` — equivalent to manual entry. New clients can set `Source` to track the origin of each food item.

**Request Body (with Fix 1 field):**

```json
{
  "name": "Lunch — Chicken & Rice",
  "type": "Lunch",
  "date": "2026-05-31",
  "items": [
    {
      "name": "Chicken breast, raw",
      "grams": 150,
      "calories": 180,
      "protein_g": 33.75,
      "carbs_g": 0,
      "fats_g": 3.9,
      "source": "search"
    },
    {
      "name": "Brown rice, cooked",
      "grams": 200,
      "calories": 232,
      "protein_g": 4.88,
      "carbs_g": 48,
      "fats_g": 1.82,
      "source": "manual"
    }
  ],
  "notes": "Post-workout meal"
}
```

**Response (MealEntryDto) — now includes `source` in items:**

```json
{
  "id": 42,
  "name": "Lunch — Chicken & Rice",
  "type": "Lunch",
  "date": "2026-05-31",
  "items": [
    {
      "name": "Chicken breast, raw",
      "grams": 150.0,
      "calories": 180.0,
      "protein_g": 33.75,
      "carbs_g": 0.0,
      "fats_g": 3.9,
      "source": "search"
    },
    {
      "name": "Brown rice, cooked",
      "grams": 200.0,
      "calories": 232.0,
      "protein_g": 4.88,
      "carbs_g": 48.0,
      "fats_g": 1.82,
      "source": "manual"
    }
  ],
  "totalGrams": 350.0,
  "totalCalories": 412.0,
  "totalProtein_g": 38.63,
  "totalCarbs_g": 48.0,
  "totalFats_g": 5.72,
  "notes": "Post-workout meal",
  "createdAt": "2026-05-31T12:00:00Z",
  "updatedAt": "2026-05-31T12:00:00Z"
}
```

---

## Field Definitions

### `FoodSearchResultDto` fields

| Field | Type | Null? | Source | Description |
|-------|------|-------|--------|-------------|
| `fdcId` | int | no | USDA `fdcId` | USDA FoodData Central unique food ID |
| `name` | string | no | USDA `description` | Food description (e.g., "Chicken, broilers or fryers, breast...") |
| `calories` | double | no | USDA nutrient ID 1008 | Energy in kcal per 100g. 0 if not reported. |
| `protein_g` | double | no | USDA nutrient ID 1003 | Protein in grams per 100g. 0 if not reported. |
| `carbs_g` | double | no | USDA nutrient ID 1005 | Carbohydrates in grams per 100g. 0 if not reported. |
| `fat_g` | double | no | USDA nutrient ID 1004 | Total fat in grams per 100g. 0 if not reported. |
| `servingSize` | string? | yes | USDA `servingSize` + `servingSizeUnit` | Human-readable serving description. Null if USDA doesn't report. |
| `brand` | string? | yes | USDA `brandName` | Brand name. Null for SR Legacy/Foundation (generic foods). |
| `dataType` | string? | yes | USDA `dataType` | "SR Legacy", "Foundation", etc. |

### `RecentFoodItemDto` fields

| Field | Type | Null? | Source | Description |
|-------|------|-------|--------|-------------|
| `name` | string | no | `FoodItem.Name` | Food item name as logged |
| `grams` | double | no | `FoodItem.Grams` | Gram amount from the most recent logged instance |
| `calories` | double | no | `FoodItem.Calories` | Calorie value for those grams (NOT per 100g) |
| `protein_g` | double | no | `FoodItem.Protein_g` | Protein for those grams |
| `carbs_g` | double | no | `FoodItem.Carbs_g` | Carbs for those grams |
| `fats_g` | double | no | `FoodItem.Fats_g` | Fats for those grams |
| `source` | string? | yes | `FoodItem.Source` | How the food was originally added. Null for legacy records. |
| `lastUsed` | DateTime | no | `MealEntry.UpdatedAt` | When the meal containing this food was last updated |

### `FoodItemDto` fields (modified — added `Source`)

| Field | Type | Null? | Status | Description |
|-------|------|-------|--------|-------------|
| `name` | string | no | Existing | Food item name |
| `grams` | double | no | Existing | Weight in grams |
| `calories` | double | no | Existing | Calories for this gram amount |
| `protein_g` | double | no | Existing | Protein (g) for this gram amount |
| `carbs_g` | double | no | Existing | Carbs (g) for this gram amount |
| `fats_g` | double | no | Existing | Fats (g) for this gram amount |
| `source` | string? | yes | **NEW** | "search" \| "recent" \| "manual" \| "ai_analyzer" \| null |

### New `FoodItem` entity field

| Field | Type | Column | Null? | Default | Description |
|-------|------|--------|-------|---------|-------------|
| `Source` | `string?` | `Source` | yes | NULL | Origin of the food data. Values: "search", "recent", "manual", "ai_analyzer". Legacy: null. |

---

## Response DTOs (C#)

### Add to `FitApp.Api/Models/DTOs/NutritionDtos.cs`

Place after existing `SaveMealRequest`:

```csharp
/// <summary>
/// A single food search result from USDA FoodData Central.
/// All nutrient values are per 100g. Never includes user health metrics.
/// </summary>
public class FoodSearchResultDto
{
    public int FdcId { get; set; }
    public string Name { get; set; } = string.Empty;
    public double Calories { get; set; }
    public double Protein_g { get; set; }
    public double Carbs_g { get; set; }
    public double Fat_g { get; set; }
    public string? ServingSize { get; set; }
    public string? Brand { get; set; }
    public string? DataType { get; set; }
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
    public string? Source { get; set; }
    public DateTime LastUsed { get; set; }
}
```

### Modify existing `FoodItemDto`

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

---

## TypeScript Interfaces

### Add to `fit-app/src/app/core/models/nutrition-tab.model.ts`

```typescript
// Fix 1 — USDA food search result (per 100g values)
export interface FoodSearchResult {
  fdcId: number;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  servingSize?: string;
  brand?: string;
  dataType?: string;
}

// Fix 1 — recently used food item from user's history
export interface RecentFoodItem {
  name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  source?: string;
  lastUsed: string;
}
```

### Extend existing `FoodItem` interface

```typescript
export interface FoodItem {
  name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  source?: string;   // Fix 1: "search" | "recent" | "manual" | "ai_analyzer"
}
```

---

## Field Mapping: C# → TypeScript

### `FoodSearchResultDto` → `FoodSearchResult`

| C# | TypeScript | Notes |
|----|-----------|-------|
| `FdcId` | `fdcId` | camelCase |
| `Name` | `name` | camelCase |
| `Calories` | `calories` | per 100g |
| `Protein_g` | `protein_g` | underscore intentional (unit suffix) |
| `Carbs_g` | `carbs_g` | underscore intentional |
| `Fat_g` | `fat_g` | underscore intentional |
| `ServingSize` | `servingSize` | nullable → optional |
| `Brand` | `brand` | nullable → optional |
| `DataType` | `dataType` | nullable → optional |

### `RecentFoodItemDto` → `RecentFoodItem`

| C# | TypeScript | Notes |
|----|-----------|-------|
| `Name` | `name` | camelCase |
| `Grams` | `grams` | camelCase |
| `Calories` | `calories` | actual gram-scaled values |
| `Protein_g` | `protein_g` | actual gram-scaled values |
| `Carbs_g` | `carbs_g` | actual gram-scaled values |
| `Fats_g` | `fats_g` | actual gram-scaled values |
| `Source` | `source` | nullable → optional |
| `LastUsed` | `lastUsed` | DateTime → string |

---

## Caching Strategy

### IMemoryCache configuration

| Aspect | Value |
|---|---|
| Cache type | `IMemoryCache` (in-process, single server) |
| Cache key format | `usda:search:{query.ToLowerInvariant().Trim()}` |
| Expiration | 30-minute sliding TTL |
| Max entries | Unbounded (default `MemoryCache` behavior) — acceptable for single-server deployment |
| Invalidation | TTL-based only — no manual invalidation needed (USDA data changes rarely) |

### Rate limit mitigation

| Scenario | Behavior |
|---|---|
| Same query within 30 min | Cache HIT → no USDA API call |
| New query | Cache MISS → USDA API call → cache result |
| USDA returns 429 (rate limited) | Log warning, return empty array, cache nothing |
| USDA returns 500/timeout | Log warning, return empty array, cache nothing |
| User retries after USDA error | New USDA API call (failed requests are not cached) |

### Expected cache effectiveness

- Most users search for common foods: "chicken", "rice", "egg", "banana", "salmon", "oats"
- After initial cold start, expected cache hit rate for top 100 searches: >80%
- USDA rate limit of 1,000 req/hour is sufficient for early-stage usage (<100 DAU)
- At scale (>1,000 DAU), consider: Redis distributed cache, or USDA bulk CSV local database

---

## USDA API Request Detail

### Request format

```
GET https://api.nal.usda.gov/fdc/v1/foods/search
  ?query=chicken+breast
  &dataType=SR%20Legacy,Foundation
  &pageSize=25
  &api_key=YOUR_API_KEY
```

### USDA response format (simplified)

```json
{
  "totalHits": 142,
  "currentPage": 1,
  "totalPages": 6,
  "foods": [
    {
      "fdcId": 171077,
      "description": "Chicken, broilers or fryers, breast, skinless, boneless, meat only, raw",
      "dataType": "SR Legacy",
      "brandName": null,
      "servingSize": 174.0,
      "servingSizeUnit": "g",
      "foodNutrients": [
        { "nutrientId": 1008, "nutrientName": "Energy", "value": 120.0, "unitName": "KCAL" },
        { "nutrientId": 1003, "nutrientName": "Protein", "value": 22.5, "unitName": "G" },
        { "nutrientId": 1004, "nutrientName": "Total lipid (fat)", "value": 2.62, "unitName": "G" },
        { "nutrientId": 1005, "nutrientName": "Carbohydrate, by difference", "value": 0.0, "unitName": "G" }
      ]
    }
  ]
}
```

### Backend mapping logic

```
USDA response.foods[]
  → filter: only items where nutrient 1008 (calories) > 0
  → map: extract nutrients by ID → flat DTO fields
  → take first 10
  → cache with key = "usda:search:{query_lower}"
  → return FoodSearchResultDto[]
```

---

## Configuration

### `appsettings.json` — new section

Add alongside existing `Groq` section:

```json
{
  "Usda": {
    "ApiKey": "DEMO_KEY",
    "BaseUrl": "https://api.nal.usda.gov/fdc/v1/"
  }
}
```

> `DEMO_KEY` is USDA's free demo key (30 req/hour). Register at https://api.data.gov/signup/ for a production key (1,000 req/hour, free, instant approval).

### `Program.cs` — new registrations

```csharp
// HTTP Client for USDA FoodData Central
builder.Services.AddHttpClient("USDA", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Usda:BaseUrl"]!);
    client.Timeout = TimeSpan.FromSeconds(15);
});

// Memory cache (if not already registered)
builder.Services.AddMemoryCache();

// Food search service
builder.Services.AddScoped<FoodSearchService>();
```

---

## Backend Implementation Checklist (`@dotnet-developer`)

- [ ] **`appsettings.json`** — add `Usda` section with `ApiKey` and `BaseUrl`
- [ ] **`FitApp.Api/Models/Entities/MealEntry.cs`** — add `Source` property (string?) to `FoodItem` class
- [ ] **Run migration:** `dotnet ef migrations add AddFoodItemSource` — one nullable TEXT column
- [ ] **`FitApp.Api/Models/DTOs/NutritionDtos.cs`**:
  - [ ] Add `Source` property to existing `FoodItemDto`
  - [ ] Add `FoodSearchResultDto` class
  - [ ] Add `RecentFoodItemDto` class
- [ ] **`FitApp.Api/Program.cs`**:
  - [ ] Add `AddHttpClient("USDA", ...)` registration
  - [ ] Add `AddMemoryCache()` registration
  - [ ] Add `AddScoped<FoodSearchService>()` registration
- [ ] **`FitApp.Api/Services/FoodSearchService.cs`** — create new service file (implementation in ADR)
- [ ] **`FitApp.Api/Services/NutritionService.cs`**:
  - [ ] Update `ApplyItemsAndTotals` to pass through `f.Source`
  - [ ] Update `MapToDto` to include `Source = f.Source`
- [ ] **`FitApp.Api/Controllers/NutritionController.cs`**:
  - [ ] Add `FoodSearchService` to constructor injection
  - [ ] Add `[HttpGet("foods/search")]` endpoint
  - [ ] Add `[HttpGet("foods/recent")]` endpoint
- [ ] **Verify** existing endpoints still work: `GET /api/nutrition`, `POST /api/nutrition`, `PUT /api/nutrition/{id}`, `DELETE /api/nutrition/{id}`

---

## Frontend Implementation Checklist (`@angular-developer`)

- [ ] **`core/models/nutrition-tab.model.ts`**:
  - [ ] Add `source?` to existing `FoodItem` interface
  - [ ] Add `FoodSearchResult` interface
  - [ ] Add `RecentFoodItem` interface
- [ ] **`api/nutrition-tab.service.ts`**:
  - [ ] Add `searchFoods(query: string): Promise<FoodSearchResult[]>`
  - [ ] Add `getRecentFoods(): Promise<RecentFoodItem[]>`
- [ ] **`core/facade/nutrition-tab.facade.ts`**:
  - [ ] Add `searchResults` signal (`Signal<FoodSearchResult[]>`)
  - [ ] Add `recentFoods` signal (`Signal<RecentFoodItem[]>`)
  - [ ] Add `searchLoading` signal (`Signal<boolean>`)
  - [ ] Add `searchFoods(query: string): Promise<void>`
  - [ ] Add `loadRecentFoods(): Promise<void>`
  - [ ] Add `clearSearchResults(): void`
- [ ] **New components (Sprint 2):**
  - [ ] `features/nutrition/food-search/food-search.component.ts` — search input + results
  - [ ] `features/nutrition/recent-foods/recent-foods.component.ts` — recent foods list
- [ ] **Integration:** wire food selection into existing Add Meal dialog to autofill `FoodItem` fields
- [ ] **Source tracking:** set `source` on each `FoodItem` when building the `SaveMealRequest.items` array

---

## Constraints

- Angular must NEVER call USDA FoodData Central directly — always through `GET /api/nutrition/foods/search`
- `FoodSearchResultDto` must NEVER include user health metrics (BMI, weight, TDEE, BMR, goal calories)
- `RecentFoodItemDto` must NEVER include `UserId` — endpoint is scoped by JWT
- USDA API key must NEVER appear in frontend code, API responses, or INFO-level logs
- `FoodItemDto.Source` must remain nullable — backward compatibility with existing records
- USDA errors (429, 500, timeout) must return empty array, not propagate to client
- `FoodSearchService` must be a separate class from `NutritionService` — single responsibility
- Cache key must normalize query to lowercase + trim — "Chicken" and "chicken" hit the same cache entry
- `pageSize` is capped at 10 server-side regardless of client request — `Math.Min(pageSize, 10)`
- Recent foods deduplicates by name (case-insensitive) — max 10 distinct items returned

---

## Implementation Log

```
2026-05-31 - DRAFT created by @tech-architect
2026-05-31 - BACKEND_READY by @dotnet-developer

Final endpoints implemented:
  GET  /api/nutrition/foods/search?q=&pageSize= → FoodSearchResultDto[]
  GET  /api/nutrition/foods/recent              → RecentFoodItemDto[]

Migration added: 20260531111555_AddFoodItemSource
  → One nullable TEXT column "Source" on FoodItems table. No data loss.

Services registered:
  FoodSearchService (Scoped)
  AddHttpClient("USDA") — https://api.nal.usda.gov/fdc/v1/, 15s timeout
  AddMemoryCache() — 30-min sliding TTL per search query

Modified files:
  Models/Entities/MealEntry.cs       — FoodItem.Source (string?) added
  Models/DTOs/NutritionDtos.cs       — FoodItemDto.Source added; FoodSearchResultDto + RecentFoodItemDto added
  Services/NutritionService.cs       — ApplyItemsAndTotals + MapToDto propagate Source
  Services/FoodSearchService.cs      — NEW: USDA proxy + recent foods query
  Controllers/NutritionController.cs — GET foods/search + GET foods/recent endpoints
  Program.cs                         — USDA HttpClient, MemoryCache, FoodSearchService registered
  appsettings.json                   — Usda:ApiKey (DEMO_KEY) + Usda:BaseUrl added

USDA data quality validation (English queries):
  "chicken breast" → 438 SR Legacy/Foundation hits, full macro data ✓
  "cheese"         → 296 SR Legacy hits, multiple varieties with full macros ✓
  "rice"           → 512 SR Legacy hits, complete macro data ✓

⚠ CORRECTION (2026-05-31): Previously documented that Romanian queries
  ("piept de pui", "branza", "mamaliga") return valid USDA results.
  This was INCORRECT. USDA FoodData Central is English-only.
  Romanian queries return zero relevant results.
  Accepted trade-off per @product-strategist: app UI is English,
  text search is English. Sprint 2 mitigations documented in ADR:
  (1) English-search helper text on empty results (required)
  (2) Romanian→English lookup table for 50 common foods (optional)

Ready for: @angular-developer (Sprint 2)
```
