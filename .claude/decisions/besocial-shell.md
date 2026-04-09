# ADR: beSocial Shell - Routing Architecture and Layout Structure

**Status:** DRAFT
**Author:** @tech-architect
**Date:** 2026-04-06

---

## Context

FitApp is adding a social feature (beSocial) that requires its own distinct layout - a social-media style shell with sidebar navigation, bottom nav on mobile, and its own top bar. This layout is fundamentally different from the existing FitApp chrome (header + footer pattern).

The existing FitApp architecture places header and footer manually inside each feature component template (not in app.component.html). This is a critical observation: there is no global layout wrapper to hide. Social routes simply do not include those components.

The key architectural decision is how to structure the social shell as a parallel layout system that coexists cleanly with the existing FitApp pages.

---

## Decision

### 1. Header/Footer Hiding - Not Needed (Option D: No-Op)

**Analysis of the three proposed options:**

- **Option A (Router events + signal in app.component):** Unnecessary. app.component.html is just a router-outlet + move-up component. There is nothing to conditionally hide at the app level.
- **Option B (Route-level layout wrappers):** Partially relevant - we DO want a layout shell for social routes, but not to hide the FitApp header/footer.
- **Option C (CSS-based hiding):** Rejected as stated.

**Actual decision:** Since each feature component manually includes `<app-header>` and `<app-footer>` in its own template, the social shell components simply will not import or render them. No changes to app.component or existing feature components are required.

The `SocialShellComponent` acts as the layout wrapper for all `/social` child routes, providing its own navigation chrome (sidebar, top bar, bottom nav) instead of the FitApp header/footer. This is the cleanest approach - zero coupling to the existing layout pattern.

### 2. Routing Structure - Parent Shell with Lazy Children

The `/social` route uses `SocialShellComponent` as an eagerly-loaded layout wrapper (it defines the shell structure). All child routes are lazy-loaded.

```typescript
// In app.routes.ts - add BEFORE the wildcard redirect
{
  path: 'social',
  component: SocialShellComponent,  // NOT lazy - it is the layout shell
  canActivate: [AuthGuard],
  children: [
    {
      path: '',
      loadComponent: () =>
        import('./features/social/feed/social-feed.component')
        .then(m => m.SocialFeedComponent)
    },
    {
      path: 'discover',
      loadComponent: () =>
        import('./features/social/discover/discover.component')
        .then(m => m.DiscoverComponent)
    },
    {
      path: 'post/:id',
      loadComponent: () =>
        import('./features/social/post-detail/post-detail.component')
        .then(m => m.PostDetailComponent)
    },
    {
      path: 'profile/:userId',
      loadComponent: () =>
        import('./features/social/social-profile/social-profile.component')
        .then(m => m.SocialProfileComponent)
    },
    {
      path: 'chat',
      loadComponent: () =>
        import('./features/social/chat/conversation-list.component')
        .then(m => m.ConversationListComponent)
    },
    {
      path: 'chat/:id',
      loadComponent: () =>
        import('./features/social/chat/conversation-detail.component')
        .then(m => m.ConversationDetailComponent)
    },
    {
      path: 'notifications',
      loadComponent: () =>
        import('./features/social/notifications/notifications-page.component')
        .then(m => m.NotificationsPageComponent)
    }
  ]
}
```

**Why SocialShellComponent is NOT lazy:** It is the layout frame that wraps every social child route. If it were lazy, every navigation within `/social/*` would still need it loaded - making lazy loading pointless and adding a flash of empty content on first load. The shell is small (just structural HTML + nav components), so the bundle cost is negligible.

**Why AuthGuard is on the parent:** All social features require authentication. Placing the guard on the parent route means child routes inherit it automatically - no need to repeat `canActivate` on each child.

### 3. Where to Place the beSocial Entry Button

Add a `routerLink="/social"` link in two places:

**A. In the existing FitApp header (desktop nav + mobile drawer):**
- Desktop: Add after the AI Assistant link, visible only when authenticated
- Mobile drawer: Add in the mob-drawer-links section, same auth condition

