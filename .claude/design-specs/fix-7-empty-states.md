## UI Spec: Fix 7 — First Login Guided Empty States

**Author:** @uiux-designer
**Date:** 2026-05-29
**Audit reference:** Full Platform Audit § 6 — Empty States & Feedback Loops
**Status:** READY_FOR_IMPLEMENTATION

---

### User Story

As a new user who has just registered, I want each empty module to immediately show
me what I can do — and make the first action effortless — so that I experience
real value within my first session instead of staring at blank screens.

---

### UX Flow

```
1. User completes onboarding / logs in for the first time
2. User navigates to Workouts → collection is empty
   → WorkoutsGuidedEmptyComponent replaces the normal empty state
   → Three pre-built template cards are visible; no setup required
   → User taps "Start this workout" on Push Day
   → Template is saved via API → ActiveWorkoutSession opens immediately

3. User navigates to Nutrition → no meals logged
   → NutritionGuidedEmptyComponent replaces the normal empty state
   → Large AI photo CTA is the visual focal point
   → User taps "Analyze with AI" → AiMealAnalyzer opens
   → After saving, empty state disappears; meal list renders

4. User navigates to Social Feed → follows nobody
   → SocialFeedGuidedEmptyComponent replaces the normal empty state
   → 5 suggested user cards load with inline follow buttons
   → User taps Follow on 2 cards → buttons transition to "Following"
   → When user refreshes feed, posts from followed users appear
```

**Trigger conditions (when to show each guided empty state):**

| Module | Signal | Source |
|---|---|---|
| Workouts | `workoutTemplates().length === 0 && !isLoading()` | `WorkoutsTabFacade` |
| Nutrition | `meals().length === 0 && !isLoading()` | `NutritionTabFacade` |
| Social Feed | `feedPosts().length === 0 && followingCount() === 0 && !isLoading()` | `SocialFacade` |

These states are not "first login only" — they trigger any time the collection is
empty. A returning user who deleted all their templates will see the guided state
again. This is correct behaviour: an empty state is always an opportunity.

---

### Shared Visual Language

All three guided empty states share:

**Entrance animation:**
```css
animation: slideUp 0.35s ease-out;   /* reuses global keyframe */
```

**Container wrapper:**
```css
/* .guided-empty-container */
display: flex;
flex-direction: column;
align-items: center;
padding: 32px 20px 40px;
width: 100%;
```

**Icon area (at the top of every state):**
```css
/* .guided-empty-icon */
width: 56px;
height: 56px;
border-radius: 16px;
background: rgba(124, 77, 255, 0.12);
border: 1px solid rgba(124, 77, 255, 0.22);
display: flex;
align-items: center;
justify-content: center;
margin-bottom: 20px;

mat-icon inside: font-size 28px; color: var(--primary);
```

**Headline:**
```css
/* .guided-empty-headline */
font-size: 20px;
font-weight: 800;
color: var(--white);
text-align: center;
margin-bottom: 8px;
line-height: 1.2;
```

**Subheadline:**
```css
/* .guided-empty-sub */
font-size: 14px;
font-weight: 400;
color: rgba(255, 255, 255, 0.50);
text-align: center;
max-width: 320px;
line-height: 1.5;
margin-bottom: 28px;
```

---

## Component 1 — WorkoutsGuidedEmptyComponent

**Selector:** `app-workouts-guided-empty`
**File location:** `features/workouts/guided-empty/`
**Used by:** `workouts-content.component` — replace the existing `.empty` block

---

### User Story (component-level)

As a new user on the Workouts tab, I want to see ready-made workout plans I can
start immediately so that my first workout requires zero configuration.

---

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│             [fitness_center 28px icon in 56px box]             │
│                                                                 │
│          Your first workout is one tap away                     │  20px/800
│       Choose a starter template — no setup needed              │  14px/400
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │  PUSH DAY    │   │  PULL DAY    │   │  FULL BODY   │        │
│  │  card        │   │  card        │   │  card        │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│                                                                 │
│              Or create your own workout →                       │  12px link
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

On mobile (< 768px): cards switch to a horizontal scroll track with snap points
(see Responsiveness section).

---

