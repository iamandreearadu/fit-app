# API Contract: Fix 9 — beSocial Cold-Start Discover Seeding & Hybrid Feed

**Author:** @tech-architect  
**Date:** 2026-06-03  
**Status:** COMPLETE  
**ADR:** `.claude/decisions/fix-9-discover-seeding.md`  
**Sprint:** 4  
**Dependencies:** Fix 7 (guided empty state — already implemented)

---

## Overview

Eliminates the beSocial ghost town problem by seeding a "NovaFit Official" verified
account with high-quality fitness content and hybrid-populating the feed during cold start.
**No new endpoints** — two existing endpoints gain modified behavior, and three existing
DTOs gain new fields.

**Key changes:**
1. `GET /api/social/feed` — hybrid-populates with NovaFit Official seed content when user
   follows < 3 people
2. `GET /api/social/discover/suggested` — excludes system accounts from suggestions
3. `UserSummary` DTO — gains `isVerified` for verification badge
4. `PostResponse` DTO — gains `isSeedContent` for rendering distinction
5. `UserSocialProfileResponse` DTO — gains `isVerified` for profile badge
6. `User` entity — gains `IsVerified` and `IsSystemAccount` columns (migration required)
7. New seeder: `NovaFitOfficialSeeder` — creates the official account + 10 posts + 3 articles

---

## Endpoints

| Method | Route | Auth | Change | Status |
|--------|-------|------|--------|--------|
| GET | `/api/social/feed` | Bearer | Cold-start hybrid population | **Modified** |
| GET | `/api/social/discover/suggested` | Bearer | Exclude system accounts | **Modified** |
| GET | `/api/social/discover` | Bearer | No code change (organic content from Official) | Unchanged |
| GET | `/api/social/profile/{userId}` | Bearer | Returns `isVerified` on profile | **Modified** |

---

## Endpoint 1 — GET /api/social/feed (modified)

### Change Summary

When the authenticated user follows fewer than 3 people, the feed response is
hybrid-populated with "seed content" from the NovaFit Official account. Seed posts are
marked with `isSeedContent: true` in the response DTO. All other feed behavior (pagination,
likes, following status) is unchanged.

### Authentication

`Authorization: Bearer <token>` — required.

### Request — unchanged

```
GET /api/social/feed?page=1&pageSize=10
```

| Param | Type | Default | Constraints |
|-------|------|---------|-------------|
| `page` | int | 1 | ≥ 1 |
| `pageSize` | int | 10 | 1–50 (clamped) |

### Server-Side Behavior

**Current logic (unchanged for users following ≥ 3 people):**
1. Get `followingIds` for the user
2. Query posts from `followingIds + userId` (own posts), ordered by `CreatedAt` desc
3. Paginate, map likes/following status, return `PaginatedResponse<PostResponse>`

**New cold-start logic (when `followingIds.Count < 3`):**

```
1. Get followingIds for the user
2. If followingIds.Count >= 3 → standard feed logic (unchanged)
3. If followingIds.Count < 3 → cold-start mode:
   a. Query real feed posts (from followed users + own posts) — existing logic
   b. Count how many real posts fill the current page
   c. If page has remaining slots (realCount < pageSize):
      - Query NovaFit Official's non-archived posts, ordered by CreatedAt desc
      - Exclude Official posts that are already in the real feed (if user follows Official)
      - Take enough to fill remaining page slots
      - Map each to PostResponse with IsSeedContent = true
      - Append to the items list after real posts
   d. TotalCount = count of real posts only (not including seed posts)
   e. HasMore = based on real post count only
```

**Why TotalCount excludes seed posts:** This prevents the infinite-scroll observer from
endlessly fetching pages when the user has 2 real posts and 10 seed posts. Page 1 shows
2 real + 8 seed. Page 2 would have 0 real posts and `HasMore = false`, so scrolling stops.

### Implementation Detail for `GetFeedAsync`

