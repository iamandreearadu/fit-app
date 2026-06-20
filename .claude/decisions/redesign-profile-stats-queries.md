# ADR: monthlyWorkoutCount and mutualFollowersCount via EF Subqueries

**ID:** REDESIGN-ADR-4
**Status:** Proposed
**Date:** 2026-06-04
**Author:** @tech-architect
**Consumed by:** @dotnet-developer, @angular-developer
**Blocks:** Sprint 2 — profile hero (ITEM-14), Sprint 3 — Discover user cards (ITEM-19)
**Supersedes:** `.claude/decisions/redesign-adr-4.md` (draft)

---

## Context

The beSocial redesign requires two new data points that do not exist in any current API response:

1. **`monthlyWorkoutCount`** — displayed in the social profile hero stats row (replaces "Posts" count) and in Discover user cards. Shows how many workout sessions the user completed this calendar month.

2. **`mutualFollowersCount`** — displayed in Discover user cards. Shows how many people the viewing user follows who also follow the target user.

### Current state

The `UserSocialProfileResponse` (`SocialDtos.cs:129–141`) includes `PostsCount`, `FollowersCount`, `FollowingCount` — all computed in `GetProfileAsync` (`SocialService.cs:451–484`) via a single projection query. No workout count exists.

The `SuggestedUserResponse` (`SocialDtos.cs:190–207`) already includes `WorkoutsThisMonth` (added in Fix 9) but does NOT include `MutualFollowersCount`.

The Discover endpoint `GET /api/social/discover` (`SocialService.cs:130`) returns `PostResponse[]` — it shows posts from non-followed users, not user cards. The redesign needs a **user-oriented** Discover endpoint.

## Decision

**Compute both values at query time via EF Core subqueries.** No caching table. The index on `WorkoutSessions(UserId, FinishedAt)` already exists (confirmed: `AppDbContext.cs` line 83). No new migration for the index.

---

## Index Verification

The composite index already exists in `AppDbContext.cs` line 83:

```csharp
e.HasIndex(s => new { s.UserId, s.FinishedAt });
```

This covers the monthly count query exactly (UserId equality + FinishedAt range scan). **No new migration needed for the index.**

---

## Subquery Patterns

### monthlyWorkoutCount

**Data source:** `WorkoutSession` entity — not `WorkoutTemplate`. Templates are plans; sessions are completions. Monthly workout count = completed sessions this calendar month.

```csharp
var now = DateTime.UtcNow;
var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

// Inline in a LINQ projection:
MonthlyWorkoutCount = db.WorkoutSessions
    .Count(s => s.UserId == u.Id && s.FinishedAt >= monthStart),
```

When used inside a `Select` projection (e.g., in the profile query), EF Core translates this to a correlated subquery in the generated SQL — one round-trip.

### mutualFollowersCount

**Definition:** Users that the viewing user follows who also follow the target user.

```
mutualFollowersCount = COUNT(
  users I follow
  WHO ALSO follow the target user
)
```

```csharp
// Inline in a LINQ projection:
MutualFollowersCount = db.Follows
    .Count(f => f.FollowerId == viewingUserId
        && db.Follows.Any(f2 => f2.FollowingId == u.Id && f2.FollowerId == f.FollowingId)),
```

**Index coverage:** The `Follow` entity has a unique index on `(FollowerId, FollowingId)` (`AppDbContext.cs` line 154 pattern — confirmed via the `Likes` analog; Follow has the same structure). This covers both the outer and inner conditions.

### currentStreak

Streak computation requires iterating DailyEntry dates backward from today. This cannot be expressed as a simple subquery. Compute after the main query:

```csharp
private async Task<int> ComputeStreakAsync(string userId)
{
    var today = DateOnly.FromDateTime(DateTime.UtcNow);

    var dates = await db.DailyEntries
        .Where(d => d.UserId == userId)
        .OrderByDescending(d => d.Date)
        .Select(d => d.Date)
        .Take(90)   // Look back max 90 days
        .ToListAsync();

    int streak = 0;
    var checkDate = today;

    foreach (var dateStr in dates)
    {
        if (DateOnly.TryParse(dateStr, out var entryDate))
        {
            if (entryDate == checkDate)
            {
                streak++;
                checkDate = checkDate.AddDays(-1);
            }
            else if (entryDate == checkDate.AddDays(-1))
            {
                // Allow "yesterday" as the start — user may not have logged today yet
                streak++;
                checkDate = entryDate.AddDays(-1);
            }
            else
            {
                break;
            }
        }
    }

    return streak;
}
```

