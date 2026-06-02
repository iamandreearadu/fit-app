## UI Spec: Fix 2 — ShareToSocialBottomSheetComponent

**Author:** @uiux-designer
**Date:** 2026-06-02
**Audit reference:** Full Platform Audit § 5 — beSocial Social Layer UX; § 8 Priority Fix #2
**Contract reference:** `.claude/contracts/fix-2-share-besocial.md`
**Design spec dependencies:** `.claude/design-specs/fix-3-post-log-reward.md` (callers)
**Implementation plan:** `.claude/plans/ux-audit-implementation-plan.md` — Fix 2, Sprint 2
**Status:** READY_FOR_IMPLEMENTATION

---

### User Story

As a user who just completed a workout or logged a meal, I want a one-tap option to share
my achievement to beSocial — surfaced automatically, without navigating away — so that
sharing becomes part of my logging habit rather than a separate intentional act.

---

### Audit Context — Why This Exists

Section 5 of the UX audit:

> "The correct pattern is a share prompt at completion. After a user saves a workout:
> a bottom sheet slides up asking 'Share this workout?' with a pre-composed post preview
> showing their workout stats. One tap to publish, one tap to dismiss. The user shouldn't
> have to navigate anywhere — the share action comes to them."

Fix 2 is the implementation of that pattern. Share rates in beSocial are near zero because
sharing requires navigating to a completely separate shell. This component eliminates that
context switch entirely.

---

### Data Contract — `ShareToSocialData`

The component receives a discriminated union via `MAT_BOTTOM_SHEET_DATA`:

```typescript
// Defined in core/models/social.model.ts
export type ShareToSocialData =
  | {
      type: 'workout';
      sessionId: number;
      templateTitle: string;
      durationMin: number;
      exerciseCount: number;
      // estimatedCaloriesKcal: INTENTIONALLY ABSENT — health metric
    }
  | {
      type: 'meal';
      mealId: number;
      mealName: string;
      mealType: string;
      // totalCalories / totalProtein_g / etc.: INTENTIONALLY ABSENT — health metrics
    };
```

**Dismiss result** (returned via `MatBottomSheetRef.dismiss()`):

```typescript
export interface ShareSheetResult {
  published: boolean;
  postId?:   number;   // present only when published === true
}
```

**Client-side preview text** (used for live preview before publish — approximate):

```typescript
function buildPreviewText(data: ShareToSocialData, caption?: string): string {
  const generated = data.type === 'workout'
    ? `🏋️ ${data.templateTitle}\n⏱️ ${data.durationMin} min · ${data.exerciseCount} exercises`
    : `🍽️ ${data.mealName}`;
  return caption?.trim()
    ? `${caption.trim()}\n\n${generated}`
    : generated;
}
```

Note: the client preview omits `setsCompleted` (not in the data union). The server's
`previewText` in `SharePostResponse` is the canonical version — displayed in the success
state after publish.

---

### UX Flow

```
Caller (WorkoutCompletionCardComponent or MealCompletionFeedbackComponent)
│
├─ Tap "Share to beSocial"
│   └─ MatBottomSheet.open(ShareToSocialBottomSheetComponent, {
│         data: ShareToSocialData,
│         panelClass: 'share-sheet-panel'
│       })
│
├─ Sheet slides up (Angular Material default animation, ~250ms)
│   ├─ Header: icon + "Share to beSocial" + × close
│   ├─ Post preview: auto-generated text in styled bubble
│   ├─ Caption textarea: optional, 0 / 300 chars
│   └─ Footer: [Publish] button + Skip text link
│
├─ PATH A — User taps "Publish"
│   ├─ Button enters loading state (spinner + disabled)
│   ├─ POST /api/social/posts/from-workout/{sessionId}  OR
│   │   POST /api/social/posts/from-meal/{mealId}
│   │   with optional { caption }
│   ├─ 201 Created → SUCCESS STATE:
│   │   ├─ Content replaced: ✓ icon + "Posted to beSocial!" + postId
│   │   └─ Auto-close after 1.5s → dismiss({ published: true, postId })
│   └─ On API error → ERROR STATE:
│       ├─ Error banner slides in above footer
│       └─ Publish button re-enabled (retry)
│
├─ PATH B — User taps "Skip"
│   └─ Immediate dismiss({ published: false }) — zero friction, no confirmation
│
└─ PATH C — User taps × OR backdrop
    └─ Same as Skip
```

