# NovaFit — Executive Summary, Agent Execution Queue & North Star
_Generated: 2026-06-22 | Branch: Fix-Release | Full 8-agent analysis pipeline_

---

## 1. Executive Summary

**Biggest structural problem:** NovaFit's mobile navigation is in an incomplete refactor state. Two fully-built navigation components (`social-bottom-nav` and `social-top-bar`) were replaced but never deleted, leaving three separate nav layers stacked simultaneously on mobile — consuming 160px of viewport. More critically, the create-post action is completely unreachable on mobile social routes: the feed FAB is hidden at ≤768px, the hamburger drawer is dead code, and the only path is a 36px icon competing with two other controls in the top bar. The app's declared identity is "social-first on mobile," but the primary social action is the hardest thing to find.

**Biggest opportunity:** NovaFit has every data asset that Hevy and Strava monetize socially (workout sessions with sets/reps/weights, meal logs, daily streaks) but surfaces none of it as structured social content. After a user completes a workout, they get a toast. Hevy shows them a structured summary card and asks if they want to share it. This one missing "post-action feedback loop" — completion card + one-tap share — would simultaneously close the habit loop, generate social content, and drive the feed engagement that BeSocial needs to feel alive.

**What "top-5 in category" requires that is currently missing:** A social feed that populates itself from user activity (zero-effort content creation), a profile that reads as an athlete identity card before a follower count, and an onboarding flow that ends with the user connected to people — not staring at an empty feed.

---

## 2. Web Refactoring Roadmap — Summary

_Full detail: `.claude/refactoring/web-refactoring-roadmap.md`_

| ID | Item | Files | Effort |
|----|------|-------|--------|
| P0.1 | SignalR `MessageDeleted` not handled — DMs show stale deleted content | `chat-hub.service.ts` | S |
| P0.2 | SignalR double-connection during reconnect | `chat-hub.service.ts:18`, `notification-hub.service.ts:23` | S |
| P0.3 | `AuthController` not using `ProblemDetails` | `AuthController.cs` | S |
| P0.4 | Blog list unbounded (no pagination) | `BlogService.cs:14` | S |
| P0.5 | Conversations list unbounded (no pagination) | `ConversationService.cs:35` | M |
| P0.6 | Profile uses route snapshot — stale data on nav between profiles | `social-profile.component.ts:73` | S |
| P0.7 | `archiveWorkout` called on "Unarchive" button | `social-profile.component.html:299` | S |
| P1.1 | Split `SocialFacade` (454 lines, 37+ methods) into 3 focused facades | `social.facade.ts` | L |
| P1.2 | Lazy-load `SocialShellComponent` | `app.routes.ts:96` | S |
| P1.3 | Rename 3 AI service files + fix typo (`grog-ai`) | `groq-ai-api.service.ts`, `groq-ai.service.ts`, `grog-ai.service.ts` | S |
| P1.4 | Move UI alert logic from `AccountService` to `AccountFacade` | `account.service.ts:24-79` | S |
| P1.5 | Delete dead re-export facades | `social-chat.facade.ts`, `social-notifications.facade.ts` | S |
| P1.6 | SignalR `onreconnected` state re-sync + extended retry schedule | Both hub services + facades | S |
| P1.7 | Fix `UserFacade` delegations (plain values → computed signals) | `user.facade.ts:213,226` | S |
| P1.8 | Audit + remove dead `toObservable()` bridges | `blog.facade.ts`, `workouts-tab.facade.ts`, `nutrition-tab.facade.ts` | S |
| P2.1 | Desktop sidebar navigation redesign | `social-side-nav.component.*` | M |
| P2.2 | Profile redesign: athlete stat strip, heatmap, achievement chips | `social-profile.component.*` | M |
| P2.3 | Structured workout summary cards in feed | `post-card.component.*`, `social.model.ts` | M |
| P2.4 | Dashboard daily completion ring | `dashboard.component.*` + new component | S |
| P2.5 | Blog/Article: audit public vs. beSocial article routing | `write-article.component.ts`, `BlogController.cs` | M |
| P3.1 | Replace 100+ hardcoded hex values with CSS tokens | 40+ component CSS files | M |
| P3.2 | Add `-webkit-backdrop-filter` everywhere (iOS Safari fix) | ~15 CSS files | S |
| P3.3 | Delete dead `social-bottom-nav` and `social-top-bar` CSS files | 8 files | S |
| P3.4 | Standardize breakpoints (16+ values → 6 canonical) | All component CSS files | M |
| P3.5 | Add glassmorphism surface tokens | `styles.css` + component CSS | M |
| P3.6 | Z-index token system | `styles.css` + component CSS | S |
| P3.7 | Build `<app-empty-state>` shared component | New in `shared/components/` | S |
| P3.8 | Build `<app-skeleton>` shared component | New in `shared/components/` | S |
| P4.1 | Collapse PostResponse article fields → nested `ArticlePreview` | `SocialDtos.cs`, `social.model.ts` | M |
| P4.2 | Fix `GetMessagesAsync` → `CursorPageResponse<T>` | `ConversationDtos.cs`, `ConversationService.cs` | S |
| P4.3 | Add index on `Follows.FollowingId` | `AppDbContext.cs` + migration | S |
| P4.4 | Add `GET /api/social/trending` endpoint | `SocialController.cs`, `SocialService.cs` | M |
| P4.5 | Expand workout share endpoint to include structured exercise data | `SocialController.cs`, `SocialService.cs` | M |
| P4.6 | Remove redundant `GetPublicStatsAsync` DB round-trip | `UserService.cs:41-103` | S |

