using System.Security.Claims;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FitApp.Api.Controllers;

[ApiController]
[Route("api/social")]
[Authorize]
public class SocialController(ISocialService socialService, ILogger<SocialController> logger) : ControllerBase
{
    private string UserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException("User identity not resolved.");

    // GET /api/social/feed
    [HttpGet("feed")]
    public async Task<IActionResult> GetFeed([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        try
        {
            return Ok(await socialService.GetFeedAsync(UserId, page, pageSize));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error getting feed for user {UserId}", UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // GET /api/social/discover
    [HttpGet("discover")]
    public async Task<IActionResult> GetDiscover([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        try
        {
            return Ok(await socialService.GetDiscoverAsync(UserId, page, pageSize));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error getting discover for user {UserId}", UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // POST /api/social/posts
    [HttpPost("posts")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> CreatePost([FromBody] CreatePostRequest request)
    {
        try
        {
            var result = await socialService.CreatePostAsync(UserId, request);
            return StatusCode(StatusCodes.Status201Created, result);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return Problem(statusCode: 400, detail: ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error creating post for user {UserId}", UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // PATCH /api/social/posts/{id}
    [HttpPatch("posts/{id:int}")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> UpdatePost(int id, [FromBody] UpdatePostRequest request)
    {
        try
        {
            var result = await socialService.UpdatePostAsync(id, UserId, request);
            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (KeyNotFoundException ex)
        {
            return Problem(statusCode: 404, detail: ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error updating post {PostId} for user {UserId}", id, UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // DELETE /api/social/posts/{id}
    [HttpDelete("posts/{id:int}")]
    public async Task<IActionResult> DeletePost(int id)
    {
        try
        {
            await socialService.DeletePostAsync(id, UserId);
            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error deleting post {PostId} for user {UserId}", id, UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // POST /api/social/posts/{id}/like
    [HttpPost("posts/{id:int}/like")]
    public async Task<IActionResult> ToggleLike(int id)
    {
        try
        {
            return Ok(await socialService.ToggleLikeAsync(id, UserId));
        }
        catch (InvalidOperationException ex)
        {
            return Problem(statusCode: 400, detail: ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return Problem(statusCode: 404, detail: ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error toggling like on post {PostId} for user {UserId}", id, UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // GET /api/social/posts/{id}/comments
    [HttpGet("posts/{id:int}/comments")]
    public async Task<IActionResult> GetComments(int id, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        try
        {
            return Ok(await socialService.GetCommentsAsync(id, page, pageSize, UserId));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error getting comments for post {PostId}", id);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // POST /api/social/posts/{id}/comments
    [HttpPost("posts/{id:int}/comments")]
    public async Task<IActionResult> AddComment(int id, [FromBody] CreateCommentRequest request)
    {
        try
        {
            var result = await socialService.AddCommentAsync(id, UserId, request);
            return StatusCode(StatusCodes.Status201Created, result);
        }
        catch (KeyNotFoundException ex)
        {
            return Problem(statusCode: 404, detail: ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error adding comment to post {PostId} for user {UserId}", id, UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // DELETE /api/social/posts/{id}/comments/{commentId}
    [HttpDelete("posts/{id:int}/comments/{commentId:int}")]
    public async Task<IActionResult> DeleteComment(int id, int commentId)
    {
        try
        {
            await socialService.DeleteCommentAsync(id, commentId, UserId);
            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error deleting comment {CommentId} for user {UserId}", commentId, UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // POST /api/social/follow/{userId}
    [HttpPost("follow/{userId}")]
    public async Task<IActionResult> ToggleFollow(string userId)
    {
        try
        {
            return Ok(await socialService.ToggleFollowAsync(userId, UserId));
        }
        catch (InvalidOperationException ex)
        {
            return Problem(statusCode: 400, detail: ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error toggling follow for user {TargetUserId} by user {UserId}", userId, UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // GET /api/social/users/search?q=...
    [HttpGet("users/search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string q = "", [FromQuery] int limit = 20)
    {
        try
        {
            return Ok(await socialService.SearchUsersAsync(q, UserId, limit));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error searching users");
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // GET /api/social/profile/{userId}
    [HttpGet("profile/{userId}")]
    public async Task<IActionResult> GetProfile(string userId)
    {
        try
        {
            return Ok(await socialService.GetProfileAsync(userId, UserId));
        }
        catch (KeyNotFoundException ex)
        {
            return Problem(statusCode: 404, detail: ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error getting profile for user {TargetUserId}", userId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // GET /api/social/profile/{userId}/posts
    [HttpGet("profile/{userId}/posts")]
    public async Task<IActionResult> GetProfilePosts(string userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        try
        {
            return Ok(await socialService.GetProfilePostsAsync(userId, UserId, page, pageSize));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error getting posts for profile {TargetUserId}", userId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // PATCH /api/social/posts/{id}/archive
    [HttpPatch("posts/{id:int}/archive")]
    public async Task<IActionResult> ToggleArchivePost(int id)
    {
        try { return Ok(await socialService.ToggleArchivePostAsync(id, UserId)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException ex) { return Problem(statusCode: 404, detail: ex.Message); }
        catch (Exception ex) { logger.LogError(ex, "Error archiving post {PostId}", id); return Problem(statusCode: 500, detail: "An unexpected error occurred."); }
    }

    // GET /api/social/profile/{userId}/archived-posts
    [HttpGet("profile/{userId}/archived-posts")]
    public async Task<IActionResult> GetArchivedPosts(string userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 12)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        try { return Ok(await socialService.GetArchivedPostsAsync(userId, UserId, page, pageSize)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (Exception ex) { logger.LogError(ex, "Error getting archived posts for user {UserId}", userId); return Problem(statusCode: 500, detail: "An unexpected error occurred."); }
    }

    // GET /api/social/profile/{userId}/workouts
    [HttpGet("profile/{userId}/workouts")]
    public async Task<IActionResult> GetProfileWorkouts(string userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 12)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        try { return Ok(await socialService.GetProfileWorkoutsAsync(userId, UserId, page, pageSize)); }
        catch (Exception ex) { logger.LogError(ex, "Error getting profile workouts"); return Problem(statusCode: 500, detail: "An unexpected error occurred."); }
    }

    // PATCH /api/social/profile/workouts/{id}/archive
    [HttpPatch("profile/workouts/{id:int}/archive")]
    public async Task<IActionResult> ToggleArchiveWorkout(int id)
    {
        try { return Ok(await socialService.ToggleArchiveWorkoutAsync(id, UserId)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException ex) { return Problem(statusCode: 404, detail: ex.Message); }
        catch (Exception ex) { logger.LogError(ex, "Error archiving workout {WorkoutId}", id); return Problem(statusCode: 500, detail: "An unexpected error occurred."); }
    }

    // DELETE /api/social/profile/workouts/{id}
    [HttpDelete("profile/workouts/{id:int}")]
    public async Task<IActionResult> DeleteWorkoutFromProfile(int id)
    {
        try { await socialService.DeleteWorkoutFromProfileAsync(id, UserId); return NoContent(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (Exception ex) { logger.LogError(ex, "Error deleting workout {WorkoutId}", id); return Problem(statusCode: 500, detail: "An unexpected error occurred."); }
    }

    // GET /api/social/profile/{userId}/blogs
    [HttpGet("profile/{userId}/blogs")]
    public async Task<IActionResult> GetProfileBlogs(string userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 12)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        try { return Ok(await socialService.GetProfileBlogsAsync(userId, UserId, page, pageSize)); }
        catch (Exception ex) { logger.LogError(ex, "Error getting profile blogs"); return Problem(statusCode: 500, detail: "An unexpected error occurred."); }
    }

    // PATCH /api/social/profile/blogs/{id}/archive
    [HttpPatch("profile/blogs/{id:int}/archive")]
    public async Task<IActionResult> ToggleArchiveBlog(int id)
    {
        try { return Ok(await socialService.ToggleArchiveBlogAsync(id, UserId)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException ex) { return Problem(statusCode: 404, detail: ex.Message); }
        catch (Exception ex) { logger.LogError(ex, "Error archiving blog {BlogId}", id); return Problem(statusCode: 500, detail: "An unexpected error occurred."); }
    }

    // DELETE /api/social/profile/blogs/{id}
    [HttpDelete("profile/blogs/{id:int}")]
    public async Task<IActionResult> DeleteBlogFromProfile(int id)
    {
        try { await socialService.DeleteBlogFromProfileAsync(id, UserId); return NoContent(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (Exception ex) { logger.LogError(ex, "Error deleting blog {BlogId}", id); return Problem(statusCode: 500, detail: "An unexpected error occurred."); }
    }

    // PATCH /api/social/profile/bio
    [HttpPatch("profile/bio")]
    public async Task<IActionResult> UpdateBio([FromBody] UpdateBioRequest request)
    {
        try { await socialService.UpdateBioAsync(UserId, request.Bio); return NoContent(); }
        catch (KeyNotFoundException ex) { return Problem(statusCode: 404, detail: ex.Message); }
        catch (Exception ex) { logger.LogError(ex, "Error updating bio"); return Problem(statusCode: 500, detail: "An unexpected error occurred."); }
    }

    // POST /api/social/profile/blogs/create
    [HttpPost("profile/blogs/create")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> CreateUserBlog([FromBody] CreateUserBlogRequest request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.ToDictionary(
                k => k.Key,
                v => v.Value?.Errors.Select(e => e.ErrorMessage).ToArray() ?? []);
            logger.LogWarning("CreateUserBlog validation failed: {@Errors}", errors);
            return ValidationProblem(ModelState);
        }
        try
        {
            var result = await socialService.CreateUserBlogAsync(UserId, request);
            return StatusCode(StatusCodes.Status201Created, result);
        }
        catch (Exception ex) { logger.LogError(ex, "Error creating blog for user {UserId}", UserId); return Problem(statusCode: 500, detail: "An unexpected error occurred."); }
    }

    // PUT /api/social/profile/blogs/{id}
    [HttpPut("profile/blogs/{id:int}")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> UpdateUserBlog(int id, [FromBody] UpdateUserBlogRequest request)
    {
        try { return Ok(await socialService.UpdateUserBlogAsync(id, UserId, request)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException ex) { return Problem(statusCode: 404, detail: ex.Message); }
        catch (Exception ex) { logger.LogError(ex, "Error updating blog {BlogId}", id); return Problem(statusCode: 500, detail: "An unexpected error occurred."); }
    }

    // GET /api/social/posts/{id}
    [HttpGet("posts/{id:int}")]
    public async Task<IActionResult> GetPost(int id)
    {
        try { return Ok(await socialService.GetPostByIdAsync(id, UserId)); }
        catch (KeyNotFoundException ex) { return Problem(statusCode: 404, detail: ex.Message); }
        catch (Exception ex) { logger.LogError(ex, "Error getting post {PostId}", id); return Problem(statusCode: 500, detail: "An unexpected error occurred."); }
    }

    // GET /api/social/articles/{id}
    [HttpGet("articles/{id:int}")]
    public async Task<IActionResult> GetArticle(int id)
    {
        try { return Ok(await socialService.GetArticleAsync(id, UserId)); }
        catch (KeyNotFoundException ex) { return Problem(statusCode: 404, detail: ex.Message); }
        catch (Exception ex) { logger.LogError(ex, "Error getting article {ArticleId}", id); return Problem(statusCode: 500, detail: "An unexpected error occurred."); }
    }
}
