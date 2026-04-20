using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;

namespace FitApp.Api.Services;

public interface INotificationService
{
    Task CreateAndPushAsync(string recipientId, string actorId, NotificationType type, int? referenceId, string messageText);
    Task<PaginatedResponse<NotificationResponse>> GetNotificationsAsync(string userId, int page, int pageSize);
    Task<UnreadCountResponse> GetUnreadCountAsync(string userId);
    Task MarkAllReadAsync(string userId);
    Task MarkOneReadAsync(int notificationId, string userId);
}
