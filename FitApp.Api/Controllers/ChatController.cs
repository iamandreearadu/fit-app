using System.Security.Claims;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FitApp.Api.Controllers;

[ApiController]
[Route("api/chat")]
[Authorize]
public class ChatController(ChatService chatService, ILogger<ChatController> logger) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException();

    [HttpGet]
    public async Task<IActionResult> GetConversations()
    {
        try
        {
            var list = await chatService.GetConversationsAsync(UserId);
            return Ok(list);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get conversations");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateConversation()
    {
        try
        {
            var conv = await chatService.CreateConversationAsync(UserId);
            return Ok(conv);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create conversation");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{id:int}/messages")]
    public async Task<IActionResult> GetMessages(int id)
    {
        try
        {
            var msgs = await chatService.GetMessagesAsync(id, UserId);
            return Ok(msgs);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get messages");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id:int}/messages")]
    public async Task<IActionResult> SaveMessage(int id, [FromBody] SaveMessageRequest req)
    {
        try
        {
            var msg = await chatService.SaveMessageAsync(id, UserId, req);
            return Ok(msg);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to save message");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteConversation(int id)
    {
        try
        {
            await chatService.DeleteConversationAsync(id, UserId);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete conversation");
            return BadRequest(new { error = ex.Message });
        }
    }
}