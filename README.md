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
│       ├── features/  # Pages (auth, social, dashboard, workouts…)
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

Configure:

* JWT secret
* Database connection
* AI API key
* Email credentials
