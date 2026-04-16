# 🚀 FitApp — Full-Stack Fitness Tracking Application

FitApp is a full-stack web application designed for tracking workouts, nutrition, and daily fitness metrics, enhanced with AI-powered insights.

---

## 🧰 Tech Stack

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

## 🏗️ Architecture

Clean layered architecture:

* **Frontend:** Components → Facades → Services → API
* **Backend:** Controllers → Services → EF Core → Database

Key concepts:

* Signal-based state management (Angular)
* Facade pattern for separation of concerns
* JWT-based authentication
* Route guards & HTTP interceptors

---

## ✨ Features

### 🔐 Authentication

* Register / login with JWT
* Secure password hashing
* Persistent sessions

### 👤 User Profile & Metrics

* Personal data & fitness goals
* Auto-calculated metrics:

  * BMI
  * BMR
  * Daily calorie needs
  * Water intake

### 📊 Daily Tracking

* Activity logging (workouts, steps, water)
* Calories & macros tracking
* History & progress overview

### 🏋️ Workouts

* Create & manage workout templates
* Strength & cardio support
* Exercise-level tracking (sets, reps, weight)

### 🍽️ Nutrition

* Meal tracking per day
* Food items with macro breakdown
* Automatic totals calculation

### 🤖 AI Features

* AI fitness assistant (chat)
* Meal image analysis
* Workout calorie estimation

### 📝 Blog

* Public articles
* Admin content management

---

## 📁 Project Structure

```
FitApp/
├── fitapp.api/        # .NET Web API
├── fit-app/       # Angular SPA
└── solution file
```

---

## 🔐 Security

* JWT authentication
* Role-based access (admin support)
* Protected routes (frontend guards)
* Secure password hashing

---

## ⚙️ Getting Started

### Backend

```bash
cd backend
dotnet run
```

### Frontend

```bash
cd frontend
npm install
ng serve
```

---

## 🌍 Environment Setup

Configure:

* JWT secret
* Database connection
* AI API key
* Email credentials

---

## 🎯 Key Highlights

* Full-stack architecture (Angular + .NET)
* AI-powered features integrated in real workflows
* Clean, scalable structure (Facade + Services)
* Real-world use case: fitness tracking + analytics

---

## 📌 Future Improvements

* Mobile version
* Advanced analytics dashboard
* Social features (sharing, community)
* Custom backend optimizations
