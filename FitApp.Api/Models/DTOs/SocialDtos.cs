using System.ComponentModel.DataAnnotations;

namespace FitApp.Api.Models.DTOs;

// ── Shared ────────────────────────────────────────────────────────────────────

public class UserSummary
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
}

public class LinkedContentPreview
{
    public string Type { get; set; } = string.Empty;   // "workout" | "meal" | "daily"
    public string Title { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
}

public class PaginatedResponse<T>
{
    public List<T> Items { get; set; } = [];
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public bool HasMore { get; set; }
}

// ── Requests ──────────────────────────────────────────────────────────────────

public class CreatePostRequest
{
    [Required]
    [MaxLength(500)]
    public string Content { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }
    public int? LinkedWorkoutId { get; set; }
    public int? LinkedMealId { get; set; }
    public int? LinkedDailyEntryId { get; set; }
}

public class CreateCommentRequest
{
    [Required]
    [MaxLength(300)]
    public string Content { get; set; } = string.Empty;
}

// ── Responses ─────────────────────────────────────────────────────────────────

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

    // Article-type post fields (null for regular posts)
    public int? ArticleId { get; set; }
    public string? ArticleTitle { get; set; }
    public string? ArticleCategory { get; set; }
    public string? ArticleCaption { get; set; }
    public string? ArticleDescription { get; set; }
    public string? ArticleImage { get; set; }
}

public class ArticleDetailResponse
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Caption { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Image { get; set; }
    public string Category { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public UserSummary Author { get; set; } = null!;
    public bool IsOwnArticle { get; set; }
    public int? LinkedPostId { get; set; }
}

public class UpdatePostRequest
{
    [Required]
    [MaxLength(500)]
    public string Content { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }
}

public class LikeToggleResponse
{
    public bool IsLiked { get; set; }
    public int LikesCount { get; set; }
}

public class FollowToggleResponse
{
    public bool IsFollowing { get; set; }
    public int FollowersCount { get; set; }
}

public class CommentResponse
{
    public int Id { get; set; }
    public UserSummary Author { get; set; } = null!;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsOwnComment { get; set; }
}

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
}

public class UserSearchResult
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public bool IsFollowedByMe { get; set; }
}

public class ProfileWorkoutSummary
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int DurationMin { get; set; }
    public int CaloriesEstimateKcal { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsArchived { get; set; }
    public bool IsOwnWorkout { get; set; }
}

public class ProfileBlogSummary
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Caption { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Image { get; set; }
    public string Category { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsArchived { get; set; }
    public bool IsOwnBlog { get; set; }
}

public class ArchiveToggleResponse
{
    public bool IsArchived { get; set; }
}

/// <summary>
/// Response for GET /api/social/discover/suggested.
/// Used by the social feed guided-empty-state to show up to 5 follow suggestions.
///
/// PRIVACY CONSTRAINT: must NEVER include BMI, weight, calories, BMR, or TDEE.
/// FitnessGoal is the raw User.Goal string ("lose" | "gain" | "maintain") — safe to expose.
/// WorkoutsThisMonth is a count with no health data embedded.
/// </summary>
public class SuggestedUserResponse
{
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }

    /// <summary>
    /// Raw User.Goal value: "lose" | "gain" | "maintain" — or null if the user hasn't set one.
    /// Frontend maps these to badge colours; not the same as calories or health metrics.
    /// </summary>
    public string? FitnessGoal { get; set; }

    /// <summary>
    /// Number of completed workout sessions in the current calendar month (UTC).
    /// Zero when the user has no sessions this month.
    /// </summary>
    public int WorkoutsThisMonth { get; set; }
}

/// <summary>
/// Response for GET /api/social/profile/me/following-count.
/// Returns the number of users the authenticated user is currently following.
/// </summary>
public record FollowingCountDto(int Count);

public class UpdateBioRequest
{
    [MaxLength(200)]
    public string? Bio { get; set; }
}

public class CreateUserBlogRequest
{
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Caption { get; set; } = string.Empty;

    [MaxLength(8000)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(60)]
    public string Category { get; set; } = string.Empty;

    public string? Image { get; set; }
}

public class UpdateUserBlogRequest
{
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Caption { get; set; } = string.Empty;

    [MaxLength(8000)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(60)]
    public string Category { get; set; } = string.Empty;

    public string? Image { get; set; }
}
