# Refactorizare: Navigatie Mobile Unificata NovaFit

## Data: 2026-06-22
## Status: IMPLEMENTAT
## Scop: Un singur bottom-nav + top-bar pe mobile, social integrat ca sectiune

---

## Arhitectura curenta vs. propusa

### ACUM (2 shell-uri separate):
```
app.component
  ├── [app-top-bar]      ← conditii: mobile + nu /social + nu /login etc.
  ├── <router-outlet>
  │     ├── home-page       (page-wrapper + header + footer)
  │     ├── dashboard-page  (page-wrapper + header + footer)
  │     ├── plans           (page-wrapper + header + footer)
  │     ├── blog            (page-wrapper + header + footer)
  │     ├── user-profile    (page-wrapper + header + footer)
  │     ├── ai-assistant    (page-shell  + header)
  │     └── social-shell    ← AL DOILEA shell, propriul top-bar + bottom-nav
  │           ├── [social-top-bar]
  │           ├── [social-side-nav]
  │           ├── <router-outlet>  (feed, discover, chat, notif, profile)
  │           ├── [social-bottom-nav]
  │           └── [daily-panel]
  ├── [app-bottom-nav]   ← conditii: mobile + nu /social + nu /login etc.
  ├── [move-up]
  └── [ai-chat-fab]
```

### DUPA (un singur shell pe mobile):
```
app.component
  ├── [app-top-bar]      ← conditii: mobile + autentificat + nu /login,/register,/onboarding,/workout-session
  ├── <router-outlet>
  │     ├── home-page       (page-wrapper + header + footer)
  │     ├── dashboard-page  (page-wrapper + header + footer)
  │     ├── plans           (page-wrapper + header + footer)
  │     ├── blog            (page-wrapper + header + footer)
  │     ├── user-profile    (page-wrapper + header + footer)
  │     ├── ai-assistant    (page-shell  + header)
  │     └── social-shell    ← PASTREAZA pe DESKTOP (side-nav + daily-panel)
  │           ├── [social-side-nav]     ← doar desktop (>768px)
  │           ├── <router-outlet>       (feed, discover, chat, notif, profile)
  │           └── [daily-panel]         ← doar desktop
  ├── [app-bottom-nav]   ← conditii: mobile + autentificat + nu /login,/register,/onboarding,/workout-session
  ├── [move-up]
  └── [ai-chat-fab]
```

