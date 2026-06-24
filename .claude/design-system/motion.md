# NovaFit Design System -- Motion System

**Author:** @design-system-architect
**Date:** 2026-06-04
**Consumers:** @uiux-designer, @angular-developer
**Depends on:** `tokens.md` (motion tokens must be merged first)

---

## Motion Philosophy

Motion in NovaFit serves three purposes:
1. **Orientation** -- tells the user where they are and what changed
2. **Feedback** -- confirms an action was registered
3. **Reward** -- celebrates achievements and builds habit loops

Every animation must pass the "gym test": a user at the gym, mid-set, with sweaty hands and divided attention, should never feel like the UI is getting in the way. This means: short durations, purposeful motion, and no animation that blocks interaction.

**Reference:** Material 3 motion guidelines (emphasized easing), Apple HIG motion principles (fluid, continuous, purposeful).

---

## SECTION 1 -- Motion Budget (Canonical)

| Category | Duration Token | Duration Value | Easing Token | Easing Value | Use Cases |
|----------|---------------|---------------|--------------|--------------|-----------|
| Micro | `--duration-micro` | `150ms` | `--ease-standard` | `ease-out` | Hover, tap, color change, icon toggle, opacity shift |
| Standard | `--duration-standard` | `250ms` | `--ease-standard` | `ease-out` | Card enter, toggle, state change, dropdown open |
| Emphasis | `--duration-emphasis` | `350ms` | `--ease-decelerate` | `cubic-bezier(0.0, 0.0, 0.2, 1)` | Page entrance, slideUp, significant reveals |
| Data | `--duration-data` | `250ms` | `--ease-standard` | `ease-out` | Skeleton to content, number settle |
| Celebration | `--duration-celebration` | `600ms` | `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Ring close, streak milestone, PR, goal completion |
| Exit | `--duration-standard` | `250ms` | `--ease-accelerate` | `cubic-bezier(0.4, 0.0, 1, 1)` | Element removal, bottom sheet dismiss |

**Hard limit:** No transition exceeds 400ms except celebrations (600ms max) and progress ring initial fill (1200ms -- justified below).

---

## SECTION 2 -- Existing Keyframes (Audit & Disposition)

### Global Keyframes (styles.css)

| Keyframe | Definition | Duration Used | Disposition |
|----------|-----------|---------------|-------------|
| `slideUp` | `translateY(18px) + opacity 0 -> 0` | `0.35s ease-out` | **KEEP** -- canonical page/card entrance |
| `fadeIn` | `opacity 0 -> 1` | varies | **KEEP** -- backdrop, overlay entrance |
| `pulse` | `opacity 1 -> 0.45 -> 1` | `1.5s infinite` | **KEEP** -- skeleton loading state |

### Component-Local Keyframes (duplicates of global)

| Keyframe | Files Defining It | Disposition |
|----------|-------------------|-------------|
| `slideUp` (duplicate) | `social-notifications.component.css`, `social-post-detail.component.css`, `login.component.css`, `register.component.css`, `social-profile.component.css`, `social-chat.component.css`, `social-discover.component.css`, `social-feed.component.css`, `social-chat-detail.component.css` | **REMOVE duplicates** -- use global from `styles.css`. Angular encapsulation means these re-declarations work but create maintenance debt. Since `slideUp` is defined globally, the local copies are redundant for components using `ViewEncapsulation.None` or accessed via `animation` property shorthand. For encapsulated components, keep only if the global `@keyframes` is not accessible. |
| `fadeIn` (duplicate) | `header.component.css`, `stats-tab.component.css`, `social-chat-detail.component.css` | **REMOVE duplicates** |
| `pulse` (duplicate) | `social-notifications.component.css`, `social-post-detail.component.css`, `login.component.css`, `register.component.css`, `social-profile.component.css`, `social-discover.component.css`, `social-feed.component.css`, `guided-empty components`, `stats-tab.component.css`, `nutrition-guided-empty.component.css` | **REMOVE duplicates** |

### Component-Specific Keyframes (keep)

| Keyframe | File | Duration | Purpose | Disposition |
|----------|------|----------|---------|-------------|
| `msgIn` | groq.component.css | `0.25s ease-out` | Chat message entrance | **KEEP** |
| `bounce` | groq.component.css | `1.2s infinite` | AI typing dots | **KEEP** |
| `slideIn` | header.component.css | `0.22s` | Mobile drawer slide | **KEEP** |
| `timer-slide-down` | active-workout-session.component.css | implied | Rest timer entrance | **KEEP** |
| `timer-slide-up` | active-workout-session.component.css | implied | Rest timer exit | **KEEP** |
| `streak-flame-flicker` | streak-badge.component.css | `var(--flame-speed)` | Flame icon animation | **KEEP** |
| `streak-at-risk-pulse` | streak-badge.component.css | implied | At-risk warning | **KEEP** |
| `streak-new-record-glow` | streak-badge.component.css | implied | New record celebration | **KEEP** |
| `streak-count-bump` | streak-badge.component.css | implied | Count increment | **KEEP** |
| `completion-backdrop-in` | workout-completion-card.component.css | implied | Workout complete backdrop | **KEEP** |
| `completion-card-in` | workout-completion-card.component.css | implied | Workout card reveal | **KEEP** -- model for other celebrations |
| `completion-card-dismiss` | workout-completion-card.component.css | implied | Card exit | **KEEP** |
| `completion-tile-pop` | workout-completion-card.component.css | implied | Stat tile pop-in | **KEEP** |
| `set-row-collapse` | workout-set-row.component.css | implied | Set deletion | **KEEP** |
| `set-row-check-pop` | workout-set-row.component.css | implied | Set complete check | **KEEP** |
| `set-btn-press` | workout-set-row.component.css | implied | Button press feedback | **KEEP** |
| `flame-pulse` | dashboard.component.css | `1.5s infinite` | Dashboard streak flame | **KEEP** |
| `spin` | daily-user-data.component.css | `1s linear infinite` | Auto-save spinner | **KEEP** |
| `meal-feedback-collapse` | meal-completion-feedback.component.css | implied | Feedback dismiss | **KEEP** |
| `sbs-icon-pop` | share-to-social.component.css | implied | Share success icon | **KEEP** |
| `acbs-bounce` | ai-chat-bottom-sheet.component.css | implied | AI typing dots | **KEEP** |
| `acbs-msg-in` | ai-chat-bottom-sheet.component.css | implied | AI message entrance | **KEEP** |
| `fab-entrance` | ai-chat-fab.component.css | implied | FAB entrance | **KEEP** |
| `fab-glow-pulse` | ai-chat-fab.component.css | implied | FAB glow | **KEEP** |
| `shimmer` | social-chat.component.css, social-chat-detail.component.css, article-detail.component.css | implied | Loading shimmer | **KEEP** -- standardize across files |
| `heartbeat` | footer.component.css | `1.5s infinite` | Footer heart | **KEEP** |
| `ob-phone-float` | onboarding-carousel.component.css | implied | Onboarding animation | **KEEP** |
| `ob-bar-grow` | onboarding-carousel.component.css | implied | Onboarding progress | **KEEP** |
| `orbFloat1/2` | login/register/onboarding | implied | Background orbs | **KEEP** |
| `scan-line` | ai-meal-analyzer.component.css | implied | AI scan effect | **KEEP** |
| `backdropIn` | social-shell.component.css | implied | Shell backdrop | **KEEP** |
| `daily-pulse` | social-daily-panel.component.css | implied | Daily panel highlight | **KEEP** |
| `sug-pulse` | suggested-users.component.css | implied | Suggested user highlight | **KEEP** |
| `sb-flame-pulse` | user-page.component.css | implied | Sidebar streak flame | **KEEP** |
| `reg-goal-shake` | register.component.css | implied | Goal selection feedback | **KEEP** |

---

## SECTION 3 -- New Keyframes Required for Redesign

### 3.1 Progress Ring Fill

```css
@keyframes ringFill {
  from {
    stroke-dashoffset: var(--ring-circumference);
  }
  to {
    stroke-dashoffset: var(--ring-target-offset);
  }
}
```

**Usage:** ProgressRing component initial render
**Duration:** `1200ms`
**Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (Material emphasized-decelerate)
**Justification for exceeding 400ms budget:** This is a data visualization animation, not a UI transition. The ring fill is the hero moment of the Dashboard -- it answers "how am I doing today?" and must feel satisfying, not instant. Apple Activity Rings use approximately 1.5s for their fill animation. Our 1.2s is conservative by comparison.
**Trigger:** First render only. Subsequent data updates use CSS `transition` at `var(--duration-standard)`.

### 3.2 Number Counter Roll

```css
/* Not a CSS keyframe -- implemented via requestAnimationFrame in TypeScript */
```

**Implementation:**
```typescript
function animateCounter(
  element: HTMLElement,
  from: number,
  to: number,
  duration: number = 800,
  easing: (t: number) => number = (t) => 1 - Math.pow(1 - t, 3) // ease-out cubic
): void {
  const start = performance.now();
  const update = (now: number) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(progress);
    const current = Math.round(from + (to - from) * easedProgress);
    element.textContent = current.toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}
