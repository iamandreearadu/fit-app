# UI Spec: beSocial Shell

**Author:** @uiux-designer
**Date:** 2026-04-06
**Status:** READY FOR IMPLEMENTATION
**Implements:** `.claude/decisions/besocial-shell.md`

---

## Overview

beSocial is a social layer within FitApp. It runs as a full-page shell at `/social/*` with its own navigation chrome — no FitApp header or footer. The shell must feel like a distinct product identity while clearly belonging to the same dark, glass-morphism visual language. The beSocial brand uses the existing `--primary` / `--accent` gradient as its signature color — the same purple-to-pink axis that runs through all FitApp interactive states.

---

## User Story

As an authenticated FitApp user, I want to enter a dedicated social space and navigate between social features so that I can connect with other users without losing the familiar FitApp visual language.

---

## UX Flow

1. User is on any FitApp page (home, dashboard, workouts, etc.)
2. User sees "beSocial" button in the FitApp header nav → clicks it
3. Angular router navigates to `/social` — full page transition using `slideUp` animation
4. `SocialShellComponent` renders: on desktop the sidebar appears left, content area right; on mobile the top bar appears fixed at top and bottom nav appears fixed at bottom
5. Child route (`SocialFeedComponent`) loads inside the `<router-outlet>` with a `slideUp` entrance
6. User navigates between social sections via sidebar (desktop) or bottom nav (mobile)
7. User clicks "Back to FitApp" → navigates to `/`, FitApp header/footer returns naturally

---

## Component 1 — beSocial Entry Button (FitApp Header)

### User Story
As an authenticated user browsing FitApp, I want a clearly branded entry point into beSocial so that I can find and enter the social section immediately.

### Layout

**Desktop (> 768px)**
- Placed inside `.hdr-nav` after the existing "AI Assistant" `<a class="hdr-link">` link
- Pill-shaped gradient button — visually distinct from the flat `.hdr-link` items
- Auth-gated: only renders when `accountFacade.authUser()` is truthy

**Mobile (≤ 768px)**
- `.hdr-nav` is hidden at this breakpoint; the button must also be placed inside `.mob-drawer-links` as the last nav item before the footer
- Renders as a full-width `.mob-link` variant with gradient left-border accent
- Same auth condition applies

### Visual Spec

**Desktop button — new class `.hdr-link-social`**
```css
.hdr-link-social {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;                              /* pill shape */
  font-size: 13px;
  font-weight: 700;
  color: var(--white);
  text-decoration: none;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border: none;
  white-space: nowrap;
  transition: opacity 0.18s, transform 0.15s;
  letter-spacing: 0.01em;
}

.hdr-link-social mat-icon {
  font-size: 16px;
  width: 16px;
  height: 16px;
}

.hdr-link-social:hover {
  opacity: 0.88;
  transform: translateY(-1px);
}

/* Active state — user is inside /social/* */
.hdr-link-social.active {
  box-shadow: 0 0 0 2px rgba(124, 77, 255, 0.4);
}
```

At the 1100px breakpoint (icon-only nav), the button keeps its pill shape and label visible because it is a distinct CTA, not a plain nav link. The `.hdr-link span { display: none }` rule at 1100px applies only to `.hdr-link` — this class is `.hdr-link-social` and must NOT be hidden.

**Mobile drawer item — new class `.mob-link-social`**
```css
.mob-link-social {
  /* inherits all .mob-link base styles */
  background: linear-gradient(135deg,
    rgba(124, 77, 255, 0.12),
    rgba(255, 64, 129, 0.08)
  );
  border-color: rgba(124, 77, 255, 0.3);
  color: var(--white);
  font-weight: 700;
}

.mob-link-social mat-icon {
  /* gradient text approximation — use primary color for icon */
  color: var(--primary);
}

.mob-link-social:hover {
  background: linear-gradient(135deg,
    rgba(124, 77, 255, 0.2),
    rgba(255, 64, 129, 0.14)
  );
  border-color: rgba(124, 77, 255, 0.5);
  transform: translateX(3px);
}

.mob-link-social.active {
  border-color: rgba(124, 77, 255, 0.45);
}
```