```csharp
public async Task<PaginatedResponse<PostResponse>> GetFeedAsync(string userId, int page, int pageSize)
{
    pageSize = Math.Min(pageSize, 50);
    var followingIds = await db.Follows
        .Where(f => f.FollowerId == userId)
        .Select(f => f.FollowingId)
        .ToListAsync();

    var allowedUserIds = followingIds.Append(userId).ToList();

    var query = db.Posts
        .AsNoTracking()
        .Include(p => p.User)
        .Include(p => p.LinkedWorkout)
        .Include(p => p.LinkedMeal)
        .Include(p => p.LinkedDailyEntry)
        .Include(p => p.Article)
        .AsSplitQuery()
        .Where(p => allowedUserIds.Contains(p.UserId) && !p.IsArchived)
        .OrderByDescending(p => p.CreatedAt);

    var total = await query.CountAsync();
    var posts = await query
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();

    var likedPostIds = await db.Likes
        .Where(l => l.UserId == userId && posts.Select(p => p.Id).Contains(l.PostId))
        .Select(l => l.PostId)
        .ToHashSetAsync();

    var items = posts
        .Select(p => MapToPostResponse(p, userId, likedPostIds, followingIds.ToHashSet()))
        .ToList();

    // ── Cold-start seed injection ────────────────────────────────────────────
    if (followingIds.Count < 3 && items.Count < pageSize)
    {
        var realPostIds = posts.Select(p => p.Id).ToHashSet();
        var seedNeeded = pageSize - items.Count;

        var seedPosts = await db.Posts
            .AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.Article)
            .Where(p => p.User.IsSystemAccount
                        && !p.IsArchived
                        && !realPostIds.Contains(p.Id))
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * seedNeeded)  // rough pagination for seed content
            .Take(seedNeeded)
            .ToListAsync();

        // Collect like status for seed posts
        var seedPostIds = seedPosts.Select(p => p.Id).ToList();
        var seedLikedIds = await db.Likes
            .Where(l => l.UserId == userId && seedPostIds.Contains(l.PostId))
            .Select(l => l.PostId)
            .ToHashSetAsync();

        foreach (var sp in seedPosts)
        {
            var mapped = MapToPostResponse(sp, userId, seedLikedIds, followingIds.ToHashSet());
            mapped.IsSeedContent = true;
            items.Add(mapped);
        }
    }

    return new PaginatedResponse<PostResponse>
    {
        Items = items,
        Page = page,
        PageSize = pageSize,
        TotalCount = total,          // real posts only — NOT including seed
        HasMore = page * pageSize < total
    };
}
```

### Response — 200 OK — `PaginatedResponse<PostResponse>` (updated PostResponse shape)

```json
{
  "items": [
    {
      "id": 42,
      "author": {
        "id": "user-123",
        "displayName": "Jane Doe",
        "avatarUrl": "https://...",
        "isVerified": false
      },
      "content": "Just finished leg day! 🦵",
      "imageUrl": "https://...",
      "linkedContent": null,
      "likesCount": 5,
      "commentsCount": 2,
      "isLikedByMe": false,
      "isFollowingAuthor": true,
      "isOwnPost": false,
      "isArchived": false,
      "createdAt": "2026-06-02T14:30:00Z",
      "isSeedContent": false,
      "articleId": null,
      "articleTitle": null,
      "articleCategory": null,
      "articleCaption": null,
      "articleDescription": null,
      "articleImage": null
    },
    {
      "id": 7,
      "author": {
        "id": "novafit-official-001",
        "displayName": "NovaFit Official",
        "avatarUrl": "https://...",
        "isVerified": true
      },
      "content": "💡 Tip: Progressive overload doesn't mean adding weight every session. You can also overload by adding reps, adding sets, or reducing rest time. Variety keeps your muscles adapting.",
      "imageUrl": "https://...",
      "likesCount": 0,
      "commentsCount": 0,
      "isLikedByMe": false,
      "isFollowingAuthor": false,
      "isOwnPost": false,
      "isArchived": false,
      "createdAt": "2026-05-28T10:00:00Z",
      "isSeedContent": true,
      "articleId": null,
      "articleTitle": null,
      "articleCategory": null,
      "articleCaption": null,
      "articleDescription": null,
      "articleImage": null
    }
  ],
  "page": 1,
  "pageSize": 10,
  "totalCount": 2,
  "hasMore": false
}
```

### Error Responses — unchanged

| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid JWT |
| 500 | Internal error |

---

## Endpoint 2 — GET /api/social/discover/suggested (modified)

### Change Summary

Exclude system accounts from the candidate pool. NovaFit Official is a system-managed
account, not a real person — it should not appear alongside real users in "Suggested for
You."

### Authentication

`Authorization: Bearer <token>` — required.

### Request — unchanged

```
GET /api/social/discover/suggested?limit=5
```

| Param | Type | Default | Constraints |
|-------|------|---------|-------------|
| `limit` | int | 5 | Hard cap at 5 |

