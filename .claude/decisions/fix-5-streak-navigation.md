# ADR: Fix 5 — Persistent Streak Counter in Navigation

**Status:** APPROVED  
**Author:** @tech-architect  
**Date:** 2026-05-28  
**Sprint:** 1 (Weeks 1–2)  
**Source:** `.claude/ux-audits/full-platform-audit.md` §6, `.claude/plans/ux-audit-implementation-plan.md` Fix 5

---

## Context

Streak data is computed from `DailyEntry` records and already exposed via `GET /api/daily/streak` (returns `StreakDto`). The Angular `UserFacade` already holds a `streak` signal of type `StreakData`. However:

1. **The streak signal is only populated when the Dashboard is visited.** Users logging workouts or meals in other modules never see their streak counter. A 30-day streak provides zero retention pull while the user is in the Workouts tab.

2. **The existing endpoint lives in `DailyDataController`** under the daily data context. For navigation-level display, streak belongs semantically to the *user* resource — consumed by a shell-level component, not a daily data screen.

3. **There is no real-time push.** After saving a daily entry, the streak counter in the header does not update without a page reload. Streak increment must feel instant — that micro-moment of the counter ticking up is the dopamine hit that reinforces the daily logging habit.

4. **`atRiskToday` is computed but never surfaced.** The flame icon should visually communicate urgency (e.g., pulsing/amber color) when the streak is at risk, not just show a static number.

**What already exists and must NOT be duplicated:**
- `StreakDto(int Current, int Longest, bool LoggedToday, bool AtRisk)` in `UserDtos.cs`
- `GET /api/daily/streak` in `DailyDataController` — keep unchanged for backward compat
- `DailyDataService.GetStreakAsync(userId)` — the core computation logic; reuse it
- `StreakData` interface in `core/models/user.model.ts`
- `streak` signal on `UserFacade`
- `NotificationHub` at `/hubs/notifications` pushing to `user-{userId}` groups — reuse for the push

---

## Decision

### 1. New endpoint: `GET /api/users/me/streak`

A purpose-built navigation endpoint in `UsersController`. It is semantically distinct from `GET /api/daily/streak`:

| | `GET /api/daily/streak` | `GET /api/users/me/streak` (new) |
|---|---|---|
| Controller | `DailyDataController` | `UsersController` |
| DTO | `StreakDto` | `UserStreakDto` |
| Consumer | Dashboard streak widget | Navigation badge — every shell |
| Extra field | — | `lastLogDate`, `isNewRecord` |
| Purpose | Full streak stats (current + longest) | Minimal badge data + record flag |

`UsersController` injects `DailyDataService` alongside the existing `UserService`. This is a thin controller delegation — no business logic in the controller.

### 2. New `UserStreakDto`

Added to `UserDtos.cs`. Fields chosen for the navigation badge use case:

| Field | Type | Source |
|---|---|---|
| `CurrentStreak` | `int` | Consecutive days from `DailyEntry` dates |
| `LastLogDate` | `string?` | `Max(dateSet).ToString("yyyy-MM-dd")`, null if no entries |
| `AtRiskToday` | `bool` | `!loggedToday && current > 0 && DateTime.UtcNow.Hour >= 18` |
| `LoggedToday` | `bool` | `dateSet.Contains(today)` |
| `IsNewRecord` | `bool` | `current > 0 && current == longest` (tied or beats longest) |

`IsNewRecord` is included in the REST response so the completion card (Fix 3) can also read it. It is also included in the SignalR push payload for the badge animation trigger.

### 3. Streak push via SignalR after daily entry save

`DailyDataService.SaveForDateAsync` is the single write path that changes streak state. After `SaveChangesAsync`, a fire-and-forget task pushes `streak-updated` to the user's notification hub group. This approach:

- Keeps the save latency unaffected (push is not awaited on the happy path)
- Reuses the existing `NotificationHub` group addressing (`user-{userId}`)
- Adds a new event name `streak-updated` — distinct from `ReceiveNotification` so the notification facade is not affected
- Failures in the push are logged as warnings and never surface to the caller

`DailyDataService` gains two new constructor injections: `IHubContext<NotificationHub>` and `ILogger<DailyDataService>`. The hub context is safe to inject into scoped services.