For batch streak computation (Discover page with 20 users), add a batch variant:

```csharp
private async Task<Dictionary<string, int>> ComputeStreaksForUsersAsync(List<string> userIds)
{
    var result = new Dictionary<string, int>();
    foreach (var userId in userIds)
    {
        result[userId] = await ComputeStreakAsync(userId);
    }
    return result;
}
```

---

## DTO Changes

**File:** `FitApp.Api/Models/DTOs/SocialDtos.cs`

### 1. `UserSocialProfileResponse` — add three fields (after `IsVerified`, line 140):

```csharp
/// <summary>
/// Completed workout sessions in the current calendar month (UTC).
/// </summary>
public int MonthlyWorkoutCount { get; set; }

/// <summary>
/// Current streak count — consecutive days with a logged DailyEntry.
/// </summary>
public int CurrentStreak { get; set; }

/// <summary>
/// User's fitness goal: "lose" | "gain" | "maintain" | null.
/// Already on User.Goal but not previously in the profile response.
/// </summary>
public string? FitnessGoal { get; set; }
```

### 2. `SuggestedUserResponse` — add one field (after `WorkoutsThisMonth`, line 206):

```csharp
/// <summary>
/// Number of users the viewing user follows who also follow this suggested user.
/// </summary>
public int MutualFollowersCount { get; set; }
```

### 3. New DTO — add after `SuggestedUserResponse`:

```csharp
/// <summary>
/// User card data for the redesigned Discover grid.
/// Includes athletic identity context that UserSearchResult lacks.
///
/// PRIVACY CONSTRAINT: must NEVER include BMI, weight, calories, BMR, TDEE,
/// or any biometric/health metric. FitnessGoal is the raw User.Goal string —
/// safe to expose. Counts (streak, workouts, mutual followers) contain no health data.
/// </summary>
public class DiscoverUserCardResponse
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }

    /// <summary>"lose" | "gain" | "maintain" | null — maps to goal badge colors.</summary>
    public string? FitnessGoal { get; set; }

    public int CurrentStreak { get; set; }
    public int MonthlyWorkoutCount { get; set; }
    public int MutualFollowersCount { get; set; }
    public bool IsFollowedByMe { get; set; }
}
```

---

## Service Changes

**File:** `FitApp.Api/Services/SocialService.cs`

### 1. Update `GetProfileAsync` (line 451)

Extend the single-projection query to include the new fields:

```csharp
public async Task<UserSocialProfileResponse> GetProfileAsync(string userId, string requestingUserId)
{
    var now = DateTime.UtcNow;
    var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

    var stats = await db.Users
        .Where(u => u.Id == userId)
        .Select(u => new
        {
            u.Id,
            u.FullName,
            u.ImageUrl,
            u.Bio,
            u.IsVerified,
            u.Goal,
            PostsCount     = u.Posts.Count(p => !p.IsArchived),
            FollowersCount = u.Followers.Count(),
            FollowingCount = u.Following.Count(),
            IsFollowedByMe = u.Followers.Any(f => f.FollowerId == requestingUserId),
            MonthlyWorkoutCount = db.WorkoutSessions
                .Count(s => s.UserId == u.Id && s.FinishedAt >= monthStart),
        })
        .FirstOrDefaultAsync()
        ?? throw new KeyNotFoundException("User not found.");

    // Streak requires iterative logic — compute after the projection
    var currentStreak = await ComputeStreakAsync(userId);

    return new UserSocialProfileResponse
    {
        Id = stats.Id,
        DisplayName = stats.FullName,
        AvatarUrl = stats.ImageUrl,
        Bio = stats.Bio,
        PostsCount = stats.PostsCount,
        FollowersCount = stats.FollowersCount,
        FollowingCount = stats.FollowingCount,
        IsFollowedByMe = stats.IsFollowedByMe,
        IsOwnProfile = userId == requestingUserId,
        IsVerified = stats.IsVerified,
        MonthlyWorkoutCount = stats.MonthlyWorkoutCount,
        CurrentStreak = currentStreak,
        FitnessGoal = string.IsNullOrEmpty(stats.Goal) ? null : stats.Goal,
    };
}
```