**beSocial wordmark inline text inside the button/link**
The label text renders as: `<span class="social-btn-label">be<span class="social-btn-gradient">Social</span></span>`

```css
.social-btn-label {
  color: var(--white);
  font-weight: 700;
}

/* On the desktop pill, gradient background already colors everything white.
   On the mobile drawer item, replicate the gradient on the text: */
.mob-link-social .social-btn-gradient {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

**Icon:** `mat-icon` — `group` (matches ADR spec)

### Interactions
- Hover: `opacity 0.88, translateY(-1px)`, `0.15s ease`
- Active route: glowing ring `box-shadow: 0 0 0 2px rgba(124,77,255,0.4)`
- Click: Angular router navigates to `/social`

### Angular Material Components to Use
- None — this is an `<a>` anchor element with `routerLink` and `routerLinkActive`
- `mat-icon` for the icon

### CSS Classes
- New: `.hdr-link-social` (add to `header.component.css`)
- New: `.mob-link-social` (add to `header.component.css`)
- New: `.social-btn-label`, `.social-btn-gradient` (add to `header.component.css`)
- Existing: `mat-icon`

### Responsiveness
- Desktop (> 1100px): pill button with icon + "beSocial" label, in `.hdr-nav`
- Tablet (1100px–768px): pill button — retains both icon AND label (special exception from the icon-only rule at this breakpoint; the gradient pill must remain identifiable)
- Mobile (≤ 768px): hidden from `.hdr-nav` (which itself is hidden); visible as `.mob-link-social` in `.mob-drawer-links`

### Accessibility
- `aria-label="Enter beSocial"` on desktop link
- `aria-current="page"` applied by `routerLinkActive` on active state
- Touch target: the pill is at least 36px tall at 7px padding + 13px font; on mobile the `.mob-link` base gives 48px height — meets the 48px minimum touch target requirement

---

## Component 2 — SocialShellComponent Layout

### User Story
As a user navigating to `/social`, I want a dedicated layout shell that replaces the FitApp chrome so that the social experience feels focused and distinct.

### Layout

**Desktop (> 768px) — flex row**
```
┌─────────────────────────────────────────────┐
│  [SocialSideNav 240px fixed]  [social-content flex:1] │
└─────────────────────────────────────────────┘
```

- `display: flex; flex-direction: row`
- `min-height: 100vh`
- `background: var(--surface)`
- Sidebar: `width: 240px; flex-shrink: 0; position: sticky; top: 0; height: 100vh; overflow-y: auto`
- Content area: `flex: 1; min-width: 0`

**Mobile (≤ 768px) — flex column with fixed chrome**
```
┌──────────────────────┐
│  [TopBar 52px fixed] │  ← z-index 50
│  [social-content]    │  ← padding-top 52px, padding-bottom 56px
│  [BottomNav 56px]    │  ← z-index 50, fixed
└──────────────────────┘
```

- `.social-shell` on mobile: `display: block; position: relative`
- `.social-content` on mobile: `padding-top: 52px; padding-bottom: 56px; min-height: 100vh`

### Visual Spec

**Container — `.social-shell`**
```css
.social-shell {
  display: flex;
  flex-direction: row;
  min-height: 100vh;
  background: var(--surface);
  animation: slideUp 0.35s ease-out;
}
```

**Content area — `.social-content`**
```css
.social-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;           /* center child pages horizontally */
  padding: 32px 24px;
  overflow-y: auto;
}
```

Child route pages are rendered inside `.social-content`. Pages should use a max-width of 680px and `width: 100%` to stay centered on wide screens. This constraint is enforced per-page, not at the shell level, so chat and full-width pages can override it.

### CSS Classes
- New: `.social-shell` (in `social-shell.component.css`)
- New: `.social-content` (in `social-shell.component.css`)

### Responsiveness
- Desktop (> 768px): flex row — sidebar left, content right
- Mobile (≤ 768px): block; top bar + content + bottom nav fixed chrome pattern

---

## Component 3 — SocialSideNavComponent

### User Story
As a desktop user inside beSocial, I want a persistent sidebar with clear navigation, my mini-profile, and branding so that I can move between sections instantly.

### Layout

**Structure (top to bottom):**
1. Brand area — beSocial wordmark (36px tall block, 28px padding-top)
2. User mini-profile row — avatar 36px + display name
3. Divider line
4. Nav items (5 items) — Feed, Discover, Chat, Notifications, Profile
5. Flex spacer (flex: 1)
6. "New Post" gradient button
7. "Back to FitApp" ghost link

**Dimensions:**
- Width: 240px, fixed/sticky
- Height: 100vh
- Padding: `24px 16px`
- Border-right: `1px solid rgba(255,255,255,0.06)`
- Background: `rgba(255,255,255,0.015)` (slightly lighter than surface for depth separation)
- No horizontal scroll

### Visual Spec

**Container — `.social-sidenav`**
```css
.social-sidenav {
  width: 240px;
  height: 100vh;
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 24px 16px;
  background: rgba(255, 255, 255, 0.015);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  overflow-y: auto;
  scrollbar-width: none;
  flex-shrink: 0;
}
.social-sidenav::-webkit-scrollbar {
  display: none;
}
```

**Brand area — `.social-sidenav-brand`**
```css
.social-sidenav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 6px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 8px;
  flex-shrink: 0;
}
```

beSocial wordmark typography:
- "be" — `font-size: 22px; font-weight: 800; color: var(--white)`
- "Social" — `font-size: 22px; font-weight: 800; background: linear-gradient(135deg, var(--primary), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text`
- Both spans inside one `<span class="social-wordmark">`:
```css
.social-wordmark {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.3px;
  line-height: 1;
}
.social-wordmark-gradient {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

Brand icon: a 32px icon container to the left of the wordmark
```css
.social-sidenav-brand-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.social-sidenav-brand-icon mat-icon {
  font-size: 18px;
  width: 18px;
  height: 18px;
  color: var(--white);
}
```
Icon name: `group`

**User mini-profile — `.social-sidenav-user`**
```css
.social-sidenav-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 6px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 8px;
  flex-shrink: 0;
}

.social-sidenav-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
  border: 1.5px solid rgba(124, 77, 255, 0.3);
  flex-shrink: 0;
}
.social-sidenav-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.social-sidenav-user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--white);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
```

**Nav items — `.social-nav-item`**

Each nav item is an `<a>` with `routerLink` and `routerLinkActive="social-nav-item--active"`.

```css
.social-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  transition: background 0.18s, color 0.18s, transform 0.15s;
  position: relative;
  min-height: 48px;                   /* touch target compliance */
}

.social-nav-item mat-icon {
  font-size: 20px;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  transition: color 0.18s;
}

.social-nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--white);
  transform: translateX(3px);
}

.social-nav-item--active {
  background: rgba(124, 77, 255, 0.12);
  color: var(--white);
  font-weight: 700;
  border: 1px solid rgba(124, 77, 255, 0.22);
}

.social-nav-item--active mat-icon {
  color: var(--primary);
}
```

**Badge on nav items — `.social-nav-badge`**
Displayed inside the nav item, pushed to the right using `margin-left: auto`.
```css
.social-nav-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--white);
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}
```
Only render the badge element when count > 0 (use `@if (count > 0)` in template).

**Nav items list (in order):**

| Label | Icon | Route | Badge |
|---|---|---|---|
| Feed | `home` | `/social` (exact) | none |
| Discover | `explore` | `/social/discover` | none |
| Chat | `chat_bubble` | `/social/chat` | `unreadChats` input |
| Notifications | `notifications` | `/social/notifications` | `unreadNotifications` input |
| Profile | `person` | `/social/profile/:myUserId` | none |

**"New Post" button — `.social-new-post-btn`**
```css
.social-new-post-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  color: var(--white);
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border: none;
  cursor: pointer;
  transition: opacity 0.18s, transform 0.15s;
  letter-spacing: 0.02em;
  min-height: 48px;
  margin-top: 8px;
  flex-shrink: 0;
}
.social-new-post-btn mat-icon {
  font-size: 18px;
  width: 18px;
  height: 18px;
}
.social-new-post-btn:hover {
  opacity: 0.88;
  transform: translateY(-1px);
}
```
Icon: `add_circle_outline`. Label: "New Post".

**"Back to FitApp" link — `.social-back-link`**
```css
.social-back-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.35);
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, 0.07);
  transition: background 0.18s, color 0.18s, border-color 0.18s;
  margin-top: 8px;
  flex-shrink: 0;
  min-height: 48px;
}
.social-back-link mat-icon {
  font-size: 15px;
  width: 15px;
  height: 15px;
}
.social-back-link:hover {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.65);
  border-color: rgba(255, 255, 255, 0.12);
}
```
Icon: `arrow_back`. Label: "Back to FitApp". `routerLink="/"`.

**Full internal structure (template order):**
```
.social-sidenav
  .social-sidenav-brand
    .social-sidenav-brand-icon  [mat-icon: group]
    span.social-wordmark  be + span.social-wordmark-gradient Social
  .social-sidenav-user
    .social-sidenav-avatar  [img]
    span.social-sidenav-user-name  [displayName]
  a.social-nav-item × 5  [with badges where applicable]
  div style="flex:1"     [spacer]
  button.social-new-post-btn
  a.social-back-link
```

### States

**Loading (unread counts):** The badge simply shows `0` (from stub facade) — no skeleton needed since counts are computed synchronously from signals. When the real facade returns an observable, the badge will update reactively.

**No auth user:** Cannot occur — `AuthGuard` prevents reaching this route. No empty state needed.

### Interactions
- Nav item hover: `background rgba(255,255,255,0.05), color white, translateX(3px)`, `0.18s ease`
- Nav item active: `background rgba(124,77,255,0.12)`, `color white`, `border rgba(124,77,255,0.22)`
- New Post button hover: `opacity 0.88, translateY(-1px)`, `0.15s ease`
- Back to FitApp hover: border + color brighten, `0.18s`

### Angular Material Components to Use
- `mat-icon` for all icons

### CSS Classes
All new classes in `social-side-nav.component.css`:
- `.social-sidenav`
- `.social-sidenav-brand`
- `.social-sidenav-brand-icon`
- `.social-wordmark`
- `.social-wordmark-gradient`
- `.social-sidenav-user`
- `.social-sidenav-avatar`
- `.social-sidenav-user-name`
- `.social-nav-item`
- `.social-nav-item--active` (applied via `routerLinkActive`)
- `.social-nav-badge`
- `.social-new-post-btn`
- `.social-back-link`

### Responsiveness
This component is desktop-only. It is not rendered on mobile (controlled by `@if (!isMobile())` in the shell). No responsive rules needed inside the component itself.

### Accessibility
- `nav` element wrapping the five `.social-nav-item` links, `aria-label="beSocial navigation"`
- `routerLinkActive` adds `.social-nav-item--active`; add `aria-current="page"` binding: `[attr.aria-current]="isActiveRoute ? 'page' : null"`
- Badge: `aria-label="[count] unread"` on the `.social-nav-badge` span
- "Back to FitApp" `aria-label="Navigate back to FitApp"`
- All touch targets: 48px minimum height — enforced by `min-height: 48px` on nav items, the new post button, and the back link

---

## Component 4 — SocialTopBarComponent (Mobile)

### User Story
As a mobile user inside beSocial, I want a compact fixed top bar that shows the brand and a quick action so that I can orient myself and create a post without scrolling.

### Layout

**Structure (left → right):**
- Left: beSocial wordmark (icon + "beSocial" text)
- Center: flex spacer
- Right: "+" icon button (new post) + current page title (optional, derived from route, 13px, muted)

**Dimensions:**
- Height: 52px (fixed)
- Width: 100vw
- Position: `fixed; top: 0; left: 0; right: 0; z-index: 50`

### Visual Spec

**Container — `.social-topbar`**
```css
.social-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 52px;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: rgba(13, 13, 16, 0.92);    /* var(--surface) at 92% opacity */
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
```

**Wordmark left — `.social-topbar-brand`**
```css
.social-topbar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.social-topbar-brand-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  display: flex;
  align-items: center;
  justify-content: platformContent;
  flex-shrink: 0;
}
/* Correction — should be: */
.social-topbar-brand-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.social-topbar-brand-icon mat-icon {
  font-size: 16px;
  width: 16px;
  height: 16px;
  color: var(--white);
}

.social-topbar-wordmark {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: var(--white);
}
.social-topbar-wordmark-gradient {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

**Right actions — `.social-topbar-actions`**
```css
.social-topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
```

**New post button — `.social-topbar-new-btn`**
```css
.social-topbar-new-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
  flex-shrink: 0;
  /* Touch target padding via hit area */
  padding: 0;
}
.social-topbar-new-btn mat-icon {
  font-size: 20px;
  width: 20px;
  height: 20px;
  color: var(--white);
}
.social-topbar-new-btn:hover {
  opacity: 0.85;
  transform: scale(1.05);
}
```
Icon: `add`. `aria-label="Create new post"`.

The touch target for `.social-topbar-new-btn` is 36×36px visually but the tappable area should be padded to 48px. Achieve this with a transparent padding or use a wrapping element. Recommended pattern:
```css
.social-topbar-new-btn::before {
  content: '';
  position: absolute;
  inset: -6px;
}
.social-topbar-new-btn {
  position: relative;
}
```

### States
No data loading states. The top bar is purely structural/navigational.

### Interactions
- New post button: `opacity 0.85, scale(1.05)`, `0.15s ease` on hover; click triggers new post flow (to be specced in post creation feature)
- Brand tap: no action (user is already in /social)

### Angular Material Components to Use
- `mat-icon` only

### CSS Classes (new, in `social-top-bar.component.css`)
- `.social-topbar`
- `.social-topbar-brand`
- `.social-topbar-brand-icon`
- `.social-topbar-wordmark`
- `.social-topbar-wordmark-gradient`
- `.social-topbar-actions`
- `.social-topbar-new-btn`

### Responsiveness
Mobile-only component. Rendered only when `isMobile()` is true (≤ 768px). No internal responsive rules needed.

### Accessibility
- `header` element as root
- `aria-label="beSocial top bar"`
- New post button: `aria-label="Create new post"`
- Touch target: minimum 48×48px effective area via `::before` pseudo-element

---

## Component 5 — SocialBottomNavComponent (Mobile)

### User Story
As a mobile user inside beSocial, I want a persistent bottom navigation bar with clearly labeled tabs so that I can switch sections with one thumb tap from anywhere.

### Layout

**5 tabs (left → right):**
1. Feed (`home`, `/social`)
2. Discover (`explore`, `/social/discover`)
3. Post — center FAB circle (`add`, no route — triggers new post)
4. Notifications (`notifications`, `/social/notifications`) — badge
5. Profile (`person`, `/social/profile/:userId`)

**Dimensions:**
- Height: 56px
- Width: 100vw
- Position: `fixed; bottom: 0; left: 0; right: 0; z-index: 50`

### Visual Spec

**Container — `.social-bottomnav`**
```css
.social-bottomnav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 4px;
  background: rgba(13, 13, 16, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
```

**Standard tab — `.social-bottomnav-tab`**
```css
.social-bottomnav-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  flex: 1;
  height: 56px;          /* full height = full touch target */
  padding: 0 4px;
  text-decoration: none;
  cursor: pointer;
  position: relative;
  transition: transform 0.15s ease;
}

.social-bottomnav-tab mat-icon {
  font-size: 22px;
  width: 22px;
  height: 22px;
  color: rgba(255, 255, 255, 0.4);
  transition: color 0.18s;
}

.social-bottomnav-tab-label {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.03em;
  transition: color 0.18s;
  white-space: nowrap;
}

.social-bottomnav-tab:hover mat-icon,
.social-bottomnav-tab:hover .social-bottomnav-tab-label {
  color: rgba(255, 255, 255, 0.7);
}

/* Active state — applied via routerLinkActive */
.social-bottomnav-tab--active mat-icon {
  color: var(--primary);
}
.social-bottomnav-tab--active .social-bottomnav-tab-label {
  color: var(--primary);
  font-weight: 700;
}

/* Active indicator dot above icon */
.social-bottomnav-tab--active::before {
  content: '';
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--primary);
}
```

**Center FAB tab — Post — `.social-bottomnav-fab`**
The center tab is a gradient circle button, visually elevated above the bar.
```css
.social-bottomnav-fab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 56px;
  padding: 0 4px;
  cursor: pointer;
  background: transparent;
  border: none;
  position: relative;
}

