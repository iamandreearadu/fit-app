# API Contract: PWA Web Push Notifications

**Status:** READY_FOR_IMPLEMENTATION  
**Date:** 2026-07-21  
**Source ADR:** `.claude/decisions/pwa-implementation.md`

**IMPLEMENTED:** 2026-07-21  
Final endpoints: `POST /api/notifications/push-subscribe` and `DELETE /api/notifications/push-subscribe` → `204 No Content`  
Migration added: `AddPushSubscriptions`  
Services registered: `IPushNotificationService` → `PushNotificationService`  
Ready for: `@angular-developer`

## Scope

Contract pentru înregistrarea/dezînregistrarea browserelor și livrarea Web Push. Web Push completează notificările persistate și SignalR; nu schimbă contractele REST/SignalR existente.

## Authentication and ownership

Ambele endpointuri necesită `[Authorize]`. `UserId` este extras exclusiv din claim-ul JWT `sub`. Requesturile nu acceptă `UserId`, iar un endpoint poate fi șters numai în contextul utilizatorului autentificat.

## DTOs

```csharp
using System.ComponentModel.DataAnnotations;

namespace FitApp.Api.Models.DTOs;

public sealed record PushSubscriptionKeysRequest(
    [property: Required, MaxLength(512)] string P256dh,
    [property: Required, MaxLength(256)] string Auth);

public sealed record PushSubscriptionRequest(
    [property: Required, MaxLength(4096), Url] string Endpoint,
    [property: Required] PushSubscriptionKeysRequest Keys);

public sealed record DeletePushSubscriptionRequest(
    [property: Required, MaxLength(4096), Url] string Endpoint);
```

Endpointul trebuie să fie HTTPS (localhost poate fi acceptat numai în development). Valorile se trim și șirurile goale sunt invalide. Nu se returnează entitatea EF și nu se returnează cheile salvate.

## POST `/api/notifications/push-subscribe`

Înregistrează idempotent subscription-ul browserului curent.

```json
{
  "endpoint": "https://push.example/subscription-id",
  "keys": {
    "p256dh": "base64url-public-key",
    "auth": "base64url-auth-secret"
  }
}
```

### Semantics

1. Citește `userId` din JWT.
2. Caută endpointul unic.
3. Dacă nu există, creează subscription cu `CreatedAt = UtcNow`.
4. Dacă există pentru același user, actualizează cheile; operația rămâne idempotentă.
5. Dacă endpointul există pentru alt user (schimbare de cont pe același browser), îl reasociază atomic utilizatorului curent și actualizează cheile. Posesia subscription-ului este demonstrată de materialul complet furnizat de browser; evenimentul se loghează fără endpoint/chei.
6. Returnează `204 No Content`.

### Responses

| Status | Meaning |
|---|---|
| 204 | Subscription salvat/actualizat |
| 400 | DTO invalid, endpoint ne-HTTPS sau chei invalide |
| 401 | JWT lipsă/invalid sau `sub` absent |
| 500 | Eroare neașteptată, în format `ProblemDetails` |

Concurența pe indexul unic trebuie tratată prin retry/re-read limitat, nu prin răspuns inconsistent.

## DELETE `/api/notifications/push-subscribe`

Elimină subscription-ul indicat pentru utilizatorul autentificat.

```json
{
  "endpoint": "https://push.example/subscription-id"
}
```

Ștergerea este idempotentă. Query-ul filtrează simultan după `Endpoint` și `UserId`; un endpoint al altui utilizator nu este șters și nu este dezvăluit.

### Responses

| Status | Meaning |
|---|---|
| 204 | Șters sau deja absent pentru utilizatorul curent |
| 400 | DTO invalid |
| 401 | JWT lipsă/invalid sau `sub` absent |
| 500 | Eroare neașteptată, în format `ProblemDetails` |

## Entity and database configuration

```csharp
public class PushSubscription
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Endpoint { get; set; } = string.Empty;
    public string P256dh { get; set; } = string.Empty;
    public string Auth { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public User User { get; set; } = null!;
}
```

Configuration requirements:

- `HasIndex(x => x.Endpoint).IsUnique()`;
- required/max lengths consistent with DTOs;
- `HasOne(x => x.User).WithMany(x => x.PushSubscriptions).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade)`;
- migration generated as `AddPushSubscriptions`, never hand-edited;
- no secrets or endpoint values in seed data.

## Push delivery contract

Existing notification events `like`, `comment`, `follow` and `message` trigger a Web Push attempt for every subscription of the recipient. Self-notification rules remain those of `NotificationService`. Delivery is best-effort and does not roll back database persistence or SignalR.

Canonical payload:

```json
{
  "notification": {
    "title": "NovaFit",
    "body": "Ai o notificare nouă.",
    "data": {
      "type": "like",
      "url": "/social/posts/42"
    }
  }
}
```

Allowed payload fields:

- constant app title;
- generic localized body without message/health content;
- notification type allowlist;
- validated relative deep link allowlist.

Forbidden payload content includes BMI, BMR, TDEE, weight, calories, targets, daily values, workout/meal details, message text, email, JWT, user IDs, actor names and images. Unknown references use `/social/notifications`.

Deep-link mapping:

| Type | URL |
|---|---|
| `like` / `comment` | `/social/posts/{referenceId}` when valid, otherwise `/social/notifications` |
| `follow` | `/social/notifications` |
| `message` | `/social/chat/{referenceId}` when valid, otherwise `/social/chat` |

## Failure and cleanup behavior

- Query subscriptions read-only with `AsNoTracking()`.
- Send independently per device; one failure does not stop the rest.
- HTTP 404/410 from push provider removes that exact stale subscription idempotently.
- Transient failures are logged and not deleted. Faza 1 does not add a durable retry queue.
- Logs contain user correlation and status code, never full endpoint, `P256dh`, `Auth`, VAPID private key or serialized payload.
- VAPID config: `Vapid:Subject`, `Vapid:PublicKey`, `Vapid:PrivateKey`; private key supplied through user secrets/environment in production.

## Frontend transport shape

The Angular facade converts the browser `PushSubscription` with `subscription.toJSON()` into `PushSubscriptionRequest`. `SwPush` never appears in a component. The API service only performs the two HTTP calls; permission/support orchestration lives in the push service/facade.

The public VAPID key is build/runtime configuration and must match the backend private key. It is expected to be public and must not be confused with a secret.

## Tests required

- 401 with absent/invalid JWT and no `sub` fallback from body.
- Validation for empty/oversized/non-HTTPS fields.
- POST create, same-user idempotent update and safe account reassignment.
- DELETE only the authenticated user's endpoint and idempotent absent delete.
- User cascade deletes subscriptions; endpoint uniqueness enforced.
- Fan-out to multiple devices; one failure does not abort others.
- 404/410 cleanup; transient failure retained.
- Serialized payload test proving every forbidden health/personal field is absent.
- Existing SignalR notification tests remain green.
