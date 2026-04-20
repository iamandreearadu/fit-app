# ADR: Social Feed, Real-time Direct Messaging, and In-app Notifications

**Status:** DRAFT
**Author:** @tech-architect
**Date:** 2026-04-06

---

## Context

FitApp has a working social shell (routing, layout, placeholder components) established in the besocial-shell ADR. The shell provides the navigation chrome (sidebar, top bar, bottom nav) and lazy-loaded child routes. Now we need to build the actual features behind those routes:

1. **Social Feed** -- users post updates (text, images, linked workouts/meals/daily entries), follow other users, like and comment on posts.
2. **Real-time Direct Messaging** -- 1:1 conversations between users with SignalR for instant delivery.
3. **In-app Notifications** -- pushed in real-time when someone likes, comments, follows, or messages the user.

These three features are deeply interconnected (a like creates a notification; a message creates a notification; a follow affects the feed) so they are designed together in a single ADR.

### Key Constraints
- User.Id is string (GUID), not int -- all FKs to User must be string
- Existing ChatConversation and ChatMessage entities are for AI chat -- the new direct messaging entities use different names to avoid collision
- SQLite is the database -- no native array types, no advanced JSON operators
- No SignalR is currently configured -- needs to be added to Program.cs and the Angular frontend
- Frontend needs @microsoft/signalr npm package (not currently installed)

---

## Decision

### Architecture Overview

Backend adds:
- 3 new controllers: SocialController, ConversationsController, NotificationsController
- 3 new services: SocialService, ConversationService, NotificationService
- 2 SignalR hubs: ChatHub, NotificationHub
- 8 new EF entities (see Data Model below)
- 1 new EF migration

Frontend adds:
- 3 new API services: social.service.ts, conversation.service.ts, notification.service.ts
- 2 new SignalR services: chat-hub.service.ts, notification-hub.service.ts
- 3 facades evolve: social.facade.ts (new), social-chat.facade.ts (replace stub), social-notifications.facade.ts (replace stub)
- 3 new TypeScript model files
- npm package: @microsoft/signalr

---

## Clean Architecture Boundaries

### Backend
- **Controller responsibility:** HTTP concerns only -- parse request, extract userId from JWT claims, call service, return response. No EF queries in controllers.
- **Service responsibility:** All business logic -- authorization checks, data retrieval, count updates, notification triggering via IHubContext.
- **Hub responsibility:** Connection management (groups), message relay via services. Hubs call services for persistence -- they do NOT query EF directly.
- **What stays out of controllers:** EF queries, hub context calls, business rules.
- **What stays out of hubs:** Direct EF queries, complex validation.

### Frontend
- **Component responsibility:** UI rendering, user interaction, reading signals. No HTTP calls, no business logic.
- **Facade responsibility:** Orchestrate API calls, manage signal state, connect SignalR services to state updates.
- **API service responsibility:** HTTP calls only -- map to backend endpoints.
- **SignalR service responsibility:** Connection lifecycle, event subscription, reconnection logic.
- **What stays out of components:** HTTP calls, SignalR subscriptions, direct store manipulation.

---

## Data Model

Full C# entity definitions, DTOs, and TypeScript interfaces are in the contract file: .claude/contracts/social-chat-notifications.md

### Entity Relationship Summary

- **Post** belongs to User. Has many Likes, Comments. Optional FK to WorkoutTemplate, MealEntry, DailyEntry.
- **Like** belongs to User and Post. UNIQUE(UserId, PostId).
- **Comment** belongs to User and Post. CASCADE on Post delete.
- **Follow**: FollowerId -> User, FollowingId -> User. UNIQUE(FollowerId, FollowingId). Self-follow prevented at service layer.
- **Conversation** has many ConversationParticipants and DirectMessages. CASCADE on delete.
- **ConversationParticipant** belongs to Conversation and User. UNIQUE(ConversationId, UserId).
- **DirectMessage** belongs to Conversation and Sender(User). Soft-delete via IsDeleted flag.
- **Notification** belongs to Recipient(User) and Actor(User). INDEX(RecipientId, IsRead, CreatedAt).

### User Entity Modifications
Add navigation properties to User.cs (no new columns):
- Posts, Likes, Comments, Followers, Following, ConversationParticipants, ReceivedNotifications

### Delete Behavior
- CASCADE: Post->Likes, Post->Comments, Conversation->Participants, Conversation->Messages, User->Posts/Likes/Comments
- RESTRICT: Follow(both FKs), DirectMessage.Sender, Notification.Actor
- SET NULL: Post->LinkedWorkout/Meal/DailyEntry

---

## SignalR Hub Design

