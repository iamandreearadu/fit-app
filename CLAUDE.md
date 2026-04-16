# FitApp — AI Agent Team Context

Full-stack fitness tracking app: **Angular 19** (frontend) + **.NET 10** (backend).

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

| Technology | Version |
| Styling | Angular Material + CSS
| State | Signals + Facade pattern
| Angular | 19.2.15 |
| Angular Material | 19.2.0 |
| Chart.js + ng2-charts | 4.5.1 / 4.1.1 |
| ngx-toastr | 19.1.0 |
| TypeScript | 5.7.2 |

### Backend — FitApp.Api/

| Technology | Version |
| Database | SQLite
| Auth | JWT Bearer
| .NET / ASP.NET Core | 10.0 |
| Entity Framework Core (SQLite) | 10.0.5 |
| JWT Bearer Authentication | 10.0.5 |
| BCrypt.Net-Next | 4.1.0 |
| MailKit | 4.15.1 |
| ORM | Entity Framework Core 10
|Database| SQLite
| Auth | JWT Bearer

### External Services

- **Groq API** — LLM inference (Llama 3.1 + Llama 4 Scout)
- **Gmail SMTP** — Transactional emails via MailKit

---

## Architecture

### Backend — Clean Layered Architecture

```
Controllers → Services → Entity Framework Core → SQLite
```

- Controllers handle HTTP only — no business logic
- Services contain all business logic
- Repositories (or direct EF via Services) for data access
- DTOs always separate from EF Entities — never expose entities directly

### Frontend — Signals + Facade Pattern

```
Components → Facades (business logic) → API Services → HTTP → Backend
```

- **Signals** for reactive state (Angular 19)
- **Facade** layer decouples components from HTTP services
- `AuthInterceptor` attaches JWT to every request
- `AuthGuard` / `GuestGuard` protect routes
- Lazy-loaded routes per feature

### State stores (Signals-based)

- `auth.store` — authentication state
- `user.store` — user profile state

---

## Frontend Structure (fit-app/src/app/)

```
api/                    HTTP services (account, user, workouts, nutrition, blog, groq)
core/
  facade/               Business logic (account, user, workouts, nutrition, blog, groq)
  guards/               AuthGuard, GuestGuard
  interceptors/         AuthInterceptor (attaches JWT)
  material/             Angular Material module config
  models/               TypeScript interfaces
  services/             Domain services (metrics, daily data, alert, navigation, localStorage)
  store/                Signal-based state (auth.store, user.store)
  system-prompt/        AI system prompts
features/               Page-level components
shared/
  components/           Header, Footer, MoveUp
  services/             Alert, FormError, LocalStorage, Navigation
app.routes.ts           Lazy-loaded routes
```

---

## Backend Structure (FitApp.Api/)

```
Controllers/
  AuthController         POST /api/auth/register, /api/auth/login
  UsersController        GET/PUT /api/users/me
  DailyController        GET/POST /api/daily
  WorkoutsController     CRUD /api/workouts
  NutritionController    CRUD /api/nutrition
  BlogController         CRUD /api/blog
  AiController           POST /api/ai/text, /image, /workout-calories
  ChatController         CRUD /api/chat + messages

Models/
  Entities/              User, DailyEntry, WorkoutTemplate, WorkoutExercise,
                         CardioDetails, MealEntry, FoodItem, BlogPost,
                         ChatConversation, ChatMessage
  DTOs/                  Request/response objects (never expose entities directly)

Services/                AiProxyService, EmailService, MetricsService
Data/                    AppDbContext, EF Core migrations
Program.cs               DI registration, middleware pipeline
```

---

## Database (SQLite + EF Core)

| Entity             | Key Constraints                                 |
| ------------------ | ----------------------------------------------- |
| `User`             | Account + physical profile + computed metrics   |
| `DailyEntry`       | `(UserId, Date)` unique index                   |
| `WorkoutTemplate`  | Cascade delete → WorkoutExercise, CardioDetails |
| `MealEntry`        | Cascade delete → FoodItem                       |
| `ChatConversation` | Cascade delete → ChatMessage                    |

**Migrations run automatically on startup** — never hand-edit migration files.

---

## Authentication & Security

