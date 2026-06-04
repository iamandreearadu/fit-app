## UI Spec: Fix 4 — Onboarding Flow Redesign

**Author:** @uiux-designer
**Date:** 2026-06-02
**Audit reference:** Full Platform Audit § 1 — Onboarding Flow
**Contract reference:** `.claude/contracts/fix-4-onboarding.md`
**Implementation plan:** `.claude/plans/ux-audit-implementation-plan.md` — Fix 4, Sprint 3
**Status:** READY_FOR_IMPLEMENTATION

---

### User Story

As a new user opening FitApp for the first time, I want to see what the app will do for me
*before* I hand over my data, and then receive a genuinely surprising personalised result
at the end of setup — so that I feel motivated to complete the flow and start my first
real action inside the app.

---

### Audit Context — The Core Problem

Section 1 of the UX audit:

> "The current flow is Register → long profile form → app. Before the user sees a single
> piece of value, they must hand over 7+ fields. Drop-off risk is critical — 60–70%
> abandonment on progressive forms longer than 4 steps when there's no perceived payoff."
>
> "The most genuinely interesting feature NovaFit offers new users is the auto-calculated
> TDEE, BMI, BMR, and goal calorie target. These are personalised numbers that feel like
> magic when a user sees them for the first time."

The fix restructures onboarding into **5 screens in sequence**:

```
Carousel 1 → Carousel 2 → Registration → Biometrics → Your Numbers Reveal
   (value preview)           (minimal)     (form +       (aha moment +
                                           live TDEE)    first action)
```

---

### Route Architecture

```
/onboarding/carousel        → OnboardingCarouselComponent (2 slides, internal state)
/onboarding/biometrics      → OnboardingBiometricsComponent
/onboarding/your-numbers    → YourNumbersRevealComponent
```

The registration step lives at the **existing** `/auth/register` route — the goal selector
is added to that component, not a new route. After registration, the router redirects to
`/onboarding/carousel`. Existing users who have `onboardingCompleted === true` in the user
store are never redirected — the `OnboardingGuard` checks this before routing.

### Step → API Tracking

| UI screen | API step recorded | When |
|---|---|---|
| Carousel (both slides) | `carousel_seen` | On "Get started →" CTA tap (slide 2) |
| Biometrics | `biometrics_complete` | Automatically by `POST /api/onboarding/biometrics` |
| Your Numbers → CTA | `first_action_taken` | After user taps either first-action CTA |

---

### Shared Shell — All Onboarding Screens

All 5 screens share the same ambient background layer:

```css
/* .ob-page — root element for all onboarding screens */
min-height: 100dvh;
background: var(--surface);
position: relative;
overflow: hidden;
display: flex;
flex-direction: column;
```

**Ambient orb layer** (reuse pattern from existing auth screens):

```css
/* .ob-orb — base class */
position: absolute;
border-radius: 50%;
filter: blur(80px);
pointer-events: none;
z-index: 0;

/* Carousel + Registration: primary orb */
/* .ob-orb-1 */
width: 440px; height: 440px;
background: rgba(124, 77, 255, 0.18);
top: -120px; left: -80px;
animation: orbFloat1 22s ease-in-out infinite;

/* .ob-orb-2 */
width: 300px; height: 300px;
background: rgba(255, 64, 129, 0.12);
bottom: 40px; right: -80px;
animation: orbFloat2 26s ease-in-out infinite;
```

The `orbFloat1` and `orbFloat2` keyframes are already defined in the auth component CSS.
These must be duplicated into `onboarding-carousel.component.css` (component-scoped) rather
than added to `styles.css` — **no new global keyframes**.

---

---

## Screen 1 — Carousel Slide 1

**Component:** `OnboardingCarouselComponent`
**File:** `features/onboarding/carousel/onboarding-carousel.component.ts`
**Slide:** Index 0 of 2 — internal `currentSlide = signal(0)`
**Route:** `/onboarding/carousel`

---

### Layout

```
┌─────────────────────────────────────────────┐
│  [ambient orbs in bg]                       │
│                                             │
│  ┌─────────────────────────────────────┐    │   ← phone-frame mockup (centered top)
│  │  ┌──── mini-dashboard ────────────┐ │    │
│  │  │  🔥 12   NOVAFIT    📊        │ │    │
│  │  │  ─────────────────────────────  │ │    │
│  │  │  ┌────────┐  ┌────────────┐   │ │    │
│  │  │  │ 1,840  │  │  8,200     │   │ │    │
│  │  │  │ kcal   │  │  steps     │   │ │    │
│  │  │  └────────┘  └────────────┘   │ │    │
│  │  │  ─ Weekly Training ──────────  │ │    │
│  │  │  [▓▓▓░][▓▓▓▓░][▓░][▓▓▓▓▓░]  │ │    │
│  │  │  Mon   Tue   Wed   Thu       │ │    │
│  │  └─────────────────────────────  │ │    │
│  └─────────────────────────────────-┘ │    │
│                                       │    │
│         Track every rep,              │    │   ← headline
│         every meal, every day.        │    │
│                                       │    │
│    NovaFit turns your effort into     │    │   ← subheadline
│    insight — workouts, nutrition,     │    │
│    and habits unified in one place.   │    │
│                                       │    │
│    ●  ○                               │    │   ← progress dots (dot 1 active)
│                                       │    │
│         [ Next  → ]                   │    │   ← CTA
│                                       │    │
└─────────────────────────────────────────────┘
```

On desktop (≥ 768px): two-column layout — phone mockup left, text + dots + CTA right.

---

### Visual Spec — Phone Frame Mockup

```css
/* .ob-phone-frame */
width: 220px;
height: 400px;
border-radius: 36px;
border: 2px solid rgba(255, 255, 255, 0.12);
background: rgba(13, 13, 16, 0.9);
backdrop-filter: blur(24px);
-webkit-backdrop-filter: blur(24px);
overflow: hidden;
box-shadow:
  0 32px 80px rgba(0, 0, 0, 0.65),
  0 0 0 1px rgba(255, 255, 255, 0.04),
  0 0 60px rgba(124, 77, 255, 0.12);
position: relative;
animation: ob-phone-float 5s ease-in-out infinite;
flex-shrink: 0;
```

```css
/* Component-scoped keyframe */
@keyframes ob-phone-float {
  0%, 100% { transform: translateY(0) rotate(-1deg); }
  50%       { transform: translateY(-10px) rotate(1deg); }
}
```

**Mini-dashboard header bar inside frame:**
```css
/* .ob-mock-header */
height: 36px;
background: rgba(255, 255, 255, 0.03);
border-bottom: 1px solid rgba(255, 255, 255, 0.06);
display: flex;
align-items: center;
justify-content: space-between;
padding: 0 10px;
```
- Left: `local_fire_department` mat-icon (12px, `var(--accent)`) + `"12"` (10px, 700, white)
- Center: `"NOVAFIT"` text (9px, 800, white, letter-spacing 0.12em)
- Right: `bar_chart` mat-icon (12px, `rgba(255,255,255,0.3)`)

**Mini stat tiles row:**
```css
/* .ob-mock-stats */
display: grid;
grid-template-columns: 1fr 1fr;
gap: 5px;
padding: 8px 8px 0;
```