**Timing constraint from audit plan:** Sheet must be visible within 300ms of the workout
save 201 response or meal save 201 response. This is a product-level latency requirement —
`MatBottomSheet.open()` must be called in the same `.then()` / `effect()` callback that
processes the API response. No intermediate steps.

---

## Component Spec — ShareToSocialBottomSheetComponent

**Selector:** `app-share-to-social-bottom-sheet`
**File location:** `shared/components/share-to-social-bottom-sheet/`
**Angular Material:** Uses `MatBottomSheet` + `MAT_BOTTOM_SHEET_DATA` injection token
**Used by:**
- `WorkoutCompletionCardComponent` — on "Share to beSocial" tap
- `MealCompletionFeedbackComponent` — on "Share to beSocial" tap

---

### Layout

```
┌─────────────────────────────────────────────────┐
│  [━━━━━━] drag handle (mobile only)             │
│                                                 │
│  [share icon]  Share to beSocial         [×]   │  ← header
│  ─────────────────────────────────────────────  │  ← border
│                                                 │
│  ╔═══════════════════════════════════════════╗  │
│  ║  🏋️ Pull Day A                           ║  │  ← preview bubble
│  ║  ⏱️ 47 min · 3 exercises                 ║  │     (workout variant)
│  ╚═══════════════════════════════════════════╝  │
│                                                 │
│  Caption (optional)                             │  ← label
│  ┌─────────────────────────────────────────┐   │
│  │ What's on your mind?                    │   │  ← textarea
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│  0 / 300                                        │  ← char counter
│  ─────────────────────────────────────────────  │  ← border
│                                                 │
│  ┌─────────────────────────────────────────┐   │  ← Publish (primary)
│  │      send    Publish                    │   │
│  └─────────────────────────────────────────┘   │
│              Skip                               │  ← Skip (text)
│                                                 │
└─────────────────────────────────────────────────┘
```

---

### Visual Spec — Shell

**Global `styles.css` addition** (add alongside existing panel class blocks):

```css
/* ─── SHARE TO BESOCIAL BOTTOM SHEET ─── */
mat-bottom-sheet-container.share-sheet-panel {
  background: var(--surface) !important;
  border-radius: 24px 24px 0 0 !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-bottom: none !important;
  padding: 0 !important;
  max-height: 85dvh !important;
  box-shadow: 0 -8px 48px rgba(0, 0, 0, 0.7) !important;
  overflow: hidden !important;
}

/* Desktop: constrain width and center */
@media (min-width: 640px) {
  .cdk-overlay-pane:has(mat-bottom-sheet-container.share-sheet-panel) {
    max-width: 480px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
  }

  mat-bottom-sheet-container.share-sheet-panel {
    border-radius: 24px 24px 0 0 !important;
  }
}
```

**Inner component shell** (the root element rendered inside the bottom sheet container):

```css
/* .sbs-shell */
display: flex;
flex-direction: column;
width: 100%;
overflow: hidden;
```

---

### Visual Spec — Drag Handle

```css
/* .sbs-drag-handle */
width: 44px;
height: 4px;
border-radius: 999px;
background: rgba(255, 255, 255, 0.12);
margin: 10px auto 0;
flex-shrink: 0;
```
Visible on mobile only (< 640px). Hidden on desktop via `display: none`.

---

### Visual Spec — Header

```css
/* .sbs-header */
display: flex;
align-items: center;
gap: 10px;
padding: 16px 18px 14px;
border-bottom: 1px solid rgba(255, 255, 255, 0.06);
flex-shrink: 0;
```

**Icon container (left):**
```css
/* .sbs-header-icon */
width: 36px;
height: 36px;
border-radius: 10px;
background: rgba(124, 77, 255, 0.14);
border: 1px solid rgba(124, 77, 255, 0.22);
display: flex;
align-items: center;
justify-content: center;
flex-shrink: 0;
```
Icon: `send` mat-icon, 17px, `color: var(--primary)`.

