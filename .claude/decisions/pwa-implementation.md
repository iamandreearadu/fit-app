# ADR: NovaFit PWA Implementation (Faza 1 Mobile)

**Status:** Accepted for implementation  
**Date:** 2026-07-21  
**API contract:** `.claude/contracts/pwa-push-notifications.md`

## Context

NovaFit trebuie să fie instalabilă pe Android, desktop și iOS și să pornească fără chrome-ul browserului atunci când este lansată de pe home screen. Configurația curentă nu conține `@angular/service-worker`, înregistrarea service worker-ului, manifest sau `ngsw-config.json`; `index.html` nu are metadata PWA/iOS. Notificările aplicației sunt livrate în prezent în timp real prin SignalR, ceea ce nu acoperă aplicația închisă.

Faza 1 trebuie să adauge un app shell instalabil, actualizări controlate și Web Push, păstrând arhitectura Angular Signals + Facade și serviciul backend de notificări existent.

## Decision

1. Folosim `@angular/pwa` / Angular Service Worker, nu Workbox și nu un service worker custom.
2. App shell-ul (HTML, JS, CSS, fonturi și iconițe) este `prefetch`, versionat de Angular SW.
3. Doar endpointurile explicit enumerate pentru dashboard au cache `freshness` (network-first), timeout 3 secunde, `maxAge` 1 oră și `maxSize` 50. `/api/auth/**` și `/hubs/**` nu apar în niciun `dataGroup` și nu sunt cache-uite. Cererile mutative nu sunt cache-uite.
4. Web Push este un canal suplimentar față de SignalR. Persistența notificării și livrarea SignalR rămân neschimbate; serviciul de notificări orchestrează best-effort livrarea web push după crearea evenimentului.
5. Backend-ul folosește VAPID și pachetul NuGet `WebPush`. Cheia privată rămâne exclusiv în secret/configurația runtime; frontend-ul primește numai cheia publică.
6. Permisiunea push se solicită numai în urma unei acțiuni explicite a utilizatorului, după o acțiune cu valoare (prima înregistrare zilnică). Refuzul, lipsa suportului și iOS neinstalat sunt stări normale, nu erori blocante.
7. O versiune `VERSION_READY` produce un snackbar Material. Acțiunea utilizatorului activează versiunea și reîncarcă documentul; actualizarea nu întrerupe automat o sesiune activă.

## Clean Architecture Boundaries

- Controller responsibility: autentificare/HTTP, validarea DTO-ului, extragerea exclusivă a `sub` din JWT și maparea rezultatului la status HTTP.
- Service responsibility: upsert/delete subscription, fan-out pe device-uri, construirea payloadului sigur, apelul Web Push, cleanup 404/410 și logarea fără chei sensibile.
- What stays out of controllers: EF queries, VAPID, retry/fan-out, payload construction și integrarea SignalR/Web Push.
- What stays out of components: `HttpClient`, `SwPush`, `SwUpdate`, cheia VAPID și decizii de orchestrare. Componentele folosesc facade-ul pentru opt-in și expun doar starea/bannerul.
- SignalR rămâne canalul foreground; Web Push nu îl înlocuiește și eșecul push nu trebuie să anuleze notificarea persistată sau livrarea SignalR.

## Data Model

**New EF Entity (`FitApp.Api/Models/Entities/PushSubscription.cs`)**

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

`Endpoint` are index unic. Relația `User (1) -> PushSubscription (many)` folosește `DeleteBehavior.Cascade`, astfel încât ștergerea utilizatorului elimină toate endpointurile sale. Migrarea se numește `AddPushSubscriptions`, se generează prin EF CLI și nu se editează manual.

**DTOs (`FitApp.Api/Models/DTOs/PushNotificationDtos.cs`)**

```csharp
public sealed record PushSubscriptionRequest(
    string Endpoint,
    PushSubscriptionKeysRequest Keys);

public sealed record PushSubscriptionKeysRequest(
    string P256dh,
    string Auth);

public sealed record DeletePushSubscriptionRequest(string Endpoint);
```

Toate câmpurile sunt obligatorii și au limite explicite rezonabile. Nu există DTO care conține `UserId`; acesta vine numai din claim-ul JWT. Răspunsurile de succes sunt fără corp (`204`).

**TypeScript interfaces (`fit-app/src/app/core/models/push-notification.model.ts`)**

```typescript
export interface PushSubscriptionRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface DeletePushSubscriptionRequest {
  endpoint: string;
}

export type PushPermissionState =
  | 'unsupported'
  | 'ios-not-installed'
  | 'prompt'
  | 'granted'
  | 'denied';
```

## API Contract

