# NovaFit — Mobile / BeSocial Refactoring Roadmap (Document B)
_Generated: 2026-06-22 | Branch: Fix-Release | Source: Full 8-agent analysis pipeline_

> **Identity statement for all decisions in this document:**
> BeSocial is where your fitness effort becomes visible to the people who care about it — every post is backed by real logged data, not curated content. Every mobile decision must ask: "does this make users more accountable to their people?"

---

## P0 — BeSocial Navigation Overhaul

### P0.1 — Complete the abandoned navigation refactor: unified bottom nav
**Components:** `fit-app/src/app/shared/components/bottom-nav/app-bottom-nav.component.ts`, `.html`, `.css`
**Current behavior:** The global `app-bottom-nav` shows 5 tabs: Dashboard, Plans, Social, Profile, More. Inside `/social`, the shell adds `social-top-tabs` (Feed/Discover/Chat/Alerts) as a pill row below the global top bar. This creates ~160px of combined navigation chrome (global top bar 56px + social top-tabs ~48px + global bottom nav 56px). The `social-bottom-nav.component.*` and `social-top-bar.component.*` are fully built but never rendered — evidence of an incomplete refactor.

**Change:** Redesign `app-bottom-nav` tabs for the BeSocial-first mobile identity. Replace the current 5 tabs with:

| Position | Tab | Icon | Route | Badge |
|----------|-----|------|-------|-------|
| 1 | Feed | `home` | `/social` | None |
| 2 | Discover | `explore` | `/social/discover` | None |
| 3 | Log | `add_circle` | — (opens action sheet) | None |
| 4 | Alerts | `notifications` | `/social/notifications` | `unreadNotifications` count |
| 5 | Messages | `chat_bubble` | `/social/chat` | `unreadMessages` count |

**Active state:** `var(--primary)` icon + label, 3px pill dot `border-radius: 999px` at `top: 6px`, centered. Transition: `0.18s ease`. Tab press: `transform: scale(0.92)`, `0.1s ease`.

**Social top-tabs** (`social-top-tabs.component.*`): **remove entirely** — the bottom nav now directly addresses Feed, Discover, Alerts, Messages as top-level tabs. The shell no longer needs a secondary pill row.

**Nav visibility:** Update `app.component.ts:30-35` `showMainNav` exclusion list to NOT exclude `/social`. The bottom nav persists across all authenticated routes. Remove the `padding-top` compensation in `social-shell.component.css:113-114` once the social top-tabs row is gone.

**Why:** The double-nav chrome is the single worst mobile UX symptom. Removing the social top-tabs row reclaims 48px of content space and eliminates the secondary navigation layer entirely.
**Effort:** M

### P0.2 — Split the combined social badge into separate Alerts + Messages badges
**Components:** `app-bottom-nav.component.ts:25-29`, `.html`
**Current behavior:** `socialBadge` = `notificationCount + unreadMessages` combined. A badge showing "5" on the Social tab tells the user nothing about whether they have messages, likes, or follows.
**Change:** Wire tab 4 (Alerts) to `notificationFacade.unreadCount` and tab 5 (Messages) to `chatFacade.totalUnreadMessages`. Each badge has independent data binding. Badge spec: `min-width: 16px; height: 16px; border-radius: 999px; background: var(--accent); color: var(--white); font-size: 9px; font-weight: 700; border: 1.5px solid var(--surface)`.
**Why:** Users can't distinguish notification type from a combined badge. Strava, Instagram, and every modern social app show separate counters.
**Effort:** S

### P0.3 — Fix tab disappearing on detail routes — add back navigation
**Components:** `fit-app/src/app/features/social/components/social-top-tabs/social-top-tabs.component.ts:30-34`
**Current behavior:** Tabs are hidden on detail routes (`/social/post/:id`, `/social/chat/:id`, etc.) via a `showTabs` computed that checks the URL. When tabs vanish, the only navigation back is the global bottom nav "Social" tab (which reloads the feed from scratch) or the browser back button.
**Change:** Since social-top-tabs is being removed (P0.1), the problem resolves itself. However, all social detail routes need a back chevron in the global `app-top-bar`. Update `app-top-bar.component.ts` to detect social detail routes and show a `<button (click)="location.back()">` `chevron_left` icon replacing the NovaFit wordmark. The wordmark returns when on a root-level route (`/social`, `/social/discover`, etc.).
**Why:** Users tapping into a post or chat have no visible way back on mobile. This is a fundamental navigation gap.
**Effort:** S

