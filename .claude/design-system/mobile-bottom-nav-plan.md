# Design System Update: Mobile Bottom Navigation (Main App)

## Context & Problem

**Current state:** Main NovaFit pages (Home, Dashboard, Blog, Plans, Profile, AI Assistant) use a hamburger drawer menu on mobile (<=768px). This requires 2 taps to reach any destination, hides core navigation, and violates the thumb-zone ergonomics essential for a fitness app used at the gym.

**Social module already has** a proven bottom-nav pattern (`SocialBottomNavComponent`) that works well. We need to extend this pattern to the main app shell.

**Reference:** Apple HIG "Tab Bars" — "A tab bar provides quick access to the top-level sections of your app. It stays visible across all screens." Material 3 "Navigation Bar" — "Navigation bars let people switch between UI views on smaller devices."

---

## Plan Overview

### Phase 1: Design System Token & Component Spec
### Phase 2: Create `AppBottomNavComponent`
### Phase 3: Create `AppTopBarComponent` (mobile header replacement)
### Phase 4: Modify Header to hide on mobile (<=768px)
### Phase 5: Hide Footer on mobile (<=768px)
### Phase 6: Adjust page content padding

---

## Phase 1: New Design Tokens

### Tokens Added / Modified

| Token | Value | Usage |
|-------|-------|-------|
| `--nav-height` | `56px` | Bottom nav and top bar height reference |
| `--nav-bg` | `rgba(13, 13, 16, 0.95)` | Shared translucent nav background |
| `--nav-blur` | `20px` | Backdrop blur for nav bars |
| `--nav-border` | `rgba(255, 255, 255, 0.07)` | Shared nav border color |
| `--nav-icon-inactive` | `rgba(255, 255, 255, 0.4)` | Inactive tab icon/label color |
| `--nav-icon-hover` | `rgba(255, 255, 255, 0.7)` | Hovered tab icon/label color |
| `--nav-label-size` | `9px` | Bottom nav label font-size |
| `--topbar-height` | `56px` | Mobile top bar height |

**Rationale:** These tokens are extracted from the existing `social-bottom-nav` and `social-top-bar` patterns so both modules share the same visual language. The social module should be migrated to consume these tokens too (Phase 7, optional).

---

## Phase 2: Component Spec — `AppBottomNavComponent`

### Purpose
Persistent bottom navigation bar for the main NovaFit app on mobile devices (<=768px). Provides one-tap access to the 5 core destinations. Replaces the hamburger drawer navigation.

### Nav Items (5 tabs — Material 3 maximum)

| Position | Icon | Label | Route | Auth Required | Notes |
|----------|------|-------|-------|---------------|-------|
| 1 | `home` | Home | `/` | No | Landing page |
| 2 | `dashboard` | Dashboard | `/user-dashboard` | Yes | Daily tracker |
| 3 | `fitness_center` | Plans | `/plans` | Yes | Workout plans |
| 4 | `group` | Social | `/social` | Yes | beSocial entry |
| 5 | `person` | Profile | `/user-profile` | Yes | User profile |

**For unauthenticated users (guest), show 3 tabs:**

| Position | Icon | Label | Route |
|----------|------|-------|-------|
| 1 | `home` | Home | `/` |
| 2 | `article` | Blog | `/blog` |
| 3 | `login` | Login | `/login` |

### Structure
```html
<nav class="app-bottomnav" aria-label="Main navigation">
  <!-- Authenticated: 5 tabs -->
  @if (isAuthenticated()) {
    <a routerLink="/"
       routerLinkActive="app-bottomnav-tab--active"
       [routerLinkActiveOptions]="{ exact: true }"
       class="app-bottomnav-tab"
       aria-label="Home">
      <mat-icon>home</mat-icon>
      <span class="app-bottomnav-label">Home</span>
    </a>

    <a routerLink="/user-dashboard"
       routerLinkActive="app-bottomnav-tab--active"
       class="app-bottomnav-tab"
       aria-label="Dashboard">
      <mat-icon>dashboard</mat-icon>
      <span class="app-bottomnav-label">Dashboard</span>
    </a>

    <a routerLink="/plans"
       routerLinkActive="app-bottomnav-tab--active"
       class="app-bottomnav-tab"
       aria-label="Plans">
      <mat-icon>fitness_center</mat-icon>
      <span class="app-bottomnav-label">Plans</span>
    </a>

    <a routerLink="/social"
       routerLinkActive="app-bottomnav-tab--active"
       class="app-bottomnav-tab app-bottomnav-tab--social"
       aria-label="Social">
      <mat-icon>group</mat-icon>
      <span class="app-bottomnav-label">Social</span>
    </a>

    <a routerLink="/user-profile"
       routerLinkActive="app-bottomnav-tab--active"
       class="app-bottomnav-tab"
       aria-label="Profile">
      <mat-icon>person</mat-icon>
      <span class="app-bottomnav-label">Profile</span>
    </a>
  } @else {
    <!-- Guest: 3 tabs, centered -->
    <a routerLink="/"
       routerLinkActive="app-bottomnav-tab--active"
       [routerLinkActiveOptions]="{ exact: true }"
       class="app-bottomnav-tab"
       aria-label="Home">
      <mat-icon>home</mat-icon>
      <span class="app-bottomnav-label">Home</span>
    </a>

    <a routerLink="/blog"
       routerLinkActive="app-bottomnav-tab--active"
       class="app-bottomnav-tab"
       aria-label="Blog">
      <mat-icon>article</mat-icon>
      <span class="app-bottomnav-label">Blog</span>
    </a>

    <a routerLink="/login"
       routerLinkActive="app-bottomnav-tab--active"
       class="app-bottomnav-tab"
       aria-label="Login">
      <mat-icon>login</mat-icon>
      <span class="app-bottomnav-label">Login</span>
    </a>
  }
</nav>
```

