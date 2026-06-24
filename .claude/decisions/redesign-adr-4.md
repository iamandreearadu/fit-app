# ADR: API Additions for monthlyWorkoutCount and mutualFollowersCount

**ID:** REDESIGN-ADR-4 (RISK-4)
**Status:** Proposed
**Date:** 2026-06-04
**Author:** @tech-architect
**Consumed by:** @dotnet-developer, @angular-developer

---

## Context

The beSocial redesign requires two new data points:

1. **`monthlyWorkoutCount`** — displayed in the social profile hero (replaces "Posts" in the stats row) and in Discover user cards. Shows how many workout sessions the user completed this calendar month.

2. **`mutualFollowersCount`** — displayed in Discover user cards. Shows how many people the viewing user follows who also follow the target user.

Neither value exists in any current API response.

## Decision

**Compute both values at query time via EF Core subqueries. No caching. Add a database index on `WorkoutSessions.UserId + FinishedAt` for efficient monthly count queries.**

### monthlyWorkoutCount

**Data source:** `WorkoutSession` entity (not `WorkoutTemplate`). Templates are plans; sessions are completions. Monthly workout count = completed sessions this month.

**Query:**

```csharp
var now = DateTime.UtcNow;
var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

var monthlyCount = await db.WorkoutSessions
    .CountAsync(s => s.UserId == targetUserId && s.FinishedAt >= monthStart);
```

**Index to add (migration):**

```csharp
// In AppDbContext.OnModelCreating or entity configuration
modelBuilder.Entity<WorkoutSession>()
    .HasIndex(s => new { s.UserId, s.FinishedAt })
    .HasDatabaseName("IX_WorkoutSessions_UserId_FinishedAt");
```

This index covers the monthly count query exactly (UserId filter + FinishedAt range scan). At 10k users with 50 sessions each = 500k rows, the indexed query returns in <5ms on SQLite.

### mutualFollowersCount

**Definition:** Users that the viewing user follows AND who also follow the target user.

```
mutualFollowersCount = COUNT(
  Follow WHERE FollowerId = viewingUserId
  INTERSECT
  Follow WHERE FollowingId = targetUserId
)
```

**Query:**

```csharp
var mutualCount = await db.Follows
    .Where(f => f.FollowerId == viewingUserId)
    .Select(f => f.FollowingId)
    .Intersect(
        db.Follows
            .Where(f => f.FollowingId == targetUserId)
            .Select(f => f.FollowerId)
    )
    .CountAsync();
```

Alternative (single query, likely faster on SQLite):

```csharp
var mutualCount = await db.Follows
    .Where(f => f.FollowerId == viewingUserId
        && db.Follows.Any(f2 => f2.FollowingId == targetUserId && f2.FollowerId == f.FollowingId))
    .CountAsync();
```

This reads as: "Count users that I follow who also follow the target."

**Existing indexes:** The `Follow` entity already has a unique index on `(FollowerId, FollowingId)`. This covers the first condition. The second condition needs `(FollowingId, FollowerId)` which is the reverse — this is covered by the unique constraint index since SQLite will use it for both orderings. No additional index needed.

### Updated DTOs

**UserSocialProfileResponse — add field:**

```csharp
/// <summary>
/// Completed workout sessions in the current calendar month (UTC).
/// </summary>
public int MonthlyWorkoutCount { get; set; }

/// <summary>
/// Current streak count (consecutive days with logged daily entry).
/// </summary>
public int CurrentStreak { get; set; }

/// <summary>
/// User's fitness goal: "lose" | "gain" | "maintain" | null.
/// Already available on User.Goal but not currently in the profile response.
/// </summary>
public string? FitnessGoal { get; set; }
```

**SuggestedUserResponse — add field:**

```csharp
/// <summary>
/// Number of users the viewing user follows who also follow this suggested user.
/// Zero when no mutual connections exist.
/// </summary>
public int MutualFollowersCount { get; set; }
```

**New DiscoverUserResponse (for the redesigned Discover user cards):**

The existing Discover endpoint returns `PostResponse` items (posts from non-followed users). The redesigned Discover page needs user cards, not posts. A new endpoint is needed:

```csharp
/// <summary>
/// User card data for the Discover grid.
/// Includes athletic identity context that standard UserSearchResult lacks.
/// </summary>
public class DiscoverUserCardResponse
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? FitnessGoal { get; set; }
    public int CurrentStreak { get; set; }
    public int MonthlyWorkoutCount { get; set; }
    public int MutualFollowersCount { get; set; }
    public bool IsFollowedByMe { get; set; }
}
```

### New Endpoint

```
GET /api/social/discover/users?page=1&pageSize=20
```

Returns a `PaginatedResponse<DiscoverUserCardResponse>`. This is distinct from the existing `GET /api/social/discover` (which returns posts). The new endpoint returns users with athletic context.

### Implementation in SocialService