Each tile:
```css
/* .ob-mock-tile */
background: rgba(255, 255, 255, 0.04);
border: 1px solid rgba(255, 255, 255, 0.07);
border-radius: 8px;
padding: 7px 8px;
```
- Value: `font-size: 13px; font-weight: 800; color: var(--white);`
- Label: `font-size: 7px; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase;`

Tile 1: `"1,840"` / `"KCAL"` — Value animates from `"0"` to `"1,840"` on load.
Tile 2: `"8,200"` / `"STEPS"` — same.

**Mini chart section:**
```css
/* .ob-mock-chart-section */
padding: 8px;
```

Chart label: `"WEEKLY TRAINING"` — 7px, 600, `rgba(255,255,255,0.3)`, uppercase.

Chart bars (5 bars representing Mon–Fri):
```css
/* .ob-mock-bars */
display: flex;
align-items: flex-end;
gap: 4px;
height: 48px;
padding-top: 4px;
```

Each bar:
```css
/* .ob-mock-bar */
flex: 1;
border-radius: 3px 3px 0 0;
background: linear-gradient(to top, var(--primary), rgba(124, 77, 255, 0.5));
transform-origin: bottom;
animation: ob-bar-grow 0.6s ease-out forwards;
transform: scaleY(0);  /* initial state */
```

Five bars with different heights (`20px, 36px, 14px, 44px, 30px`) and animation delays
(`0ms, 120ms, 240ms, 360ms, 480ms`).

```css
@keyframes ob-bar-grow {
  from { transform: scaleY(0); opacity: 0.4; }
  to   { transform: scaleY(1); opacity: 1; }
}
```

**Mock streak pill** (bottom of frame):
```css
/* .ob-mock-streak */
margin: 8px;
padding: 5px 8px;
background: rgba(255, 64, 129, 0.1);
border: 1px solid rgba(255, 64, 129, 0.2);
border-radius: 6px;
display: flex;
align-items: center;
gap: 4px;
font-size: 8px;
font-weight: 700;
color: var(--accent);
```
Icon: `local_fire_department` (10px), Text: `"12-DAY STREAK"`

---

### Visual Spec — Carousel Content Block

**Headline:**
```css
/* .ob-carousel-headline */
font-size: clamp(28px, 4vw, 40px);
font-weight: 800;
color: var(--white);
letter-spacing: -1px;
line-height: 1.15;
margin-bottom: 12px;
```
Content: `"Track every rep, every meal, every day."`
Accent word: `"every"` — wrapped in a `<span>` with gradient text:
```css
background: linear-gradient(95deg, var(--primary), var(--accent));
-webkit-background-clip: text;
background-clip: text;
-webkit-text-fill-color: transparent;
```

**Subheadline:**
```css
/* .ob-carousel-sub */
font-size: 15px;
font-weight: 400;
color: rgba(255, 255, 255, 0.45);
line-height: 1.65;
max-width: 360px;
margin-bottom: 32px;
```
Content: `"NovaFit turns your effort into insight — workouts, nutrition, and daily habits unified in one place."`

---

### Visual Spec — Progress Dots

```css
/* .ob-dots */
display: flex;
align-items: center;
gap: 8px;
margin-bottom: 24px;
```

```css
/* .ob-dot */
width: 8px;
height: 8px;
border-radius: 50%;
background: rgba(255, 255, 255, 0.2);
transition: width 0.3s ease, background 0.3s ease;
```

```css
/* .ob-dot--active */
width: 24px;              /* pill-shaped when active */
border-radius: 4px;
background: var(--primary);
```

Two dots — dot 1 active on slide 1, dot 2 active on slide 2.

---

### Visual Spec — CTA Button (Slide 1)

```css
/* .ob-cta-btn — reuses .btn-submit pattern from auth screens */
height: 52px;
padding: 0 32px;
background: var(--primary);
border: none;
border-radius: 14px;
color: var(--white);
font-size: 15px;
font-weight: 700;
font-family: inherit;
display: inline-flex;
align-items: center;
gap: 8px;
cursor: pointer;
box-shadow: 0 4px 20px var(--primary-glow);
transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.15s ease;
```
```css
.ob-cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px var(--primary-glow);
}
```
Icon: `arrow_forward` mat-icon, 18px. Text: `"Next"`

**Slide transition on tap:** Slides transition using a CSS transform:
- Current slide: `translateX(0)` → `translateX(-100%)`, opacity 1 → 0, duration 0.3s ease-in
- Next slide: pre-positioned at `translateX(100%)` → `translateX(0)`, opacity 0 → 1, 0.3s ease-out

Use Angular's built-in `[@.disabled]` pattern or simple signal + CSS class toggle — no
third-party animation library.

---

### Entrance Animation

All carousel content enters via `slideUp` global keyframe (0.45s ease-out). Phone frame
uses a longer delay (0.2s) so content appears first, then the mockup floats up.

---

---

## Screen 2 — Carousel Slide 2

**Component:** Same `OnboardingCarouselComponent` — `currentSlide = signal(1)`

---

### Layout

Same shell as slide 1. Phone frame mockup changes content. Text changes.

```
         ┌─────────────────────────────────┐
         │  ┌─── mini-screen ────────────┐ │
         │  │  [app content blurred]     │ │
         │  │                            │ │
         │  │  ╔══════════════════╗      │ │
         │  │  ║ 💬 AI Chat       ║      │ │
         │  │  ║ ─────────────────║      │ │
         │  │  ║ How many kcal    ║      │ │
         │  │  ║ did I burn?      ║      │ │
         │  │  ║ ─────────────────║      │ │
         │  │  ║ [●●● typing...] ║      │ │
         │  │  ╚══════════════════╝      │ │
         │  │                       [✦]  │ │  ← purple FAB
         │  └────────────────────────────┘ │
         └─────────────────────────────────┘

      Your AI fitness coach,
      always on.

      Ask about your macros, get a workout
      plan, or analyse a meal photo.
      Context-aware intelligence, built in.

      ○  ●                [Get started →]
```

---

### Visual Spec — Phone Frame Content (Slide 2)

The frame shows a blurred app background with a bottom-sheet chat overlay and a FAB.

**Blurred background layer:**
```css
/* .ob-mock-bg-blur */
position: absolute;
inset: 0;
background: rgba(255, 255, 255, 0.02);
filter: blur(3px);
```
Populate with 3 faint horizontal lines (simulating list items) at `rgba(255,255,255,0.05)`.

**AI Chat bottom sheet overlay inside frame:**
```css
/* .ob-mock-chat */
position: absolute;
bottom: 0; left: 0; right: 0;
height: 200px;
background: rgba(13, 13, 16, 0.96);
border-radius: 12px 12px 0 0;
border-top: 1px solid rgba(255, 255, 255, 0.1);
padding: 10px 10px 8px;
display: flex;
flex-direction: column;
gap: 7px;
```

Chat messages inside (appear via `slideUp` with stagger):

**User message bubble:**
```css
/* .ob-mock-bubble-user */
align-self: flex-end;
background: var(--primary);
border-radius: 12px 12px 2px 12px;
padding: 5px 8px;
font-size: 9px;
font-weight: 500;
color: var(--white);
max-width: 80%;
animation: slideUp 0.35s ease-out 0.4s both;
```
Text: `"How many kcal did I burn today?"`