```html
<!-- Desktop nav, after AI Assistant link -->
<a *ngIf="accountFacade.authUser()" class="hdr-link" routerLink="/social"
   [class.active]="navService.isActive('/social')">
  <mat-icon>group</mat-icon><span>beSocial</span>
</a>

<!-- Mobile drawer, after AI Assistant link -->
<a *ngIf="accountFacade.authUser()" class="mob-link" routerLink="/social"
   (click)="closeMobileNav()" [class.active]="navService.isActive('/social')">
  <mat-icon>group</mat-icon><span>beSocial</span>
</a>
```

**B. NavigationService.isActive adjustment:** The current `isActive()` does exact string matching. For the `/social` route, it should also match when on any `/social/*` child route. The angular-developer should add an `isActivePrefix(prefix: string)` method to NavigationService, or use `startsWith` in the header template binding. This is a minor enhancement, not blocking.

No entry point in the footer - the footer is informational, not navigational.

---

## Clean Architecture Boundaries

- **SocialShellComponent responsibility:** Layout structure only - renders sidebar, top bar, bottom nav, and a `<router-outlet>` for children. No business logic, no HTTP calls.
- **Social nav components (SideNav, TopBar, BottomNav):** Pure presentation. Receive data via inputs or inject facades for badge counts. No HTTP calls.
- **Facade responsibility:** Stub facades expose signals for unread counts. When backend exists, they will call API services.
- **What stays out of components:** HTTP calls, business logic, direct store manipulation.
- **What stays out of the shell:** Page-specific content - that belongs in lazy child components.

---

## Component Tree

### Layout Shell

**File:** `fit-app/src/app/features/social/social-shell.component.ts` (+ .html, .css)

Responsibilities:
- Renders SocialSideNavComponent (desktop, left, 240px fixed)
- Renders SocialTopBarComponent (mobile, top, 52px fixed)
- Renders SocialBottomNavComponent (mobile, bottom, 56px fixed)
- Contains `<router-outlet>` for child route content
- Manages responsive breakpoint via a signal (`isMobile = signal(false)`) using BreakpointObserver from CDK
- No header, no footer from FitApp

**Template structure:**
```html
<div class="social-shell">
  <!-- Desktop sidebar -->
  @if (!isMobile()) {
    <app-social-side-nav
      [unreadNotifications]="notificationsFacade.unreadCount()"
      [unreadChats]="chatFacade.unreadConversationsCount()"
    />
  }

  <!-- Mobile top bar -->
  @if (isMobile()) {
    <app-social-top-bar />
  }

  <!-- Main content area -->
  <main class="social-content">
    <router-outlet />
  </main>

  <!-- Mobile bottom nav -->
  @if (isMobile()) {
    <app-social-bottom-nav
      [unreadNotifications]="notificationsFacade.unreadCount()"
      [unreadChats]="chatFacade.unreadConversationsCount()"
    />
  }
</div>
```

### Navigation Components

**File:** `fit-app/src/app/features/social/components/social-side-nav.component.ts` (+ .html, .css)

- 240px fixed-width left sidebar
- Logo/brand area at top with beSocial branding and a Back to FitApp link (`routerLink="/"`)
- Nav items: Feed (`/social`), Discover (`/social/discover`), Chat (`/social/chat`), Notifications (`/social/notifications`), Profile (`/social/profile/:myUserId`)
- Badge indicators on Chat and Notifications using `@Input() unreadNotifications` and `@Input() unreadChats`
- Active route highlighting via `routerLinkActive`

**File:** `fit-app/src/app/features/social/components/social-top-bar.component.ts` (+ .html, .css)

- 52px fixed top bar for mobile only
- beSocial branding on left
- Back to FitApp icon button on right (`routerLink="/"`)
- Current page title (optional - can derive from route)

**File:** `fit-app/src/app/features/social/components/social-bottom-nav.component.ts` (+ .html, .css)

- 56px fixed bottom bar for mobile only
- 5 icon tabs: Feed, Discover, Chat (with badge), Notifications (with badge), Profile
- Uses `routerLink` + `routerLinkActive` for each tab
- `@Input() unreadNotifications` and `@Input() unreadChats` for badge counts

