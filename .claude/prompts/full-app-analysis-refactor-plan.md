# NovaFit — Full Application Analysis & Refactoring Prompt
# Technique: COAST (Context → Objective → Actions → Scenario → Task)

---

## C — CONTEXT

You are working on **NovaFit** (codebase name: FitApp), a full-stack fitness + social platform built with:
- **Frontend**: Angular 19, standalone components, Signals + Facade pattern, Angular Material, glassmorphism dark design system (`#0d0d10` surface, `#7c4dff` primary purple)
- **Backend**: .NET 10, ASP.NET Core, EF Core + SQLite, SignalR real-time, Groq AI (Llama 4 Scout + Llama 3.1)
- **Branch**: `Fix-Release` — several modules are being actively stabilized

### Current Feature Map (do NOT assume from memory — READ the actual files)

**Frontend features** (`fit-app/fit-app/src/app/features/`):
- `auth/` — login, register
- `home/` — landing page (hero-slider, benefits-showcase, features-grid)
- `onboarding/` — carousel, biometrics, your-numbers
- `dashboard/` — daily tracker, AI insight card, calorie-balance, macro-progress, hydration-steps, move-burn, rings-hero, streak-chip, weekly-workout-card, history-accordion, AI meal analyzer (image + Groq)
- `workouts/` — CRUD workout plans, active session with workout-completion-card
- `user/` — profile-tab, physical-tab, nutrition-tab (food search + OpenFoodFacts, recent-foods, guided-empty, meal-completion-feedback), fitness-metrics, physical-stats
- `blog/` — blog-content (public listing), blog-post-detail
- `openai/` — AI assistant (Groq chat + sidenav history)
- `social/` — **the most complex module** — social-shell, feed (paginated + guided-empty), discover, post-detail, article-detail, social-profile (profile-hero, athlete-stats-bar, activity-grid, recent-performance, stats-tab, private-stats), chat (DM list), chat-detail (SignalR real-time), notifications, components: post-card, create-content dialog, create-post (legacy), edit-post, write-article, side-nav (desktop), bottom-nav (mobile), top-bar (mobile), social-top-tabs, suggested-users, daily-panel, edit-bio

**Core layer** (`core/`):
- Facades: account, blog, chat, dashboard, groq-ai, notification, nutrition-tab, onboarding, social, social-chat, social-notifications, user, workouts-tab
- Stores (Signals): auth.store, user.store
- Services: chat-hub, daily-user-data, notification-hub, user-metrics, validations
- API services: account, blog, conversation, dashboard, groq-ai-api, groq-ai, notification, nutrition-tab, onboarding, open-food-facts, social, stats, user, workouts-tab

**Backend controllers** (`FitApp.Api/Controllers/`):
- AuthController, UsersController, DailyDataController, DashboardController, WorkoutsController, WorkoutSessionsController, NutritionController, BlogController, AiController, ChatController, SocialController, ConversationsController, NotificationsController, OnboardingController

**Design system tokens**: `--primary: #7c4dff`, `--accent: #ff4081`, `--surface: #0d0d10`, `--nav-height: 56px`, glassmorphism with `backdrop-filter: blur()`, Poppins font, 0.15s–0.3s motion

### Business Vision

NovaFit must compete in the **top tier of fitness + social apps** (Strava, MyFitnessPal, Whoop, Hevy) with a differentiator: **AI-first + social-first on mobile**. The app has two distinct user contexts:
1. **Web (desktop/tablet)**: Power users — deep data, analytics, content creation, full dashboard
2. **Mobile**: Habit-loop users — quick logging, social feed consumption, social connection ("BeSocial" experience is the primary mobile identity)

---

## O — OBJECTIVE

Produce a **complete, opinionated, production-grade refactoring and architecture plan** for NovaFit that:

1. Elevates the app to **top-5 category standard** by identifying structural weaknesses, UX gaps, retention mechanics failures, and technical debt
2. Delivers **two separate, prioritized refactoring roadmaps**: one for **Web** (desktop experience), one for **Mobile** (with "BeSocial" as the primary mobile identity)
3. Is **immediately actionable** — every finding maps to a specific file, component, or pattern with a clear recommendation
4. Is **agent-orchestrated** — the right specialized agents do the right analysis (not one agent doing everything)

---

## A — ACTIONS

Execute the following analysis pipeline. Each step is assigned to the best-fit agent. Run independent steps in parallel where possible.

### PHASE 1 — Parallel Discovery (run all simultaneously)

**Action 1.1 — UX Audit** → Delegate to `@ux-auditor`
Read and audit the following flows for friction, missing feedback loops, empty states, and retention failures:
- `fit-app/fit-app/src/app/features/social/social-shell.component.ts` + `.html`
- `fit-app/fit-app/src/app/features/social/feed/social-feed.component.ts`
- `fit-app/fit-app/src/app/features/social/components/bottom-nav/social-bottom-nav.component.ts`
- `fit-app/fit-app/src/app/features/social/components/top-bar/social-top-bar.component.ts`
- `fit-app/fit-app/src/app/features/social/social-profile/social-profile.component.ts`
- `fit-app/fit-app/src/app/features/dashboard/dashboard-page.component.ts`
- `fit-app/fit-app/src/app/features/onboarding/` (all files)
Focus on: mobile navigation UX, aha-moment delivery, content creation friction, social discovery, habit loop entry points. Score each flow 1–10. List specific broken moments.

