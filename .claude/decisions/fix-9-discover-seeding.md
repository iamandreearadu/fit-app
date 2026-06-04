# ADR: Fix 9 — beSocial Cold-Start Discover Seeding & Hybrid Feed

**Author:** @tech-architect  
**Date:** 2026-06-03  
**Status:** DRAFT  
**Sprint:** 4  
**Related:** `.claude/contracts/fix-9-discover-seeding.md`, `.claude/plans/ux-audit-implementation-plan.md` (Fix 9), Fix 7 (guided empty state)

---

## Context

### The Problem

At launch and for every new user, the social experience is a ghost town. A user who
opens beSocial for the first time sees either an empty feed (nobody followed yet) or a
Discover page with zero or few posts from strangers. Ghost town perception is the #1 social
feature killer — a user who sees an empty social feed on first visit will never return.

The guided empty state (Fix 7) partially addresses this by showing suggested users with
inline follow buttons. But Fix 7 only helps users who actively follow those suggestions.
Users who dismiss the guided state or who follow people with no posts still see a blank
feed.

Additionally, Discover's "Suggested for You" is purely follow-suggestion based. It doesn't
guarantee content visibility — you can follow all 5 suggested users and still see an empty
feed if none of them have posted yet.

### Current State

```
Feed:     Shows posts from followed users + own posts. Empty if following nobody.
Discover: Shows posts from non-followed users. Can be empty on small platform.
Suggested: GET /api/social/discover/suggested — returns up to 5 users, goal-matched.
           Already implemented in Fix 7. Working correctly.
NovaFit:  No official account exists. "NovaFit" is only an email sender name.
```

### Desired State

```
Feed:     When user follows < 3 people, hybrid-populate with seed content:
          - BlogPost cards from NovaFit Official account
          - AI-tip posts (motivational/educational) from NovaFit Official account
          Seed content marked with isSeedContent: true for distinct Angular rendering.
Discover: Always shows minimum 5 content items. NovaFit Official posts appear first
          for new users. Suggested users section (Fix 7) works alongside Discover posts.
Official: NovaFit Official is a standard User entity with IsVerified: true and
          IsSystemAccount: true. Seeded on first startup. Has pre-seeded posts and
          blog articles.
```

---

## Decision

### 1. NovaFit Official Account — standard User entity with flags

Create a system account as a standard `User` entity with two new boolean flags:

- `IsVerified: true` — renders a verification badge in the UI (blue checkmark)
- `IsSystemAccount: true` — identifies accounts managed by the system, not real users

**Why two flags instead of one:**
- `IsVerified` is a public, user-facing concept — verified users get a badge. In the
  future, active community members could also be verified.
- `IsSystemAccount` is an internal flag — system accounts are excluded from certain
  operations (e.g., they should not appear in "Suggested Users" since they're not real
  people to befriend, and their password should never be used for login by normal users).

The NovaFit Official account is seeded via `Data/Seeds/NovaFitOfficialSeeder.cs` on
startup, similar to the existing `UserSeeder`, `BlogPostSeeder`, and
`WorkoutTemplateSeeder`. It creates:
- The user account (with stable ID `novafit-official-001`)
- 10+ posts covering workout tips, nutrition advice, and motivational content
- 3+ blog articles (educational long-form content)

**Why NOT a special entity:** The user requested "a standard User entity with
isVerified: true and a system flag — no special entity needed." The social system already
works with `User` → `Post` → `BlogPost` relationships. Adding a special entity would
duplicate existing queries and break existing `MapToPostResponse` / `MapToUserSummary`
mappings. A flag-based approach extends the existing model minimally.

### 2. Verified badge — `isVerified` in UserSummary DTO

Add `IsVerified` to `UserSummary` DTO so that every place that renders a user author
(posts, comments, profile) can show a verification badge. This is a purely visual flag
with no health data.

### 3. Hybrid feed during cold start — server-side injection

When a user follows fewer than 3 people, `GetFeedAsync` will supplement the user's real
feed posts with "seed content" from the NovaFit Official account. This is a **server-side
decision** — the backend determines the cold-start condition and mixes in seed content.

**Why server-side, not client-side:**
1. **Single API call** — the frontend calls `GET /api/social/feed` as usual. No second
   call needed. No client-side merging.
2. **Pagination works naturally** — seed content is interleaved into the paginated
   response. The client's infinite scroll just works.
3. **The cold-start threshold (< 3 follows) is a business rule** — it belongs in the
   service layer, not the component.

**Seed content sources:**
- Posts from the NovaFit Official account (both regular posts and article-linked posts)
- These are real `Post` entities in the database — no synthetic generation needed