### Template Card Layout

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  [💪 24px]         [STRENGTH]                       │  ← icon + badge row
│                                                     │
│  Push Day                                           │  17px/800/white
│  Chest · Shoulders · Triceps                        │  12px/400/rgba(255,255,255,0.45)
│                                                     │
│  ─────────────────────────────────────────────────  │  1px / rgba(255,255,255,0.06)
│                                                     │
│  ●  Bench Press              4 × 10                 │
│  ●  Overhead Press           3 × 10                 │
│  ●  Tricep Pushdowns         3 × 12                 │
│  ●  Lateral Raises           3 × 15                 │
│     + 1 more exercise                               │  ← 11px / rgba(255,255,255,0.35)
│                                                     │
│  ─────────────────────────────────────────────────  │  1px / rgba(255,255,255,0.06)
│                                                     │
│  ●  5 exercises    ●  16 sets                       │  ← stats row
│                                                     │
│  [ ▶  Start this workout                        ]   │  ← btn-primary full width
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Pre-built Template Data (static — defined in component)

All three templates are stored as a typed constant array inside
`WorkoutsGuidedEmptyComponent`. They are NOT fetched from the API —
they live in the component until the user saves one.

```typescript
// Exact data the developer should use
const GUIDED_TEMPLATES: GuidedTemplate[] = [
  {
    id: 'guided-push',
    name: 'Push Day',
    badge: 'STRENGTH',
    badgeColor: 'strength',          // maps to design-system strength color
    icon: 'fitness_center',
    muscleGroups: 'Chest · Shoulders · Triceps',
    exercises: [
      { name: 'Bench Press',      sets: 4, reps: 10, weightKg: 60 },
      { name: 'Overhead Press',   sets: 3, reps: 10, weightKg: 40 },
      { name: 'Tricep Pushdowns', sets: 3, reps: 12, weightKg: 20 },
      { name: 'Lateral Raises',   sets: 3, reps: 15, weightKg: 8  },
      { name: 'Push-ups',         sets: 3, reps: 15, weightKg: 0  },
    ],
    previewCount: 4,   // show first 4 in the card; show "+ 1 more"
    totalSets: 16,
  },
  {
    id: 'guided-pull',
    name: 'Pull Day',
    badge: 'STRENGTH',
    badgeColor: 'strength',
    icon: 'fitness_center',
    muscleGroups: 'Back · Biceps · Rear Delts',
    exercises: [
      { name: 'Pull-ups',       sets: 4, reps: 8,  weightKg: 0  },
      { name: 'Barbell Rows',   sets: 4, reps: 10, weightKg: 60 },
      { name: 'Lat Pulldown',   sets: 3, reps: 12, weightKg: 50 },
      { name: 'Bicep Curls',    sets: 3, reps: 12, weightKg: 15 },
      { name: 'Face Pulls',     sets: 3, reps: 15, weightKg: 12 },
    ],
    previewCount: 4,
    totalSets: 17,
  },
  {
    id: 'guided-full-body',
    name: 'Full Body',
    badge: 'FULL BODY',
    badgeColor: 'gain',              // maps to design-system gain-muscle green
    icon: 'accessibility_new',
    muscleGroups: 'Legs · Chest · Back · Shoulders',
    exercises: [
      { name: 'Back Squats',       sets: 4, reps: 10, weightKg: 80 },
      { name: 'Bench Press',       sets: 3, reps: 10, weightKg: 60 },
      { name: 'Romanian Deadlift', sets: 3, reps: 10, weightKg: 70 },
      { name: 'Pull-ups',          sets: 3, reps: 8,  weightKg: 0  },
      { name: 'Shoulder Press',    sets: 3, reps: 12, weightKg: 35 },
    ],
    previewCount: 4,
    totalSets: 16,
  },
];
```

The `badgeColor` string maps to badge token classes defined below.

---

### Visual Spec — Template Card

**Card container** (`.guided-template-card`):
```css
background: rgba(255, 255, 255, 0.03);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 20px;
padding: 22px;
display: flex;
flex-direction: column;
gap: 0;
transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
cursor: pointer;
```

**Card hover:**
```css
border-color: rgba(255, 255, 255, 0.14);
transform: translateY(-4px);
box-shadow: 0 8px 24px rgba(124, 77, 255, 0.20);
```

**Card icon + badge row** (`.guided-card-top`):
```css
display: flex;
align-items: center;
justify-content: space-between;
margin-bottom: 14px;
```

Icon wrapper (`.guided-card-icon`):
```css
width: 40px;
height: 40px;
border-radius: 12px;
background: rgba(124, 77, 255, 0.12);
border: 1px solid rgba(124, 77, 255, 0.20);
display: flex;
align-items: center;
justify-content: center;

mat-icon inside: font-size 20px; color: var(--primary);
```