### Placeholder Child Route Components

Each is a minimal standalone component with a centered heading showing the route name. They exist so routing works end-to-end.

| Component | File Path | Route |
|-----------|-----------|-------|
| SocialFeedComponent | `fit-app/src/app/features/social/feed/social-feed.component.ts` | `/social` |
| DiscoverComponent | `fit-app/src/app/features/social/discover/discover.component.ts` | `/social/discover` |
| PostDetailComponent | `fit-app/src/app/features/social/post-detail/post-detail.component.ts` | `/social/post/:id` |
| SocialProfileComponent | `fit-app/src/app/features/social/social-profile/social-profile.component.ts` | `/social/profile/:userId` |
| ConversationListComponent | `fit-app/src/app/features/social/chat/conversation-list.component.ts` | `/social/chat` |
| ConversationDetailComponent | `fit-app/src/app/features/social/chat/conversation-detail.component.ts` | `/social/chat/:id` |
| NotificationsPageComponent | `fit-app/src/app/features/social/notifications/notifications-page.component.ts` | `/social/notifications` |

Each placeholder should display:
```html
<div class="social-placeholder">
  <mat-icon>[relevant-icon]</mat-icon>
  <h2>[Page Name]</h2>
  <p>Coming soon</p>
</div>
```

---

## Stub Facades

Since there is no social backend yet, create stub facades that expose placeholder signals. When the backend is built, these facades will be wired to real API services.

**File:** `fit-app/src/app/core/facade/social-notifications.facade.ts`
```typescript
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SocialNotificationsFacade {
  /** Placeholder - will be replaced with real API call */
  public unreadCount = signal(0);
}
```

**File:** `fit-app/src/app/core/facade/social-chat.facade.ts`
```typescript
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SocialChatFacade {
  /** Placeholder - will be replaced with real API call */
  public unreadConversationsCount = signal(0);
}
```

These follow the existing facade pattern (Injectable, providedIn root, signal-based state).

---

## Responsive Breakpoint Strategy

Use Angular CDK `BreakpointObserver` (already available via Angular Material dependency) in SocialShellComponent:

```typescript
private breakpointObserver = inject(BreakpointObserver);
public isMobile = signal(false);

constructor() {
  this.breakpointObserver
    .observe(['(max-width: 768px)'])
    .pipe(takeUntilDestroyed())
    .subscribe(result => this.isMobile.set(result.matches));
}
```

Breakpoint: 768px. Below = mobile (top bar + bottom nav). Above = desktop (sidebar).

---

## Instructions for @angular-developer

### Checklist - implement in this order:

1. **Create stub facades** (2 files):
   - [ ] `fit-app/src/app/core/facade/social-notifications.facade.ts`
   - [ ] `fit-app/src/app/core/facade/social-chat.facade.ts`

2. **Create SocialShellComponent** (layout wrapper):
   - [ ] `fit-app/src/app/features/social/social-shell.component.ts`
   - [ ] `fit-app/src/app/features/social/social-shell.component.html`
   - [ ] `fit-app/src/app/features/social/social-shell.component.css`
   - Must inject `SocialNotificationsFacade`, `SocialChatFacade`
   - Must use `BreakpointObserver` with `takeUntilDestroyed()` for `isMobile` signal
   - Must contain `<router-outlet>` for children
   - Use `@if` control flow (Angular 19), not `*ngIf`

3. **Create navigation components** (3 components):
   - [ ] `fit-app/src/app/features/social/components/social-side-nav.component.ts` (+ .html, .css)
   - [ ] `fit-app/src/app/features/social/components/social-top-bar.component.ts` (+ .html, .css)
   - [ ] `fit-app/src/app/features/social/components/social-bottom-nav.component.ts` (+ .html, .css)
   - All standalone components
   - Side nav and bottom nav accept `@Input()` for unread counts
   - Use `routerLink` and `routerLinkActive` for navigation
   - Side nav includes Back to FitApp link (`routerLink="/"`)
   - Import `MaterialModule` for mat-icon usage

