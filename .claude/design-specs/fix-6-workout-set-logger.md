## UI Spec: Fix 6 — Active Workout Set Logger Redesign

**Author:** @uiux-designer
**Date:** 2026-05-29
**Audit reference:** Full Platform Audit § 7 — Mobile UX & Touch Patterns
**Status:** READY_FOR_IMPLEMENTATION

---

### User Story

As a gym user mid-workout, I want to log each set's actual reps and weight using large
touch targets and gesture shortcuts so that I can track my session without stopping to
fumble with a keyboard between sets.

---

### Context — What Exists vs. What Is New

The current `workouts-tab.component` is a **template editor** — it lets users define
workout plans (exercise name, target sets/reps/weight). There is no active session
logger. Fix 6 introduces two net-new components:

| Component | Role |
|---|---|
| `WorkoutSetRowComponent` | Atomic set row — weight +/−, reps +/−, swipe gestures, states |
| `ActiveWorkoutSessionComponent` | Full-screen session shell — exercises, set rows, elapsed timer, finish FAB, rest timer |

The template's `WorkoutExercise[]` data (`name`, `sets`, `reps`, `weightKg`) provides
the initial values. The session logger captures per-set actuals (may differ from target).

---

### UX Flow

```
1. User taps "Start Workout" on a template card in workouts-tab
2. ActiveWorkoutSessionComponent opens as a full-screen bottom sheet (mobile)
   or as a routed page (desktop: /workouts/session/:templateId)
3. Each exercise is shown as a section with N set rows pre-populated from
   the template's target values (last session values shown as ghost text)
4. User swipes a set row RIGHT to mark it complete → rest timer auto-starts
5. Rest timer counts down (default 90s); user can skip or extend
6. User adjusts reps/weight using large +/− buttons; no keyboard required
7. Long-press on a set row → inline edit mode → precise value input
8. User can swipe set row LEFT to delete an individual set
9. After all sets across all exercises are complete → "Finish" FAB pulses
10. Tap "Finish" → post-workout summary card (Fix 6 scope ends here;
    summary card is out-of-scope — flagged for Fix 8)
```

---

### Component 1 — WorkoutSetRowComponent

**Selector:** `app-workout-set-row`
**File location:** `shared/components/workout-set-row/`
**Used by:** `ActiveWorkoutSessionComponent`

#### Layout

```
┌────────────────────────────────────────────────────────────────┐
│  [3]   ─  80.0  +      ×      ─   8  +    ✓ (swipe hint)     │
│        └─ weight ─┘         └─ reps ─┘                        │
│  last time: 80kg × 8                                (ghost)    │
└────────────────────────────────────────────────────────────────┘
```

Three horizontal layers stacked:
1. **Set number badge** + **weight stepper** + **reps stepper** + **completion hint**
2. **Ghost previous session text** (below the steppers, left-aligned)

#### Visual Spec

**Row container:**
```css
background: rgba(255, 255, 255, 0.03);
border: 1px solid rgba(255, 255, 255, 0.07);
border-radius: 14px;
padding: 12px 14px;
min-height: 72px;
position: relative;
overflow: hidden;           /* clips swipe reveal backgrounds */
transition: background 0.18s;
```

**States:**
| State | Border left | Background | Opacity |
|---|---|---|---|
| Idle | `3px solid rgba(255,255,255,0.1)` | `rgba(255,255,255,0.03)` | 1 |
| Editing | `3px solid var(--primary)` | `rgba(124,77,255,0.06)` | 1 |
| Completed | `3px solid #4ade80` | `rgba(74,222,128,0.05)` | 0.7 |
| Deleting (swipe reveal) | none | `rgba(255,64,129,0.15)` behind row | 1 |

**Set number badge:**
```css
width: 28px;
height: 28px;
border-radius: 8px;
background: rgba(124, 77, 255, 0.14);
border: 1px solid rgba(124, 77, 255, 0.28);
color: var(--primary);
font-size: 11px;
font-weight: 800;
display: flex;
align-items: center;
justify-content: center;
flex-shrink: 0;
```

#### Stepper sub-component (weight and reps — identical pattern)

```
┌──────────────────────────────────┐
│  [−]     80.0 kg     [+]         │
└──────────────────────────────────┘
```

