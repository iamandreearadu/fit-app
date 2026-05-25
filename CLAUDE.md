# FitApp — AI Agent Team Context

Full-stack fitness tracking + social platform: **Angular 19** (frontend) + **.NET 10** (backend).

---

## Repository Structure

```
FitApp/
├── FitApp.Api/          ← .NET 10 Web API
├── fit-app/             ← Angular 19 SPA
├── FitApp.sln
├── CLAUDE.md            ← YOU ARE HERE
└── .claude/
    ├── settings.json
    ├── agents/          ← agent definitions
    ├── decisions/       ← Architecture Decision Records (ADRs)
    ├── contracts/       ← API contracts shared between agents
    └── design-specs/    ← UI specs per feature
```

---

## Tech Stack (exact versions)

### Frontend — fit-app/

| Technology            | Version                  |
| --------------------- | ------------------------ |
| Angular               | 19.2.15                  |
| Angular Material      | 19.2.0                   |
| Chart.js + ng2-charts | 4.5.1 / 4.1.1            |
| ngx-toastr            | 19.1.0                   |
| TypeScript            | 5.7.2                    |
| @microsoft/signalr    | (latest)                 |
| State                 | Signals + Facade pattern |
| Styling               | Angular Material + CSS   |

### Backend — FitApp.Api/

| Technology                     | Version |
| ------------------------------ | ------- |
| .NET / ASP.NET Core            | 10.0    |
| Entity Framework Core (SQLite) | 10.0.5  |
| JWT Bearer Authentication      | 10.0.5  |
| BCrypt.Net-Next                | 4.1.0   |
| MailKit                        | 4.15.1  |
| Microsoft.AspNetCore.SignalR   | 10.0    |
| Database                       | SQLite  |

### External Services

- **Groq API** — LLM inference (Llama 3.1-8b-instant + Llama 4 Scout vision)
- **Gmail SMTP** — Transactional emails via MailKit

---

## Architecture

### Backend — Clean Layered Architecture

```
Controllers → Services → Entity Framework Core → SQLite
                                     ↑
                              SignalR Hubs (real-time push)
```

- Controllers handle HTTP only — no business logic
- Services contain all business logic
- DTOs always separate from EF Entities — never expose entities directly
- SignalR hubs for real-time: `NotificationHub`, `ChatHub`
- Migrations run automatically on startup via `db.Database.Migrate()`

### Frontend — Signals + Facade Pattern

```
Components → Facades (business logic) → API Services → HTTP → Backend
                                      ↘ SignalR Services → WebSocket → Hubs
```

- **Signals** for reactive state (Angular 19)
- **Facade** layer decouples components from HTTP/SignalR services
- `AuthInterceptor` attaches JWT to every request
- `AuthGuard` / `GuestGuard` protect routes
- Lazy-loaded routes per feature

### State stores (Signals-based)

- `auth.store` — authentication state
- `user.store` — user profile state

---

## Frontend Structure (fit-app/src/app/)

```
api/
  account.service.ts          Login, register
  blog.service.ts             Public blog CRUD
  conversation.service.ts     Direct messaging (REST + SignalR)
  groq-ai-api.service.ts      AI proxy calls (text, image, calories)
  notification.service.ts     Notification REST calls
  nutrition-tab.service.ts    Meals CRUD
  social.service.ts           Posts, likes, comments, follows, profiles
  stats.service.ts            Public profile stats
  user.service.ts             User profile CRUD
  workouts-tab.service.ts     Workout plans CRUD

core/
  facade/
    account.facade.ts
    blog.facade.ts
    chat.facade.ts            AI chat history (legacy)
    groq-ai.facade.ts         AI assistant orchestration
    notification.facade.ts    Notification state + real-time
    nutrition-tab.facade.ts
    social.facade.ts          Feed, posts, profiles, follows
    social-chat.facade.ts     Direct messaging (SignalR)
    social-notifications.facade.ts  Real-time notification push
    user.facade.ts
    workouts-tab.facade.ts
  guards/                     AuthGuard, GuestGuard
  interceptors/               AuthInterceptor (attaches JWT)
  material/                   Angular Material config
  models/                     TypeScript interfaces (source of truth)
  store/                      auth.store, user.store (Signals)
  system-prompt/              Groq AI prompts

features/
  auth/                       Login, Register
  blog/                       Public blog listing + post detail
  dashboard/                  Daily tracker + AI meal analyzer
  home/                       Landing page (hero, benefits, features)
  openai/                     AI Assistant (Groq chat with history)
  social/                     Social platform (see Social Module below)
  user/                       Profile, physical stats, fitness metrics
  workouts/                   Workout plans CRUD

shared/
  components/                 Header, Footer, ConfirmDialog, MoveUp
  services/                   Alert, FormError, LocalStorage, Navigation

app.routes.ts                 All routes — lazy-loaded
```