```

**Usage:** Dashboard metric values (calories, water ml, steps, Today Score percentage), ProgressRing center value
**Duration:** `800ms`
**Easing:** Ease-out cubic (decelerate -- numbers settle into final value)
**Trigger:** First render, and when value changes by more than 5% of the target

### 3.3 Ring Close Celebration

```css
@keyframes ringClose {
  0% {
    filter: drop-shadow(0 0 0 transparent);
  }
  50% {
    filter: drop-shadow(0 0 16px var(--ring-glow-color));
    stroke-width: 10;
  }
  100% {
    filter: drop-shadow(0 0 4px var(--ring-glow-color));
    stroke-width: 8;
  }
}
```

**Usage:** When a progress ring reaches 100%
**Duration:** `var(--duration-celebration)` (600ms)
**Easing:** `var(--ease-spring)`
**Trigger:** `percentage` signal crosses from <100 to 100
**Additional:** Optional confetti burst (lightweight, CSS-only or a small library). If confetti is too heavy, the glow pulse alone is sufficient.

### 3.4 All Rings Complete (Day Complete)

```css
@keyframes dayComplete {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1.05);
  }
  60% {
    transform: scale(0.98);
  }
  100% {
    transform: scale(1);
  }
}
```

**Usage:** When ALL three rings (calorie, water, activity) are at 100%
**Duration:** `var(--duration-celebration)` (600ms)
**Easing:** Built into keyframes (spring-like)
**Trigger:** All three ring completion signals are true simultaneously
**Visual:** A "Day Complete!" overlay/toast slides in above the rings. Green glow. Auto-dismisses after 3 seconds.

### 3.5 Streak Milestone

```css
@keyframes streakMilestone {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 var(--celebration-glow);
  }
  25% {
    transform: scale(1.15);
    box-shadow: 0 0 24px 8px var(--celebration-glow);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 16px 4px var(--celebration-glow);
  }
  75% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 transparent;
  }
}
```

**Usage:** Streak badge when streak hits 7, 30, 60, 100, 365 days
**Duration:** `var(--duration-celebration)` (600ms)
**Easing:** Built into keyframes
**Trigger:** `streak.current` equals a milestone value AND `streak.isNew` is true

### 3.6 Personal Record

```css
@keyframes personalRecord {
  0% {
    background: transparent;
    border-color: var(--border-default);
  }
  30% {
    background: var(--celebration-gold-bg);
    border-color: var(--celebration-gold);
    transform: scale(1.02);
  }
  100% {
    background: var(--celebration-gold-bg);
    border-color: rgba(251, 191, 36, 0.15);
    transform: scale(1);
  }
}
```

**Usage:** Workout completion card when a new max weight or best time is detected
**Duration:** `var(--duration-celebration)` (600ms)
**Easing:** `var(--ease-spring)`
**Trigger:** Backend returns `isPR: true` in workout completion response

### 3.7 Reaction Pop

```css
@keyframes reactionPop {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.3);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
  }
}
```

**Usage:** When a user taps a reaction button on a feed card
**Duration:** `var(--duration-standard)` (250ms)
**Easing:** Built into keyframes
**Trigger:** Reaction button `(click)` event

### 3.8 Macro Bar Fill

```css
@keyframes macroBarFill {
  from {
    width: 0%;
  }
  to {
    width: var(--bar-fill-width);
  }
}
```

**Usage:** Macro progress bars on Dashboard (protein, carbs, fat)
**Duration:** `600ms` (same timing class as ring fill, but shorter)
**Easing:** `var(--ease-standard)` (ease-out)
**Trigger:** First render only. Subsequent updates use CSS `transition: width var(--duration-standard) var(--ease-standard)`.

### 3.9 Card Stagger Enter

Not a keyframe but a pattern using `animation-delay`:

```css
.metric-card:nth-child(1) { animation-delay: 0ms; }
.metric-card:nth-child(2) { animation-delay: 50ms; }
.metric-card:nth-child(3) { animation-delay: 100ms; }
.metric-card:nth-child(4) { animation-delay: 150ms; }
.metric-card:nth-child(5) { animation-delay: 200ms; }
.metric-card:nth-child(6) { animation-delay: 250ms; }
```

**Usage:** MetricCards entering the Dashboard grid, feed cards entering the social feed
**Base animation:** `slideUp`
**Stagger interval:** `50ms` per card
**Max stagger:** `250ms` (5 cards). Cards beyond 5 use 250ms (no further stagger).

### 3.10 Bottom Sheet Enter/Exit

```css
@keyframes sheetEnter {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes sheetExit {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(100%);
    opacity: 0.5;
  }
}
```

**Usage:** All BottomSheet instances
**Enter duration:** `var(--duration-emphasis)` (350ms)
**Enter easing:** `var(--ease-decelerate)`
**Exit duration:** `var(--duration-standard)` (250ms)
**Exit easing:** `var(--ease-accelerate)`

---

## SECTION 4 -- Page Transition System

### Current State
All pages use the `slideUp` animation (`opacity 0->1, translateY 18px->0, 0.35s ease-out`). This is applied via Angular component host animation or CSS `animation` property.

### Recommendation: KEEP `slideUp` as the default page transition.

**Rationale:**
- Apple Fitness+ uses a similar bottom-to-top entrance for card-based layouts
- Strava uses fade + slide-up for feed refreshes
- The 0.35s duration matches our `--duration-emphasis` budget
- The 18px translate distance is small enough to feel fast but large enough to communicate direction
- Changing page transitions mid-product creates inconsistency risk for no UX gain

**One modification:** Add `--ease-decelerate` instead of `ease-out` for slightly more polished feel:
```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
/* Usage: animation: slideUp var(--duration-emphasis) var(--ease-decelerate); */
```

---

## SECTION 5 -- Data State Transitions

### 5.1 Skeleton to Loaded Content

**Current:** Skeleton elements use `animation: pulse 1.5s ease-in-out infinite` which is a simple opacity fade. When data loads, the skeleton is replaced by the content with no crossfade.

**Recommendation:** Add a `fadeIn` transition on the loaded content:
```css
.content-loaded {
  animation: fadeIn var(--duration-data) var(--ease-standard);
}
```
The skeleton disappears instantly (via `@if` / `*ngIf`), and the real content fades in over 250ms. This is cheaper than a crossfade and matches Material 3's "reveal" pattern.

### 5.2 Empty State Entrance

**Current:** Empty states appear instantly when data loads and is empty.

**Recommendation:** Use `slideUp` at `var(--duration-emphasis)`:
```css
.empty-state {
  animation: slideUp var(--duration-emphasis) var(--ease-decelerate);
}
```

---

## SECTION 6 -- Micro-Interaction Catalog

### Hover (Desktop Only)

| Element | Property | Value | Duration | Easing |
|---------|----------|-------|----------|--------|
| Card (metric, post, etc.) | `transform` | `translateY(-4px)` | `var(--duration-standard)` | `var(--ease-standard)` |
| Card border | `border-color` | `var(--border-strong)` | `var(--duration-micro)` | `var(--ease-standard)` |
| Card shadow | `box-shadow` | `var(--shadow-card-hover)` | `var(--duration-standard)` | `var(--ease-standard)` |
| Primary button | `transform` | `translateY(-1px)` | `var(--duration-micro)` | `var(--ease-standard)` |
| Primary button | `opacity` | `0.85` | `var(--duration-micro)` | `var(--ease-standard)` |
| Ghost button | `background` | `var(--surface-hover)` | `var(--duration-micro)` | `var(--ease-standard)` |
| Ghost button | `border-color` | `var(--border-strong)` | `var(--duration-micro)` | `var(--ease-standard)` |
| Icon button | `background` | `var(--surface-active)` | `var(--duration-micro)` | `var(--ease-standard)` |
| Nav link (side-nav) | `transform` | `translateX(3px)` | `var(--duration-micro)` | `var(--ease-standard)` |
| Nav link (side-nav) | `color` | `var(--text-primary)` | `var(--duration-micro)` | `var(--ease-standard)` |

### Tap/Press (Touch)

| Element | Property | Value | Duration | Easing |
|---------|----------|-------|----------|--------|
| MetricCard | `transform` | `scale(0.98)` | `var(--duration-micro)` | `var(--ease-standard)` |
| Any button | `transform` | `scale(0.96)` | `100ms` | `var(--ease-standard)` |
| Reaction button | `transform` (keyframe) | `scale(1) -> scale(1.3) -> scale(1)` | `var(--duration-standard)` | `reactionPop` keyframe |
| Feed card | None -- tap navigates, no press effect | | | |
| Like button | `color` | `var(--reaction-heart)` | `var(--duration-micro)` | `var(--ease-standard)` |

### Follow Button State Change

```css
/* Unfollowed -> Following */
.follow-btn--following {
  animation: followConfirm var(--duration-standard) var(--ease-spring);
}

