# FitApp — Frontend (Angular 19)

Full-stack fitness tracking platform with social features. This is the Angular 19 SPA frontend.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:4200)
ng serve

# Type check
npx tsc --noEmit

# Build production
ng build
```

> Backend must be running on `http://localhost:5140` — see `FitApp.Api/` for setup.

---

## Tech Stack

| Technology | Version |
|-----------|---------|
| Angular | 19.2.15 |
| Angular Material | 19.2.0 |
| TypeScript | 5.7.2 |
| Chart.js + ng2-charts | 4.5.1 / 4.1.1 |
| ngx-toastr | 19.1.0 |

**State**: Angular Signals + Facade pattern  
**Auth**: JWT via `AuthInterceptor`  
**Real-time**: SignalR (`@microsoft/signalr`)  
**Design**: Dark glassmorphism — Poppins, `#7c4dff` primary

---

## Architecture

```
Components → Facades → API Services → HTTP → Backend
                ↕
           Signal stores
```

- **Components** — UI only, no HTTP, no business logic
- **Facades** (`core/facade/`) — orchestration, signal state, error handling
- **API Services** (`api/`) — HTTP calls only
- **Stores** (`core/store/`) — `auth.store`, `user.store` (Signals)
- **AuthInterceptor** — attaches JWT to every request
- **AuthGuard / GuestGuard** — route protection

---

## Project Structure

```
src/app/
├── api/                        HTTP services
│   ├── account.service.ts
│   ├── blog.service.ts
│   ├── conversation.service.ts
│   ├── groq-ai-api.service.ts
│   ├── notification.service.ts
│   ├── nutrition-tab.service.ts
│   ├── social.service.ts
│   ├── stats.service.ts
│   ├── user.service.ts
│   └── workouts-tab.service.ts
│
├── core/
│   ├── facade/                 Business logic layer
│   │   ├── account.facade.ts
│   │   ├── blog.facade.ts
│   │   ├── chat.facade.ts
│   │   ├── groq-ai.facade.ts
│   │   ├── notification.facade.ts
│   │   ├── nutrition-tab.facade.ts
│   │   ├── social.facade.ts
│   │   ├── social-chat.facade.ts
│   │   ├── social-notifications.facade.ts
│   │   ├── user.facade.ts
│   │   └── workouts-tab.facade.ts
│   ├── guards/                 AuthGuard, GuestGuard
│   ├── interceptors/           AuthInterceptor (JWT)
│   ├── models/                 TypeScript interfaces
│   ├── store/                  auth.store, user.store
│   └── system-prompt/          Groq AI prompts
│
├── features/
│   ├── auth/                   Login, Register
│   ├── blog/                   Public blog listing + detail
│   ├── dashboard/              Daily tracker + meal analyzer
│   ├── home/                   Landing page
│   ├── openai/                 AI Assistant (Groq chat)
│   ├── social/                 Social platform (see below)
│   ├── user/                   Profile, physical stats, metrics
│   └── workouts/               Workout plans CRUD
│
└── shared/
    ├── components/             Header, Footer, ConfirmDialog, MoveUp
    └── services/               Alert, FormError, LocalStorage, Navigation
```

### Social Module (`features/social/`)

```
social/
├── social-shell.component.ts       Layout shell (sidebar + bottom nav)
├── feed/                           Posts from followed users
├── discover/                       Explore new users
├── post-detail/                    Single post with comments
├── article-detail/                 User-written article view
├── social-profile/                 User profile (posts/workouts/blogs/stats)
│   └── stats-tab/                  Charts: streak, volume, weekly history
├── chat/                           DM conversation list
├── chat-detail/                    Real-time DM thread (SignalR)
├── notifications/                  Like/comment/follow/message notifications
└── components/
    ├── post-card/                  Post UI (like, comment, follow)
    ├── create-content/             Create post or article dialog
    ├── create-post/                Quick post dialog
    ├── edit-post/                  Edit post dialog
    ├── write-article/              Full article editor dialog
    ├── side-nav/                   Desktop sidebar
    ├── bottom-nav/                 Mobile bottom navigation
    ├── top-bar/                    Mobile top bar
    └── daily-panel/                Linked daily entry preview
```

---

## Routes

| Path | Component | Guard |
|------|-----------|-------|
| `/` | HomePageComponent | — |
| `/blog` | BlogComponent | — |
| `/blog/:id` | BlogPostDetailComponent | — |
| `/login` | LoginComponent | GuestGuard |
| `/register` | RegisterComponent | GuestGuard |
| `/plans` | WorkoutsComponent | AuthGuard |
| `/ai-assistant` | OpenaiComponent | AuthGuard |
| `/user-profile` | UserPageComponent | AuthGuard |
| `/user-dashboard` | DashboardPageComponent | AuthGuard |
| `/social` | SocialShellComponent | AuthGuard |
| `/social/` | SocialFeedComponent | — |
| `/social/discover` | SocialDiscoverComponent | — |
| `/social/post/:id` | SocialPostDetailComponent | — |
| `/social/article/:id` | ArticleDetailComponent | — |
| `/social/profile/:userId` | SocialProfileComponent | — |
| `/social/chat` | SocialChatComponent | — |
| `/social/chat/:id` | SocialChatDetailComponent | — |
| `/social/notifications` | SocialNotificationsComponent | — |

---

## Design System

- **Theme**: Dark only — `#0d0d10` background
- **Primary**: `#7c4dff` (purple) — `var(--primary)`
- **Accent**: `#ff4081` (pink) — `var(--accent)`
- **Surface**: `var(--surface)`, `var(--surface-elevated)`
- **Font**: Poppins 400/700/800
- **Cards**: glassmorphism — `backdrop-filter: blur()`, semi-transparent borders
- **Motion**: 0.15s–0.3s ease on all interactive states

Full spec: `.claude/design-specs/design-system.md`

---

## Environment

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5140',
  authKey: 'auth_v1',
  userKey: 'user_profile_v1',
};
```