### Social Module (`features/social/`)

```
social/
  social-shell.component.ts         Layout shell with responsive nav
  feed/                             Posts from followed users (paginated)
  discover/                         Explore non-followed users
  post-detail/                      Single post with comments thread
  article-detail/                   User-written article full view
  social-profile/
    social-profile.component.ts     Profile: posts / workouts / blogs / stats tabs; avatar upload (camera overlay → base64 → PUT /api/users/me)
    stats-tab/                      Charts: streak, volume, weekly history
  chat/                             DM conversation list
  chat-detail/                      Real-time DM thread (SignalR)
  notifications/                    All notifications (like/comment/follow/message)
  components/
    post-card/                      Post UI: like, comment, follow, archive, delete; article inline expand + cover image
    create-content/                 Dialog: create post OR write article (portrait image, autosize textarea)
    create-post/                    Quick post dialog (legacy)
    edit-post/                      Edit post dialog
    write-article/                  Full article editor dialog (16:9 cover, autosize textarea)
    side-nav/                       Desktop sidebar navigation
    bottom-nav/                     Mobile bottom navigation
    top-bar/                        Mobile top bar with search
    daily-panel/                    Linked daily entry inline preview
```

---

## Backend Structure (FitApp.Api/)

```
Controllers/
  AuthController              POST /api/auth/register, /api/auth/login
  UsersController             GET/PUT /api/users/me, GET /api/users/{id}/stats
  DailyController             GET/POST /api/daily, GET /api/daily/history
  WorkoutsController          CRUD /api/workouts
  NutritionController         CRUD /api/nutrition
  BlogController              GET /api/blog (public), CRUD (Admin)
  AiController                POST /api/ai/text|image|workout-calories
  ChatController              CRUD /api/chat (AI conversation history)
  SocialController            Posts, likes, comments, follows, profiles, blogs
  ConversationsController     Direct messaging (REST)
  NotificationsController     Notification CRUD + mark read

Models/
  Entities/
    User                      Account + physical profile + computed metrics
    DailyEntry                (UserId, Date) unique index
    WorkoutTemplate           → WorkoutExercise, CardioDetails (cascade)
    MealEntry                 → FoodItem (cascade)
    BlogPost                  Admin + user-authored articles
    ChatConversation          → ChatMessage (cascade) — AI chat history
    Post                      Social feed post (text, image, linked content)
    Like                      (UserId, PostId) unique
    Comment                   Post comments
    Follow                    (FollowerId, FollowingId) unique
    Conversation              DM conversation → DirectMessage (cascade)
    ConversationParticipant   Many-to-many User ↔ Conversation
    DirectMessage             Chat message with soft delete
    Notification              Like/comment/follow/message notifications
  DTOs/                       Request/response objects (never expose entities)

Services/
  AiProxyService              Groq API proxy (text + vision)
  EmailService                MailKit / Gmail SMTP
  MetricsService              BMI, BMR, TDEE, water target calculations
  SocialService               Posts, feed, discover, profiles, likes, follows
  ConversationService         Direct messaging, cursor-based pagination
  NotificationService         Create + push via SignalR

Hubs/
  NotificationHub             /hubs/notifications — push to specific user
  ChatHub                     /hubs/chat — real-time DM delivery

Data/
  AppDbContext                DbContext + entity configurations
  Migrations/                 EF migrations (auto-applied via Migrate())

Program.cs                    DI registration, middleware, SignalR, CORS
```

---

## Database (SQLite + EF Core)

| Entity             | Key Constraints                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `User`             | Account + physical profile + computed metrics                                             |
| `DailyEntry`       | `(UserId, Date)` unique index                                                             |
| `WorkoutTemplate`  | Cascade delete → WorkoutExercise, CardioDetails                                           |
| `MealEntry`        | Cascade delete → FoodItem                                                                 |
| `BlogPost`         | `AuthorId` FK — admin posts + user social articles                                        |
| `ChatConversation` | Cascade delete → ChatMessage (AI chat)                                                    |
| `Post`             | `IsArchived` soft delete; optional FK to WorkoutTemplate, MealEntry, DailyEntry, BlogPost |
| `Like`             | `(UserId, PostId)` unique; cascade delete                                                 |
| `Comment`          | Cascade delete with Post                                                                  |
| `Follow`           | `(FollowerId, FollowingId)` unique                                                        |
| `Conversation`     | → ConversationParticipant → DirectMessage (cascade)                                       |
| `Notification`     | `IsRead`, `Type` enum, optional `ReferenceId`                                             |

