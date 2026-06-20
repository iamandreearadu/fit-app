# ADR: Like.ReactionType Enum for Fitness-Specific Reactions

**ID:** REDESIGN-ADR-2
**Status:** Proposed
**Date:** 2026-06-04
**Author:** @tech-architect
**Consumed by:** @dotnet-developer, @angular-developer
**Blocks:** Sprint 1 — ReactionBarComponent Phase 1 (ITEM-13), Sprint 2 — full 4-type picker
**Supersedes:** `.claude/decisions/redesign-adr-2.md` (draft)

---

## Context

The beSocial redesign introduces a fitness-specific reaction system with four reaction types: heart, fire, strong, goal. The current `Like` entity (`Like.cs:1–13`) is a binary toggle with no reaction type:

```csharp
public class Like
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int PostId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public User User { get; set; } = null!;
    public Post Post { get; set; } = null!;
}
```

The current `ToggleLikeAsync` (`SocialService.cs:261–314`) is a simple add/remove toggle that creates or deletes a `Like` row and adjusts `Post.LikesCount` via `ExecuteUpdateAsync`. The `LikeToggleResponse` (`SocialDtos.cs:108–112`) returns only `IsLiked` and `LikesCount`.

The frontend `PostCard` renders a single heart icon with the count. The API `POST /api/social/posts/{id}/like` (`SocialController.cs:158–163`) takes no request body.

## Decision

**Add a nullable `ReactionType` string column to the `Like` entity.** Use a string column (not a .NET enum) because: (1) adding future reaction types requires no migration, (2) SQLite stores C# enums as opaque integers, (3) the values are validated in application code.

---

## Allowed Values

```csharp
private static readonly HashSet<string> ValidReactionTypes = new(StringComparer.OrdinalIgnoreCase)
{
    "heart", "fire", "strong", "goal"
};
```

| Value | Icon | Use case |
|-------|------|----------|
| `"heart"` | `favorite` | General positive — default reaction |
| `"fire"` | `local_fire_department` | Intense workout, great effort |
| `"strong"` | `fitness_center` | Strength achievement, PR |
| `"goal"` | `gps_fixed` | Milestone, goal achieved |

---

## Entity Change

**File:** `FitApp.Api/Models/Entities/Like.cs`

```csharp
namespace FitApp.Api.Models.Entities;

public class Like
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int PostId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Reaction type: "heart" | "fire" | "strong" | "goal".
    /// Null for legacy likes created before this migration — treated as "heart" by application code.
    /// Validated in SocialService.ToggleLikeAsync — invalid values rejected with 400.
    /// </summary>
    public string? ReactionType { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public Post Post { get; set; } = null!;
}
```

No entity configuration changes in `AppDbContext` — the existing unique index on `(UserId, PostId)` at line 154 remains correct. There is still at most one reaction per user per post.

---

## Migration

```bash
dotnet ef migrations add AddReactionTypeToLike --project FitApp.Api
```

Adds a nullable `TEXT` column `ReactionType` to the `Likes` table. Default: `NULL`. **No data migration needed.** The application layer treats `null` and `"heart"` identically:

```csharp
var effectiveType = like.ReactionType ?? "heart";
```

---

## Backward Compatibility

### Existing likes
All existing `Like` rows have `ReactionType = NULL`. Application code normalizes null to "heart". No visual change for existing data.

### Existing API callers
The updated `POST /api/social/posts/{id}/like` endpoint accepts `[FromBody] LikeToggleRequest? request`. The body is **nullable** — callers sending no body or `{}` get the default "heart" behavior. Existing frontend code works without any change until the reaction picker is wired up.

### PostResponse
Two new nullable fields are added. Existing frontend code that doesn't read them is unaffected — they are simply ignored.

---

## DTO Changes

**File:** `FitApp.Api/Models/DTOs/SocialDtos.cs`

### New request DTO — add after `CreateCommentRequest` (after line 50):

```csharp
/// <summary>
/// Optional request body for POST /api/social/posts/{id}/like.
/// Omitting the body or sending {} defaults to "heart" reaction.
/// </summary>
public class LikeToggleRequest
{
    /// <summary>
    /// Reaction type: "heart" | "fire" | "strong" | "goal".
    /// Defaults to "heart" when null or omitted.
    /// </summary>
    [MaxLength(10)]
    public string? ReactionType { get; set; }
}
```

### Updated `LikeToggleResponse` — replace lines 108–112:

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
    /// Only populated when LikesCount > 0.
    /// </summary>
    public Dictionary<string, int>? ReactionCounts { get; set; }
}
```

### `PostResponse` — add two fields (after `IsLikedByMe`, line 63):

```csharp
/// <summary>
/// The authenticated user's reaction type on this post. Null if not reacted.
/// </summary>
public string? MyReactionType { get; set; }

