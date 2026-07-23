## Test Coverage Audit — FitApp — 2026-07-21

### CRITICAL (zero coverage on high-risk paths)

1. **No backend test project exists at all.** `FitApp.sln` contains a single project (`FitApp.Api\FitApp.Api.csproj`) — there is no `FitApp.Api.Tests` project, no `*.Tests.csproj` anywhere in the repo, and no `xunit`/`Moq`/`Microsoft.AspNetCore.Mvc.Testing` package references. Every controller and service in `FitApp.Api/Controllers/*.cs` (14 controllers) and `FitApp.Api/Services/*.cs` (23 services) has **zero automated test coverage**. This is the single largest gap in the project.

2. **JWT auth flow is completely untested.** `FitApp.Api/Services/JwtService.cs` (token generation, 7-day expiry, admin role claim) and `AuthController` (`/api/auth/register`, `/api/auth/login`) have no unit or integration tests. No test verifies token expiry handling, invalid-signature rejection, or that `[Authorize]` actually blocks unauthenticated requests on any of the 14 controllers.

3. **Ownership checks are untested everywhere.** Every controller resolves `UserId` from JWT claims (e.g. `AiController.cs:14-17`, `SocialController.cs:15-16`) and is expected to scope queries to that user, but there is no test proving user A cannot read/modify user B's `WorkoutTemplate`, `MealEntry`, `DailyEntry`, `Conversation`, or `Notification`. This is the highest-risk gap for a health-data app — a regression here silently leaks one user's health/fitness data to another and nothing would catch it.