### Diferenta cheie:
- Pe mobile, social-shell NU mai randeza propriul top-bar si bottom-nav
- App-level bottom-nav si top-bar sunt MEREU vizibile (inclusiv pe /social/**)
- Social-shell ramane ca wrapper pt desktop (side-nav, daily-panel)
- Social top-tabs (Feed|Discover|Chat|Alerts) se adauga in zona de continut social

---

## Plan de implementare (10 pasi)

### Pas 1: Restructurare bottom-nav tabs

**Inainte:**
```
[Home] [Dashboard] [Plans] [Social] [Profile]
```

**Dupa:**
```
[Dashboard] [Plans] [Social] [Profile] [More]
```

| Pozitie | Icon | Label | Ruta | Rationale |
|---------|------|-------|------|-----------|
| 1 | `dashboard` | Dashboard | `/user-dashboard` | Actiune zilnica #1 |
| 2 | `fitness_center` | Plans | `/plans` | Actiune zilnica #2 |
| 3 | `group` | Social | `/social` | Hub social |
| 4 | `person` | Profile | `/user-profile` | Profil + setari |
| 5 | `more_horiz` | More | (bottom sheet) | Blog, AI, Home, Logout |

**Fisier:** `shared/components/bottom-nav/app-bottom-nav.component.*`

---

### Pas 2: Creare "More" bottom sheet

Noul component: `shared/components/more-sheet/more-sheet.component.*`

Items:
```
[smart_toy]   AI Assistant    → /ai-assistant
[article]     Blog            → /blog
[home]        Home            → /
─────────────────────────────────
[logout]      Log Out         → logout()
```

Stilizare: Refoloseste `mat-bottom-sheet` cu panelClass existent.

---

### Pas 3: Scoate social din route-exclusions

**Inainte (app.component.ts):**
```ts
const excluded = ['/social', '/onboarding', '/workout-session', '/login', '/register'];
```

**Dupa:**
```ts
const excluded = ['/onboarding', '/workout-session', '/login', '/register'];
```

Efectul: app-top-bar + app-bottom-nav sunt vizibile si pe `/social/**`.

---

### Pas 4: Social shell — scoate top-bar si bottom-nav pe mobile

**social-shell.component.html — inainte:**
```html
@if (isMobile()) { <app-social-top-bar /> }
...
@if (isMobile()) { <app-social-bottom-nav ... /> }
```

**Dupa:** Sterge ambele blocuri. Pe mobile, nav-ul vine de la app.component.

Side-nav ramane doar pe desktop (>768px). Daily-panel ramine pe desktop.

---

### Pas 5: Social shell — ajustare CSS mobile padding

**social-shell.component.css — inainte:**
```css
@media (max-width: 768px) {
  .social-content {
    padding-top: calc(var(--nav-height) + env(safe-area-inset-top));
    padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom));
  }
}
```

Ramane IDENTIC — top-bar si bottom-nav din app.component sunt fixed,
deci social-content tot trebuie padding.

---

### Pas 6: Creare social-top-tabs component

Noul component: `features/social/components/social-top-tabs/social-top-tabs.component.*`

Scrollable tabs row care apare la TOP-ul zonei de continut social (sub app-top-bar, in content area).

```html
<div class="social-top-tabs">
  <a routerLink="/social"
     routerLinkActive="active"
     [routerLinkActiveOptions]="{ exact: true }"
     class="social-top-tab">
    Feed
  </a>
  <a routerLink="/social/discover"
     routerLinkActive="active"
     class="social-top-tab">
    Discover
  </a>
  <a routerLink="/social/chat"
     routerLinkActive="active"
     class="social-top-tab">
    Chat
    @if (unreadMessages > 0) {
      <span class="tab-badge">{{ unreadMessages > 99 ? '99+' : unreadMessages }}</span>
    }
  </a>
  <a routerLink="/social/notifications"
     routerLinkActive="active"
     class="social-top-tab">
    Alerts
    @if (unreadNotifications > 0) {
      <span class="tab-badge">{{ unreadNotifications > 99 ? '99+' : unreadNotifications }}</span>
    }
  </a>
</div>
```

Vizibilitate: DOAR pe mobile (<=768px). Pe desktop, side-nav exista deja.
Se randeaza in social-shell, sub content padding area.

---

### Pas 7: App top-bar — adauga "New Post" pe rute social

Cand user-ul e pe `/social/**`, top-bar-ul arata un buton "+" (new post):

```html
@if (isSocialRoute()) {
  <button class="app-topbar-create" (click)="openCreatePost()" aria-label="New post">
    <mat-icon>add</mat-icon>
  </button>
}
```

Asta inlocuieste functionalitatea din social-top-bar drawer (New Post).

---

### Pas 8: Badges pe Social tab in bottom-nav

Social tab-ul din bottom-nav arata un badge combinat (notifications + messages):

```html
<a routerLink="/social" ...>
  <mat-icon>group</mat-icon>
  @if (totalUnread() > 0) {
    <span class="app-bottomnav-badge">{{ totalUnread() > 99 ? '99+' : totalUnread() }}</span>
  }
  <span class="app-bottomnav-label">Social</span>
</a>
```

`totalUnread = notifFacade.unreadCount() + chatFacade.unreadConversationsCount()`

---

### Pas 9: Cleanup social top-bar usage on mobile

Nu stergem componentele social-top-bar si social-bottom-nav — raman pt compatibilitate.
Dar pe mobile nu se mai randeaza (social-shell le conditioneaza cu `@if (!isMobile())`
pentru side-nav deja — facem la fel sau le scoatem complet din mobile rendering).

---

### Pas 10: Ajustare FAB-uri

- AI Chat FAB: nu mai are nevoie de clasa `fab--social` separata
  (bottom-nav e mereu aceeasi inaltime, inclusiv pe social)
- Daily-panel FAB: ramane pozitionat deasupra bottom-nav-ului unificat

---

## Impactul pe desktop

### ZERO schimbari pe desktop (>768px):
- Header-ul desktop ramane identic
- Footer-ul desktop ramane identic
- Social shell desktop: side-nav + daily-panel — neatinse
- Bottom-nav si top-bar nu se randeaza pe desktop

### Motive:
- Desktop are spatiu suficient pt header complet cu toate link-urile
- Side-nav social pe desktop e superior ca UX (user profile, badges inline, etc.)
- Footer desktop are informatii utile (legal, contact, social links)

---

## Diagrama flux user pe mobile (dupa refactorizare)

```
LOGIN → Dashboard
         │
    [Dashboard]  [Plans]  [Social]  [Profile]  [More]
         │          │         │          │         │
         │          │         │          │     Bottom Sheet:
     /dashboard  /plans   /social   /profile   AI, Blog,
         │          │         │          │      Home, Logout
         │          │         │          │
         │          │    ┌────┴────┐    │
         │          │    │ TOP TABS│    │
         │          │    ├─────────┤    │
         │          │    │Feed     │    │
         │          │    │Discover │    │
         │          │    │Chat (3) │    │
         │          │    │Alerts(5)│    │
         │          │    └─────────┘    │
         │          │         │          │
    Tap orice tab → navigatie instantanee
    Bottom nav ramane MEREU vizibil
    Top bar ramane MEREU vizibil (NovaFit brand)
```

---

## Fisiere afectate

### Modificate:
| Fisier | Schimbare |
|--------|-----------|
| `app.component.ts` | Scoate `/social` din excluded routes, inject NotifFacade + ChatFacade |
| `app-bottom-nav.component.html` | 5 tab-uri noi + badge pe Social |
| `app-bottom-nav.component.ts` | Inject facades pt badge counts |
| `app-bottom-nav.component.css` | Stil badge (refolosit din social-bottom-nav) |
| `app-top-bar.component.html` | Adauga buton "+" pe rute social |
| `app-top-bar.component.ts` | Inject Router, detectie ruta social, openCreatePost() |
| `social-shell.component.html` | Scoate social-top-bar si social-bottom-nav pe mobile |
| `social-shell.component.ts` | Cleanup (optional: scoate social-top-bar/bottom-nav din imports daca nu se mai folosesc) |

### Create noi:
| Fisier | Scop |
|--------|------|
| `shared/components/more-sheet/more-sheet.component.ts` | "More" bottom sheet |
| `shared/components/more-sheet/more-sheet.component.html` | Template more sheet |
| `shared/components/more-sheet/more-sheet.component.css` | Stiluri more sheet |
| `features/social/components/social-top-tabs/social-top-tabs.component.ts` | Top tabs social |
| `features/social/components/social-top-tabs/social-top-tabs.component.html` | Template top tabs |
| `features/social/components/social-top-tabs/social-top-tabs.component.css` | Stiluri top tabs |

### Neatinse:
- Toate paginile de continut social (feed, discover, chat, notifications, profile)
- Social side-nav (desktop only)
- Daily panel
- Toate paginile non-social
- Header desktop, footer desktop
- Rutele din app.routes.ts
- Backend-ul

---

## Guest bottom-nav (neautentificat)

Ramane separat:
```
[Home] [Blog] [Login] [Sign Up]
```

---

## Ordinea de implementare recomandata

```
1. Creare more-sheet component
2. Refactor app-bottom-nav (5 tab-uri noi + badge + More trigger)
3. Scoate /social din excluded in app.component.ts
4. Creare social-top-tabs component  
5. Integreaza social-top-tabs in social-shell (mobile only)
6. Scoate social-top-bar + social-bottom-nav din social-shell pe mobile
7. Adauga "+" button in app-top-bar pe rute social
8. Cleanup FAB positioning
9. Test complet pe mobile
```