### P0.4 — Expose create-post action on mobile (resolve unreachable FAB)
**Components:** `fit-app/src/app/features/social/feed/social-feed.component.css:272-279` (FAB hidden at ≤768px), `app-bottom-nav`
**Current behavior:** The feed FAB is `display: none` at ≤768px. The hamburger drawer that was supposed to contain "New Post" (`social-top-bar.component.*`) is dead code. The ONLY create path on mobile is a 36×36px icon in the global top bar's right corner — competing with the streak badge and avatar.
**Change:** The "Log" center tab (P0.1, tab position 3) opens a `MatBottomSheet` (`LogActionSheetComponent`) with a "Post to Feed" action as the first item (opens existing `CreateContentComponent` dialog). This resolves the create-post discovery gap without a floating FAB. Also: remove the `display: none` on `.feed-fab` in `social-feed.component.css` — the FAB can remain as a secondary affordance on mobile if the Log sheet feels one tap too deep for repeat creators.
**Why:** Creating content is the most important social action. Currently it is the hardest action to find on mobile.
**Effort:** S (once P0.1 is done — the Log sheet is built as part of that)

---

## P0 — Feed Experience

### P0.5 — Add pull-to-refresh on the social feed
**Components:** `fit-app/src/app/features/social/feed/social-feed.component.ts`, `.html`
**Current behavior:** No pull-to-refresh gesture exists. The only refresh mechanism is navigating away and back, or the error-state retry button. Returning users see stale feed content with no obvious refresh path.
**Change:** Add a pull-to-refresh implementation using the Pointer Events API (or a lightweight library like `ngx-pull-to-refresh`). On gesture completion: call `facade.loadFeed(true)` (refresh = true) which resets the feed and reloads from page 1.

Indicator: a 24px `mat-spinner` centered at the top of the feed container, visible only during the pull gesture + loading state. Color: `var(--primary)`.
**Why:** Table-stakes mobile UX pattern. Every social app supports this. Without it, users returning from the background see stale content and don't know how to refresh.
**Effort:** S

### P0.6 — Switch feed from offset pagination to cursor-based pagination
**Components:** `fit-app/src/app/core/facade/social.facade.ts:45` (`feedPage`), `fit-app/src/app/api/social.service.ts`
**Current behavior:** Feed uses offset-based pagination (`feedPage` counter). Offset pagination causes gaps and duplicates when new posts are inserted between fetches — a correctness problem on a live social feed. It also blocks DOM recycling (virtual scroll requires knowing item positions precisely).
**Change:**
1. Add `feedNextCursor = signal<string | null>(null)` to `SocialFacade` (or its `social-feed.facade.ts` successor from Web P1.1)
2. Update `loadFeed()` to pass `?cursor={nextCursor}` to `GET /api/social/feed`
3. Update `SocialService.getFeed()` to accept and return cursor
4. Backend `SocialService.GetFeedAsync()` already supports `cursor` parameter — **frontend is not using it** (confirmed by performance agent)
**Why:** Correctness (no duplicates/gaps) + prerequisite for DOM recycling strategy.
**Effort:** M