**Badge tokens by `badgeColor` value:**

| badgeColor | CSS class     | Background                  | Text color |
|---|---|---|---|
| `strength` | `.badge-strength` | `rgba(167,139,250,0.14)` | `#a78bfa` |
| `gain`     | `.badge-gain`     | `rgba(74,222,128,0.10)`  | `#4ade80` |
| `lose`     | `.badge-lose`     | `rgba(255,64,129,0.12)`  | `#ff4081` |
| `maintain` | `.badge-maintain` | `rgba(56,189,248,0.10)`  | `#38bdf8` |

Badge base styles (`.guided-card-badge`):
```css
font-size: 10px;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.06em;
padding: 3px 9px;
border-radius: 999px;
```

**Card title** (`.guided-card-title`):
```css
font-size: 17px;
font-weight: 800;
color: var(--white);
margin-bottom: 4px;
```

**Card muscle groups** (`.guided-card-muscles`):
```css
font-size: 12px;
font-weight: 400;
color: rgba(255, 255, 255, 0.45);
margin-bottom: 16px;
```

**Divider** (`.guided-card-divider`):
```css
height: 1px;
background: rgba(255, 255, 255, 0.06);
margin-bottom: 14px;
```

**Exercise list** (`.guided-card-exercises`):
```css
display: flex;
flex-direction: column;
gap: 8px;
margin-bottom: 10px;
```

Single exercise row (`.guided-exercise-row`):
```css
display: flex;
align-items: center;
justify-content: space-between;
```

Exercise name text:
```css
font-size: 13px;
font-weight: 500;
color: rgba(255, 255, 255, 0.75);

/* Leading dot */
::before content: "●"; 
color: rgba(124, 77, 255, 0.55);
margin-right: 8px;
font-size: 6px;
vertical-align: middle;
```

Exercise sets × reps text:
```css
font-size: 12px;
font-weight: 600;
color: rgba(255, 255, 255, 0.38);
white-space: nowrap;
```

**"+N more" row** (`.guided-card-more`):
```css
font-size: 11px;
font-weight: 500;
color: rgba(255, 255, 255, 0.30);
padding-left: 14px;   /* indent to align with exercise names */
margin-bottom: 16px;
```

**Stats row** (`.guided-card-stats`):
```css
display: flex;
align-items: center;
gap: 14px;
font-size: 12px;
font-weight: 600;
color: rgba(255, 255, 255, 0.40);
margin-bottom: 18px;

/* Inline dots between items */
/* "● 5 exercises   ● 16 sets" — dot is rgba(255,255,255,0.15) */
```

**"Start this workout" button** (`.guided-start-btn`):

Uses `.btn-primary` global class, plus overrides:
```css
width: 100%;
height: 44px;
display: flex;
align-items: center;
justify-content: center;
gap: 8px;
font-size: 14px;
font-weight: 700;
border-radius: 12px;
```

Leading icon: `play_arrow` mat-icon, 18px.

**Button loading state:**
- Replace `play_arrow` icon with `mat-spinner` (diameter 18, `color: white`)
- Button text changes to `"Saving…"`
- `disabled` attribute added to prevent double-tap
- Background opacity drops to 0.7

**Button error state:**
- Reset to normal after 2s
- `ngx-toastr` error toast fires: `"Couldn't create workout. Try again."`

---

### "Create your own" escape link

```css
/* .guided-empty-escape */
margin-top: 20px;
font-size: 12px;
font-weight: 500;
color: rgba(255, 255, 255, 0.35);
text-decoration: none;
cursor: pointer;
transition: color 0.15s;

&:hover {
  color: rgba(255, 255, 255, 0.65);
}
```

Text: `"Or create your own workout →"`
Action: Scrolls past the guided state and opens the existing "Add Template" form /
dialog (delegates to the standard create-workout flow in `workouts-content.component`).

---

### States — WorkoutsGuidedEmptyComponent

| State | Trigger | Visual |
|---|---|---|
| **Loading (start CTA tapped)** | `isStarting` signal = true | Spinner on button, button text "Saving…", opacity 0.7 |
| **Success** | API returns new template ID | Component emits `(templateSaved)` → parent navigates to session |
| **Error** | API call fails | Button resets; ngx-toastr error fires |
| **All saved** | All 3 templates used | Guided state hidden; normal template list renders |