**Why not push from the controller?** Streak computation happens in the service. Pushing from the controller would require the controller to either re-compute streak (duplication) or call back into the service (awkward). The service is the right location — it has all necessary data at the moment of state change.

**Why not a dedicated `StreakService`?** Over-engineering. Streak computation is a read over `DailyEntry` — it belongs in `DailyDataService` alongside all other daily entry operations. Fix 5 is Sprint 1, S-effort.

### 4. Frontend: `StreakBadgeComponent` in both shells

A new `shared/components/streak-badge/streak-badge.component.ts` (standalone) that:
- Reads `userFacade.streak()` — a Signal, zero subscriptions
- Displays flame icon + day count
- Applies `streak-badge--at-risk` CSS class when `atRiskToday` is true (amber/pulsing)
- Applies `streak-badge--new-record` animation once when `isNewRecord` flips to true
- Is added to both the main app shell header and the beSocial shell top bar

### 5. Real-time update chain

```
SaveForDateAsync()
  └─ db.SaveChangesAsync()          ← existing
  └─ _ = Task.Run(PushStreakAsync)  ← new, fire-and-forget
       └─ GetUserStreakAsync()
       └─ hubContext.Clients.Group("user-{id}").SendAsync("streak-updated", payload)

NotificationHubService.connect()
  └─ connection.on("streak-updated", handler)   ← new registration

UserFacade (constructor effect)
  └─ subscribes to notifHubSvc.streakUpdated$
  └─ updates this.streak signal
  └─ StreakBadgeComponent re-renders automatically (Signal reactivity)
```

### 6. Streak loading on app init

`AccountFacade.init()` already calls `userFacade.loadCurrentUser()`. Fix 5 adds `userFacade.loadStreak()` immediately after — called on init and after login/register. This ensures the badge is populated from the first screen the user sees.

---

## Clean Architecture Boundaries

- **Controller responsibility:** Extract `UserId` from JWT, call `DailyDataService.GetUserStreakAsync`, return result. No streak logic in the controller.
- **Service responsibility (`DailyDataService`):** All streak computation, `UserStreakDto` construction, SignalR push after save. The push is fire-and-forget — the service method's contract (returning `DailyEntryDto`) is unchanged.
- **What stays out of controllers:** Streak computation, SignalR push, `isNewRecord` determination.
- **What stays out of components:** HTTP calls (go through `UserFacade`), SignalR subscriptions (go through `NotificationHubService`). `StreakBadgeComponent` only reads the `streak()` signal from `UserFacade`.

---

## Data Model

**No new EF entities. No migration required.**

Streak is computed from the existing `DailyEntry` table. The only data model change is adding the `UserStreakDto` DTO.

**New DTO (FitApp.Api/Models/DTOs/UserDtos.cs) — add below existing `StreakDto`:**

```csharp
public record UserStreakDto(
    int CurrentStreak,
    string? LastLogDate,       // "yyyy-MM-dd" of most recent DailyEntry, null if none
    bool AtRiskToday,          // streak > 0 && !loggedToday && UTC hour >= 18
    bool LoggedToday,          // has a DailyEntry for today's date
    bool IsNewRecord           // currentStreak > 0 && currentStreak == allTimeLongest
);
```

**TypeScript interface extension (fit-app/src/app/core/models/user.model.ts) — extend `StreakData`:**

```typescript
export interface StreakData {
  current: number;
  longest: number;
  loggedToday: boolean;
  atRisk: boolean;
  // Added for Fix 5:
  lastLogDate?: string;   // ISO date "yyyy-MM-dd"
  isNewRecord?: boolean;  // true when current streak == all-time longest
}
```

The existing fields are kept unchanged — `StreakData` is already used by the Dashboard streak widget. The two new optional fields (`lastLogDate`, `isNewRecord`) are additive and non-breaking.

**New SignalR event payload (TypeScript):**

```typescript
export interface StreakUpdatedPayload {
  currentStreak: number;
  isNewRecord: boolean;
}
```

Add to `notification.model.ts`.

---

## API Contract

See `.claude/contracts/fix-5-streak-navigation.md` for full response shapes and error codes.