@keyframes followConfirm {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.05); }
  100% { transform: scale(1); }
}
```

Duration: `var(--duration-standard)` (250ms)
Easing: `var(--ease-spring)`
Visual: Button text changes from "Follow" to "Following", background transitions from `var(--primary)` to `transparent` with `var(--border-default)` border. The transition uses `var(--duration-standard)`.

---

## SECTION 7 -- Transition Duration Consistency Violations (Current State)

The codebase uses 12 different duration values in component CSS:

| Duration | Count | Where |
|----------|-------|-------|
| `0.1s` | 1 | workout-set-row (btn press) |
| `0.12s` | 4 | workouts-content (menu items) |
| `0.15s` | 28 | Most micro transitions |
| `0.18s` | 12 | Ghost buttons, nav items |
| `0.2s` | 22 | Standard transitions |
| `0.22s` | 1 | header slideIn |
| `0.25s` | 6 | Onboarding, streak badge |
| `0.3s` | 7 | Footer, onboarding, carousel, move-up |
| `0.35s` | implied | slideUp animation |
| `0.4s` | 1 | Onboarding biometrics progress |
| `0.6s` | 1 | Macro bar fill |
| `1s` | 1 | Timer progress bar |
| `8s` | 1 | SVG timer animation |

**Target:** Collapse to 5 canonical durations using tokens:

| Replace | With Token | Token Value |
|---------|-----------|-------------|
| `0.1s`, `0.12s`, `0.15s` | `var(--duration-micro)` | `150ms` |
| `0.18s`, `0.2s`, `0.22s`, `0.25s` | `var(--duration-standard)` | `250ms` |
| `0.3s`, `0.35s`, `0.4s` | `var(--duration-emphasis)` | `350ms` |
| `0.6s` | `var(--duration-celebration)` | `600ms` |
| `1s`, `8s` | Keep as-is | Domain-specific (timer animations) |

**Migration note:** This is a Phase 2 change. Apply during the redesign sprint, not before. The visual difference between 0.15s and 0.18s is imperceptible, but consistency matters for maintenance.

---

## SECTION 8 -- Reduced Motion Support

Add to `styles.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Rationale:** WCAG 2.1 Success Criterion 2.3.3 (Animation from Interactions). Fitness apps are used by people with vestibular disorders. All celebration animations, ring fills, and page transitions must respect `prefers-reduced-motion`. This single media query handles it globally.

**Reference:** Apple HIG Accessibility -- Motion guidelines. Material 3 -- Reducing motion.