---

### Component Interactions

1. **Hover on template card** → `translateY(-4px)`, purple-tinted shadow, border brightens
2. **Tap "Start this workout"**:
   a. Button → loading state  
   b. `WorkoutsTabFacade.createTemplate(template)` called (POST /api/workouts)  
   c. On success → emit `(sessionReady: templateId)` → parent routes to `/workouts/session/:id`  
   d. On error → reset + toast  
3. **Tap "Or create your own"** → emit `(createOwn)` → parent shows the standard template-creation flow

---

### Angular Material Components

- `mat-icon` — `fitness_center`, `accessibility_new`, `play_arrow`
- `mat-progress-spinner` (diameter: 18) — button loading state
- No `MatCard` — custom CSS cards are needed for glassmorphism compliance

---

### CSS Classes to Reuse

- `.btn-primary` — "Start this workout" button base
- `.pill` — Not used (custom badge classes defined per token)
- `.guided-template-card` — NEW (define in component CSS)
- `.guided-empty-container` — NEW shared wrapper (define in shared styles or each component)
- `.guided-empty-icon` — NEW shared (same pattern)
- `.guided-empty-headline` — NEW shared
- `.guided-empty-sub` — NEW shared

---

### Responsiveness — WorkoutsGuidedEmptyComponent

**Desktop (≥ 768px):**
```css
.guided-templates-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  width: 100%;
  max-width: 960px;
}
```

**Tablet (< 768px):**
```css
.guided-templates-grid {
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  gap: 14px;
  padding-bottom: 8px;          /* space for scrollbar */
  width: 100%;
  scrollbar-width: none;        /* hide scrollbar — Firefox */
}
.guided-templates-grid::-webkit-scrollbar { display: none; }

.guided-template-card {
  min-width: calc(85vw - 40px);
  scroll-snap-align: start;
  flex-shrink: 0;
}
```

**Mobile (< 480px):**
```css
.guided-template-card {
  min-width: calc(90vw - 32px);
}
```

Scroll hint: on mobile, the second card peeks (≈ 20px visible) to signal scrollability.
No pagination dots — the peeking edge is sufficient affordance.

---

## Component 2 — NutritionGuidedEmptyComponent

**Selector:** `app-nutrition-guided-empty`
**File location:** `features/user/nutrition-tab/guided-empty/`
**Used by:** `nutrition-tab.component` — replace the `.empty` block when `meals.length === 0`

---

### User Story (component-level)

As a new user on the Nutrition tab, I want the fastest possible path to logging
my first meal so that I don't have to know macros off the top of my head to get
started.

---

### Layout

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│             [restaurant 28px icon in 56px box]           │
│                                                          │
│           What's on the menu today?                      │  20px/800
│   Track your first meal — AI handles the macro math      │  14px/400
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │   📷    Analyze with AI                            │  │  ← AI CTA card
│  │         Snap a photo · macros fill in seconds      │  │
│  │                                            [ → ]   │  │  ← chevron
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│              Prefer to type? Add manually                │  ← secondary link
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

### Visual Spec — NutritionGuidedEmptyComponent

**AI CTA Card** (`.nutrition-ai-cta`):
```css
background: rgba(124, 77, 255, 0.07);
border: 1.5px solid rgba(124, 77, 255, 0.30);
border-radius: 16px;
padding: 20px 22px;
width: 100%;
max-width: 400px;
display: flex;
align-items: center;
gap: 16px;
cursor: pointer;
transition: background 0.18s ease, border-color 0.18s ease,
            transform 0.18s ease, box-shadow 0.18s ease;
```

**CTA card hover:**
```css
background: rgba(124, 77, 255, 0.12);
border-color: rgba(124, 77, 255, 0.50);
transform: translateY(-2px);
box-shadow: 0 6px 20px rgba(124, 77, 255, 0.22);
```

**Camera icon container** (`.nutrition-ai-cam`):
```css
width: 48px;
height: 48px;
border-radius: 14px;
background: rgba(124, 77, 255, 0.16);
border: 1px solid rgba(124, 77, 255, 0.28);
display: flex;
align-items: center;
justify-content: center;
flex-shrink: 0;

mat-icon inside: font-size 24px; color: var(--primary);
/* mat-icon name: "photo_camera" */
```

**CTA text block** (`.nutrition-ai-text`):
```css
flex: 1;
```

