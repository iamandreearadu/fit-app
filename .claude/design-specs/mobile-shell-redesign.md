# UI Spec: Global Mobile Shell Redesign
**Feature:** Unified Navigation Shell — NovaFit + beSocial  
**Author:** @uiux-designer  
**Date:** 2026-06-24  
**Status:** READY FOR IMPLEMENTATION  
**Implements:** [ADR: besocial-shell.md] + owner-requested unification

---

## User Story

As a NovaFit user who both tracks fitness and engages socially, I want a single coherent navigation that lets me move between my dashboard, my social feed, my messages, and my profile without feeling like I've left the app and entered a different one — because today "Back to NovaFit" in the social sidebar is an indictment, not a feature.

---

## STEP A — Current-State Audit

### What actually exists (read from source, not assumed)

#### Mobile global shell — `app.component.html`
The `AppComponent` IS the global shell. It renders:
```
@if (showMainNav()) { <app-top-bar /> }      ← only on mobile, non-excluded routes
<router-outlet>                               ← lazy-loads every feature
@if (showMainNav()) { <app-bottom-nav /> }    ← only on mobile
<app-ai-chat-fab [extraBottomOffset] />       ← global, authenticated, always
```
`showMainNav()` = `isMobile() && route NOT in ['/onboarding', '/workout-session', '/login', '/register']`.  
**This means the app already has a unified mobile shell. The problem is that it is incomplete.**

#### Existing `AppBottomNavComponent` — `shared/components/bottom-nav/`
5 hardcoded tabs. Tabs are all router links; no create action anywhere:
| # | Label | Route | Badge |
|---|---|---|---|
| 1 | Feed | `/social` | — |
| 2 | Discover | `/social/discover` | — |
| 3 | Dashboard | `/user-dashboard` | — |
| 4 | Alerts | `/social/notifications` | ✅ unread count |
| 5 | Messages | `/social/chat` | ✅ unread DM count |

Active state: color only (`var(--primary)`) + font-weight 700 + 3px dot indicator pseudo-element. Infrastructure is there; just needs the create slot.

#### Existing `AppTopBarComponent` — `shared/components/top-bar/`
```
LEFT                     CENTER (implicit)         RIGHT
Brand logo / Back btn    (nothing — just space)    [+ create (social only)] [StreakBadge] [Avatar → matMenu]
```
Avatar matMenu: Account → `/account`, AI Assistant → `/ai-assistant`, Blog → `/blog`, Logout.  
**Problems:** navigation items buried inside an icon-only menu; blog discoverable only by accident; no hamburger drawer; create button disappears on non-social routes.

#### `SocialShellComponent` — `features/social/social-shell.component.{ts,html,css}`
Desktop (`> 768px`): `[side-nav]` + `<router-outlet>` + `[daily-panel]`.  
Mobile (`< 768px`): `<router-outlet>` with `padding-top/bottom = var(--nav-height)` — it correctly defers to the global shell from `app.component`. No bottom-nav of its own on mobile.  
Has: reconnecting-banner (SignalR), daily-panel FAB at bottom-right (z-index 920), daily-panel backdrop.  
**The daily panel FAB competes with the AI chat FAB on mobile** — handled by `aiFabExtraOffset = 64` when on `/social` routes. This is fragile.

#### `SocialSideNavComponent` — `features/social/components/side-nav/`
Desktop-only (hidden at `< 768px` by the shell). Contains:
- "beSocial" brand wordmark
- User mini-profile → `/social/profile/me`
- Nav: Feed, Discover, Chat (badge), Notifications (badge), My Profile
- "New" post button (opens `CreateContentComponent`)
- "Log out" button
- **"Back to NovaFit" link → `/`**

The "Back to NovaFit" link is the most visible symptom of the split. It acknowledges the two worlds are separate. This must not survive the redesign.