### Server-Side Change

Add one filter to the pool query in `GetSuggestedUsersAsync`:

```csharp
var pool = await db.Users
    .AsNoTracking()
    .Where(u => u.Id != requestingUserId
                && !followingIds.Contains(u.Id)
                && !u.IsSystemAccount)         // ← NEW: exclude system accounts
    .Select(u => new { ... })
    ...
```

### Response — unchanged shape

```json
[
  {
    "userId": "seed-user-alex-001",
    "displayName": "Alex Popescu",
    "avatarUrl": "https://...",
    "fitnessGoal": "lose",
    "workoutsThisMonth": 12
  }
]
```

**PRIVACY VERIFICATION — already confirmed:**
- ✅ No BMI, weight, calories, BMR, TDEE in response
- ✅ Only `userId`, `displayName`, `avatarUrl`, `fitnessGoal`, `workoutsThisMonth`
- ✅ `fitnessGoal` is the raw `User.Goal` string — safe to expose

### Error Responses — unchanged

| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid JWT |
| 500 | Internal error |

---

## Endpoint 3 — GET /api/social/profile/{userId} (modified)

### Change Summary

Add `isVerified` to the profile response so the profile page can render a badge.

### Server-Side Change

In `GetProfileAsync`, add to the response mapping:

```csharp
IsVerified = user.IsVerified
```

### Response — 200 OK — `UserSocialProfileResponse` (updated)

```json
{
  "id": "novafit-official-001",
  "displayName": "NovaFit Official",
  "avatarUrl": "https://...",
  "bio": "Official NovaFit account. Workout tips, nutrition advice, and motivation. 💪🌱",
  "postsCount": 10,
  "followersCount": 42,
  "followingCount": 0,
  "isFollowedByMe": false,
  "isOwnProfile": false,
  "isVerified": true
}
```

---

## Modified DTOs

### `UserSummary` (updated)

```csharp
public class UserSummary
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public bool IsVerified { get; set; }     // NEW
}
```

### `PostResponse` (updated)

```csharp
public class PostResponse
{
    public int Id { get; set; }
    public UserSummary Author { get; set; } = null!;
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public LinkedContentPreview? LinkedContent { get; set; }
    public int LikesCount { get; set; }
    public int CommentsCount { get; set; }
    public bool IsLikedByMe { get; set; }
    public bool IsFollowingAuthor { get; set; }
    public bool IsOwnPost { get; set; }
    public bool IsArchived { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsSeedContent { get; set; }  // NEW

    // Article-type post fields (unchanged)
    public int? ArticleId { get; set; }
    public string? ArticleTitle { get; set; }
    public string? ArticleCategory { get; set; }
    public string? ArticleCaption { get; set; }
    public string? ArticleDescription { get; set; }
    public string? ArticleImage { get; set; }
}
```

### `UserSocialProfileResponse` (updated)

```csharp
public class UserSocialProfileResponse
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public int PostsCount { get; set; }
    public int FollowersCount { get; set; }
    public int FollowingCount { get; set; }
    public bool IsFollowedByMe { get; set; }
    public bool IsOwnProfile { get; set; }
    public bool IsVerified { get; set; }     // NEW
}
```

---

## Modified Entity

### `User` (updated)

```csharp
public class User
{
    // ... all existing fields unchanged ...

    public bool IsVerified { get; set; } = false;       // NEW — renders badge
    public bool IsSystemAccount { get; set; } = false;  // NEW — internal flag
}
```

---

## TypeScript Interfaces

### `social.model.ts` — Updated `UserSummary`

```typescript
export interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl?: string;
  isVerified?: boolean;     // NEW — renders verification badge
}
```

### `social.model.ts` — Updated `Post`

```typescript
export interface Post {
  id: number;
  author: UserSummary;
  content: string;
  imageUrl?: string;
  linkedContent?: LinkedContentPreview;
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  isFollowingAuthor: boolean;
  isOwnPost: boolean;
  isArchived: boolean;
  createdAt: string;
  isSeedContent?: boolean;  // NEW — renders "Suggested for you" label

  // Article-type post fields (unchanged)
  articleId?: number;
  articleTitle?: string;
  articleCategory?: string;
  articleCaption?: string;
  articleDescription?: string;
  articleImage?: string;
}
```

### `social.model.ts` — Updated `UserSocialProfile`

```typescript
export interface UserSocialProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowedByMe: boolean;
  isOwnProfile: boolean;
  isVerified?: boolean;     // NEW — renders badge on profile page
}
```