**Migrations run automatically on startup** — `db.Database.Migrate()` in `Program.cs`.

---

## Authentication & Security

- **JWT Bearer** (HS256) — claims: `sub` (userId), role claims for admin
- **BCrypt** password hashing
- Frontend: `AuthInterceptor` injects `Authorization: Bearer <token>` on all requests
- SignalR: JWT passed via query string (`access_token`) on hub connections
- CORS: restricted to `http://localhost:4200` / `https://localhost:4200`
- Admin seeded on first run: `andreea@gmail.com`
- `UserId` always extracted from JWT claims — never from request body

---

## Real-time (SignalR)

| Hub               | URL                   | Events pushed                                                                                                          |
| ----------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `NotificationHub` | `/hubs/notifications` | `ReceiveNotification` → per-user                                                                                       |
| `ChatHub`         | `/hubs/chat`          | `ReceiveMessage`, `MessageDeleted` → per-conversation group; `NewConversationMessage` → per-user group (badge updates) |

Frontend connects on login, disconnects on logout. JWT authenticated via query string.

---

## AI Integration (Groq)

| Feature              | Model                                       | Endpoint                      |
| -------------------- | ------------------------------------------- | ----------------------------- |
| AI Chat              | `llama-3.1-8b-instant`                      | POST /api/ai/text             |
| Meal Analyzer        | `meta-llama/llama-4-scout-17b-16e-instruct` | POST /api/ai/image            |
| Workout Calorie Est. | `llama-3.1-8b-instant`                      | POST /api/ai/workout-calories |

Backend `AiProxyService` handles all Groq API calls. Image analyzer: base64 input.  
AI chat history stored in `ChatConversation` / `ChatMessage` entities.

---

## Design System (Summary)

Full spec: `.claude/design-specs/design-system.md`

- **Theme**: Dark only — `#0d0d10` surface
- **Primary**: `#7c4dff` (purple) — `var(--primary)`
- **Accent**: `#ff4081` (pink) — `var(--accent)`
- **Font**: Poppins (400/700/800)
- **Style**: Glassmorphism — `backdrop-filter: blur()`, semi-transparent borders
- **Motion**: 0.15s–0.3s ease — all interactive states animated

---

## API Reference

```
POST   /api/auth/register                           Public
POST   /api/auth/login                              Public

GET    /api/users/me                                Bearer
PUT    /api/users/me                                Bearer
GET    /api/users/{userId}/stats                    Bearer

GET    /api/daily?date=                             Bearer
GET    /api/daily/history                           Bearer
POST   /api/daily                                   Bearer

CRUD   /api/workouts                                Bearer
CRUD   /api/nutrition                               Bearer

GET    /api/blog                                    Public
GET    /api/blog/{id}                               Public
POST/PUT/DELETE /api/blog                           Admin

POST   /api/ai/text|image|workout-calories          Bearer

GET/POST/DELETE /api/chat                           Bearer
GET/POST /api/chat/{id}/messages                    Bearer

GET    /api/social/feed                             Bearer
GET    /api/social/discover                         Bearer
GET    /api/social/posts/{id}                       Bearer
POST   /api/social/posts                            Bearer
PATCH  /api/social/posts/{id}                       Bearer
DELETE /api/social/posts/{id}                       Bearer
POST   /api/social/posts/{id}/like                  Bearer
GET    /api/social/posts/{id}/comments              Bearer
POST   /api/social/posts/{id}/comments              Bearer
DELETE /api/social/posts/{id}/comments/{commentId}  Bearer
POST   /api/social/follow/{userId}                  Bearer
GET    /api/social/users/search                     Bearer
GET    /api/social/profile/{userId}                 Bearer
GET    /api/social/profile/{userId}/posts           Bearer
GET    /api/social/profile/{userId}/workouts        Bearer
GET    /api/social/profile/{userId}/blogs           Bearer
PATCH  /api/social/profile/bio                      Bearer
POST   /api/social/profile/blogs/create             Bearer
PUT    /api/social/profile/blogs/{id}               Bearer
DELETE/PATCH /api/social/profile/blogs/{id}         Bearer
DELETE/PATCH /api/social/profile/workouts/{id}      Bearer
PATCH  /api/social/posts/{id}/archive               Bearer
GET    /api/social/articles/{id}                    Bearer

GET    /api/conversations                           Bearer
POST   /api/conversations                           Bearer
GET    /api/conversations/{id}/messages             Bearer
POST   /api/conversations/{id}/messages             Bearer
PUT    /api/conversations/{id}/read                 Bearer
DELETE /api/conversations/{id}/messages/{msgId}     Bearer

GET    /api/notifications                           Bearer
GET    /api/notifications/unread-count              Bearer
PUT    /api/notifications/read-all                  Bearer
PUT    /api/notifications/{id}/read                 Bearer
```