**Decrement / increment buttons:**
```css
width: 48px;
height: 48px;
border-radius: 12px;
background: rgba(255, 255, 255, 0.06);
border: 1px solid rgba(255, 255, 255, 0.1);
color: var(--white);
font-size: 20px;
display: flex;
align-items: center;
justify-content: center;
cursor: pointer;
transition: background 0.15s, transform 0.1s;
/* active press: */
/* transform: scale(0.92); background: rgba(124,77,255,0.14); */
```
Touch target: **exactly 48×48px** — enforce via `min-width`, `min-height`.

**Value display (between the two buttons):**
```css
min-width: 64px;
text-align: center;
font-size: 18px;
font-weight: 700;
color: var(--white);
user-select: none;  /* no accidental text selection on long-press */
```

**Step increments:**
| Field | Default step | Long-press step |
|---|---|---|
| Weight (kg) | 2.5 kg | 5.0 kg (hold for 500ms) |
| Reps | 1 | 1 |

Weight values: always display with 1 decimal place (e.g., `80.0`, `82.5`).
Reps: whole numbers only, minimum 1.

**Unit label:**
```css
font-size: 11px;
font-weight: 600;
color: rgba(255, 255, 255, 0.35);
text-transform: uppercase;
letter-spacing: 0.05em;
```

**Ghost "last time" text:**
```
font-size: 11px;
font-weight: 500;
color: rgba(255, 255, 255, 0.28);
font-style: italic;
margin-top: 6px;
```
Content: `"last time: 80kg × 8"` — populated from previous session data.
If no previous session data: text is omitted entirely (not replaced with a dash).

#### Swipe Right — Mark Complete

**Trigger:** horizontal translation ≥ 60px (pointer/touch)
**Mechanics:**
- Row slides right via CSS `transform: translateX(Xpx)` — no JavaScript animation library
- Behind the row, a green reveal layer is exposed:
  ```css
  /* .set-row-complete-reveal */
  position: absolute;
  left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(74, 222, 128, 0.12);
  border-radius: 14px;
  display: flex;
  align-items: center;
  padding-left: 16px;
  ```
  Contains a `check_circle` mat-icon in `#4ade80` at 24px.
- At ≥ 60px: reveal bg reaches full opacity (1), icon fully visible
- On pointer-up at ≥ 60px: row snaps to completed state:
  1. Row slides back to `translateX(0)` with `transition: transform 0.22s ease-out`
  2. Row enters **Completed** state (green border-left, 0.7 opacity)
  3. The check icon appears permanently at the right edge of the completed row
  4. Rest timer fires (see Component 3)
- On pointer-up < 60px: elastic snap back — `transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)`

**Completed row appearance:**
```
[3]  80.0 kg  ×  8 reps          ✓
     (all text dimmed to 0.5 opacity; check_circle in #4ade80 at right)
```
The ghost "last time" text is hidden on completed rows.

#### Swipe Left — Delete Set

**Trigger:** horizontal translation ≤ −60px
**Mechanics:**
- Row slides left
- Red reveal layer exposed from the right:
  ```css
  /* .set-row-delete-reveal */
  position: absolute;
  right: 0; ...
  background: rgba(255, 64, 129, 0.12);
  justify-content: flex-end;
  padding-right: 16px;
  ```
  Contains a `delete_outline` mat-icon in `#ff4081` at 24px.
- On pointer-up at ≤ −60px:
  1. Row slides off-screen left: `transform: translateX(-110%)`, `transition: transform 0.25s ease-in`
  2. Row height collapses to 0 with `max-height` animation (`0.2s ease-out`, 0.1s delay)
  3. No confirmation dialog — action is immediate. (Rationale: gym context, one hand, no time for modals)
  4. Toast feedback: `"Set removed"` with undo action — **3 second window** to tap "Undo" in the toast before the deletion is finalized
- On pointer-up between −60px and 0: snap back (same cubic-bezier as swipe-right)

**Note on confirmation:** The standard confirmation modal is intentionally skipped for set deletion because (a) the action is reversible via the toast undo, (b) the modal would require two-handed interaction, (c) individual sets have low irreversibility risk — the template data is never modified.

#### Long-Press — Inline Edit

**Trigger:** `pointerdown` held ≥ 400ms without movement > 8px
**Haptic cue:** If `navigator.vibrate` is available, pulse 25ms on edit entry
**Behavior:**
- Row transitions to **Editing** state (purple border-left, `rgba(124,77,255,0.06)` bg)
- The value display between +/− buttons becomes a `<input type="number">`:
  ```css
  background: transparent;
  border: none;
  border-bottom: 1.5px solid var(--primary);
  color: var(--white);
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  width: 64px;
  outline: none;
  ```
