using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Services;

public class ChatService(AppDbContext db)
{
    public async Task<List<ConversationDto>> GetConversationsAsync(string userId)
    {
        return await db.ChatConversations
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new ConversationDto
            {
                Id = c.Id.ToString(),
                CreatedAt = c.CreatedAt,
                UserId = c.UserId,
                Messages = new List<ChatMessageDto>(),
                Preview = c.Messages
                    .Where(m => m.Role == "user")
                    .OrderBy(m => m.Timestamp)
                    .Select(m => m.Content.Length > 60 ? m.Content.Substring(0, 60) + "…" : m.Content)
                    .FirstOrDefault() ?? string.Empty
            })
            .ToListAsync();
    }

    public async Task<ConversationDto> CreateConversationAsync(string userId)
    {
        var conv = new ChatConversation
        {
            UserId = userId,
            CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };
        db.ChatConversations.Add(conv);
        await db.SaveChangesAsync();

        return new ConversationDto
        {
            Id = conv.Id.ToString(),
            CreatedAt = conv.CreatedAt,
            UserId = conv.UserId,
            Messages = []
        };
    }

    public async Task<List<ChatMessageDto>> GetMessagesAsync(int conversationId, string userId)
    {
        var conv = await db.ChatConversations.FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId)
            ?? throw new KeyNotFoundException("Conversation not found");

        return await db.ChatMessages
            .Where(m => m.ConversationId == conversationId)
            .OrderBy(m => m.Timestamp)
            .Select(m => new ChatMessageDto
            {
                Id = m.Id.ToString(),
                Role = m.Role,
                Content = m.Content,
                ImageUrl = m.ImageUrl,
                Timestamp = m.Timestamp
            })
            .ToListAsync();
    }

    public async Task<ChatMessageDto> SaveMessageAsync(int conversationId, string userId, SaveMessageRequest req)
    {
        var conv = await db.ChatConversations.FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId)
            ?? throw new KeyNotFoundException("Conversation not found");

        var msg = new ChatMessage
        {
            ConversationId = conversationId,
            Role = req.Role,
            Content = req.Content,
            ImageUrl = req.ImageUrl,
            Timestamp = req.Timestamp > 0 ? req.Timestamp : DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };
        db.ChatMessages.Add(msg);
        await db.SaveChangesAsync();

        return new ChatMessageDto
        {
            Id = msg.Id.ToString(),
            Role = msg.Role,
            Content = msg.Content,
            ImageUrl = msg.ImageUrl,
            Timestamp = msg.Timestamp
        };
    }

    public async Task DeleteConversationAsync(int conversationId, string userId)
    {
        var conv = await db.ChatConversations.FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId)
            ?? throw new KeyNotFoundException("Conversation not found");

        db.ChatConversations.Remove(conv);
        await db.SaveChangesAsync();
    }
}