---

## Environment

### Backend — appsettings.json

```json
{
  "ConnectionStrings": { "Default": "Data Source=fitapp.db" },
  "Jwt": {
    "Secret": "...",
    "Issuer": "fitapp-api",
    "Audience": "fitapp-angular"
  },
  "Groq": {
    "BaseUrl": "...",
    "ApiKey": "...",
    "TextModel": "...",
    "VisionModel": "..."
  },
  "Email": { "SmtpHost": "smtp.gmail.com", "SmtpPort": 587 }
}
```

### Frontend — environment.ts

```typescript
export const environment = {
  production: false,
  apiUrl: "http://localhost:5140",
  authKey: "auth_v1",
  userKey: "user_profile_v1",
};
```

---

## Agent Team — Roles & When to Use

| Agent                      | Model      | Role                                                                                   |
| -------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| `@tech-architect`          | Opus 4.6   | Architecture decisions, ADRs, API contracts — **always first**                         |
| `@dotnet-developer`        | Sonnet 4.6 | FitApp.Api/ — controllers, services, EF, SignalR, migrations                           |
| `@angular-developer`       | Sonnet 4.6 | fit-app/ — components, facades, signals, SignalR, routing                              |
| `@uiux-designer`           | Sonnet 4.6 | UI specs, design system compliance, UX flows                                           |
| `@code-reviewer`           | Sonnet 4.6 | Quality, clean architecture enforcement                                                |
| `@product-strategist`      | Opus 4.6   | Feature prioritization, monetization, UX strategy, competitor analysis, user retention |
| `@test-engineer`           | Sonnet 4.6 | xUnit (.NET) + Jasmine/Karma (Angular) — unit, integration, edge cases                 |
| `@devops-engineer`         | Sonnet 4.6 | Docker, CI/CD pipelines, deployment scripts, environment configuration                 |
| `@performance-engineer`    | Sonnet 4.6 | Bundle optimization, EF Core queries, caching, N+1 detection, profiling                |
| `@bug-hunter`              | Sonnet 4.6 | Stack trace analysis, root cause diagnosis, minimal fix proposals                      |
| `@db-migration-specialist` | Sonnet 4.6 | EF Core migrations, rollback safety, index strategy, data seeding                      |
| `@security-auditor`        | Opus 4.6   | JWT, health data privacy, input sanitization, OWASP Top 10, authorization              |

### Workflow for a new feature

```
0. @product-strategist      → business validation (worth building? impact vs effort? success metric?)
1. @tech-architect          → ADR + API contract + data model
2. @uiux-designer           → UI spec (if has UI)
3. @db-migration-specialist → migration plan + index strategy (if schema changes)
4. @dotnet-developer        → backend implementation
5. @angular-developer       → frontend implementation
6. @test-engineer           → automated test suite
7. @code-reviewer           → quality + architecture review
8. @security-auditor        → security + privacy audit (before production)
9. @performance-engineer    → performance audit (before production)
10. @devops-engineer        → deployment + CI/CD (on release)
```

### Workflow for a bug report

```
1. @bug-hunter              → root cause diagnosis + minimal fix
2. @test-engineer           → regression test for the fixed bug
3. @code-reviewer           → verify fix doesn't introduce new issues
```

---

## Coding Standards

### Angular

- Standalone components (Angular 19)
- Signals for all reactive state — no RxJS BehaviorSubjects for state
- `takeUntilDestroyed()` for any manual subscription
- Facade pattern: components never call API services directly
- TypeScript strict — no `any`
- Lazy-load every feature route
- `@if` / `@for` control flow (Angular 17+ syntax)
- Always: loading state, empty state, error state in every list view

### .NET

- Async/await on all I/O — never `.Result` / `.Wait()`
- DTOs always separate from EF entities
- `ProblemDetails` for all error responses
- Secrets in appsettings / User Secrets — never hard-coded
- `ExecuteUpdateAsync` for atomic counter updates (no read-modify-write races)
- `pageSize = Math.Min(pageSize, 50)` on all paginated endpoints
- `db.Database.Migrate()` on startup — never `EnsureCreated()`