**Title (flex-1):**
```css
font-size: 16px;
font-weight: 700;
color: var(--white);
flex: 1;
```
Text: `"Share to beSocial"`

**Close button (right):**
```css
/* .sbs-close-btn */
color: rgba(255, 255, 255, 0.35) !important;
transition: color 0.15s ease;
min-width: 48px;
min-height: 48px;
```
Icon: `close` mat-icon, 20px.
Hover: `color: var(--white)`.

---

### Visual Spec — Post Preview Section

The preview section shows the user exactly what will appear in the beSocial feed.
It updates live as the user types in the caption textarea.

```css
/* .sbs-preview-section */
padding: 16px 18px 12px;
display: flex;
flex-direction: column;
gap: 6px;
```

**Section label:**
```css
/* .sbs-preview-label */
font-size: 11px;
font-weight: 600;
color: rgba(255, 255, 255, 0.3);
text-transform: uppercase;
letter-spacing: 0.06em;
```
Text: `"POST PREVIEW"`

**Preview bubble:**
```css
/* .sbs-preview-bubble */
background: rgba(255, 255, 255, 0.04);
border: 1px solid rgba(255, 255, 255, 0.09);
border-radius: 14px;
padding: 14px 16px;
white-space: pre-wrap;           /* preserves \n line breaks in content */
word-break: break-word;
font-size: 14px;
font-weight: 400;
color: var(--white-soft);
line-height: 1.6;
min-height: 52px;
transition: border-color 0.18s;
```

Hover: `border-color: rgba(255,255,255,0.14)` — subtle indication it's read-only but
acknowledges keyboard focus state when programmatically focused for a11y announcements.

**Content — Workout variant:**
```
🏋️ Pull Day A
⏱️ 47 min · 3 exercises
```
Built from: `` `🏋️ ${data.templateTitle}\n⏱️ ${data.durationMin} min · ${data.exerciseCount} exercises` ``

**Content — Meal variant:**
```
🍽️ Chicken & Rice Bowl
```
Built from: `` `🍽️ ${data.mealName}` ``

**With caption prepended (live update):**
If the user has typed a caption, the preview bubble shows:
```
Crushed it today! 💪

🏋️ Pull Day A
⏱️ 47 min · 3 exercises
```
The caption appears above the auto-generated text, separated by a blank line (`\n\n`).
The preview updates on every keystroke (`(input)` event on textarea).

---

### Visual Spec — Caption Section

```css
/* .sbs-caption-section */
padding: 4px 18px 12px;
display: flex;
flex-direction: column;
gap: 6px;
```

**Label:**
```css
/* .sbs-caption-label */
font-size: 11px;
font-weight: 600;
color: rgba(255, 255, 255, 0.3);
text-transform: uppercase;
letter-spacing: 0.06em;
```
Text: `"CAPTION"` with `"(optional)"` appended — `font-size: 10px; font-weight: 400; color: rgba(255,255,255,0.2);`

**Textarea wrapper:**
```css
/* .sbs-textarea-wrap */
position: relative;
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 12px;
background: rgba(255, 255, 255, 0.03);
transition: border-color 0.18s;
/* focus-within: */
/* border-color: rgba(124, 77, 255, 0.45); */
```

**Textarea (naked, no Angular Material form field):**
```css
/* .sbs-textarea */
width: 100%;
box-sizing: border-box;
background: transparent;
border: none;
color: var(--white);
font-family: inherit;
font-size: 14px;
font-weight: 400;
line-height: 1.65;
padding: 12px 14px;
resize: none;
outline: none;
min-height: 72px;
max-height: 120px;
overflow-y: auto;
scrollbar-width: none;
display: block;
```
```css
.sbs-textarea::placeholder { color: rgba(255, 255, 255, 0.22); }
.sbs-textarea:disabled      { opacity: 0.45; cursor: not-allowed; }
```

Placeholder text: `"What's on your mind?"`
`maxlength="300"` attribute on the element.

**Character counter:**
```css
/* .sbs-char-counter */
font-size: 11px;
font-weight: 500;
font-family: inherit;
text-align: right;
padding-right: 2px;
transition: color 0.2s ease;
```

Counter thresholds — **reuse existing global classes from styles.css:**

