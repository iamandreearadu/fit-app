using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Services;

public class SocialService(
    AppDbContext db,
    INotificationService notifications,
    ILogger<SocialService> logger) : ISocialService
{
    private readonly ILogger<SocialService> _logger = logger;

    // ── Single Post ───────────────────────────────────────────────────────────

    public async Task<PostResponse> GetPostByIdAsync(int id, string requestingUserId)
    {
        var post = await db.Posts
            .AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.LinkedWorkout)
            .Include(p => p.LinkedMeal)
            .Include(p => p.LinkedDailyEntry)
            .Include(p => p.Article)
            .AsSplitQuery()
            .FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new KeyNotFoundException("Post not found.");

        var isLiked = await db.Likes.AnyAsync(l => l.UserId == requestingUserId && l.PostId == id);
        var isFollowing = post.UserId != requestingUserId && await db.Follows
            .AnyAsync(f => f.FollowerId == requestingUserId && f.FollowingId == post.UserId);

        return MapToPostResponse(post, requestingUserId,
            isLiked ? [id] : [],
            isFollowing ? [post.UserId] : []);
    }

    // ── Feed ──────────────────────────────────────────────────────────────────

    public async Task<PaginatedResponse<PostResponse>> GetFeedAsync(string userId, int page, int pageSize)
    {
        pageSize = Math.Min(pageSize, 50);
        var followingIds = await db.Follows
            .Where(f => f.FollowerId == userId)
            .Select(f => f.FollowingId)
            .ToListAsync();

        // Include own posts
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

        var followingSet = followingIds.ToHashSet();
        var items = posts.Select(p => MapToPostResponse(p, userId, likedPostIds, followingSet)).ToList();

        // ── Cold-start seed injection (page 1 only) ──────────────────────────
        // Appended only on page 1 when the user follows < 3 people and has spare slots.
        // Restricting to page 1 avoids the Skip offset instability that occurs when
        // seedNeeded varies between pages (real-post count changes, so a fixed
        // (page-1)*seedNeeded skip would duplicate or skip seed posts on page 2+).
        // Cold-start users follow someone before reaching page 2 — multi-page seeding
        // adds complexity with no practical benefit.
        // TotalCount and HasMore are based on REAL posts only so pagination stops correctly.
        if (page == 1 && followingIds.Count < 3 && items.Count < pageSize)
        {
            var realPostIds = posts.Select(p => p.Id).ToHashSet();
            var seedNeeded  = pageSize - items.Count;

            var seedPosts = await db.Posts
                .AsNoTracking()
                .Include(p => p.User)
                .Include(p => p.Article)
                .Where(p => p.User!.IsSystemAccount
                            && !p.IsArchived
                            && !realPostIds.Contains(p.Id))
                .OrderByDescending(p => p.CreatedAt)
                .Take(seedNeeded)
                .ToListAsync();

            if (seedPosts.Count > 0)
            {
                var seedPostIds = seedPosts.Select(p => p.Id).ToList();
                var seedLikedIds = await db.Likes
                    .Where(l => l.UserId == userId && seedPostIds.Contains(l.PostId))
                    .Select(l => l.PostId)
                    .ToHashSetAsync();

                foreach (var sp in seedPosts)
                {
                    var mapped = MapToPostResponse(sp, userId, seedLikedIds, followingSet);
                    mapped.IsSeedContent = true;
                    items.Add(mapped);
                }
            }
        }

        return new PaginatedResponse<PostResponse>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = total,          // real posts only — NOT including seed content
            HasMore = page * pageSize < total
        };
    }

    // ── Discover ──────────────────────────────────────────────────────────────

    public async Task<PaginatedResponse<PostResponse>> GetDiscoverAsync(string userId, int page, int pageSize)
    {
        pageSize = Math.Min(pageSize, 50);
        var followingIds = await db.Follows
            .Where(f => f.FollowerId == userId)
            .Select(f => f.FollowingId)
            .ToHashSetAsync();

        var query = db.Posts
            .AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.LinkedWorkout)
            .Include(p => p.LinkedMeal)
            .Include(p => p.LinkedDailyEntry)
            .Include(p => p.Article)
            .AsSplitQuery()
            .Where(p => p.UserId != userId && !followingIds.Contains(p.UserId) && !p.IsArchived)
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

        var items = posts.Select(p => MapToPostResponse(p, userId, likedPostIds, followingIds)).ToList();

        return new PaginatedResponse<PostResponse>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
            HasMore = page * pageSize < total
        };
    }

    // ── Create Post ───────────────────────────────────────────────────────────

    public async Task<PostResponse> CreatePostAsync(string userId, CreatePostRequest request)
    {
        // Validate at most one linked content item
        var linkCount = (request.LinkedWorkoutId.HasValue ? 1 : 0)
                      + (request.LinkedMealId.HasValue ? 1 : 0)
                      + (request.LinkedDailyEntryId.HasValue ? 1 : 0);
        if (linkCount > 1)
            throw new InvalidOperationException("Only one linked content item is allowed per post.");

        if (request.LinkedWorkoutId.HasValue)
        {
            var exists = await db.WorkoutTemplates.AnyAsync(w => w.Id == request.LinkedWorkoutId && w.UserId == userId);
            if (!exists) throw new UnauthorizedAccessException("Linked workout does not belong to you.");
        }

        if (request.LinkedMealId.HasValue)
        {
            var exists = await db.MealEntries.AnyAsync(m => m.Id == request.LinkedMealId && m.UserId == userId);
            if (!exists) throw new UnauthorizedAccessException("Linked meal does not belong to you.");
        }

        if (request.LinkedDailyEntryId.HasValue)
        {
            var exists = await db.DailyEntries.AnyAsync(d => d.Id == request.LinkedDailyEntryId && d.UserId == userId);
            if (!exists) throw new UnauthorizedAccessException("Linked daily entry does not belong to you.");
        }

        var post = new Post
        {
            UserId = userId,
            Content = request.Content,
            ImageUrl = request.ImageUrl,
            LinkedWorkoutId = request.LinkedWorkoutId,
            LinkedMealId = request.LinkedMealId,
            LinkedDailyEntryId = request.LinkedDailyEntryId
        };

        db.Posts.Add(post);
        await db.SaveChangesAsync();

        var created = await db.Posts
            .Include(p => p.User)
            .Include(p => p.LinkedWorkout)
            .Include(p => p.LinkedMeal)
            .Include(p => p.LinkedDailyEntry)
            .FirstAsync(p => p.Id == post.Id);

        return MapToPostResponse(created, userId, [], []);
    }

    // ── Update Post ───────────────────────────────────────────────────────────

    public async Task<PostResponse> UpdatePostAsync(int id, string userId, UpdatePostRequest request)
    {
        var post = await db.Posts
            .Include(p => p.User)
            .Include(p => p.LinkedWorkout)
            .Include(p => p.LinkedMeal)
            .Include(p => p.LinkedDailyEntry)
            .FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new KeyNotFoundException("Post not found.");

        if (post.UserId != userId)
            throw new UnauthorizedAccessException("You can only edit your own posts.");

        post.Content = request.Content;
        post.ImageUrl = request.ImageUrl;
        await db.SaveChangesAsync();

        return MapToPostResponse(post, userId, [], []);
    }

    // ── Delete Post ───────────────────────────────────────────────────────────

    public async Task DeletePostAsync(int id, string userId)
    {
        var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id);
        if (post is null) return;
        if (post.UserId != userId)
            throw new UnauthorizedAccessException("You can only delete your own posts.");

        db.Posts.Remove(post);
        await db.SaveChangesAsync();
    }

    // ── Like Toggle ───────────────────────────────────────────────────────────

    public async Task<LikeToggleResponse> ToggleLikeAsync(int postId, string userId)
    {
        var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == postId);
        if (post is null) throw new KeyNotFoundException("Post not found.");
        if (post.UserId == userId)
            throw new InvalidOperationException("You cannot like your own post.");

        var existing = await db.Likes.FirstOrDefaultAsync(l => l.UserId == userId && l.PostId == postId);
        bool isLiked;

        var actor = await db.Users.FindAsync(userId);

        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            if (existing is not null)
            {
                db.Likes.Remove(existing);
                await db.SaveChangesAsync();
                await db.Posts.Where(p => p.Id == postId)
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.LikesCount,
                        p => p.LikesCount > 0 ? p.LikesCount - 1 : 0));
                isLiked = false;
            }
            else
            {
                db.Likes.Add(new Like { UserId = userId, PostId = postId });
                await db.SaveChangesAsync();
                await db.Posts.Where(p => p.Id == postId)
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.LikesCount, p => p.LikesCount + 1));
                isLiked = true;
            }

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        var updatedCount = await db.Posts.Where(p => p.Id == postId).Select(p => p.LikesCount).FirstAsync();

        if (isLiked)
        {
            await notifications.CreateAndPushAsync(
                post.UserId,
                userId,
                NotificationType.Like,
                postId,
                $"{actor?.FullName ?? "Someone"} liked your post");
        }

        return new LikeToggleResponse { IsLiked = isLiked, LikesCount = updatedCount };
    }

    // ── Comments ──────────────────────────────────────────────────────────────

    public async Task<PaginatedResponse<CommentResponse>> GetCommentsAsync(int postId, int page, int pageSize, string requestingUserId)
    {
        pageSize = Math.Min(pageSize, 50);
        var query = db.Comments
            .AsNoTracking()
            .Include(c => c.User)
            .Where(c => c.PostId == postId)
            .OrderBy(c => c.CreatedAt);

        var total = await query.CountAsync();
        var comments = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PaginatedResponse<CommentResponse>
        {
            Items = comments.Select(c => new CommentResponse
            {
                Id = c.Id,
                Author = MapToUserSummary(c.User),
                Content = c.Content,
                CreatedAt = c.CreatedAt,
                IsOwnComment = c.UserId == requestingUserId
            }).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
            HasMore = page * pageSize < total
        };
    }

    public async Task<CommentResponse> AddCommentAsync(int postId, string userId, CreateCommentRequest request)
    {
        var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == postId);
        if (post is null) throw new KeyNotFoundException("Post not found.");

        var comment = new Comment
        {
            UserId = userId,
            PostId = postId,
            Content = request.Content
        };

        db.Comments.Add(comment);
        await db.SaveChangesAsync();
        await db.Posts.Where(p => p.Id == postId)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.CommentsCount, p => p.CommentsCount + 1));

        await db.Entry(comment).Reference(c => c.User).LoadAsync();

        if (post.UserId != userId)
        {
            var actor = comment.User;
            await notifications.CreateAndPushAsync(
                post.UserId,
                userId,
                NotificationType.Comment,
                postId,
                $"{actor.FullName} commented on your post");
        }

        return new CommentResponse
        {
            Id = comment.Id,
            Author = MapToUserSummary(comment.User),
            Content = comment.Content,
            CreatedAt = comment.CreatedAt,
            IsOwnComment = true
        };
    }

    public async Task DeleteCommentAsync(int postId, int commentId, string userId)
    {
        var comment = await db.Comments
            .Include(c => c.Post)
            .FirstOrDefaultAsync(c => c.Id == commentId && c.PostId == postId);

        if (comment is null) return;
        if (comment.UserId != userId)
            throw new UnauthorizedAccessException("You can only delete your own comments.");

        db.Comments.Remove(comment);
        await db.SaveChangesAsync();
        await db.Posts.Where(p => p.Id == postId)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.CommentsCount,
                p => p.CommentsCount > 0 ? p.CommentsCount - 1 : 0));
    }

    // ── Follow Toggle ─────────────────────────────────────────────────────────

    public async Task<FollowToggleResponse> ToggleFollowAsync(string targetUserId, string userId)
    {
        if (targetUserId == userId)
            throw new InvalidOperationException("You cannot follow yourself.");

        var existing = await db.Follows
            .FirstOrDefaultAsync(f => f.FollowerId == userId && f.FollowingId == targetUserId);

        bool isFollowing;

        if (existing is not null)
        {
            db.Follows.Remove(existing);
            isFollowing = false;
        }
        else
        {
            db.Follows.Add(new Follow { FollowerId = userId, FollowingId = targetUserId });
            isFollowing = true;
        }

        // Load actor before SaveChanges to avoid a post-commit round-trip
        var actor = await db.Users.FindAsync(userId);
        await db.SaveChangesAsync();

        if (isFollowing)
        {
            await notifications.CreateAndPushAsync(
                targetUserId,
                userId,
                NotificationType.Follow,
                null,
                $"{actor?.FullName ?? "Someone"} started following you");
        }

        var followersCount = await db.Follows.CountAsync(f => f.FollowingId == targetUserId);
        return new FollowToggleResponse { IsFollowing = isFollowing, FollowersCount = followersCount };
    }


    // ── Followers / Following lists ──────────────────────────────────────────

    public async Task<PaginatedResponse<FollowUserDto>> GetFollowersAsync(
        string targetUserId, string requestingUserId, int page, int pageSize)
    {
        pageSize = Math.Min(pageSize, 50);

        var query = db.Follows
            .AsNoTracking()
            .Where(f => f.FollowingId == targetUserId)
            .OrderByDescending(f => f.CreatedAt);

        var totalCount = await query.CountAsync();

        var rows = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(f => new
            {
                f.Follower.Id,
                f.Follower.FullName,
                f.Follower.ImageUrl,
                f.Follower.IsVerified,
                IsFollowedByMe = f.Follower.Followers
                    .Any(ff => ff.FollowerId == requestingUserId)
            })
            .ToListAsync();

        var items = rows.Select(r => new FollowUserDto
        {
            Id = r.Id,
            DisplayName = r.FullName,
            AvatarUrl = r.ImageUrl,
            IsFollowedByMe = r.IsFollowedByMe,
            IsVerified = r.IsVerified,
        }).ToList();

        return new PaginatedResponse<FollowUserDto>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            HasMore = page * pageSize < totalCount,
        };
    }

    public async Task<PaginatedResponse<FollowUserDto>> GetFollowingAsync(
        string targetUserId, string requestingUserId, int page, int pageSize)
    {
        pageSize = Math.Min(pageSize, 50);

        var query = db.Follows
            .AsNoTracking()
            .Where(f => f.FollowerId == targetUserId)
            .OrderByDescending(f => f.CreatedAt);

        var totalCount = await query.CountAsync();

        var rows = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(f => new
            {
                f.Following.Id,
                f.Following.FullName,
                f.Following.ImageUrl,
                f.Following.IsVerified,
                IsFollowedByMe = f.Following.Followers
                    .Any(ff => ff.FollowerId == requestingUserId)
            })
            .ToListAsync();

        var items = rows.Select(r => new FollowUserDto
        {
            Id = r.Id,
            DisplayName = r.FullName,
            AvatarUrl = r.ImageUrl,
            IsFollowedByMe = r.IsFollowedByMe,
            IsVerified = r.IsVerified,
        }).ToList();

        return new PaginatedResponse<FollowUserDto>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            HasMore = page * pageSize < totalCount,
        };
    }

    // ── Profile ───────────────────────────────────────────────────────────────

    public async Task<UserSocialProfileResponse> GetProfileAsync(string userId, string requestingUserId)
    {
        // Single projection query — replaces 4 separate CountAsync/AnyAsync round-trips
        var stats = await db.Users
            .Where(u => u.Id == userId)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.ImageUrl,
                u.Bio,
                u.IsVerified,
                PostsCount     = u.Posts.Count(p => !p.IsArchived),
                FollowersCount = u.Followers.Count(),
                FollowingCount = u.Following.Count(),
                IsFollowedByMe = u.Followers.Any(f => f.FollowerId == requestingUserId)
            })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("User not found.");

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
            IsVerified = stats.IsVerified
        };
    }

    public async Task<PaginatedResponse<PostResponse>> GetProfilePostsAsync(string userId, string requestingUserId, int page, int pageSize)
    {
        pageSize = Math.Min(pageSize, 50);
        var followingIds = await db.Follows
            .Where(f => f.FollowerId == requestingUserId)
            .Select(f => f.FollowingId)
            .ToHashSetAsync();

        var query = db.Posts
            .AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.LinkedWorkout)
            .Include(p => p.LinkedMeal)
            .Include(p => p.LinkedDailyEntry)
            .Include(p => p.Article)
            .AsSplitQuery()
            .Where(p => p.UserId == userId && !p.IsArchived && p.ArticleId == null)
            .OrderByDescending(p => p.CreatedAt);

        var total = await query.CountAsync();
        var posts = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var likedPostIds = await db.Likes
            .Where(l => l.UserId == requestingUserId && posts.Select(p => p.Id).Contains(l.PostId))
            .Select(l => l.PostId)
            .ToHashSetAsync();

        return new PaginatedResponse<PostResponse>
        {
            Items = posts.Select(p => MapToPostResponse(p, requestingUserId, likedPostIds, followingIds)).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
            HasMore = page * pageSize < total
        };
    }

    // ── Suggested Users (guided-empty-state) ──────────────────────────────────

    /// <summary>
    /// Returns up to <paramref name="limit"/> user suggestions for new users with no follows.
    /// Algorithm:
    ///   1. Exclude self and already-followed users.
    ///   2. Prioritise users whose Goal matches the requesting user's Goal.
    ///   3. Secondary sort: workouts completed in the current calendar month (UTC).
    ///   4. Hard cap: limit is always clamped to 5.
    ///
    /// PRIVACY: only userId, displayName, avatarUrl, fitnessGoal (raw Goal string), and
    /// workoutsThisMonth are returned. BMI / weight / calories / BMR / TDEE are never included.
    /// </summary>
    public async Task<List<SuggestedUserResponse>> GetSuggestedUsersAsync(string requestingUserId, int limit = 5)
    {
        limit = Math.Min(limit, 5); // hard cap — never more than 5

        // Get the requesting user's fitness goal for priority matching
        var myGoal = await db.Users
            .Where(u => u.Id == requestingUserId)
            .Select(u => u.Goal)
            .FirstOrDefaultAsync();

        // Get already-followed user IDs (no need to suggest users the caller follows)
        var followingIds = await db.Follows
            .Where(f => f.FollowerId == requestingUserId)
            .Select(f => f.FollowingId)
            .ToHashSetAsync();

        // Pull candidate users — not self, not already followed — ordered and capped in DB
        int poolCap = limit * 3;

        var pool = await db.Users
            .AsNoTracking()
            .Where(u => u.Id != requestingUserId
                        && !followingIds.Contains(u.Id)
                        && !u.IsSystemAccount)    // exclude NovaFit Official and other system accounts
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.ImageUrl,
                u.Goal,
                GoalMatch = (!string.IsNullOrEmpty(myGoal) && u.Goal == myGoal) ? 1 : 0
            })
            .OrderByDescending(u => u.GoalMatch)
            .Take(poolCap)
            .ToListAsync();

        if (pool.Count == 0) return [];

        // Count completed sessions this month for each candidate in the pool
        var poolIds = pool.Select(u => u.Id).ToList();
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1,
            0, 0, 0, DateTimeKind.Utc);

        var workoutCounts = await db.WorkoutSessions
            .Where(s => poolIds.Contains(s.UserId) && s.FinishedAt >= monthStart)
            .GroupBy(s => s.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count);

        return pool
            .Select(u => new SuggestedUserResponse
            {
                UserId       = u.Id,
                DisplayName  = u.FullName,
                AvatarUrl    = u.ImageUrl,
                FitnessGoal  = string.IsNullOrEmpty(u.Goal) ? null : u.Goal,
                WorkoutsThisMonth = workoutCounts.GetValueOrDefault(u.Id, 0)
            })
            .OrderByDescending(u => !string.IsNullOrEmpty(myGoal) && u.FitnessGoal == myGoal ? 1 : 0)
            .ThenByDescending(u => u.WorkoutsThisMonth)
            .Take(limit)
            .ToList();
    }

    // ── User Search ───────────────────────────────────────────────────────────

    public async Task<List<UserSearchResult>> SearchUsersAsync(string query, string requestingUserId, int limit = 20)
    {
        limit = Math.Min(limit, 50);
        if (string.IsNullOrWhiteSpace(query)) return [];

        var q = query.Trim().ToLower();

        var users = await db.Users
            .Where(u => u.Id != requestingUserId
                        && u.FullName.ToLower().Contains(q)
                        && !u.IsSystemAccount)   // exclude NovaFit Official and system accounts from search
            .OrderBy(u => u.FullName)
            .Take(limit)
            .Select(u => new { u.Id, u.FullName, u.ImageUrl, u.IsVerified })
            .ToListAsync();

        var userIds = users.Select(u => u.Id).ToList();

        var followingIds = await db.Follows
            .Where(f => f.FollowerId == requestingUserId && userIds.Contains(f.FollowingId))
            .Select(f => f.FollowingId)
            .ToHashSetAsync();

        return users.Select(u => new UserSearchResult
        {
            Id = u.Id,
            DisplayName = u.FullName,
            AvatarUrl = u.ImageUrl,
            IsFollowedByMe = followingIds.Contains(u.Id),
            IsVerified = u.IsVerified
        }).ToList();
    }

    // ── Following Count ───────────────────────────────────────────────────────

    public async Task<FollowingCountDto> GetFollowingCountAsync(string userId)
        => new(await db.Follows.CountAsync(f => f.FollowerId == userId));

    // ── Private helpers ───────────────────────────────────────────────────────

    private static PostResponse MapToPostResponse(
        Post post,
        string requestingUserId,
        HashSet<int> likedPostIds,
        HashSet<string> followingIds)
    {
        return new PostResponse
        {
            Id = post.Id,
            Author = MapToUserSummary(post.User),
            Content = post.Content,
            ImageUrl = post.ImageUrl,
            LinkedContent = BuildLinkedContentPreview(post),
            LikesCount = post.LikesCount,
            CommentsCount = post.CommentsCount,
            IsLikedByMe = likedPostIds.Contains(post.Id),
            IsFollowingAuthor = post.UserId != requestingUserId && followingIds.Contains(post.UserId),
            IsOwnPost = post.UserId == requestingUserId,
            IsArchived = post.IsArchived,
            CreatedAt = post.CreatedAt,
            ArticleId = post.ArticleId,
            ArticleTitle = post.Article?.Title,
            ArticleCategory = post.Article?.Category,
            ArticleCaption = post.Article?.Caption,
            ArticleDescription = post.Article?.Description,
            ArticleImage = string.IsNullOrEmpty(post.Article?.Image) ? null : post.Article.Image
        };
    }

    public async Task<ArticleDetailResponse> GetArticleAsync(int id, string requestingUserId)
    {
        var blog = await db.BlogPosts.Include(b => b.Author)
            .FirstOrDefaultAsync(b => b.Id == id)
            ?? throw new KeyNotFoundException("Article not found.");

        var linkedPost = await db.Posts.FirstOrDefaultAsync(p => p.ArticleId == id);

        return new ArticleDetailResponse
        {
            Id = blog.Id,
            Title = blog.Title,
            Caption = blog.Caption,
            Description = blog.Description,
            Image = string.IsNullOrEmpty(blog.Image) ? null : blog.Image,
            Category = blog.Category,
            CreatedAt = blog.CreatedAt,
            Author = blog.Author != null ? MapToUserSummary(blog.Author) : new UserSummary { Id = "", DisplayName = "Unknown" },
            IsOwnArticle = blog.AuthorId == requestingUserId,
            LinkedPostId = linkedPost?.Id
        };
    }

    private static UserSummary MapToUserSummary(User user) => new()
    {
        Id = user.Id,
        DisplayName = user.FullName,
        AvatarUrl = user.ImageUrl,
        IsVerified = user.IsVerified
    };

    // ── Archive / Profile Sections ────────────────────────────────────────────

    public async Task<ArchiveToggleResponse> ToggleArchivePostAsync(int id, string userId)
    {
        var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new KeyNotFoundException("Post not found.");
        if (post.UserId != userId) throw new UnauthorizedAccessException();
        post.IsArchived = !post.IsArchived;
        await db.SaveChangesAsync();
        return new ArchiveToggleResponse { IsArchived = post.IsArchived };
    }

    public async Task<PaginatedResponse<PostResponse>> GetArchivedPostsAsync(string userId, string requestingUserId, int page, int pageSize)
    {
        pageSize = Math.Min(pageSize, 50);
        if (userId != requestingUserId)
            throw new UnauthorizedAccessException("Cannot view another user's archived posts.");
        var query = db.Posts
            .AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.LinkedWorkout)
            .Include(p => p.LinkedMeal)
            .Include(p => p.LinkedDailyEntry)
            .Include(p => p.Article)
            .AsSplitQuery()
            .Where(p => p.UserId == userId && p.IsArchived)
            .OrderByDescending(p => p.CreatedAt);

        var total = await query.CountAsync();
        var posts = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        var likedIds = await db.Likes
            .Where(l => l.UserId == userId && posts.Select(p => p.Id).Contains(l.PostId))
            .Select(l => l.PostId)
            .ToHashSetAsync();

        return new PaginatedResponse<PostResponse>
        {
            Items = posts.Select(p => MapToPostResponse(p, userId, likedIds, [])).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
            HasMore = page * pageSize < total
        };
    }

    public async Task<PaginatedResponse<ProfileWorkoutSummary>> GetProfileWorkoutsAsync(string userId, string requestingUserId, int page, int pageSize)
    {
        pageSize = Math.Min(pageSize, 50);
        var query = db.WorkoutTemplates
            .AsNoTracking()
            .Where(w => w.UserId == userId && !w.IsArchived)
            .OrderByDescending(w => w.CreatedAt);

        var total = await query.CountAsync();
        var workouts = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return new PaginatedResponse<ProfileWorkoutSummary>
        {
            Items = workouts.Select(w => new ProfileWorkoutSummary
            {
                Id = w.Id,
                Title = w.Title,
                Type = w.Type,
                DurationMin = w.DurationMin,
                CaloriesEstimateKcal = w.CaloriesEstimateKcal,
                CreatedAt = w.CreatedAt,
                IsArchived = w.IsArchived,
                IsOwnWorkout = w.UserId == requestingUserId
            }).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
            HasMore = page * pageSize < total
        };
    }

    public async Task<PaginatedResponse<ProfileWorkoutSummary>> GetArchivedWorkoutsAsync(string userId, int page, int pageSize)
    {
        pageSize = Math.Min(pageSize, 50);
        var query = db.WorkoutTemplates
            .AsNoTracking()
            .Where(w => w.UserId == userId && w.IsArchived)
            .OrderByDescending(w => w.CreatedAt);

        var total = await query.CountAsync();
        var workouts = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return new PaginatedResponse<ProfileWorkoutSummary>
        {
            Items = workouts.Select(w => new ProfileWorkoutSummary
            {
                Id = w.Id,
                Title = w.Title,
                Type = w.Type,
                DurationMin = w.DurationMin,
                CaloriesEstimateKcal = w.CaloriesEstimateKcal,
                CreatedAt = w.CreatedAt,
                IsArchived = w.IsArchived,
                IsOwnWorkout = true
            }).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
            HasMore = page * pageSize < total
        };
    }

    public async Task<ArchiveToggleResponse> ToggleArchiveWorkoutAsync(int id, string userId)
    {
        var w = await db.WorkoutTemplates.FirstOrDefaultAsync(w => w.Id == id)
            ?? throw new KeyNotFoundException("Workout not found.");
        if (w.UserId != userId) throw new UnauthorizedAccessException();
        w.IsArchived = !w.IsArchived;
        await db.SaveChangesAsync();
        return new ArchiveToggleResponse { IsArchived = w.IsArchived };
    }

    public async Task DeleteWorkoutFromProfileAsync(int id, string userId)
    {
        var w = await db.WorkoutTemplates.FirstOrDefaultAsync(w => w.Id == id);
        if (w is null) return;
        if (w.UserId != userId) throw new UnauthorizedAccessException();
        db.WorkoutTemplates.Remove(w);
        await db.SaveChangesAsync();
    }

    public async Task<PaginatedResponse<ProfileBlogSummary>> GetProfileBlogsAsync(string userId, string requestingUserId, int page, int pageSize)
    {
        pageSize = Math.Min(pageSize, 50);
        var query = db.BlogPosts
            .AsNoTracking()
            .Where(b => b.AuthorId == userId && !b.IsArchived)
            .OrderByDescending(b => b.CreatedAt);

        var total = await query.CountAsync();
        var blogs = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return new PaginatedResponse<ProfileBlogSummary>
        {
            Items = blogs.Select(b => new ProfileBlogSummary
            {
                Id = b.Id,
                Title = b.Title,
                Caption = b.Caption,
                Description = b.Description,
                Image = string.IsNullOrEmpty(b.Image) ? null : b.Image,
                Category = b.Category,
                CreatedAt = b.CreatedAt,
                IsArchived = b.IsArchived,
                IsOwnBlog = b.AuthorId == requestingUserId
            }).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
            HasMore = page * pageSize < total
        };
    }

    public async Task<ArchiveToggleResponse> ToggleArchiveBlogAsync(int id, string userId)
    {
        var b = await db.BlogPosts.FirstOrDefaultAsync(b => b.Id == id)
            ?? throw new KeyNotFoundException("Blog not found.");
        if (b.AuthorId != userId) throw new UnauthorizedAccessException();
        b.IsArchived = !b.IsArchived;

        // Keep the linked feed post in sync with the article's archive state
        var linkedPost = await db.Posts.FirstOrDefaultAsync(p => p.ArticleId == id);
        if (linkedPost is not null)
            linkedPost.IsArchived = b.IsArchived;

        await db.SaveChangesAsync();
        return new ArchiveToggleResponse { IsArchived = b.IsArchived };
    }

    public async Task DeleteBlogFromProfileAsync(int id, string userId)
    {
        var b = await db.BlogPosts.FirstOrDefaultAsync(b => b.Id == id);
        if (b is null) return;
        if (b.AuthorId != userId) throw new UnauthorizedAccessException();

        // Remove the linked feed post so it no longer appears in followers' feeds
        var linkedPost = await db.Posts.FirstOrDefaultAsync(p => p.ArticleId == id);
        if (linkedPost is not null)
            db.Posts.Remove(linkedPost);

        db.BlogPosts.Remove(b);
        await db.SaveChangesAsync();
    }

    public async Task UpdateBioAsync(string userId, string? bio)
    {
        var user = await db.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");
        user.Bio = bio;
        await db.SaveChangesAsync();
    }

    public async Task<ProfileBlogSummary> CreateUserBlogAsync(string userId, CreateUserBlogRequest request)
    {
        var blog = new BlogPost
        {
            Title = request.Title,
            Caption = request.Caption,
            Description = request.Description,
            Category = request.Category,
            Image = request.Image ?? string.Empty,
            Date = DateTime.UtcNow.ToString("MMMM d, yyyy"),
            AuthorId = userId
        };
        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            db.BlogPosts.Add(blog);
            await db.SaveChangesAsync(); // obține blog.Id pentru FK

            // Create a linked feed post so followers see the article
            var feedPost = new Post
            {
                UserId = userId,
                Content = !string.IsNullOrWhiteSpace(request.Caption)
                    ? request.Caption
                    : !string.IsNullOrWhiteSpace(request.Title)
                        ? request.Title
                        : request.Description[..Math.Min(150, request.Description.Length)],
                ArticleId = blog.Id
            };
            db.Posts.Add(feedPost);
            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        return new ProfileBlogSummary
        {
            Id = blog.Id, Title = blog.Title, Caption = blog.Caption,
            Description = blog.Description,
            Image = string.IsNullOrEmpty(blog.Image) ? null : blog.Image,
            Category = blog.Category, CreatedAt = blog.CreatedAt,
            IsArchived = false, IsOwnBlog = true
        };
    }

    public async Task<ProfileBlogSummary> UpdateUserBlogAsync(int id, string userId, UpdateUserBlogRequest request)
    {
        var blog = await db.BlogPosts.FirstOrDefaultAsync(b => b.Id == id)
            ?? throw new KeyNotFoundException("Blog not found.");
        if (blog.AuthorId != userId) throw new UnauthorizedAccessException();

        blog.Title = request.Title;
        blog.Caption = request.Caption;
        blog.Description = request.Description;
        blog.Category = request.Category;
        blog.Image = request.Image ?? string.Empty;
        blog.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return new ProfileBlogSummary
        {
            Id = blog.Id, Title = blog.Title, Caption = blog.Caption,
            Description = blog.Description,
            Image = string.IsNullOrEmpty(blog.Image) ? null : blog.Image,
            Category = blog.Category, CreatedAt = blog.CreatedAt,
            IsArchived = blog.IsArchived, IsOwnBlog = true
        };
    }

    // ── Fix 2: Share to beSocial ──────────────────────────────────────────────

    /// <summary>
    /// Creates a pre-composed social post from a completed workout session.
    ///
    /// Content format (no caption):
    ///   🏋️ Pull Day A
    ///   ⏱️ 47 min · 3 exercises · 12 sets
    ///
    /// Content format (with caption):
    ///   Crushed it today! 💪
    ///
    ///   🏋️ Pull Day A
    ///   ⏱️ 47 min · 3 exercises · 12 sets
    ///
    /// PRIVACY ENFORCEMENT — none of the following are written to Post.Content:
    ///   - WorkoutSession.EstimatedCaloriesKcal  (calories burned = health metric)
    ///   - WorkoutTemplate.CaloriesEstimateKcal  (calorie estimate = health metric)
    ///   - WorkoutSessionSet.ActualWeightKg      (exercise weight = body-capacity metric)
    ///   - WorkoutSessionSet.ActualReps          (not included for simplicity in v1)
    /// </summary>
    public async Task<SharePostResponse> CreatePostFromWorkoutAsync(
        string userId, int sessionId, PostFromWorkoutRequest? request)
    {
        // Load session + Sets for exercise-count calculation.
        // Ownership check: session.UserId == userId — KeyNotFoundException on failure.
        var session = await db.WorkoutSessions
            .AsNoTracking()
            .Include(s => s.Sets)
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId)
            ?? throw new KeyNotFoundException("Workout session not found.");

        // Distinct exercise count from set rows.
        // OrdinalIgnoreCase: defensive; ExerciseName values are already trimmed on save.
        var exerciseCount = session.Sets
            .Select(s => s.ExerciseName)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Count();

        // Server-composed body — PRIVACY: only title, duration, counts; zero health metrics.
        var body = $"🏋️ {session.TemplateTitle}\n⏱️ {session.DurationMin} min · {exerciseCount} exercises · {session.SetsCompleted} sets";

        var content = !string.IsNullOrWhiteSpace(request?.Caption)
            ? $"{request.Caption.Trim()}\n\n{body}"
            : body;

        // Link to WorkoutTemplate FK (nullable — null when the template was deleted;
        // the post is still created because TemplateTitle is snapshotted in the session).
        var post = new Post
        {
            UserId = userId,
            Content = content,
            LinkedWorkoutId = session.WorkoutTemplateId   // may be null — that is fine
        };

        db.Posts.Add(post);
        await db.SaveChangesAsync();

        return new SharePostResponse { PostId = post.Id, PreviewText = content };
    }

    /// <summary>
    /// Creates a pre-composed social post from a logged meal entry.
    ///
    /// Content format (no caption):
    ///   🍽️ Chicken &amp; Rice Bowl
    ///
    /// Content format (with caption):
    ///   Post-workout fuel 🔥
    ///
    ///   🍽️ Chicken &amp; Rice Bowl
    ///
    /// PRIVACY ENFORCEMENT — none of the following are written to Post.Content:
    ///   - MealEntry.TotalCalories    (calorie intake = health metric)
    ///   - MealEntry.TotalProtein_g   (macro = health metric)
    ///   - MealEntry.TotalCarbs_g     (macro = health metric)
    ///   - MealEntry.TotalFats_g      (macro = health metric)
    ///   - MealEntry.TotalGrams       (food weight = not useful publicly)
    ///   - FoodItem.*                 (individual item data = health metric)
    /// The projection below selects ONLY Id and Name from the DB row to enforce this
    /// at the query level — macro columns are never materialised into the service method.
    /// </summary>
    public async Task<SharePostResponse> CreatePostFromMealAsync(
        string userId, int mealId, PostFromMealRequest? request)
    {
        // Project only Id + Name — PRIVACY: macro/calorie columns are never loaded.
        // Ownership check: meal.UserId == userId — KeyNotFoundException on failure.
        var meal = await db.MealEntries
            .AsNoTracking()
            .Where(m => m.Id == mealId && m.UserId == userId)
            .Select(m => new { m.Id, m.Name })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Meal entry not found.");

        // Server-composed body — PRIVACY: only meal name; no calories, macros, or items.
        var body = $"🍽️ {meal.Name}";

        var content = !string.IsNullOrWhiteSpace(request?.Caption)
            ? $"{request.Caption.Trim()}\n\n{body}"
            : body;

        var post = new Post
        {
            UserId = userId,
            Content = content,
            LinkedMealId = mealId
        };

        db.Posts.Add(post);
        await db.SaveChangesAsync();

        return new SharePostResponse { PostId = post.Id, PreviewText = content };
    }

    private static LinkedContentPreview? BuildLinkedContentPreview(Post post)
    {
        if (post.LinkedWorkout is not null)
            return new LinkedContentPreview
            {
                Type = "workout",
                Title = post.LinkedWorkout.Title,
                Subtitle = $"{post.LinkedWorkout.DurationMin} min · {post.LinkedWorkout.Type}"
            };

        if (post.LinkedMeal is not null)
            return new LinkedContentPreview
            {
                Type = "meal",
                Title = post.LinkedMeal.Name,
                Subtitle = post.LinkedMeal.Type
            };

        if (post.LinkedDailyEntry is not null)
            return new LinkedContentPreview
            {
                Type = "daily",
                Title = $"Daily Log — {post.LinkedDailyEntry.Date}",
                Subtitle = $"{post.LinkedDailyEntry.Steps} steps"
            };

        return null;
    }
}
