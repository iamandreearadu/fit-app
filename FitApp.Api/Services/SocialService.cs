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

    // ── Feed ──────────────────────────────────────────────────────────────────

    public async Task<PaginatedResponse<PostResponse>> GetFeedAsync(string userId, int page, int pageSize)
    {
        var followingIds = await db.Follows
            .Where(f => f.FollowerId == userId)
            .Select(f => f.FollowingId)
            .ToListAsync();

        // Include own posts
        var allowedUserIds = followingIds.Append(userId).ToList();

        var query = db.Posts
            .Include(p => p.User)
            .Include(p => p.LinkedWorkout)
            .Include(p => p.LinkedMeal)
            .Include(p => p.LinkedDailyEntry)
            .Include(p => p.Article)
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

        var items = posts.Select(p => MapToPostResponse(p, userId, likedPostIds, followingIds.ToHashSet())).ToList();

        return new PaginatedResponse<PostResponse>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
            HasMore = page * pageSize < total
        };
    }

    // ── Discover ──────────────────────────────────────────────────────────────

    public async Task<PaginatedResponse<PostResponse>> GetDiscoverAsync(string userId, int page, int pageSize)
    {
        var followingIds = await db.Follows
            .Where(f => f.FollowerId == userId)
            .Select(f => f.FollowingId)
            .ToHashSetAsync();

        var query = db.Posts
            .Include(p => p.User)
            .Include(p => p.LinkedWorkout)
            .Include(p => p.LinkedMeal)
            .Include(p => p.LinkedDailyEntry)
            .Include(p => p.Article)
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

        await db.Entry(post).Reference(p => p.User).LoadAsync();
        if (post.LinkedWorkoutId.HasValue) await db.Entry(post).Reference(p => p.LinkedWorkout).LoadAsync();
        if (post.LinkedMealId.HasValue) await db.Entry(post).Reference(p => p.LinkedMeal).LoadAsync();
        if (post.LinkedDailyEntryId.HasValue) await db.Entry(post).Reference(p => p.LinkedDailyEntry).LoadAsync();

        return MapToPostResponse(post, userId, [], []);
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

        if (existing is not null)
        {
            db.Likes.Remove(existing);
            post.LikesCount = Math.Max(0, post.LikesCount - 1);
            isLiked = false;
        }
        else
        {
            db.Likes.Add(new Like { UserId = userId, PostId = postId });
            post.LikesCount++;
            isLiked = true;
        }

        // Load actor before SaveChanges to avoid a post-commit round-trip
        var actor = await db.Users.FindAsync(userId);
        await db.SaveChangesAsync();

        if (isLiked)
        {
            var actorName = actor?.FullName ?? "Someone";
            await notifications.CreateAndPushAsync(
                post.UserId,
                userId,
                NotificationType.Like,
                postId,
                $"{actorName} liked your post");
        }

        return new LikeToggleResponse { IsLiked = isLiked, LikesCount = post.LikesCount };
    }

    // ── Comments ──────────────────────────────────────────────────────────────

    public async Task<PaginatedResponse<CommentResponse>> GetCommentsAsync(int postId, int page, int pageSize, string requestingUserId)
    {
        var query = db.Comments
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
        post.CommentsCount++;
        await db.SaveChangesAsync();

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
        comment.Post.CommentsCount = Math.Max(0, comment.Post.CommentsCount - 1);
        await db.SaveChangesAsync();
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
            IsOwnProfile = userId == requestingUserId
        };
    }

    public async Task<PaginatedResponse<PostResponse>> GetProfilePostsAsync(string userId, string requestingUserId, int page, int pageSize)
    {
        var followingIds = await db.Follows
            .Where(f => f.FollowerId == requestingUserId)
            .Select(f => f.FollowingId)
            .ToHashSetAsync();

        var query = db.Posts
            .Include(p => p.User)
            .Include(p => p.LinkedWorkout)
            .Include(p => p.LinkedMeal)
            .Include(p => p.LinkedDailyEntry)
            .Include(p => p.Article)
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

    // ── User Search ───────────────────────────────────────────────────────────

    public async Task<List<UserSearchResult>> SearchUsersAsync(string query, string requestingUserId, int limit = 20)
    {
        if (string.IsNullOrWhiteSpace(query)) return [];

        var q = query.Trim().ToLower();

        var users = await db.Users
            .Where(u => u.Id != requestingUserId && u.FullName.ToLower().Contains(q))
            .OrderBy(u => u.FullName)
            .Take(limit)
            .ToListAsync();

        var followingIds = await db.Follows
            .Where(f => f.FollowerId == requestingUserId && users.Select(u => u.Id).Contains(f.FollowingId))
            .Select(f => f.FollowingId)
            .ToHashSetAsync();

        return users.Select(u => new UserSearchResult
        {
            Id = u.Id,
            DisplayName = u.FullName,
            AvatarUrl = u.ImageUrl,
            IsFollowedByMe = followingIds.Contains(u.Id)
        }).ToList();
    }

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
            ArticleDescription = post.Article?.Description
        };
    }

    public async Task<ArticleDetailResponse> GetArticleAsync(int id, string requestingUserId)
    {
        var article = await db.UserArticles.Include(a => a.Author)
            .FirstOrDefaultAsync(a => a.Id == id)
            ?? throw new KeyNotFoundException("Article not found.");

        var linkedPost = await db.Posts.FirstOrDefaultAsync(p => p.ArticleId == id);

        var isLikedByMe = linkedPost != null &&
            await db.Likes.AnyAsync(l => l.PostId == linkedPost.Id && l.UserId == requestingUserId);

        return new ArticleDetailResponse
        {
            Id = article.Id,
            Title = article.Title,
            Caption = article.Caption,
            Description = article.Description,
            Image = string.IsNullOrEmpty(article.Image) ? null : article.Image,
            Category = article.Category,
            CreatedAt = article.CreatedAt,
            Author = MapToUserSummary(article.Author),
            IsOwnArticle = article.AuthorId == requestingUserId,
            LinkedPostId = linkedPost?.Id,
            IsLikedByMe = isLikedByMe,
            LikesCount = linkedPost?.LikesCount ?? 0,
            CommentsCount = linkedPost?.CommentsCount ?? 0
        };
    }

    public async Task<PostResponse> GetPostByIdAsync(int postId, string viewerId)
    {
        var post = await db.Posts
            .Include(p => p.User)
            .Include(p => p.LinkedWorkout)
            .Include(p => p.LinkedMeal)
            .Include(p => p.LinkedDailyEntry)
            .Include(p => p.Article)
            .FirstOrDefaultAsync(p => p.Id == postId && !p.IsArchived)
            ?? throw new KeyNotFoundException("Post not found.");

        var likedPostIds = await db.Likes
            .Where(l => l.UserId == viewerId && l.PostId == postId)
            .Select(l => l.PostId)
            .ToHashSetAsync();

        var followingIds = await db.Follows
            .Where(f => f.FollowerId == viewerId)
            .Select(f => f.FollowingId)
            .ToHashSetAsync();

        return MapToPostResponse(post, viewerId, likedPostIds, followingIds);
    }

    private static UserSummary MapToUserSummary(User user) => new()
    {
        Id = user.Id,
        DisplayName = user.FullName,
        AvatarUrl = user.ImageUrl
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
        if (userId != requestingUserId)
            throw new UnauthorizedAccessException("Cannot view another user's archived posts.");
        var query = db.Posts
            .Include(p => p.User)
            .Include(p => p.LinkedWorkout)
            .Include(p => p.LinkedMeal)
            .Include(p => p.LinkedDailyEntry)
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
        var query = db.WorkoutTemplates
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
        var query = db.UserArticles
            .Where(a => a.AuthorId == userId && !a.IsArchived)
            .OrderByDescending(a => a.CreatedAt);

        var total = await query.CountAsync();
        var articles = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return new PaginatedResponse<ProfileBlogSummary>
        {
            Items = articles.Select(a => new ProfileBlogSummary
            {
                Id = a.Id,
                Title = a.Title,
                Caption = a.Caption,
                Description = a.Description,
                Image = string.IsNullOrEmpty(a.Image) ? null : a.Image,
                Category = a.Category,
                CreatedAt = a.CreatedAt,
                IsArchived = a.IsArchived,
                IsOwnBlog = a.AuthorId == requestingUserId
            }).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
            HasMore = page * pageSize < total
        };
    }

    public async Task<ArchiveToggleResponse> ToggleArchiveBlogAsync(int id, string userId)
    {
        var article = await db.UserArticles.FirstOrDefaultAsync(a => a.Id == id)
            ?? throw new KeyNotFoundException("Article not found.");
        if (article.AuthorId != userId) throw new UnauthorizedAccessException();
        article.IsArchived = !article.IsArchived;

        var linkedPost = await db.Posts.FirstOrDefaultAsync(p => p.ArticleId == id);
        if (linkedPost is not null)
            linkedPost.IsArchived = article.IsArchived;

        await db.SaveChangesAsync();
        return new ArchiveToggleResponse { IsArchived = article.IsArchived };
    }

    public async Task DeleteBlogFromProfileAsync(int id, string userId)
    {
        var article = await db.UserArticles.FirstOrDefaultAsync(a => a.Id == id);
        if (article is null) return;
        if (article.AuthorId != userId) throw new UnauthorizedAccessException();

        db.UserArticles.Remove(article);
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
        var article = new UserArticle
        {
            AuthorId = userId,
            Title = request.Title,
            Caption = request.Caption,
            Description = request.Description,
            Category = request.Category,
            Image = request.Image ?? string.Empty
        };
        db.UserArticles.Add(article);
        await db.SaveChangesAsync();

        // Create a linked feed post so followers see the article
        var feedPost = new Post
        {
            UserId = userId,
            Content = request.Caption ?? request.Title,
            ArticleId = article.Id
        };
        db.Posts.Add(feedPost);
        await db.SaveChangesAsync();

        return new ProfileBlogSummary
        {
            Id = article.Id, Title = article.Title, Caption = article.Caption,
            Description = article.Description,
            Image = string.IsNullOrEmpty(article.Image) ? null : article.Image,
            Category = article.Category, CreatedAt = article.CreatedAt,
            IsArchived = false, IsOwnBlog = true
        };
    }

    public async Task<ProfileBlogSummary> UpdateUserBlogAsync(int id, string userId, UpdateUserBlogRequest request)
    {
        var article = await db.UserArticles.FirstOrDefaultAsync(a => a.Id == id)
            ?? throw new KeyNotFoundException("Article not found.");
        if (article.AuthorId != userId) throw new UnauthorizedAccessException();

        article.Title = request.Title;
        article.Caption = request.Caption;
        article.Description = request.Description;
        article.Category = request.Category;
        article.Image = request.Image ?? string.Empty;
        article.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return new ProfileBlogSummary
        {
            Id = article.Id, Title = article.Title, Caption = article.Caption,
            Description = article.Description,
            Image = string.IsNullOrEmpty(article.Image) ? null : article.Image,
            Category = article.Category, CreatedAt = article.CreatedAt,
            IsArchived = article.IsArchived, IsOwnBlog = true
        };
    }

    // Design-system color tokens — frontend derives color from Type, these are hints for clients that use BadgeColor
    private const string ColorWorkout  = "#7c4dff";
    private const string ColorNutrition = "#ff4081";
    private const string ColorDaily    = "#00bcd4";

    private static LinkedContentPreview? BuildLinkedContentPreview(Post post)
    {
        if (post.LinkedWorkout is not null)
            return new LinkedContentPreview
            {
                Type = "workout",
                Title = post.LinkedWorkout.Title,
                Subtitle = $"{post.LinkedWorkout.DurationMin} min · {post.LinkedWorkout.CaloriesEstimateKcal} kcal",
                BadgeColor = ColorWorkout
            };

        if (post.LinkedMeal is not null)
            return new LinkedContentPreview
            {
                Type = "meal",
                Title = post.LinkedMeal.Name,
                Subtitle = $"{post.LinkedMeal.Type} · {Math.Round(post.LinkedMeal.TotalCalories)} kcal",
                BadgeColor = ColorNutrition
            };

        if (post.LinkedDailyEntry is not null)
            return new LinkedContentPreview
            {
                Type = "daily",
                Title = $"Daily Log — {post.LinkedDailyEntry.Date}",
                Subtitle = $"{post.LinkedDailyEntry.Steps} steps · {post.LinkedDailyEntry.CaloriesBurned} kcal burned",
                BadgeColor = ColorDaily
            };

        return null;
    }
}
