using System.Security.Claims;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FitApp.Api.Controllers;

[ApiController]
[Route("api/conversations")]
[Authorize]
public class ConversationsController(
    IConversationService conversationService,
    ConversationRealtimeService realtime,
    ILogger<ConversationsController> logger) : ControllerBase
{
    private string UserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException("User identity not resolved.");

    // GET /api/conversations?page=1&pageSize=20
    [HttpGet]
    public async Task<IActionResult> GetConversations(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            return Ok(await conversationService.GetConversationsAsync(UserId, page, pageSize));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error getting conversations for user {UserId}", UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // POST /api/conversations
    [HttpPost]
    public async Task<IActionResult> GetOrCreate([FromBody] CreateConversationRequest request)
    {
        try
        {
            var result = await conversationService.GetOrCreateAsync(UserId, request.TargetUserId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return Problem(statusCode: 404, detail: ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error getting/creating conversation for user {UserId} with {TargetUserId}", UserId, request.TargetUserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // GET /api/conversations/{id}/messages
    [HttpGet("{id:int}/messages")]
    public async Task<IActionResult> GetMessages(
        int id,
        [FromQuery] int? beforeMessageId = null,
        [FromQuery] int pageSize = 30)
    {
        try
        {
            var messages = await conversationService.GetMessagesAsync(id, UserId, beforeMessageId, pageSize);
            return Ok(messages);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error getting messages for conversation {ConversationId}", id);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // POST /api/conversations/{id}/messages
    [HttpPost("{id:int}/messages")]
    public async Task<IActionResult> SendMessage(int id, [FromBody] SendMessageRequest request)
    {
        try
        {
            var result = await realtime.SendAsync(id, UserId, request);
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
            logger.LogError(ex, "Error sending message in conversation {ConversationId} for user {UserId}", id, UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // POST /api/conversations/share-post
    [HttpPost("share-post")]
    public async Task<IActionResult> SharePost([FromBody] SharePostRequest request)
    {
        try
        {
            var result = await realtime.SharePostAsync(UserId, request);
            return StatusCode(StatusCodes.Status201Created, result);
        }
        catch (KeyNotFoundException ex)
        {
            return Problem(statusCode: 404, detail: ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(statusCode: 400, detail: ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error sharing post {PostId} from user {UserId} to {TargetUserId}",
                request.PostId, UserId, request.TargetUserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // PUT /api/conversations/{id}/read
    [HttpPut("{id:int}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        try
        {
            await conversationService.MarkAsReadAsync(id, UserId);
            return NoContent();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error marking conversation {ConversationId} as read for user {UserId}", id, UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // DELETE /api/conversations/{id}/messages/{messageId}
    [HttpDelete("{id:int}/messages/{messageId:int}")]
    public async Task<IActionResult> DeleteMessage(int id, int messageId)
    {
        try
        {
            await realtime.DeleteAsync(id, messageId, UserId);
            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error deleting message {MessageId} in conversation {ConversationId} for user {UserId}", messageId, id, UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }
}