CTA headline:
```css
font-size: 15px;
font-weight: 700;
color: var(--white);
margin-bottom: 3px;
```
Text: `"Analyze with AI"`

CTA subtext:
```css
font-size: 12px;
font-weight: 400;
color: rgba(255, 255, 255, 0.45);
```
Text: `"Snap a photo · macros fill in seconds"`

**Trailing chevron** (`.nutrition-ai-chevron`):
```css
mat-icon: "chevron_right"; 
font-size: 20px;
color: rgba(124, 77, 255, 0.65);
flex-shrink: 0;
```

**Speed badge** (optional — sits above the CTA card, visually attached to top-right corner):
```css
/* .nutrition-ai-badge */
position: absolute;
top: -10px;
right: 16px;
background: rgba(74, 222, 128, 0.14);
border: 1px solid rgba(74, 222, 128, 0.28);
border-radius: 999px;
padding: 3px 10px;
font-size: 10px;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.06em;
color: #4ade80;
```
Text: `"~ 10 SECONDS"`

The CTA card container needs `position: relative` to allow the badge to anchor.

---

### "Add manually" secondary link

```css
/* .nutrition-manual-link */
margin-top: 16px;
font-size: 13px;
font-weight: 500;
color: rgba(255, 255, 255, 0.35);
text-decoration: none;
cursor: pointer;
transition: color 0.15s;

&:hover {
  color: rgba(255, 255, 255, 0.65);
}
```

Text: `"Prefer to type?  Add manually"`
— "Add manually" portion should be slightly brighter: `color: rgba(255,255,255,0.55)` and `text-decoration: underline`.

---

### Interactions — NutritionGuidedEmptyComponent

1. **Tap AI CTA card** → emit `(openAiAnalyzer)` → parent (`nutrition-tab.component`)
   opens the AI meal analyzer. Implementation note: the existing
   `AiMealAnalyzerComponent` in `dashboard/daily-user-data/ai-meal-analyzer/`
   should be extracted to a shared dialog that both Dashboard and Nutrition can open.
   If not yet refactored, the parent may route to `/dashboard` with a query param
   `?openAnalyzer=1` as a temporary bridge.

2. **Tap "Add manually"** → emit `(openManualEntry)` → parent opens the existing
   add-meal form/dialog (standard nutrition entry flow).

3. **After meal saved** (parent detects `meals().length > 0`) → the guided empty
   state is hidden; the standard meal list renders.

---

### States — NutritionGuidedEmptyComponent

| State | Trigger | Visual |
|---|---|---|
| **Idle** | Default empty | Full layout as specced above |
| **Loading** | Parent `isLoading()` while fetching today's meals on init | 3-row skeleton replacing the CTA card (rgba(255,255,255,0.04) blocks) |
| **Error** | Parent fetch failed | Accent-colored inline banner: `"Couldn't load today's meals"` + `"Retry"` ghost button |

Skeleton for loading:
```css
/* .nutrition-skeleton-block */
background: rgba(255, 255, 255, 0.04);
border-radius: 12px;
height: 84px;      /* matches CTA card height */
width: 100%;
max-width: 400px;
animation: pulse 1.8s ease-in-out infinite;  /* reuses global keyframe */
```

---

### Angular Material Components — Nutrition

- `mat-icon` — `restaurant`, `photo_camera`, `chevron_right`
- No `mat-spinner` needed (the loading skeleton is preferred here)

---

### CSS Classes to Reuse — Nutrition

- `.guided-empty-container` — shared wrapper
- `.guided-empty-icon` — icon box at top
- `.guided-empty-headline` — headline text
- `.guided-empty-sub` — subheadline text
- `.btn-ghost` — NOT used here (the manual entry is a text link, not a button)
- `.nutrition-ai-cta` — NEW (define in component CSS)
- `.nutrition-manual-link` — NEW (define in component CSS)

---

### Responsiveness — NutritionGuidedEmptyComponent

**All breakpoints:** Single column, centered. Max-width 400px on the CTA card.
The layout does not change — it is already mobile-optimised at its design.

**< 480px:**
```css
.nutrition-ai-cta {
  padding: 16px 18px;
}
.nutrition-ai-cam {
  width: 42px;
  height: 42px;
}
```

---

## Component 3 — SocialFeedGuidedEmptyComponent

**Selector:** `app-social-feed-guided-empty`
**File location:** `features/social/feed/guided-empty/`
**Used by:** `social-feed.component` — replace the `.empty` block when
`feedPosts().length === 0 && followingCount() === 0`