| Method | Route | Auth | Response |
|--------|-------|------|----------|
| GET | /api/users/me/streak | Bearer | `UserStreakDto` |

**New SignalR event:**

| Hub | Event name | Direction | Payload |
|-----|-----------|-----------|---------|
| `/hubs/notifications` | `streak-updated` | Server → Client | `{ currentStreak: number, isNewRecord: boolean }` |

---

## Frontend Architecture

- **Modified:** `core/models/user.model.ts` — extend `StreakData` (additive only)
- **Modified:** `core/models/notification.model.ts` — add `StreakUpdatedPayload` interface
- **Modified:** `core/services/notification-hub.service.ts` — register `streak-updated` handler, add `streakUpdated$` Subject
- **Modified:** `core/facade/user.facade.ts` — add `loadStreak()` method calling new endpoint; subscribe to `notifHubSvc.streakUpdated$` in constructor to update `streak` signal
- **Modified:** `core/facade/account.facade.ts` — call `userFacade.loadStreak()` in `init()`, `login()`, `register()`
- **New:** `shared/components/streak-badge/streak-badge.component.ts` — standalone, reads `userFacade.streak()`
- **Modified:** Main app shell component — add `<app-streak-badge />` to header
- **Modified:** beSocial shell (`social-shell.component.ts`) — add `<app-streak-badge />` to top bar

---

## Instructions for @dotnet-developer

1. **`FitApp.Api/Models/DTOs/UserDtos.cs`** — add `UserStreakDto` record (definition above). Place immediately after existing `StreakDto`.

2. **`FitApp.Api/Services/DailyDataService.cs`** — three changes:
   - Add constructor injections: `IHubContext<NotificationHub> notifHub, ILogger<DailyDataService> logger`
   - Add `using FitApp.Api.Hubs;` and `using Microsoft.AspNetCore.SignalR;`
   - Add `public async Task<UserStreakDto> GetUserStreakAsync(string userId)` — reuse the dateSet computation from `GetStreakAsync`, compute `lastLogDate = dateSet.Count > 0 ? dateSet.Max().ToString("yyyy-MM-dd") : null`, compute `isNewRecord = current > 0 && current == longest`
   - In `SaveForDateAsync`, after `await db.SaveChangesAsync()`, add: `_ = Task.Run(() => PushStreakUpdatedAsync(userId));`
   - Add `private async Task PushStreakUpdatedAsync(string userId)` — calls `GetUserStreakAsync`, then `notifHub.Clients.Group($"user-{userId}").SendAsync("streak-updated", new { currentStreak = dto.CurrentStreak, isNewRecord = dto.IsNewRecord })`, wrapped in try/catch that logs warning on failure

3. **`FitApp.Api/Controllers/UsersController.cs`** — add `DailyDataService dailyService` to primary constructor params. Add:
   ```csharp
   [HttpGet("me/streak")]
   public async Task<IActionResult> GetMyStreak()
   {
       var dto = await dailyService.GetUserStreakAsync(UserId);
       return Ok(dto);
   }
   ```

4. **No migration.** No new entities. No `Program.cs` changes (hub already registered).

5. **Verify** existing `GET /api/daily/streak` still works unchanged — do not touch `DailyDataController` or `GetStreakAsync`.

---

## Instructions for @angular-developer

1. **`core/models/user.model.ts`** — add `lastLogDate?: string` and `isNewRecord?: boolean` to `StreakData` interface.

2. **`core/models/notification.model.ts`** — add `export interface StreakUpdatedPayload { currentStreak: number; isNewRecord: boolean; }`.

3. **`core/services/notification-hub.service.ts`** — add:
   - `private readonly streakSubject = new Subject<StreakUpdatedPayload>();`
   - `readonly streakUpdated$ = this.streakSubject.asObservable();`
   - Inside `connect()`: `this.connection.on('streak-updated', (p: StreakUpdatedPayload) => this.streakSubject.next(p));`

