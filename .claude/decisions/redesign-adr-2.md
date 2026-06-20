# ADR: Like.ReactionType Enum

**ID:** REDESIGN-ADR-2 (RISK-2)
**Status:** Proposed
**Date:** 2026-06-04
**Author:** @tech-architect
**Consumed by:** @dotnet-developer, @angular-developer

---

## Context

The beSocial redesign introduces a fitness-specific reaction system with four reaction types: heart, fire, strong, goal. The current `Like` entity is a binary toggle — no reaction type field exists. The frontend needs to display per-reaction-type counts and the user's active reaction type.

## Decision

**Add a nullable `ReactionType` string column to the `Like` entity.** Use a string column (not a .NET enum mapped to int) because: (1) adding future reaction types does not require a migration, (2) SQLite stores enums as integers which are opaque in manual queries, (3) the values are a closed set validated in application code.

### Entity Change

```csharp
// FitApp.Api/Models/Entities/Like.cs
public class Like
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int PostId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Reaction type: "heart" | "fire" | "strong" | "goal".
    /// Null or "heart" for legacy likes (migration default).
    /// Validated in SocialService — invalid values rejected with 400.
    /// </summary>
    public string? ReactionType { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public Post Post { get; set; } = null!;
}
```

### Migration

```
dotnet ef migrations add AddReactionTypeToLike
```

The migration adds a nullable `TEXT` column `ReactionType` to the `Likes` table. Default value is `NULL`. Existing likes are treated as "heart" reactions by the application layer (not by the database).

**No data migration needed.** The application code treats `null` and `"heart"` identically:

```csharp
// In SocialService when computing reaction counts:
var effectiveType = like.ReactionType ?? "heart";
```

### Allowed Values

```csharp
// In SocialService — validation constant
private static readonly HashSet<string> ValidReactionTypes = new(StringComparer.OrdinalIgnoreCase)
{
    "heart", "fire", "strong", "goal"
};
```

### Updated Controller Endpoint

The existing `POST /api/social/posts/{id}/like` endpoint currently takes no request body. It toggles the like on/off. The redesign changes the behavior:

```csharp
// New request DTO
public class LikeToggleRequest
{
    /// <summary>
    /// Optional. Reaction type: "heart" | "fire" | "strong" | "goal".
    /// Defaults to "heart" when null or omitted.
    /// </summary>
    [MaxLength(10)]
    public string? ReactionType { get; set; }
}
```

**Behavior change for ToggleLike:**

1. If no existing Like for (UserId, PostId): create one with the specified reaction type (default: "heart")
2. If an existing Like exists AND `reactionType` matches (or both resolve to "heart"): remove the Like (toggle off)
3. If an existing Like exists AND `reactionType` differs: update the existing Like's ReactionType (change reaction, not toggle off)

```csharp
// SocialService.ToggleLikeAsync updated logic
public async Task<LikeToggleResponse> ToggleLikeAsync(int postId, string userId, LikeToggleRequest? request)
{
    var reactionType = request?.ReactionType?.ToLowerInvariant() ?? "heart";
    if (!ValidReactionTypes.Contains(reactionType))
        throw new InvalidOperationException($"Invalid reaction type: {reactionType}");
    
    var existingLike = await db.Likes
        .FirstOrDefaultAsync(l => l.PostId == postId && l.UserId == userId);
    
    var effectiveExisting = existingLike?.ReactionType ?? "heart";
    
    if (existingLike == null)
    {
        // Create new reaction
        db.Likes.Add(new Like { UserId = userId, PostId = postId, ReactionType = reactionType });
        await db.Posts.Where(p => p.Id == postId)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.LikesCount, p => p.LikesCount + 1));
        // ... notification logic
    }
    else if (effectiveExisting == reactionType)
    {
        // Same reaction type — toggle off (remove)
        db.Likes.Remove(existingLike);
        await db.Posts.Where(p => p.Id == postId)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.LikesCount, p => p.LikesCount - 1));
    }
    else
    {
        // Different reaction type — change reaction (no count change)
        existingLike.ReactionType = reactionType;
    }
    
    await db.SaveChangesAsync();
    
    var post = await db.Posts.FindAsync(postId);
    return new LikeToggleResponse
    {
        IsLiked = existingLike == null || effectiveExisting != reactionType,
        LikesCount = post?.LikesCount ?? 0,
        MyReactionType = (existingLike == null || effectiveExisting != reactionType) ? reactionType : null,
        ReactionCounts = await GetReactionCountsAsync(postId)
    };
}
```

### Updated LikeToggleResponse