---

### User Story (component-level)

As a new user on the Social Feed, I want to see real accounts to follow right here
without navigating away so that my feed fills up within seconds of landing on this
screen for the first time.

---

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│             [group 28px icon in 56px box]                   │
│                                                              │
│           Your feed is waiting for you                       │  20px/800
│  Follow athletes below to see workouts, meals & progress     │  14px/400
│                                                              │
│  ─── Suggested for you ─────────────────────────────────     │  ← section label
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [AV]  FitApp Official     [STRENGTH]  [+ Follow ]   │   │  ← user card
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [AV]  User Name           [GAIN]      [+ Follow ]   │   │  ← user card
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [AV]  User Name           [LOSE WT]   [+ Follow ]   │   │  ← user card
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [AV]  User Name           [MAINTAIN]  [+ Follow ]   │   │  ← user card
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [AV]  User Name           [CARDIO]    [+ Follow ]   │   │  ← user card
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [  Explore more in Discover  →  ]                           │  ← ghost btn
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

### Data Source

**Endpoint:** `GET /api/social/discover?limit=5`

This is the existing discover endpoint. The component calls it via
`SocialFacade.getDiscoverUsers(limit: 5)`. If the endpoint returns fewer
than 5 users (small user base), only the returned users are shown —
no placeholder cards for missing slots.

**Signal shape:**
```typescript
suggestedUsers = signal<SuggestedUser[]>([]);
loadingUsers   = signal<boolean>(true);
followingSet   = signal<Set<number>>(new Set());  // tracks in-flight + confirmed follows
```

---

### Visual Spec — User Suggestion Card

**Card** (`.feed-suggest-card`):
```css
background: rgba(255, 255, 255, 0.025);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 14px;
padding: 14px 16px;
display: flex;
align-items: center;
gap: 12px;
transition: border-color 0.18s, background 0.18s;
```

**Card hover:**
```css
background: rgba(255, 255, 255, 0.04);
border-color: rgba(255, 255, 255, 0.12);
```

**Avatar** (`.feed-suggest-avatar`):
```css
width: 44px;
height: 44px;
border-radius: 50%;
background: rgba(124, 77, 255, 0.16);
border: 1.5px solid rgba(124, 77, 255, 0.28);
display: flex;
align-items: center;
justify-content: center;
flex-shrink: 0;
overflow: hidden;

/* If user has a profile image: */
img { width: 100%; height: 100%; object-fit: cover; }

/* If no image — initials: */
font-size: 14px;
font-weight: 700;
color: var(--primary);
text-transform: uppercase;
```

Initials logic: take first letter of first name + first letter of last name.
If display name is single-word, use first 2 characters.

**User info block** (`.feed-suggest-info`):
```css
flex: 1;
min-width: 0;       /* allows text truncation */
```

Username:
```css
font-size: 14px;
font-weight: 700;
color: var(--white);
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
margin-bottom: 4px;
```

**Fitness goal badge** — use existing `.pill` class + goal-specific modifier:

| Goal value (API) | CSS class | Background | Text |
|---|---|---|---|
| `LoseWeight` | `.pill-goal-lose` | `rgba(255,64,129,0.12)` | `#ff4081` |
| `GainMuscle` | `.pill-goal-gain` | `rgba(74,222,128,0.10)` | `#4ade80` |
| `Maintain` | `.pill-goal-maintain` | `rgba(56,189,248,0.10)` | `#38bdf8` |
| `Strength` | `.pill-goal-strength` | `rgba(167,139,250,0.14)` | `#a78bfa` |
| `Cardio` | `.pill-goal-cardio` | `rgba(56,189,248,0.10)` | `#38bdf8` |
| (null/unknown) | `.pill-subtle` | default muted | default muted |

Badge base:
```css
font-size: 10px;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.05em;
padding: 2px 8px;
border-radius: 999px;
display: inline-flex;
```

**Follow button** (`.feed-suggest-follow-btn`):

Default state (not following):
```css
padding: 7px 16px;
height: 34px;
min-width: 88px;
border-radius: 10px;
background: var(--primary);
color: var(--white);
font-size: 12px;
font-weight: 700;
border: none;
cursor: pointer;
display: flex;
align-items: center;
gap: 6px;
flex-shrink: 0;
transition: opacity 0.15s, transform 0.15s;
```
Content: `add` mat-icon (16px) + `"Follow"`

