using System.Security.Claims;
using FitApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FitApp.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(INotificationService notificationService, ILogger<NotificationsController> logger) : ControllerBase
{
    private string UserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException("User identity not resolved.");

    // GET /api/notifications
    [HttpGet]
    public async Task<IActionResult> GetNotifications([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        try
        {
            return Ok(await notificationService.GetNotificationsAsync(UserId, page, pageSize));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error getting notifications for user {UserId}", UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // GET /api/notifications/unread-count
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        try
        {
            return Ok(await notificationService.GetUnreadCountAsync(UserId));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error getting unread count for user {UserId}", UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // PUT /api/notifications/read-all
    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        try
        {
            await notificationService.MarkAllReadAsync(UserId);
            return NoContent();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error marking all notifications as read for user {UserId}", UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }

    // PUT /api/notifications/{id}/read
    [HttpPut("{id:int}/read")]
    public async Task<IActionResult> MarkOneRead(int id)
    {
        try
        {
            await notificationService.MarkOneReadAsync(id, UserId);
            return NoContent();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error marking notification {NotificationId} as read for user {UserId}", id, UserId);
            return Problem(statusCode: 500, detail: "An unexpected error occurred.");
        }
    }
}