---

## 3. Mobile / BeSocial Refactoring Roadmap — Summary

_Full detail: `.claude/refactoring/mobile-besocial-roadmap.md`_

| ID | Item | Components | Effort |
|----|------|------------|--------|
| P0.1 | Unified bottom nav redesign: Feed/Discover/Log/Alerts/Messages. Remove social-top-tabs | `app-bottom-nav.component.*`, `social-shell.component.*` | M |
| P0.2 | Split social badge into separate Alerts + Messages badges | `app-bottom-nav.component.ts:25-29` | S |
| P0.3 | Add back navigation on detail routes (post, chat, article, profile) | `app-top-bar.component.*` | S |
| P0.4 | Expose create-post action on mobile (resolved by Log center tab) | `social-feed.component.css:272-279` | S |
| P0.5 | Add pull-to-refresh on social feed | `social-feed.component.ts` | S |
| P0.6 | Switch feed from offset to cursor-based pagination | `social.facade.ts`, `social.service.ts` | M |
| P0.7 | DOM recycling / render window strategy on feed | `social-feed.component.ts` | L |
| P0.8 | Discover page pagination | `social-discover.component.ts:61` | S |
| P1.1 | Mobile profile hero redesign: athlete stat strip, demoted follower counts | `social-profile.component.html` | M |
| P1.2 | Activity heatmap (12-week contribution grid) on profile | `social-profile.component.html`, `.css` | M |
| P1.3 | Achievement chip row on profile | `social-profile.component.html`, `.css` | M |
| P1.4 | Post grid touch actions: permanent 3-dot button → bottom sheet | `social-profile.component.html:469-514` | S |
| P1.5 | SignalR custom reconnect schedule + mobile network resilience | `chat-hub.service.ts`, `notification-hub.service.ts` | S |
| P1.6 | "Reconnecting..." banner in social shell | `social-shell.component.html` | S |
| P1.7 | Badge dot vs number variant | `app-bottom-nav.component.*` | S |
| P2.1 | Log action sheet (center tab) | New `log-action-sheet.component.ts` | M |
| P2.2 | Post-completion reward screen: workout | Workout session completion flow | M |
| P2.3 | Post-completion reward screen: meal (privacy-safe) | `meal-completion-feedback.component.*` | S |
| P2.4 | Swipe-to-like gesture on post-card | `post-card.component.ts` | M |
| P2.5 | Resolve AI FAB vs daily panel FAB stacking | `ai-chat-fab.component.css`, `social-shell.component.css` | S |
| P2.6 | Meal analyzer camera flow polish | `ai-meal-analyzer.component.ts` | S |
| P3.1 | Social discovery step in onboarding | New `onboarding-social-discovery.component.ts` | S |
| P3.2 | Remove competing `OnboardingWizardComponent` | `onboarding-wizard.component.*` | S |
| P3.3 | Fix "Your Numbers" CTA deep links | `your-numbers-reveal.component.ts:134,139` | S |
| P3.4 | Add biometrics skip option | `onboarding-biometrics.component.html` | S |
| P3.5 | Add imperial/metric unit preference | `onboarding-biometrics.component.*`, `User.cs` + migration | M |
| P3.6 | PWA manifest + service worker | `manifest.webmanifest`, `angular.json` | S |
| P3.7 | Tighten build budgets | `angular.json:46-50` | S |
| P3.8 | Push notification token registration endpoint | New `PushController.cs` + entity + migration | M |
| IMG.1 | Fix avatar images: add `loading="lazy"` and dimensions | `post-card.component.html:15-18`, `social-discover.component.html:133,55` | S |
| IMG.2 | Add `decoding="async"` and aspect-ratio wrapper to post images | `post-card.component.html:106` | S |