---

## Seeder: NovaFit Official Account

### File: `Data/Seeds/NovaFitOfficialSeeder.cs`

**Stable ID:** `novafit-official-001`  
**Email:** `official@novafit.com`  
**Display name:** `NovaFit Official`  
**Password:** Random GUID hash (no real login)  
**Flags:** `IsAdmin = true`, `IsVerified = true`, `IsSystemAccount = true`, `OnboardingCompleted = true`

### Seeded content (minimum):

**Posts (10):**

| # | Content (truncated) | Image | Article? |
|---|---|---|---|
| 1 | "💡 Tip: Progressive overload doesn't mean adding weight every session..." | workout image | No |
| 2 | "🍳 Protein at every meal — aim for 25–40g per sitting..." | food image | No |
| 3 | "🏋️ Rest days are training days. Your muscles grow during recovery..." | rest/recovery image | No |
| 4 | "💧 Quick hydration check: divide your weight in kg by 30..." | water image | No |
| 5 | "🔥 The best workout is the one you actually do consistently..." | motivation image | No |
| 6 | "📊 Tracking tip: Don't aim for perfection. Aim for awareness..." | tracking image | No |
| 7 | "🧘 Mobility work before strength training = better range of motion..." | stretching image | No |
| 8 | "🥗 Eating more vegetables is the single most impactful dietary change..." | salad image | No |
| 9 | Article link: "The Beginner's Guide to Building Your First Workout Plan" | article cover | Yes → article 1 |
| 10 | Article link: "Understanding Your Macros: A No-BS Guide" | article cover | Yes → article 2 |

**Blog Articles (3):**

| # | Title | Category |
|---|---|---|
| 1 | "The Beginner's Guide to Building Your First Workout Plan" | Training |
| 2 | "Understanding Your Macros: A No-BS Guide" | Nutrition |
| 3 | "Sleep and Recovery: The Missing Piece of Your Fitness Puzzle" | Wellness |

### Seeder registration in `Program.cs`:

```csharp
// After existing seeders
await FitApp.Api.Data.Seeds.NovaFitOfficialSeeder.SeedAsync(db);
```

### Idempotency:

```csharp
if (await db.Users.AnyAsync(u => u.Id == OfficialUserId))
    return;
```

---

## Migration Instructions

### For @dotnet-developer:

```bash
cd FitApp.Api
dotnet ef migrations add AddUserVerificationFlags
```

The migration will:
- Add `IsVerified` column (boolean, default false) to `Users` table
- Add `IsSystemAccount` column (boolean, default false) to `Users` table
- No existing data is affected — both default to false

Auto-applied on next startup via `db.Database.Migrate()` in `Program.cs`.

### For @db-migration-specialist (review):
- Two additive boolean columns with false defaults — no data loss risk
- No index needed on `IsVerified` — only queried through `User` joins, never standalone
- No index needed on `IsSystemAccount` — only used in `WHERE` clauses with other filters
  on small result sets (suggested users pool ≤ 15, search results ≤ 50)

---

## Notes for @dotnet-developer

### Implementation checklist:

- [ ] Add `IsVerified` and `IsSystemAccount` to `Models/Entities/User.cs`
- [ ] Run migration: `dotnet ef migrations add AddUserVerificationFlags`
- [ ] Add `IsVerified` to `UserSummary` in `Models/DTOs/SocialDtos.cs`
- [ ] Add `IsSeedContent` to `PostResponse` in `Models/DTOs/SocialDtos.cs`
- [ ] Add `IsVerified` to `UserSocialProfileResponse` in `Models/DTOs/SocialDtos.cs`
- [ ] Modify `MapToUserSummary` in `SocialService.cs` — set `IsVerified = user.IsVerified`
- [ ] Modify `GetFeedAsync` in `SocialService.cs` — add cold-start seed injection (see implementation detail above)
- [ ] Modify `GetSuggestedUsersAsync` in `SocialService.cs` — add `!u.IsSystemAccount` filter
- [ ] Modify `GetProfileAsync` in `SocialService.cs` — set `IsVerified = user.IsVerified`
- [ ] Modify `SearchUsersAsync` in `SocialService.cs` — add `!u.IsSystemAccount` filter
- [ ] Create `Data/Seeds/NovaFitOfficialSeeder.cs` — full seeder with 10+ posts, 3+ articles
- [ ] Register seeder in `Program.cs` — after existing seeders