/// <summary>
/// Aggregated counts per reaction type. Null when LikesCount == 0.
/// </summary>
public Dictionary<string, int>? ReactionCounts { get; set; }
```

---

## Service Changes

**File:** `FitApp.Api/Services/SocialService.cs`

### 1. Add validation constant (at class level):

```csharp
private static readonly HashSet<string> ValidReactionTypes = new(StringComparer.OrdinalIgnoreCase)
{
    "heart", "fire", "strong", "goal"
};
```

### 2. Refactor `ToggleLikeAsync` — replace lines 261–314:

Three-case toggle logic:

```csharp
public async Task<LikeToggleResponse> ToggleLikeAsync(int postId, string userId, LikeToggleRequest? request)
{
    var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == postId);
    if (post is null) throw new KeyNotFoundException("Post not found.");
    if (post.UserId == userId)
        throw new InvalidOperationException("You cannot like your own post.");

    var reactionType = request?.ReactionType?.ToLowerInvariant() ?? "heart";
    if (!ValidReactionTypes.Contains(reactionType))
        throw new InvalidOperationException($"Invalid reaction type: {reactionType}. Allowed: heart, fire, strong, goal.");

    var existing = await db.Likes
        .FirstOrDefaultAsync(l => l.UserId == userId && l.PostId == postId);

    var effectiveExisting = existing?.ReactionType ?? "heart";
    bool isLiked;
    string? activeReaction;

    var actor = await db.Users.FindAsync(userId);

    await using var tx = await db.Database.BeginTransactionAsync();
    try
    {
        if (existing is null)
        {
            // Case 1: No existing reaction → create new
            db.Likes.Add(new Like { UserId = userId, PostId = postId, ReactionType = reactionType });
            await db.SaveChangesAsync();
            await db.Posts.Where(p => p.Id == postId)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.LikesCount, p => p.LikesCount + 1));
            isLiked = true;
            activeReaction = reactionType;
        }
        else if (effectiveExisting == reactionType)
        {
            // Case 2: Same reaction type → toggle off (remove)
            db.Likes.Remove(existing);
            await db.SaveChangesAsync();
            await db.Posts.Where(p => p.Id == postId)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.LikesCount,
                    p => p.LikesCount > 0 ? p.LikesCount - 1 : 0));
            isLiked = false;
            activeReaction = null;
        }
        else
        {
            // Case 3: Different reaction type → change reaction (no count change)
            existing.ReactionType = reactionType;
            await db.SaveChangesAsync();
            isLiked = true;
            activeReaction = reactionType;
        }

        await tx.CommitAsync();
    }
    catch
    {
        await tx.RollbackAsync();
        throw;
    }

    var updatedCount = await db.Posts.Where(p => p.Id == postId)
        .Select(p => p.LikesCount).FirstAsync();

    // Notification only on new reaction (Case 1)
    if (isLiked && existing is null)
    {
        await notifications.CreateAndPushAsync(
            post.UserId,
            userId,
            NotificationType.Like,
            postId,
            $"{actor?.FullName ?? "Someone"} reacted to your post");
    }

    return new LikeToggleResponse
    {
        IsLiked = isLiked,
        LikesCount = updatedCount,
        MyReactionType = activeReaction,
        ReactionCounts = await GetReactionCountsAsync(postId)
    };
}
```

### 3. Add helper method:

```csharp
private async Task<Dictionary<string, int>?> GetReactionCountsAsync(int postId)
{
    var counts = await db.Likes
        .Where(l => l.PostId == postId)
        .GroupBy(l => l.ReactionType ?? "heart")
        .Select(g => new { Type = g.Key, Count = g.Count() })
        .ToDictionaryAsync(x => x.Type, x => x.Count);

    return counts.Count > 0 ? counts : null;
}
```

### 4. Update `MapToPostResponse` (line 645)

The method currently receives `HashSet<int> likedPostIds` (line 648). To populate `MyReactionType`, the caller needs to provide the user's reaction type per post. Two approaches:

**Approach A (recommended — single batch query):** Replace `likedPostIds` with a dictionary:

```csharp
// In feed/profile/discover query methods, replace:
//   var likedPostIds = await db.Likes.Where(l => l.UserId == userId && ...).Select(l => l.PostId).ToHashSetAsync();
// With:
var userReactions = await db.Likes
    .Where(l => l.UserId == requestingUserId && postIds.Contains(l.PostId))
    .ToDictionaryAsync(l => l.PostId, l => l.ReactionType ?? "heart");