**Rendering distinction:**
Add `IsSeedContent: bool` to `PostResponse` DTO. When `true`, the Angular post card
renders a subtle "Suggested for you" or "From NovaFit" label. The frontend can also
render a different card style (e.g., no follow button since NovaFit Official is auto-suggested).

### 4. Discover page — NovaFit Official posts always visible

The existing `GetDiscoverAsync` already shows posts from non-followed users. NovaFit
Official's posts will naturally appear there because the Official account is a real user
whose posts are in the `Posts` table. No query change is needed — the Official account's
posts will organically show up on Discover.

If the platform has very few posts, the Official account's 10+ posts guarantee a non-empty
Discover page.

### 5. `GET /api/social/discover/suggested` — verified as correct, no changes needed

The endpoint already exists (Fix 7) and its implementation matches the Fix 9 requirement:

✅ Returns up to 5 users  
✅ Matched by `primaryGoal` (same-goal users sorted first)  
✅ Sorted by `workoutsThisMonth` desc within goal match groups  
✅ Does NOT include BMI, weight, calories, BMR, or TDEE  
✅ Returns only `userId`, `displayName`, `avatarUrl`, `fitnessGoal`, `workoutsThisMonth`  

**One adjustment needed:** Exclude system accounts from suggestions. Add
`.Where(u => !u.IsSystemAccount)` to the pool query in `GetSuggestedUsersAsync`. System
accounts are not real people — they should not appear as follow suggestions alongside
real users.

---

## Clean Architecture Boundaries

- **Controller responsibility:** HTTP binding only. `SocialController.GetFeed` and
  `GetDiscover` remain unchanged — thin pass-through. No new controller actions needed
  for this fix.
- **Service responsibility:** `SocialService.GetFeedAsync` gains cold-start detection
  (follow count check) and seed content injection logic. `GetSuggestedUsersAsync` gains
  system account exclusion.
- **What stays out of controllers:** Cold-start threshold logic, seed content query,
  follow count check.
- **What stays out of components:** Cold-start determination. The component renders
  `isSeedContent` items differently but never decides whether to request seed content.
- **Seeder responsibility:** `NovaFitOfficialSeeder` creates the account and its content
  on first startup. Idempotent — checks for existing account before creating.

---

## Data Model

### Modified EF Entity: `User`

Add two boolean fields:

```csharp
public class User
{
    // ... existing fields ...

    /// <summary>
    /// Verified badge — renders a checkmark in the UI.
    /// Currently only set for system-seeded accounts; future: community verification.
    /// </summary>
    public bool IsVerified { get; set; } = false;

    /// <summary>
    /// Internal flag — identifies system-managed accounts (e.g., NovaFit Official).
    /// System accounts are excluded from suggested users and search results.
    /// Should not be used for normal user login.
    /// </summary>
    public bool IsSystemAccount { get; set; } = false;
}
```

### Modified DTO: `UserSummary`

```csharp
public class UserSummary
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }

    /// <summary>
    /// True for verified accounts (e.g., NovaFit Official). Renders a badge in the UI.
    /// </summary>
    public bool IsVerified { get; set; }
}
```

### Modified DTO: `PostResponse`

```csharp
public class PostResponse
{
    // ... all existing fields unchanged ...

    /// <summary>
    /// True when this post was injected as seed content during cold-start feed population.
    /// Frontend renders seed posts with a "Suggested for you" label.
    /// Only set to true in GetFeedAsync when the user follows fewer than 3 people.
    /// </summary>
    public bool IsSeedContent { get; set; }
}
```

### Modified DTO: `UserSocialProfileResponse`

```csharp
public class UserSocialProfileResponse
{
    // ... all existing fields unchanged ...

    /// <summary>
    /// True for verified accounts. Renders a badge on the profile page.
    /// </summary>
    public bool IsVerified { get; set; }
}
```

### TypeScript Interface Updates

**`social.model.ts` — `UserSummary`:**
```typescript
export interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl?: string;
  isVerified?: boolean;   // new — renders verification badge
}
```

**`social.model.ts` — `Post`:**
```typescript
export interface Post {
  // ... all existing fields unchanged ...
  isSeedContent?: boolean;  // new — renders "Suggested for you" label
}
```

**`social.model.ts` — `UserSocialProfile`:**
```typescript
export interface UserSocialProfile {
  // ... all existing fields unchanged ...
  isVerified?: boolean;     // new — renders badge on profile page
}
```

### New Seeder: `Data/Seeds/NovaFitOfficialSeeder.cs`

