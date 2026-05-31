# API Contract: Fix 5 — Persistent Streak Counter in Navigation

**Status:** `COMPLETE`  
**Author:** @tech-architect  
**Date:** 2026-05-28  
**Sprint:** 1 (Weeks 1–2)  
**ADR:** `.claude/decisions/fix-5-streak-navigation.md`

---

## Overview

Fix 5 adds a persistent streak badge to both app shells so the counter is visible on every screen, not just the Dashboard. It introduces a purpose-built navigation endpoint, a new `UserStreakDto`, and a real-time SignalR push that fires after every daily entry save.

**Existing endpoints that are NOT changed:**

| Method | Route | Auth | Consumer |
|--------|-------|------|----------|
| GET | /api/daily/streak | Bearer | Dashboard streak widget — unchanged |

**New endpoint added by this fix:**

| Method | Route | Auth | Consumer |
|--------|-------|------|----------|
| GET | /api/users/me/streak | Bearer | Navigation badge (both shells) |

**New SignalR event added by this fix:**

| Hub | Event | Direction | Consumer |
|-----|-------|-----------|----------|
| `/hubs/notifications` | `streak-updated` | Server → Client | Navigation badge real-time update |

---

## REST Endpoint Detail

### `GET /api/users/me/streak`

Returns minimal streak data for the navigation badge. User ID is always read from the JWT — never from the request body or path.

**Controller:** `UsersController`  
**Service method:** `DailyDataService.GetUserStreakAsync(string userId)`  
**Auth:** Bearer (JWT) — `[Authorize]` inherited from controller

**Request:** No body, no query params.

**Response: 200 OK**

```json
{
  "currentStreak": 7,
  "lastLogDate": "2026-05-28",
  "atRiskToday": false,
  "loggedToday": true,
  "isNewRecord": false
}
```

**Response: 200 OK — no entries yet**

```json
{
  "currentStreak": 0,
  "lastLogDate": null,
  "atRiskToday": false,
  "loggedToday": false,
  "isNewRecord": false
}
```

**Error Responses:**

| Status | When |
|--------|------|
| 401 | Missing or invalid JWT |
| 500 | Unexpected server error (ProblemDetails) |

> There is no 404: if the user has no `DailyEntry` records, `currentStreak = 0` with `lastLogDate = null` is returned as a valid zero-state.

---

## Field Definitions

### `UserStreakDto` fields

| Field | Type | Null? | Source | Description |
|-------|------|-------|--------|-------------|
| `currentStreak` | int | no | Computed from `DailyEntry` dates | Consecutive days ending on today (or yesterday if not yet logged today). 0 if no entries. |
| `lastLogDate` | string? | yes | `dateSet.Max().ToString("yyyy-MM-dd")` | ISO date of the most recent `DailyEntry`. `null` if the user has never logged. |
| `atRiskToday` | bool | no | `!loggedToday && currentStreak > 0 && DateTime.UtcNow.Hour >= 18` | `true` only after 18:00 UTC when the streak is active but today's entry is missing. |
| `loggedToday` | bool | no | `dateSet.Contains(DateOnly.FromDateTime(DateTime.UtcNow))` | Whether a `DailyEntry` exists for today's date. |
| `isNewRecord` | bool | no | `currentStreak > 0 && currentStreak == longestStreak` | `true` when the current streak ties or beats the all-time longest. Used for the new-record animation trigger. |

**`currentStreak` algorithm** (reused verbatim from `GetStreakAsync`):
```
cursor = loggedToday ? today : today.AddDays(-1)
while dateSet.Contains(cursor): current++, cursor = cursor.AddDays(-1)
```

**`longestStreak` algorithm** (reused verbatim from `GetStreakAsync`):
```
sorted = dateSet.OrderBy(d => d).ToList()
iterate pairs: if sorted[i] == sorted[i-1].AddDays(1) → run++, else run = 1
longest = Math.Max(Max(run), current)
```

> `UserStreakDto` intentionally omits `longestStreak` — the navigation badge does not display it. The Dashboard uses `GET /api/daily/streak` → `StreakDto` for full stats including `Longest`.

---

## Response DTOs (C#)

### Add to `FitApp.Api/Models/DTOs/UserDtos.cs`

Place immediately after the existing `StreakDto` record:

```csharp
// Navigation badge streak data — minimal fields, excludes Longest (see StreakDto for full stats)
public record UserStreakDto(
    int CurrentStreak,
    string? LastLogDate,    // "yyyy-MM-dd" of most recent DailyEntry, null if no entries
    bool AtRiskToday,       // !loggedToday && currentStreak > 0 && UTC hour >= 18
    bool LoggedToday,       // DailyEntry exists for today's date
    bool IsNewRecord        // currentStreak > 0 && currentStreak == allTimeLongest
);
```

