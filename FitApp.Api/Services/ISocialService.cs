using FitApp.Api.Models.DTOs;

namespace FitApp.Api.Services;

public interface ISocialService
{
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
    Task<ArchiveToggleResponse> ToggleArchiveWorkoutAsync(int id, string userId);
    Task DeleteWorkoutFromProfileAsync(int id, string userId);
    Task<PaginatedResponse<ProfileBlogSummary>> GetProfileBlogsAsync(string userId, string requestingUserId, int page, int pageSize);
    Task<ArchiveToggleResponse> ToggleArchiveBlogAsync(int id, string userId);
    Task DeleteBlogFromProfileAsync(int id, string userId);
    Task UpdateBioAsync(string userId, string? bio);
    Task<ProfileBlogSummary> CreateUserBlogAsync(string userId, CreateUserBlogRequest request);
    Task<ProfileBlogSummary> UpdateUserBlogAsync(int id, string userId, UpdateUserBlogRequest request);
    Task<ArticleDetailResponse> GetArticleAsync(int id, string requestingUserId);
}