- On mobile, `inputmode="decimal"` for weight, `inputmode="numeric"` for reps
- Keyboard appears for precise value entry (acceptable in this flow — user explicitly opted in via long-press)
- A small "Done ✓" pill button appears to the right of the row:
  ```css
  /* .set-row-done-btn */
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--primary);
  color: var(--white);
  font-size: 12px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  ```
- Tap "Done" or press Enter → dismiss keyboard, commit values, return to Idle state
- Tap outside the row → same as "Done" (blur handler commits)

---

### Component 2 — ActiveWorkoutSessionComponent

**Selector:** `app-active-workout-session`
**Route:** `/workouts/session/:templateId` (desktop); bottom sheet (mobile, < 640px)
**File location:** `features/workouts/active-session/`

#### Layout — Mobile (< 640px)

```
┌─────────────────────────────────────┐  ← fixed header, 56px
│  ← [X]   Pull Day A    00:14:23    │     workout name + elapsed HH:MM:SS
├─────────────────────────────────────┤
│                                     │
│  ── Bench Press ─────────────────  │  ← exercise section header
│                                     │
│  [Set 1 row]                        │
│  [Set 2 row — completed]            │
│  [Set 3 row]                        │
│  [Set 4 row]                        │
│                                     │
│  [+ Add set]  (dashed button)       │
│                                     │
│  ── Lat Pulldown ────────────────  │
│                                     │
│  [Set 1 row]                        │
│  ...                                │
│                                     │
│                            [Finish] │  ← sticky FAB, bottom-right
└─────────────────────────────────────┘
  [Rest timer toast]  ← fixed, above FAB
```

#### Layout — Desktop (≥ 640px)

Full-page view:
- Max-width: 720px, centered
- Two-column grid for exercise sections (exercises side-by-side)
- Rest timer as a card in the top-right sticky area rather than a toast

#### Header

```css
/* .session-header */
position: sticky;
top: 0;
z-index: 100;
background: rgba(13, 13, 16, 0.92);
backdrop-filter: blur(12px);
border-bottom: 1px solid rgba(255, 255, 255, 0.06);
height: 56px;
display: flex;
align-items: center;
padding: 0 16px;
gap: 12px;
```

- **Close button** (left): `close` mat-icon, 48×48px, `icon-btn-round` class
- **Workout name** (center, flex-1): 16px / 700 / white, truncated with ellipsis
- **Elapsed timer** (right): `font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.5); font-variant-numeric: tabular-nums;`
  — Updates every second via `setInterval` from session start time

**Elapsed timer format:** `MM:SS` below 60 minutes; `H:MM:SS` above 60 minutes.

#### Exercise Section Header

```css
/* .session-exercise-hdr */
display: flex;
align-items: center;
gap: 10px;
padding: 16px 0 10px;
```

- Exercise name: `font-size: 15px; font-weight: 700; color: var(--white);`
- Sets completed badge: `"2 / 4"` in `.pill-subtle`
- Completion check: `check_circle` in `#4ade80` appears when all sets in exercise are done

#### Set Rows

Each exercise section renders N `app-workout-set-row` components — one per planned set.
Gap between set rows: 8px.

#### Add Set Button

```css
/* .session-add-set-btn */
/* Reuses global .btn-add-ex */
width: 100%;
margin-top: 4px;
```
Label: `"+ Add set"` — tapping adds a new `WorkoutSetRowComponent` at bottom of exercise,
pre-filled with same weight/reps as the last set in the exercise.

#### Finish FAB

```css
/* .session-finish-fab */
position: fixed;
bottom: 24px;
right: 20px;
z-index: 200;
display: flex;
align-items: center;
gap: 8px;
padding: 14px 20px;
border-radius: 999px;
background: linear-gradient(135deg, var(--primary), var(--accent));
color: var(--white);
font-size: 14px;
font-weight: 700;
border: none;
cursor: pointer;
box-shadow: 0 6px 20px rgba(124, 77, 255, 0.35);
transition: opacity 0.18s, transform 0.15s;
```