#### Mobile shell reality for non-social routes on mobile
`/user-dashboard`, `/plans`, `/ai-assistant`, `/account`, `/blog` — on mobile, they get the global `app-top-bar` + `app-bottom-nav`. On desktop, they render as standalone components with no shell (the old `app-header` / `app-footer` components are still included inside each feature's template).

#### AI Chat FAB — `core/components/ai-chat-fab/`
- Fixed bottom-right: `right: 16px`, `bottom: calc(var(--nav-height) + inset + 16px + var(--extra-bottom-offset))` on mobile.
- `extraBottomOffset` input: currently 64px on `/social` routes to clear the daily-panel FAB.
- Z-index: 950 — above bottom-nav (1000 in mobile-fixes spec — **there is a known z-index conflict to resolve**).
- Hides on: login, register, onboarding.

#### What the social shell does well (preserve)
1. `--nav-height` CSS variable used consistently for offset calculations
2. Safe-area insets with `env(safe-area-inset-bottom)` on every fixed element
3. Reconnecting banner pattern (amber, spinner, top sticky — reuse globally)
4. `slideUp` entrance animation applied to `.social-content` (not the shell root — avoids fixed-child positioning bug)
5. Daily panel "Today" FAB pill style (well-executed glass pill design)
6. The mobile shell correctly delegates to global app.component chrome (no double-nav)
7. BreakpointObserver + Signal pattern for responsive layout

---

## STEP B — Competitor Mobile IA Analysis

> _Research drawn from known UX patterns of live apps. Palette/color output ignored — NovaFit tokens apply._

| App | Bottom nav items (n) | Primary action | Search placement | Notifications | DMs | Account/Settings |
|---|---|---|---|---|---|---|
| **Strava** | 5 | Center FAB — "Record" (accent red, 56px) | Explore tab | Top bar bell | None | "You" tab → gear |
| **MyFitnessPal** | 5 | "+" floating in content area | Top search bar | Top bar bell | None | "More" overflow tab → list |
| **Hevy** | 4 | "Start Workout" button in content | Within each tab | None | None | Profile tab |
| **MacroFactor** | 5 | Tab 1 is "Log" (log-first IA) | None | None | None | "More" overflow tab |
| **Instagram** | 5 | Center slot "+" (Create, gradient bg) | Search tab (tab 2) | Top bar bell | Top bar DM icon | Profile tab → hamburger → Settings |
| **Threads** | 5 | Center slot "+" (Create, gradient bg) | Search tab (tab 2) | Activity tab | None | Profile tab → gear |

**Convergent patterns:**
1. **4–5 items maximum** — cognitive load cuts off at 5 (Nielsen's 7±2 applies to nav).
2. **Center FAB or dedicated create tab** — the highest-frequency action is always the most reachable: center bottom, one thumb.
3. **Notifications and search in the top bar** — Instagram, Strava, MyFitnessPal all put the bell in the top bar to keep the bottom nav clean. Tabs are for destinations, not transient actions.
4. **Account/Settings never a primary bottom tab** — always Profile or overflow. Direct access to settings is rare; profile is frequent.
5. **DMs live in the top bar (Instagram) or a tab** depending on app social depth — NovaFit has real DMs with SignalR, so a bottom tab is justified.
6. **Overflow / More / Drawer** for secondary destinations (blog editorial, account settings, plans, premium upsell, logout).

---

## STEP C — Rationalizing the Owner's Proposal

### Owner's starting point
Bottom nav: Feed | Dashboard | Blog | Messages | Profile  
Top-right: Search, Notifications  
Top-left: Hamburger → drawer: Blog, Plans, Account, (misc)

### Critique and resolution

**① Blog appears in both bottom nav AND drawer — pick one.**

Blog is editorial long-form content authored by admins (`/blog`, public). It is not a task users repeat daily. It is discovery / inspiration content, equivalent to Instagram's "Shop" tab which eventually gets retired. Placing it in the bottom nav wastes a high-frequency slot.  
→ **Decision: Blog lives in the drawer only.** The drawer is the correct home for secondary discovery surfaces.

**② "Log / Create" — the highest-frequency action — is missing entirely.**

In a fitness tracker, the user's #1 job-to-be-done per session is "log something" — a workout, a meal, a daily entry, a social post. This is the most important action in the app, and it is missing from the owner's proposed nav.  
→ **Decision: Center FAB slot (tab 3 of 5) in the bottom nav is the create/log entry point.** This follows the universal pattern (Instagram +, Strava Record, Threads +). It opens a `CreateActionSheetComponent` (bottom sheet on mobile) with options: New Post, Write Article, Log Workout, Log Meal, Daily Check-in.

**③ "Plans" = workout plans, currently the monetization surface (future premium).**

In the current codebase `/plans` = workout templates (CRUD). There is no premium tier yet. However, workout plans are a HIGH-frequency destination for active users — arguably as important as the Dashboard.  
→ **Decision: Plans goes in the drawer for now, with a clear label.** If a premium tier is built, revisit giving it an in-content upsell card within Dashboard or Plans rather than a dedicated tab. A permanent bottom-nav slot for a feature that doubles as a paywall is a dark pattern.

**④ Count arithmetic: owner's proposal has 5 items + a create action = 6, which exceeds the maximum.**

Owner: Feed + Dashboard + Blog + Messages + Profile = 5 tabs  
After removing Blog + adding Create: Feed + Dashboard + **+** + Messages + Profile = 5 ✅  
But this drops Discover (currently in the nav). Discover/Search is handled by the top bar.

**⑤ Notifications: bottom tab → top bar.**

The owner correctly puts Search and Notifications in the top bar. The current bottom nav has a dedicated Alerts tab. Moving it to the top bar (bell icon with badge) follows the Instagram/Strava/MFP pattern and frees a bottom-nav slot.  
→ **Notifications bell moves to the top bar right-side icons.**

**⑥ Discover: replace with Profile in bottom nav, Search icon in top bar.**

Discover is essentially a search surface (find athletes). Moving it to the top bar Search icon navigates to `/social/discover`. This frees the 5th bottom nav slot for Profile, making the user's own presence always one tap away.  
→ **Profile tab replaces Discover in the bottom nav. Discover is accessed via Search icon in the top bar.**

### Final Rationalized Information Architecture

```
TOP BAR (fixed, 56px, var(--nav-bg))
├── LEFT:  [≡ hamburger] on root screens  /  [‹ back + screen name] on detail screens
├── CENTER: "NovaFit" wordmark on root screens / empty on detail screens
└── RIGHT: [🔍 search → /social/discover] [🔔 bell + badge → /social/notifications]

BOTTOM NAV (fixed, 56px, var(--nav-bg))
├── Tab 1: Feed        home / home          → /social                   (exact match)
├── Tab 2: Dashboard   dashboard / grid_view → /user-dashboard
├── Tab 3: ✚ Create    add (gradient pill)  → opens CreateActionSheet
├── Tab 4: Messages    chat_bubble          → /social/chat              (+ badge)
└── Tab 5: Profile     person               → /social/profile/me

SIDE DRAWER (mat-sidenav, left, 280px, mode="over")
├── [User avatar + name + goal badge]  → /social/profile/me
├── ─────────────────────────────────
├── Blog            article             → /blog
├── Plans           fitness_center      → /plans
├── AI Assistant    smart_toy           → /ai-assistant
├── Account         manage_accounts     → /account
├── ─────────────────────────────────
└── Log out         logout (accent)     → logout()

AI CHAT FAB (position: fixed, bottom-right, z-index 960)
→ Positioned above the bottom nav using existing var(--nav-height) offset
→ NO extra offset needed (daily panel FAB is moved — see §1 desktop)
```

---

## STEP D — The Redesign Spec

---

### 1. Global App Shell Component Tree

The plan is to **evolve what exists**, not rebuild. The generalization touches:

```
AppComponent                            ← already is the global shell
├── GlobalTopBarComponent               ← rename/extend AppTopBarComponent
│     left: HamburgerButton / BackButton (contextual)
│     center: wordmark / screen-title
│     right: SearchIcon | NotificationsBell (with badge)
├── router-outlet                       ← unchanged
├── GlobalBottomNavComponent            ← rename/extend AppBottomNavComponent
│     5 tabs including center Create FAB
├── GlobalSideDrawerComponent           ← NEW — wraps mat-sidenav
│     triggered by hamburger; content: drawer items listed above
├── CreateActionSheetComponent          ← NEW — mat-bottom-sheet panel
│     triggered by center + button
└── AiChatFabComponent                  ← unchanged (core/components)
```

**SocialShellComponent changes (desktop only):**  
- Remove "Back to NovaFit" link entirely — the global shell handles cross-section navigation.
- Remove the social branding wordmark from side-nav (it's "NovaFit", one brand).
- Keep: side-nav with Feed, Discover, Chat, Notifications, Profile, New Post button, Logout.
- Keep: daily-panel + daily-panel FAB (desktop experience, < 1200px).
- Keep: reconnecting banner.
- On mobile (`< 768px`): SocialShellComponent renders `<router-outlet>` only — global shell handles nav.

> **Key principle: On mobile, `SocialShellComponent` renders zero chrome. The global shell from `app.component` is the only nav layer.**

---

### 2. Per-Screen Top Bar, Bottom Nav, and Primary Action Inventory

| Screen | Route | Top-left | Top-center | Top-right | Bottom Nav? | Primary action |
|---|---|---|---|---|---|---|
| Feed | `/social` | ≡ hamburger | "Feed" (16px/600) | 🔍 🔔(badge) | ✅ Tab 1 active | Center Create FAB |
| Discover/Search | `/social/discover` | ‹ back | "Discover" | 🔍 🔔 | ✅ none active | (search input inline) |
| Dashboard | `/user-dashboard` | ≡ hamburger | "Today" | 🔍 🔔 | ✅ Tab 2 active | existing log actions within page |
| Messages list | `/social/chat` | ≡ hamburger | "Messages" | 🔍 🔔 | ✅ Tab 4 active | new conversation (icon in top bar right — replace search when on Messages) |
| Chat thread | `/social/chat/:id` | ‹ back | Recipient name | ✅ no search, just back | ❌ hidden | Message send input (inline, footer of thread) |
| Profile | `/social/profile/me` | ≡ hamburger | "Profile" | 🔍 🔔 | ✅ Tab 5 active | Edit profile (in-page button) |
| Other's profile | `/social/profile/:id` | ‹ back | Display name | 🔍 🔔 | ✅ (no active) | Follow button (in-page) |
| Notifications | `/social/notifications` | ‹ back | "Notifications" | 🔍 🔔(clears on load) | ✅ (no active) | Mark all read (top-right text button) |
| Post detail | `/social/post/:id` | ‹ back | "Post" | — | ❌ hidden | Comment send (inline footer) |
| Article detail | `/social/article/:id` | ‹ back | "Article" | — | ❌ hidden | Share / back |
| Blog list | `/blog` | ‹ back | "Blog" | — | ❌ hidden | (read-only list) |
| Blog post | `/blog/:id` | ‹ back | Article title (truncated) | — | ❌ hidden | (read-only) |
| Plans / Workouts | `/plans` | ≡ hamburger | "Plans" | 🔍 🔔 | ✅ (no active) | + new plan (in-page FAB) |
| Workout session | `/workout-session/:id` | ‹ back | Template name | — | ❌ hidden | existing session controls |
| AI Assistant | `/ai-assistant` | ≡ hamburger | "AI Assistant" | — | ✅ (no active) | message send (inline footer) |
| Account | `/account` | ≡ hamburger | "Account" | — | ✅ (no active) | save changes (inline) |
| Login / Register | `/login`, `/register` | — | — | — | ❌ | form submit |
| Onboarding | `/onboarding/**` | — | — | — | ❌ | next step |

**Rules for hiding bottom nav:**
- Chat thread (`/social/chat/:id`): keyboard raises and bottom nav would steal space; hide it.
- Post detail, article detail, blog post: immersive reading/commenting; hide nav.
- Workout session: full-screen focused mode; hide nav.
- Login, register, onboarding: unauthenticated or first-run; excluded already.

`showMainNav()` computed must be extended to also exclude these detail routes:
```
excluded += ['/social/chat/', '/social/post/', '/social/article/', '/blog/', '/workout-session/']
```
(prefix-match for the parameterized segments)

---

### 3. Per-Screen Mobile Layout Notes (~390px viewport)

#### Feed (`/social`)

```
┌─────────────────────────────────┐  ← fixed top bar, 56px
│ ≡   Feed         🔍 🔔(n)      │
├─────────────────────────────────┤
│  ┌──── StreakBadge pill ──────┐  │  ← sticky section header, 44px
│  │  🔥 12-day streak          │  │
│  └───────────────────────────┘  │
│                                 │
│  [PostCard]                     │  ← scrollable, full width, 16px h-padding
│  [PostCard]                     │
│  ...                            │
│  [Guided Empty — if no posts]   │
├─────────────────────────────────┤  ← fixed bottom nav, 56px
│  Home  Dash  [✚]  Chat  Me     │
└─────────────────────────────────┘
```

- **Scroll behavior**: Top bar DOES scroll-to-hide on feed (content-first; user needs max vertical space). Use `transform: translateY(-100%)` on scroll-down, restore on scroll-up. Bottom nav stays fixed always.
- **Pull-to-refresh**: existing pattern preserved (`pull-refresh-indicator`).
- **Empty state**: existing `SocialFeedGuidedEmptyComponent` — preserve exactly. It already has: icon, headline, suggested users with skeleton, follow buttons, Discover CTA.

#### Dashboard (`/user-dashboard`)

```
┌─────────────────────────────────┐  ← fixed top bar, stays visible (no scroll-hide)
│ ≡   Today          🔍 🔔       │
├─────────────────────────────────┤
│  ┌──── date header ────────────┐│
│  │  Tuesday, 24 Jun             ││  ← sticky date selector, 44px
│  └─────────────────────────────┘│
│                                  │
│  [Calorie ring card]             │  ← glass card, full-width, 16px h-padding
│  [Macro bar card]                │
│  [Meals section]                 │
│  [Workouts section]              │
│  [AI analyzer card]              │
└────────────────────────────────┘  ← fixed bottom nav
```

- **Scroll behavior**: Top bar DOES NOT scroll-to-hide on Dashboard (data at the top matters — calorie ring should be visible when user opens app).
- **BMI / BMR / TDEE / body weight**: These are private. They MUST NOT appear here. They belong only in `/account` which is drawer-only.
- **Empty state**: Motivating prompt "Log your first meal today" with a dashed-border add card (existing `btn-add-ex` pattern). Never show a wall of zeros.

#### Messages (`/social/chat`)

```
┌─────────────────────────────────┐  ← fixed top bar
│ ≡   Messages          ✉ (new) │  ← top-right: replace 🔍 with ✉ new-conversation icon
├─────────────────────────────────┤
│  [ConversationRow]              │  ← 72px min-height per row (touch target)
│  [ConversationRow]  • (unread) │
│  ...                            │
├─────────────────────────────────┤
│  Home  Dash  [✚]  Chat  Me     │  ← Tab 4 active
└─────────────────────────────────┘
```

- **On chat thread (`/social/chat/:id`)**: Bottom nav is hidden. Top bar shows `‹ recipient name`. Keyboard safe-area: `padding-bottom: calc(env(keyboard-inset-height, 0px) + 16px)` on the message input.
- **Reconnecting banner**: The social-shell reconnecting banner pattern should be generalized into `GlobalTopBarComponent` — show an amber sub-banner when SignalR hub state is `'reconnecting'`.

#### Profile (`/social/profile/me`)

```
┌─────────────────────────────────┐  ← top bar
│ ≡   Profile        🔍 🔔       │
├─────────────────────────────────┤
│  [ProfileHeroComponent]         │  ← avatar, name, follow counts, bio, edit btn
│  ─────────────────────────────  │
│  [AthleteStatsBar]              │  ← PUBLIC only: workouts, streak, posts
│  [PostsTab / WorkoutsTab / etc] │  ← existing tabs, unchanged
│  ...                            │
├─────────────────────────────────┤
│  Home  Dash  [✚]  Chat  Me(●) │  ← Tab 5 active
└─────────────────────────────────┘
```

- **PRIVACY HARD RULE**: `PrivateStatsComponent` (BMI, BMR, TDEE, body weight, goal calories) is ONLY rendered on OWN profile when viewed via the `/account` route. It MUST NOT render on the social profile view, regardless of whether it is your own profile or another user's.
- **Stats tab** (`/social/profile/:userId/stats`): Charts (streak, volume) are public and acceptable.
- The "Edit Profile" / "Follow" button is inside the profile card, not the top bar.

---

### 4. Component Visual Specs

#### GlobalTopBarComponent

**Layout:** `display: flex; align-items: center; height: var(--nav-height); padding: 0 12px;`

```
[ LEFT 48px touch ] ─── [ CENTER flex-1 ] ─── [ RIGHT flex row gap-4 ]
```

**Left button (hamburger):**
- 48×48px touch target (`min-width: 48px; min-height: 48px`)
- Icon: `menu` (24px), color `rgba(255,255,255,0.85)` = `var(--white-soft)`
- When on a detail route (contextTitle != ''): replaces with `chevron_left` (24px) + screen title text
- Transition: icon swap via `@if / @else`, no animation needed (already handled by `contextTitle` signal)
- On hamburger click: `drawerOpen.set(true)` (signal communicated to sidenav)

**Center:**
- Root screens: "Nova**Fit**" wordmark — "Nova" in `var(--white-soft)`, "Fit" in `var(--primary)`. Font: Poppins 700, 18px.
- Detail screens: nothing (space is owned by the back-button + title row on the left)

**Right icons:**
- Search: `mat-icon-button` with icon `search` (24px), 48×48px touch target, color `var(--white-soft)` → on tap navigates to `/social/discover`
- Notifications bell: `mat-icon-button` with icon `notifications` (24px), 48×48px. Badge overlay (exact same `.app-bottomnav-badge` style): `var(--accent)` bg, white text, 9px font, 16px height.
  - Badge position: `top: 8px; right: 8px` relative to the button
  - Navigates to `/social/notifications`
- On Messages screen (`/social/chat`), replace search with `edit` icon for new conversation.

**Background:** `var(--nav-bg)` = `rgba(13,13,16,0.95)` with `backdrop-filter: blur(var(--nav-blur))`  
**Border-bottom:** `1px solid var(--nav-border)`  
**Position:** `fixed; top: 0; left: 0; right: 0; z-index: 1000`  
**Padding-top:** `env(safe-area-inset-top, 0px)` — respects notch  
**Height total:** `calc(var(--nav-height) + env(safe-area-inset-top, 0px))`

**Scroll-to-hide (Feed only):**
- Feed screen sets a CSS class `.topbar--scrolled-down` on the shell when `scrollY > 80 && scrollDelta > 0`
- CSS: `.topbar--scrolled-down { transform: translateY(-100%); transition: transform 0.2s ease; }`
- `prefers-reduced-motion: reduce` → `transition: none; opacity: 0.6;` (no translate)

---

#### GlobalBottomNavComponent

**Layout:** `display: flex; height: calc(var(--nav-height) + env(safe-area-inset-bottom, 0px)); padding-bottom: env(safe-area-inset-bottom, 0px); align-items: center; justify-content: space-around;`

**Container:**
```css
position: fixed;
bottom: 0; left: 0; right: 0;
z-index: 1000;
background: var(--nav-bg);
backdrop-filter: blur(var(--nav-blur));
border-top: 1px solid var(--nav-border);
```

**Standard tabs (1, 2, 4, 5):**
- Width: `flex: 1` — each tab fills equal share of `calc((100% - 64px) / 4)` (subtracting center FAB width)
- Structure: `flex-column; align-items: center; gap: 2px`
- Icon: 22px, color `var(--nav-icon-inactive)` = `rgba(255,255,255,0.4)`
- Label: 10px, Poppins 600, UPPERCASE, letter-spacing 0.02em, same color as icon
- Active state: 
  - Icon + Label color: `var(--primary)`
  - Font-weight: 700
  - `::before` pseudo indicator: 3px × 3px pill, `var(--primary)` bg, centered above icon, top 6px
  - **Active state must NOT be color-only** (dot indicator + weight change fulfil this rule)
- Touch target: `min-height: 48px`

**Tab 1 — Feed:**
- Icon: `home` (outlined when inactive, filled appearance via `font-variation-settings: 'FILL' 1` when active)
- Route: `/social` (exact match)

**Tab 2 — Dashboard:**
- Icon: `grid_view`
- Route: `/user-dashboard`

**Tab 3 — Create (center FAB):**
- Width: 64px (fixed, not flex-1)
- Touch target: 48×48px min
- Visual: 52×52px pill or circle, `background: linear-gradient(135deg, var(--primary), var(--accent))`, `border-radius: 16px`, `box-shadow: 0 4px 18px rgba(124,77,255,0.45)`
- Icon: `add`, 26px, color `#ffffff`
- No label text
- Hover/press: `transform: scale(1.07)`, `box-shadow` intensifies
- On tap: opens `CreateActionSheetComponent` via `MatBottomSheet`
- This is NOT a router link — it is a `<button type="button">`
- `aria-label="Create or log something"`
- Active indicator: gradient pill bg always — no active state variation needed (it's an action, not a destination)

**Tab 4 — Messages:**
- Icon: `chat_bubble`
- Route: `/social/chat`
- Badge: unread DM count — same `.app-bottomnav-badge` style as existing

**Tab 5 — Profile:**
- Icon: `person`
- Route: `/social/profile/me`
- Active detection: `routerLinkActive` with `[routerLinkActiveOptions]="{ exact: false }"` — matches any `/social/profile/me` sub-route

---

#### GlobalSideDrawerComponent (NEW)

**Triggered by:** hamburger icon in top bar. Signal `drawerOpen` toggled; passed as `@Input()` to drawer, or communicated via `MatSidenav` reference.

**Overlay drawer pattern:**
```css
position: fixed;
top: 0; left: 0; bottom: 0;
width: 280px;
max-width: 85vw;
z-index: 1100;
background: var(--surface);
border-right: 1px solid rgba(255,255,255,0.08);
transform: translateX(-100%);  /* closed */
transform: translateX(0);       /* open */
transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
overflow-y: auto;
```

**Backdrop:**
```css
position: fixed; inset: 0;
z-index: 1090;
background: rgba(0,0,0,0.65);
backdrop-filter: blur(4px);
```
Tap backdrop → close drawer.

**Drawer header:**
- Padding: 24px 20px 16px
- Avatar: 48×48px circle (user photo or initials fallback), `border: 2px solid rgba(124,77,255,0.4)`
- Name: Poppins 600 16px, `var(--white-soft)`, one line + ellipsis
- Goal badge: `.pill` component, semantic color per goal (reuse existing pill-subtle classes)
- Entire header tappable → navigates to `/social/profile/me`, closes drawer
- `min-height: 48px` for the tap area

**Divider:** `1px solid rgba(255,255,255,0.06)`, `margin: 8px 0`

**Drawer items (rows):**
- Each: `display: flex; align-items: center; gap: 14px; padding: 14px 20px; min-height: 52px`
- Icon: 22px, `var(--nav-icon-inactive)`
- Label: Poppins 500 15px, `var(--white-soft)`
- Hover: background `rgba(255,255,255,0.04)`, icon+label color `var(--white)`
- Active route highlight: `background: rgba(124,77,255,0.08)`, icon color `var(--primary)`, label color `var(--white)`
- Touch feedback: 0.12s ease background transition

**Drawer item list:**
```
[icon: article]         Blog              → /blog
[icon: fitness_center]  Plans             → /plans
[icon: smart_toy]       AI Assistant      → /ai-assistant
[icon: manage_accounts] Account           → /account
─────────────────────────────────────
[icon: logout]          Log out           → logout() — icon + text color: var(--accent)
```

**Close button:** `×` icon top-right of drawer header, 48×48px touch target.

**Accessibility:**
- `role="dialog"`, `aria-label="Navigation menu"`, `aria-modal="true"`
- Focus trap: first focus goes to close button on open; last focusable item = Log out; Tab cycles within drawer
- Escape key closes drawer
- When closed: `aria-hidden="true"`, `inert` attribute (or `visibility: hidden` to remove from tab order)

**prefers-reduced-motion:** `transition: none; opacity transitions instead of translateX`

---

#### CreateActionSheetComponent (NEW)

Opens via `MatBottomSheet` on mobile; standard `MatDialog` on desktop (same `CreateContentComponent` existing pattern).

**Bottom sheet container (mobile `< 640px`):**
```css
background: var(--surface);
border-radius: 24px 24px 0 0;
border-top: 1px solid rgba(255,255,255,0.10);
padding: 16px 20px calc(24px + env(safe-area-inset-bottom, 0px));
```

**Sheet header:**
- "What would you like to do?" — Poppins 700 16px, `var(--white-soft)`
- Drag handle bar (2px × 32px pill, `rgba(255,255,255,0.12)`) centered above text

**Action items (2-column grid on mobile):**
```
[ 🖊 New Post     ] [ 📝 Write Article ]
[ 💪 Log Workout  ] [ 🥗 Log Meal      ]
[ 📅 Daily Check-in                    ]
```
Each cell:
- Glass card: `background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 16px 12px; min-height: 80px`
- Icon (Material icon): 28px, `var(--primary)`, in a 40px `border-radius: 12px; background: rgba(124,77,255,0.14)` container
- Label: Poppins 600 13px, `var(--white-soft)`
- Hover: `border-color: rgba(255,255,255,0.14); transform: translateY(-2px)`, 0.15s ease

**Actions:**
- New Post → opens `CreateContentComponent(post mode)` — same as existing `openCreatePost()` in top bar
- Write Article → opens `CreateContentComponent(article mode)` — same as existing
- Log Workout → navigates to `/plans`, closes sheet
- Log Meal → navigates to `/user-dashboard` with query param `?tab=nutrition`, closes sheet
- Daily Check-in → navigates to `/user-dashboard` with query param `?tab=daily`, closes sheet

**Angular Material:** `MatBottomSheet.open(CreateActionSheetComponent, { panelClass: 'create-action-sheet' })`

---

### 5. AI Chat FAB Coexistence

**Current problem:** When on `/social` routes, the `daily-panel-fab` (z-index 920 in the social shell) and the `ai-chat-fab` (z-index 950) both occupy bottom-right, hence `aiFabExtraOffset = 64`.

**With the redesign:**
- On mobile (`< 768px`), `SocialShellComponent` no longer renders the `daily-panel-fab` — the bottom nav is the primary nav layer, and the daily panel is desktop-only.
- **Proposed: move the daily-panel-fab to desktop only** (it's already only triggered by `isNarrow()` which is `< 1200px`, but on mobile `isMobile()` the shell renders no side-nav anyway). The daily panel FAB purpose — quick access to today's data — is served on mobile by the Dashboard tab in the bottom nav.
- Therefore, on mobile: `aiFabExtraOffset = 0` always. The fab sits at `bottom: calc(var(--nav-height) + env(safe-area-inset-bottom) + 16px)`, `right: 16px`.
- Z-index: AI Chat FAB = **1050** (above bottom nav 1000, below drawer 1100, below dialogs).

**Desktop** (> 768px): AI chat FAB position unchanged (`bottom: 24px; right: 24px`) — no bottom nav to conflict with.

---

### 6. Token Usage — CSS Variables Only

All values below reference existing tokens. No new hex values are introduced.

| Element | CSS variable |
|---|---|
| Nav background | `var(--nav-bg)` = `rgba(13,13,16,0.95)` |
| Nav blur | `backdrop-filter: blur(var(--nav-blur))` = `blur(20px)` |
| Nav border | `var(--nav-border)` = `rgba(255,255,255,0.07)` |
| Nav height | `var(--nav-height)` = `56px` |
| Inactive icon/label | `var(--nav-icon-inactive)` = `rgba(255,255,255,0.4)` |
| Active icon/label | `var(--primary)` = `#7c4dff` |
| Create FAB gradient | `linear-gradient(135deg, var(--primary), var(--accent))` |
| Create FAB glow | `rgba(var(--primary-rgb), 0.45)` |
| Drawer bg | `var(--surface)` = `#0d0d10` |
| Drawer border | `rgba(255,255,255,0.08)` = `var(--white-fade)` |
| Drawer overlay | `rgba(0,0,0,0.65)` (same as modal backdrop) |
| Badge bg | `var(--accent)` = `rgb(255,64,129)` |
| Badge text | `var(--white)` |
| Logout icon | `var(--accent)` |
| Hover bg | `rgba(255,255,255,0.04)` (= `var(--white-fade) / 2`) |

**New CSS variable to define in `styles.css`:**
```css
--nav-create-gradient: linear-gradient(135deg, var(--primary), var(--accent));
```
Justified because the gradient is reused across the center FAB and any future primary CTA.

---

### 7. Three States for Every Data Screen

#### Feed

**Loading:**
- 3× skeleton PostCard placeholders: `background: rgba(255,255,255,0.04); border-radius: 16px; height: 160px` with shimmer animation (`pulse` keyframe from global styles.css)
- Staggered: `animation-delay: 0ms / 80ms / 160ms`

**Empty:**
- Render existing `SocialFeedGuidedEmptyComponent` — it already implements the motivating pattern with suggested users and a Discover CTA. **Do not replace this component; it is the exemplary empty state in the codebase.**

**Error:**
- Existing `.feed-error` banner: `background: rgba(255,64,129,0.12); border: 1px solid rgba(255,64,129,0.25); border-radius: 12px`
- `error_outline` icon + message text + "Try again" ghost button
- Retry calls `facade.loadFeed(true)`

#### Dashboard

**Loading:**
- Calorie ring placeholder: 120px circle, `background: rgba(255,255,255,0.04)`, `border-radius: 50%`, pulse
- 2× card skeleton blocks below
- No spinner — skeleton blocks convey structure

**Empty:**
- "Let's build your day 💪" headline (Poppins 800 22px)
- "Log your first meal or workout to see your progress here" (15px, `rgba(255,255,255,0.35)`)
- Two dashed-border add cards: "Log a meal" (`restaurant` icon) and "Start a workout" (`fitness_center` icon) using `.btn-add-ex` pattern
- **No wall of zeros** — never show "0 kcal / 0 g protein" on first visit

**Error:**
- Accent banner with `error` icon, "Couldn't load today's data" + "Retry" button

#### Messages

**Loading:**
- 4× skeleton rows: 56px height, avatar circle placeholder (40px) + two text lines
- pulse shimmer

**Empty:**
- Icon: `chat_bubble_outline` (40px, `rgba(255,255,255,0.18)`)
- "No conversations yet" (15px, `rgba(255,255,255,0.35)`)
- "Find someone to message" ghost button → navigates to `/social/discover`

**Error:**
- Accent banner + retry

#### Notifications

**Loading:**
- 5× skeleton rows (icon circle + text line + timestamp)

**Empty:**
- Icon: `notifications_none` (40px)
- "You're all caught up!" — positive framing, not "nothing here"
- No CTA needed — this is a terminal state, not a starting point

**Error:**
- Accent banner + retry

#### Profile

**Loading:**
- Hero skeleton: large avatar circle + two text line stubs (120px hero area)
- 3× post card skeletons below

**Empty (own profile, no posts):**
- "Share your first workout" — with center Create FAB highlight animation (brief `pulse` on the bottom nav button to draw attention)
- Ghost button "Create a post" → opens CreateActionSheet

**Empty (other user profile, no posts):**
- "Nothing here yet" — neutral, no CTA (you can't create for them)

---

### 8. Mobile Constraints Compliance Checklist

| Constraint | Implementation |
|---|---|
| `env(safe-area-inset-bottom)` | Bottom nav: `padding-bottom: env(safe-area-inset-bottom, 0px)`, height includes inset |
| `env(safe-area-inset-top)` | Top bar: `padding-top: env(safe-area-inset-top, 0px)`, height includes inset |
| Touch targets ≥ 48px | All nav tabs: `min-height: 48px`. Drawer rows: `min-height: 52px`. Top bar icons: 48×48px. |
| 8px minimum spacing between touch targets | Bottom nav: tabs are `flex: 1`, minimum width enforced. Create FAB: 64px fixed, flanked by flex tabs. |
| Active tab NOT color-only | Icon fill variant (`font-variation-settings`) + font-weight 700 + 3px indicator dot |
| Thumb zone — primary actions in bottom third | Create FAB: bottom nav center = 55% of screen height from top. All bottom nav actions: bottom third. |
| Destructive / rare actions in top zone | Logout: inside drawer (requires deliberate tap-hamburger-then-scroll). Delete post: in post detail top-right. |
| Back/gesture behavior per screen | Top bar left: hamburger on root, `chevron_left` + screen name on detail. Android back gesture: closes drawer if open first, else standard back. |
| Scroll-to-hide top bar | Feed only. Dashboard: stays visible. Tracker data at the top is mission-critical. |
| `prefers-reduced-motion` | All transitions: `@media (prefers-reduced-motion: reduce) { transition: none; animation: none; }` — fallback to instant state change or opacity-only |
| Visible keyboard/switch focus | All interactive elements: `outline: 2px solid var(--primary); outline-offset: 2px` on `:focus-visible`. Drawer: focus trap with `inert` attribute when closed. |

---

### 9. Responsive Behavior (Desktop-first Media Queries)

```
≥ 769px (desktop):
  - Bottom nav: HIDDEN
  - Top bar: HIDDEN
  - Side drawer: HIDDEN
  - SocialShellComponent: shows 240px side-nav (SocialSideNavComponent, desktop)
  - Non-social routes: still have no side-nav (flagged for @tech-architect)

≤ 768px (mobile):
  - Bottom nav: VISIBLE
  - Top bar: VISIBLE
  - Side drawer: VISIBLE (overlay mode)
  - SocialShellComponent: renders router-outlet only (no chrome of its own)

≤ 480px:
  - Drawer width: 85vw (not 280px)
  - CreateActionSheet: 1-column grid instead of 2-column
  - Top bar wordmark: hidden (leave only logo icon) to prevent overflow with long screen titles
```

---

### 10. Animations

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Drawer open | `translateX(-100% → 0)` | 0.25s | `cubic-bezier(0.4,0,0.2,1)` |
| Drawer backdrop | `opacity: 0 → 1` | 0.25s | `ease` |
| Page entrance | existing `slideUp` keyframe | 0.35s | `ease-out` |
| Bottom nav active switch | icon/label color + dot | 0.18s | `ease` |
| Create FAB press | `scale(0.94)` | 0.1s | `ease` |
| Create FAB hover | `scale(1.07)` | 0.2s | `cubic-bezier(0.34,1.56,0.64,1)` |
| Top bar scroll-hide | `translateY(-100%)` | 0.2s | `ease` |
| Drawer item hover | bg color | 0.12s | `ease` |

All `prefers-reduced-motion: reduce` → replace transform/translate with opacity only or instant.

---

### 11. Accessibility

**ARIA structure:**
- Top bar: `<header role="banner" aria-label="NovaFit navigation">`
- Bottom nav: `<nav role="navigation" aria-label="Main tabs">`
- Drawer: `role="dialog" aria-label="Navigation menu" aria-modal="true"`
- Create sheet: `role="dialog" aria-label="Create or log activity"`

**ARIA labels on icons:**
- Hamburger: `aria-label="Open navigation menu"`
- Search: `aria-label="Search and discover athletes"`
- Notifications: `aria-label="Notifications, {n} unread"` (live region for badge updates)
- Create FAB: `aria-label="Create or log something"`
- Active tab: `aria-current="page"` (in addition to `routerLinkActive` class)

**Tab order (bottom nav):**
1. Feed tab
2. Dashboard tab
3. Create button
4. Messages tab
5. Profile tab

**Focus management:**
- On drawer open: focus moves to close (×) button
- On drawer close: focus returns to hamburger button
- On sheet open: focus moves to first action item
- On sheet close: focus returns to create FAB

**Badge live region:**
```html
<span aria-live="polite" aria-atomic="true" class="sr-only">
  {{ unreadNotifications() > 0 ? unreadNotifications() + ' unread notifications' : '' }}
</span>
```

---

## Angular Material Components to Use

| Component | Usage |
|---|---|
| `MatSidenav` / `MatSidenavContainer` | Side drawer — mode `"over"` with custom styling (override MAT default) |
| `MatBottomSheet` | CreateActionSheet on mobile; existing AI chat sheet pattern |
| `MatDialog` | CreateActionSheet on desktop (same as existing) |
| `MatIconButton` | Top bar search, notifications, hamburger, close |
| `MatIcon` | All icons |
| `MatRipple` | Drawer items (add `matRipple` to `<a>` tags) |
| `MatBadge` | Consider for notifications/messages, OR keep custom `.app-bottomnav-badge` for full CSS control |
| `RouterLink`, `RouterLinkActive` | Nav tabs |
| `BreakpointObserver` | `(max-width: 768px)` signal — already used in social shell, reuse pattern |

**CSS classes to reuse (from styles.css):**
- `.btn-ghost` — drawer CTA buttons, sheet secondary actions
- `.btn-primary` — Create FAB (override background with gradient)
- `.pill`, `.pill-subtle` — goal badge in drawer header
- `.empty` — all empty states
- `.loader-overlay` — loading screens where full-overlay is needed
- `.app-bottomnav`, `.app-bottomnav-tab`, `.app-bottomnav-tab--active`, `.app-bottomnav-badge` — extend, don't replace
- `.app-topbar` — extend, don't replace
- `.reconnecting-banner` — generalize into GlobalTopBarComponent (move from social-shell CSS)

**New CSS classes needed:**
- `.global-drawer` — the drawer container
- `.global-drawer-backdrop` — the overlay backdrop
- `.global-drawer-header` — user info at top of drawer
- `.global-drawer-item` — each nav row in the drawer
- `.bottomnav-create` — center create FAB button (gradient pill)
- `.create-action-sheet` — panelClass for the MatBottomSheet
- `.create-action-grid` — 2-column grid within the sheet

---

## STEP E — Architecture Handoff for @tech-architect

**Risks and mitigations — one sentence each:**

1. **Routing restructure for GlobalShellComponent**: Promoting the social shell to a global shell requires moving `app-top-bar`, `app-bottom-nav`, and the new `app-side-drawer` from `app.component` + `features/social/` into `core/` — routing stays flat (no new route nesting), but component imports in `AppComponent` must be updated; low risk, straightforward refactor.

2. **Social shell on desktop vs. global shell on mobile**: The two-shell approach (global shell for mobile, social side-nav for desktop) must be explicitly documented in code comments; the risk is a future developer adding global shell chrome on desktop inadvertently — mitigate by a `@media (max-width: 768px)` guard on `showMainNav()` (already exists) and by naming the bottom/top components `GlobalMobileNavComponent` to signal their scope.

3. **`showMainNav()` exclusion list**: Adding new detail routes (chat thread, post detail) to the exclusion list changes a computed signal used across the whole app; risk of regressions on existing routes — mitigate by extracting the exclusion logic into a pure function with unit tests.

4. **AI Chat FAB z-index conflict**: Setting AI chat FAB z-index to 1050 (above nav 1000, below drawer 1100) resolves the known conflict documented in `social-mobile-fixes.md`; but any new `position: fixed` component must declare its z-index relative to this stack in a z-index reference comment in `styles.css`.

5. **Daily panel FAB retirement on mobile**: If the daily panel FAB is removed from mobile (as this spec recommends), the `aiFabExtraOffset = 64` in `AppComponent` becomes always 0 on mobile — this simplification removes a subtle coupling; verify no other FAB occupies the same corner before removing the offset logic.

6. **Lazy-loading the drawer**: `GlobalSideDrawerComponent` should be lazy-loaded (it contains user data and logout logic) since it is never needed on the critical render path; use the existing `@defer` or dynamic import pattern.

7. **`SocialSideNavComponent` generalisation**: The "Back to NovaFit" link and "beSocial" branding in `SocialSideNavComponent` must be removed as part of this work; this component should be renamed `AppDesktopSideNavComponent`, moved to `core/components/`, and have its nav items expanded to cover all app destinations — a direct code change, no architectural risk.

8. **Desktop shell gap**: `/user-dashboard`, `/plans`, `/ai-assistant`, `/account`, `/blog` on desktop currently have no unified shell (they render with the old `app-header`/`app-footer`); this spec only addresses mobile — the desktop shell generalization (a unified desktop side-nav covering all routes) should be treated as a follow-up ADR rather than bundled here to limit scope creep.
