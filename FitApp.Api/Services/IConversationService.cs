using FitApp.Api.Models.DTOs;

namespace FitApp.Api.Services;

public interface IConversationService
{
    Task<List<ConversationSummaryResponse>> GetConversationsAsync(string userId);
    Task<ConversationSummaryResponse> GetOrCreateAsync(string userId, string targetUserId);
    Task<bool> IsParticipantAsync(int conversationId, string userId);
    Task<List<string>> GetOtherParticipantIdsAsync(int conversationId, string userId);
    Task<List<DirectMessageResponse>> GetMessagesAsync(int conversationId, string userId, int? beforeMessageId, int pageSize);
    Task<DirectMessageResponse> SendMessageAsync(int conversationId, string userId, SendMessageRequest request);
    Task MarkAsReadAsync(int conversationId, string userId);
    Task SoftDeleteMessageAsync(int messageId, string userId);
}