| Method | Route | Auth | Request Body | Response |
|---|---|---|---|---|
| POST | `/api/notifications/push-subscribe` | Bearer | `PushSubscriptionRequest` | `204 No Content` |
| DELETE | `/api/notifications/push-subscribe` | Bearer | `DeletePushSubscriptionRequest` | `204 No Content` |

Contractul complet, validările și erorile sunt în `.claude/contracts/pwa-push-notifications.md`.

## Caching and Installability

- Manifest: `name` și `short_name` = `NovaFit`, `display` = `standalone`, `theme_color` = `#7C4DFF`, `background_color` = `#0D0D10`, `start_url` = `/`.
- Iconițe: 192x192, 512x512, o variantă maskable declarată cu `purpose: "maskable"` și Apple touch icon 180x180.
- `index.html`: link manifest, `theme-color`, `apple-mobile-web-app-capable=yes`, `apple-mobile-web-app-status-bar-style=black-translucent` și apple touch icon.
- Shell-ul mobil aplică `env(safe-area-inset-top)` și `env(safe-area-inset-bottom)` fără a dubla padding-ul componentelor interne.
- `provideServiceWorker('ngsw-worker.js', ...)` este activ numai în production, cu strategie de înregistrare stabilă (după stabilizare / maximum 30 secunde).
- App shell: `index.html`, bundle-uri, CSS, assets, fonturi Poppins și iconițe sunt prefetch.
- Data group: `/api/dashboard/**`, `/api/daily/**`, `/api/users/me`, numai GET, `freshness`, timeout 3 secunde, maxAge 1 oră, maxSize 50.
- Absența `/api/auth/**` și `/hubs/**` din data groups este mecanismul de excludere. SignalR/WebSocket nu are fallback cache.

### Authenticated-cache safety invariant

Dashboard, daily și profile sunt date private, iar cache-ul Angular SW nu trebuie tratat ca fiind izolat per JWT. La logout sau schimbarea contului pe același browser, frontend-ul trebuie să elimine cache-urile PWA de date înainte de a permite noii sesiuni și să reîncarce aplicația. Dacă această invalidare nu poate fi implementată și testată robust fără a depinde de nume interne de cache Angular, `/api/daily/**` și `/api/users/me` se elimină din `dataGroups`; confidențialitatea are prioritate față de fallback-ul offline. Nu se afișează date cache-uite pe ecranele guest/auth.

**Implementation hardening (2026-07-21):** Angular Service Worker nu oferă izolare per JWT și invalidarea robustă nu poate fi demonstrată fără dependență de numele interne ale cache-urilor. În implementarea Faza 1 au fost eliminate toate `dataGroups` API, inclusiv dashboard; rămâne doar caching-ul app shell/assets. Această abatere intenționată de la network-first prioritizează confidențialitatea la logout și schimbarea contului.

## Web Push Payload

Payloadul este minim și generic:

```json
{
  "notification": {
    "title": "NovaFit",
    "body": "Ai o notificare nouă.",
    "data": { "type": "comment", "url": "/social/posts/123" }
  }
}
```

Sunt permise numai tipul, text generic și deep link intern validat. Sunt interzise BMI, greutate, calorii, obiective, conținut de mesaje, email, tokenuri sau alte date de sănătate/personale. Deep link-urile se limitează la rute interne cunoscute; fallback `/social/notifications`.

## Frontend Architecture

- Service nou: `core/services/pwa-update.service.ts` — ascultă `VERSION_READY`, deschide snackbar, `activateUpdate()` și reload la acțiunea utilizatorului.
- Service nou: `core/services/push-notification.service.ts` — feature detection, stare permisiune, `SwPush.requestSubscription()` și conversia subscription-ului; nu face HTTP.
- API service: extinderea `api/notification.service.ts` — `subscribeToPush(request)` și `unsubscribeFromPush(request)`.
- Facade: extinderea `core/facade/notification.facade.ts` — `requestPushOptIn()`, `unsubscribeFromPush()`, semnale pentru suport/permisiune/loading/error și orchestrarea API.
- Bootstrap: serviciul de update este inițializat o singură dată în rădăcina aplicației.
- UI: banner discret, dismissible, oferit după primul daily check-in; nu solicită browser permission la load. Stilurile snackbar/banner folosesc exclusiv design tokens.

## Backend Architecture