### Existing `StreakDto` — **DO NOT CHANGE**

```csharp
// Existing — Dashboard streak widget — unchanged
public record StreakDto(int Current, int Longest, bool LoggedToday, bool AtRisk);
```

---

## TypeScript Interfaces

### Extend `StreakData` in `fit-app/src/app/core/models/user.model.ts`

The two new fields are **optional and additive** — the existing Dashboard streak widget that reads `current`, `longest`, `loggedToday`, `atRisk` is unaffected.

```typescript
export interface StreakData {
  current: number;
  longest: number;
  loggedToday: boolean;
  atRisk: boolean;
  // Added for Fix 5 (navigation badge):
  lastLogDate?: string;    // ISO date "yyyy-MM-dd", undefined if never logged
  isNewRecord?: boolean;   // true when current streak == all-time longest
}
```

### Add `StreakUpdatedPayload` to `fit-app/src/app/core/models/notification.model.ts`

```typescript
// Fix 5 — SignalR streak-updated event payload
export interface StreakUpdatedPayload {
  currentStreak: number;
  isNewRecord: boolean;
}
```

> **Privacy constraint:** `StreakUpdatedPayload` contains only `currentStreak` (int) and `isNewRecord` (bool). It must NEVER include weight, BMI, BMR, TDEE, goal calories, or any health metric.

---

## SignalR Event Contract

### `streak-updated`

| Property | Value |
|----------|-------|
| Hub URL | `/hubs/notifications` |
| Event name | `streak-updated` |
| Direction | Server → Client |
| Group | `user-{userId}` (same group as `ReceiveNotification`) |
| Trigger | After `DailyDataService.SaveForDateAsync` completes `db.SaveChangesAsync()` |
| Delivery | Fire-and-forget — failures logged as warnings, never surface to caller |

**Payload (JSON sent by SignalR):**

```json
{
  "currentStreak": 8,
  "isNewRecord": true
}
```

**C# send call (inside `PushStreakUpdatedAsync`):**

```csharp
await notifHub.Clients
    .Group($"user-{userId}")
    .SendAsync("streak-updated", new { currentStreak = dto.CurrentStreak, isNewRecord = dto.IsNewRecord });
```

**TypeScript handler registration (inside `NotificationHubService.connect()`):**

```typescript
this.connection.on('streak-updated', (p: StreakUpdatedPayload) => this.streakSubject.next(p));
```

**Distinctness:** `streak-updated` is a separate event name from `ReceiveNotification`. The `NotificationFacade` and `SocialNotificationsFacade` are not affected — they only listen for `ReceiveNotification`.

---

## Field Mapping: C# → TypeScript

| C# (`UserStreakDto`) | TypeScript (`StreakData`) | Notes |
|---------------------|--------------------------|-------|
| `CurrentStreak` | `current` | Direct mapping in `getStreak()` |
| `LastLogDate` | `lastLogDate` | Direct mapping — optional, may be `undefined` |
| `AtRiskToday` | `atRisk` | camelCase rename |
| `LoggedToday` | `loggedToday` | Direct mapping |
| `IsNewRecord` | `isNewRecord` | Direct mapping — optional |
| *(not in `UserStreakDto`)* | `longest` | Set to `0` as default — badge doesn't need it |

### `user.service.ts` mapping (update `getStreak()` to call new endpoint):

```typescript
public async getStreak(): Promise<StreakData | null> {
  try {
    const dto = await firstValueFrom(
      this.http.get<{
        currentStreak: number;
        lastLogDate: string | null;
        atRiskToday: boolean;
        loggedToday: boolean;
        isNewRecord: boolean;
      }>(`${this.baseUrl}/api/users/me/streak`)
    );
    return {
      current: dto.currentStreak,
      longest: 0,            // UserStreakDto omits longest; badge doesn't use it
      loggedToday: dto.loggedToday,
      atRisk: dto.atRiskToday,
      lastLogDate: dto.lastLogDate ?? undefined,
      isNewRecord: dto.isNewRecord,
    };
  } catch {
    return null;
  }
}
```

---

## Backend Implementation Checklist (`@dotnet-developer`)

