using System.Net;
using System.Text.Json;
using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebPush;

namespace FitApp.Api.Services;

public sealed class PushNotificationService(
    AppDbContext db,
    IOptions<WebPushOptions> options,
    ILogger<PushNotificationService> logger) : IPushNotificationService
{
    private readonly WebPushOptions _options = options.Value;

    public async Task SubscribeAsync(string userId, PushSubscriptionRequest request, CancellationToken cancellationToken = default)
    {
        var subscription = await db.PushSubscriptions
            .SingleOrDefaultAsync(item => item.Endpoint == request.Endpoint, cancellationToken);

        if (subscription is null)
        {
            subscription = new Models.Entities.PushSubscription
            {
                UserId = userId,
                Endpoint = request.Endpoint,
                P256dh = request.Keys.P256dh,
                Auth = request.Keys.Auth
            };
            db.PushSubscriptions.Add(subscription);
        }
        else
        {
            // A browser endpoint can be reassigned after a user changes accounts.
            subscription.UserId = userId;
            subscription.P256dh = request.Keys.P256dh;
            subscription.Auth = request.Keys.Auth;
            subscription.CreatedAt = DateTime.UtcNow;
        }

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException) when (subscription.Id == 0)
        {
            db.Entry(subscription).State = EntityState.Detached;
            var existing = await db.PushSubscriptions.SingleAsync(item => item.Endpoint == request.Endpoint, cancellationToken);
            existing.UserId = userId;
            existing.P256dh = request.Keys.P256dh;
            existing.Auth = request.Keys.Auth;
            await db.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task UnsubscribeAsync(string userId, string endpoint, CancellationToken cancellationToken = default)
    {
        await db.PushSubscriptions
            .Where(item => item.UserId == userId && item.Endpoint == endpoint)
            .ExecuteDeleteAsync(cancellationToken);
    }

    public async Task SendNotificationAsync(string userId, NotificationType type, int? referenceId, CancellationToken cancellationToken = default)
    {
        if (type is not (NotificationType.Like or NotificationType.Comment or NotificationType.Follow or NotificationType.NewMessage))
            return;
        if (!IsConfigured())
        {
            logger.LogDebug("Web push skipped because VAPID is not configured.");
            return;
        }

        var subscriptions = await db.PushSubscriptions
            .AsNoTracking()
            .Where(item => item.UserId == userId)
            .ToListAsync(cancellationToken);

        if (subscriptions.Count == 0) return;

        var payload = JsonSerializer.Serialize(BuildPayload(type, referenceId));
        var vapid = new VapidDetails(_options.Subject, _options.PublicKey, _options.PrivateKey);
        using var client = new WebPushClient();
        var expiredEndpoints = new List<string>();

        foreach (var stored in subscriptions)
        {
            try
            {
                var subscription = new WebPush.PushSubscription(stored.Endpoint, stored.P256dh, stored.Auth);
                await client.SendNotificationAsync(subscription, payload, vapid, cancellationToken);
            }
            catch (WebPushException ex) when (ex.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone)
            {
                expiredEndpoints.Add(stored.Endpoint);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Web push delivery failed for user {UserId}", userId);
            }
        }

        if (expiredEndpoints.Count > 0)
        {
            await db.PushSubscriptions
                .Where(item => expiredEndpoints.Contains(item.Endpoint))
                .ExecuteDeleteAsync(cancellationToken);
        }
    }

    private bool IsConfigured() =>
        !string.IsNullOrWhiteSpace(_options.Subject)
        && !string.IsNullOrWhiteSpace(_options.PublicKey)
        && !string.IsNullOrWhiteSpace(_options.PrivateKey);

    private static object BuildPayload(NotificationType type, int? referenceId)
    {
        var deepLink = type switch
        {
            NotificationType.Like or NotificationType.Comment when referenceId is > 0 => $"/social/post/{referenceId}",
            NotificationType.NewMessage when referenceId is > 0 => $"/social/chat/{referenceId}",
            NotificationType.NewMessage => "/social/chat",
            _ => "/social/notifications"
        };

        return new
        {
            notification = new
            {
                title = "NovaFit",
                body = "Ai o notificare nouă.",
                data = new { type = MapType(type), url = deepLink }
            }
        };
    }

    private static string MapType(NotificationType type) => type switch
    {
        NotificationType.Like => "like",
        NotificationType.Comment => "comment",
        NotificationType.Follow => "follow",
        NotificationType.NewMessage => "message",
        NotificationType.StreakReminder => "streak_reminder",
        NotificationType.FitnessMilestone => "fitness_milestone",
        _ => "notification"
    };
}