### Build verification:

After implementation, verify:
- Feed for a new user (0 follows) shows NovaFit Official posts with `isSeedContent: true`
- Feed for a user following ≥ 3 people shows only real posts, `isSeedContent: false`
- `discover/suggested` does NOT include "NovaFit Official" in results
- User search does NOT return "NovaFit Official"
- NovaFit Official's profile page shows `isVerified: true`
- `PostResponse.IsSeedContent` is `false` by default for all non-seed posts

### PRIVACY CHECKLIST (non-negotiable):

- [ ] `SuggestedUserResponse` still has NO BMI, weight, calories, BMR, or TDEE
- [ ] `IsSeedContent` carries no health data — it's a boolean render hint
- [ ] `IsVerified` carries no health data — it's a boolean public flag
- [ ] `IsSystemAccount` is NOT exposed in any API response DTO
- [ ] NovaFit Official seeded posts contain no user-specific health metrics
- [ ] NovaFit Official seeded account has no real biometric data (weight/height/age left at 0 or default)

---

## Notes for @angular-developer

### Implementation checklist:

- [ ] Update `UserSummary` in `core/models/social.model.ts` — add `isVerified?: boolean`
- [ ] Update `Post` in `core/models/social.model.ts` — add `isSeedContent?: boolean`
- [ ] Update `UserSocialProfile` in `core/models/social.model.ts` — add `isVerified?: boolean`
- [ ] Modify `post-card.component.html` — add verified badge and seed content label
- [ ] Modify `social-profile.component.html` — add verified badge next to display name
- [ ] Optional: create `shared/components/verified-badge/` micro-component if reused in 3+ places

### Verified badge rendering:

```html
<!-- In post-card author row, next to displayName -->
@if (post.author.isVerified) {
  <mat-icon class="verified-badge" aria-label="Verified account">verified</mat-icon>
}
```

```css
.verified-badge {
  font-size: 16px;
  width: 16px;
  height: 16px;
  color: var(--primary);
  margin-left: 4px;
  vertical-align: middle;
}
```

### Seed content label rendering:

```html
<!-- Below post-card author row, only for seed posts -->
@if (post.isSeedContent) {
  <span class="seed-label">
    <mat-icon class="seed-icon">auto_awesome</mat-icon>
    Suggested for you
  </span>
}
```

```css
.seed-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
}
.seed-icon {
  font-size: 14px;
  width: 14px;
  height: 14px;
}
```

### Key notes:
- No new API service methods needed — `getFeed()` and `getDiscover()` already work
- No new facade methods needed — `loadFeed()` returns whatever the API provides
- `isSeedContent` is optional (defaults to undefined/false) — backward compatible
- `isVerified` is optional (defaults to undefined/false) — backward compatible
- **CRITICAL:** The frontend NEVER decides whether to show seed content. It renders
  whatever the API returns. The `isSeedContent` flag is for visual treatment only.

---

## Notes for @uiux-designer

Design specs needed for:

1. **Verification badge** — Material `verified` icon, 16px, `var(--primary)` color,
   positioned inline-end of display name, aria-label for accessibility
2. **"Suggested for you" seed label** — muted label below author row on seed posts,
   sparkle icon prefix, 12px font, 50% white opacity
3. **NovaFit Official avatar** — app logo derivative, circular, works at 40px and 24px
4. Follow design system: dark `#0D0D10`, primary `#7C4DFF`, accent `#FF4081`, Poppins,
   glassmorphism

---

## Privacy Verification Checklist

For @code-reviewer — verify each item before approving:

### Suggested users endpoint
- [ ] `SuggestedUserResponse` has NO BMI, weight, calories, BMR, or TDEE fields
- [ ] `FitnessGoal` is `User.Goal` string only — not derived from health metrics
- [ ] `WorkoutsThisMonth` is a count — no per-workout health data
- [ ] System accounts (`IsSystemAccount = true`) are excluded from results

### Feed endpoint
- [ ] `IsSeedContent` is set in-memory on the DTO only — never stored in `Post` entity
- [ ] Seed posts contain no user-specific health data
- [ ] Cold-start threshold (`< 3 follows`) does not leak in any response field

### User entity
- [ ] `IsSystemAccount` is NOT exposed in any DTO (`UserSummary`, `PostResponse`, etc.)
- [ ] `IsVerified` is exposed only as a boolean — carries no health data