- `IPushNotificationService` / `PushNotificationService`: stocare, ștergere, fan-out și cleanup.
- `NotificationService.CreateAndPushAsync`: după logica existentă de persistență + SignalR, solicită livrare Web Push best-effort pentru like/comment/follow/DM.
- Configurație `Vapid:PublicKey`, `Vapid:PrivateKey`, `Vapid:Subject`; startup validează valorile în production. `Subject` este `mailto:` sau URL HTTPS.
- Citirile subscription-urilor folosesc `AsNoTracking()`. Operațiile de cleanup sunt idempotente.
- Nu se loghează endpointul complet, cheile subscription sau payloaduri sensibile.

## Instructions for @dotnet-developer

1. Adaugă entitatea, navigarea pe `User`, `DbSet`, indexul unic și cascade delete; generează migrarea `AddPushSubscriptions`.
2. Adaugă DTO-uri validate și cele două acțiuni în controllerul existent, folosind numai `sub` din JWT.
3. Instalează `WebPush`, configurează options + validare VAPID și înregistrează serviciul în DI.
4. Extinde fluxul existent fără a schimba semantica SignalR. Izolează erorile per subscription; șterge endpointurile la 404/410.
5. Folosește `AsNoTracking()` la fan-out, cancellation tokens unde se pot propaga și payload generic conform acestui ADR.
6. Adaugă teste pentru auth, ownership, upsert idempotent, multiple device-uri, cleanup 404/410 și absența metricilor în payload.

## Instructions for @angular-developer

1. Rulează setup-ul `@angular/pwa`, apoi aliniază manifestul, assets și `ngsw-config.json` exact cu ADR-ul; verifică outputul production, nu doar sursele.
2. Adaugă metadata iOS, iconița 180 și safe-area pe shell-urile mobile relevante.
3. Implementează serviciile update/push și extinde API service + notification facade; componentele nu apelează servicii API sau `SwPush` direct.
4. Adaugă cheia publică VAPID în ambele environments/configurația de deploy. Nicio cheie privată în frontend.
5. Leagă bannerul opt-in de evenimentul de succes al primului daily check-in și păstrează dismiss-ul local; tratează toate stările nesuportate fără toast de eroare.
6. Testează cache safety la logout/schimbarea contului. Dacă invalidarea sigură nu este demonstrată, aplică fallback-ul din secțiunea de securitate și raportează abaterea.

## Instructions for @uiux-designer

- Specifică bannerul opt-in și snackbar-ul de update în dark glassmorphism, cu touch targets de minimum 48px, focus vizibil și design tokens existente.
- Include instrucțiune iOS: utilizatorul trebuie să instaleze aplicația pe Home Screen înainte ca push să fie disponibil.

## iOS Limitations

- Web Push funcționează numai pentru web apps instalate pe Home Screen pe iOS/iPadOS 16.4+ și numai după un gest explicit de permisiune.
- `display: standalone` elimină bara Safari numai când aplicația este lansată din iconița instalată. După modificarea manifestului/meta tagurilor, versiunea veche trebuie ștearsă și re-adăugată pe Home Screen.
- Nu implementăm Background Sync în faza 1; iOS nu oferă suport fiabil pentru acest flux. Operațiile create offline nu sunt puse automat în coadă.
- Lifecycle-ul service worker-ului și livrarea push sunt controlate de OS; livrarea nu este garantată și nu poate fi folosită pentru alerte critice.

## Consequences & Trade-offs

- Câștigăm instalare, app shell rapid, update controlat și notificări cu aplicația închisă, reutilizând infrastructura de notificări.
- Acceptăm două canale de livrare și livrare push best-effort; utilizatorul poate vedea SignalR în foreground și notificarea OS, deci frontend-ul trebuie să evite dublarea vizuală când aplicația este activă.
- Persistăm endpointuri și chei publice de subscription, care sunt identificatori sensibili și necesită acces strict/log redaction.
- Network-first păstrează date proaspete, dar timeoutul de 3 secunde poate servi date vechi. UI-ul trebuie să indice când prezintă fallback offline dacă acest lucru poate fi detectat.
- Cache-ul endpointurilor autentificate este riscul principal de confidențialitate pe device-uri partajate; release-ul este blocat până la testarea invariantului de mai sus.

## Verification / Definition of Done

- Production output conține manifestul, iconițele, `ngsw.json` și `ngsw-worker.js`; toate sunt servite 200 cu MIME corect.
- Lighthouse raportează aplicația instalabilă și fără erori de manifest.
- Auth și hub routes nu apar în cache; flow-ul de update funcționează end-to-end.
- După ștergere + reinstalare pe Home Screen, iOS pornește standalone și respectă safe-area.
- Push de test ajunge cu aplicația închisă pe Android/desktop și pe iOS instalat.
- Buildurile și testele ambelor layere sunt curate; review-ul confirmă JWT-only ownership și lipsa metricilor de sănătate din payload.