- **JWT Bearer** (HS256) — claims: `sub` (userId), role claims for admin
- **BCrypt** password hashing
- Frontend: `AuthInterceptor` injects `Authorization: Bearer <token>`
- CORS: restricted to `http://localhost:4200` / `https://localhost:4200`
- Admin seeded on first run: `andreea@gmail.com`

---

## AI Integration (Groq)

| Feature              | Model                                       | Endpoint                      |
| -------------------- | ------------------------------------------- | ----------------------------- |
| AI Chat              | `llama-3.1-8b-instant`                      | POST /api/ai/text             |
| Meal Analyzer        | `meta-llama/llama-4-scout-17b-16e-instruct` | POST /api/ai/image            |
| Workout Calorie Est. | `llama-3.1-8b-instant`                      | POST /api/ai/workout-calories |

Backend `AiProxyService` handles all Groq API calls. Image analyzer: base64 input.

---

## Design System (Summary)

Full spec: `.claude/design-specs/design-system.md`

- **Theme**: Dark only — `#0d0d10` surface
- **Primary**: `#7c4dff` (purple)
- **Accent**: `#ff4081` (pink)
- **Font**: Poppins (400/700/800)
- **Style**: Glass morphism — `backdrop-filter: blur()`, semi-transparent borders
- **Motion**: 0.15s–0.3s ease — all interactive states animated

---

## API Reference (quick)

```
POST /api/auth/register       Public
POST /api/auth/login          Public
GET/PUT /api/users/me         Bearer
GET/POST /api/daily           Bearer
GET/POST/PUT/DELETE /api/workouts    Bearer
GET/POST/PUT/DELETE /api/nutrition   Bearer
GET/POST/PUT/DELETE /api/blog        Public GET, Admin POST/PUT/DELETE
POST /api/ai/text|image|workout-calories  Bearer
GET/POST/DELETE /api/chat     Bearer
GET/POST /api/chat/{id}/messages     Bearer
```

---

## Environment

### Backend — appsettings.json

```json
{
  "ConnectionStrings": { "Default": "Data Source=fitapp.db" },
  "Jwt": { "Secret": "...", "Issuer": "fitapp-api", "Audience": "fitapp-angular" },
  "Groq": { "BaseUrl": "...", "ApiKey": "...", "TextModel": "...", "VisionModel": "..." },
  "Email": { "SmtpHost": "smtp.gmail.com", "SmtpPort": 587, ... }
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

| Agent                | Model      | Role                                                           |
| -------------------- | ---------- | -------------------------------------------------------------- |
| `@tech-architect`    | Opus 4.6   | Architecture decisions, ADRs, API contracts — **always first** |
| `@dotnet-developer`  | Sonnet 4.6 | FitApp.Api/ — controllers, services, EF, migrations            |
| `@angular-developer` | Sonnet 4.6 | fit-app/ — components, facades, signals, routing               |
| `@uiux-designer`     | Sonnet 4.6 | UI specs, design system compliance, UX flows                   |
| `@code-reviewer`     | Sonnet 4.6 | Quality, security, clean architecture enforcement              |

### Agent Teams activation

Set in `.claude/settings.json` — already configured.

### Workflow for a new feature

```
1. @tech-architect  → ADR + API contract + data model
2. @uiux-designer   → UI spec (if has UI)
3. @dotnet-developer → backend implementation
4. @angular-developer → frontend implementation
5. @code-reviewer   → review both layers
```

### Example prompt

```
Create an agent team for the "Progress Charts" feature.
- tech-architect: define data models, API contract, and clean architecture boundaries
- uiux-designer: spec the charts UI using the existing design system (dark, glass morphism)
- dotnet-developer: implement the API endpoint with EF aggregations
- angular-developer: implement the Chart.js component with Signals + Facade pattern
Coordinate via shared task list. tech-architect goes first.
```

---

## Coding Standards

### Angular

- Standalone components (Angular 19)
- Signals for all reactive state — no RxJS subscriptions where avoidable
- `async pipe` or signal reads in templates only
- `takeUntilDestroyed()` if subscribing manually
- Facade pattern: components never call API services directly
- TypeScript strict — no `any`
- Lazy-load every feature route

### .NET

- Async/await on all I/O — never `.Result` / `.Wait()`
- DTOs always separate from EF entities
- ProblemDetails for all error responses
- Secrets in appsettings / User Secrets — never hard-coded
- FluentValidation for request validation (if installed)
- Migrations auto-run on startup
