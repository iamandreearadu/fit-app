using FitApp.Api.Models.DTOs;

namespace FitApp.Api.Services;

public interface ISocialService
{
    Task<PostResponse> GetPostByIdAsync(int id, string requestingUserId);
    Task<PaginatedResponse<PostResponse>> GetFeedAsync(string userId, int page, int pageSize);
    Task<PaginatedResponse<PostResponse>> GetDiscoverAsync(string userId, int page, int pageSize);
    Task<PostResponse> CreatePostAsync(string userId, CreatePostRequest request);
    Task DeletePostAsync(int id, string userId);
    Task<PostResponse> UpdatePostAsync(int id, string userId, UpdatePostRequest request);
    Task<LikeToggleResponse> ToggleLikeAsync(int postId, string userId);
    Task<PaginatedResponse<CommentResponse>> GetCommentsAsync(int postId, int page, int pageSize, string requestingUserId);
    Task<CommentResponse> AddCommentAsync(int postId, string userId, CreateCommentRequest request);
    Task DeleteCommentAsync(int postId, int commentId, string userId);
    Task<FollowToggleResponse> ToggleFollowAsync(string targetUserId, string userId);
    Task<UserSocialProfileResponse> GetProfileAsync(string userId, string requestingUserId);
    Task<PaginatedResponse<PostResponse>> GetProfilePostsAsync(string userId, string requestingUserId, int page, int pageSize);
    Task<List<UserSearchResult>> SearchUsersAsync(string query, string requestingUserId, int limit = 20);
    Task<ArchiveToggleResponse> ToggleArchivePostAsync(int id, string userId);
    Task<PaginatedResponse<PostResponse>> GetArchivedPostsAsync(string userId, string requestingUserId, int page, int pageSize);
    Task<PaginatedResponse<ProfileWorkoutSummary>> GetProfileWorkoutsAsync(string userId, string requestingUserId, int page, int pageSize);
    Task<PaginatedResponse<ProfileWorkoutSummary>> GetArchivedWorkoutsAsync(string userId, int page, int pageSize);
    Task<ArchiveToggleResponse> ToggleArchiveWorkoutAsync(int id, string userId);
    Task DeleteWorkoutFromProfileAsync(int id, string userId);
    Task<PaginatedResponse<ProfileBlogSummary>> GetProfileBlogsAsync(string userId, string requestingUserId, int page, int pageSize);
    Task<ArchiveToggleResponse> ToggleArchiveBlogAsync(int id, string userId);
    Task DeleteBlogFromProfileAsync(int id, string userId);
    Task UpdateBioAsync(string userId, string? bio);
    Task<ProfileBlogSummary> CreateUserBlogAsync(string userId, CreateUserBlogRequest request);
    Task<ProfileBlogSummary> UpdateUserBlogAsync(int id, string userId, UpdateUserBlogRequest request);
    Task<ArticleDetailResponse> GetArticleAsync(int id, string requestingUserId);

    /// <summary>
    /// Returns up to <paramref name="limit"/> user suggestions for the social feed guided
    /// empty state. Same-goal users are prioritised; then sorted by workouts this month.
    /// NEVER exposes BMI, weight, calories, BMR or TDEE.
    /// </summary>
    Task<List<SuggestedUserResponse>> GetSuggestedUsersAsync(string requestingUserId, int limit = 5);

    /// <summary>
    /// Returns the count of users that <paramref name="userId"/> is currently following.
    /// Used by GET /api/social/profile/me/following-count to avoid a full profile fetch.
    /// </summary>
    Task<FollowingCountDto> GetFollowingCountAsync(string userId);

    /// <summary>
    /// Returns a paginated list of users who follow <paramref name="targetUserId"/>.
    /// Each item includes IsFollowedByMe relative to <paramref name="requestingUserId"/>.
    /// </summary>
    Task<PaginatedResponse<FollowUserDto>> GetFollowersAsync(
        string targetUserId, string requestingUserId, int page, int pageSize);

    /// <summary>
    /// Returns a paginated list of users that <paramref name="targetUserId"/> is following.
    /// Each item includes IsFollowedByMe relative to <paramref name="requestingUserId"/>.
    /// </summary>
    Task<PaginatedResponse<FollowUserDto>> GetFollowingAsync(
        string targetUserId, string requestingUserId, int page, int pageSize);

    // ── Fix 2: Share to beSocial ──────────────────────────────────────────────

    /// <summary>
    /// Creates a pre-composed social post from a completed workout session.
    /// Ownership is enforced: throws <see cref="KeyNotFoundException"/> when the session
    /// is not found or belongs to a different user.
    ///
    /// PRIVACY: generated Content includes only TemplateTitle, DurationMin, exerciseCount,
    /// SetsCompleted. EstimatedCaloriesKcal, ActualWeightKg, and all health metrics are
    /// NEVER written to Post.Content.
    /// </summary>
    Task<SharePostResponse> CreatePostFromWorkoutAsync(
        string userId, int sessionId, PostFromWorkoutRequest? request);

    /// <summary>
    /// Creates a pre-composed social post from a logged meal entry.
    /// Ownership is enforced: throws <see cref="KeyNotFoundException"/> when the meal
    /// is not found or belongs to a different user.
    ///
    /// PRIVACY: generated Content includes only MealEntry.Name. TotalCalories,
    /// TotalProtein_g, TotalCarbs_g, TotalFats_g, TotalGrams, and all FoodItem data
    /// are NEVER written to Post.Content.
    /// </summary>
    Task<SharePostResponse> CreatePostFromMealAsync(
        string userId, int mealId, PostFromMealRequest? request);

    /// <summary>
    /// Returns trending posts from the last 7 days, ranked by engagement score
    /// (LikesCount * 2 + CommentsCount), excluding the requesting user's own posts.
    /// Capped at <paramref name="pageSize"/> (max 20).
    /// </summary>
    Task<List<PostResponse>> GetTrendingAsync(string userId, int pageSize);
}