### ChatHub (/hubs/chat)
- [Authorize] required
- OnConnectedAsync: add to group "user-{userId}"
- JoinConversation(conversationId): verify participant via service, add to "conv-{conversationId}"
- LeaveConversation(conversationId): remove from "conv-{conversationId}"
- SendMessage(conversationId, content?, imageBase64?, imageMimeType?): validate, save via ConversationService, broadcast ReceiveMessage to group, trigger notification
- JWT via query string access_token for WebSocket handshake

### NotificationHub (/hubs/notifications)
- [Authorize] required
- OnConnectedAsync: add to group "user-{userId}"
- Push-only -- no client-to-server methods
- Server pushes ReceiveNotification(NotificationResponse) via IHubContext<NotificationHub>

### JWT for SignalR WebSocket
Configure JwtBearerEvents.OnMessageReceived to extract token from query string when path starts with /hubs/.

### CORS Update
Add .AllowCredentials() to existing CORS policy for SignalR support.

### Program.cs Additions
- builder.Services.AddSignalR()
- app.MapHub<ChatHub>("/hubs/chat")
- app.MapHub<NotificationHub>("/hubs/notifications")

---

## Notification Trigger Map

| Trigger | Recipient | Type | ReferenceId | Message | Skip If |
|---|---|---|---|---|---|
| Like | Post.UserId | Like(0) | PostId | "{actor} liked your post" | actor == recipient |
| Comment | Post.UserId | Comment(1) | PostId | "{actor} commented on your post" | actor == recipient |
| Follow | FollowingId | Follow(2) | null | "{actor} started following you" | never |
| DM | Other participants | NewMessage(3) | ConversationId | "{actor} sent you a message" | actor == recipient |

After DB save, push via IHubContext<NotificationHub> to "user-{recipientId}".

---

## Security Rules

1. JWT userId extraction: User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")
2. Post deletion: only post author can delete
3. Comment deletion: only comment author can delete
4. Like toggle: cannot like own post
5. Follow toggle: cannot follow self
6. Social profile: NEVER expose BMI, BMR, TDEE, weight, goalCalories, email to other users
7. Conversation messages: verify ConversationParticipant before returning
8. SignalR JoinConversation: verify participant before joining group
9. Message deletion: soft delete, sender only
10. Image upload: validate MIME (jpeg, png, gif, webp) and 5MB max
11. DM creation: deduplicate -- return existing conversation if one already exists

---

## Instructions for @dotnet-developer

See contract file for full implementation details. Implement in this order:

1. Create 8 entity files in Models/Entities/
2. Update User.cs with navigation properties
3. Update AppDbContext.cs with DbSets and OnModelCreating config
4. Create DTOs in Models/DTOs/ (SocialDtos.cs, ConversationDtos.cs, NotificationDtos.cs)
5. Create services in Services/ (SocialService, ConversationService, NotificationService)
6. Create hubs in Hubs/ (ChatHub, NotificationHub)
7. Create controllers (SocialController, ConversationsController, NotificationsController)
8. Update Program.cs (SignalR, CORS, JWT events, hub mapping, service registration)
9. Create and verify EF migration

---

## Instructions for @angular-developer

See contract file for full implementation details. Implement in this order:

1. Install @microsoft/signalr
2. Create TypeScript model files in core/models/
3. Create API services in api/
4. Create SignalR services in core/services/
5. Replace stub facades in core/facade/
6. Implement feature components in features/social/
7. Connect SignalR hubs on social shell init
8. Verify app.routes.ts component exports match

---

## Instructions for @uiux-designer

Design specs needed for:
- Social feed post card
- Discover page layout
- Post detail page with comments
- Social profile page
- Conversation list and chat detail
- Notifications page
- Create post dialog/page

Write to .claude/design-specs/social-features.md

---

## Consequences and Trade-offs

### What we gain
- Real-time UX via SignalR -- no polling needed
- Unified notification pipeline for all social events
- Cached counters avoid expensive COUNT queries on feed load
- Cursor-based pagination for messages -- no offset drift
- Soft delete for messages preserves conversation integrity

### What we accept
- SignalR adds infrastructure complexity
- Cached counters can drift (reconciliation job can be added later)
- SQLite write concurrency limitations (sufficient for expected user base)
- Images stored as base64 data URLs (future ADR for file storage)
- 1:1 conversations only (no group chat)

### What must NOT happen
- Entities NEVER appear in API responses -- always use DTOs
- Components NEVER call API services directly -- always through facades
- Hubs NEVER query EF directly -- always through services
- User health metrics NEVER leak in social profile responses
- No RxJS subscriptions without takeUntilDestroyed() cleanup