**States:**
- Default: full opacity, `flag` mat-icon + "Finish"
- All sets complete: `animation: pulse 2s infinite` (reuses global keyframe) — user attention
- Hover/press: `opacity: 0.88; transform: scale(0.97);`

**Tap "Finish":** Confirm dialog (bottom sheet on mobile) — `"End workout? You've completed X of Y sets."` with "End workout" (primary) and "Keep going" (ghost) buttons. Destructive confirmation IS required here because finishing ends the session permanently.

---

### Component 3 — Rest Timer (part of ActiveWorkoutSessionComponent)

**Trigger:** emitted from `WorkoutSetRowComponent` on swipe-complete
**Position:** fixed toast at bottom of screen, above the FAB

```css
/* .session-rest-timer */
position: fixed;
bottom: 88px;              /* sits above the 56px FAB + 24px gap */
left: 50%;
transform: translateX(-50%);
z-index: 150;
display: flex;
align-items: center;
gap: 12px;
padding: 10px 16px;
border-radius: 999px;
background: rgba(13, 13, 16, 0.94);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.1);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
animation: slideUp 0.28s ease-out;  /* reuses global keyframe */
```

#### Timer anatomy

```
  🔥 Rest  [━━━━━━━━━━━░░░░░░░]  01:24  [Skip]  [+30s]
```

- **Icon:** `timer` mat-icon, 18px, `color: var(--primary)`
- **Label:** `"Rest"` — `font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.55);`
- **Progress arc / bar:**
  ```css
  /* Linear version (simpler, no Canvas needed) */
  width: 80px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  /* inner fill: */
  background: var(--primary);
  transition: width 1s linear;
  ```
  Fill width decreases linearly from 100% to 0% over the duration.
- **Countdown:** `font-size: 14px; font-weight: 700; color: var(--white); font-variant-numeric: tabular-nums;`
  Format: `MM:SS` (e.g., `"01:24"`)
- **Skip button:** `.btn-ghost` at `height: 32px; padding: 0 12px; font-size: 12px;`
  — Dismisses rest timer immediately
- **+30s button:** small ghost pill, same sizing
  — Adds 30 seconds to remaining time; label updates to show new duration

#### Rest Timer Durations

Configurable via a duration selector shown when the timer first appears (one-time per session, stores in component state — not persisted):
- 30s, 60s, **90s** (default), 120s, 180s, 300s

Duration selector: horizontal pill-button group rendered above the timer row, visible only during the first rest of the session:
```
[30s]  [60s]  [90s ✓]  [120s]  [180s]  [300s]
```
After first rest, selector collapses and the chosen duration is used for all subsequent rests.

**Timer auto-dismiss:** At 0 seconds — toast slides down and disappears (`slideDown` — inverse of slideUp; defined component-scope). No sound (gym = potentially no audio).

**Visual warning:** At 10 seconds remaining, countdown text turns `#ff9800` (orange). At 0, flash white once before dismiss.

---

### States — Full Matrix

#### WorkoutSetRowComponent

| State | Trigger | Visual | Behavior |
|---|---|---|---|
| **Idle** | Initial / snap-back | Gray border-left, normal opacity | Steppers active |
| **Swiping right** | pointer translation > 0 | Row shifts right; green bg fades in behind | Real-time translate |
| **Completed** | Swipe right ≥ 60px confirmed | Green border-left, 0.7 opacity, ✓ icon | Steppers disabled; rest timer fires |
| **Swiping left** | pointer translation < 0 | Row shifts left; red bg fades in behind | Real-time translate |
| **Deleting** | Swipe left ≥ 60px confirmed | Slides off + collapses | Undo toast appears |
| **Editing** | Long-press ≥ 400ms | Purple border-left; inputs activate | Keyboard opens |

#### ActiveWorkoutSessionComponent

| State | Trigger | Visual |
|---|---|---|
| **Active** | On mount | All set rows idle |
| **Resting** | Set completed | Rest timer toast visible |
| **All complete** | All rows completed | FAB pulses |
| **Confirming finish** | FAB tap | Confirm bottom sheet |

---

### Animations — Component-Scoped

All defined in `workout-set-row.component.css` and `active-workout-session.component.css`.
Do NOT add to global `styles.css`.

