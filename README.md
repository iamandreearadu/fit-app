# FitApp — Full-Stack Fitness & Social Platform

FitApp is a full-stack web application for tracking workouts, nutrition, and daily fitness metrics — enhanced with AI-powered insights and a built-in social platform.

---

## Tech Stack

**Frontend**

* Angular
* Angular Material
* TypeScript

**Backend**

* .NET / ASP.NET Core
* Entity Framework Core
* SQLite
* JWT Authentication

**External Services**

* Groq API (LLM integration)
* Gmail SMTP (emails)

---

## Architecture

Clean layered architecture:

* **Frontend:** Components → Facades → Services → API
* **Backend:** Controllers → Services → EF Core → Database

Key concepts:

* Signal-based state management (Angular)
* Facade pattern for separation of concerns
* JWT-based authentication
* Route guards & HTTP interceptors

---

## Features

### Authentication

* Register / login with JWT
* Secure password hashing
* Persistent sessions

### User Profile & Metrics

* Personal data & fitness goals
* Auto-calculated metrics: BMI, BMR, Daily calorie needs, Water intake

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

* AI fitness assistant (chat)
* Meal image analysis
* Workout calorie estimation

### Blog

* Public articles
* Admin content management

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
│       ├── features/  # Pages and route shells (Account uses lazy child routes)
│       └── shared/    # Header, Footer, ConfirmDialog
└── FitApp.sln
```

---

## Security

* JWT authentication
* Role-based access (admin support)
* Protected routes (frontend guards)
* Secure password hashing

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
ng serve
```

---

## Environment Setup

Two config files hold secrets and are **gitignored** — they are never committed, so a fresh
clone must create them manually before the app will start.

### Backend — `FitApp.Api/appsettings.json`

Copy the template and fill in real values:

```bash
cd FitApp.Api
cp appsettings.Example.json appsettings.json
```

| Key | Purpose | Where to get it |
| --- | --- | --- |
| `ConnectionStrings:Default` | SQLite file path | Leave as `Data Source=fitapp.db` |
| `Jwt:Secret` | Signs auth tokens | Generate a random 32+ char string (e.g. `openssl rand -base64 32`) |
| `Groq:ApiKey` | AI chat / meal analyzer / calorie estimation | https://console.groq.com |
| `Usda:ApiKey` | Food search (USDA FoodData Central) | https://api.data.gov/signup/ — optional, defaults to rate-limited `DEMO_KEY` if omitted |
| `Email:SenderEmail` / `Email:Password` | Transactional emails via Gmail SMTP | A Gmail account + [App Password](https://myaccount.google.com/apppasswords) (not your normal password) |

Without this file, the API throws on startup (`InvalidOperationException: Connection string 'Default' is missing`) or fails on the first request that needs `Jwt:Secret`/`Groq:*`/`Usda:*`.

### Frontend — `fit-app/src/environments/environment.ts` (+ `environment.prod.ts`)

```bash
cd fit-app/src/environments
cp environment.example.ts environment.ts
```

`apiUrl` should point at the running backend (`http://localhost:5140` for local dev). The AI
calls are proxied through the backend `AiController`, so the frontend does not need a real
Groq key — leave `groqApiKey` empty.