### P0.7 — DOM recycling strategy for feed (progressive enhancement)
**Components:** `fit-app/src/app/features/social/feed/social-feed.component.ts`, `.html`
**Current behavior:** Every loaded post stays in the DOM indefinitely. At 60+ posts (3 pages), this causes layout thrash on mid-range Android devices and 300ms+ input delay during scroll.
**Change:** Because post-card height is variable (text length, optional image, optional article body), Angular CDK `cdk-virtual-scroll-viewport` with a fixed `itemSize` cannot be used directly. Instead implement a **render window** strategy:
- Maintain a `visiblePostIds = signal<number[]>()` that contains only the 30 most recent posts
- When the user scrolls near the bottom sentinel: append the next page to `visiblePostIds`, remove the oldest N from the front
- The post cache (`social-post-cache.service.ts` from P1.1 of the Web roadmap) holds all loaded posts in memory — only DOM representation is windowed
- Use `trackBy: trackById` (already present at `social-feed.component.html:61` — verify it targets `post.id`)
**Why:** Prevents unbounded DOM growth. The render window approach works for variable-height items where CDK virtual scroll requires fixed height.
**Effort:** L (requires cursor migration P0.6 first + post cache P1.1 from Web roadmap)

### P0.8 — Fix Discover page: add pagination (currently unbounded)
**Components:** `fit-app/src/app/features/social/discover/social-discover.component.ts:61`, `.html:173`
**Current behavior:** `loadDiscover()` fetches all discover posts in a single unbounded call. All posts render in a flat grid `@for` with no sentinel and no load-more. No pagination parameters are sent to the backend.
**Change:** Add `discoverPage = signal(1)` to the facade. Add IntersectionObserver sentinel at the bottom of the discover grid (same pattern as feed). Send `page` + `pageSize=12` to `GET /api/social/discover`.
**Why:** Discover has no pagination — all posts load into the DOM at once. Same performance issue as the feed but worse because it starts with zero content and all fetched at once.
**Effort:** S

---

## P1 — Social Profile on Mobile

### P1.1 — Mobile hero redesign: athlete stat strip + demoted vanity metrics
**Components:** `fit-app/src/app/features/social/social-profile/social-profile.component.html`, `.css`
**Current behavior:** Hero order: avatar → name → Posts/Followers/Following counts → bio → action buttons. Profile leads with social vanity metrics (follower count) before any indication of athletic identity.
**Change (per UI/UX spec Section D):** New mobile hero order:
1. **Sport ID background wash**: `background: linear-gradient(180deg, rgba(124,77,255,0.07) 0%, transparent 100%)`
2. **Avatar + identity row** (flex): 80px avatar with permanent camera chip on own profile (24px circle, `var(--primary)` bg, `photo_camera` 14px — resolves hover-only unreachable action from audit), name (22px/800), verified badge, fitness goal badge pill
3. **Athlete Stat Strip** — 3 columns: STREAK / THIS MONTH WORKOUTS / TOTAL WORKOUTS. Numbers from existing `GET /api/users/{userId}/stats`. Number at 22px/800, label at 10px/700/UPPERCASE/`rgba(255,255,255,0.35)`.
4. **Bio** (14px/400, `rgba(255,255,255,0.7)`)
5. **Social stats compact row** (demoted): "42 Posts · 118 Followers · 54 Following" at 13px/400 — tappable words still open follow lists
6. **Activity Heatmap** (new — see P1.2)
7. **Achievement chips** (new — see P1.3)
8. **Tab row**
**Why:** Profile should communicate athletic identity in the first 3 seconds. Follower count is a vanity metric; workout consistency is the identity signal.
**Effort:** M

### P1.2 — Activity heatmap on profile (12-week contribution grid)
**Components:** `fit-app/src/app/features/social/social-profile/social-profile.component.html`, `.css`, `stats-tab.component.html`
**Current behavior:** No activity calendar exists. Stats tab has a volume chart and streak count but no visual consistency history.
**Change:** New 12-week contribution grid, CSS grid layout:
```css
display: grid;
grid-template-columns: repeat(12, 10px);
grid-template-rows: repeat(7, 10px);
gap: 2px;
```
Cell colors by workout count that day: 0→`rgba(255,255,255,0.05)`, 1→`rgba(124,77,255,0.25)`, 2→`rgba(124,77,255,0.50)`, 3+→`var(--primary)`. Overflow-x scrollable container so the grid is reachable on narrow screens.

**Data source:** Workout session dates from `GET /api/users/{userId}/stats` (`recentWorkouts`) for 12-week window. For own profile: can also use `GET /api/daily/history` for non-workout activity days.