```css
/* Collapse row height after delete */
@keyframes set-row-collapse {
  from { max-height: 80px; opacity: 1; margin-bottom: 8px; }
  to   { max-height: 0;    opacity: 0; margin-bottom: 0; }
}

/* Completed set checkmark pop-in */
@keyframes set-row-check-pop {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.2); }
  100% { transform: scale(1);   opacity: 1; }
}

/* Stepper button press feedback */
@keyframes set-btn-press {
  0%   { transform: scale(1); }
  40%  { transform: scale(0.90); }
  100% { transform: scale(1); }
}

/* Rest timer slide-down dismiss */
@keyframes timer-slide-down {
  from { transform: translateX(-50%) translateY(0); opacity: 1; }
  to   { transform: translateX(-50%) translateY(120%); opacity: 0; }
}
```

---

### Angular Material Components

| Purpose | Component |
|---|---|
| Icons | `mat-icon` — `check_circle`, `delete_outline`, `close`, `add_circle_outline`, `timer`, `flag` |
| Loading state | `mat-progress-spinner` (diameter 32) |
| Set completion animation | None — pure CSS |
| Confirm finish | Custom bottom sheet at `< 640px`, custom dialog at `>= 640px` — uses global `.overlay` / `.modal` pattern |

---

### CSS Classes to Reuse (from styles.css)

| Class | Usage |
|---|---|
| `.btn-primary` | "Finish" in confirm dialog |
| `.btn-ghost` | "Keep going" / "Skip rest" |
| `.btn-add-ex` | "Add set" button below exercise rows |
| `.pill` | Exercise type badge |
| `.pill-subtle` | Sets-completed count ("2 / 4"), rest timer short durations |
| `.empty` | Exercise with no sets |
| `.icon-btn-round` | Header close button |

New classes needed (define in component CSS, not global):
- `.set-row-*` — all WorkoutSetRowComponent classes
- `.session-*` — all ActiveWorkoutSessionComponent classes
- `.session-rest-timer` — rest timer toast

---

### Responsiveness

**Desktop (≥ 640px)**
- Max-width 720px, centered with `margin: 0 auto`
- Exercise sections in 2-column grid (`grid-template-columns: 1fr 1fr`) when ≥ 3 exercises
- Rest timer: sticky card in top-right sidebar rather than bottom toast
- Finish FAB: replaced by full-width "Finish Workout" button at page bottom

**Mobile (< 640px) — PRIMARY TARGET**
- Single column, full viewport width
- Session header: 56px sticky top
- Set rows: full width, 72px min-height
- Finish FAB: fixed bottom-right, 56px height
- Rest timer: fixed bottom toast
- Add-set button: full width dashed

**Extra-small (< 380px)**
- Weight / reps value font-size: 16px (down from 18px)
- Set number badge hidden (replaced by row ordering)

---

### Accessibility

| Concern | Implementation |
|---|---|
| Swipe alternative | Each set row has a "Mark complete" button (visually hidden, `sr-only` class) as a tap fallback for users who cannot swipe |
| Swipe delete alternative | A visible kebab menu (`more_vert` icon, 48×48px tap target) on each row provides "Delete set" as a menu item |
| ARIA live region | `aria-live="polite"` on the rest timer — announces "Rest timer started: 90 seconds" |
| Set completion announcement | `aria-live="assertive"` on set row completion: "Set 3 of 4 complete" |
| Color not sole indicator | Completed sets use both color (green border) AND icon (✓) AND text dimming |
| Min touch targets | All interactive elements: **48×48px minimum** (`min-width`, `min-height` enforced) |
| Tabular numerics | Timer countdown and weight/reps values: `font-variant-numeric: tabular-nums` — prevents layout shift |
| Focus management | After long-press inline edit, focus is placed on weight input automatically (`element.focus()`) |
| Contrast | All text: WCAG AA minimum (ghost text at `rgba(255,255,255,0.28)` is below AA — acceptable as supplementary/decorative copy; primary values are white) |

---

### Out of Scope for Fix 6

The following are intentionally deferred:
- Post-workout summary card (→ Fix 8, per audit § 6 "Post-workout feedback void")
- Sharing to beSocial after session (→ Fix 7, per audit § 8 rank 2)
- Previous session data storage — spec assumes data will be available; the data contract (how previous session values are fetched and stored) is the responsibility of `@tech-architect` and `@dotnet-developer`
- Sound/haptic feedback (beyond `navigator.vibrate` on long-press) — deferred
- Cardio workout session (different model — no sets/reps; spec only covers strength/circuit/HIIT/crossfit types)