| Range | Class | Color |
|---|---|---|
| 0 – 239 chars | `.char-green` | `rgba(255,255,255,0.2)` |
| 240 – 279 chars | `.char-yellow` | `var(--color-warning)` |
| 280 – 300 chars | `.char-red` | `var(--color-error)` |

Format: `"0 / 300"` → `"47 / 300"` → `"280 / 300"`.

---

### Visual Spec — Footer

```css
/* .sbs-footer */
display: flex;
flex-direction: column;
align-items: center;
gap: 4px;
padding: 12px 18px calc(20px + env(safe-area-inset-bottom, 0px));
border-top: 1px solid rgba(255, 255, 255, 0.06);
flex-shrink: 0;
```

**Publish button (primary — full width):**
```css
/* .sbs-publish-btn */
/* Extends global .btn-primary */
width: 100%;
height: 48px;
background: var(--primary);
border: none;
border-radius: 12px;
color: var(--white);
font-size: 14px;
font-weight: 700;
font-family: inherit;
display: flex;
align-items: center;
justify-content: center;
gap: 8px;
cursor: pointer;
transition: opacity 0.15s ease, transform 0.15s ease;
```

States:
```css
/* Default */
.sbs-publish-btn:hover:not(:disabled) {
  opacity: 0.88;
  transform: translateY(-1px);
}
/* Loading */
.sbs-publish-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}
```

- **Default:** `send` mat-icon, 16px + `"Publish"` text
- **Loading:** `mat-spinner` diameter 16 (white) + `"Publishing..."` text — icon hidden
- `mat-spinner` needs the color override: apply `color: var(--white)` on the spinner host

**Skip button (text only — zero friction):**
```css
/* .sbs-skip-btn */
background: none;
border: none;
padding: 10px 20px;     /* generous touch target */
min-height: 48px;       /* touch target floor */
color: rgba(255, 255, 255, 0.35);
font-size: 13px;
font-weight: 500;
font-family: inherit;
cursor: pointer;
transition: color 0.15s ease;
```
```css
.sbs-skip-btn:hover { color: rgba(255, 255, 255, 0.65); }
```
Text: `"Skip"`

**Design intent:** "Skip" must feel trivially easy to tap. No border, no background,
lower visual weight than any other element on screen. The user should feel zero guilt
about skipping.

---

### States

#### Default / Active State

Normal sheet appearance. Caption empty. Publish button enabled. Preview shows
auto-generated content only.

#### Preview-Updated State

Triggered on every `input` event on the textarea. Preview bubble re-renders live with
caption prepended. No separate visual state indicator — the preview update IS the feedback.

#### Loading State (after Publish tap)

```
• Publish button: spinner (diameter 16, white) + "Publishing..." — button disabled
• Textarea: disabled (opacity 0.45, cursor not-allowed)
• × close button: disabled (opacity 0.45, pointer-events: none)
• Skip button: hidden (display: none) — prevent skip mid-flight
• Preview bubble: unchanged
```

Loading feedback must be visible within one frame of the tap. No debounce.

#### Success State

Entire sheet body (everything between header and footer) is replaced with the success view.
The transition uses Angular's `@if` with a 0.2s `fadeIn` animation.

```
┌──────────────────────────────────────────┐
│  [send icon]  Share to beSocial   [×]   │  ← header (unchanged)
│ ──────────────────────────────────────── │
│                                          │
│         ┌─────────────────────┐          │
│         │  ✓ check_circle     │          │  ← success icon (40px, #4ade80)
│         └─────────────────────┘          │
│                                          │
│         Posted to beSocial!             │  ← 16px / 700 / white
│         Your post is now live.          │  ← 13px / 400 / rgba(w,0.45)
│                                          │
└──────────────────────────────────────────┘
```

```css
/* .sbs-success */
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
padding: 36px 24px calc(32px + env(safe-area-inset-bottom, 0px));
gap: 10px;
animation: fadeIn 0.2s ease-out;   /* reuses global keyframe */
```

**Success icon:**
```css
/* .sbs-success-icon */
font-size: 40px;
width: 40px;
height: 40px;
color: var(--color-success);    /* #4ade80 */
animation: completion-tile-pop 0.3s ease-out;
/* 'completion-tile-pop' is defined in workout-completion-card.component.css */
/* Redefine locally in this component's CSS as it's needed independently: */
```