4. **AI proxy endpoints (`/api/ai/text`, `/api/ai/image`, `/api/ai/workout-calories`) are untested**, including cost/abuse exposure. `Program.cs` does register `AddRateLimiter`/`UseRateLimiter` (lines 135, 259), but with no tests there is no verification that the AI endpoints are actually covered by that policy vs. only auth endpoints, that empty-prompt requests are rejected before hitting Groq (per the project's own `test-engineer.md` edge-case list), or that a malformed/huge image payload is handled safely.

5. **SignalR hubs (`NotificationHub`, `ChatHub`) have zero tests.** No test verifies JWT-authenticated hub connection, rejection of an invalid/missing token at handshake, or that `ReceiveMessage`/`ReceiveNotification`/`MessageDeleted` are scoped to the correct user/conversation group and not broadcast to unrelated users.

6. **No frontend facade or service ever has a `.spec.ts`.** `Glob` for `fit-app/src/app/**/*.spec.ts` returns only 17 files, and every single one is a component spec. None of the 13 facades (`fit-app/src/app/core/facade/*.ts` — `account.facade.ts`, `social-content.facade.ts`, `social-feed.facade.ts`, `social-profile.facade.ts`, `groq-ai.facade.ts`, `notification.facade.ts`, `chat.facade.ts`, `nutrition-tab.facade.ts`, `workouts-tab.facade.ts`, `user.facade.ts`, `dashboard.facade.ts`, `blog.facade.ts`, `onboarding.facade.ts`) or 14 API services (`fit-app/src/app/api/*.ts`) has a corresponding spec file. This is exactly the layer `.claude/agents/test-engineer.md` designates as "business logic" that must be unit-tested with `fakeAsync`/`tick()` signal assertions — none exists. Per-facade status:
   - `account.facade.ts` → **no spec**
   - `social-content.facade.ts`, `social-feed.facade.ts`, `social-profile.facade.ts` → **no spec**
   - `groq-ai.facade.ts` → **no spec**
   - `notification.facade.ts` → **no spec**
   - `chat.facade.ts` → **no spec**
   - `workouts-tab.facade.ts` → **no spec**
   - `nutrition-tab.facade.ts` → **no spec**

7. **Every existing component spec is Angular-CLI boilerplate — "should create" only, no behavior coverage.** Verified by reading `workouts.component.spec.ts` and `ai-meal-analyzer.component.spec.ts` in full: both contain a single `it('should create', () => expect(component).toBeTruthy())` and nothing else. This pattern is consistent across all 17 spec files (confirmed by their structure). None of the loading/empty/error-state coverage mandated by `test-engineer.md` ("Always: loading state, empty state, error state in every list view") is present. Effectively, real frontend unit-test coverage is **0%**, not just "thin."

8. **Chat/direct-messaging is completely untested end-to-end.** No xUnit tests for `ConversationsController`/`ConversationService`, no `.spec.ts` for `chat.facade.ts` or `social-chat.facade.ts`-equivalent, and no Cypress spec under `cypress/e2e/` for chat/DM flows (`chat`, `chat-detail` features have no `cypress/e2e/chat/*.cy.js`). Real-time message delivery, soft-delete of messages, and the "participant not in conversation → 403" rule from `test-engineer.md` are all unverified.

### WARNING (thin coverage)

1. **Cypress e2e coverage is UI-only against mocked responses, not real integration.** All 11 Cypress specs (`cypress/e2e/**/*.cy.js`) use `cy.intercept` with fixtures — they verify the Angular UI renders/behaves correctly against a stubbed API, but never exercise the real `FitApp.Api` backend, real SQLite DB, or real SignalR hub. Combined with the complete absence of backend tests (CRITICAL #1), there is no test anywhere in the repo that exercises a real request through Controller → Service → EF Core → SQLite.

2. **Cypress flows present but with gaps:**
   - `auth/` — login, register, jwt-persistence (3 files) — good coverage of the login/register happy+error paths and JWT localStorage persistence.
   - `navigation/guards.cy.js` — AuthGuard/GuestGuard redirect behavior — covered.
   - `dashboard/dashboard.cy.js` — greeting, streak chip/banner states, auth redirect — covered for the daily-tracker landing view only; does not test the actual daily-entry submission form (`daily-user-data` create/update flow) or the AI meal analyzer upload flow.
   - `social/` — discover, feed, notifications, post-detail, profile (5 files) — reasonably strong coverage of social read/interact flows (like, follow, comment, search, empty/error states).
   - `workouts/workouts.cy.js` — list, create-modal, empty state — covers workout list + create only; **no edit or delete flow tested** despite "edit and delete buttons on each workout row" being asserted as visible (`workouts.cy.js:46`) — the buttons' presence is checked but clicking edit/delete is never exercised.

3. **`cy:run:auth` npm script only runs the auth subset** (`cypress run --spec 'cypress/e2e/auth/**/*.cy.js'`) — there's no equivalent scoped script (or a full `cy:run` gate) wired into any visible CI config in this repo, so it's unclear any of the 11 specs run automatically on a PR.

### ADVISORY (nice to have)

1. No Cypress coverage for the **AI Assistant / openai chat feature** (`features/openai/`) — no `cypress/e2e/ai/*.cy.js` despite `groq.component.spec.ts` and `openai.component.spec.ts` existing as (boilerplate-only) component specs.
2. No Cypress coverage for **blog** (`features/blog/`) despite 3 component spec files existing for it.
3. No Cypress coverage for **user profile / physical stats editing** (`features/user/`) — `nutrition-tab.component.spec.ts` and `workouts-tab.component.spec.ts` exist but are boilerplate-only, and there's no `cypress/e2e/nutrition/*.cy.js` or `cypress/e2e/user/*.cy.js`.
4. No Cypress coverage for **active workout session tracking** (`features/workouts/active-session/`) — set-by-set logging, rest timers, session completion are unverified at the e2e level; `active-workout-session.component.spec.ts` is boilerplate-only.
5. No test naming/config exists yet for a future `FitApp.Api.Tests` project (no `.editorconfig`/`Directory.Build.props` reference either) — when this is created it should be added to `FitApp.sln` so `dotnet test` at the solution root picks it up.

### Verified OK (well covered)

- None. Every layer inspected (backend unit, backend integration, frontend facade unit, frontend component behavior, e2e-against-real-backend) has either zero coverage or coverage that is present but non-functional (boilerplate-only component specs) or scoped to mocked UI only (Cypress). The only genuinely exercised behavior in the repo is the Cypress-verified UI rendering/interaction logic for auth, guards, dashboard-landing, social, and workouts-list-create, all running against stubbed `cy.intercept` responses rather than the real stack.

### Overall verdict

**Test coverage is effectively zero at the layers that matter most for a health-data app.** There is no backend test project (CRITICAL #1) — meaning JWT auth, per-user ownership checks, AI-proxy cost/abuse handling, and SignalR hub authorization all ship with no automated safety net whatsoever. On the frontend, all 17 existing `.spec.ts` files are unmodified Angular-CLI scaffolding (`should create`) with no assertions on real behavior, and none of the 13 facades or 14 API services — the layers holding all business logic per this repo's own Signals+Facade architecture — have any spec file at all. The 11 Cypress e2e specs are the only tests in the repo doing real assertion work, but they run entirely against mocked `cy.intercept` fixtures, so they validate UI rendering, not the real Controller→Service→EF Core→SQLite→SignalR pipeline.

**Highest-priority fix, in order:** (1) stand up `FitApp.Api.Tests` (xUnit + `Microsoft.AspNetCore.Mvc.Testing` + EF InMemory) and write ownership-check integration tests first — a leaked cross-user health record is the single most damaging failure mode this app can have and is currently unguarded at every layer; (2) add facade unit tests for `account.facade.ts` and `social-*.facade.ts` (auth + most-used surface); (3) replace boilerplate `should create` component specs with real loading/empty/error-state assertions per `test-engineer.md`'s own mandate.