```

Then in `MapToPostResponse`:

```csharp
IsLikedByMe = userReactions.ContainsKey(post.Id),
MyReactionType = userReactions.GetValueOrDefault(post.Id),
```

**Approach B (defer `ReactionCounts` for feeds):** Populate `ReactionCounts` only on single-post endpoints (`GetPostAsync`) to avoid N per-post GROUP BY queries on feed pages. The `PostCard` component shows total `likesCount` in the feed; the reaction breakdown appears on hover or in post detail.

**Recommended:** Use Approach A for `MyReactionType` (always populate — one batch query, no perf impact). Use Approach B for `ReactionCounts` (only on single-post detail — avoid N queries in feed).

---

## Controller Change

**File:** `FitApp.Api/Controllers/SocialController.cs`

Replace lines 158–163:

```csharp
[HttpPost("posts/{id:int}/like")]
public async Task<IActionResult> ToggleLike(int id, [FromBody] LikeToggleRequest? request)
{
    try
    {
        return Ok(await socialService.ToggleLikeAsync(id, UserId, request));
    }
    catch (KeyNotFoundException ex)   { return NotFound(new { error = ex.Message }); }
    catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
}
```

The `[FromBody] LikeToggleRequest? request` is nullable — sending `POST /api/social/posts/{id}/like` with no body or `{}` defaults to "heart" reaction.

---

## TypeScript Interface Changes

**File:** `fit-app/src/app/core/models/social.model.ts`

### Update `LikeToggleResponse` (replace lines 84–87):

```typescript
export interface LikeToggleResponse {
  isLiked: boolean;
  likesCount: number;
  myReactionType?: string | null;
  reactionCounts?: Record<string, number> | null;
}
```

### Update `Post` interface — add fields (after `isLikedByMe`, line 35):

```typescript
myReactionType?: string | null;
reactionCounts?: Record<string, number> | null;
```

### Update `social.service.ts` — `toggleLike` method:

```typescript
toggleLike(postId: number, reactionType?: string): Observable<LikeToggleResponse> {
  const body = reactionType ? { reactionType } : {};
  return this.http.post<LikeToggleResponse>(
    `${this.baseUrl}/posts/${postId}/like`, body
  );
}
```

---

## Performance Consideration

The `GetReactionCountsAsync` query runs a GROUP BY per post. For feed pages (10 posts), this would be 10 additional queries. Per the recommendation above, `ReactionCounts` should be populated only on single-post detail views initially. If needed for feeds later, batch the counts:

```csharp
// Batch: one query for all posts in the page
var postIds = posts.Select(p => p.Id).ToList();
var allReactions = await db.Likes
    .Where(l => postIds.Contains(l.PostId))
    .GroupBy(l => new { l.PostId, Type = l.ReactionType ?? "heart" })
    .Select(g => new { g.Key.PostId, g.Key.Type, Count = g.Count() })
    .ToListAsync();

var reactionsByPost = allReactions
    .GroupBy(r => r.PostId)
    .ToDictionary(g => g.Key, g => g.ToDictionary(r => r.Type, r => r.Count));
```

---

## Notification Text Update

The notification message changes from `"liked your post"` to `"reacted to your post"`. This is a string-only change in `ToggleLikeAsync`. The notification type remains `NotificationType.Like`.

---

## Consequences

- **Gain:** Rich reaction system with minimal schema change (one nullable column)
- **Gain:** Full backward compatibility — existing likes are "heart" reactions
- **Gain:** No data migration required
- **Gain:** String-based reaction type allows adding types without migrations
- **Accept:** Per-post reaction count query adds ~1ms per post when populated
- **Accept:** Validation is in application layer, not database constraint
- **Rollback:** Drop the column via reverse migration. All reactions revert to binary likes. Frontend `reactionCounts` is null, falls back to `likesCount` display.

---

## Instructions for @dotnet-developer

1. Add `ReactionType` nullable string property to `Like.cs` with XML doc
2. Create migration: `dotnet ef migrations add AddReactionTypeToLike --project FitApp.Api`
3. Add `LikeToggleRequest` DTO to `SocialDtos.cs`
4. Update `LikeToggleResponse` with `MyReactionType` and `ReactionCounts` fields
5. Add `MyReactionType` and `ReactionCounts` fields to `PostResponse`
6. Add `ValidReactionTypes` HashSet to `SocialService`
7. Refactor `ToggleLikeAsync` — accept `LikeToggleRequest?`, implement 3-case logic (create/remove/change)
8. Add `GetReactionCountsAsync` private helper
9. Update `MapToPostResponse` — replace `likedPostIds` HashSet with a dictionary of `postId → reactionType` across all callers (feed, discover, profile, single post)
10. Update controller `ToggleLike` — accept `[FromBody] LikeToggleRequest? request`, pass to service
11. Validate reaction type — reject unknown values with `InvalidOperationException` (→ 400)
12. Update notification text from "liked" to "reacted to"

## Instructions for @angular-developer

1. Update `LikeToggleResponse` interface in `social.model.ts`
2. Add `myReactionType` and `reactionCounts` fields to `Post` interface
3. Update `social.service.ts` `toggleLike` to accept optional `reactionType` and send in body
4. Build `ReactionBarComponent` — Phase 1: single-tap heart (no picker); Phase 2: long-press 4-type picker
5. Implement optimistic update in `SocialFacade.toggleLike`: apply reaction locally, revert on API error
6. Single tap defaults to "heart"; long-press (300ms) opens picker popover (Phase 2)