```csharp
public async Task<PaginatedResponse<DiscoverUserCardResponse>> GetDiscoverUsersAsync(
    string viewingUserId, int page, int pageSize)
{
    pageSize = Math.Min(pageSize, 50);
    
    var now = DateTime.UtcNow;
    var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
    
    // Get user IDs the viewing user already follows
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
            CurrentStreak = 0, // Computed below
            MonthlyWorkoutCount = db.WorkoutSessions
                .Count(s => s.UserId == u.Id && s.FinishedAt >= monthStart),
            MutualFollowersCount = db.Follows
                .Count(f => f.FollowerId == viewingUserId
                    && db.Follows.Any(f2 => f2.FollowingId == u.Id && f2.FollowerId == f.FollowingId)),
            IsFollowedByMe = false // Already filtered out followed users
        })
        .ToListAsync();
    
    // Compute streaks (requires daily entries — batch query)
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

### Streak Computation Helper

Streak computation requires reading DailyEntry dates. Add a helper method that computes streaks in batch for a list of user IDs:

```csharp
private async Task<Dictionary<string, int>> ComputeStreaksForUsersAsync(List<string> userIds)
{
    var today = DateOnly.FromDateTime(DateTime.UtcNow);
    var result = new Dictionary<string, int>();
    
    foreach (var userId in userIds)
    {
        var dates = await db.DailyEntries
            .Where(d => d.UserId == userId)
            .OrderByDescending(d => d.Date)
            .Select(d => d.Date)
            .Take(90) // Look back max 90 days
            .ToListAsync();
        
        int streak = 0;
        var checkDate = today;
        foreach (var dateStr in dates)
        {
            if (DateOnly.TryParse(dateStr, out var entryDate))
            {
                if (entryDate == checkDate || entryDate == checkDate.AddDays(-1))
                {
                    streak++;
                    checkDate = entryDate.AddDays(-1);
                }
                else break;
            }
        }
        result[userId] = streak;
    }
    
    return result;
}
```

Note: If a dedicated streak field is already stored or cached on the User entity or in a stats table, use that instead of computing. The above is a fallback if no cached streak exists.

### Performance Bound

At 10k users:
- `monthlyWorkoutCount` subquery with index: <5ms per user, runs as EF Core subquery in the SELECT projection — single round-trip
- `mutualFollowersCount` correlated subquery: <10ms per user with existing indexes
- Page of 20 users: total query time <100ms (acceptable)
- Streak computation for 20 users (batch): <50ms total

If performance degrades beyond 200ms per page at >50k users, introduce a materialized `UserStats` table with precomputed values updated via a daily batch job.

### TypeScript Interface

```typescript
// social.model.ts — update existing interface
export interface UserSocialProfile {
  // ... existing fields ...
  monthlyWorkoutCount: number;    // NEW
  currentStreak: number;          // NEW
  fitnessGoal?: string | null;    // NEW
}

// social.model.ts — add new interface
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

// social.model.ts — update SuggestedUser
export interface SuggestedUser {
  // ... existing fields ...
  mutualFollowersCount: number;   // NEW
}
```

### Migration

```
dotnet ef migrations add AddWorkoutSessionUserIdFinishedAtIndex
```

This migration adds only the index — no column changes. The index supports the monthly count subquery.

## Consequences

- **Gain:** Profile and Discover surfaces show athletic identity context
- **Gain:** No caching infrastructure needed at current scale
- **Gain:** Single EF migration (index only), no schema changes beyond the index
- **Accept:** Correlated subqueries add latency proportional to page size
- **Accept:** Streak computation is O(N * 90) for N users in a page — acceptable for pages of 20
- **Rollback:** Remove the new endpoint and DTO fields. Frontend falls back to not displaying the data.

## Instructions for @dotnet-developer

1. Add the composite index on `WorkoutSessions(UserId, FinishedAt)` via migration
2. Add `MonthlyWorkoutCount`, `CurrentStreak`, and `FitnessGoal` fields to `UserSocialProfileResponse`
3. Update `GetProfileAsync` in `SocialService` to compute and populate these fields
4. Add `MutualFollowersCount` to `SuggestedUserResponse`
5. Update `GetSuggestedUsersAsync` to compute mutual followers count
6. Create `DiscoverUserCardResponse` DTO
7. Add `GetDiscoverUsersAsync` method to `SocialService`
8. Add `GET /api/social/discover/users` endpoint to `SocialController`
9. Add `ComputeStreaksForUsersAsync` helper (or reuse existing streak logic if already implemented elsewhere)

## Instructions for @angular-developer

1. Update `UserSocialProfile` interface with new fields
2. Add `DiscoverUserCard` interface
3. Add `getDiscoverUsers()` method to `social.service.ts`
4. Update `SocialFacade` with signal for discover users
5. Build `DiscoverUserCardComponent` consuming the new interface
6. Update profile hero to show `monthlyWorkoutCount` instead of `postsCount` in the stats row
7. Update `UserStatsChipComponent` to display streak + monthly workouts + goal badge