- [ ] **`FitApp.Api/Models/DTOs/UserDtos.cs`** — add `UserStreakDto` record immediately after `StreakDto`
- [ ] **`FitApp.Api/Services/DailyDataService.cs`**
  - [ ] Add constructor params: `IHubContext<NotificationHub> notifHub, ILogger<DailyDataService> logger`
  - [ ] Add usings: `using FitApp.Api.Hubs;` and `using Microsoft.AspNetCore.SignalR;`
  - [ ] Add `public async Task<UserStreakDto> GetUserStreakAsync(string userId)`:
    - Reuse the same `dateSet` computation from `GetStreakAsync`
    - Compute `lastLogDate = dateSet.Count > 0 ? dateSet.Max().ToString("yyyy-MM-dd") : null`
    - Compute `current` and `longest` using existing algorithm
    - Compute `isNewRecord = current > 0 && current == longest`
    - Return `new UserStreakDto(current, lastLogDate, atRisk, loggedToday, isNewRecord)`
  - [ ] In `SaveForDateAsync`, after `await db.SaveChangesAsync()`:
    ```csharp
    _ = Task.Run(() => PushStreakUpdatedAsync(userId));
    ```
  - [ ] Add `private async Task PushStreakUpdatedAsync(string userId)`:
    ```csharp
    private async Task PushStreakUpdatedAsync(string userId)
    {
        try
        {
            var dto = await GetUserStreakAsync(userId);
            await notifHub.Clients
                .Group($"user-{userId}")
                .SendAsync("streak-updated", new { currentStreak = dto.CurrentStreak, isNewRecord = dto.IsNewRecord });
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to push streak update for user {UserId}", userId);
        }
    }
    ```
- [ ] **`FitApp.Api/Controllers/UsersController.cs`**
  - [ ] Add `DailyDataService dailyService` to primary constructor params
  - [ ] Add endpoint:
    ```csharp
    [HttpGet("me/streak")]
    public async Task<IActionResult> GetMyStreak()
    {
        var dto = await dailyService.GetUserStreakAsync(UserId);
        return Ok(dto);
    }
    ```
- [ ] **No migration** — no new entities, no schema changes
- [ ] **Verify** `GET /api/daily/streak` still returns `StreakDto` with `Current`, `Longest`, `LoggedToday`, `AtRisk` — do NOT modify `GetStreakAsync` or `DailyDataController`

---

## Frontend Implementation Checklist (`@angular-developer`)

- [ ] **`core/models/user.model.ts`** — extend `StreakData` with `lastLogDate?: string` and `isNewRecord?: boolean`
- [ ] **`core/models/notification.model.ts`** — add `StreakUpdatedPayload` interface
- [ ] **`core/services/notification-hub.service.ts`**:
  - [ ] Add `private readonly streakSubject = new Subject<StreakUpdatedPayload>();`
  - [ ] Add `readonly streakUpdated$ = this.streakSubject.asObservable();`
  - [ ] Inside `connect()`: `this.connection.on('streak-updated', (p: StreakUpdatedPayload) => this.streakSubject.next(p));`
- [ ] **`api/user.service.ts`** — update `getStreak()` to call `GET /api/users/me/streak` with field mapping above
- [ ] **`core/facade/user.facade.ts`** — in constructor, subscribe to `notifHubSvc.streakUpdated$` with `takeUntilDestroyed()`:
  ```typescript
  notifHubSvc.streakUpdated$.pipe(takeUntilDestroyed()).subscribe(p => {
    this.streak.update(s => s ? { ...s, current: p.currentStreak, isNewRecord: p.isNewRecord } : s);
  });
  ```
- [ ] **`core/facade/account.facade.ts`** — add `void this.userFacade.loadStreak()`:
  - In `init()` — after `loadCurrentUser()`
  - In `login()` — after `loadCurrentUser()`
  - In `register()` — after `loadCurrentUser()`
- [ ] **`shared/components/streak-badge/streak-badge.component.ts`** — new standalone component:
  - Inject `UserFacade` only (no API services)
  - Template: flame icon + `{{ facade.streak()?.current ?? 0 }}` day count
  - Rendered only when `(facade.streak()?.current ?? 0) > 0`
  - CSS class `streak-badge--at-risk` when `facade.streak()?.atRisk`
  - CSS class `streak-badge--new-record` (one-shot) when `facade.streak()?.isNewRecord`
  - Minimum 48×48px tap target
- [ ] **Main app shell** — add `<app-streak-badge />` to header right side, left of user avatar
- [ ] **`features/social/social-shell.component.ts`** — add `<app-streak-badge />` to beSocial top bar, same placement

---

## Constraints

- `UserStreakDto` must NEVER contain weight, BMI, BMR, TDEE, goal calories, or any health metric
- `StreakUpdatedPayload` must NEVER contain health metrics — only `currentStreak` (int) and `isNewRecord` (bool)
- `PushStreakUpdatedAsync` must be wrapped in try/catch — a SignalR failure must NEVER cause `SaveForDateAsync` to throw or roll back the DB write
- `StreakBadgeComponent` must NEVER inject `UserService` or any API service — only `UserFacade`
- `GET /api/daily/streak` must remain unchanged — backward compatibility required for Dashboard widget

---

## Implementation Log