---

## 4. Agent Execution Queue

### Sprint 1 — Critical Path (blockers + quick wins)

```
@bug-hunter
  → P0.6: Profile snapshot route param fix (social-profile.component.ts:73)
  → P0.7: archiveWorkout logic inversion (social-profile.component.html:299)
  → P0.2: SignalR double-connection guard (chat-hub.service.ts:18, notification-hub.service.ts:23)
  → P0.1: SignalR MessageDeleted handler (chat-hub.service.ts)
  Dependency: none — start immediately

@dotnet-developer
  → P0.3: AuthController → ProblemDetails
  → P0.4: Blog list pagination
  → P4.3: Add Follows.FollowingId index + migration
  → P4.6: Remove redundant GetPublicStatsAsync round-trip
  Dependency: none — start immediately

@performance-engineer
  → P1.2 Web: Lazy-load SocialShellComponent (app.routes.ts:96)
  → P3.7 Mobile: Tighten build budgets (angular.json:46-50)
  → IMG.1: Avatar lazy-loading + dimensions (post-card.component.html:15)
  → IMG.2: Post image aspect-ratio + decoding="async" (post-card.component.html:106)
  Dependency: none — start immediately

@angular-developer
  → P1.3 Web: Rename 3 AI service files + fix grog→groq typo
  → P1.4 Web: Move AccountService alert logic to AccountFacade
  → P1.5 Web: Delete dead re-export facades
  → P1.8 Web: Audit/remove dead toObservable() bridges
  → P0.4 Mobile: Remove display:none on feed FAB (social-feed.component.css:272-279)
  → P3.2 Web: Add -webkit-backdrop-filter to all affected CSS files
  → P3.3 Web: Delete dead social-bottom-nav and social-top-bar component files
  Dependency: none — start immediately
```

### Sprint 2 — Navigation + Core Experience

```
@uiux-designer
  → Finalize mobile IA spec (5-tab bottom nav as per Section A output)
  → Finalize Log action sheet component spec
  → Finalize profile hero mobile/web spec
  Dependency: Sprint 1 must complete first (dead components removed, nav state clean)

@angular-developer
  → P0.1 Mobile: Bottom nav redesign (Feed/Discover/Log/Alerts/Messages)
    - Remove social-top-tabs from social-shell
    - Split social badge into Alerts + Messages
  → P0.2 Mobile: Separate Alerts/Messages badge data bindings
  → P0.3 Mobile: Back navigation on detail routes (app-top-bar)
  → P0.5 Mobile: Pull-to-refresh on feed
  → P0.8 Mobile: Discover page pagination
  → P1.6 Mobile: SignalR reconnect banner
  → P1.5 Mobile: Custom reconnect schedule + onreconnected handler
  → P1.6 Web: onreconnected state re-sync in facades
  → P2.5 Mobile: Resolve AI FAB vs daily panel FAB stacking
  Dependency: @uiux-designer nav spec, Sprint 1 dead-code cleanup

@dotnet-developer
  → P0.5 Web: Conversations list pagination
  → P4.2 Web: CursorPageResponse shape for GetMessagesAsync
  → P4.4 Web: Add GET /api/social/trending endpoint
  Dependency: Sprint 1 complete
```

### Sprint 3 — Profile + Feed Content