```css
/* Define in share-to-social-bottom-sheet.component.css */
@keyframes sbs-icon-pop {
  0%   { transform: scale(0); opacity: 0; }
  65%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
```

**"Posted to beSocial!" text:** `font-size: 16px; font-weight: 700; color: var(--white);`
**"Your post is now live." subtext:** `font-size: 13px; color: rgba(255,255,255,0.45);`

**Auto-close timing:** `setTimeout(() => this.bottomSheetRef.dismiss({ published: true, postId }), 1500)`

#### Error State

Error banner slides in above the footer. Sheet body and caption remain — user can retry.

```
┌──────────────────────────────────────────┐  ← (header)
│ ...preview and caption unchanged...      │
│                                          │
│  ╔══════════════════════════════════╗   │
│  ║  ⚠  Couldn't share. Try again.  ║   │  ← error banner
│  ╚══════════════════════════════════╝   │
│                                          │
│  [      Publish      ]                  │  ← re-enabled
│              Skip                        │  ← re-visible
└──────────────────────────────────────────┘
```

```css
/* .sbs-error-banner */
margin: 0 18px 12px;
padding: 10px 14px;
border-radius: 10px;
background: rgba(255, 64, 129, 0.1);
border: 1px solid rgba(255, 64, 129, 0.25);
display: flex;
align-items: center;
gap: 8px;
animation: slideUp 0.2s ease-out;   /* reuses global keyframe */
```

**Error icon:** `warning_amber` mat-icon, 16px, `color: var(--accent)`.
**Error text:** `font-size: 13px; font-weight: 500; color: var(--accent);`
Content: `"Couldn't share. Please try again."` — no detail exposed to user.

After error, the sheet returns to **Active** state:
- Textarea re-enabled
- Publish button re-enabled (returns to default "Publish" label)
- Skip button re-visible
- Error banner remains until next Publish attempt (dismissed on re-tap)

---

### Animations — Component-Scoped

All defined in `share-to-social-bottom-sheet.component.css`.
Do NOT add to global `styles.css`.

```css
/* Success icon pop */
@keyframes sbs-icon-pop {
  0%   { transform: scale(0);    opacity: 0; }
  65%  { transform: scale(1.2);  opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}
/* duration: 0.3s ease-out */

/* Error banner entrance — handled by global slideUp keyframe */
/* Success state entrance — handled by global fadeIn keyframe */
/* Sheet entrance/exit — handled by MatBottomSheet (Angular CDK native) */
```

No new keyframes beyond `sbs-icon-pop`. The CDK/MatBottomSheet handles the sheet
slide-up (entrance) and slide-down (exit) automatically via its built-in animations.

---

### Interactions

| Interaction | Result |
|---|---|
| Sheet opens | CDK slide-up animation (Angular Material default, ~250ms). Textarea focus NOT auto-set on open — let user choose whether to add caption. |
| Tap × (header) | `bottomSheetRef.dismiss({ published: false })` — same as Skip |
| Tap backdrop | Same as × |
| Swipe sheet down (mobile) | Angular Material MatBottomSheet handles this natively — if user drags handle or backdrop downward, CDK dismisses the sheet |
| Type in caption textarea | Preview bubble updates live on each keystroke |
| Caption exceeds 300 chars | `maxlength` on `<textarea>` prevents further input; counter shows red 300/300 |
| Tap "Publish" | Loading state → API call → Success or Error state |
| Tap "Skip" | `bottomSheetRef.dismiss({ published: false })` — immediate, no animation delay |
| Tap backdrop during loading | Ignored — `disableClose: true` on `MatBottomSheetConfig` during loading to prevent accidental mid-flight dismissal |

**`MatBottomSheet.open()` configuration:**

```typescript
this.bottomSheet.open(ShareToSocialBottomSheetComponent, {
  data:        shareData,
  panelClass:  'share-sheet-panel',
  disableClose: false,   // default; set to true during loading (see Interactions above)
  hasBackdrop:  true,
  backdropClass: '',     // CDK default — dark backdrop
});
```

During the `loading` state, the component programmatically sets `this.bottomSheetRef.disableClose = true`
and restores it to `false` on success or error.

---

### Angular Material Components to Use

