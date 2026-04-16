using System.ComponentModel.DataAnnotations;

namespace FitApp.Api.Models.DTOs;

// ── Requests ──────────────────────────────────────────────────────────────────

public class CreateConversationRequest
{
    [Required]
    public string TargetUserId { get; set; } = string.Empty;
}

public class SendMessageRequest
{
    [MaxLength(2000)]
    public string? Content { get; set; }

    [StringLength(7_000_000)]  // ~5 MB base64 — triggers ASP.NET Core model validation
    public string? ImageBase64 { get; set; }

    public string? ImageMimeType { get; set; }
}

// ── Responses ─────────────────────────────────────────────────────────────────

public class MessagePreview
{
    public string? Content { get; set; }
    public bool HasImage { get; set; }
    public DateTime SentAt { get; set; }
}

public class ConversationSummaryResponse
{
    public int Id { get; set; }
    public UserSummary OtherParticipant { get; set; } = null!;
    public MessagePreview? LastMessage { get; set; }
    public int UnreadCount { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class DirectMessageResponse
{
    public int Id { get; set; }
    public int ConversationId { get; set; }
    public UserSummary Sender { get; set; } = null!;
    public string? Content { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime SentAt { get; set; }
    public bool IsDeleted { get; set; }
    public bool IsOwn { get; set; }
}