```csharp
public static class NovaFitOfficialSeeder
{
    public const string OfficialUserId = "novafit-official-001";

    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Users.AnyAsync(u => u.Id == OfficialUserId))
            return;

        var official = new User
        {
            Id = OfficialUserId,
            Email = "official@novafit.com",
            FullName = "NovaFit Official",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
            IsAdmin = true,
            IsVerified = true,
            IsSystemAccount = true,
            OnboardingCompleted = true,
            Goal = "maintain",
            Bio = "Official NovaFit account. Workout tips, nutrition advice, and motivation. 💪🌱",
            ImageUrl = "<novafit-logo-url>",
            // ... biometric fields left at 0/default — system account, no real metrics
        };
        db.Users.Add(official);

        // 10+ posts and 3+ blog articles seeded here
        // Content covers: workout tips, nutrition advice, motivational content
        // See contract for full content specification
        // ...

        await db.SaveChangesAsync();
    }
}
```

**Registration in `Program.cs`:**
```csharp
await FitApp.Api.Data.Seeds.NovaFitOfficialSeeder.SeedAsync(db);
```

---

## API Contract

### Modified endpoints (no new routes)

| Method | Route | Auth | Change | Status |
|--------|-------|------|--------|--------|
| GET | `/api/social/feed` | Bearer | Hybrid-populate with seed content during cold start | **Modified** |
| GET | `/api/social/discover/suggested` | Bearer | Exclude system accounts from results | **Modified** |

### Unchanged endpoints (verified as matching Fix 9 requirements)

| Method | Route | Auth | Status |
|--------|-------|------|--------|
| GET | `/api/social/discover` | Bearer | NovaFit Official posts appear organically — no change |

### No new endpoints

Fix 9 does not add new API routes. It modifies the behavior of existing ones and adds
seed data + new fields to existing DTOs.

---

## GET /api/social/feed — Modified Behavior

### Cold-start detection

When `GetFeedAsync` is called:

1. Count the user's follows: `followingIds.Count`
2. If `followingIds.Count < 3` → cold-start mode
3. In cold-start mode, supplement the user's real feed with seed content

### Seed content injection logic

```
If (followingCount < 3):
  1. Query user's real feed posts (from followed users + own posts) — existing logic
  2. Query NovaFit Official's posts (non-archived, ordered by CreatedAt desc)
  3. Merge: real posts first, then fill remaining page slots with seed posts
     that are not already in the real feed
  4. Mark all NovaFit Official posts injected this way with IsSeedContent = true
  5. Total items per page still capped at pageSize
Else:
  Standard feed logic (unchanged)
```

**Key behaviors:**
- Seed posts are NovaFit Official's real `Post` entities — not synthetic
- Seed posts are marked with `IsSeedContent = true` only in the DTO response, not
  in the database entity
- As the user follows more people (>= 3), seed content disappears automatically
- Seed content appears on page 1 primarily — subsequent pages show only real content
  unless the user has very few real posts
- NovaFit Official posts that the user sees through normal following (if they follow
  the Official account) are NOT marked as seed content

### Pagination impact

Seed content is interleaved into the paginated response. The `TotalCount` reflects only
real posts (not seed), so `HasMore` is based on real post count. This prevents infinite
scroll from fetching page after page of repeated seed content.

### Example response with seed content

```json
{
  "items": [
    {
      "id": 42,
      "author": { "id": "user-123", "displayName": "Jane", "isVerified": false },
      "content": "Just finished leg day! 🦵",
      "isSeedContent": false,
      ...
    },
    {
      "id": 7,
      "author": { "id": "novafit-official-001", "displayName": "NovaFit Official", "isVerified": true },
      "content": "💡 Tip: Progressive overload doesn't mean adding weight every session...",
      "isSeedContent": true,
      ...
    }
  ],
  "page": 1,
  "pageSize": 10,
  "totalCount": 3,
  "hasMore": false
}
```

---

## GET /api/social/discover/suggested — Modified Behavior

### Change: exclude system accounts

Add `.Where(u => !u.IsSystemAccount)` to the user pool query in
`GetSuggestedUsersAsync`. System accounts are not real people — suggesting them as
"users like you" alongside real users is misleading.

### Verified as matching Fix 9 requirements