| Purpose | Component |
|---|---|
| Bottom sheet host | `MatBottomSheet` — `inject(MatBottomSheet)` in callers |
| Data injection | `inject(MAT_BOTTOM_SHEET_DATA) as ShareToSocialData` |
| Self-reference | `inject(MatBottomSheetRef<ShareToSocialBottomSheetComponent>)` |
| Header close icon | `mat-icon` — `close` |
| Header icon | `mat-icon` — `send` |
| Publish button icon | `mat-icon` — `send` (default) |
| Loading spinner | `mat-spinner` `[diameter]="16"` inside publish button |
| Success icon | `mat-icon` — `check_circle` |
| Error icon | `mat-icon` — `warning_amber` |

**Do NOT use:**
- `mat-form-field` + `matInput` — use the naked `<textarea>` pattern (matches
  `create-content.component.css` precedent; avoids MDC label/outline overhead in this
  compact context)
- `mat-dialog` — this component is a bottom sheet, not a dialog

---

### CSS Classes to Reuse (from styles.css)

| Class | Usage |
|---|---|
| `.btn-primary` | Reference pattern for Publish button |
| `.char-green` / `.char-yellow` / `.char-red` | Caption character counter color states |

**New classes — define in `share-to-social-bottom-sheet.component.css` only:**

| Class | Purpose |
|---|---|
| `.sbs-shell` | Root flex column container |
| `.sbs-drag-handle` | Mobile drag indicator bar |
| `.sbs-header` | Header row |
| `.sbs-header-icon` | Purple icon container (left of title) |
| `.sbs-close-btn` | × dismiss button |
| `.sbs-preview-section` | Wrapper for label + preview bubble |
| `.sbs-preview-label` | "POST PREVIEW" uppercase label |
| `.sbs-preview-bubble` | Read-only post content display |
| `.sbs-caption-section` | Wrapper for label + textarea + counter |
| `.sbs-caption-label` | "CAPTION (optional)" label |
| `.sbs-textarea-wrap` | Rounded border container for textarea |
| `.sbs-textarea` | Naked textarea element |
| `.sbs-char-counter` | 0 / 300 counter |
| `.sbs-footer` | Footer column: publish + skip |
| `.sbs-publish-btn` | Full-width primary publish button |
| `.sbs-skip-btn` | Text-only skip button |
| `.sbs-success` | Success state wrapper |
| `.sbs-success-icon` | Animated checkmark icon |
| `.sbs-error-banner` | Error message bar |

**New global class added to `styles.css`** (as documented in the Visual Spec — Shell
section above):
- `mat-bottom-sheet-container.share-sheet-panel` — bottom sheet dark theme override
- `@media (min-width: 640px)` — desktop width constraint on CDK overlay pane

---

### Responsiveness

**Mobile (< 640px) — PRIMARY TARGET**
- Sheet fills full viewport width
- `border-radius: 24px 24px 0 0` (bottom corners flush, system status bar visible above)
- Drag handle visible at top
- `padding-bottom: env(safe-area-inset-bottom, 20px)` on footer — iOS safe area
- All interactive elements `min-height: 48px`
- Caption textarea: `min-height: 72px; max-height: 120px`
- Publish button: full width (100%)
- Skip button: centered, full span below Publish

**Desktop (≥ 640px)**
- Sheet constrained to `max-width: 480px` centered horizontally (via CDK overlay CSS)
- Drag handle hidden (`display: none`)
- Same `border-radius: 24px 24px 0 0` — sheet still anchors at bottom (intentional;
  this is a transient action sheet, not a modal requiring vertical centering)
- `padding-bottom: 24px` on footer (no safe-area inset needed)
- Caption textarea: same sizing constraints

**Extra-small (< 380px)**
- Header title: `font-size: 14px`
- Preview bubble: `font-size: 13px; padding: 12px 14px`
- Publish button: `font-size: 13px`
- Footer padding: reduce to `12px 14px`

---

### Accessibility