```csharp
public class LikeToggleResponse
{
    public bool IsLiked { get; set; }
    public int LikesCount { get; set; }
    
    /// <summary>
    /// The user's current reaction type after this toggle. Null if the like was removed.
    /// </summary>
    public string? MyReactionType { get; set; }
    
    /// <summary>
    /// Aggregated counts per reaction type for this post.
    /// E.g., { "heart": 5, "fire": 3, "strong": 1 }
    /// </summary>
    public Dictionary<string, int>? ReactionCounts { get; set; }
}
```

### Updated PostResponse

Add two fields to `PostResponse`:

```csharp
/// <summary>
/// The authenticated user's reaction type on this post. Null if not reacted.
/// "heart" | "fire" | "strong" | "goal"
/// </summary>
public string? MyReactionType { get; set; }

/// <summary>
/// Aggregated counts per reaction type. Only populated when LikesCount > 0.
/// E.g., { "heart": 5, "fire": 3 }
/// </summary>
public Dictionary<string, int>? ReactionCounts { get; set; }
```

The `ReactionCounts` are computed at query time via a subquery:

```csharp
private async Task<Dictionary<string, int>> GetReactionCountsAsync(int postId)
{
    return await db.Likes
        .Where(l => l.PostId == postId)
        .GroupBy(l => l.ReactionType ?? "heart")
        .Select(g => new { Type = g.Key, Count = g.Count() })
        .ToDictionaryAsync(x => x.Type, x => x.Count);
}
```

### Performance Note

The `ReactionCounts` subquery runs per-post in feed queries. For a page of 10 posts, this is 10 additional GROUP BY queries. At NovaFit's current scale (<10k users), this is acceptable. If performance degrades, batch the counts:

```csharp
// Batch approach for feed (future optimization)
var postIds = posts.Select(p => p.Id).ToList();
var allReactions = await db.Likes
    .Where(l => postIds.Contains(l.PostId))
    .GroupBy(l => new { l.PostId, Type = l.ReactionType ?? "heart" })
    .Select(g => new { g.Key.PostId, g.Key.Type, Count = g.Count() })
    .ToListAsync();
```

### TypeScript Interface Changes

```typescript
// social.model.ts — update LikeToggleResponse
export interface LikeToggleResponse {
  isLiked: boolean;
  likesCount: number;
  myReactionType?: string | null;
  reactionCounts?: Record<string, number> | null;
}

// social.model.ts — update Post interface, add fields:
// myReactionType?: string | null;
// reactionCounts?: Record<string, number> | null;
```

### Controller Change

```csharp
// SocialController.cs — update ToggleLike signature
[HttpPost("posts/{id:int}/like")]
public async Task<IActionResult> ToggleLike(int id, [FromBody] LikeToggleRequest? request)
{
    try
    {
        return Ok(await socialService.ToggleLikeAsync(id, UserId, request));
    }
    // ... existing error handling
}
```

The request body is nullable — sending `POST /api/social/posts/{id}/like` with no body or `{}` defaults to "heart" reaction, preserving full backward compatibility with the existing frontend code.

## Consequences

- **Gain:** Rich reaction system with minimal schema change
- **Gain:** Full backward compatibility — existing likes treated as "heart"
- **Gain:** No data migration required
- **Accept:** Per-post reaction count subquery adds ~1ms per post at query time
- **Accept:** String validation in application layer (not database constraint)
- **Rollback:** Drop the column. All reactions revert to binary likes. Frontend `reactionCounts` is null, falls back to `likesCount` display.

## Instructions for @dotnet-developer

1. Add `ReactionType` nullable string property to `Like.cs`
2. Create migration: `dotnet ef migrations add AddReactionTypeToLike`
3. Add `LikeToggleRequest` DTO to `SocialDtos.cs`
4. Update `LikeToggleResponse` with `MyReactionType` and `ReactionCounts`
5. Add `MyReactionType` and `ReactionCounts` fields to `PostResponse`
6. Refactor `ToggleLikeAsync` in `SocialService` per the 3-case logic above
7. Add `GetReactionCountsAsync` helper method
8. Update post-to-response mapping to include `MyReactionType` (from user's Like row) and `ReactionCounts`
9. Update controller `ToggleLike` signature to accept `[FromBody] LikeToggleRequest? request`
10. Add validation for reaction type values (reject unknown types with 400)

## Instructions for @angular-developer

1. Update `LikeToggleResponse` and `Post` interfaces in `social.model.ts`
2. Update `social.service.ts` `toggleLike` method to accept optional `reactionType` parameter and send it in request body
3. Build `ReactionBarComponent` that reads `post.myReactionType` and `post.reactionCounts`
4. Implement optimistic update: apply reaction locally, revert on API error
5. Single tap defaults to "heart"; long-press opens picker popover