**AI typing indicator** (appears 0.8s after user bubble):
```css
/* .ob-mock-bubble-ai */
align-self: flex-start;
background: rgba(255, 255, 255, 0.06);
border-radius: 12px 12px 12px 2px;
padding: 7px 10px;
display: flex;
gap: 3px;
align-items: center;
animation: slideUp 0.3s ease-out 0.8s both;
```
Three dots:
```css
/* .ob-mock-typing-dot */
width: 4px; height: 4px;
border-radius: 50%;
background: rgba(255, 255, 255, 0.5);
animation: bounce 1.2s ease-in-out infinite;
```
Dot 1: `animation-delay: 0ms`, Dot 2: `0.2s`, Dot 3: `0.4s`.
(Reuses global `bounce` keyframe.)

After 2.5s (setTimeout in component): typing dots fade out, AI response text fades in:
```
"Based on your 47-min strength session,
you burned approx. 285 kcal. 💪"
```

**Floating FAB:**
```css
/* .ob-mock-fab */
position: absolute;
bottom: 72px; right: 10px;
width: 36px; height: 36px;
border-radius: 50%;
background: var(--primary);
box-shadow: 0 4px 14px var(--primary-glow);
display: flex; align-items: center; justify-content: center;
animation: pulse 2s ease-in-out infinite;
```
Icon: `auto_awesome` (sparkle) mat-icon, 16px, white.

---

### Slide 2 Content Block

**Headline:** `"Your AI fitness coach, always on."`
Accent word: `"AI"` — gradient text (same as slide 1).

**Subheadline:** `"Ask about your macros, get a workout plan, or analyse a meal photo. Context-aware intelligence, built right in."`

**CTA Button (slide 2 — "Get started"):**
- Text: `"Get started"`, Icon: `arrow_forward`
- On tap: call `facade.recordStep('carousel_seen')` (fire-and-forget, non-blocking) → navigate to `/auth/register`
- Same `.ob-cta-btn` styles as slide 1 CTA

**Skip link** (top right, slide 2 only):
```css
/* .ob-skip-link */
position: absolute;
top: 24px; right: 24px;
font-size: 13px;
font-weight: 500;
color: rgba(255, 255, 255, 0.35);
background: none;
border: none;
cursor: pointer;
text-decoration: none;
transition: color 0.15s ease;
z-index: 10;
min-height: 48px;
display: flex;
align-items: center;
padding: 0 8px;
```
```css
.ob-skip-link:hover { color: rgba(255, 255, 255, 0.65); }
```
Text: `"Skip"`. On tap: same as "Get started" — records step, navigates to register.

---

### States — Carousel Component

| State | Visual |
|---|---|
| **Slide 1** | `currentSlide() === 0` — slide 1 content visible, dot 1 active |
| **Transitioning** | Slide 1 exits left (0.3s), slide 2 enters right (0.3s) |
| **Slide 2** | `currentSlide() === 1` — slide 2 content visible, dot 2 active, "Skip" link visible |
| **Recording step** | Non-visual — `recordStep()` fires but does not block navigation |

---

---

## Screen 3 — Registration Screen (Modified)

**Component:** `RegisterComponent` — existing component, extended
**File:** `features/auth/register/register.component.ts` — MODIFIED
**Route:** `/auth/register` — unchanged

---

### What Changes

The existing split-screen glassmorphism layout is **preserved**. The only structural change
is: a goal-selector block is inserted **between the password field and the submit button**.
The submit button label changes from `"Create account"` to `"Continue →"`. After successful
registration, the router navigates to `/onboarding/carousel` (not to the dashboard).

---

### Layout — Goal Selector (new block)

Inserted into the existing `.auth-form` between password field and submit button:

```
  ───  What's your goal?  ───

  ┌────────────┐  ┌────────────┐
  │     🔥     │  │     💪     │
  │  Lose      │  │  Build     │
  │  weight    │  │  muscle    │
  └────────────┘  └────────────┘
  ┌────────────┐  ┌────────────┐
  │     ⚖️     │  │     🏃     │
  │  Stay      │  │  Improve   │
  │  steady    │  │  fitness   │
  └────────────┘  └────────────┘
```