**Action 1.2 — Competitor Benchmark** → Delegate to `@competitor-analyst`
Compare NovaFit's current feature set against Strava, MyFitnessPal, and Hevy. Focus on:
- Mobile navigation patterns (bottom-nav tabs, gestures, FAB placement)
- Social feed mechanics (engagement triggers, content types, discovery algorithms)
- Profile & athlete identity features
- AI/smart features positioning
- Onboarding conversion patterns
Output: Feature gap table + 3 specific UX patterns NovaFit should adopt immediately, referenced to competitor + screen.

**Action 1.3 — Design System Audit** → Delegate to `@design-system-architect`
Read:
- `fit-app/.claude/design-specs/design-system.md`
- `fit-app/fit-app/src/styles.css`
- `fit-app/fit-app/src/app/features/social/social-shell.component.css`
- `fit-app/fit-app/src/app/features/social/components/bottom-nav/social-bottom-nav.component.css`
- `fit-app/fit-app/src/app/features/social/components/top-bar/social-top-bar.component.css`
- `fit-app/fit-app/src/app/shared/components/` (header, footer, bottom-nav, top-bar — the new shared ones)
Audit for: token consistency, duplicated CSS, missing responsive breakpoints, component library gaps (what components are needed but don't exist as reusable shared components), glassmorphism inconsistencies. Propose the **shared component library structure** that both web and mobile should consume.

**Action 1.4 — Architecture Review** → Delegate to `@tech-architect`
Read the full frontend structure:
- `fit-app/fit-app/src/app/core/facade/` (all facades)
- `fit-app/fit-app/src/app/api/` (all services)
- `fit-app/fit-app/src/app/app.routes.ts`
- `fit-app/fit-app/src/app/core/store/` (both stores)
Audit for: facade responsibilities overlap, API service duplication (groq-ai-api.service.ts vs groq-ai.service.ts), store completeness, route lazy-loading strategy, missing stores (social state is facade-only — is that right?), SignalR lifecycle management.

**Action 1.5 — Backend Review** → Delegate to `@dotnet-developer`
Read:
- `fit-app/FitApp.Api/Controllers/SocialController.cs`
- `fit-app/FitApp.Api/Controllers/DashboardController.cs`
- `fit-app/FitApp.Api/Controllers/NotificationsController.cs`
- `fit-app/FitApp.Api/Services/` (all service files)
- `fit-app/FitApp.Api/Models/` (entities + DTOs)
Audit for: N+1 query risks, missing pagination, over-fetching in DTOs, response shape inconsistencies, missing endpoints that the frontend will need for the BeSocial mobile experience (stories, reactions beyond like, user search suggestions, trending content).

**Action 1.6 — Performance Scan** → Delegate to `@performance-engineer`
Read:
- `fit-app/fit-app/src/app/features/social/feed/social-feed.component.ts`
- `fit-app/fit-app/src/app/features/social/components/post-card/post-card.component.ts`
- `fit-app/fit-app/src/app/core/facade/social.facade.ts`
- `fit-app/fit-app/src/app/core/facade/social-chat.facade.ts`
Check for: missing virtual scroll / infinite scroll on feeds, image optimization gaps, SignalR reconnection strategy, unnecessary facade subscriptions, bundle split opportunities, missing `trackBy` in @for loops.

---

### PHASE 2 — Synthesis (after Phase 1 completes)

**Action 2.1 — Product Strategy** → Delegate to `@product-strategist`
Using the findings from Phase 1, define:
1. The **#1 retention lever** NovaFit is currently missing on mobile
2. The **3 features** with highest impact/effort ratio to ship first
3. The **BeSocial mobile identity** — what makes NovaFit's social experience unique vs Strava/Instagram fitness
4. The **web power-user identity** — what makes the desktop experience sticky
5. Monetization surface recommendations tied to the social graph

**Action 2.2 — UI/UX Redesign Spec** → Delegate to `@uiux-designer`
Using the UX audit + competitor findings, produce:
- **Mobile IA (Information Architecture)**: revised bottom-nav tab structure for BeSocial (max 5 tabs, tab naming, icon guidance, active states, badge positions)
- **Mobile post-login flow**: what the user sees in the first 3 seconds after logging in on mobile
- **Web sidebar navigation**: revised structure for the desktop social shell
- **Profile page redesign spec**: what athlete identity sections are visible on mobile vs web
- **Empty state designs**: social feed (no follows yet), notifications (none yet), discover (already followed everyone)

---

### PHASE 3 — Refactoring Roadmaps (final output)

Produce two separate, self-contained documents:

#### Document A — WEB REFACTORING PLAN

Structure:
```
1. Critical Fixes (P0 — blockers before any release)
2. Architecture Refactors (P1 — structural improvements)
   - Facade consolidation
   - Store additions
   - Route/lazy-load optimization
3. Feature Upgrades (P2 — web-specific power features)
   - Dashboard: advanced analytics view
   - Blog/Article: content creation improvements
   - Social desktop: sidebar, content discovery, creator tools
4. Design System Enforcement (P3)
   - Shared component library rollout
   - Token audit fixes
5. Backend Alignment (P4)
   - Missing API endpoints
   - DTO optimization
```
Each item: **File(s) affected → What to change → Why → Effort (S/M/L)**

#### Document B — MOBILE REFACTORING PLAN ("BeSocial First")

Structure:
```
1. BeSocial Navigation Overhaul (P0)
   - Bottom nav: Tab identity, order, badge logic
   - Top bar: Search, notifications, create-content FAB
   - Social shell responsive breakpoints
2. Feed Experience (P0)
   - Infinite scroll / virtual scroll
   - Pull-to-refresh
   - Post-card mobile optimizations
   - Story-style content (if validated by product)
3. Social Profile on Mobile (P1)
   - Athlete identity hierarchy
   - Activity grid → mobile-optimized
   - Stats visibility on small screens
4. Real-time & Notifications (P1)
   - SignalR reconnection on mobile network changes
   - Push notification readiness (PWA manifest)
   - Notification badge system
5. Quick Actions & Logging (P2)
   - FAB for content creation (post / log workout / log meal)
   - Swipe gestures on post-card
   - Quick-log from social feed (link daily panel)
6. AI on Mobile (P2)
   - AI chat FAB placement and UX
   - Meal analyzer camera flow
7. Onboarding Conversion (P3)
   - Step completion, progress indicators, skip logic
8. PWA Readiness (P3)
   - Offline support, service worker, app manifest
```
Each item: **Component(s) → What to change → Why → Effort (S/M/L)**

---

## S — SCENARIO

### Example of the expected analysis depth

**WRONG (too shallow)**:
> "The social feed needs improvement. Consider adding pagination."

**RIGHT (expected depth)**:
> `social-feed.component.ts:42` — The feed loads all posts in a single `loadFeed()` call with no virtual scroll. On mobile with 50+ posts, this causes a visible layout thrash and 300ms+ input delay. Fix: replace `*ngFor` list with Angular CDK `<cdk-virtual-scroll-viewport>` with `itemSize=420` (current post-card height). Effort: M. Backend already supports cursor-based pagination in `GET /api/social/feed` — frontend is not using the cursor. Add `nextCursor` signal to `social.facade.ts` and wire `IntersectionObserver` on the last card.

Every recommendation must reference:
- Exact file path (relative to repo root)
- Current behavior vs target behavior
- Specific Angular/CSS/API pattern to use
- Effort: S (< 2h) / M (half-day) / L (multi-day)

---

## T — TASK

**Deliver the following, in this exact order:**

1. **Executive Summary** (max 200 words): What is the single biggest structural problem in NovaFit today, and what is the single biggest opportunity? What does "top-5 app in category" require that is currently missing?

2. **Web Refactoring Roadmap** (Document A as specified in Actions Phase 3) — prioritized, file-referenced, effort-estimated

3. **Mobile / BeSocial Refactoring Roadmap** (Document B as specified in Actions Phase 3) — prioritized, file-referenced, effort-estimated. This is the primary focus. BeSocial is not just a tab — it is the **entire mobile identity** of NovaFit. Every mobile decision must ask: "does this make users more connected to each other?"

4. **Agent Execution Queue**: A sequenced list of which agents should implement which items from both roadmaps, in what order, with any cross-agent dependencies noted. Format:
   ```
   Sprint 1 (Critical Path):
   - @uiux-designer → Mobile IA + BeSocial nav spec
   - @angular-developer → bottom-nav refactor + social-shell breakpoints
   - @performance-engineer → virtual scroll on feed
   Sprint 2: ...
   ```

5. **One-line North Star**: A single sentence that defines what NovaFit is for a user who opens it on their phone for the first time. This sentence should guide every future design and product decision.

---

## Constraints & Rules for Claude During Execution

- **READ before recommending.** Every file referenced in Actions must actually be read before any recommendation about it. Do not assume file contents from CLAUDE.md descriptions.
- **No generic advice.** Every finding must be tied to a specific file, line range, or component. "Improve performance" is not acceptable. "Add `trackBy: trackById` to the `@for` in `post-card.component.ts:67`" is acceptable.
- **Web ≠ Mobile.** Treat them as separate products that happen to share a backend and design token system. Do not mix their roadmaps.
- **BeSocial is mobile's identity.** On mobile, social features take priority over health tracking features in navigation, visual hierarchy, and interaction design. The health tracking features support the social experience, not the other way around.
- **Respect the existing tech stack.** No framework changes. Angular 19 + Signals + Facades + .NET 10 is fixed. Recommendations must work within this stack.
- **Effort honesty.** Do not mark everything as S (small). If something genuinely requires backend schema changes, mark it L and note the migration dependency.
- **Use the agent team.** This analysis is too broad for one agent. The Actions section defines who does what. Follow it.

---
_Prompt generated: 2026-06-22 | Branch: Fix-Release | Technique: COAST_