**Privacy:** On other users' profiles, show workout day highlights only (no calorie/weight-based intensity — follows the existing `stats-privacy-note` pattern in the component).
**Why:** Strava and Hevy both use activity heatmaps. It creates loss aversion (users don't want visible gaps) and communicates consistency at a glance without numbers.
**Effort:** M

### P1.3 — Achievement chip row
**Components:** `fit-app/src/app/features/social/social-profile/social-profile.component.html`, `.css`
**Current behavior:** No badges or achievement markers on profiles. Users who have maintained a 30-day streak or logged 100 workouts have no visible recognition.
**Change:** Horizontal scroll chip row between heatmap and tab row. Chips for: 7-day streak (`local_fire_department`, amber), 30-day streak (`whatshot`, amber with border), first post (`photo_camera`, subtle), 10 workouts (`fitness_center`, purple-light), most active week (`trending_up`, green). Chip style: `border-radius: 999px; padding: 5px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em`. Each chip's color treatment matches its semantic category.

**Backend note:** Achievement logic must be computed server-side and returned as a `badges: string[]` array on the `UserSocialProfileResponse`. Alternatively, compute client-side from `GET /api/users/{userId}/stats` data on first pass (total workouts, streak history).
**Why:** Streak badges drive retention. MFP uses them for logging streaks. Hevy uses PR tracking. NovaFit has the data but shows none of it on profiles.
**Effort:** M

### P1.4 — Post grid touch actions (permanent 3-dot button)
**Components:** `fit-app/src/app/features/social/social-profile/social-profile.component.html`, `.css`
**Current behavior:** Edit/archive/delete on profile post grid items use `:hover` overlay (`opacity: 0` → `opacity: 1` on hover). On mobile, `:active` fallback fires only during finger-down, not on tap. Post grid actions are unreachable on touch devices.
**Change (per UI/UX spec Section D):** On mobile (`@media (max-width: 768px)`), show a permanent `more_horiz` 3-dot chip on each owned post cell:
```css
.profile-post-cell-menu-btn {
  position: absolute; top: 4px; right: 4px;
  width: 24px; height: 24px;
  background: rgba(0,0,0,0.4);
  border-radius: 4px;
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
```
Tapping opens a `MatBottomSheet` with Edit / Archive / Delete actions. The `:hover` overlay remains unchanged on web.
**Why:** Core profile management actions are unreachable on the primary device (mobile). This is a functional gap, not a polish issue.
**Effort:** S

---

## P1 — Real-time & Notifications

### P1.5 — SignalR: custom reconnect schedule + mobile network resilience
**Components:** `fit-app/src/app/core/services/chat-hub.service.ts:23`, `notification-hub.service.ts:23`
**Current behavior:** `.withAutomaticReconnect()` with no arguments uses the default schedule: 0s, 2s, 10s, 30s — then stops. A user who locks their phone for 45 seconds returns to a permanently dead SignalR connection with no feedback.
**Change:**
```typescript
.withAutomaticReconnect([0, 2000, 5000, 10000, 30000, 60000, 120000])
```
This extends reconnect attempts to 2+ minutes, covering typical phone screen-lock scenarios. Add `connection.onreconnecting(() => this.connectionStateSubject.next('reconnecting'))` and `connection.onreconnected(() => this.connectionStateSubject.next('connected'))`. Expose `connectionState$` from both hub services.
**Why:** Mobile browsers aggressively suspend network connections. Without this, every screen-lock → app open cycle silently kills real-time. Users miss DMs and notifications.
**Effort:** S

### P1.6 — "Reconnecting..." banner in social shell on mobile
**Components:** `fit-app/src/app/features/social/social-shell.component.html`, `.ts`
**Current behavior:** No UI feedback when SignalR is reconnecting. Users see live features silently go dead.
**Change:** Subscribe to `chatHub.connectionState$` in `SocialShellComponent`. When state is `'reconnecting'`, show a 28px banner below the top bar: `background: rgba(255,152,0,0.12); border-bottom: 1px solid rgba(255,152,0,0.2); padding: 6px 16px; font-size: 12px; color: #ff9800; display: flex; align-items: center; gap: 8px` with `sync` icon (animated spin) + "Reconnecting...". Banner dismisses automatically when state returns to `'connected'`.
**Why:** Without feedback, users think the app is broken. A reconnecting banner maintains trust.
**Effort:** S

### P1.7 — Notification badge system: dot vs number
**Components:** `app-bottom-nav.component.html`, `.css`
**Current behavior:** After P0.2, the Alerts and Messages tabs will have separate number badges. But the design spec calls for a **dot badge** variant for low-priority indicators (e.g., 1 new notification) vs. a **number badge** for 2+.
**Change:** Add `badge-dot` variant to the badge component: `width: 8px; height: 8px; border-radius: 50%; background: var(--accent); position: absolute; top: 6px; right: calc(50% - 18px)`. When `count === 1`, show dot. When `count >= 2`, show number. When `count === 0`, hide.
**Why:** A number badge for a single notification is visually heavy. The dot communicates "something new" without demanding urgency.
**Effort:** S

---

## P2 — Quick Actions & Logging

### P2.1 — Log action sheet (center tab)
**Components:** New `fit-app/src/app/shared/components/log-action-sheet/log-action-sheet.component.ts`
**Current behavior:** No unified multi-type quick-add entry point exists on mobile. Workout, meal, and daily entry creation each require separate navigation.
**Change:** `LogActionSheetComponent` opened by the center "Log" tab. `MatBottomSheet` with `panelClass: 'log-action-sheet-panel'`. Contents (per UI/UX spec Section A):
- "Post to Feed" → opens `CreateContentComponent` dialog
- TRACK section divider (10px/700/UPPERCASE)
- "Log Today" → `/user-dashboard`
- "Start Workout" → `/workouts`
- "Log Meal" → `/user-dashboard?section=nutrition`
- "Write Article" → opens `WriteArticleComponent` dialog

Item spec: 56px min-height, 40px icon container (`border-radius: 12px; background: rgba(255,255,255,0.04)`), 15px/600 label. Container: `border-radius: 24px 24px 0 0; padding: 20px 16px calc(20px + env(safe-area-inset-bottom))`.
**Why:** MFP's center "+" button is the gold standard for multi-type logging entry. Without this, creating any content requires 2+ taps of navigation.
**Effort:** M

### P2.2 — Post-completion reward screen: workout
**Components:** `fit-app/src/app/features/workouts/` (workout session completion flow)
**Current behavior:** After completing a workout, the user sees a success toast. No summary card, no sharing prompt, no reward moment.
**Change (ADR Fix 2 — DRAFT):** After `WorkoutSessionController` marks the session complete, navigate to a new `WorkoutCompletionCardComponent` route (`/workout-session/:id/complete`). The card shows:
- Session title + type icon
- Duration + total volume
- Exercise breakdown (top 3 exercises with sets × reps @ weight)
- PR badge if any exercise hit a new personal best
- Two CTAs: **"Share to beSocial"** (calls `POST /api/social/posts/from-workout/{sessionId}`, opens share preview) and **"Done"** (navigates to dashboard)

The card uses a glass surface background with a subtle `var(--primary)` glow: `box-shadow: 0 0 32px rgba(124,77,255,0.12)`.
**Why:** The post-action moment (when a user is most motivated) is the highest-leverage moment for content creation AND habit loop closure. This is the #1 missing retention mechanic identified by the product strategist.
**Effort:** M (backend endpoint expansion required — P4.5 from Web roadmap)

### P2.3 — Post-completion reward screen: meal
**Components:** `fit-app/src/app/features/user/nutrition-tab/` (meal logging completion flow)
**Current behavior:** Logging a meal shows a success toast. No feedback, no sharing prompt.
**Change:** After saving a meal entry with 1+ food items, show `MealCompletionFeedbackComponent` (this component exists already per git status — verify its current state). The component should show meal name, macro summary (protein/carbs/fats as colored bars), and a share CTA calling `POST /api/social/posts/from-meal/{mealId}`.

**Privacy guardrail (critical):** The shared post MUST NOT include calorie totals, macros, or any weight-derived metrics. Only meal name and food item names. This follows the existing `ShareToSocialData` privacy framework in `social.model.ts`.
**Why:** Logging meals → sharing to social → followers comment → social proof loops drive nutrition logging habit retention.
**Effort:** S (component shell exists, needs completion logic)

### P2.4 — Swipe-to-like gesture on post-card (optional P2)
**Components:** `fit-app/src/app/features/social/components/post-card/post-card.component.ts`, `.html`
**Current behavior:** Like requires tapping the heart icon button. No gesture support.
**Change:** Add a `TouchStart` + `TouchEnd` horizontal swipe detector to `PostCardComponent`. A rightward swipe of 60px+ triggers the like action with a brief heart animation (`scale(1.4) → scale(1.0)`, 0.2s). Visual feedback: a translucent heart appears at the swipe position and fades.
**Implementation note:** Use the Pointer Events API directly (no library dependency) to avoid adding bundle weight. The swipe detector must distinguish horizontal swipe from vertical scroll — only activate if `deltaX > 60px && Math.abs(deltaY) < 30px`.
**Why:** Tinder-style swipe-to-like dramatically increases engagement rate. Every post seen becomes an effortless micro-engagement opportunity.
**Effort:** M

---

## P2 — AI on Mobile

### P2.5 — Resolve AI chat FAB vs daily panel FAB stacking conflict
**Components:** `fit-app/src/app/core/components/ai-chat-fab/ai-chat-fab.component.css`, `fit-app/src/app/features/social/social-shell.component.css` (daily panel FAB)
**Current behavior:** The AI chat FAB (`ai-chat-fab.component`) positions at `bottom: calc(var(--nav-height) + env(safe-area-inset-bottom) + 8px)`. The social shell's daily panel toggle FAB also positions at `bottom: calc(var(--nav-height) + env(safe-area-inset-bottom) + 8px)`. Both sit at the exact same position → overlap in the bottom-right corner.
**Change:** Offset the AI chat FAB when inside the social shell. On `/social/*` routes, apply an additional `bottom` offset: `bottom: calc(var(--nav-height) + env(safe-area-inset-bottom) + 72px)` — stacking AI FAB above the daily panel FAB with 8px gap. Alternatively, hide the daily panel FAB when the AI chat sheet is open.
**Why:** Two FABs in the same position at the same Z-index creates an invisible tap conflict. Users tapping the AI FAB may accidentally open the daily panel.
**Effort:** S

### P2.6 — Meal analyzer camera flow polish
**Components:** `fit-app/src/app/features/dashboard/components/ai-meal-analyzer/ai-meal-analyzer.component.ts`, `.html`
**Current behavior:** Meal analyzer accepts a base64 image via file input. On mobile, this triggers the system camera picker. The flow is functional but has no guidance, no progress feedback during Groq inference, and no retry on failure.
**Change:**
- Add an onboarding tooltip on first use: "Take a photo of your meal for instant nutrition analysis"
- Show a scanning animation (pulsing overlay on the selected image) while Groq processes (typically 3–5 seconds)
- Show an error state with retry CTA if the AI returns no recognized food items
- Add haptic feedback (`navigator.vibrate(50)`) on successful analysis
**Why:** The meal photo analyzer is a genuine differentiator vs Strava and Hevy. It should feel like a premium feature, not a file upload form.
**Effort:** S

---

## P3 — Onboarding Conversion

### P3.1 — Add social discovery step between "Your Numbers" and first action
**Components:** `fit-app/src/app/features/onboarding/` (new `onboarding-social-discovery.component.ts`)
**Current behavior:** Onboarding ends at "Your Numbers Reveal" with CTAs: "Start your first workout" (→`/plans`) and "Log your first meal" (→`/user-profile?tab=nutrition`). No social path. Users follow nobody. They arrive at an empty feed. The guided empty state is a band-aid for a problem solvable in onboarding.
**Change (ADR Fix 4 — DRAFT):** Add step `onboarding/connect` after `onboarding/your-numbers`. New `OnboardingSocialDiscoveryComponent`:
- Headline: "Find your crew" (22px/800)
- Subtitle: "Follow athletes with similar goals to see their progress in your feed." (15px/400, `rgba(255,255,255,0.6)`)
- Grid of 5–8 suggested users from `GET /api/social/discover/suggested` (endpoint already implemented). Each card: 56px avatar, name, fitness goal badge, inline "Follow" toggle
- "Follow All" button above the grid (calls follow for all 5–8 simultaneously)
- "Skip for now →" text link below the grid
- CTA: "Start BeSocial" → routes to `/social` (NOT `/plans` or `/user-profile`)

**Update `your-numbers-reveal.component.ts:134,139`:** Change CTAs to route to `/onboarding/connect` instead of directly to `/plans` and `/user-profile`. The onboarding flow is now: carousel → biometrics → your-numbers → connect → `/social`.
**Why:** The #3 highest-impact feature per product strategist. Cost is very low (endpoint exists, suggested users UI exists in guided empty state — lift into onboarding). Impact is immediate: every new user arrives at a populated feed.
**Effort:** S

### P3.2 — Remove competing `OnboardingWizardComponent`
**Components:** `fit-app/src/app/features/onboarding/` (check for `onboarding-wizard.component.*`)
**Current behavior:** Two separate onboarding implementations exist: a `MatDialogRef`-based 4-step wizard AND the page-based route flow. Both call `UserFacade.saveUserProfile()`.
**Change:** Verify which one is currently wired to routing (`app.routes.ts`). The route-based flow is the one connected. Delete the wizard component files entirely unless they are actively triggered from somewhere.
**Why:** Two competing onboarding flows cause confusion about which one is canonical. Data saved by the wizard may not trigger the same post-onboarding navigation logic as the route-based flow.
**Effort:** S

### P3.3 — Fix "Your Numbers" CTA deep links
**Components:** `fit-app/src/app/features/onboarding/your-numbers/your-numbers-reveal.component.ts:134,139`
**Current behavior:** "Log your first meal" navigates to `/user-profile` with `queryParams: { tab: 'nutrition' }`. The `UserPageComponent` likely does not support query param-based tab activation — this is probably a broken deep link that drops the user on the default profile tab.
**Change:** After adding the connect step (P3.1), both CTAs route to `/onboarding/connect`. The meal/workout first-action prompt moves to after the social discovery step as a secondary optional action, not the primary CTA. If the deep link must remain for any path, verify `UserPageComponent` handles `?tab=nutrition` via `ActivatedRoute.queryParams`.
**Why:** Broken navigation in onboarding creates a silent failure that users interpret as a crash.
**Effort:** S

### P3.4 — Add biometrics skip option
**Components:** `fit-app/src/app/features/onboarding/biometrics/onboarding-biometrics.component.html`
**Current behavior:** All biometrics fields are required. No skip path. Users who don't want to share weight/height are forced to enter values or abandon onboarding.
**Change:** Add a "Skip for now →" text link at the bottom of the biometrics form. Skipping marks the `biometrics_complete` step (with null values) in the onboarding progress tracker and routes to `your-numbers` with a limited reveal (shows only goal message, not TDEE/BMI since data is unavailable). Users can complete biometrics later in their profile.
**Why:** Friction at biometrics → abandonment. Some users are privacy-sensitive about weight. A skip path preserves conversion.
**Effort:** S

### P3.5 — Add imperial/metric unit preference
**Components:** `fit-app/src/app/features/onboarding/biometrics/onboarding-biometrics.component.html`, `.ts`, `FitApp.Api/Models/Entities/User.cs`
**Current behavior:** Biometrics form assumes metric (cm, kg). No unit toggle exists. US users entering imperial values (feet/inches, pounds) will get wrong TDEE calculations.
**Change:** Add a toggle (`metric` / `imperial`) at the top of the biometrics form. When imperial is selected: height shows two fields (feet + inches), weight field shows "lbs". Convert to metric before saving (`UserProfile` stores cm and kg). Save the user's preferred unit to `User.UnitPreference` (new `enum UnitPreference { Metric, Imperial }` column — requires migration).
**Why:** US market is majority imperial. Wrong TDEE calculations from imperial-to-metric conversion errors cause users to distrust the app's calorie guidance.
**Effort:** M (EF migration required)

---

## P3 — PWA Readiness

### P3.6 — Add PWA manifest and service worker
**Files:** `fit-app/src/manifest.webmanifest` (create), `fit-app/angular.json` (register service worker)
**Current behavior:** No PWA manifest exists. The app cannot be installed as a home screen app on iOS or Android. No service worker means no offline support and no push notification infrastructure.
**Change:** Add `@angular/pwa` via `ng add @angular/pwa`. Configure:
```json
{
  "name": "NovaFit",
  "short_name": "NovaFit",
  "theme_color": "#7c4dff",
  "background_color": "#0d0d10",
  "display": "standalone",
  "icons": [...]
}
```
Service worker strategy: Network-first for API calls, Cache-first for static assets. Offline fallback page when API is unreachable.
**Why:** PWA install prompt is the lowest-cost mobile app acquisition channel. "Add to Home Screen" users have significantly higher retention than browser users.
**Effort:** S

### P3.7 — Tighten build budgets
**Files:** `fit-app/angular.json:46-50`
**Current behavior:** `maximumWarning: "1MB"` / `maximumError: "2MB"`. A 2MB initial bundle would pass CI without error — catastrophic for a 4G connection (2MB = ~8 seconds on average 4G).
**Change:**
```json
{ "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" }
```
**Why:** Safety net against bundle regressions. After P0 lazy-loading changes, the initial bundle should be well under 500KB gzipped. Tightening the budget catches future regressions in CI.
**Effort:** S (trivial config change)

### P3.8 — PWA push notification token registration endpoint
**Files:** `FitApp.Api/Controllers/` (new `PushController.cs`), `FitApp.Api/Models/Entities/` (new `PushSubscription` entity)
**Current behavior:** No endpoint exists to store a web push subscription object. Required before any background push delivery can be implemented.
**Change:** Add `POST /api/push/subscribe` (stores `PushSubscription` JSON per user) and `DELETE /api/push/subscribe` (unregisters). New `PushSubscription` entity: `UserId`, `Endpoint`, `P256DH`, `Auth`, `CreatedAt`. No push delivery logic required in this step — just the registration infrastructure.
**Why:** Prerequisite for streak-break warnings, new DM notifications, and challenge updates delivered when the app is closed. Without this, PWA notifications are impossible regardless of manifest/service worker work.
**Effort:** M (new entity + migration)

---

## Image Optimization (P0 — applies to both Mobile and Web)

### IMG.1 — Fix avatar images missing lazy-loading and dimensions
**Components:** `fit-app/src/app/features/social/components/post-card/post-card.component.html:15-18`, `social-discover.component.html:133,55`
**Current behavior:** Post-card avatars and discover avatars have no `loading="lazy"` and no explicit `width`/`height`. Browser cannot reserve layout space → Cumulative Layout Shift (CLS) on every scroll position.
**Change:** Add `loading="lazy" width="40" height="40"` to all avatar `<img>` elements. For variable-size avatars (profile hero: 80px), add CSS `aspect-ratio: 1; width: 80px` to the container.
**Why:** Eliminating avatar CLS typically reduces layout shift score from failing (>0.1) to near zero. Low effort, high Core Web Vitals impact.
**Effort:** S

### IMG.2 — Add `decoding="async"` and aspect-ratio wrapper to post images
**Components:** `post-card.component.html:106`
**Current behavior:** Post images lack a fixed aspect-ratio container. The browser must reflow layout as each image loads, causing visible scroll jumps.
**Change:** Wrap post image in `<div class="post-image-wrapper">` with `aspect-ratio: 4/3; width: 100%; overflow: hidden`. Add `decoding="async"` to the `<img>`. The aspect-ratio wrapper reserves the correct height before the image loads, eliminating reflow.
**Why:** Eliminates the second largest CLS contributor after avatar images. `decoding="async"` moves JPEG decode off the main thread — reduces Interaction to Next Paint (INP) during scroll.
**Effort:** S

---

_Document B complete. See `web-refactoring-roadmap.md` for Document A._
