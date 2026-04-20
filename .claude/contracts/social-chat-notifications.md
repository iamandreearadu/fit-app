# API Contract: Social Feed, Direct Messaging, and Notifications

**STATUS: BACKEND_READY**
**Date:** 2026-04-06
**Source ADR:** .claude/decisions/social-chat-notifications.md

---

## Table of Contents
1. EF Entity Definitions (C#)
2. AppDbContext Configuration
3. DTO Definitions (C#)
4. API Endpoint Contracts
5. SignalR Hub Contracts
6. TypeScript Interface Definitions
7. Implementation Checklists

---

## 1. EF Entity Definitions

All entities go in FitApp.Api/Models/Entities/ as separate files.

### Post.cs

```csharp
namespace FitApp.Api.Models.Entities;

public class Post
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;       // max 500
    public string? ImageUrl { get; set; }
    public int? LinkedWorkoutId { get; set; }                  // FK -> WorkoutTemplate
    public int? LinkedMealId { get; set; }                     // FK -> MealEntry
    public int? LinkedDailyEntryId { get; set; }               // FK -> DailyEntry
    public int LikesCount { get; set; }                        // cached counter
    public int CommentsCount { get; set; }                     // cached counter
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public WorkoutTemplate? LinkedWorkout { get; set; }
    public MealEntry? LinkedMeal { get; set; }
    public DailyEntry? LinkedDailyEntry { get; set; }
    public ICollection<Like> Likes { get; set; } = [];
    public ICollection<Comment> Comments { get; set; } = [];
}
```

### Like.cs

```csharp
namespace FitApp.Api.Models.Entities;

public class Like
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int PostId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public Post Post { get; set; } = null!;
}
```

### Comment.cs

```csharp
namespace FitApp.Api.Models.Entities;

public class Comment
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int PostId { get; set; }
    public string Content { get; set; } = string.Empty;       // max 300
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public Post Post { get; set; } = null!;
}
```

### Follow.cs

```csharp
namespace FitApp.Api.Models.Entities;

public class Follow
{
    public int Id { get; set; }
    public string FollowerId { get; set; } = string.Empty;    // the user who follows
    public string FollowingId { get; set; } = string.Empty;   // the user being followed
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User Follower { get; set; } = null!;
    public User Following { get; set; } = null!;
}
```

### Conversation.cs

```csharp
namespace FitApp.Api.Models.Entities;

public class Conversation
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<ConversationParticipant> Participants { get; set; } = [];
    public ICollection<DirectMessage> Messages { get; set; } = [];
}
```

### ConversationParticipant.cs

```csharp
namespace FitApp.Api.Models.Entities;

public class ConversationParticipant
{
    public int Id { get; set; }
    public int ConversationId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastReadAt { get; set; }

    // Navigation
    public Conversation Conversation { get; set; } = null!;
    public User User { get; set; } = null!;
}
```

### DirectMessage.cs

```csharp
namespace FitApp.Api.Models.Entities;

public class DirectMessage
{
    public int Id { get; set; }
    public int ConversationId { get; set; }
    public string SenderId { get; set; } = string.Empty;
    public string? Content { get; set; }                       // nullable for image-only messages
    public string? ImageUrl { get; set; }                      // base64 data URL or stored path
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; }                        // soft delete

    // Navigation
    public Conversation Conversation { get; set; } = null!;
    public User Sender { get; set; } = null!;
}
```

### Notification.cs

```csharp
namespace FitApp.Api.Models.Entities;

public enum NotificationType
{
    Like = 0,
    Comment = 1,
    Follow = 2,
    NewMessage = 3
}

public class Notification
{
    public int Id { get; set; }
    public string RecipientId { get; set; } = string.Empty;
    public string ActorId { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    public int? ReferenceId { get; set; }                      // PostId, ConversationId, etc.
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User Recipient { get; set; } = null!;
    public User Actor { get; set; } = null!;
}
```

### User.cs Modifications

Add these navigation properties to the existing User class (no new columns, navigation only):

```csharp
// Add to existing User class
public ICollection<Post> Posts { get; set; } = [];
public ICollection<Like> Likes { get; set; } = [];
public ICollection<Comment> Comments { get; set; } = [];
public ICollection<Follow> Followers { get; set; } = [];      // users who follow this user
public ICollection<Follow> Following { get; set; } = [];      // users this user follows
public ICollection<ConversationParticipant> ConversationParticipants { get; set; } = [];
public ICollection<Notification> ReceivedNotifications { get; set; } = [];
```

---

## 2. AppDbContext Configuration

Add these DbSets and OnModelCreating configurations to AppDbContext.cs.

### New DbSets

```csharp
public DbSet<Post> Posts => Set<Post>();
public DbSet<Like> Likes => Set<Like>();
public DbSet<Comment> Comments => Set<Comment>();
public DbSet<Follow> Follows => Set<Follow>();
public DbSet<Conversation> Conversations => Set<Conversation>();
public DbSet<ConversationParticipant> ConversationParticipants => Set<ConversationParticipant>();
public DbSet<DirectMessage> DirectMessages => Set<DirectMessage>();
public DbSet<Notification> Notifications => Set<Notification>();
```

### OnModelCreating Additions

```csharp
// Post
modelBuilder.Entity<Post>(e =>
{
    e.HasKey(p => p.Id);
    e.Property(p => p.Content).HasMaxLength(500);
    e.HasOne(p => p.User).WithMany(u => u.Posts).HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
    e.HasOne(p => p.LinkedWorkout).WithMany().HasForeignKey(p => p.LinkedWorkoutId).OnDelete(DeleteBehavior.SetNull);
    e.HasOne(p => p.LinkedMeal).WithMany().HasForeignKey(p => p.LinkedMealId).OnDelete(DeleteBehavior.SetNull);
    e.HasOne(p => p.LinkedDailyEntry).WithMany().HasForeignKey(p => p.LinkedDailyEntryId).OnDelete(DeleteBehavior.SetNull);
    e.HasIndex(p => new { p.UserId, p.CreatedAt });
});

// Like
modelBuilder.Entity<Like>(e =>
{
    e.HasKey(l => l.Id);
    e.HasIndex(l => new { l.UserId, l.PostId }).IsUnique();
    e.HasOne(l => l.User).WithMany(u => u.Likes).HasForeignKey(l => l.UserId).OnDelete(DeleteBehavior.Cascade);
    e.HasOne(l => l.Post).WithMany(p => p.Likes).HasForeignKey(l => l.PostId).OnDelete(DeleteBehavior.Cascade);
});

// Comment
modelBuilder.Entity<Comment>(e =>
{
    e.HasKey(c => c.Id);
    e.Property(c => c.Content).HasMaxLength(300);
    e.HasOne(c => c.User).WithMany(u => u.Comments).HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.Cascade);
    e.HasOne(c => c.Post).WithMany(p => p.Comments).HasForeignKey(c => c.PostId).OnDelete(DeleteBehavior.Cascade);
});

// Follow
modelBuilder.Entity<Follow>(e =>
{
    e.HasKey(f => f.Id);
    e.HasIndex(f => new { f.FollowerId, f.FollowingId }).IsUnique();
    e.HasOne(f => f.Follower).WithMany(u => u.Following).HasForeignKey(f => f.FollowerId).OnDelete(DeleteBehavior.Restrict);
    e.HasOne(f => f.Following).WithMany(u => u.Followers).HasForeignKey(f => f.FollowingId).OnDelete(DeleteBehavior.Restrict);
});

// Conversation (DM, not AI chat)
modelBuilder.Entity<Conversation>(e =>
{
    e.HasKey(c => c.Id);
    e.HasMany(c => c.Participants).WithOne(p => p.Conversation).HasForeignKey(p => p.ConversationId).OnDelete(DeleteBehavior.Cascade);
    e.HasMany(c => c.Messages).WithOne(m => m.Conversation).HasForeignKey(m => m.ConversationId).OnDelete(DeleteBehavior.Cascade);
});

// ConversationParticipant
modelBuilder.Entity<ConversationParticipant>(e =>
{
    e.HasKey(cp => cp.Id);
    e.HasIndex(cp => new { cp.ConversationId, cp.UserId }).IsUnique();
    e.HasOne(cp => cp.User).WithMany(u => u.ConversationParticipants).HasForeignKey(cp => cp.UserId).OnDelete(DeleteBehavior.Cascade);
});

// DirectMessage
modelBuilder.Entity<DirectMessage>(e =>
{
    e.HasKey(m => m.Id);
    e.HasOne(m => m.Sender).WithMany().HasForeignKey(m => m.SenderId).OnDelete(DeleteBehavior.Restrict);
    e.HasIndex(m => new { m.ConversationId, m.SentAt });
});

// Notification
modelBuilder.Entity<Notification>(e =>
{
    e.HasKey(n => n.Id);
    e.HasOne(n => n.Recipient).WithMany(u => u.ReceivedNotifications).HasForeignKey(n => n.RecipientId).OnDelete(DeleteBehavior.Cascade);
    e.HasOne(n => n.Actor).WithMany().HasForeignKey(n => n.ActorId).OnDelete(DeleteBehavior.Restrict);
    e.HasIndex(n => new { n.RecipientId, n.IsRead, n.CreatedAt });
});
```

---

## 3. DTO Definitions

### SocialDtos.cs (FitApp.Api/Models/DTOs/SocialDtos.cs)

```csharp
using System.ComponentModel.DataAnnotations;

namespace FitApp.Api.Models.DTOs;

// --- Requests ---

public class CreatePostRequest
{
    [Required]
    [MaxLength(500)]
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int? LinkedWorkoutId { get; set; }
    public int? LinkedMealId { get; set; }
    public int? LinkedDailyEntryId { get; set; }
}

public class CreateCommentRequest
{
    [Required]
    [MaxLength(300)]
    public string Content { get; set; } = string.Empty;
}

// --- Responses ---

public class PostResponse
{
    public int Id { get; set; }
    public UserSummary Author { get; set; } = null!;
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public LinkedContentPreview? LinkedContent { get; set; }
    public int LikesCount { get; set; }
    public int CommentsCount { get; set; }
    public bool IsLikedByMe { get; set; }
    public bool IsFollowingAuthor { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UserSummary
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
}

public class LinkedContentPreview
{
    public string Type { get; set; } = string.Empty;          // "workout" | "meal" | "daily"
    public string Title { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public string BadgeColor { get; set; } = string.Empty;
}

public class LikeToggleResponse
{
    public bool IsLiked { get; set; }
    public int LikesCount { get; set; }
}

public class FollowToggleResponse
{
    public bool IsFollowing { get; set; }
    public int FollowersCount { get; set; }
}

public class CommentResponse
{
    public int Id { get; set; }
    public UserSummary Author { get; set; } = null!;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsOwnComment { get; set; }
}

public class UserSocialProfileResponse
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public int PostsCount { get; set; }
    public int FollowersCount { get; set; }
    public int FollowingCount { get; set; }
    public bool IsFollowedByMe { get; set; }
    public bool IsOwnProfile { get; set; }
}

public class PaginatedResponse<T>
{
    public List<T> Items { get; set; } = [];
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public bool HasMore { get; set; }
}
```

### ConversationDtos.cs (FitApp.Api/Models/DTOs/ConversationDtos.cs)

```csharp
using System.ComponentModel.DataAnnotations;

namespace FitApp.Api.Models.DTOs;

// --- Requests ---

public class CreateConversationRequest
{
    [Required]
    public string TargetUserId { get; set; } = string.Empty;
}

public class SendMessageRequest
{
    [MaxLength(2000)]
    public string? Content { get; set; }
    [MaxLength(7000000)]  // ~5MB base64
    public string? ImageBase64 { get; set; }
    public string? ImageMimeType { get; set; }
}

// --- Responses ---

public class ConversationSummaryResponse
{
    public int Id { get; set; }
    public UserSummary OtherParticipant { get; set; } = null!;
    public MessagePreview? LastMessage { get; set; }
    public int UnreadCount { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class MessagePreview
{
    public string? Content { get; set; }
    public bool HasImage { get; set; }
    public DateTime SentAt { get; set; }
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
```

### NotificationDtos.cs (FitApp.Api/Models/DTOs/NotificationDtos.cs)

```csharp
namespace FitApp.Api.Models.DTOs;

public class NotificationResponse
{
    public int Id { get; set; }
    public UserSummary Actor { get; set; } = null!;
    public string Type { get; set; } = string.Empty;          // "like" | "comment" | "follow" | "message"
    public string Message { get; set; } = string.Empty;
    public int? ReferenceId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UnreadCountResponse
{
    public int Count { get; set; }
}
```

---

## 4. API Endpoint Contracts

### Social Endpoints -- SocialController [Route("api/social")]

All endpoints require [Authorize] (Bearer token).

#### GET /api/social/feed
Paginated feed of posts from followed users + own posts, ordered by CreatedAt DESC.

Query params: page (int, default 1), pageSize (int, default 10)

Response: PaginatedResponse<PostResponse>

#### GET /api/social/discover
Paginated posts from non-followed users, ordered by CreatedAt DESC.

Query params: page (int, default 1), pageSize (int, default 10)

Response: PaginatedResponse<PostResponse>

#### POST /api/social/posts
Create a new post.

Request body: CreatePostRequest

Response: PostResponse (201 Created)

Validation:
- Content required, max 500 chars
- LinkedWorkoutId/LinkedMealId/LinkedDailyEntryId must belong to the requesting user if provided
- At most one linked content item (workout OR meal OR daily, not multiple)

#### DELETE /api/social/posts/{id}
Delete own post.

Response: 204 No Content

Security: Post.UserId must match JWT userId. Return 403 if not owner.

#### POST /api/social/posts/{id}/like
Toggle like on a post.

Response: LikeToggleResponse

Security: Cannot like own post (Post.UserId != JWT userId). Return 400 if own post.

Side effect: If liking (not unliking), create Notification for post owner.

#### GET /api/social/posts/{id}/comments
Paginated comments for a post, ordered by CreatedAt ASC.

Query params: page (int, default 1), pageSize (int, default 20)

Response: PaginatedResponse<CommentResponse>

#### POST /api/social/posts/{id}/comments
Add a comment to a post.

Request body: CreateCommentRequest

Response: CommentResponse (201 Created)

Side effect: Increment Post.CommentsCount. Create Notification for post owner (if commenter != owner).

#### DELETE /api/social/posts/{id}/comments/{commentId}
Delete own comment.

Response: 204 No Content

Security: Comment.UserId must match JWT userId. Return 403 if not owner.

Side effect: Decrement Post.CommentsCount.

#### POST /api/social/follow/{userId}
Toggle follow on a user.

Response: FollowToggleResponse

Security: Cannot follow self (userId != JWT userId). Return 400 if self.

Side effect: If following (not unfollowing), create Notification for followed user.

#### GET /api/social/profile/{userId}
Get social profile of a user.

Response: UserSocialProfileResponse

SECURITY: Never expose BMI, BMR, TDEE, weight, goalCalories, email. Only expose: displayName, avatarUrl, bio (future field), counts, follow status.

#### GET /api/social/profile/{userId}/posts
Get paginated posts for a specific user.

Query params: page (int, default 1), pageSize (int, default 10)

Response: PaginatedResponse<PostResponse>

### Conversation Endpoints -- ConversationsController [Route("api/conversations")]

All endpoints require [Authorize] (Bearer token).

#### GET /api/conversations
List all conversations for the current user, ordered by most recent message.

Response: List<ConversationSummaryResponse>

#### POST /api/conversations
Create a new 1:1 conversation or return existing one.

Request body: CreateConversationRequest

Response: ConversationSummaryResponse

Logic:
- Check if a conversation already exists between JWT userId and TargetUserId
- If exists, return the existing conversation
- If not, create new Conversation + 2 ConversationParticipants
- TargetUserId must be a valid user. Return 404 if not found.
- Cannot create conversation with self. Return 400.

#### GET /api/conversations/{id}/messages
Cursor-based message history.

Query params: beforeMessageId (int?, for cursor), pageSize (int, default 30)

Response: List<DirectMessageResponse>

Logic:
- If beforeMessageId provided, return messages with Id < beforeMessageId
- Ordered by SentAt DESC (newest first), client reverses for display
- Soft-deleted messages: return with IsDeleted=true, Content=null, ImageUrl=null

Security: Verify JWT userId is a ConversationParticipant. Return 403 if not.

#### POST /api/conversations/{id}/messages
Send a message via REST (fallback when SignalR unavailable).

Request body: SendMessageRequest

Response: DirectMessageResponse (201 Created)

Validation: Content or ImageBase64 must be provided (at least one).

Security: Verify JWT userId is a ConversationParticipant. Return 403 if not.

Side effect: Create Notification for other participants. Push via SignalR if connected.

#### PUT /api/conversations/{id}/read
Mark all messages in conversation as read (update ConversationParticipant.LastReadAt).

Response: 204 No Content

Security: Verify JWT userId is a ConversationParticipant.

#### DELETE /api/conversations/{id}/messages/{messageId}
Soft delete own message (set IsDeleted=true, clear Content and ImageUrl).

Response: 204 No Content

Security: DirectMessage.SenderId must match JWT userId. Return 403 if not owner.

### Notification Endpoints -- NotificationsController [Route("api/notifications")]

All endpoints require [Authorize] (Bearer token).

#### GET /api/notifications
Paginated notifications for the current user, ordered by CreatedAt DESC.

Query params: page (int, default 1), pageSize (int, default 20)

Response: PaginatedResponse<NotificationResponse>

#### GET /api/notifications/unread-count
Get unread notification count.

Response: UnreadCountResponse

#### PUT /api/notifications/read-all
Mark all notifications as read.

Response: 204 No Content

#### PUT /api/notifications/{id}/read
Mark a single notification as read.

Response: 204 No Content

Security: Notification.RecipientId must match JWT userId.

---

## 5. SignalR Hub Contracts

### ChatHub (path: /hubs/chat)

Requires [Authorize]. JWT passed via query string: ?access_token={jwt}

#### Server Methods (client invokes)

| Method | Parameters | Description |
|--------|-----------|-------------|
| JoinConversation | conversationId: int | Verify participant, add to group conv-{id} |
| LeaveConversation | conversationId: int | Remove from group conv-{id} |
| SendMessage | conversationId: int, content: string?, imageBase64: string?, imageMimeType: string? | Save message, broadcast to group, trigger notification |

#### Client Events (server pushes)

| Event | Payload | Description |
|-------|---------|-------------|
| ReceiveMessage | DirectMessageResponse | New message in a joined conversation |

#### Connection Lifecycle
- OnConnectedAsync: extract userId from Context.User claims, add to group "user-{userId}"
- OnDisconnectedAsync: automatic group removal by SignalR framework

### NotificationHub (path: /hubs/notifications)

Requires [Authorize]. JWT passed via query string: ?access_token={jwt}

#### Server Methods
None -- push-only hub.

#### Client Events (server pushes)

| Event | Payload | Description |
|-------|---------|-------------|
| ReceiveNotification | NotificationResponse | New notification for the user |

#### Connection Lifecycle
- OnConnectedAsync: extract userId from Context.User claims, add to group "user-{userId}"
- OnDisconnectedAsync: automatic group removal

### Program.cs Changes for SignalR

```csharp
// Add to service registration section
builder.Services.AddSignalR();

// Update CORS policy -- add AllowCredentials
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("Angular", policy => policy
        .WithOrigins("http://localhost:4200", "https://localhost:4200")
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());   // Required for SignalR
});

// Add JWT events for SignalR token extraction (inside AddJwtBearer config)
opt.Events = new JwtBearerEvents
{
    OnMessageReceived = context =>
    {
        var accessToken = context.Request.Query["access_token"];
        var path = context.HttpContext.Request.Path;
        if (!string.IsNullOrEmpty(accessToken) &&
            path.StartsWithSegments("/hubs"))
        {
            context.Token = accessToken;
        }
        return Task.CompletedTask;
    }
};

// Register new services
builder.Services.AddScoped<SocialService>();
builder.Services.AddScoped<ConversationService>();
builder.Services.AddScoped<NotificationService>();

// Map hubs (after app.MapControllers())
app.MapHub<ChatHub>("/hubs/chat");
app.MapHub<NotificationHub>("/hubs/notifications");
```

---

## 6. TypeScript Interface Definitions

### social.model.ts (fit-app/src/app/core/models/social.model.ts)

```typescript
export interface PostResponse {
  id: number;
  author: UserSummary;
  content: string;
  imageUrl?: string;
  linkedContent?: LinkedContentPreview;
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  isFollowingAuthor: boolean;
  createdAt: string;   // ISO date string
}

export interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface LinkedContentPreview {
  type: 'workout' | 'meal' | 'daily';
  title: string;
  subtitle: string;
  badgeColor: string;
}

export interface CreatePostRequest {
  content: string;
  imageUrl?: string;
  linkedWorkoutId?: number;
  linkedMealId?: number;
  linkedDailyEntryId?: number;
}

export interface LikeToggleResponse {
  isLiked: boolean;
  likesCount: number;
}

export interface FollowToggleResponse {
  isFollowing: boolean;
  followersCount: number;
}

export interface CreateCommentRequest {
  content: string;
}

export interface CommentResponse {
  id: number;
  author: UserSummary;
  content: string;
  createdAt: string;
  isOwnComment: boolean;
}

export interface UserSocialProfileResponse {
  id: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowedByMe: boolean;
  isOwnProfile: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}
```

### chat.model.ts (fit-app/src/app/core/models/chat.model.ts)

```typescript
import { UserSummary } from './social.model';

export interface CreateConversationRequest {
  targetUserId: string;
}

export interface ConversationSummaryResponse {
  id: number;
  otherParticipant: UserSummary;
  lastMessage?: MessagePreview;
  unreadCount: number;
  updatedAt: string;
}

export interface MessagePreview {
  content?: string;
  hasImage: boolean;
  sentAt: string;
}

export interface DirectMessageResponse {
  id: number;
  conversationId: number;
  sender: UserSummary;
  content?: string;
  imageUrl?: string;
  sentAt: string;
  isDeleted: boolean;
  isOwn: boolean;
}

export interface SendMessageRequest {
  content?: string;
  imageBase64?: string;
  imageMimeType?: string;
}
```

### notification.model.ts (fit-app/src/app/core/models/notification.model.ts)

```typescript
import { UserSummary } from './social.model';

export type NotificationType = 'like' | 'comment' | 'follow' | 'message';

export interface NotificationResponse {
  id: number;
  actor: UserSummary;
  type: NotificationType;
  message: string;
  referenceId?: number;
  isRead: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}
```

---

## 7. Implementation Checklists

### Checklist for @dotnet-developer

#### Phase 1: Data Layer
- [ ] Create FitApp.Api/Models/Entities/Post.cs
- [ ] Create FitApp.Api/Models/Entities/Like.cs
- [ ] Create FitApp.Api/Models/Entities/Comment.cs
- [ ] Create FitApp.Api/Models/Entities/Follow.cs
- [ ] Create FitApp.Api/Models/Entities/Conversation.cs
- [ ] Create FitApp.Api/Models/Entities/ConversationParticipant.cs
- [ ] Create FitApp.Api/Models/Entities/DirectMessage.cs
- [ ] Create FitApp.Api/Models/Entities/Notification.cs (includes NotificationType enum)
- [ ] Update FitApp.Api/Models/Entities/User.cs -- add navigation properties
- [ ] Update FitApp.Api/Data/AppDbContext.cs -- add DbSets and OnModelCreating config
- [ ] Run: dotnet ef migrations add AddSocialChatNotifications --project FitApp.Api
- [ ] Verify migration file looks correct (no data loss)

#### Phase 2: DTOs
- [ ] Create FitApp.Api/Models/DTOs/SocialDtos.cs
- [ ] Create FitApp.Api/Models/DTOs/ConversationDtos.cs
- [ ] Create FitApp.Api/Models/DTOs/NotificationDtos.cs

#### Phase 3: Services
- [ ] Create FitApp.Api/Services/NotificationService.cs
  - CreateAsync(recipientId, actorId, type, referenceId?, message)
  - GetNotificationsAsync(userId, page, pageSize)
  - GetUnreadCountAsync(userId)
  - MarkAsReadAsync(notificationId, userId)
  - MarkAllAsReadAsync(userId)
  - Injects IHubContext<NotificationHub> to push ReceiveNotification
- [ ] Create FitApp.Api/Services/SocialService.cs
  - GetFeedAsync(userId, page, pageSize)
  - GetDiscoverAsync(userId, page, pageSize)
  - CreatePostAsync(userId, request)
  - DeletePostAsync(postId, userId)
  - ToggleLikeAsync(postId, userId) -- injects NotificationService
  - GetCommentsAsync(postId, page, pageSize, requestingUserId)
  - AddCommentAsync(postId, userId, request) -- injects NotificationService
  - DeleteCommentAsync(postId, commentId, userId)
  - ToggleFollowAsync(followerId, followingId) -- injects NotificationService
  - GetProfileAsync(userId, requestingUserId)
  - GetUserPostsAsync(userId, requestingUserId, page, pageSize)
- [ ] Create FitApp.Api/Services/ConversationService.cs
  - GetConversationsAsync(userId)
  - CreateOrGetConversationAsync(userId, targetUserId)
  - GetMessagesAsync(conversationId, userId, beforeMessageId?, pageSize)
  - SendMessageAsync(conversationId, senderId, request) -- injects NotificationService
  - MarkAsReadAsync(conversationId, userId)
  - DeleteMessageAsync(conversationId, messageId, userId)
  - IsParticipantAsync(conversationId, userId) -- used by ChatHub

#### Phase 4: Hubs
- [ ] Create directory FitApp.Api/Hubs/
- [ ] Create FitApp.Api/Hubs/NotificationHub.cs
- [ ] Create FitApp.Api/Hubs/ChatHub.cs
  - Inject ConversationService (use IServiceScopeFactory since hubs are transient)
  - OnConnectedAsync: get userId, add to user group
  - JoinConversation: verify via service, add to conv group
  - LeaveConversation: remove from conv group
  - SendMessage: validate, save via service, broadcast to conv group

#### Phase 5: Controllers
- [ ] Create FitApp.Api/Controllers/SocialController.cs
- [ ] Create FitApp.Api/Controllers/ConversationsController.cs
- [ ] Create FitApp.Api/Controllers/NotificationsController.cs
  - Follow pattern from ChatController: UserId property, try/catch, inject service via primary constructor

#### Phase 6: Program.cs
- [ ] Add builder.Services.AddSignalR()
- [ ] Add .AllowCredentials() to CORS policy
- [ ] Register SocialService, ConversationService, NotificationService as Scoped
- [ ] Add JwtBearerEvents.OnMessageReceived for SignalR token extraction
- [ ] Add app.MapHub<ChatHub>("/hubs/chat")
- [ ] Add app.MapHub<NotificationHub>("/hubs/notifications")

### Checklist for @angular-developer

#### Phase 1: Dependencies and Models
- [ ] Run: npm install @microsoft/signalr (in fit-app/ directory)
- [ ] Create fit-app/src/app/core/models/social.model.ts
- [ ] Create fit-app/src/app/core/models/chat.model.ts
- [ ] Create fit-app/src/app/core/models/notification.model.ts

#### Phase 2: API Services
- [ ] Create fit-app/src/app/api/social.service.ts
- [ ] Create fit-app/src/app/api/conversation.service.ts
- [ ] Create fit-app/src/app/api/notification.service.ts
  - All inject HttpClient, use environment.apiUrl as base
  - Follow pattern from existing API services (account.service.ts, blog.service.ts)

#### Phase 3: SignalR Services
- [ ] Create fit-app/src/app/core/services/chat-hub.service.ts
- [ ] Create fit-app/src/app/core/services/notification-hub.service.ts
  - Both: Injectable providedIn root
  - Build HubConnection with .withUrl(url, { accessTokenFactory })
  - Handle reconnection with .withAutomaticReconnect()
  - Expose connection state as a signal
  - Register ReceiveMessage and ReceiveNotification event handlers
  - Use callbacks or Subject/Signal to emit received events to facades

#### Phase 4: Facades
- [ ] Create fit-app/src/app/core/facade/social.facade.ts (new)
  - Signals: feedPosts, discoverPosts, feedLoading, discoverLoading, currentProfile, profilePosts
  - Methods: loadFeed, loadDiscover, createPost, deletePost, toggleLike, loadComments, addComment, deleteComment, toggleFollow, loadProfile, loadUserPosts
- [ ] Replace fit-app/src/app/core/facade/social-chat.facade.ts
  - Signals: conversations, activeMessages, unreadConversationsCount
  - Methods: loadConversations, createOrGetConversation, loadMessages, sendMessage, markAsRead, deleteMessage, connectHub, disconnectHub
  - On ReceiveMessage: update activeMessages signal, update conversations list
- [ ] Replace fit-app/src/app/core/facade/social-notifications.facade.ts
  - Signals: notifications, unreadCount
  - Methods: loadNotifications, loadUnreadCount, markAllAsRead, markAsRead, connectHub, disconnectHub
  - On ReceiveNotification: prepend to notifications signal, increment unreadCount

#### Phase 5: Feature Components
- [ ] Implement fit-app/src/app/features/social/feed/social-feed.component.ts
  - Inject SocialFacade
  - Load feed on init, infinite scroll or load-more button
  - Post card with like/comment/follow actions
  - Create post button/dialog
- [ ] Implement fit-app/src/app/features/social/discover/social-discover.component.ts
  - Inject SocialFacade
  - Load discover posts, follow suggestions
- [ ] Implement fit-app/src/app/features/social/post-detail/social-post-detail.component.ts
  - Inject SocialFacade
  - Full post view with comments list and add comment input
- [ ] Implement fit-app/src/app/features/social/social-profile/social-profile.component.ts
  - Inject SocialFacade
  - Profile header with stats, follow button, posts list
- [ ] Implement fit-app/src/app/features/social/chat/social-chat.component.ts
  - Inject SocialChatFacade
  - Conversation list with unread indicators
  - New conversation button
- [ ] Implement fit-app/src/app/features/social/chat-detail/social-chat-detail.component.ts
  - Inject SocialChatFacade
  - Message thread, real-time updates via SignalR
  - Message input with image attachment support
  - Join/leave conversation groups on route enter/exit
- [ ] Implement fit-app/src/app/features/social/notifications/social-notifications.component.ts
  - Inject SocialNotificationsFacade
  - Notification list with mark-as-read
  - Mark all as read button
  - Click notification to navigate to relevant content

#### Phase 6: Shell Integration
- [ ] Update SocialShellComponent to connect notification + chat hubs on init
- [ ] Disconnect hubs on destroy
- [ ] Load unread counts on init
- [ ] Verify app.routes.ts component export names match actual implementations

### Checklist for @uiux-designer

- [ ] Design spec for social feed post card component
- [ ] Design spec for create-post dialog/inline form
- [ ] Design spec for post detail page with comments
- [ ] Design spec for discover page layout
- [ ] Design spec for social profile page header and layout
- [ ] Design spec for conversation list
- [ ] Design spec for chat detail (message bubbles, input bar)
- [ ] Design spec for notifications page
- [ ] All specs must use dark theme, glassmorphism, design system colors

Write to: .claude/design-specs/social-features.md