4 options in a 2×2 grid. One must be selected before form submits. Pre-selected: `"Lose weight"` (first option, as it's the most common new-user intent based on fitness app data).

---

### Visual Spec — Goal Selector

**Section label:**
```css
/* .reg-goal-label */
font-size: 11px;
font-weight: 700;
color: rgba(255, 255, 255, 0.35);
text-transform: uppercase;
letter-spacing: 0.08em;
margin-bottom: 10px;
margin-top: 16px;
```
Text: `"What's your goal?"`

**Grid:**
```css
/* .reg-goal-grid */
display: grid;
grid-template-columns: 1fr 1fr;
gap: 8px;
margin-bottom: 16px;
```

**Goal option card:**
```css
/* .reg-goal-card */
background: rgba(255, 255, 255, 0.04);
border: 1.5px solid rgba(255, 255, 255, 0.09);
border-radius: 14px;
padding: 14px 12px;
display: flex;
flex-direction: column;
align-items: center;
gap: 6px;
cursor: pointer;
transition:
  background 0.18s ease,
  border-color 0.18s ease,
  transform 0.12s ease;
user-select: none;
```
```css
.reg-goal-card:hover {
  background: rgba(124, 77, 255, 0.08);
  border-color: rgba(124, 77, 255, 0.3);
  transform: translateY(-2px);
}
```

**Selected state:**
```css
/* .reg-goal-card--selected */
background: rgba(124, 77, 255, 0.12);
border-color: var(--primary);
box-shadow: 0 0 0 1px rgba(124, 77, 255, 0.2);
```

**Goal emoji (not mat-icon — emojis render better for this use case):**
```css
/* .reg-goal-emoji */
font-size: 24px;
line-height: 1;
margin-bottom: 2px;
```

**Goal label:**
```css
/* .reg-goal-name */
font-size: 12px;
font-weight: 700;
color: rgba(255, 255, 255, 0.7);
text-align: center;
line-height: 1.3;
transition: color 0.18s ease;
```

```css
/* selected: */
.reg-goal-card--selected .reg-goal-name {
  color: var(--white);
}
```

**Four options and their API values:**

| Label | Emoji | API value | Badge color |
|---|---|---|---|
| `"Lose weight"` | 🔥 | `"lose"` | `var(--accent)` |
| `"Build muscle"` | 💪 | `"gain"` | `var(--color-success)` |
| `"Stay steady"` | ⚖️ | `"maintain"` | `var(--color-info)` |
| `"Improve fitness"` | 🏃 | `"maintain"` | `var(--color-info)` |

> **Implementation note for @angular-developer:** `"Improve fitness"` maps to the `"maintain"`
> API value in the current contract (`^(lose|gain|maintain)$`). This is a known discrepancy.
> Add a code comment in the form model noting this maps to `"maintain"` until the API is
> extended with a 4th value in a future sprint. Do NOT silently drop the visual option —
> the UX rationale for showing 4 options is that "Improve fitness" resonates with a distinct
> user mindset even if the backend currently treats it identically to "maintain".

**Selected indicator** (small checkmark overlay on selected card):
```css
/* .reg-goal-check */
position: absolute;
top: 8px; right: 8px;
width: 18px; height: 18px;
border-radius: 50%;
background: var(--primary);
display: flex;
align-items: center;
justify-content: center;
opacity: 0;
transform: scale(0);
transition: opacity 0.18s ease, transform 0.18s ease;
```
```css
.reg-goal-card--selected .reg-goal-check {
  opacity: 1;
  transform: scale(1);
}
```
Icon: `check` mat-icon, 11px, white.
The `.reg-goal-card` must have `position: relative` for this to work.

---

### Submit Button Change

The existing `.btn-submit` is reused. Only the text changes:
- **Before:** `"Create account"` + `arrow_forward` icon
- **Now:** `"Continue"` + `arrow_forward` icon

Tooltip on hover: none needed — "Continue" is self-explanatory.

After successful `POST /api/auth/register`:
- Store the JWT (existing behaviour)
- Navigate to `/onboarding/carousel`
- **Do NOT** show the dashboard, onboarding guide, or any other redirect

---

### States — Registration Screen

No new states beyond existing form validation. The goal selector adds one new error:

| State | Trigger | Visual |
|---|---|
| **No goal selected** | Submit attempt before selecting a goal | Red border on `.reg-goal-grid` + shake animation + error text `"Please select your goal"` below the grid — `font-size: 12px; color: var(--accent);` |

The shake animation:
```css
@keyframes reg-goal-shake {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-6px); }
  40%      { transform: translateX(6px); }
  60%      { transform: translateX(-4px); }
  80%      { transform: translateX(4px); }
}
/* duration: 0.35s ease; applied to .reg-goal-grid */
```

---

### Responsiveness — Registration Screen

**Desktop (≥ 768px):** Existing split-screen layout preserved. Goal grid inside the form panel.
**Mobile (< 768px):** Existing single-column layout. Goal grid is 2×2 on all widths.
**Extra-small (< 380px):** Goal grid becomes 1×4 (single column, wider cards).

---

---

## Screen 4 — Biometrics Screen

**Component:** `OnboardingBiometricsComponent`
**File:** `features/onboarding/biometrics/onboarding-biometrics.component.ts`
**Route:** `/onboarding/biometrics`

---

### Layout

Single-column, full-viewport, scrollable. Desktop: centered, max-width 540px.

```
┌─────────────────────────────────────────────┐
│  ← Back                    Step 2 of 3     │   ← nav bar
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  YOUR ESTIMATED DAILY NEEDS         │    │   ← live preview card
│  │  ─────────────────────────────────  │    │
│  │       ~2,400 kcal                   │    │
│  │       Maintenance (TDEE)            │    │
│  │                                     │    │
│  │       ~1,900 kcal                   │    │
│  │       Your goal target              │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Tell us about yourself.                   │   ← section title
│  We'll calculate your exact numbers.       │   ← subtitle
│                                             │
│  Height                                    │   ← field group
│  [——— input ———]  cm                       │
│                                             │
│  Weight                                    │
│  [——— input ———]  kg                       │
│                                             │
│  Age                                       │
│  [——— input ———]  years                    │
│                                             │
│  Biological sex                            │
│  [Male]  [Female]  [Other]                 │   ← pill selector
│                                             │
│  Activity level                            │
│  [Sedentary][Light][Moderate✓][Active]     │   ← horizontal scroll
│  [Athlete]                                 │
│                                             │
│  Dietary preference (optional)             │
│  [No restriction✓][Vegetarian][Vegan]      │
│  [High-protein]                            │
│                                             │
│  [  Calculate my numbers  →  ]             │   ← primary CTA
└─────────────────────────────────────────────┘
```

---

### Visual Spec — Navigation Bar

```css
/* .bio-nav */
display: flex;
align-items: center;
justify-content: space-between;
padding: 16px 20px 8px;
position: sticky;
top: 0;
z-index: 10;
background: rgba(13, 13, 16, 0.88);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border-bottom: 1px solid rgba(255, 255, 255, 0.05);
```

**Back button:**
```css
/* .bio-back-btn */
display: flex;
align-items: center;
gap: 4px;
background: none;
border: none;
color: rgba(255, 255, 255, 0.45);
font-size: 13px;
font-weight: 500;
font-family: inherit;
cursor: pointer;
min-height: 48px;
padding: 0 8px;
transition: color 0.15s ease;
```
Icon: `arrow_back` mat-icon, 18px. Text: `"Back"`.
On tap: navigate to `/auth/register`.

**Step indicator ("Step 2 of 3"):**
```css
font-size: 12px;
font-weight: 600;
color: rgba(255, 255, 255, 0.3);
```

**Step progress bar:**
```css
/* .bio-step-bar */
height: 3px;
background: rgba(255, 255, 255, 0.07);
border-radius: 999px;
overflow: hidden;
margin: 8px 20px 0;
```
```css
/* .bio-step-fill */
height: 100%;
width: 66%;  /* 2/3 of 3 steps */
background: var(--primary);
border-radius: 999px;
transition: width 0.4s ease;
```

---

### Visual Spec — Live TDEE Preview Card

This is the **progressive reward** during the form. It sits at the top of the scrollable
content (below the nav bar) and updates live as the user fills in fields.

```css
/* .bio-tdee-card */
margin: 16px 20px 20px;
padding: 18px 20px;
background: rgba(124, 77, 255, 0.06);
border: 1px solid rgba(124, 77, 255, 0.18);
border-radius: 18px;
position: relative;
overflow: hidden;
transition: border-color 0.3s ease, background 0.3s ease;
```

**Card background glow pulse** (activates when data becomes sufficient to compute):
```css
/* .bio-tdee-card--active */
background: rgba(124, 77, 255, 0.1);
border-color: rgba(124, 77, 255, 0.35);
box-shadow: 0 0 32px rgba(124, 77, 255, 0.1);
```

**Card label:**
```css
/* .bio-tdee-card-label */
font-size: 10px;
font-weight: 700;
color: rgba(124, 77, 255, 0.7);
text-transform: uppercase;
letter-spacing: 0.1em;
margin-bottom: 14px;
display: flex;
align-items: center;
gap: 6px;
```
Icon: `auto_awesome` mat-icon (sparkle), 12px, `var(--primary)`.
Text: `"YOUR ESTIMATED DAILY NEEDS"`

**Numbers row (two columns):**
```css
/* .bio-tdee-numbers */
display: grid;
grid-template-columns: 1fr 1fr;
gap: 12px;
```

Each number block:
```css
/* .bio-tdee-block */
display: flex;
flex-direction: column;
gap: 2px;
```

**Main number:**
```css
/* .bio-tdee-value */
font-size: 28px;
font-weight: 800;
color: var(--white);
font-variant-numeric: tabular-nums;
letter-spacing: -0.5px;
line-height: 1;
transition: color 0.25s ease;
```

**Unit:**
```css
/* .bio-tdee-unit */
font-size: 11px;
font-weight: 700;
color: rgba(255, 255, 255, 0.35);
text-transform: uppercase;
letter-spacing: 0.06em;
```

**Label:**
```css
/* .bio-tdee-sublabel */
font-size: 11px;
font-weight: 500;
color: rgba(255, 255, 255, 0.4);
margin-top: 2px;
```

Block 1: `"~2,400"` + `"KCAL/DAY"` + `"Maintenance (TDEE)"`
Block 2: `"~1,900"` + `"KCAL/DAY"` + `"Your goal target"` (goal-adjusted from step 3)

**Empty state** (insufficient data — height/weight/age/gender not yet filled):
```css
/* .bio-tdee-placeholder */
font-size: 28px;
font-weight: 800;
color: rgba(255, 255, 255, 0.15);
```
Shows `"—"` for each value.

**Empty state caption:**
```css
font-size: 12px;
font-weight: 400;
color: rgba(255, 255, 255, 0.25);
font-style: italic;
margin-top: 10px;
```
Text: `"Fill in your details to see your numbers"`

**Update animation** (each time the values recompute):
Numbers change via a quick flash — `color` briefly goes to `var(--primary)` then back to
`var(--white)` using a component-scoped keyframe:

```css
@keyframes bio-tdee-update {
  0%   { color: var(--white); }
  30%  { color: var(--primary); }
  100% { color: var(--white); }
}
/* Applied on each value update: animation: bio-tdee-update 0.4s ease-out */
```

**Live calculation logic (TypeScript, component-local — not in facade):**

```typescript
// Computed signal — recalculates whenever any form field changes
readonly liveEstimate = computed((): LiveTdeeEstimate | null => {
  const { heightCm, weightKg, age, gender, activityLevel } = this.form();
  const goal = this.userGoal(); // from onboarding facade or auth store
  if (!heightCm || !weightKg || !age || !gender) return null;

  const bmrMale   = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const bmrFemale = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const bmr = gender === 'male' ? bmrMale
            : gender === 'female' ? bmrFemale
            : (bmrMale + bmrFemale) / 2;

  const multipliers: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, athlete: 1.9
  };
  // Default to 'moderate' if activity not yet selected (reasonable estimate)
  const multiplier = multipliers[activityLevel ?? 'moderate'] ?? 1.55;
  const tdee = Math.round(bmr * multiplier);

  const goalCalories = goal === 'lose' ? tdee - 500
                     : goal === 'gain' ? tdee + 500
                     : tdee;

  return { tdee, goalCalories };
});
```

The server's `POST /api/onboarding/biometrics` is the authoritative calculation. The
live preview is approximate — it's deliberately labeled with `"~"` prefix.

---

### Visual Spec — Form Section

```css
/* .bio-form-content */
padding: 0 20px 32px;
display: flex;
flex-direction: column;
gap: 20px;
```

**Section title block:**
```css
/* .bio-section-title */
font-size: 22px;
font-weight: 800;
color: var(--white);
letter-spacing: -0.5px;
margin-bottom: 2px;
```
Text: `"Tell us about yourself."`

```css
/* .bio-section-sub */
font-size: 14px;
font-weight: 400;
color: rgba(255, 255, 255, 0.38);
margin-bottom: 4px;
```
Text: `"We'll calculate your exact numbers."`

---

### Visual Spec — Input Fields (Height, Weight, Age)

Each field uses Angular Material `mat-form-field` with `appearance="outline"` — consistent
with the global MDC outlined text field overrides already in `styles.css`.

```html
<mat-form-field appearance="outline" class="bio-field">
  <mat-label>Height</mat-label>
  <input matInput type="number" inputmode="decimal" placeholder="175" />
  <span matSuffix class="bio-field-suffix">cm</span>
</mat-form-field>
```

```css
/* .bio-field */
width: 100%;

/* .bio-field-suffix */
font-size: 13px;
font-weight: 600;
color: rgba(255, 255, 255, 0.3);
```

Fields: Height (cm), Weight (kg), Age (years). All `type="number"`, `inputmode="decimal"`.

---

### Visual Spec — Pill Selectors (Gender)

For single-selection sets with 3 options, use a **pill toggle group** (not `mat-radio`):

```css
/* .bio-pill-group */
display: flex;
gap: 8px;
flex-wrap: wrap;
```

```css
/* .bio-pill-btn */
padding: 10px 18px;
border-radius: 999px;
border: 1.5px solid rgba(255, 255, 255, 0.1);
background: rgba(255, 255, 255, 0.04);
color: rgba(255, 255, 255, 0.55);
font-size: 13px;
font-weight: 600;
font-family: inherit;
cursor: pointer;
transition: all 0.18s ease;
min-height: 48px;
display: flex;
align-items: center;
```

```css
/* .bio-pill-btn--selected */
border-color: var(--primary);
background: rgba(124, 77, 255, 0.14);
color: var(--white);
box-shadow: 0 0 0 1px rgba(124, 77, 255, 0.2);
```

Gender pills: `"Male"`, `"Female"`, `"Other"`.

---

### Visual Spec — Activity Level Selector

5 options — displayed as a **horizontal scrollable row on mobile**, wrap on desktop:

```css
/* .bio-activity-row */
display: flex;
gap: 8px;
overflow-x: auto;
padding-bottom: 4px;
scrollbar-width: none;
-webkit-overflow-scrolling: touch;
```

Each option is a **card** (not a pill — needs more space for description text):

```css
/* .bio-activity-card */
flex-shrink: 0;
width: 100px;
padding: 12px 10px;
border-radius: 12px;
border: 1.5px solid rgba(255, 255, 255, 0.09);
background: rgba(255, 255, 255, 0.04);
display: flex;
flex-direction: column;
gap: 4px;
cursor: pointer;
transition: all 0.18s ease;
```

```css
/* .bio-activity-card--selected */
border-color: var(--primary);
background: rgba(124, 77, 255, 0.12);
```

**Activity name:**
```css
font-size: 12px;
font-weight: 700;
color: var(--white-soft);
```

**Activity description:**
```css
font-size: 10px;
font-weight: 400;
color: rgba(255, 255, 255, 0.35);
line-height: 1.4;
```

**Five activity options:**

| Label | Description | Default |
|---|---|---|
| `"Sedentary"` | `"Desk job, little exercise"` | — |
| `"Light"` | `"1–3 days/week"` | — |
| `"Moderate"` | `"3–5 days/week"` | **Pre-selected** |
| `"Active"` | `"6–7 days/week"` | — |
| `"Athlete"` | `"Twice daily"` | — |

`"Moderate"` is pre-selected as the most statistically common value. This also enables the
live TDEE preview to show a reasonable estimate from the moment height/weight/age/gender
are entered, without requiring the user to select activity level first.

---

### Visual Spec — Dietary Preference Selector

4 options, pill style (same as gender), wrapping on two rows:

```css
/* .bio-diet-group */
display: flex;
gap: 8px;
flex-wrap: wrap;
```

Pills: `"No restriction"` (pre-selected), `"Vegetarian"`, `"Vegan"`, `"High-protein"`.
This field is optional — no validation error if it stays at the default.

---

### Visual Spec — CTA Button

```css
/* .bio-submit-btn — extends .btn-submit pattern */
width: 100%;
height: 52px;
background: var(--primary);
border: none;
border-radius: 14px;
color: var(--white);
font-size: 15px;
font-weight: 700;
font-family: inherit;
display: flex;
align-items: center;
justify-content: center;
gap: 8px;
cursor: pointer;
box-shadow: 0 4px 20px var(--primary-glow);
transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.15s ease;
margin-top: 8px;
```

States:
- **Default:** Icon `calculate` (20px) + `"Calculate my numbers"`
- **Loading:** `mat-spinner` (diameter 18, white) + `"Calculating..."` + disabled
- **Error:** Button re-enables, `ngx-toastr` error toast shown by facade

On success: navigate to `/onboarding/your-numbers`. The `YourNumbersResponse` is already
stored in `onboardingFacade.yourNumbers()` signal — no second API call on the reveal screen.

---

### States — Biometrics Screen

| State | Trigger | Visual |
|---|---|
| **Initial** | On mount | TDEE preview shows `"—"` values with placeholder text |
| **Partial** | Height/weight/age filled, gender selected | TDEE preview shows `"~X kcal"` with update flash |
| **Loading** | CTA tapped, API in-flight | Button disabled + spinner; preview card unchanged |
| **Error** | API returns 400 | Facade shows toast; specific field errors shown inline via `mat-error` |
| **Success** | 200 OK | Navigate to `/onboarding/your-numbers` |

**Field-level errors** (from API 400 response):
- Show under each `mat-form-field` using `mat-error`
- Error text: `font-size: 11px; color: var(--accent)` (handled by global MDC theme)

---

### Responsiveness — Biometrics Screen

**Mobile (< 640px) — PRIMARY**
- Single column, full width
- TDEE preview card: full width
- Activity cards: horizontal scroll (show 2.5 cards to hint scrollability)
- `bio-pill-group` wraps naturally

**Desktop (≥ 640px)**
- Centered, `max-width: 540px`, `margin: 0 auto`
- Activity cards: `flex-wrap: wrap` instead of scroll (all 5 visible)
- TDEE numbers: `font-size: 32px` (more space)

---

---

## Screen 5 — Your Numbers Reveal

**Component:** `YourNumbersRevealComponent`
**File:** `features/onboarding/your-numbers/your-numbers-reveal.component.ts`
**Route:** `/onboarding/your-numbers`

---

### UX Intent

This is the emotional climax of onboarding. The user has given the app their data — this
screen is the payoff. It must feel **earned**, not generic. The numbers animate in from
zero to signal that these are *computed specifically for this person*. The background is
more dramatic than other screens (deeper, more glow).

---

### Layout

Full-viewport, no navigation bar, vertically centered. The content never scrolls.

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   [Deep radial gradient — primary glow from center]           │
│                                                                │
│         ✦  sparkle icon (pulsing)                             │
│         YOUR NUMBERS ARE IN.                                   │
│                                                                │
│    ┌──────────────────────────────────────────────────────┐   │
│    │                                                      │   │
│    │   ┌─────────────────┐    ┌─────────────────┐        │   │
│    │   │    2,672        │    │    1,724         │        │   │
│    │   │    TDEE         │    │    BMR           │        │   │
│    │   │    kcal/day     │    │    kcal/day      │        │   │
│    │   └─────────────────┘    └─────────────────┘        │   │
│    │                                                      │   │
│    │   ┌─────────────────┐    ┌─────────────────┐        │   │
│    │   │    23.7         │    │    2,172         │        │   │
│    │   │    BMI          │    │    GOAL TARGET   │        │   │
│    │   │    Normal weight│    │    kcal/day      │        │   │
│    │   └─────────────────┘    └─────────────────┘        │   │
│    │                                                      │   │
│    └──────────────────────────────────────────────────────┘   │
│                                                                │
│    Based on your goal to lose weight, you need                 │
│    a 500 kcal deficit per day.                                 │
│                                                                │
│    💧  Drink 2.4L of water each day                           │
│                                                                │
│    [────────  Start your first workout  ────────]             │
│                   Log your first meal                          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

### Visual Spec — Background

```css
/* .yn-page */
min-height: 100dvh;
background: var(--surface);
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
padding: 40px 24px calc(40px + env(safe-area-inset-bottom, 0px));
position: relative;
overflow: hidden;
```

**Dramatic radial glow:**
```css
/* .yn-glow */
position: absolute;
inset: 0;
background:
  radial-gradient(ellipse 70% 60% at 50% 35%,
    rgba(124, 77, 255, 0.22) 0%,
    rgba(124, 77, 255, 0.06) 40%,
    transparent 70%),
  radial-gradient(ellipse 40% 30% at 50% 50%,
    rgba(124, 77, 255, 0.08) 0%,
    transparent 60%);
pointer-events: none;
z-index: 0;
```

---

### Visual Spec — Header Badge

```css
/* .yn-badge */
display: flex;
align-items: center;
gap: 8px;
margin-bottom: 20px;
animation: slideUp 0.4s ease-out both;
```

**Sparkle icon:**
```css
/* .yn-sparkle */
font-size: 28px;
width: 28px; height: 28px;
color: var(--primary);
animation: pulse 2s ease-in-out infinite;
```
Icon: `auto_awesome` mat-icon.

**Badge text:**
```css
font-size: 12px;
font-weight: 700;
color: rgba(255, 255, 255, 0.45);
text-transform: uppercase;
letter-spacing: 0.14em;
```
Text: `"YOUR NUMBERS ARE IN"`

---

### Visual Spec — Numbers Grid

```css
/* .yn-numbers-grid */
display: grid;
grid-template-columns: 1fr 1fr;
gap: 12px;
width: 100%;
max-width: 420px;
margin-bottom: 28px;
position: relative;
z-index: 1;
```

**Number tile:**
```css
/* .yn-tile */
background: rgba(255, 255, 255, 0.04);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 20px;
padding: 20px 18px 18px;
display: flex;
flex-direction: column;
gap: 4px;
```

Entrance: each tile enters with `slideUp` + staggered delays:
- Tile 1 (TDEE): `animation: slideUp 0.45s ease-out 0.1s both`
- Tile 2 (BMR): `animation: slideUp 0.45s ease-out 0.25s both`
- Tile 3 (BMI): `animation: slideUp 0.45s ease-out 0.4s both`
- Tile 4 (Goal): `animation: slideUp 0.45s ease-out 0.55s both`

**Tile metric name (top):**
```css
/* .yn-tile-metric */
font-size: 10px;
font-weight: 700;
color: rgba(255, 255, 255, 0.35);
text-transform: uppercase;
letter-spacing: 0.1em;
```

**Tile main value (animated counter):**
```css
/* .yn-tile-value */
font-size: 38px;
font-weight: 800;
color: var(--white);
font-variant-numeric: tabular-nums;
letter-spacing: -1px;
line-height: 1;
```

**Tile unit / sub-label:**
```css
/* .yn-tile-unit */
font-size: 11px;
font-weight: 700;
color: rgba(255, 255, 255, 0.35);
text-transform: uppercase;
letter-spacing: 0.06em;
```

**Tile category badge** (shown only on BMI tile):
```css
/* .yn-tile-category */
font-size: 11px;
font-weight: 600;
padding: 2px 8px;
border-radius: 999px;
margin-top: 4px;
width: fit-content;
```

BMI category badge colors:

| Category | Background | Text |
|---|---|---|
| `"Underweight"` | `rgba(56,189,248,0.12)` | `var(--color-info)` |
| `"Normal weight"` | `rgba(74,222,128,0.10)` | `var(--color-success)` |
| `"Overweight"` | `rgba(255,183,77,0.12)` | `var(--color-warning)` |
| `"Obese"` | `rgba(255,64,129,0.12)` | `var(--accent)` |

**Four tiles:**

| Tile | Metric | Value | Unit | Secondary |
|---|---|---|---|---|
| 1 | `"TDEE"` | `tdee` rounded | `"KCAL/DAY"` | `"Maintenance calories"` |
| 2 | `"BMR"` | `bmr` rounded | `"KCAL/DAY"` | `"Resting metabolism"` |
| 3 | `"BMI"` | `bmi` (1 decimal) | `"kg/m²"` | Category badge |
| 4 | `"DAILY TARGET"` | `goalCalories` rounded | `"KCAL/DAY"` | `"For your goal"` |

---

### Counter Animation — Implementation

Each tile's value animates from `0` to its final value using the same `setInterval` pattern
established in the `WorkoutCompletionCardComponent` (Fix 3):

```typescript
// yn-number-counter directive or inline in component
private animateValue(target: number, decimals: number,
                     setter: (v: string) => void): void {
  const duration = 1400;     // ms total
  const steps    = 60;       // update frequency
  const stepMs   = duration / steps;
  let   current  = 0;
  let   step     = 0;
  const increment = target / steps;

  const interval = setInterval(() => {
    step++;
    current = step >= steps ? target : current + increment;
    setter(decimals > 0
      ? current.toFixed(decimals)
      : Math.round(current).toLocaleString());
    if (step >= steps) clearInterval(interval);
  }, stepMs);
}
```

Each tile starts its animation staggered with `setTimeout`:
- TDEE: `setTimeout(fn, 300)` — starts 0.3s after route loads
- BMR: `setTimeout(fn, 600)` — 0.3s after TDEE
- BMI: `setTimeout(fn, 900)` — 0.3s after BMR
- Goal calories: `setTimeout(fn, 1200)` — 0.3s after BMI

Visual effect: numbers count up one after another, like a machine computing and revealing
each figure in sequence. The user watches their personalised data materialise.

TDEE and BMR and Goal display as `"2,672"` (toLocaleString with no decimals).
BMI displays as `"23.7"` (1 decimal place, no locale thousands separator needed).

---

### Visual Spec — Goal Context Copy

```css
/* .yn-goal-copy */
font-size: 14px;
font-weight: 500;
color: rgba(255, 255, 255, 0.55);
text-align: center;
max-width: 340px;
line-height: 1.6;
margin-bottom: 16px;
animation: slideUp 0.4s ease-out 0.8s both;
position: relative;
z-index: 1;
```

**Copy logic — goal-specific, personalised:**

```typescript
get goalCopy(): string {
  const n = this.numbers();
  if (!n) return '';
  const deficit = Math.abs(n.tdee - n.goalCalories);
  switch (n.goal) {
    case 'lose':
      return `To reach your goal, you need a ${deficit} kcal daily deficit.`;
    case 'gain':
      return `To build muscle, eat ${deficit} kcal above maintenance daily.`;
    default:
      return `Eating ${n.dailyCalorieTarget.toLocaleString()} kcal daily keeps you at your current weight.`;
  }
}
```

---

### Visual Spec — Water Recommendation

```css
/* .yn-water */
display: flex;
align-items: center;
gap: 8px;
padding: 10px 16px;
background: rgba(56, 189, 248, 0.08);
border: 1px solid rgba(56, 189, 248, 0.18);
border-radius: 12px;
margin-bottom: 28px;
animation: slideUp 0.4s ease-out 1.0s both;
position: relative;
z-index: 1;
max-width: 420px;
width: 100%;
```

**Water icon:** `water_drop` mat-icon, 18px, `var(--color-info)`.
**Text:**
```css
font-size: 13px;
font-weight: 500;
color: rgba(255, 255, 255, 0.55);
```
Content: `` `Drink ${waterLiters.toFixed(1)}L of water each day` ``

---

### Visual Spec — First Action CTAs

```css
/* .yn-ctas */
display: flex;
flex-direction: column;
align-items: center;
gap: 10px;
width: 100%;
max-width: 380px;
animation: slideUp 0.4s ease-out 1.2s both;
position: relative;
z-index: 1;
```

**Primary CTA — "Start your first workout":**
```css
/* .yn-cta-primary */
width: 100%;
height: 52px;
background: linear-gradient(135deg, var(--primary), rgba(124, 77, 255, 0.8));
border: none;
border-radius: 14px;
color: var(--white);
font-size: 15px;
font-weight: 700;
font-family: inherit;
display: flex;
align-items: center;
justify-content: center;
gap: 8px;
cursor: pointer;
box-shadow: 0 4px 24px var(--primary-glow), 0 2px 8px rgba(0, 0, 0, 0.3);
transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.15s ease;
```
```css
.yn-cta-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 36px var(--primary-glow);
}
```
Icon: `fitness_center` mat-icon, 18px. Text: `"Start your first workout"`

**Secondary CTA — "Log your first meal":**
```css
/* .yn-cta-secondary */
background: none;
border: none;
color: rgba(255, 255, 255, 0.45);
font-size: 14px;
font-weight: 500;
font-family: inherit;
cursor: pointer;
padding: 10px 20px;
min-height: 48px;
display: flex;
align-items: center;
gap: 6px;
transition: color 0.15s ease;
```
```css
.yn-cta-secondary:hover { color: rgba(255, 255, 255, 0.75); }
```
Icon: `restaurant` mat-icon, 16px. Text: `"Log your first meal"`

**On CTA tap (both):**
1. Call `onboardingFacade.recordStep('first_action_taken')` — fire-and-forget, non-blocking
2. Navigate:
   - Workout CTA: to `/user/workouts` (the workout templates list, which shows Fix 7 pre-built templates)
   - Meal CTA: to `/user/nutrition` (opens Add Meal with AI analyzer as primary action — Fix 7 empty state)

---

### States — Your Numbers Screen

| State | Trigger | Visual |
|---|---|
| **Loading** (data not in facade) | `yourNumbers() === null` on mount | Skeleton version of the numbers grid — tiles show `"----"` in grey, no counters |
| **Loaded** | `yourNumbers()` is non-null | Counter animations begin on a 300ms delay after mount |
| **Error** (fallback) | `yourNumbers()` stays null after `loadYourNumbers()` fails | Error state with retry button — `"Couldn't load your numbers"` in accent banner + `"Try again"` ghost button |

**Skeleton tile (loading state):**
```css
/* .yn-tile-skeleton */
/* On .yn-tile-value when loading */
background: rgba(255, 255, 255, 0.06);
border-radius: 8px;
color: transparent;
width: 80%;
height: 38px;
animation: pulse 1.5s ease-in-out infinite;
```

---

### Animations — Component-Scoped

**Defined in `your-numbers-reveal.component.css` — NOT in global styles.css:**

```css
/* No new keyframes needed beyond global 'slideUp', 'pulse', and 'fadeIn' */
/* All tile entrances use global 'slideUp' with animation-delay per tile   */
/* Counter animation is JS-driven (setInterval) — not a CSS keyframe       */
/* Background glow is a static CSS gradient — no animation needed          */
```

Only the number counter uses JS (`setInterval` in the component). All visual entrances
use the existing global `slideUp` keyframe with staggered `animation-delay`.

---

### Responsiveness — Your Numbers Screen

**Mobile (< 640px) — PRIMARY**
- Numbers grid: 2×2 responsive (already `grid-template-columns: 1fr 1fr`)
- Tile value: `font-size: 32px` at < 380px
- Tile padding: `16px 14px`
- CTAs: full width, stacked

**Desktop (≥ 640px)**
- Max-width: `460px`, centered
- Tile value: `font-size: 42px` (more drama with the space available)
- Background glow: more prominent (extra outer radial layer added)
- Grid: same 2×2 but with more padding per tile (`24px 22px`)

---

---

## Angular Material Components — Full List

| Screen | Components Used |
|---|---|
| Carousel 1 & 2 | `mat-icon` (`bar_chart`, `local_fire_department`, `arrow_forward`, `auto_awesome`) |
| Registration | `mat-form-field`, `mat-icon` (`check`) — goal cards are custom, not `mat-radio` |
| Biometrics | `mat-form-field`, `mat-icon` (`arrow_back`, `calculate`), `mat-spinner` (loading) |
| Your Numbers | `mat-icon` (`auto_awesome`, `water_drop`, `fitness_center`, `restaurant`), `mat-spinner` (skeleton loading) |

No `mat-stepper` — the step progression is managed by routing and the step indicator bar
is a custom CSS component. `mat-stepper` is not appropriate here because the steps span
multiple routes (not a single component).

No `mat-slider` for height/weight — `type="number"` inputs with `mat-form-field` are more
precise and accessible, and align with the existing auth form pattern.

---

## CSS Classes — Full Reference

All new classes are **component-scoped** — defined in individual `*.component.css` files.
No additions to `styles.css` are required for this spec.

| Prefix | Component | Purpose |
|---|---|---|
| `.ob-*` | `onboarding-carousel.component.css` | Carousel shell, phone frame, mockup elements, CTA |
| `.reg-goal-*` | `register.component.css` | Goal selector grid, cards, check indicator |
| `.bio-*` | `onboarding-biometrics.component.css` | Nav bar, TDEE preview card, form fields, selectors, CTA |
| `.yn-*` | `your-numbers-reveal.component.css` | Reveal page, glow, tiles, badge, copy, CTAs |

---

## Accessibility

### Carousel Screens

| Concern | Implementation |
|---|---|
| Role | Full-page: `role="main"`. Slide content: `aria-live="polite"` on slide container — announces slide changes |
| Phone mockup | `aria-hidden="true"` on entire `.ob-phone-frame` — it's decorative |
| Progress dots | `role="tablist"` on `.ob-dots`; each dot `role="tab"`, `aria-selected`, `aria-label="Slide 1 of 2"` |
| CTA buttons | `aria-label="Go to slide 2"` / `"Begin registration"` |
| Skip link | `aria-label="Skip carousel and go to registration"` |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` — disable `ob-phone-float`, `ob-bar-grow`, `ob-mock-bubble-*` animations; preserve structure |

### Registration Goal Selector

| Concern | Implementation |
|---|---|
| Role | `role="radiogroup"` on `.reg-goal-grid`, `aria-label="Select your fitness goal"` |
| Each card | `role="radio"`, `aria-checked="true|false"`, `aria-label="Lose weight"` |
| Keyboard | Arrow keys navigate between options (standard radiogroup behaviour); Space/Enter selects |
| Error | `aria-invalid="true"` on the group when no selection + error announced via `aria-live="assertive"` |

### Biometrics Screen

| Concern | Implementation |
|---|---|
| Form fields | `mat-label` provides the visible + accessible label — Angular Material handles this |
| Unit suffixes | `aria-label="Height in centimetres"` on the `matInput` element |
| Pill selectors | `role="radiogroup"` + `role="radio"` + `aria-checked` on gender and dietary pills |
| Activity cards | Same radiogroup pattern; horizontally scrollable region has `role="region"` + `aria-label="Activity level selector"` |
| TDEE preview | `aria-live="polite"` on the value spans — announces updates: `"Estimated TDEE updated: 2400 calories per day"` |
| Live region rate-limiting | Debounce announcements to at most once every 1 second to avoid spam |

### Your Numbers Screen

| Concern | Implementation |
|---|---|
| Page title | `<h1>` (visually hidden if needed): `"Your Fitness Numbers"` |
| Counter animation | `aria-live="off"` on the counter spans during animation; switch to `aria-live="polite"` after animation completes and announce final value |
| Tile region | Each tile wrapped in `<article>` with `aria-label="TDEE: 2,672 calories per day"` |
| BMI badge | `aria-label="Body Mass Index: 23.7 — Normal weight"` |
| CTAs | Clear labels: `aria-label="Start your first workout and begin your fitness journey"` |
| Escape hatch | "Skip to dashboard" visually-hidden link at top of page for users who want to bypass the animation |
| Reduced motion | Counter animation disabled; values displayed immediately at final state |

### Global — Touch Targets

All interactive elements across all 5 screens: `min-height: 48px; min-width: 48px` enforced.
Gym context applies here too — the goal selector cards, pill buttons, and CTA buttons are
all primary touch surfaces.

---

## Privacy Constraints

| Constraint | Verification |
|---|---|
| `YourNumbersResponse` data (BMI, BMR, TDEE, GoalCalories) is rendered only in `YourNumbersRevealComponent` and nowhere accessible to social components | `@code-reviewer` must verify no social module imports `OnboardingFacade` or `OnboardingService` |
| The live TDEE calculation in `OnboardingBiometricsComponent` is computed client-side only and never sent to any API except `POST /api/onboarding/biometrics` | Code review: verify no intermediate telemetry or analytics calls include the computed values |
| Goal value (`lose` / `gain` / `maintain`) is stored on the user entity and used for calorie targets — it must NEVER appear in social posts, feed cards, or discover recommendations | Pre-existing privacy rule; reinforced here because this spec exposes it in the registration form UI |

---

## Out of Scope for Fix 4

| Item | Deferred to |
|---|---|
| Social discovery step in onboarding ("follow 5 users") | Fix 9 — beSocial cold-start seeding sprint |
| "Your Numbers" card on user profile / settings page (reusing `YourNumbersRevealComponent`) | Fix 8 / Sprint 4 polish |
| Body weight trend chart visible at the end of reveal | Requires historical data — N/A for first-time users |
| AI-generated personalised workout plan from metrics | Fix 8 — AI contextual layer sprint |
| Metric system toggle (imperial ↔ metric) for height/weight fields | Scope reduction — metric only in v1 |
| Onboarding resume mid-flow for users who abandon (back navigation) | The `OnboardingGuard` handles resume via `GET /api/onboarding/status` — back navigation inside the flow navigates naturally via browser history |
| Social proof / testimonial copy on carousel screens | Content decision, not UX spec — placeholder copy is defined here; final copy is product team's decision |