| Concern | Implementation |
|---|---|
| Sheet role | Angular Material `MatBottomSheet` renders with `role="dialog"` automatically — verify this is preserved with the `panelClass` override |
| `aria-labelledby` | Add `id="sbs-title"` to the header title element; `MatBottomSheet` config: `ariaLabel: 'Share to beSocial'` |
| Focus management | On sheet open: focus the textarea after a 150ms delay (allows CDK animation to complete); if textarea is disabled (loading), focus the close button |
| `aria-label` on × | `aria-label="Close share sheet"` |
| `aria-label` on Publish | Default state: `"Publish post to beSocial"`. Loading state: `aria-busy="true"` + `aria-label="Publishing..."` |
| `aria-label` on Skip | `aria-label="Skip sharing"` |
| Preview bubble | `role="region"` + `aria-label="Post preview"` + `aria-live="polite"` — announces on caption update |
| Caption length limit | `aria-describedby` pointing to character counter element; counter text reads `"47 of 300 characters used"` |
| Error state | `role="alert"` on `.sbs-error-banner` — announces error immediately via screen reader |
| Success state | `aria-live="assertive"` on `.sbs-success` text — announces "Posted to beSocial!" before auto-close |
| Escape key | Angular Material `MatBottomSheet` handles this natively — pressing Escape triggers backdrop dismiss if `disableClose: false` |
| Tab order | Header × → textarea → character counter (skip) → Publish → Skip |
| Touch targets | All interactive elements `min-height: 48px; min-width: 48px` |
| Contrast | "Skip" text at `rgba(255,255,255,0.35)` is below WCAG AA on surface — acceptable because it is supplementary (Skip is always below the primary Publish action and labelled). On hover it reaches 0.65 opacity (WCAG AA compliant) |

---

### Privacy Constraints

These are **hard constraints**, not recommendations. `@code-reviewer` must verify:

1. `ShareToSocialData` TypeScript type for the `'workout'` variant **must not have**
   an `estimatedCaloriesKcal` field. If it's added by mistake, the TypeScript type system
   catches it. `@angular-developer` must verify the type is exactly as in the contract.

2. The caption is the only user-provided input. It is free-text and limited to 300 chars.
   The component does not append any macro, calorie, or biometric data from the local state
   to the caption or to the request body. Verify in implementation.

3. `buildPreviewText()` must not read from `workouts-tab.facade` or `nutrition-tab.facade`
   to inject workout stats beyond what is in `ShareToSocialData`. The data union is the
   complete set of shareable fields.

4. The success state shows `response.previewText` (the server-verified final content).
   It must be displayed as static read-only text, not in a new editable field.

---

### Signal / State Pattern

The component uses Angular 19 signals (no RxJS BehaviorSubjects):

```typescript
@Component({
  selector: 'app-share-to-social-bottom-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
export class ShareToSocialBottomSheetComponent {

  readonly data      = inject<ShareToSocialData>(MAT_BOTTOM_SHEET_DATA);
  readonly sheetRef  = inject(MatBottomSheetRef<ShareToSocialBottomSheetComponent>);
  readonly facade    = inject(SocialFacade);

  // State machine
  readonly state     = signal<'active' | 'loading' | 'success' | 'error'>('active');

  // Caption
  readonly caption   = signal('');
  readonly charCount = computed(() => this.caption().length);

  // Live preview
  readonly previewText = computed(() => buildPreviewText(this.data, this.caption()));

  // Success postId
  readonly publishedPostId = signal<number | null>(null);

  // Char counter CSS class
  readonly counterClass = computed(() => {
    const n = this.charCount();
    if (n >= 280) return 'char-red';
    if (n >= 240) return 'char-yellow';
    return 'char-green';
  });

  async onPublish(): Promise<void> {
    if (this.state() === 'loading') return;
    this.state.set('loading');
    this.sheetRef.disableClose = true;

    const caption  = this.caption().trim() || undefined;
    const result   = this.data.type === 'workout'
      ? await this.facade.shareWorkout(this.data.sessionId, caption)
      : await this.facade.shareMeal(this.data.mealId, caption);

    if (!result) {
      // Facade shows error toast; also show inline error
      this.state.set('error');
      this.sheetRef.disableClose = false;
      return;
    }

    this.publishedPostId.set(result.postId);
    this.state.set('success');
    setTimeout(() => {
      this.sheetRef.dismiss({ published: true, postId: result.postId });
    }, 1500);
  }

  onSkip(): void {
    this.sheetRef.dismiss({ published: false });
  }

  onClose(): void {
    this.sheetRef.dismiss({ published: false });
  }
}
```