### Token References
- Background: `var(--nav-bg)` = `rgba(13, 13, 16, 0.95)`
- Backdrop filter: `blur(var(--nav-blur))` = `blur(20px)`
- Border top: `1px solid var(--nav-border)`
- Icon inactive: `var(--nav-icon-inactive)`
- Icon hover: `var(--nav-icon-hover)`
- Icon active: `var(--primary)`
- Label active: `var(--primary)`
- Active dot: `var(--primary)`
- Safe area: `env(safe-area-inset-bottom, 0px)`

### States

| State | Visual Change | CSS |
|-------|---------------|-----|
| Default | Icons + labels at 40% white opacity | `color: var(--nav-icon-inactive)` |
| Hover | Icons + labels at 70% white opacity | `color: var(--nav-icon-hover); transition: color 0.18s` |
| Active/Pressed | Scale down slightly | `transform: scale(0.92); transition: transform 0.1s ease` |
| Active (route match) | Purple icon + label, dot indicator above icon | `color: var(--primary); ::before dot` |
| Disabled | N/A — tabs are always enabled (auth-gated tabs are hidden instead) | — |
| Loading | N/A — navigation is instant; page content handles loading states | — |
| Empty | N/A — always has at least 3 tabs | — |
| Error | N/A — static component, no data fetching | — |

### Sizing (8px grid)
- Height: `56px` (on 8px grid: 7 * 8px)
- Total height with safe area: `calc(56px + env(safe-area-inset-bottom))`
- Tab touch target: `56px tall x flex:1 wide` (well above 48px minimum)
- Icon size: `24px` (3 * 8px)
- Label font-size: `10px`, font-weight: `600`
- Gap (icon to label): `2px` (micro)
- Active dot: `4px` diameter, positioned `8px` from top

### Motion
- Tab color transition: `0.18s ease` (micro interaction)
- Active press: `transform 0.1s ease` (micro)
- No enter/exit animation — component is always mounted

### Visibility Rules
- **Show:** only on screens <=768px (matches existing social breakpoint)
- **Hide:** on screens >768px (desktop header is visible)
- **Hide:** when inside `/social/**` routes (social has its own bottom-nav)
- **Hide:** when inside `/onboarding/**` routes
- **Hide:** when inside `/workout-session/**` routes (full-screen focus)
- **Hide:** on `/login` and `/register` routes