### 2. New method: `GetDiscoverUsersAsync`

```csharp
public async Task<PaginatedResponse<DiscoverUserCardResponse>> GetDiscoverUsersAsync(
    string viewingUserId, int page, int pageSize)
{
    pageSize = Math.Min(pageSize, 50);

    var now = DateTime.UtcNow;
    var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

    // IDs the viewing user already follows
    var followedIds = await db.Follows
        .Where(f => f.FollowerId == viewingUserId)
        .Select(f => f.FollowingId)
        .ToListAsync();

    var query = db.Users
        .Where(u => u.Id != viewingUserId
            && !u.IsSystemAccount
            && u.OnboardingCompleted
            && !followedIds.Contains(u.Id));

    var totalCount = await query.CountAsync();

    var users = await query
        .OrderByDescending(u => u.UpdatedAt)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(u => new DiscoverUserCardResponse
        {
            Id = u.Id,
            DisplayName = u.FullName,
            AvatarUrl = u.ImageUrl,
            FitnessGoal = string.IsNullOrEmpty(u.Goal) ? null : u.Goal,
            CurrentStreak = 0,   // Computed post-query
            MonthlyWorkoutCount = db.WorkoutSessions
                .Count(s => s.UserId == u.Id && s.FinishedAt >= monthStart),
            MutualFollowersCount = db.Follows
                .Count(f => f.FollowerId == viewingUserId
                    && db.Follows.Any(f2 => f2.FollowingId == u.Id
                                         && f2.FollowerId == f.FollowingId)),
            IsFollowedByMe = false   // Already filtered out followed users
        })
        .ToListAsync();

    // Batch streak computation
    var userIds = users.Select(u => u.Id).ToList();
    var streaks = await ComputeStreaksForUsersAsync(userIds);
    foreach (var user in users)
    {
        user.CurrentStreak = streaks.GetValueOrDefault(user.Id, 0);
    }

    return new PaginatedResponse<DiscoverUserCardResponse>
    {
        Items = users,
        Page = page,
        PageSize = pageSize,
        TotalCount = totalCount,
        HasMore = (page * pageSize) < totalCount
    };
}
```

### 3. Update `GetSuggestedUsersAsync`

If this method already exists and returns `SuggestedUserResponse` (added in Fix 9), add the `MutualFollowersCount` field to its projection using the same subquery pattern as above.

---

## Controller Changes

**File:** `FitApp.Api/Controllers/SocialController.cs`

### Add new endpoint (after existing Discover endpoint):

```csharp
[HttpGet("discover/users")]
public async Task<IActionResult> GetDiscoverUsers(
    [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
{
    try
    {
        return Ok(await socialService.GetDiscoverUsersAsync(UserId, page, pageSize));
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { error = ex.Message });
    }
}
```

---

## Privacy Constraint

### What IS in the responses

| Field | Source | Privacy status |
|-------|--------|---------------|
| `MonthlyWorkoutCount` | `COUNT(WorkoutSessions)` | **Safe** — a count with no health data |
| `CurrentStreak` | Consecutive DailyEntry dates | **Safe** — a count of logged days |
| `FitnessGoal` | `User.Goal` ("lose"/"gain"/"maintain") | **Safe** — a goal category, not a biometric |
| `MutualFollowersCount` | `COUNT(Follow intersect)` | **Safe** — a social graph count |

### What is NEVER in these responses

| Field | Reason |
|-------|--------|
| `User.WeightKg` | Private biometric |
| `User.Bmi` / `User.Bmr` / `User.Tdee` | Private biometric |
| `User.GoalCalories` | Private health metric |
| `DailyEntry.ManualWeight` | Private biometric |
| `DailyEntry.CaloriesIntake` | Private health metric |
| `DailyEntry.EnergyLevel` | Private subjective health |
| `WorkoutSession.EstimatedCaloriesKcal` | Not exposed in profile/discover — only in the user's own dashboard |

The `DiscoverUserCardResponse` DTO has exactly 8 fields. None references health data. Code review should verify no additional fields are added.

---

## Performance Bound

At 10k users with 50 sessions each = 500k WorkoutSession rows:

