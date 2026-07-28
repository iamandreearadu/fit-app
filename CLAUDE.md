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
  ai-chat-history.service.ts  AI chat history
  ai-inference.service.ts     Backend-proxied AI inference
  blog.service.ts             Public blog CRUD
  conversation.service.ts     Direct messaging (REST + SignalR)
  dashboard.service.ts        Dashboard summary and daily insights
  notification.service.ts     Notification REST calls
  nutrition-tab.service.ts    Meals CRUD
  onboarding.service.ts       Onboarding progress and computed numbers
  open-food-facts.service.ts  External food search
  social.service.ts           Posts, likes, comments, follows, profiles
  stats.service.ts            Public profile stats
  user.service.ts             User profile CRUD
  workouts-tab.service.ts     Workout plans CRUD

core/
  facade/
    account.facade.ts
    blog.facade.ts
    chat.facade.ts            Direct messaging + SignalR orchestration
    dashboard.facade.ts
    groq-ai.facade.ts         AI assistant orchestration
    notification.facade.ts    Notification state + real-time
    nutrition-tab.facade.ts
    onboarding.facade.ts
    social-content.facade.ts  Post CRUD, comments, follows and sharing
    social-feed.facade.ts     Feed, discover and suggestions
    social-profile.facade.ts  Social profile state
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
  dashboard/                  Daily tracker + routed AI meal analyzer
    analyze-meal-page/        /user-dashboard/analyze-meal focused workflow
  home/                       Landing page (hero, benefits, features)
  openai/                     AI Assistant (Groq chat with history)
  social/                     Social platform (see Social Module below)
  user/                       Account shell + lazy child-route tabs
    account.routes.ts         /account/* child routes
    account-tab.model.ts      Shared desktop/mobile tab metadata
    user-page.component.*     Account shell + nested router-outlet
    profile-tab/              /account/my-account
    physical-tab/             /account/physical
    workouts-tab/             /account/workouts
    nutrition-tab/            /account/nutrition
    progress-tab/             /account/progress
    goals-tab/                /account/goals
    settings-tab/             /account/settings
    notifications-tab/        /account/notifications
  workouts/                   Workout plans CRUD

shared/
  components/                 Header, Footer, ConfirmDialog, MoveUp
  services/                   Alert, FormError, LocalStorage, Navigation

app.routes.ts                 All routes — lazy-loaded
```

### Account Module (`features/user/`)

`UserPageComponent` is the Account layout shell. It owns the shared sidebar,
mobile tab rail and user summary; a nested `router-outlet` renders standalone
tabs from `account.routes.ts`. `/account` redirects to `/account/my-account`.
Legacy `/account?tab=<tab>` links are normalized to `/account/<tab>` with
`replaceUrl`, while all current internal links use canonical child URLs.

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
    create-post/                    Dialog: create social post (portrait image, autosize textarea)
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
  DailyDataController         GET/POST /api/daily, GET /api/daily/history
  DashboardController         Dashboard summary and insights
  OnboardingController        Onboarding progress and completion
  WorkoutsController          CRUD /api/workouts
  WorkoutSessionsController   Active workout session lifecycle
  NutritionController         CRUD /api/nutrition
  BlogController              GET /api/blog (public), CRUD (Admin)
  AiController                POST /api/ai/text|image|meal-description|workout-calories
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
  AuthService                 Registration and login
  BlogService                 Public/admin blog operations
  ChatService                 AI chat history
  DailyDataService            Daily health tracking
  DashboardService            Dashboard aggregation
  EmailService                MailKit / Gmail SMTP
  FileStorageService          Validated image persistence
  FoodSearchService           Food provider orchestration
  JwtService                  Short-lived JWT generation
  MetricsService              BMI, BMR, TDEE, water target calculations
  NutritionService            Meal CRUD
  OnboardingService           Onboarding workflow
  SocialService               Posts, feed, discover, profiles, likes, follows
  ConversationService         Direct messaging, cursor-based pagination
  ConversationRealtimeService SignalR delivery for REST and hub paths
  NotificationService         Create + push via SignalR
  StreakReminderWorker        Scheduled at-risk streak reminders
  UserService                 User profile CRUD
  WorkoutService              Workout templates
  WorkoutSessionService       Active workout sessions

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
- Demo and official accounts are seeded by the seeders under `Data/Seeds/`; no hard-coded admin account is assumed.
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
| Meal Analyzer (image) | `qwen/qwen3.6-27b`                          | POST /api/ai/image            |
| Meal Analyzer (text)  | `openai/gpt-oss-20b`                        | POST /api/ai/meal-description |
| Workout Calorie Est. | `llama-3.1-8b-instant`                      | POST /api/ai/workout-calories |

Backend `AiProxyService` handles all Groq API calls. The meal analyzer accepts an image, a written meal description, or both. Meal photos are resized to at most 1600px and JPEG-compressed in the browser before being sent as base64; text-only estimation uses the faster production meal-text model.
AI chat history stored in `ChatConversation` / `ChatMessage` entities.

---

## Design System (Summary)

Full spec: `design-system.md` (root)

- **Theme**: Dark only — `#0d0d10` surface
- **Primary**: `#7c4dff` (purple) — `var(--primary)`
- **Accent**: `#ff4081` (pink) — `var(--accent)`
- **Font**: Poppins (400/700/800)
- **Style**: Dark glassmorphism — shared `--nova-glass-*` surfaces use translucent
  obsidian/purple layers, controlled blur and subtle inset highlights. Home,
  Plans and Blog use `--nova-page-canvas`; content cards are borderless glass,
  while long-form text keeps a quieter glass surface for readability.
- **Motion**: 0.15s–0.3s ease — all interactive states animated

---

## API Reference

```
POST   /api/auth/register                           Public
POST   /api/auth/login                              Public

GET    /api/users/me                                Bearer
PUT    /api/users/me                                Bearer
PUT    /api/users/me/targets                        Bearer
DELETE /api/users/me/targets                        Bearer
GET    /api/users/{userId}/stats                    Bearer

GET    /api/daily?date=                             Bearer
GET    /api/daily/history                           Bearer
POST   /api/daily                                   Bearer

CRUD   /api/workouts                                Bearer
CRUD   /api/nutrition                               Bearer

GET    /api/blog                                    Public
GET    /api/blog/{id}                               Public
POST/PUT/DELETE /api/blog                           Admin

POST   /api/ai/text|image|meal-description|workout-calories Bearer

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