| Requirement | Status | Implementation |
|---|---|---|
| Returns up to 5 users | ✅ | `limit = Math.Min(limit, 5)` — hard cap |
| Matched by primaryGoal | ✅ | `GoalMatch` sort: same-goal users first |
| Sorted by workoutsThisMonth desc | ✅ | Secondary sort after goal match |
| Does NOT include BMI | ✅ | Not in `SuggestedUserResponse` |
| Does NOT include weight | ✅ | Not in response |
| Does NOT include calories | ✅ | Not in response |
| Does NOT include BMR | ✅ | Not in response |
| Does NOT include TDEE | ✅ | Not in response |

---

## Frontend Architecture

### Modified components (no new components for this fix):

| File | Change |
|---|---|
| `core/models/social.model.ts` | Add `isVerified?: boolean` to `UserSummary`, `isSeedContent?: boolean` to `Post`, `isVerified?: boolean` to `UserSocialProfile` |
| `features/social/components/post-card/post-card.component.ts` | Render verification badge when `post.author.isVerified`, render "Suggested for you" label when `post.isSeedContent` |
| `features/social/social-profile/social-profile.component.ts` | Render verification badge when `profile.isVerified` |
| `features/social/feed/social-feed.component.ts` | No logic change — seed content renders automatically via existing `*ngFor` / `@for` over `facade.feed()` |

### No new facades, services, or signals

Feed loading already works through `SocialFacade.loadFeed()` → `SocialService.getFeed()`
→ `GET /api/social/feed`. The seed content injection is server-side. The Angular code just
renders whatever comes back.

The `isSeedContent` flag is a render hint — no special state management needed.

### Verification badge component pattern

The verification badge is a small inline element (checkmark icon) rendered next to the
author display name in all contexts:
- Post card author row
- Comment author
- Profile header
- Suggested user cards (if verified)

**Suggested implementation:** A simple `@if (author.isVerified)` block in the existing
`post-card.component.html` author section, rendering a `mat-icon` with `verified` icon
and a `verified-badge` CSS class.

---

## Instructions for @dotnet-developer

### Implementation checklist:

1. **`Models/Entities/User.cs`** — Add two new fields:
   - `public bool IsVerified { get; set; } = false;`
   - `public bool IsSystemAccount { get; set; } = false;`

2. **Run migration:** `dotnet ef migrations add AddUserVerificationFlags`
   - Adds `IsVerified` (default false) and `IsSystemAccount` (default false) columns to Users table

3. **`Models/DTOs/SocialDtos.cs`** — Modify:
   - `UserSummary` — add `public bool IsVerified { get; set; }`
   - `PostResponse` — add `public bool IsSeedContent { get; set; }`
   - `UserSocialProfileResponse` — add `public bool IsVerified { get; set; }`

4. **`Services/SocialService.cs`** — Modify `MapToUserSummary`:
   ```csharp
   private static UserSummary MapToUserSummary(User user) => new()
   {
       Id = user.Id,
       DisplayName = user.FullName,
       AvatarUrl = user.ImageUrl,
       IsVerified = user.IsVerified    // NEW
   };
   ```

5. **`Services/SocialService.cs`** — Modify `GetFeedAsync` for cold-start:
   - After querying `followingIds`, check `followingIds.Count < 3`
   - When in cold-start mode, query NovaFit Official's posts and merge them
   - Mark injected seed posts with `IsSeedContent = true`
   - Keep pagination based on real post count (not seed post count)
   - See contract for full implementation detail

6. **`Services/SocialService.cs`** — Modify `GetSuggestedUsersAsync`:
   - Add `.Where(u => !u.IsSystemAccount)` to the pool query
   - System accounts should not appear as follow suggestions

7. **`Services/SocialService.cs`** — Modify `GetProfileAsync`:
   - Set `IsVerified = user.IsVerified` on `UserSocialProfileResponse`

8. **`Services/SocialService.cs`** — Modify `SearchUsersAsync`:
   - Add `.Where(u => !u.IsSystemAccount)` to exclude system accounts from search
   - NovaFit Official should be findable through Discover posts, not user search

9. **`Data/Seeds/NovaFitOfficialSeeder.cs`** — Create new seeder:
   - Stable user ID: `novafit-official-001`
   - `IsAdmin = true`, `IsVerified = true`, `IsSystemAccount = true`
   - Random password hash (no real login needed)
   - 10+ posts (workout tips, nutrition advice, motivational content)
   - 3+ blog articles (linked to posts via `ArticleId`)
   - Idempotent — check `AnyAsync(u => u.Id == ...)` before creating

10. **`Program.cs`** — Register the new seeder:
    ```csharp
    await FitApp.Api.Data.Seeds.NovaFitOfficialSeeder.SeedAsync(db);
    ```

### PRIVACY CHECKLIST (non-negotiable):

