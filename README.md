# FitApp — Full-Stack Fitness & Social Platform

FitApp is a full-stack web application for tracking workouts, nutrition, and daily fitness metrics — enhanced with AI-powered insights and a built-in social platform.

---

## Tech Stack

**Frontend**

- Angular 19 (standalone components, Signals)
- Angular Material 19
- TypeScript 5.7
- @microsoft/signalr (real-time)

**Backend**

- .NET 10 / ASP.NET Core
- Entity Framework Core 10 (SQLite)
- JWT Authentication
- SignalR (WebSocket hubs)

**External Services**

- Groq API — LLM inference (Llama 3.1 + Llama 4 Scout vision)
- Gmail SMTP — transactional emails via MailKit

---

## Architecture

- **Frontend:** Components → Facades → Services → HTTP/SignalR → Backend
- **Backend:** Controllers → Services → EF Core → SQLite + SignalR Hubs

Key concepts:

- Signal-based state management (Angular 19)
- Facade pattern for separation of concerns
- JWT Bearer authentication (HS256)
- Route guards & HTTP interceptors
- Real-time push via SignalR (`NotificationHub`, `ChatHub`)

---

## Features

### Authentication

- Register / login with JWT
- Secure BCrypt password hashing
- Persistent sessions via localStorage

### User Profile & Metrics

- Personal data & fitness goals
- Auto-calculated: BMI, BMR, TDEE, daily calorie needs, water intake target

### Daily Tracking

- Activity logging (workouts, steps, water)
- Calories & macros tracking
- History & progress overview

### Workouts

- Create & manage workout templates
- Strength & cardio support
- Exercise-level tracking (sets, reps, weight)

### Nutrition

- Meal tracking per day
- Food items with macro breakdown
- Automatic totals calculation

### AI Features

- AI fitness assistant (chat with history)
- Meal image analysis (base64 → Groq vision)
- Workout calorie estimation

### Public Blog

- Admin-published articles
- Public listing & post detail

### beSocial — Social Platform

- **Feed** — posts from followed users (paginated, infinite scroll)
- **Discover** — explore non-followed users
- **Posts** — text, image (3:4 portrait), linked workout/meal/daily entry
- **Articles** — user-written long-form content with cover image; inline expand in feed and profile
- **Comments** — threaded comments per post
- **Likes** — optimistic UI toggle
- **Follow / Unfollow** — with real-time follower count
- **Profile** — posts grid, workouts, articles, stats tabs; avatar upload
- **Direct Messages** — real-time chat via SignalR; unread badge in nav
- **Notifications** — likes, comments, follows; real-time push via SignalR
- **Responsive** — desktop sidebar nav + mobile bottom nav

---

## Project Structure

```
FitApp/
├── FitApp.Api/    # .NET 10 Web API
│   ├── Controllers/
│   ├── Services/
│   ├── Models/Entities/ + DTOs/
│   ├── Hubs/          # SignalR: NotificationHub, ChatHub
│   └── Data/          # AppDbContext + EF Migrations
├── fit-app/       # Angular 19 SPA
│   └── src/app/
│       ├── api/       # HTTP services
│       ├── core/      # Facades, stores, guards, interceptors
│       ├── features/  # Pages (auth, social, dashboard, workouts…)
│       └── shared/    # Header, Footer, ConfirmDialog
└── FitApp.sln
```

---

## Security

- JWT Bearer (HS256) — userId always from JWT, never from request body
- BCrypt password hashing
- Role-based access (admin)
- Protected routes (frontend guards)
- CORS restricted to localhost:4200

---

## Getting Started

### Backend

```bash
cd FitApp.Api
dotnet run
# Migrations run automatically on startup
# API available at http://localhost:5140
```

### Frontend

```bash
cd fit-app
npm install
npm start
# App available at http://localhost:4200
```

### Environment

Backend — `appsettings.json`:

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
    "TextModel": "llama-3.1-8b-instant",
    "VisionModel": "meta-llama/llama-4-scout-17b-16e-instruct"
  },
  "Email": {
    "SmtpHost": "smtp.gmail.com",
    "SmtpPort": 587,
    "Username": "...",
    "Password": "..."
  }
}
```

### Commands

```ts

ng build -c production

```
