using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;

namespace FitApp.Api.Services;

public interface IPushNotificationService
{
    Task SubscribeAsync(string userId, PushSubscriptionRequest request, CancellationToken cancellationToken = default);
    Task UnsubscribeAsync(string userId, string endpoint, CancellationToken cancellationToken = default);
    Task SendNotificationAsync(string userId, NotificationType type, int? referenceId, CancellationToken cancellationToken = default);
}