```
2026-05-28 - DRAFT created by @tech-architect
2026-05-28 - BACKEND_READY confirmed by @dotnet-developer

  Files changed (3):
    FitApp.Api/Models/DTOs/UserDtos.cs
      + UserStreakDto record added after StreakDto
      - No health metrics (BMI, weight, BMR, TDEE, goal calories) included

    FitApp.Api/Services/DailyDataService.cs
      + Constructor: added IHubContext<NotificationHub> notifHub, ILogger<DailyDataService> logger
      + ComputeStreakCoreAsync() private helper — shared by GetStreakAsync + GetUserStreakAsync
      + GetUserStreakAsync(string userId) → UserStreakDto
      + SaveForDateAsync: fire-and-forget PushStreakUpdatedAsync after SaveChangesAsync
      + PushStreakUpdatedAsync(string userId, UserStreakDto dto) — hub push, wrapped in try/catch
      ~ GetStreakAsync: refactored to delegate to ComputeStreakCoreAsync (behaviour unchanged)

    FitApp.Api/Controllers/UsersController.cs
      + DailyDataService dailyService added to primary constructor
      + GET /api/users/me/streak → GetMyStreak() → Ok(UserStreakDto)

  No migration. No Program.cs changes. Build: 0 errors, 2 warnings (pre-existing MailKit advisory).

  Implementation note — fire-and-forget safety:
    ADR specified Task.Run(() => PushStreakUpdatedAsync(userId)) where the method re-queries
    the DB internally. AppDbContext is scoped and would be disposed after the request ends,
    causing ObjectDisposedException on the background thread.
    Resolution: streak DTO is pre-computed via GetUserStreakAsync() within the request scope;
    Task.Run captures only IHubContext (singleton) + the pre-computed DTO (no scoped deps).
    Behaviour is identical — the push remains truly fire-and-forget; only the SignalR call
    runs on the thread pool.

  Implementation note — push trigger scope:
    Task description requested push on workout save + meal save + daily entry save.
    Streak is computed exclusively from DailyEntry dates — workout/meal saves do not
    change streak state. Pushing streak-updated after every workout/meal save would push
    stale identical data and add unnecessary DB reads. Push is limited to
    DailyDataService.SaveForDateAsync per ADR §3.

  Ready for: @angular-developer

2026-05-28 - COMPLETE confirmed by @angular-developer

  Files changed (12):

  Models:
    core/models/user.model.ts
      + lastLogDate?: string    (additive — Dashboard unaffected)
      + isNewRecord?: boolean   (additive — populated via SignalR push, undefined on init)
    core/models/notification.model.ts
      + StreakUpdatedPayload interface { currentStreak: number; isNewRecord: boolean }

  Services:
    core/services/notification-hub.service.ts
      + streakSubject (private Subject<StreakUpdatedPayload>)
      + streakUpdated$ (public Observable)
      + connection.on('streak-updated', ...) registered in connect()
    api/user.service.ts
      ~ NO CHANGE — getStreak() still calls /api/daily/streak to preserve longest
        for Dashboard "Best: Xd" display. SignalR push adds isNewRecord on top.

  Facades:
    core/facade/user.facade.ts
      + NotificationHubService injected
      + takeUntilDestroyed() subscription to streakUpdated$ in constructor
      + streak.update() merges current + isNewRecord (preserves longest)
    core/facade/account.facade.ts
      + void this.userFacade.loadStreak() in init(), login(), register()

  New component:
    shared/components/streak-badge/streak-badge.component.ts   (ChangeDetectionStrategy.OnPush)
    shared/components/streak-badge/streak-badge.component.html (@if current > 0, role=status)
    shared/components/streak-badge/streak-badge.component.css  (all keyframes component-scoped)

  Shell integrations:
    shared/components/header/header.component.ts + .html
      + <app-streak-badge /> before .hdr-user (authenticated users only)
    features/social/components/top-bar/social-top-bar.component.ts + .html
      + <app-streak-badge /> before menu button (mobile beSocial)
    features/social/components/side-nav/social-side-nav.component.ts + .html + .css
      + <app-streak-badge /> in .social-sidenav-streak wrapper (desktop beSocial)

  Implementation deviation (documented):
    Contract specified updating getStreak() to call /api/users/me/streak. This was
    NOT done because it would zero-out streak.longest, suppressing the Dashboard's
    "Best: Xd" display. Instead, getStreak() keeps calling /api/daily/streak for
    backward compatibility. The isNewRecord field is populated exclusively via the
    SignalR streak-updated push (which fires on every DailyEntry save). On initial
    app load, isNewRecord is undefined (badge renders correctly; glow animation is
    skipped until first real-time increment). Follow-up fix: Dashboard can call
    /api/daily/streak directly and the nav badge loadStreak() can switch to the new
    endpoint if longest is no longer needed in the shared streak signal.

  Build: ng build --configuration development → 0 errors, 0 warnings
```
