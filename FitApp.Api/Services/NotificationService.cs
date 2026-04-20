using FitApp.Api.Data;
using FitApp.Api.Hubs;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Services;

public class NotificationService(
    AppDbContext db,
    IHubContext<NotificationHub> hubContext,
    ILogger<NotificationService> logger) : INotificationService
{
    public async Task CreateAndPushAsync(
        string recipientId,
        string actorId,
        NotificationType type,
        int? referenceId,
        string messageText)
    {
        // Skip self-notifications
        if (recipientId == actorId) return;

        // Load actor for the push payload
        var actor = await db.Users.FindAsync(actorId);

        NotificationResponse response;

        if (type == NotificationType.NewMessage)
        {
            // Chat messages are not persisted as notifications — they live only in Chat.
            // We still push via SignalR so the chat feature can react in real-time.
            response = new NotificationResponse
            {
                Id = 0,
                Actor = new UserSummary
                {
                    Id = actorId,
                    DisplayName = actor?.FullName ?? "Someone",
                    AvatarUrl = actor?.ImageUrl
                },
                Type = MapTypeToString(type),
                Message = messageText,
                ReferenceId = referenceId,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
        }
        else
        {
            var notification = new Notification
            {
                RecipientId = recipientId,
                ActorId = actorId,
                Type = type,
                ReferenceId = referenceId,
                Message = messageText,
                IsRead = false
            };

            db.Notifications.Add(notification);
            await db.SaveChangesAsync();

            response = new NotificationResponse
            {
                Id = notification.Id,
                Actor = new UserSummary
                {
                    Id = actorId,
                    DisplayName = actor?.FullName ?? "Someone",
                    AvatarUrl = actor?.ImageUrl
                },
                Type = MapTypeToString(type),
                Message = messageText,
                ReferenceId = referenceId,
                IsRead = false,
                CreatedAt = notification.CreatedAt
            };
        }

        try
        {
            await hubContext.Clients
                .Group($"user-{recipientId}")
                .SendAsync("ReceiveNotification", response);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to push notification to user {RecipientId}", recipientId);
        }
    }

    public async Task<PaginatedResponse<NotificationResponse>> GetNotificationsAsync(string userId, int page, int pageSize)
    {
        var query = db.Notifications
            .Include(n => n.Actor)
            .Where(n => n.RecipientId == userId)
            .OrderByDescending(n => n.CreatedAt);

        var total = await query.CountAsync();
        var notifications = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PaginatedResponse<NotificationResponse>
        {
            Items = notifications.Select(MapToResponse).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
            HasMore = page * pageSize < total
        };
    }

    public async Task<UnreadCountResponse> GetUnreadCountAsync(string userId)
    {
        var count = await db.Notifications
            .CountAsync(n => n.RecipientId == userId && !n.IsRead);

        return new UnreadCountResponse { Count = count };
    }

    public async Task MarkAllReadAsync(string userId)
    {
        await db.Notifications
            .Where(n => n.RecipientId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
    }

    public async Task MarkOneReadAsync(int notificationId, string userId)
    {
        var notification = await db.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.RecipientId == userId);

        if (notification is null) return;

        notification.IsRead = true;
        await db.SaveChangesAsync();
    }

    private static NotificationResponse MapToResponse(Notification n) => new()
    {
        Id = n.Id,
        Actor = new UserSummary
        {
            Id = n.ActorId,
            DisplayName = n.Actor.FullName,
            AvatarUrl = n.Actor.ImageUrl
        },
        Type = MapTypeToString(n.Type),
        Message = n.Message,
        ReferenceId = n.ReferenceId,
        IsRead = n.IsRead,
        CreatedAt = n.CreatedAt
    };

    private static string MapTypeToString(NotificationType type) => type switch
    {
        NotificationType.Like => "like",
        NotificationType.Comment => "comment",
        NotificationType.Follow => "follow",
        NotificationType.NewMessage => "message",
        _ => "unknown"
    };
}