.social-bottomnav-fab-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px var(--primary-glow);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  margin-bottom: -4px;    /* slight upward pop from the bar */
  transform: translateY(-4px);
}

.social-bottomnav-fab-circle mat-icon {
  font-size: 22px;
  width: 22px;
  height: 22px;
  color: var(--white);
}

.social-bottomnav-fab:hover .social-bottomnav-fab-circle {
  transform: translateY(-6px);
  box-shadow: 0 6px 20px var(--primary-glow);
}

.social-bottomnav-fab-label {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.03em;
  margin-top: 2px;
}
```
Icon: `add`. Label: "Post".

**Badge on Notifications tab — `.social-bottomnav-badge`**
```css
.social-bottomnav-badge {
  position: absolute;
  top: 8px;
  right: calc(50% - 18px);     /* offset right of the icon center */
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--white);
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--surface);
}
```
Only render when count > 0.

**Tab definitions:**

| Position | Label | Icon | Route | Special |
|---|---|---|---|---|
| 1 | Feed | `home` | `/social` exact | — |
| 2 | Discover | `explore` | `/social/discover` | — |
| 3 | Post | `add` | — | FAB circle button |
| 4 | Alerts | `notifications` | `/social/notifications` | badge |
| 5 | Me | `person` | `/social/profile/:userId` | — |

### States
No loading state. Badges default to `0` from stub facade. Badge element hidden when count is 0.

### Interactions
- Tab hover: icon/label `color rgba(255,255,255,0.7)`, `0.18s`
- Tab active: icon/label `color var(--primary)`, indicator dot above icon
- FAB hover: `translateY(-6px)`, deeper glow, `0.15s ease`
- FAB tap: triggers new post creation (placeholder: `console.log` for now; real handler in post creation feature)

### Angular Material Components to Use
- `mat-icon` only

### CSS Classes (new, in `social-bottom-nav.component.css`)
- `.social-bottomnav`
- `.social-bottomnav-tab`
- `.social-bottomnav-tab-label`
- `.social-bottomnav-tab--active` (applied via `routerLinkActive`)
- `.social-bottomnav-fab`
- `.social-bottomnav-fab-circle`
- `.social-bottomnav-fab-label`
- `.social-bottomnav-badge`

### Responsiveness
Mobile-only component. Rendered only when `isMobile()` is true (≤ 768px). No internal responsive rules needed. Safe area support for iPhone notch:
```css
.social-bottomnav {
  padding-bottom: env(safe-area-inset-bottom, 0px);
  height: calc(56px + env(safe-area-inset-bottom, 0px));
}
```

### Accessibility
- Root element: `nav`, `aria-label="beSocial bottom navigation"`
- Each `<a>` tab: `aria-label="[Label]"` + `[attr.aria-current]="isActive ? 'page' : null"`
- FAB `<button>`: `aria-label="Create new post"`, `type="button"`
- Badge: `aria-label="[count] unread notifications"` where count > 0
- Touch targets: all tabs are 56px tall × at least 64px wide (100vw / 5 items) — exceeds 48×48px minimum

---

## Component 6 — Placeholder Child Route Pages

### User Story
As a developer (and QA), I want every social route to render a consistent, on-brand placeholder so that routing end-to-end can be validated before real content is built.

### Layout

**Structure:**
- Centered vertically and horizontally within the content area
- Icon → page name heading → "Coming soon" subtext → "Back to Feed" link

**Container sizing:**
- `width: 100%; max-width: 480px; margin: 0 auto; padding: 40px 24px`
- Vertically centered: parent `.social-content` uses `align-items: center` — the placeholder just needs `text-align: center`

### Visual Spec

**Container — `.social-placeholder`**
```css
.social-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 24px 40px;
  text-align: center;
  animation: slideUp 0.35s ease-out;
  width: 100%;
  max-width: 480px;
}
```

**Icon container:**
```css
.social-placeholder-icon {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: rgba(124, 77, 255, 0.1);
  border: 1px solid rgba(124, 77, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}
.social-placeholder-icon mat-icon {
  font-size: 30px;
  width: 30px;
  height: 30px;
  color: rgba(124, 77, 255, 0.6);
}
```

**Page name heading:**
```css
.social-placeholder h2 {
  font-size: 22px;
  font-weight: 800;
  color: var(--white);
  margin: 0;
  letter-spacing: -0.3px;
}
```

**"Coming soon" subtext:**
```css
.social-placeholder p {
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.35);
  margin: 0;
}
```

**"Back to Feed" link:**
```css
.social-placeholder-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 9px 18px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  text-decoration: none;
  border: 1px solid rgba(124, 77, 255, 0.25);
  background: rgba(124, 77, 255, 0.08);
  transition: background 0.18s, border-color 0.18s;
  min-height: 48px;
}
.social-placeholder-back:hover {
  background: rgba(124, 77, 255, 0.15);
  border-color: rgba(124, 77, 255, 0.4);
}
.social-placeholder-back mat-icon {
  font-size: 16px;
  width: 16px;
  height: 16px;
}
```
`routerLink="/social"`. Icon: `arrow_back`. Label: "Back to Feed".

**Per-page icon and heading values:**

| Component | Page Heading | mat-icon |
|---|---|---|
| SocialFeedComponent | Feed | `dynamic_feed` |
| DiscoverComponent | Discover | `explore` |
| PostDetailComponent | Post | `article` |
| SocialProfileComponent | Profile | `person` |
| ConversationListComponent | Messages | `chat_bubble` |
| ConversationDetailComponent | Conversation | `forum` |
| NotificationsPageComponent | Notifications | `notifications` |

### States
Placeholder pages have no data, so there are no loading/empty/error states to specify. The component renders immediately on mount.

### Interactions
- `slideUp` entrance animation `0.35s ease-out` on the `.social-placeholder` container — reuses the global `slideUp` keyframe defined in `styles.css`
- "Back to Feed" hover: background + border intensify, `0.18s`

### Angular Material Components to Use
- `mat-icon`

### CSS Classes
All new classes defined inline in each placeholder component (no separate `.css` file needed for placeholders — use component-level styles or inline styles in the standalone component decorator `styles` array).
- `.social-placeholder`
- `.social-placeholder-icon`
- `.social-placeholder-back`

### Responsiveness
- No responsive rules needed. The `.social-content` parent handles padding. The placeholder is centered in all contexts.

### Accessibility
- `main` or `section` as root (whichever is appropriate for the page)
- `h2` for page name — consistent heading level since each placeholder is a child route under the shell
- "Back to Feed" link has descriptive text — no extra `aria-label` needed

---

## Visual Transition: FitApp → beSocial

When the user clicks the beSocial button in the FitApp header, Angular's router replaces the current page component with `SocialShellComponent`. No modal, no overlay — it is a direct route navigation.

**What happens:**
1. The FitApp page (e.g. dashboard with its own `<app-header>` and `<app-footer>`) unmounts
2. `SocialShellComponent` mounts — its `.social-shell` container has `animation: slideUp 0.35s ease-out` applied at the component level
3. The sidebar (desktop) or top bar + bottom nav (mobile) appear as part of the shell entrance
4. The default child route (`SocialFeedComponent`) mounts inside `<router-outlet>` with its own `slideUp` — staggered naturally because it loads after the shell

**Implementation note for @angular-developer:** The `slideUp` keyframe is already defined globally in `styles.css`. Apply it to `.social-shell` in `social-shell.component.css` and to `.social-placeholder` in the placeholder component styles. No new keyframe needed.

---

## New CSS Classes Summary

The following classes must be added/created by `@angular-developer`. Classes marked with a file path go in that component's stylesheet. Classes marked "header.component.css" are additions to the existing shared header stylesheet.

### `header.component.css` additions
- `.hdr-link-social` — gradient pill CTA in desktop nav
- `.mob-link-social` — gradient variant of mob-link for social entry
- `.social-btn-label` — "be" text styling
- `.social-btn-gradient` — "Social" gradient text on mobile drawer

### `social-shell.component.css`
- `.social-shell` — flex-row container, full-height, slideUp animation
- `.social-content` — flex-1 scrollable content area

### `social-side-nav.component.css`
- `.social-sidenav` — 240px sticky sidebar
- `.social-sidenav-brand` — brand area with divider
- `.social-sidenav-brand-icon` — 32px gradient icon container
- `.social-wordmark` — be + Social text block
- `.social-wordmark-gradient` — gradient text for "Social"
- `.social-sidenav-user` — mini-profile row
- `.social-sidenav-avatar` — 36px circle avatar
- `.social-sidenav-user-name` — truncated display name
- `.social-nav-item` — base nav link style (48px min-height)
- `.social-nav-item--active` — active route highlight
- `.social-nav-badge` — unread count pill
- `.social-new-post-btn` — gradient CTA (48px min-height)
- `.social-back-link` — ghost back link (48px min-height)

### `social-top-bar.component.css`
- `.social-topbar` — 52px fixed bar with blur backdrop
- `.social-topbar-brand` — left wordmark area
- `.social-topbar-brand-icon` — 28px gradient icon
- `.social-topbar-wordmark` — "beSocial" text
- `.social-topbar-wordmark-gradient` — gradient on "Social"
- `.social-topbar-actions` — right actions flex row
- `.social-topbar-new-btn` — 36px gradient add button

### `social-bottom-nav.component.css`
- `.social-bottomnav` — 56px fixed bar with blur backdrop + safe-area
- `.social-bottomnav-tab` — standard tab (full 56px height touch target)
- `.social-bottomnav-tab-label` — 10px label below icon
- `.social-bottomnav-tab--active` — active state class
- `.social-bottomnav-fab` — center post button wrapper
- `.social-bottomnav-fab-circle` — 44px gradient circle
- `.social-bottomnav-fab-label` — "Post" label
- `.social-bottomnav-badge` — absolute positioned badge

### Placeholder component inline styles
- `.social-placeholder`
- `.social-placeholder-icon`
- `.social-placeholder-back`

---

## Design Decisions and Rationale

**1. Gradient as brand identity for beSocial.**
The `linear-gradient(135deg, var(--primary), var(--accent))` is used consistently across the beSocial entry button, the sidebar brand icon, the "New Post" button, the top bar brand icon, and the FAB. This makes the gradient a recognizable beSocial signature without introducing new hex values.

**2. Sidebar background slightly lighter than surface.**
`rgba(255,255,255,0.015)` vs `var(--surface)` (`#0d0d10`). This creates a subtle depth separation so the sidebar reads as a distinct layer from the content area without being visually heavy. The 1px right border at `rgba(255,255,255,0.06)` provides a clean edge.

**3. Top bar and bottom nav use `backdrop-filter: blur()`.**
Consistent with the glass-morphism principle. When content scrolls under the bars, it blurs rather than appearing as a hard edge. The bars use `rgba(13,13,16,0.92)` / `rgba(13,13,16,0.95)` rather than a fully opaque surface so the effect is visible.

**4. FAB elevates above the bottom nav.**
The center "Post" tab uses `transform: translateY(-4px)` to pop the circle above the bar height, giving it visual prominence consistent with standard mobile FAB patterns. This is the primary action in the social context.

**5. No `.active` style on the beSocial header button when inside /social.**
Inside beSocial, the FitApp header is not visible — so the active state of the entry button is irrelevant. The `active` class and its `box-shadow` ring are defined as a precaution for edge cases (e.g., if a user is somehow on a FitApp page with a /social URL segment), but they will not be seen during normal use.

**6. Touch targets enforced at 48px minimum across all nav elements.**
FitApp is used at the gym. Bottom nav tabs are 56px tall (full bar height). Sidebar nav items have `min-height: 48px`. The back link and new post button also have `min-height: 48px`. No interactive element in the shell falls below the 48×48px minimum.
