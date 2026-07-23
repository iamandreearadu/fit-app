using FitApp.Api.Hubs;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.AspNetCore.SignalR;

namespace FitApp.Api.Services;

/// <summary>
/// Single orchestration boundary for persisted conversation mutations and their SignalR side effects.
/// REST controllers and hubs both call this service, so send/delete behavior cannot drift.
/// </summary>
public class ConversationRealtimeService(
    IConversationService conversations,
    INotificationService notifications,
    IHubContext<ChatHub> hub)
{
    public async Task<DirectMessageResponse> SendAsync(
        int conversationId, string senderId, SendMessageRequest request)
    {
        var message = await conversations.SendMessageAsync(conversationId, senderId, request);
        await hub.Clients.Group($"conv-{conversationId}").SendAsync("ReceiveMessage", message);

        var recipientIds = await conversations.GetOtherParticipantIdsAsync(conversationId, senderId);
        foreach (var recipientId in recipientIds)
        {
            await hub.Clients.Group($"user-{recipientId}")
                .SendAsync("NewConversationMessage", message);
            await notifications.CreateAndPushAsync(
                recipientId,
                senderId,
                NotificationType.NewMessage,
                conversationId,
                $"{message.Sender.DisplayName} sent you a message");
        }

        return message;
    }

    public async Task<SharePostToUserResponse> SharePostAsync(string senderId, SharePostRequest request)
    {
        var result = await conversations.SharePostAsync(senderId, request);
        var message = result.Message;
        await hub.Clients.Group($"conv-{result.ConversationId}").SendAsync("ReceiveMessage", message);
        await hub.Clients.Group($"user-{request.TargetUserId}")
            .SendAsync("NewConversationMessage", message);
        await notifications.CreateAndPushAsync(
            request.TargetUserId,
            senderId,
            NotificationType.NewMessage,
            result.ConversationId,
            $"{message.Sender.DisplayName} shared a post with you");

        return result;
    }

    public async Task DeleteAsync(int conversationId, int messageId, string userId)
    {
        await conversations.SoftDeleteMessageAsync(messageId, userId);
        await hub.Clients.Group($"conv-{conversationId}")
            .SendAsync("MessageDeleted", new { messageId, conversationId });
    }
}