### Do / Don't
- DO: Match exactly the visual language of `social-bottom-nav` (same heights, blur, border)
- DO: Use `env(safe-area-inset-bottom)` for notched devices
- DO: Set `z-index: 100` (same as header, below social nav's 900)
- DON'T: Add more than 5 tabs (Material 3 limit)
- DON'T: Show both app-bottom-nav AND social-bottom-nav simultaneously
- DON'T: Animate tab switches — route transitions are handled by router

---

## Phase 3: Component Spec — `AppTopBarComponent` (Mobile Header)

### Purpose
Simplified mobile top bar replacing the full header. Shows logo + user avatar/actions. Pairs with `AppBottomNavComponent`.

### Structure
```html
<header class="app-topbar" aria-label="NovaFit top bar">
  <a class="app-topbar-brand" routerLink="/">
    <img src="/assets/fitapp-wb.png" alt="NovaFit" class="app-topbar-logo" />
    <span class="app-topbar-wordmark">Nova<span class="app-topbar-wordmark-accent">Fit</span></span>
  </a>

  <div class="app-topbar-actions">
    @if (isAuthenticated()) {
      <app-streak-badge />
      <button class="app-topbar-avatar" [matMenuTriggerFor]="userMenu" aria-label="User menu">
        <img [src]="avatarUrl()" alt="avatar" />
      </button>
      <mat-menu #userMenu="matMenu" xPosition="before" panelClass="user-menu-dark">
        <button mat-menu-item (click)="navigateToAi()">
          <mat-icon>smart_toy</mat-icon><span>AI Assistant</span>
        </button>
        <button mat-menu-item (click)="navigateToBlog()">
          <mat-icon>article</mat-icon><span>Blog</span>
        </button>
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="logout()">
          <mat-icon color="warn">logout</mat-icon><span>Logout</span>
        </button>
      </mat-menu>
    } @else {
      <a class="app-topbar-cta" routerLink="/register">Get Started</a>
    }
  </div>
</header>
```

### Token References
- Background: `var(--nav-bg)`
- Backdrop filter: `blur(var(--nav-blur))`
- Border bottom: `1px solid var(--nav-border)`
- Logo text: `var(--white)`
- Logo accent: `rgba(255, 255, 255, 0.5)`
- CTA button: `var(--primary)` background

### States

| State | Visual Change | CSS |
|-------|---------------|-----|
| Default | Semi-transparent bar with blur | `background: var(--nav-bg)` |
| Hover (avatar) | Subtle ring | `box-shadow: 0 0 0 2px var(--primary-glow)` |
| Active/Pressed (avatar) | Scale down | `transform: scale(0.95)` |
| Disabled | N/A | — |
| Loading | N/A | — |
| Empty | N/A | — |
| Error | N/A | — |
| Success | N/A | — |

### Sizing (8px grid)
- Height: `56px` (7 * 8px)
- Padding horizontal: `16px` (2 * 8px)
- Logo image: `24px` (3 * 8px)
- Avatar: `32px` (4 * 8px)
- Avatar touch target: 48px via padding
- CTA button padding: `8px 16px`

### Motion
- Avatar hover ring: `0.15s ease`
- Menu open: handled by Material `mat-menu`

### Visibility Rules
- Same as `AppBottomNavComponent` — only on mobile (<=768px)
- Hidden on social routes, onboarding, workout sessions, login/register

---

## Phase 4: Header Modifications

### What Changes
The existing `HeaderComponent` needs a CSS-only change:

```css
/* Hide full header on mobile — replaced by app-topbar + app-bottomnav */
@media (max-width: 768px) {
  :host {
    display: none !important;
  }
}
```

**Remove from header.component.css:**
- All mobile drawer CSS (`.mob-*` classes)
- Mobile toggle button CSS (`.hdr-toggle`)
- Mobile backdrop CSS (`.mob-backdrop`)
- All `@media (max-width: 768px)` responsive overrides

**Remove from header.component.html:**
- Mobile toggle button
- Mobile backdrop
- Mobile drawer (`mob-drawer`)

**Remove from header.component.ts:**
- `mobileNavOpen` signal
- `toggleMobileNav()` method
- `closeMobileNav()` method
- `@HostListener('document:keydown.escape')` handler

This is a **clean separation**: header = desktop only, bottom-nav + top-bar = mobile only.

---

## Phase 5: Footer Modifications

### What Changes
Hide footer on mobile screens where bottom-nav is present:

```css
/* In footer.component.css */
@media (max-width: 768px) {
  .app-footer {
    display: none;
  }
}
```

**Rationale:** The footer's content (links, contact, legal) is not useful during gym sessions. It clutters the mobile experience. Users can access these from desktop. Blog/Plans links are in the bottom nav.

---

## Phase 6: Page Content Padding Adjustments

Every page that shows header+footer needs padding adjustments for the new nav bars:

### Affected Pages & Required Changes

| Page | File | Change |
|------|------|--------|
| Home | `home-page.component.css` | Add `padding-bottom: calc(56px + env(safe-area-inset-bottom) + 16px)` on mobile |
| Dashboard | `dashboard-page.component.css` | Same bottom padding |
| Blog | `blog.component.css` | Same bottom padding |
| Blog Post Detail | `blog-post-detail.component.css` | Same bottom padding |
| Plans (Workouts) | `workouts.component.css` | Same bottom padding |
| User Profile | `user-page.component.css` | Same bottom padding |
| AI Assistant | `openai.component.css` | Same bottom padding |

### CSS Pattern (each page)
```css
@media (max-width: 768px) {
  :host {
    padding-top: calc(56px + env(safe-area-inset-top, 0px));
    padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 16px);
  }
}
```

---

## Phase 7: Where to Mount the Components

### Option A (Recommended): Mount in `app.component`

```html
<!-- app.component.html -->
@if (showMainNav()) {
  <app-top-bar />
}

<router-outlet></router-outlet>

@if (showMainNav()) {
  <app-bottom-nav />
}

<app-move-up></app-move-up>
<app-ai-chat-fab></app-ai-chat-fab>
```

The `showMainNav()` signal would be computed from:
1. `BreakpointObserver` — only <=768px
2. Current route — NOT in `/social/**`, `/onboarding/**`, `/workout-session/**`, `/login`, `/register`

### Logic in app.component.ts
```typescript
private readonly bp = inject(BreakpointObserver);
private readonly router = inject(Router);

readonly isMobile = signal(false);
readonly currentRoute = signal('/');

readonly showMainNav = computed(() => {
  const route = this.currentRoute();
  const excluded = ['/social', '/onboarding', '/workout-session', '/login', '/register'];
  const isExcluded = excluded.some(prefix => route.startsWith(prefix));
  return this.isMobile() && !isExcluded;
});

constructor() {
  this.bp.observe(['(max-width: 768px)'])
    .pipe(takeUntilDestroyed())
    .subscribe(r => this.isMobile.set(r.matches));

  this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    takeUntilDestroyed()
  ).subscribe((e: NavigationEnd) => this.currentRoute.set(e.urlAfterRedirects));
}
```

---

## Implementation Order for @angular-developer

```
Step 1: Add nav tokens to styles.css
Step 2: Create AppBottomNavComponent (shared/components/bottom-nav/)
Step 3: Create AppTopBarComponent (shared/components/top-bar/)
Step 4: Mount both in app.component.html with route-aware visibility
Step 5: Add @media (max-width: 768px) { display: none } to header
Step 6: Add @media (max-width: 768px) { display: none } to footer
Step 7: Remove all mobile drawer code from header (cleanup)
Step 8: Add bottom padding to all affected page components
Step 9: Test route exclusions (social, onboarding, workout-session)
Step 10: Verify AI chat FAB positioning doesn't overlap bottom-nav
```

---

## Visual Consistency Checklist

| Property | Social Bottom Nav | App Bottom Nav | Match? |
|----------|-------------------|----------------|--------|
| Height | 56px | 56px | Yes |
| Background | rgba(13,13,16,0.95) | rgba(13,13,16,0.95) | Yes |
| Blur | 20px | 20px | Yes |
| Border top | 1px solid rgba(255,255,255,0.07) | 1px solid rgba(255,255,255,0.07) | Yes |
| Icon size | 20px | 24px | Slightly larger for main nav (fewer items in guest mode) |
| Label size | 9px | 10px | Slightly larger — main nav labels are more important |
| Active color | var(--primary) | var(--primary) | Yes |
| Active indicator | 4px dot above icon | 4px dot above icon | Yes |
| Badge style | accent bg, 9px, 999px radius | N/A for now (future: notification count on Social tab) | — |
| z-index | 900 | 100 | Different layers — app nav is below social nav |
| Safe area | env(safe-area-inset-bottom) | env(safe-area-inset-bottom) | Yes |

---

## Edge Cases to Handle

1. **User navigates from main app to social:** App bottom-nav hides, social bottom-nav shows (no flash)
2. **User logs in on mobile:** Guest bottom-nav (3 tabs) transitions to auth bottom-nav (5 tabs)
3. **User logs out on mobile:** Auth bottom-nav transitions to guest bottom-nav
4. **Deep link into social from external:** App bottom-nav should NOT briefly flash
5. **AI Chat FAB overlap:** FAB needs `bottom: calc(56px + env(safe-area-inset-bottom) + 16px)` on mobile
6. **MoveUp button overlap:** Same repositioning as AI Chat FAB
7. **Keyboard open on mobile:** Bottom nav should remain fixed (not pushed up by keyboard)
8. **Landscape orientation:** Bottom nav still 56px, no changes needed

---

## Migration Path (optional, Phase 8)

After app bottom-nav is stable, migrate social bottom-nav to use shared tokens:
- Replace hardcoded values in `social-bottom-nav.component.css` with `var(--nav-*)` tokens
- Replace hardcoded values in `social-top-bar.component.css` with `var(--nav-*)` tokens
- This ensures any future nav token updates propagate to both modules

---

## Success Criteria

1. All 5 core destinations reachable in 1 tap on mobile
2. No content hidden behind bottom-nav (padding verified on all pages)
3. Smooth transition when entering/leaving social routes
4. Guest users see appropriate subset of tabs
5. AI Chat FAB and MoveUp button don't overlap bottom-nav
6. No horizontal scroll caused by bottom-nav
7. Touch targets >= 48px on all interactive elements
8. All values on 8px grid
9. All colors via CSS custom properties
10. Motion budget respected (max 0.18s for nav interactions)