**Follow button hover:**
```css
opacity: 0.85;
transform: translateY(-1px);
```

**Follow button — loading state** (while API call in-flight):
```css
background: rgba(124, 77, 255, 0.45);
cursor: default;
pointer-events: none;
```
Content: `mat-progress-spinner` (diameter: 14, color: white) — no text

**Follow button — followed state** (after success):
```css
background: transparent;
border: 1px solid rgba(255, 255, 255, 0.14);
color: rgba(255, 255, 255, 0.55);
pointer-events: none;   /* can't unfollow from this component */
```
Content: `check` mat-icon (14px) + `"Following"`

The follow state is tracked in `followingSet` signal — persisted for the lifetime
of the component. Full state syncs when the component remounts.

---

### "Suggested for you" Section Label

```css
/* .feed-suggest-section-label */
display: flex;
align-items: center;
gap: 10px;
margin-bottom: 14px;
width: 100%;
max-width: 480px;
```

Label text:
```css
font-size: 11px;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.06em;
color: rgba(255, 255, 255, 0.35);
white-space: nowrap;
```
Text: `"Suggested for you"`

Flanking lines:
```css
flex: 1;
height: 1px;
background: rgba(255, 255, 255, 0.06);
```

---

### "Explore more" ghost button

```css
/* Reuses .btn-ghost global class, plus: */
margin-top: 20px;
height: 42px;
padding: 0 22px;
border-radius: 12px;
font-size: 13px;
font-weight: 600;
display: inline-flex;
align-items: center;
gap: 8px;
```

Icon: `explore` mat-icon, 18px.
Text: `"Explore more in Discover"`
Action: Navigate to `/social/discover` via `RouterLink`.

---

### States — SocialFeedGuidedEmptyComponent

| State | Trigger | Visual |
|---|---|---|
| **Loading** | `loadingUsers()` true (API call in progress) | 5 skeleton cards |
| **Loaded** | Users returned from API | Full layout as specced |
| **Empty discover** | API returns 0 users | Icon + "No suggestions yet — come back soon" + ghost "Explore Discover" button |
| **Follow in-flight** | `followingSet` contains userId as pending | Spinner on that card's button only |
| **All followed** | All 5 users followed | Cards remain visible with "Following" state; ghost "Explore more" button becomes the primary CTA; headline updates to `"Great start! Refresh to see their posts"` |
| **Error** | API call failed | Inline accent banner: `"Couldn't load suggestions"` + `"Retry"` ghost btn |

---

### Skeleton Loading State (5 cards)

```css
/* .feed-suggest-skeleton */
background: rgba(255, 255, 255, 0.04);
border-radius: 14px;
height: 72px;        /* matches card height */
width: 100%;
max-width: 480px;
animation: pulse 1.8s ease-in-out infinite;  /* global keyframe */
```

Stagger the pulse animation:
```css
.feed-suggest-skeleton:nth-child(1) { animation-delay: 0ms; }
.feed-suggest-skeleton:nth-child(2) { animation-delay: 120ms; }
.feed-suggest-skeleton:nth-child(3) { animation-delay: 240ms; }
.feed-suggest-skeleton:nth-child(4) { animation-delay: 360ms; }
.feed-suggest-skeleton:nth-child(5) { animation-delay: 480ms; }
```

---

### Angular Material Components — Social Feed

- `mat-icon` — `group`, `add`, `check`, `explore`
- `mat-progress-spinner` (diameter: 14) — follow button loading state
- No `MatCard` — custom CSS

---

### CSS Classes to Reuse — Social Feed

- `.btn-ghost` — "Explore more" button
- `.pill` — base badge style
- `.guided-empty-container` — shared wrapper
- `.guided-empty-icon` — top icon box
- `.guided-empty-headline` — headline
- `.guided-empty-sub` — subheadline
- `.feed-suggest-card` — NEW (component CSS)
- `.feed-suggest-avatar` — NEW (component CSS)
- `.feed-suggest-follow-btn` — NEW (component CSS)
- `.feed-suggest-section-label` — NEW (component CSS)
- `.pill-goal-*` — NEW modifier classes (define in component CSS — goal badge colours)

---

### Responsiveness — SocialFeedGuidedEmptyComponent

The card list is single-column at all breakpoints. The max-width of the card list:

```css
.feed-suggest-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 480px;
}
```