- [ ] `SuggestedUserResponse` still does NOT include BMI, weight, calories, BMR, or TDEE
- [ ] `IsSeedContent` is a render hint only — no health data exposed
- [ ] `IsVerified` / `IsSystemAccount` are public metadata flags — no health data
- [ ] NovaFit Official seeded posts contain NO health metrics (no calories, no macros, no weight data)
- [ ] `MapToUserSummary` does NOT expose `IsSystemAccount` to the frontend — only `IsVerified`

---

## Instructions for @angular-developer

### Implementation checklist:

1. **`core/models/social.model.ts`** — Add fields:
   - `UserSummary`: add `isVerified?: boolean`
   - `Post`: add `isSeedContent?: boolean`
   - `UserSocialProfile`: add `isVerified?: boolean`

2. **`features/social/components/post-card/post-card.component.html`** — Add:
   - Verification badge: `@if (post.author.isVerified)` → small `mat-icon` ("verified") next to author name
   - Seed label: `@if (post.isSeedContent)` → subtle "Suggested for you" pill/label below author row
   - Style: badge uses `var(--primary)` color (#7C4DFF), seed label uses muted secondary text

3. **`features/social/social-profile/social-profile.component.html`** — Add:
   - Verification badge next to profile display name when `profile.isVerified`

4. **`features/social/feed/social-feed.component`** — No logic change needed.
   Seed content renders automatically through existing `@for` loop over `facade.feed()`.

5. **Optional: shared verified badge micro-component** — If the badge is rendered in
   3+ places, extract into `shared/components/verified-badge/verified-badge.component.ts`.
   Otherwise, inline `@if` is acceptable.

### Key notes:
- `isSeedContent` is render-only — no state management, no special API calls
- `isVerified` is render-only — no special logic, just a visual badge
- The feed already re-fetches on pull-to-refresh. As the user follows more people,
  seed content naturally disappears from subsequent feed loads.
- **CRITICAL:** Components NEVER decide whether to show seed content. The backend
  decides. The component just renders what the API returns.

---

## Instructions for @uiux-designer

Design specs needed for:

1. **Verification badge** — size, color, icon, positioning relative to display name,
   hover/tooltip ("Verified account"), accessibility label
2. **"Suggested for you" seed label** — positioning on post card, font size, color
   (muted secondary), pill vs flat label, icon (sparkle? lightbulb?)
3. **NovaFit Official avatar** — design a small logo/icon for the system account
   (could be the app logo itself)
4. Follow design system: dark `#0D0D10`, primary `#7C4DFF`, accent `#FF4081`, Poppins,
   glassmorphism

---

## Consequences & Trade-offs

### What we gain
- **No ghost town** — every new user sees content on day 1, guaranteed by seed data
- **Graduated social experience** — seed content fades as the user builds a real network
- **Minimal API surface change** — no new endpoints, just two modified behaviors and
  two new DTO fields
- **Verification infrastructure** — `IsVerified` flag is reusable for future community
  verification features
- **Single responsibility** — seed content is a server-side business decision; the
  frontend is a pure renderer

### What we accept
- **Two new columns on Users table** — `IsVerified` and `IsSystemAccount`, both boolean
  with false defaults. Minimal migration impact.
- **Cold-start query cost** — when `followingCount < 3`, `GetFeedAsync` runs one
  additional query for NovaFit Official's posts. This is a lightweight query (one user ID,
  ~10 posts) that runs only during cold start.
- **Seed content is static** — the NovaFit Official posts are seeded once. Fresh content
  requires manual creation (admin account post/article). This is an operational concern,
  not a technical one.
- **Threshold of 3 follows** — this is a heuristic. If users follow 3 inactive accounts,
  they still get an empty feed without seed content. Acceptable trade-off: the guided
  empty state (Fix 7) pushes them toward active users.
- **`IsSeedContent` is transient** — it's set per-request in the DTO, not stored in the
  database. If the user follows NovaFit Official normally, those posts appear without
  the "Suggested for you" label.

### Privacy constraints (re-stated for @code-reviewer)
1. `SuggestedUserResponse` — verified: no BMI, weight, calories, BMR, TDEE. Only
   `userId`, `displayName`, `avatarUrl`, `fitnessGoal`, `workoutsThisMonth`.
2. `IsSeedContent` — pure boolean render hint. Contains no health data.
3. `IsVerified` — public metadata. Contains no health data.
4. `IsSystemAccount` — internal flag. NOT exposed in any DTO.
5. NovaFit Official seeded content — contains only general fitness tips and advice.
   No user-specific health metrics.