### Seeded content
- [ ] NovaFit Official posts contain general fitness tips only — no calories, macros, weight
- [ ] NovaFit Official user has no real biometric data (default 0 values)

---

## Status History

| Date | Status | Changed by | Note |
|---|---|---|---|
| 2026-06-03 | DRAFT | @tech-architect | ADR + contract created |
| 2026-06-03 | BACKEND_READY | @dotnet-developer | All changes implemented; migration applied |

---

## IMPLEMENTED: 2026-06-03

**Modified endpoints:**

| Endpoint | Change |
|---|---|
| `GET /api/social/feed` | Cold-start seed injection when `followingIds.Count < 3`; `IsSeedContent = true` on seed posts |
| `GET /api/social/discover/suggested` | `!u.IsSystemAccount` filter added to candidate pool |
| `GET /api/social/profile/{userId}` | `IsVerified` added to projection and `UserSocialProfileResponse` |
| `GET /api/social/users/search` | `!u.IsSystemAccount` filter added |

**Modified files:**
- `Models/Entities/User.cs` — added `IsVerified` (bool, default false) and `IsSystemAccount` (bool, default false)
- `Models/DTOs/SocialDtos.cs` — added `IsVerified` to `UserSummary`; `IsSeedContent` to `PostResponse`; `IsVerified` to `UserSocialProfileResponse`
- `Services/SocialService.cs` — `MapToUserSummary` sets `IsVerified`; `GetFeedAsync` cold-start block; `GetSuggestedUsersAsync` system account exclusion; `GetProfileAsync` `IsVerified` projection + response; `SearchUsersAsync` system account exclusion
- `Data/Seeds/NovaFitOfficialSeeder.cs` — NEW: seeds `novafit-official-001` user + 3 articles + 10 posts
- `Program.cs` — registered `NovaFitOfficialSeeder.SeedAsync(db)`

**Migration added:** `20260603142320_AddUserVerificationFlags`
- Adds `IsVerified` (INTEGER NOT NULL DEFAULT 0) to `Users`
- Adds `IsSystemAccount` (INTEGER NOT NULL DEFAULT 0) to `Users`
- Additive-only — all existing rows default to `false`, no data loss

**Privacy verification (completed):**
- ✅ `IsSystemAccount` NOT exposed in any API response DTO — internal flag only
- ✅ `IsSeedContent` is set in-memory on the DTO only — not stored on `Post` entity
- ✅ NovaFit Official posts contain only general fitness tips — no calories, macros, weight
- ✅ NovaFit Official User has `Age = 0`, `HeightCm = 0`, `WeightKg = 0`, `Goal = ""` — no biometric data
- ✅ Cold-start threshold (`< 3 follows`) does not appear in any response field
- ✅ `TotalCount` and `HasMore` reflect real posts only — seed content doesn't inflate pagination
- ✅ `SuggestedUserResponse` still has no BMI, weight, calories, BMR, or TDEE

**Implementation notes:**
- Seed posts query uses `p.User!.IsSystemAccount` — EF Core translates to JOIN + WHERE on Users; no separate Official userId constant needed at query time
- Seed likes are collected separately per seed post batch (not shared with real feed post likes)
- Article-linked posts 9 and 10 share `ImageUrl` and `Content` with their parent articles (same pattern as `CreateUserBlogAsync`)
- `SearchUsersAsync` `!u.IsSystemAccount` filter uses the same projection as before — only `Id`, `FullName`, `ImageUrl` columns loaded

---

## Implementation Log

```
2026-06-03 - DRAFT created by @tech-architect
2026-06-03 - BACKEND_READY by @dotnet-developer — User flags, DTO updates, feed cold-start
             injection, system account exclusion, NovaFitOfficialSeeder (10 posts + 3 articles),
             migration AddUserVerificationFlags applied.
2026-06-03 - COMPLETE by @angular-developer — Frontend implemented:
             - core/models/social.model.ts: isVerified on UserSummary + UserSocialProfile; isSeedContent on Post
             - post-card.component: isSeed/isTip/isEdArticle computed signals; seed icon box; verified badge;
               .post-card--seed modifier with !important border; NovaFit Tip/Article badge; "Suggested for you" label
             - suggested-users.component (NEW): standalone reusable component with skeleton/user rows/follow state machine;
               self-hides when 0 results; swallows errors silently
             - social-discover.component: <app-suggested-users> added above Athletes strip; verified badge in user card strip
             - social-profile.component: verified badge inline in <h1> display name
```