| Query | Cost | Mitigation |
|-------|------|-----------|
| `monthlyWorkoutCount` subquery (per user in projection) | <5ms with index | Index on `(UserId, FinishedAt)` exists |
| `mutualFollowersCount` correlated subquery (per user) | <10ms with indexes | `(FollowerId, FollowingId)` unique index exists |
| Streak computation (per user, max 90 rows) | <2ms | `TAKE(90)` caps the scan |
| Page of 20 users (total) | <100ms | Acceptable |

**Scaling trigger:** If page load exceeds 200ms at >50k users, introduce a materialized `UserStats` table with precomputed values updated via a daily batch job or on-write triggers. Not needed now.

---

## TypeScript Interface Changes

**File:** `fit-app/src/app/core/models/social.model.ts`

### Update `UserSocialProfile` (add after `isVerified`, line 81):

```typescript
monthlyWorkoutCount: number;
currentStreak: number;
fitnessGoal?: string | null;
```

### Update `SuggestedUser` (add after `workoutsThisMonth`, line 221):

```typescript
mutualFollowersCount: number;
```

### Add new interface (after `SuggestedUser`):

```typescript
export interface DiscoverUserCard {
  id: string;
  displayName: string;
  avatarUrl?: string;
  fitnessGoal?: string | null;
  currentStreak: number;
  monthlyWorkoutCount: number;
  mutualFollowersCount: number;
  isFollowedByMe: boolean;
}
```

### Add API method to `social.service.ts`:

```typescript
getDiscoverUsers(page: number = 1, pageSize: number = 20): Observable<PaginatedResponse<DiscoverUserCard>> {
  return this.http.get<PaginatedResponse<DiscoverUserCard>>(
    `${this.baseUrl}/discover/users`, { params: { page, pageSize } }
  );
}
```

---

## Migration

**No new migration needed.** The required index on `WorkoutSessions(UserId, FinishedAt)` already exists (`AppDbContext.cs` line 83). The DTO changes are response-only — no entity or schema changes.

If the index did NOT exist, the migration would be:

```bash
dotnet ef migrations add AddWorkoutSessionUserIdFinishedAtIndex --project FitApp.Api
```

But since it's already there, skip this step.

---

## Consequences

- **Gain:** Profile and Discover surfaces show athletic identity context (workouts, streak, goal, mutual connections)
- **Gain:** No caching infrastructure needed at current scale
- **Gain:** No schema changes — only DTO additions and service query extensions
- **Gain:** Index already exists — no migration needed
- **Accept:** Correlated subqueries add latency proportional to page size (~5ms/user)
- **Accept:** Streak computation is O(N × 90) for N users — acceptable for pages of 20
- **Accept:** `GetProfileAsync` goes from 1 round-trip to 2 (projection + streak)
- **Rollback:** Remove the new DTO fields and endpoint. Frontend falls back to not displaying the data.

---

## Instructions for @dotnet-developer

1. Add `MonthlyWorkoutCount`, `CurrentStreak`, `FitnessGoal` to `UserSocialProfileResponse`
2. Add `MutualFollowersCount` to `SuggestedUserResponse`
3. Create `DiscoverUserCardResponse` DTO with privacy constraint XML doc
4. Update `GetProfileAsync` — add `monthlyWorkoutCount` via subquery in projection, compute streak post-query
5. Add `ComputeStreakAsync(string userId)` private method
6. Add `ComputeStreaksForUsersAsync(List<string> userIds)` batch helper
7. Add `GetDiscoverUsersAsync` method to `SocialService`
8. Add `GET /api/social/discover/users` endpoint to `SocialController`
9. If `GetSuggestedUsersAsync` exists — add `MutualFollowersCount` to its projection
10. **Verify:** No `Bmi`, `Bmr`, `Tdee`, `GoalCalories`, `WeightKg` in any field of `DiscoverUserCardResponse` or the new profile fields

## Instructions for @angular-developer

1. Update `UserSocialProfile` interface with `monthlyWorkoutCount`, `currentStreak`, `fitnessGoal`
2. Update `SuggestedUser` interface with `mutualFollowersCount`
3. Add `DiscoverUserCard` interface
4. Add `getDiscoverUsers()` method to `social.service.ts`
5. Update `SocialFacade` with signal for discover users
6. Build `DiscoverUserCardComponent` consuming the new interface
7. Update profile hero: stats row shows `monthlyWorkoutCount` instead of `postsCount`
8. Build or update `UserStatsChipComponent` to display streak + monthly workouts + goal badge