**< 480px:** Reduce card padding:
```css
.feed-suggest-card {
  padding: 12px 14px;
}
.feed-suggest-follow-btn {
  min-width: 78px;
  padding: 7px 12px;
}
```

---

## Accessibility — All Three Components

| Concern | Implementation |
|---|---|
| **Guided empty container** | `role="region"` with `aria-label="[Module] getting started"` |
| **Workouts template cards** | `role="article"` on each card; `aria-label="Push Day template: 5 exercises, 16 sets"` |
| **Start workout button** | `aria-busy="true"` during loading state; `aria-label="Start Push Day workout"` |
| **AI CTA card (Nutrition)** | `role="button"` with `aria-label="Analyze meal with AI"` since it's a div-button |
| **Manual entry link** | standard `<button>` or `<a>` — no ARIA needed beyond semantic HTML |
| **Follow button (Social)** | `aria-label="Follow [username]"`, `aria-pressed="false"` → `"true"` on follow |
| **Follow loading state** | `aria-busy="true"` + `aria-label="Following [username], please wait"` |
| **Skeleton cards** | `aria-hidden="true"` — screen readers skip skeletons; `aria-label="Loading suggestions"` on the list container |
| **Color-only goal badges** | Badge text is always present (not icon-only) — colour is enhancement only |
| **Minimum touch targets** | Follow button: 34px height with 48px implied tap area via `padding` on parent row; all interactive elements ≥ 48×48px tap target |
| **Focus ring** | All interactive elements must have visible `outline` on `:focus-visible` — do not suppress globally |
| **Tab order** | Workouts: icon area → template cards (left to right) → escape link; Nutrition: icon → AI CTA → manual link; Social: icon → user cards (top to bottom) → Discover button |
| **Contrast** | All body text ≥ WCAG AA; ghost sub-text at `rgba(255,255,255,0.35)` is decorative supplementary copy — acceptable below AA by design |

---

## Component File Locations Summary

| Component | Location | Used by |
|---|---|---|
| `WorkoutsGuidedEmptyComponent` | `features/workouts/guided-empty/workouts-guided-empty.component.ts` | `workouts-content.component` |
| `NutritionGuidedEmptyComponent` | `features/user/nutrition-tab/guided-empty/nutrition-guided-empty.component.ts` | `nutrition-tab.component` |
| `SocialFeedGuidedEmptyComponent` | `features/social/feed/guided-empty/social-feed-guided-empty.component.ts` | `social-feed.component` |

All three are **standalone Angular 19 components** using `@if` / `@for` control flow.

---

## Shared CSS (define once in styles.css or a shared partial)

The following classes are used by all three components and should be added once to
the global `styles.css` (or a shared `guided-empty.css` that all three import):

```css
/* ==============================
   Guided Empty State — Shared
   ============================== */

.guided-empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 20px 40px;
  width: 100%;
  animation: slideUp 0.35s ease-out;
}

.guided-empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(124, 77, 255, 0.12);
  border: 1px solid rgba(124, 77, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.guided-empty-icon mat-icon {
  font-size: 28px;
  width: 28px;
  height: 28px;
  color: var(--primary);
}

.guided-empty-headline {
  font-size: 20px;
  font-weight: 800;
  color: var(--white);
  text-align: center;
  margin-bottom: 8px;
  line-height: 1.2;
}

.guided-empty-sub {
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.50);
  text-align: center;
  max-width: 320px;
  line-height: 1.5;
  margin-bottom: 28px;
}
```

**Note to `@angular-developer`:** these 5 classes replace (and supersede) the
existing `.empty` global class for all three guided empty state components.
The `.empty` class remains intact for all other empty states in the app that have
not yet been updated.

---

## Out of Scope for Fix 7

- **Post-workout feedback** (celebration card after completing a session) →
  flagged for Fix 8 per audit § 6 "Post-workout feedback void"
- **Post-meal macro progress bar** (animated running total after logging a meal) →
  Fix 8
- **Daily completion ring** (Apple Watch-style full-day reward) → Fix 8
- **beSocial Discover ghost-town seeding** (admin content strategy) →
  separate product/content task, not a UI fix
- **onboarding "Your Numbers" reveal screen** → Fix 4 per audit § 1 / rank 4
- **Unfollow from the social guided state** — follow only; unfollow is available
  from the full profile page
- **"Start this workout" without saving template** (offline/guest mode) → not
  currently in scope; the template must be saved to the API before the session can
  be started
