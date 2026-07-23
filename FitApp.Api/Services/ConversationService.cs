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

    public async Task<PaginatedResponse<ConversationSummaryResponse>> GetConversationsAsync(
        string userId, int page, int pageSize)
    {
        pageSize = Math.Min(pageSize, 50);

        // Get all conversation IDs for this user — needed for total count
        var participantConvIds = await db.ConversationParticipants
            .AsNoTracking()
            .Where(cp => cp.UserId == userId)
            .Select(cp => cp.ConversationId)
            .ToListAsync();

        var totalCount = participantConvIds.Count;

        var conversations = await db.Conversations
            .AsNoTracking()
            .Where(c => participantConvIds.Contains(c.Id))
            .Include(c => c.Participants).ThenInclude(p => p.User)
            .Include(c => c.Messages.OrderByDescending(m => m.SentAt).Take(1))
            .OrderByDescending(c => c.Messages
                .OrderByDescending(m => m.SentAt)
                .Select(m => (DateTime?)m.SentAt)
                .FirstOrDefault() ?? c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // ── Batch unread counts — replaces N+1 per-conversation CountAsync ──
        var convIds = conversations.Select(c => c.Id).ToList();
        var lastReadLookup = conversations
            .SelectMany(c => c.Participants)
            .Where(p => p.UserId == userId)
            .ToDictionary(p => p.ConversationId, p => p.LastReadAt ?? DateTime.MinValue);

        var unreadCounts = await db.DirectMessages
            .AsNoTracking()
            .Where(m => convIds.Contains(m.ConversationId)
                        && !m.IsDeleted
                        && m.SenderId != userId)
            .GroupBy(m => m.ConversationId)
            .Select(g => new
            {
                ConversationId = g.Key,
                Count = g.Count(m => m.SentAt > (
                    db.ConversationParticipants
                        .Where(cp => cp.ConversationId == g.Key && cp.UserId == userId)
                        .Select(cp => cp.LastReadAt ?? DateTime.MinValue)
                        .FirstOrDefault()))
            })
            .ToDictionaryAsync(x => x.ConversationId, x => x.Count);

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
                    Content = lastMessage.IsDeleted
                        ? null
                        : lastMessage.MessageType == "shared_post" ? "Shared a post" : lastMessage.Content,
                    HasImage = !lastMessage.IsDeleted && lastMessage.ImageUrl is not null,
                    SentAt = lastMessage.SentAt,
                    MessageType = lastMessage.IsDeleted ? "text" : lastMessage.MessageType
                },
                UnreadCount = unreadCounts.GetValueOrDefault(conv.Id, 0),
                UpdatedAt = lastMessage?.SentAt ?? conv.CreatedAt
            });
        }

        return new PaginatedResponse<ConversationSummaryResponse>
        {
            Items = results,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            HasMore = page * pageSize < totalCount
        };
    }

    // ── Get or create ─────────────────────────────────────────────────────────

    public async Task<ConversationSummaryResponse> GetOrCreateAsync(string userId, string targetUserId)
    {
        // Find existing conversation where both are participants
        var existingConvId = await db.ConversationParticipants
            .AsNoTracking()
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
                .AsNoTracking()
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
                        Content = lastMsg.IsDeleted
                            ? null
                            : lastMsg.MessageType == "shared_post" ? "Shared a post" : lastMsg.Content,
                        HasImage = !lastMsg.IsDeleted && lastMsg.ImageUrl is not null,
                        SentAt = lastMsg.SentAt,
                        MessageType = lastMsg.IsDeleted ? "text" : lastMsg.MessageType
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
            .AsNoTracking()
            .AnyAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);

    public async Task<List<string>> GetOtherParticipantIdsAsync(int conversationId, string userId)
        => await db.ConversationParticipants
            .AsNoTracking()
            .Where(cp => cp.ConversationId == conversationId && cp.UserId != userId)
            .Select(cp => cp.UserId)
            .ToListAsync();

    // ── Messages ──────────────────────────────────────────────────────────────

    public async Task<CursorPageResponse<DirectMessageResponse>> GetMessagesAsync(
        int conversationId,
        string userId,
        int? beforeMessageId,
        int pageSize)
    {
        pageSize = Math.Min(pageSize, 100);
        if (!await IsParticipantAsync(conversationId, userId))
            throw new UnauthorizedAccessException("You are not a participant of this conversation.");

        var query = db.DirectMessages
            .AsNoTracking()
            .Include(m => m.Sender)
            .Where(m => m.ConversationId == conversationId);

        if (beforeMessageId.HasValue)
            query = query.Where(m => m.Id < beforeMessageId.Value);

        // Fetch one extra to determine hasMore
        var fetched = await query
            .OrderByDescending(m => m.Id)
            .Take(pageSize + 1)
            .ToListAsync();

        var hasMore = fetched.Count > pageSize;
        var messages = fetched.Take(pageSize).ToList();

        // Return in ascending order for display
        messages.Reverse();

        var postPreviews = await LoadSharedPostPreviewsAsync(messages);
        var items = messages.Select(m => MapToMessageResponse(m, userId, postPreviews)).ToList();

        // NextCursor is the Id of the oldest message in this batch — client passes it as beforeMessageId
        var nextCursor = items.Count > 0 ? items[0].Id : (int?)null;

        return new CursorPageResponse<DirectMessageResponse>(
            Items: items,
            HasMore: hasMore,
            NextCursor: nextCursor
        );
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

    public async Task<SharePostToUserResponse> SharePostAsync(string userId, SharePostRequest request)
    {
        if (request.TargetUserId == userId)
            throw new InvalidOperationException("You cannot send a post to yourself.");

        var targetExists = await db.Users.AsNoTracking().AnyAsync(u => u.Id == request.TargetUserId);
        if (!targetExists)
            throw new KeyNotFoundException("Target user not found.");

        var post = await db.Posts
            .AsNoTracking()
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == request.PostId && !p.IsArchived && p.ArticleId == null)
            ?? throw new KeyNotFoundException("Post not found or unavailable.");

        var conversation = await GetOrCreateAsync(userId, request.TargetUserId);
        var sender = await db.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("Sender not found.");

        var message = new DirectMessage
        {
            ConversationId = conversation.Id,
            SenderId = userId,
            Sender = sender,
            MessageType = "shared_post",
            SharedPostId = post.Id
        };

        db.DirectMessages.Add(message);
        await db.SaveChangesAsync();

        var preview = CreateSharedPostPreview(post);
        return new SharePostToUserResponse
        {
            ConversationId = conversation.Id,
            Message = MapToMessageResponse(message, userId, new Dictionary<int, SharedPostPreview>
            {
                [post.Id] = preview
            })
        };
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
        message.MessageType = "text";
        message.SharedPostId = null;
        await db.SaveChangesAsync();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<Dictionary<int, SharedPostPreview>> LoadSharedPostPreviewsAsync(
        IEnumerable<DirectMessage> messages)
    {
        var postIds = messages
            .Where(m => !m.IsDeleted && m.MessageType == "shared_post" && m.SharedPostId.HasValue)
            .Select(m => m.SharedPostId!.Value)
            .Distinct()
            .ToList();

        if (postIds.Count == 0)
            return [];

        var posts = await db.Posts
            .AsNoTracking()
            .Include(p => p.User)
            .Where(p => postIds.Contains(p.Id) && !p.IsArchived && p.ArticleId == null)
            .ToListAsync();

        return posts.ToDictionary(p => p.Id, CreateSharedPostPreview);
    }

    private static SharedPostPreview CreateSharedPostPreview(Post post) => new()
    {
        PostId = post.Id,
        IsAvailable = true,
        Author = new UserSummary
        {
            Id = post.User.Id,
            DisplayName = post.User.FullName,
            AvatarUrl = post.User.ImageUrl
        },
        Content = post.Content.Length <= 180 ? post.Content : $"{post.Content[..177]}...",
        ImageUrl = post.ImageUrl
    };

    private static DirectMessageResponse MapToMessageResponse(
        DirectMessage m,
        string currentUserId,
        IReadOnlyDictionary<int, SharedPostPreview>? postPreviews = null) => new()
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
        IsOwn = m.SenderId == currentUserId,
        MessageType = m.IsDeleted ? "text" : m.MessageType,
        SharedPostId = m.IsDeleted ? null : m.SharedPostId,
        SharedPost = !m.IsDeleted && m.SharedPostId.HasValue
            ? postPreviews?.GetValueOrDefault(m.SharedPostId.Value) ?? new SharedPostPreview
            {
                PostId = m.SharedPostId.Value,
                IsAvailable = false
            }
            : null
    };
}