4. **Create placeholder child components** (7 components):
   - [ ] `fit-app/src/app/features/social/feed/social-feed.component.ts`
   - [ ] `fit-app/src/app/features/social/discover/discover.component.ts`
   - [ ] `fit-app/src/app/features/social/post-detail/post-detail.component.ts`
   - [ ] `fit-app/src/app/features/social/social-profile/social-profile.component.ts`
   - [ ] `fit-app/src/app/features/social/chat/conversation-list.component.ts`
   - [ ] `fit-app/src/app/features/social/chat/conversation-detail.component.ts`
   - [ ] `fit-app/src/app/features/social/notifications/notifications-page.component.ts`
   - Each is a minimal standalone component with placeholder content
   - Each uses inline template (no separate .html file needed for placeholders)

5. **Update app.routes.ts:**
   - [ ] Import `SocialShellComponent` (eager, direct import - NOT lazy)
   - [ ] `AuthGuard` is already imported
   - [ ] Add the full `/social` route tree as specified above
   - [ ] Place it BEFORE the wildcard redirect

6. **Update HeaderComponent to add beSocial entry:**
   - [ ] Add beSocial link in desktop nav (after AI Assistant), auth-gated
   - [ ] Add beSocial link in mobile drawer (after AI Assistant), auth-gated
   - [ ] Use mat-icon "group" and label "beSocial"

### Styling notes:
- Follow the design system: dark theme (`#0d0d10`), glassmorphism, purple primary (`#7c4dff`)
- The social shell should feel like a distinct app-within-an-app
- Sidebar: dark glass surface, nav items with hover/active states
- Bottom nav: dark glass, icon + label for each tab
- Placeholder components: centered content, muted text, relevant icon
- Detailed styling specs will come from @uiux-designer - implement structural CSS first

---

## Instructions for @uiux-designer

### Checklist - spec the following:

- [ ] **SocialShellComponent layout:** Grid/flex structure for sidebar + content area, responsive breakpoint behavior
- [ ] **SocialSideNavComponent:** 240px sidebar design - brand area, nav items, active states, badge indicators, Back to FitApp link
- [ ] **SocialTopBarComponent:** 52px mobile top bar - branding, actions
- [ ] **SocialBottomNavComponent:** 56px mobile bottom nav - 5 tabs with icons, badges, active indicator
- [ ] **Transition from FitApp to social:** What happens visually when user clicks beSocial in the header? (Page transition, no modal)
- [ ] **Placeholder page design:** Minimal but on-brand coming soon pages

Write the spec to `.claude/design-specs/besocial-shell.md`.

---

## Instructions for @dotnet-developer

No backend changes required for the shell ADR. The social backend (posts, follows, notifications, etc.) will be defined in a separate ADR once the shell is implemented and validated.

---

## Consequences and Trade-offs

### What we gain:
- **Clean separation:** Social layout is fully independent from FitApp chrome - no conditional rendering, no shared layout state
- **Extensibility:** Adding new social child routes requires only a new lazy route entry and component
- **Performance:** Shell is eager (instant navigation within social), children are lazy (code-split per page)
- **Mobile-first:** Responsive breakpoint gives mobile users a native-app-like bottom nav experience
- **Incremental delivery:** Placeholder components let us ship the shell and routing immediately while backend and real UI are developed in parallel

### What we accept:
- **SocialShellComponent is not lazy:** Adds a small amount to the initial social bundle, but avoids layout flash and is structurally correct for a layout wrapper
- **Duplicate nav patterns:** Social has its own nav separate from FitApp header - this is intentional (different UX contexts) but means maintaining two navigation systems
- **Stub facades return hardcoded zeros:** No real notification/chat data until the backend is built. Facades are the correct place to wire this up later
- **No deep-link from social back to specific FitApp pages:** Just a Back to FitApp link to /. This is sufficient for now

### What must NOT happen:
- Components must NOT call API services directly - always through facades
- SocialShellComponent must NOT import HeaderComponent or FooterComponent
- Child placeholder components must NOT implement real features - they are stubs only
- No new RxJS subscriptions without `takeUntilDestroyed()` cleanup