4. **`api/user.service.ts`** — update `getStreak()` to call `GET /api/users/me/streak` (new endpoint) instead of `/api/daily/streak`. Map `UserStreakDto` response fields: `currentStreak → current`, `atRiskToday → atRisk`, `loggedToday → loggedToday`, `lastLogDate → lastLogDate`, `isNewRecord → isNewRecord`. Keep `longest: 0` default since `UserStreakDto` doesn't include it (the dashboard can still use `/api/daily/streak` for the full widget).

5. **`core/facade/user.facade.ts`** — verify `loadStreak()` method exists; if not, add it calling `userSrv.getStreak()` and setting the `streak` signal. In constructor, subscribe to `notifHubSvc.streakUpdated$` with `takeUntilDestroyed()` and update the streak signal: `this.streak.update(s => s ? { ...s, current: p.currentStreak, isNewRecord: p.isNewRecord } : s)`.

6. **`core/facade/account.facade.ts`** — add `void this.userFacade.loadStreak()` in `init()` after `loadCurrentUser()`, and in `login()` and `register()` after their respective `loadCurrentUser()` calls.

7. **`shared/components/streak-badge/streak-badge.component.ts`** — new standalone component:
   - Injects `UserFacade`
   - Template: flame icon + `{{ facade.streak()?.current ?? 0 }}` day count
   - `@if (facade.streak()?.current ?? 0 > 0)` — only rendered when streak > 0
   - CSS classes: `streak-badge--at-risk` when `atRisk`, `streak-badge--new-record` (one-shot animation) when `isNewRecord` 
   - Minimum touch target: 48×48px (container)
   - Colors from CSS variables: `--primary` for active, `var(--color-warning)` for at-risk

8. **Main app shell** — add `<app-streak-badge />` to the header bar (right side, before user avatar).

9. **`features/social/social-shell.component.ts`** — add `<app-streak-badge />` to the beSocial top bar (same position — right side before avatar).

---

## Instructions for @uiux-designer

Spec required: `.claude/design-specs/fix-5-streak-badge.md`
- Streak badge default state: flame icon (🔥 or Material `local_fire_department`) + number, `var(--primary)` purple
- At-risk state: amber/orange flame, subtle pulse animation (0.3s ease in-out, 2s interval) — triggers when `atRiskToday = true`
- New record state: brief scale-up + glow animation on the number (one-shot, triggers on `isNewRecord` flip)
- Zero-streak state: badge hidden entirely (do not show 0)
- Placement: right side of top header bar in main shell, right side of beSocial top bar. Left of user avatar. 48×48px tap target.
- Dark theme only — background must use CSS variables, no hardcoded hex.

---

## Consequences & Trade-offs

### Gains
- Streak visible on every screen → passive reminder throughout the daily logging loop
- Real-time increment after daily entry save → instant dopamine feedback
- At-risk visual cue at 18:00 → nudge to complete the day
- New record animation → reinforces record-breaking moments
- Zero additional DB queries for existing users (same computation, same table)
- No migration, no new entities → safe to ship in Sprint 1 without DB risk

### Trade-offs
- `DailyDataService` now depends on `IHubContext<NotificationHub>` — slight broadening of the service's concerns. Acceptable for S-effort Sprint 1 scope; a `StreakService` would be cleaner at M-effort.
- Streak push is fire-and-forget: if SignalR is down, the badge doesn't update until next page load. Acceptable — next `loadStreak()` (on next init) corrects state.
- `UserFacade` subscribes to `NotificationHubService.streakUpdated$` in its constructor — creates a coupling between user state and the notification hub. This coupling already exists implicitly (hub connects on login/init). Making it explicit is the right trade-off for S-effort.
- The existing `GET /api/daily/streak` and the new `GET /api/users/me/streak` have overlapping data. Accepted: they serve different consumers (Dashboard widget vs. navigation badge) and have different field sets. The duplication is intentional and documented here.

### Must NOT happen
- `StreakBadgeComponent` must never call `UserService` or any API service directly — only through `UserFacade`
- `UserStreakDto` must never include body weight, BMI, BMR, TDEE, or goal calories
- The SignalR `streak-updated` payload must never include health metrics — only `currentStreak` (int) and `isNewRecord` (bool)
- `DailyDataService.PushStreakUpdatedAsync` must be wrapped in try/catch — a SignalR failure must never cause `SaveForDateAsync` to throw or roll back the DB write
