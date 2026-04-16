using System.Security.Claims;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using FitApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace FitApp.Api.Hubs;

[Authorize]
public class ChatHub(
    IConversationService conversationService,
    INotificationService notificationService,
    ILogger<ChatHub> logger) : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");
        logger.LogInformation("ChatHub: user {UserId} connected ({ConnectionId})", userId, Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public async Task JoinConversation(int conversationId)
    {
        var userId = GetUserId();
        var isParticipant = await conversationService.IsParticipantAsync(conversationId, userId);
        if (!isParticipant)
            throw new HubException("You are not a participant of this conversation.");

        await Groups.AddToGroupAsync(Context.ConnectionId, $"conv-{conversationId}");
        logger.LogInformation("ChatHub: user {UserId} joined conversation {ConversationId}", userId, conversationId);
    }

    public async Task LeaveConversation(int conversationId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"conv-{conversationId}");
    }

    public async Task SendMessage(int conversationId, string? content, string? imageBase64, string? mimeType)
    {
        var userId = GetUserId();

        var isParticipant = await conversationService.IsParticipantAsync(conversationId, userId);
        if (!isParticipant)
            throw new HubException("You are not a participant of this conversation.");

        if (string.IsNullOrWhiteSpace(content) && string.IsNullOrWhiteSpace(imageBase64))
            throw new HubException("Message must have content or an image.");

        var request = new SendMessageRequest
        {
            Content = content,
            ImageBase64 = imageBase64,
            ImageMimeType = mimeType
        };

        DirectMessageResponse message;
        try
        {
            message = await conversationService.SendMessageAsync(conversationId, userId, request);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "ChatHub: failed to send message for user {UserId} in conversation {ConversationId}", userId, conversationId);
            throw new HubException(ex.Message);
        }

        await Clients.Group($"conv-{conversationId}").SendAsync("ReceiveMessage", message);

        // Notify other participants
        var otherIds = await conversationService.GetOtherParticipantIdsAsync(conversationId, userId);
        foreach (var recipientId in otherIds)
        {
            await notificationService.CreateAndPushAsync(
                recipientId,
                userId,
                NotificationType.NewMessage,
                conversationId,
                $"{message.Sender.DisplayName} sent you a message");
        }
    }

    private string GetUserId()
        => Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? Context.User?.FindFirstValue("sub")
            ?? throw new HubException("Unauthorized");
}