```
@angular-developer
  → P0.6 Mobile: Feed cursor-based pagination
    (backend already supports cursor — wire to frontend facade + API service)
  → P1.1 Mobile: Profile hero redesign (athlete stat strip, demoted follower counts)
  → P1.2 Mobile: Activity heatmap (12-week contribution grid)
  → P1.3 Mobile: Achievement chip row
  → P1.4 Mobile: Post grid touch actions (3-dot button → bottom sheet)
  → P2.4 Web: Dashboard daily completion ring
  → P1.7 Web: Fix UserFacade delegations → computed signals
  Dependency: Sprint 2 complete; heatmap needs workout history data available

@dotnet-developer
  → P4.5 Web: Expand workout share endpoint (structured exercise data)
  Dependency: none — can start in parallel with Sprint 3

@design-system-architect
  → P3.1 Web: Replace hardcoded hex values with CSS tokens (worst 5 files first)
  → P3.5 Web: Add glassmorphism surface tokens to styles.css
  → P3.6 Web: Z-index token system
  Dependency: none — can start in parallel
```

### Sprint 4 — Content Creation + Onboarding

```
@angular-developer + @dotnet-developer (coordinated deploy)
  → P2.3 Web: Structured workout summary cards in feed (frontend rendering)
    Dependency: P4.5 (backend exercise data in share endpoint) must ship first
  → P4.1 Web: Collapse PostResponse article fields → ArticlePreview DTO
    (BREAKING CHANGE — coordinate Angular + .NET deploy together)

@angular-developer
  → P2.1 Mobile: Log action sheet (LogActionSheetComponent)
  → P2.2 Mobile: Post-completion reward screen (workout)
  → P2.3 Mobile: Post-completion reward screen (meal)
  → P3.1 Mobile: Social discovery step in onboarding
  → P3.2 Mobile: Remove competing OnboardingWizardComponent
  → P3.3 Mobile: Fix "Your Numbers" CTA deep links
  → P3.4 Mobile: Add biometrics skip option
  Dependency: Sprint 3; P2.2 requires P4.5 backend data

@uiux-designer
  → P3.7 Web: Build <app-empty-state> shared component spec
  → P3.8 Web: Build <app-skeleton> shared component spec
  Dependency: Sprint 3 complete
```

### Sprint 5 — Architecture + Design System

```
@tech-architect
  → P1.1 Web: ADR for SocialFacade split strategy + social-post-cache.service.ts design
  Dependency: none — ADR can start immediately; implementation follows

@angular-developer
  → P1.1 Web: Split SocialFacade into social-feed, social-profile, social-content facades
    + create social-post-cache.service.ts
    Dependency: ADR approved from tech-architect
  → P0.7 Mobile: DOM recycling / render window strategy (after cursor pagination, after post cache)
    Dependency: P0.6 Mobile (cursor pagination), P1.1 Web (post cache)

@design-system-architect
  → P3.4 Web: Standardize breakpoints (16+ → 6 canonical)
  → P3.7 Web: Implement <app-empty-state> component
  → P3.8 Web: Implement <app-skeleton> component
  Dependency: Sprint 4 complete
```

### Sprint 6 — PWA + Advanced Features

```
@devops-engineer + @angular-developer
  → P3.6 Mobile: PWA manifest + service worker
  → P3.7 Mobile: Build budgets tightened
  → P2.4 Mobile: Swipe-to-like gesture on post-card

@dotnet-developer
  → P3.8 Mobile: PWA push token registration endpoint + PushSubscription entity

@angular-developer
  → P3.5 Mobile: Imperial/metric unit preference in onboarding
  → P2.1 Web: Desktop sidebar navigation redesign

@tech-architect + @angular-developer
  → P2.5 Web: Blog/Article audit (public vs. beSocial article routing)
  Dependency: ADR required before implementation

Cross-cut:
@security-auditor → Full security audit of JWT, push tokens, health data privacy
@performance-engineer → Bundle analysis post all lazy-load changes; confirm build budgets pass
@test-engineer → Regression tests for all P0 bug fixes, integration tests for navigation changes
@code-reviewer → Final review of SocialFacade split (largest single refactor)
```

---

## 5. One-line North Star

**NovaFit is the app where you train with your people — every rep logged, every meal tracked, every streak day lived is a moment your circle can see, celebrate, and push back on.**

---

_Documents: `web-refactoring-roadmap.md` | `mobile-besocial-roadmap.md` | `executive-summary-and-execution-queue.md`_
_Analysis pipeline: ux-auditor → competitor-analyst → design-system-architect → tech-architect → dotnet-developer → performance-engineer → product-strategist → uiux-designer_
