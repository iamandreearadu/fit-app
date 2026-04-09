using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Services;

public class ConversationService(
    AppDbContext db,
    IFileStorageService fileStorage) : IConversationService
{
    // ── List conversations ────────────────────────────────────────────────────

    public async Task<List<ConversationSummaryResponse>> GetConversationsAsync(string userId)
    {
        var participantConvIds = await db.ConversationParticipants
            .Where(cp => cp.UserId == userId)
            .Select(cp => cp.ConversationId)
            .ToListAsync();

        var conversations = await db.Conversations
            .Where(c => participantConvIds.Contains(c.Id))
            .Include(c => c.Participants).ThenInclude(p => p.User)
            .Include(c => c.Messages.OrderByDescending(m => m.SentAt).Take(1))
            .ToListAsync();

        // Batch-fetch unread counts in one query — avoids 2N+1 round-trips
        var convIds = conversations.Select(c => c.Id).ToList();

        var lastReadLookup = conversations
            .SelectMany(c => c.Participants)
            .Where(p => p.UserId == userId)
            .ToDictionary(p => p.ConversationId, p => p.LastReadAt);

        var unreadMessages = await db.DirectMessages
            .Where(m => convIds.Contains(m.ConversationId) && m.SenderId != userId && !m.IsDeleted)
            .Select(m => new { m.ConversationId, m.SentAt })
            .ToListAsync();

        var unreadLookup = unreadMessages
            .GroupBy(m => m.ConversationId)
            .ToDictionary(
                g => g.Key,
                g =>
                {
                    var lastRead = lastReadLookup.GetValueOrDefault(g.Key);
                    return lastRead.HasValue
                        ? g.Count(m => m.SentAt > lastRead.Value)
                        : g.Count();
                });

        var results = new List<ConversationSummaryResponse>();

        foreach (var conv in conversations)
        {
            var other = conv.Participants.FirstOrDefault(p => p.UserId != userId);
            if (other is null) continue;

            var lastMessage = conv.Messages.MaxBy(m => m.SentAt);

            results.Add(new ConversationSummaryResponse
            {
                Id = conv.Id,
                OtherParticipant = new UserSummary
                {
                    Id = other.User.Id,
                    DisplayName = other.User.FullName,
                    AvatarUrl = other.User.ImageUrl
                },
                LastMessage = lastMessage is null ? null : new MessagePreview
                {
                    Content = lastMessage.IsDeleted ? null : lastMessage.Content,
                    HasImage = !lastMessage.IsDeleted && lastMessage.ImageUrl is not null,
                    SentAt = lastMessage.SentAt
                },
                UnreadCount = unreadLookup.GetValueOrDefault(conv.Id, 0),
                UpdatedAt = lastMessage?.SentAt ?? conv.CreatedAt
            });
        }

        return results.OrderByDescending(r => r.UpdatedAt).ToList();
    }

    // ── Get or create ─────────────────────────────────────────────────────────

    public async Task<ConversationSummaryResponse> GetOrCreateAsync(string userId, string targetUserId)
    {
        // Find existing conversation where both are participants
        var existingConvId = await db.ConversationParticipants
            .Where(cp => cp.UserId == userId)
            .Select(cp => cp.ConversationId)
            .Intersect(
                db.ConversationParticipants
                    .Where(cp => cp.UserId == targetUserId)
                    .Select(cp => cp.ConversationId))
            .FirstOrDefaultAsync();

        if (existingConvId != 0)
        {
            // Targeted single-conversation query — avoids re-running the full list with N+1 unread counts
            var existing = await db.Conversations
                .Where(c => c.Id == existingConvId)
                .Include(c => c.Participants).ThenInclude(p => p.User)
                .Include(c => c.Messages.OrderByDescending(m => m.SentAt).Take(1))
                .FirstOrDefaultAsync();

            if (existing is not null)
            {
                var otherP = existing.Participants.FirstOrDefault(p => p.UserId != userId);
                var myParticipant = existing.Participants.FirstOrDefault(p => p.UserId == userId);
                var lastMsg = existing.Messages.MaxBy(m => m.SentAt);
                var unread = await db.DirectMessages.CountAsync(m =>
                    m.ConversationId == existingConvId &&
                    m.SenderId != userId &&
                    !m.IsDeleted &&
                    (myParticipant!.LastReadAt == null || m.SentAt > myParticipant.LastReadAt));

                return new ConversationSummaryResponse
                {
                    Id = existing.Id,
                    OtherParticipant = new UserSummary
                    {
                        Id = otherP!.User.Id,
                        DisplayName = otherP.User.FullName,
                        AvatarUrl = otherP.User.ImageUrl
                    },
                    LastMessage = lastMsg is null ? null : new MessagePreview
                    {
                        Content = lastMsg.IsDeleted ? null : lastMsg.Content,
                        HasImage = !lastMsg.IsDeleted && lastMsg.ImageUrl is not null,
                        SentAt = lastMsg.SentAt
                    },
                    UnreadCount = unread,
                    UpdatedAt = lastMsg?.SentAt ?? existing.CreatedAt
                };
            }
        }

        // Create new conversation
        var targetUser = await db.Users.FindAsync(targetUserId)
            ?? throw new KeyNotFoundException("Target user not found.");

        var conversation = new Conversation();
        db.Conversations.Add(conversation);
        await db.SaveChangesAsync();

        db.ConversationParticipants.AddRange(
            new ConversationParticipant { ConversationId = conversation.Id, UserId = userId },
            new ConversationParticipant { ConversationId = conversation.Id, UserId = targetUserId }
        );
        await db.SaveChangesAsync();

        return new ConversationSummaryResponse
        {
            Id = conversation.Id,
            OtherParticipant = new UserSummary
            {
                Id = targetUser.Id,
                DisplayName = targetUser.FullName,
                AvatarUrl = targetUser.ImageUrl
            },
            LastMessage = null,
            UnreadCount = 0,
            UpdatedAt = conversation.CreatedAt
        };
    }

    // ── Participant check ─────────────────────────────────────────────────────

    public async Task<bool> IsParticipantAsync(int conversationId, string userId)
        => await db.ConversationParticipants
            .AnyAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);

    public async Task<List<string>> GetOtherParticipantIdsAsync(int conversationId, string userId)
        => await db.ConversationParticipants
            .Where(cp => cp.ConversationId == conversationId && cp.UserId != userId)
            .Select(cp => cp.UserId)
            .ToListAsync();

    // ── Messages ──────────────────────────────────────────────────────────────

    public async Task<List<DirectMessageResponse>> GetMessagesAsync(
        int conversationId,
        string userId,
        int? beforeMessageId,
        int pageSize)
    {
        if (!await IsParticipantAsync(conversationId, userId))
            throw new UnauthorizedAccessException("You are not a participant of this conversation.");

        var query = db.DirectMessages
            .Include(m => m.Sender)
            .Where(m => m.ConversationId == conversationId);

        if (beforeMessageId.HasValue)
            query = query.Where(m => m.Id < beforeMessageId.Value);

        var messages = await query
            .OrderByDescending(m => m.Id)
            .Take(pageSize)
            .ToListAsync();

        // Return in ascending order for the client
        messages.Reverse();

        return messages.Select(m => MapToMessageResponse(m, userId)).ToList();
    }

    public async Task<DirectMessageResponse> SendMessageAsync(
        int conversationId,
        string userId,
        SendMessageRequest request)
    {
        if (!await IsParticipantAsync(conversationId, userId))
            throw new UnauthorizedAccessException("You are not a participant of this conversation.");

        if (string.IsNullOrWhiteSpace(request.Content) && string.IsNullOrWhiteSpace(request.ImageBase64))
            throw new InvalidOperationException("Message must have content or an image.");

        string? imageUrl = null;

        if (!string.IsNullOrWhiteSpace(request.ImageBase64))
        {
            imageUrl = await fileStorage.SaveChatImageAsync(request.ImageBase64, request.ImageMimeType);
        }

        var sender = await db.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("Sender not found.");

        var message = new DirectMessage
        {
            ConversationId = conversationId,
            SenderId = userId,
            Content = request.Content,
            ImageUrl = imageUrl,
            Sender = sender
        };

        db.DirectMessages.Add(message);
        await db.SaveChangesAsync();

        return MapToMessageResponse(message, userId);
    }

    // ── Mark as read ──────────────────────────────────────────────────────────

    public async Task MarkAsReadAsync(int conversationId, string userId)
    {
        var participant = await db.ConversationParticipants
            .FirstOrDefaultAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);

        if (participant is null) return;

        participant.LastReadAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    // ── Soft delete ───────────────────────────────────────────────────────────

    public async Task SoftDeleteMessageAsync(int messageId, string userId)
    {
        var message = await db.DirectMessages.FindAsync(messageId);
        if (message is null) return;
        if (message.SenderId != userId)
            throw new UnauthorizedAccessException("You can only delete your own messages.");

        message.IsDeleted = true;
        message.Content = null;
        message.ImageUrl = null;
        await db.SaveChangesAsync();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static DirectMessageResponse MapToMessageResponse(DirectMessage m, string currentUserId) => new()
    {
        Id = m.Id,
        ConversationId = m.ConversationId,
        Sender = new UserSummary
        {
            Id = m.Sender.Id,
            DisplayName = m.Sender.FullName,
            AvatarUrl = m.Sender.ImageUrl
        },
        Content = m.IsDeleted ? null : m.Content,
        ImageUrl = m.IsDeleted ? null : m.ImageUrl,
        SentAt = m.SentAt,
        IsDeleted = m.IsDeleted,
        IsOwn = m.SenderId == currentUserId
    };
}