---

### Template Structure (annotated)

```html
<div class="sbs-shell">

  <!-- Drag handle — mobile only -->
  <div class="sbs-drag-handle" aria-hidden="true"></div>

  <!-- Header -->
  <div class="sbs-header">
    <div class="sbs-header-icon" aria-hidden="true">
      <mat-icon>send</mat-icon>
    </div>
    <span id="sbs-title" class="...">Share to beSocial</span>
    <button class="sbs-close-btn" mat-icon-button
            (click)="onClose()"
            [disabled]="state() === 'loading'"
            aria-label="Close share sheet">
      <mat-icon>close</mat-icon>
    </button>
  </div>

  <!-- ─── ACTIVE / ERROR states ─── -->
  @if (state() !== 'success') {
    <!-- Preview -->
    <div class="sbs-preview-section">
      <span class="sbs-preview-label">POST PREVIEW</span>
      <div class="sbs-preview-bubble"
           role="region"
           aria-label="Post preview"
           aria-live="polite">{{ previewText() }}</div>
    </div>

    <!-- Caption -->
    <div class="sbs-caption-section">
      <label class="sbs-caption-label" for="sbs-caption-input">
        CAPTION <span>(optional)</span>
      </label>
      <div class="sbs-textarea-wrap"
           [class.focused]="captionFocused">
        <textarea
          id="sbs-caption-input"
          class="sbs-textarea"
          [value]="caption()"
          (input)="caption.set($any($event.target).value)"
          (focus)="captionFocused = true"
          (blur)="captionFocused = false"
          [disabled]="state() === 'loading'"
          maxlength="300"
          placeholder="What's on your mind?"
          [attr.aria-describedby]="'sbs-char-count'"
          rows="3">
        </textarea>
      </div>
      <span id="sbs-char-count"
            class="sbs-char-counter"
            [ngClass]="counterClass()">
        {{ charCount() }} / 300
      </span>
    </div>

    <!-- Error banner -->
    @if (state() === 'error') {
      <div class="sbs-error-banner" role="alert">
        <mat-icon>warning_amber</mat-icon>
        Couldn't share. Please try again.
      </div>
    }

    <!-- Footer -->
    <div class="sbs-footer">
      <button class="sbs-publish-btn"
              (click)="onPublish()"
              [disabled]="state() === 'loading'"
              [attr.aria-busy]="state() === 'loading'"
              [attr.aria-label]="state() === 'loading' ? 'Publishing...' : 'Publish post to beSocial'">
        @if (state() === 'loading') {
          <mat-spinner [diameter]="16" />
          Publishing...
        } @else {
          <mat-icon>send</mat-icon>
          Publish
        }
      </button>
      @if (state() !== 'loading') {
        <button class="sbs-skip-btn" (click)="onSkip()" aria-label="Skip sharing">
          Skip
        </button>
      }
    </div>
  }

  <!-- ─── SUCCESS state ─── -->
  @if (state() === 'success') {
    <div class="sbs-success" aria-live="assertive">
      <mat-icon class="sbs-success-icon">check_circle</mat-icon>
      <p class="...">Posted to beSocial!</p>
      <p class="...">Your post is now live.</p>
    </div>
  }

</div>
```

---

### Out of Scope for Fix 2

| Item | Deferred to |
|---|---|
| Post image attachment in the share sheet | Full post creation already handled by `CreateContentComponent`; this sheet is for auto-composed posts only |
| "View post" button in success state (navigate to beSocial feed) | Would break the workout/nutrition tab context the user is in — deferred to UX polish sprint |
| Editing the auto-generated post content (making the preview bubble editable) | The generated content is intentional — editable content risks user adding health metrics to social posts; keep it server-generated |
| Meal type badge shown in preview bubble | The API contract's content format is `🍽️ {mealName}` only; type is not in the composed post |
| Share from other contexts (e.g., from a social profile, from beSocial itself) | Fix 2 scope is post-workout and post-meal only |
| `BuildLinkedContentPreview()` calorie data cleanup | Pre-existing issue flagged in contract — separate ticket required, not Fix 2 scope |
