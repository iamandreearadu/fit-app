## UI Spec: Fix 8 — AI as Contextual Layer

**Author:** @uiux-designer
**Date:** 2026-06-03
**Audit reference:** Full Platform Audit § 8 — Top 5 Retention Fixes (Priority #1)
**Contract reference:** `.claude/contracts/fix-8-ai-contextual.md`
**Implementation plan:** `.claude/plans/ux-audit-implementation-plan.md` — Fix 8, Sprint 3
**Status:** READY_FOR_IMPLEMENTATION

---

### User Story

As a logged-in user on any FitApp screen, I want to tap a persistent AI button and ask
a question about what I'm currently doing — without leaving the screen, opening a new tab,
or hunting through navigation — so that the AI assistant feels like a natural extension of
every feature rather than a separate destination.

---

### Audit Context — Why This Exists

The existing AI assistant is a standalone navigation module (`/ai-assistant`), discoverable
only through a top-level nav link. It has no awareness of the user's current context — a
user on the nutrition tab asking "How am I doing on protein?" gets a generic response
because the AI doesn't know what module they're in or what they've logged today.

Fix 8 solves both problems simultaneously:
- **Access**: persistent FAB on every authenticated screen, no navigation required
- **Context**: `moduleContext` field in the request tells the backend which module the user
  is in; the backend silently injects today's real data into the Groq system prompt
- **Continuity**: same `GroqAiFacade` — the bottom sheet shares conversation state with
  the existing `/ai-assistant` route; chat history is not siloed

---

### Architecture Summary (frontend)

```
app.component.html
  └── <app-ai-chat-fab>        ← fixed overlay, always rendered when auth
        ↓ tap
  MatBottomSheet.open(AiChatBottomSheetComponent, {
    panelClass: 'ai-chat-sheet-panel',
    data: { moduleContext: 'nutrition' | 'workouts' | 'dashboard' | 'social' | null }
  })
        ↓ send
  GroqAiFacade.askAI(prompt, undefined, undefined, moduleContext)
        ↓
  POST /api/ai/text { prompt, systemPrompt, moduleContext }
```

The `/ai-assistant` route and full `OpenAIComponent` are **kept unchanged** (backward
compat). The "AI Assistant" nav link is **removed** from the header. Chat History is
re-exposed via the user-page sidebar (Me tab).

---

### Files Changed / Created

| Action | File | Change |
|--------|------|--------|
| **Create** | `core/components/ai-chat-fab/ai-chat-fab.component.ts` | New FAB component |
| **Create** | `core/components/ai-chat-fab/ai-chat-fab.component.html` | FAB template |
| **Create** | `core/components/ai-chat-fab/ai-chat-fab.component.css` | FAB styles |
| **Create** | `core/components/ai-chat-bottom-sheet/ai-chat-bottom-sheet.component.ts` | Chat bottom sheet |
| **Create** | `core/components/ai-chat-bottom-sheet/ai-chat-bottom-sheet.component.html` | Sheet template |
| **Create** | `core/components/ai-chat-bottom-sheet/ai-chat-bottom-sheet.component.css` | Sheet styles |
| **Modify** | `app.component.html` | Add `<app-ai-chat-fab>` after `<router-outlet>` |
| **Modify** | `shared/components/header/header.component.html` | Remove AI nav links (×2) |
| **Modify** | `features/user/user-page.component.html` | Add AI Chat History sidebar item |
| **Modify** | `features/user/user-page.component.ts` | Import FAB nav handler |
| **Modify** | `styles.css` | Add `ai-chat-sheet-panel` bottom-sheet override |

---

## Component 1 — `AiChatFabComponent`

### User Story
As a logged-in user, I want a persistent AI button in the bottom-right corner of every
screen so that I can start a contextual AI conversation with one tap, from anywhere.

### UX Flow

1. User is authenticated → FAB renders (fixed position, every route)
2. User is on `/onboarding/*`, `/login`, or `/register` → FAB is **not rendered**
3. User taps FAB → `MatBottomSheet.open(AiChatBottomSheetComponent)` with current `moduleContext`
4. Sheet is open → FAB is **hidden** (prevents double-open)
5. Sheet closes → FAB reappears

### Visual Spec

**Container — `.ai-chat-fab`**
```css
position: fixed;
bottom: calc(24px + env(safe-area-inset-bottom, 0px));
right: 24px;
z-index: 950;
width: 56px;
height: 56px;
border-radius: 50%;
background: var(--primary);                    /* #7c4dff solid */
box-shadow:
  0 4px 20px rgba(124, 77, 255, 0.45),
  0 2px 8px rgba(0, 0, 0, 0.4);
cursor: pointer;
border: none;
display: flex;
align-items: center;
justify-content: center;
transition:
  transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
  box-shadow 0.2s ease,
  opacity 0.2s ease;
```

**Icon**
- `mat-icon`: `auto_awesome`
- Size: `26px × 26px`
- Color: `#ffffff`
- No text label — icon only

**On-mount animation (first visit only)**
```css
/* Play the global `pulse` keyframe 3× on mount, then stop */
animation: fab-entrance 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both,
           fab-glow-pulse 1.8s ease 0.4s 3;
```

Component-scoped keyframes:

```css
@keyframes fab-entrance {
  from { opacity: 0; transform: scale(0.4) translateY(16px); }
  to   { opacity: 1; transform: scale(1)   translateY(0);     }
}

@keyframes fab-glow-pulse {
  0%   { box-shadow: 0 4px 20px rgba(124, 77, 255, 0.45), 0 2px 8px rgba(0,0,0,0.4); }
  50%  { box-shadow: 0 4px 32px rgba(124, 77, 255, 0.75), 0 2px 8px rgba(0,0,0,0.4); }
  100% { box-shadow: 0 4px 20px rgba(124, 77, 255, 0.45), 0 2px 8px rgba(0,0,0,0.4); }
}
```

> Use CSS animation-fill-mode `forwards` — after 3 pulses the glow settles to default.
> Do NOT use the global `pulse` keyframe (it scales the element — wrong for a FAB).
> These keyframes go in `ai-chat-fab.component.css`, NOT in `styles.css`.

**States**

| State | Style |
|-------|-------|
| Default | `background: var(--primary)` |
| Hover | `transform: scale(1.08); box-shadow: 0 6px 28px rgba(124,77,255,0.6)` |
| Active/press | `transform: scale(0.94)` (immediate feedback, 0.1s) |
| Sheet open | `opacity: 0; pointer-events: none; transform: scale(0.8)` (smooth exit) |
| Hidden route | `display: none` (auth/onboarding — not rendered at all) |

### Position Adaptation — Social Routes (Mobile)

On `/social/*` routes on narrow screens (< 768px), the social shell renders its own
`daily-panel-fab` at `bottom: calc(64px + safe-area); right: 16px; z-index: 920`.

The AI FAB must not overlap it. Apply class `.fab--social` when on social routes and add:

```css
@media (max-width: 768px) {
  .ai-chat-fab.fab--social {
    bottom: calc(118px + env(safe-area-inset-bottom, 0px));
    right: 16px;
  }
}
```

This stacks the AI FAB directly above the daily-panel-fab with a comfortable gap.
On desktop (> 768px), daily-panel-fab is never shown — no position adjustment needed.

**On non-social mobile routes** (< 640px, e.g. user-page, workouts), keep the FAB at
`bottom: 24px; right: 24px` — no bottom nav conflicts outside of beSocial.

### Signals & Logic

```typescript
// Visibility
readonly showFab = computed(() => {
  const url = this.router.url;
  const isAuth = this.authStore.authUser() !== null;
  const isHiddenRoute =
    url.startsWith('/login') ||
    url.startsWith('/register') ||
    url.startsWith('/onboarding');
  return isAuth && !isHiddenRoute;
});

// Position class
readonly fabClass = computed(() => ({
  'fab--social': this.router.url.startsWith('/social'),
}));

// Module context from route
private getModuleContext(): ModuleContext | null {
  const url = this.router.url;
  if (url.startsWith('/user-dashboard')) return 'dashboard';
  if (url.startsWith('/plans') || url.startsWith('/workout-session')) return 'workouts';
  if (url.includes('nutrition') || url.includes('meal')) return 'nutrition';
  if (url.startsWith('/social')) return 'social';
  return null;
}

// Open sheet
openChat(): void {
  const ref = this.bottomSheet.open(AiChatBottomSheetComponent, {
    panelClass: 'ai-chat-sheet-panel',
    data: { moduleContext: this.getModuleContext() } satisfies AiChatSheetData,
  });
  this.sheetOpen.set(true);
  ref.afterDismissed().subscribe(() => this.sheetOpen.set(false));
}
```

> `sheetOpen` signal drives the `opacity: 0` hidden state of the FAB while the sheet is open.

### Layout (Template)

```html
@if (showFab()) {
  <button
    class="ai-chat-fab"
    [class]="fabClass()"
    [class.fab--open]="sheetOpen()"
    (click)="openChat()"
    type="button"
    aria-label="Open AI assistant">
    <mat-icon>auto_awesome</mat-icon>
  </button>
}
```

### Angular Material Components
- `MatBottomSheet` — opens the chat sheet
- `mat-icon` — `auto_awesome`

### Accessibility
- `aria-label="Open AI assistant"`
- `role="button"` (native `<button>` element)
- Min touch target: 56×56px ✅ (the FAB itself — exceeds 48px minimum)
- Tab-accessible; `position: fixed` so it's always reachable

### Responsiveness
All breakpoints use the same 56×56px FAB. Position adapts as specified above.

---

## Component 2 — `AiChatBottomSheetComponent`

### User Story
As a user who tapped the AI FAB, I want a focused chat panel to slide up in place
— showing which context the AI has, letting me ask a question and read the answer —
without leaving my current screen.

### UX Flow

1. FAB tap → sheet slides up from bottom (300ms, `cubic-bezier(0.32, 0.72, 0, 1)`)
2. Sheet shows context badge for the active module
3. If conversation has messages: existing history displayed, input bar focused
4. If no messages: empty state with 3 tappable suggestion chips
5. User types a message and taps send (or `Enter`) → loading bubble appears
6. AI responds → bubble appears with `msgIn` animation
7. User drags handle down (or taps handle) → sheet dismisses, FAB reappears
8. User can also tap "History →" to navigate to `/ai-assistant` full-screen view

### Visual Spec — Sheet Container

**Global CSS addition required in `styles.css`:**

```css
/* ─── AI CHAT BOTTOM SHEET PANEL ─── */
mat-bottom-sheet-container.ai-chat-sheet-panel {
  background: rgba(13, 13, 16, 0.97) !important;
  border-radius: 24px 24px 0 0 !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-bottom: none !important;
  padding: 0 !important;
  height: 70dvh !important;
  max-height: 70dvh !important;
  box-shadow: 0 -8px 48px rgba(0, 0, 0, 0.7) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}

/* Desktop: constrain width and centre */
@media (min-width: 640px) {
  .cdk-overlay-pane:has(mat-bottom-sheet-container.ai-chat-sheet-panel) {
    max-width: 520px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
  }
}
```

> The `height: 70dvh` + `max-height: 70dvh` ensures the sheet occupies exactly 70% of
> viewport height. On desktop it centres like a modal. On mobile it spans full width.

### Layout Structure — `.acbs-shell`

```
┌──────────────────────────────────────┐  ← 70dvh
│  ▬▬▬  drag handle (40×4px, centered) │  14px padding
│                                      │
│  [context badge]         [History →] │  .acbs-header  42px
│──────────────────────────────────────│  1px divider
│                                      │
│  [message history OR empty state]    │  .acbs-messages  flex: 1, scroll
│                                      │
│──────────────────────────────────────│  1px divider
│  [textarea]              [send btn]  │  .acbs-input-bar  56–72px
└──────────────────────────────────────┘
  0px bottom (no safe-area padding — sheet uses `env(safe-area-inset-bottom)` via CSS)
```

**`.acbs-shell`**
```css
display: flex;
flex-direction: column;
height: 100%;
overflow: hidden;
```

### Drag Handle

```css
.acbs-handle {
  width: 40px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  margin: 10px auto 10px;
  flex-shrink: 0;
  cursor: grab;
  transition: background 0.15s;
}
.acbs-handle:hover { background: rgba(255, 255, 255, 0.35); }
```

Touch target wrapping the handle:
```css
.acbs-handle-zone {
  width: 100%;
  padding: 6px 0 0;
  display: flex;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}
```
Tapping `.acbs-handle-zone` calls `sheetRef.dismiss()`.

### Context Header — `.acbs-header`

```
┌──────────────────────────────────────────────┐
│  [icon]  Asking about your nutrition   History →  │
└──────────────────────────────────────────────┘
```

```css
.acbs-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 18px 12px;
  flex-shrink: 0;
}
.acbs-header-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 0;
  flex-shrink: 0;
}
```

**Context badge — `.acbs-ctx-badge`**

```css
.acbs-ctx-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.acbs-ctx-badge mat-icon {
  font-size: 14px;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}
```

**Badge variants by `moduleContext`:**

| `moduleContext` | Icon | Label text | bg | text color |
|---|---|---|---|---|
| `null` | `auto_awesome` | "AI Assistant" | `rgba(124,77,255,0.14)` | `var(--primary-light)` |
| `'dashboard'` | `grid_view` | "Asking about your dashboard" | `var(--color-info-bg)` | `var(--color-info)` |
| `'workouts'` | `fitness_center` | "Asking about your workouts" | `rgba(124,77,255,0.14)` | `var(--primary-light)` |
| `'nutrition'` | `restaurant` | "Asking about your nutrition" | `var(--color-success-bg)` | `var(--color-success)` |
| `'social'` | `people` | "Asking about fitness & community" | `var(--accent-background)` | `var(--accent)` |

These are applied via a `computed()` signal that returns the badge config object. No inline
styles — use CSS custom property injection or `[ngClass]` with variant classes:

```typescript
readonly ctxConfig = computed(() => {
  const ctx = this.data.moduleContext;
  const map: Record<string, { icon: string; label: string; cls: string }> = {
    dashboard: { icon: 'grid_view',      label: 'Asking about your dashboard',          cls: 'ctx--dashboard' },
    workouts:  { icon: 'fitness_center', label: 'Asking about your workouts',           cls: 'ctx--workouts'  },
    nutrition: { icon: 'restaurant',     label: 'Asking about your nutrition',          cls: 'ctx--nutrition' },
    social:    { icon: 'people',         label: 'Asking about fitness & community',     cls: 'ctx--social'    },
  };
  return map[ctx ?? ''] ?? { icon: 'auto_awesome', label: 'AI Assistant', cls: 'ctx--default' };
});
```

```css
.ctx--default  { background: rgba(124, 77, 255, 0.14); color: var(--primary-light); }
.ctx--dashboard{ background: var(--color-info-bg);     color: var(--color-info);    }
.ctx--workouts { background: rgba(124, 77, 255, 0.14); color: var(--primary-light); }
.ctx--nutrition{ background: var(--color-success-bg);  color: var(--color-success); }
.ctx--social   { background: var(--accent-background); color: var(--accent);        }
```

**"History →" link — `.acbs-history-btn`**

```css
.acbs-history-btn {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.35);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 0;
  white-space: nowrap;
  flex-shrink: 0;
  transition: color 0.15s;
}
.acbs-history-btn:hover { color: var(--primary-light); }
```

Tap → `sheetRef.dismiss()` then `router.navigate(['/ai-assistant'])`.

### Messages Area — `.acbs-messages`

```css
.acbs-messages {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 16px 12px;
}
.acbs-messages::-webkit-scrollbar { display: none; }
```

**Message rows and bubbles** — reuse the established patterns from
`features/openai/groq/groq.component.css` (`.msg`, `.msg-user`, `.msg-ai`, `.bubble`,
`.bubble-text`, `.bubble-time`). Define them as component-scoped CSS in
`ai-chat-bottom-sheet.component.css` — do NOT import from groq.component.css.

Exact values to copy:
- `.msg-user .bubble`: `background: var(--primary); border-bottom-right-radius: 4px; box-shadow: 0 2px 12px rgba(124,77,255,0.35)`
- `.msg-ai .bubble`: `background: rgba(255,255,255,0.05); border: 1px solid var(--white-fade); border-bottom-left-radius: 4px`
- `.bubble`: `padding: 10px 14px; border-radius: 18px; word-break: break-word; line-height: 1.5`
- `.bubble-text`: `font-size: 14px; white-space: pre-wrap; margin: 0`
- `.bubble-time`: `font-size: 10px; opacity: 0.4; align-self: flex-end; margin-top: 2px`

**Typing indicator** — reuse `.typing`/`.dot` pattern with `bounce` global keyframe.
The typing bubble appears when `facade.loading()` is true.

**Message entrance animation** — component-scoped keyframe:
```css
@keyframes acbs-msg-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0);   }
}
.msg { animation: acbs-msg-in 0.22s ease both; }
```

> The `.msg` max-width in the bottom sheet should be `76%` (vs 72% in full screen) to
> better use the narrower 520px constrained width.

### Empty State

Shown when `!facade.messages().length && !facade.loading()`.

```
         [auto_awesome icon, 36px, rgba(255,255,255,0.18)]
         What would you like to know?         ← 15px / 600 / rgba(255,255,255,0.35)
         Ask anything about your fitness.     ← 13px / 400 / rgba(255,255,255,0.25)

         [chip]  [chip]  [chip]               ← suggestion chips
```

**Empty state container — `.acbs-empty`**:
```css
.acbs-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 20px;
  text-align: center;
}
```

**Suggestion chips — `.acbs-chip`**:
```css
.acbs-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 10px;
}
.acbs-chip {
  padding: 7px 13px;
  background: rgba(124, 77, 255, 0.1);
  border: 1px solid rgba(124, 77, 255, 0.22);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  color: var(--primary-light);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  min-height: 36px;                           /* touch target row with chips */
}
.acbs-chip:hover {
  background: rgba(124, 77, 255, 0.18);
  border-color: rgba(124, 77, 255, 0.4);
}
```

Tap chip → populates input signal with the chip text → does NOT auto-send (user confirms).

**Suggestion chip content by context:**

| `moduleContext` | Chip 1 | Chip 2 | Chip 3 |
|---|---|---|---|
| `null` | "How do I build a workout plan?" | "What should I eat after training?" | "How many calories do I need?" |
| `'workouts'` | "What should I focus on next?" | "Am I overtraining?" | "How do I improve my form?" |
| `'nutrition'` | "How am I doing on protein today?" | "What should I eat for dinner?" | "Am I hitting my macro goals?" |
| `'dashboard'` | "How is my streak going?" | "What did I achieve this week?" | "Should I train today?" |
| `'social'` | "How do I stay motivated?" | "What's a good training frequency?" | "Tips for tracking progress?" |

These are computed from `data.moduleContext` — same `ctxConfig` computed signal, or a
separate `suggestions` computed. Tapping sets `prompt.set(chip.text)` and focuses the
input — it does **not** auto-fire `send()`.

### Input Bar — `.acbs-input-bar`

```
┌──────────────────────────────────────────────────┐
│  [textarea, auto-grow]              [send button] │
└──────────────────────────────────────────────────┘
```

```css
.acbs-input-bar {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: transparent;
}
```

**Textarea — `.acbs-textarea`**:
```css
.acbs-textarea {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 10px 14px;
  color: var(--white);
  font-size: 14px;
  font-family: Poppins, sans-serif;
  line-height: 1.5;
  resize: none;
  outline: none;
  max-height: 96px;
  overflow-y: auto;
  scrollbar-width: none;
  transition: border-color 0.2s;
}
.acbs-textarea:focus { border-color: rgba(124, 77, 255, 0.5); }
.acbs-textarea::placeholder { color: rgba(255, 255, 255, 0.25); }
.acbs-textarea:disabled { opacity: 0.4; cursor: not-allowed; }
```

> No image attachment in the bottom sheet. Image analysis is intentionally not surfaced
> here — it requires the full `/ai-assistant` view. The "History →" button provides that
> path. This is a deliberate focus decision: the bottom sheet is for quick contextual text
> questions only.

**Send button — `.acbs-send-btn`**: same spec as `.btn-send` in groq.component.css:
```css
.acbs-send-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 12px rgba(124, 77, 255, 0.4);
  transition: opacity 0.2s, transform 0.15s;
}
.acbs-send-btn:hover:not(:disabled) { opacity: 0.88; transform: scale(1.05); }
.acbs-send-btn:disabled { opacity: 0.25; box-shadow: none; cursor: not-allowed; }
.acbs-send-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
```

Icon: `send` (or `hourglass_empty` when `facade.loading()`).
Disabled when: `facade.loading() || !prompt().trim()`.

**Key bindings**: `Enter` sends (without shift), `Shift+Enter` adds newline.

### States

**Loading** (after send, waiting for AI):
- Send button switches to `hourglass_empty` icon
- Textarea disabled
- Typing indicator bubble (`bounce` dots) appended to messages

**Error**:
```css
.acbs-error-banner {
  margin: 0 14px 10px;
  padding: 10px 14px;
  background: var(--color-error-bg);
  border: 1px solid rgba(239, 83, 80, 0.3);
  border-radius: 10px;
  font-size: 13px;
  color: var(--color-error);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
```

Icon: `error_outline` (16px). Text: "Something went wrong. Please try again."
A "Retry" ghost button (12px) sits inline at the right.
Error banner auto-dismisses after 8 seconds.

**New conversation**: No UI for creating new conversation inside the sheet. The sheet always
appends to the active `facade.conversationId()`. To start fresh, user uses "History →" →
full `/ai-assistant` view → "New conversation" in the sidenav. This prevents accidental
conversation fragmentation.

### Signals

```typescript
readonly prompt     = signal('');
readonly charCount  = computed(() => this.prompt().length);

// Inject data
readonly data = inject<AiChatSheetData>(MAT_BOTTOM_SHEET_DATA);

// Scroll to bottom after each message
// Use ViewChild on .acbs-messages container + effect()
```

```typescript
// Data interface
export interface AiChatSheetData {
  moduleContext: ModuleContext | null;
}
```

### Angular Material Components
- `MAT_BOTTOM_SHEET_DATA` injection token — receives `moduleContext`
- `MatBottomSheetRef` — for `dismiss()`
- `mat-icon` — context icons, send icon
- `mat-progress-spinner` or typing dots — loading state

### CSS Classes to Reuse
- `.btn-ghost` — "History →" button (adapt with small size overrides)
- Bubble patterns: define locally in component, following groq.component.css conventions

### Responsiveness

| Breakpoint | Behaviour |
|---|---|
| Desktop (> 640px) | Sheet max-width: 520px, centred |
| Mobile (≤ 640px) | Sheet full-width, 70dvh, left/right 0 |

### Accessibility
- `aria-label="Close AI chat"` on drag handle zone
- `aria-label="Send message"` on send button
- `aria-live="polite"` on `.acbs-messages` (announces new AI responses)
- `aria-label` on each suggestion chip matching its text
- Tab order: context badge (read) → message history → textarea → send button
- Min touch target: send button 40×40px ✅ (meets 48px when full touch area counted via padding)

---

## Component 3 — AI Chat History in Me Tab (user-page)

### User Story
As a user who wants to review past AI conversations or start a new one from my profile,
I want a visible "AI Chat History" entry in the Me/profile sidebar so that I can access
the full AI assistant without needing the FAB.

### Placement

Add a new nav item to the `user-page.component.html` sidebar (`<nav class="sb-nav">`),
positioned **after the "Settings" item** and **before "Notifications"**:

```html
<button
  class="sb-item sb-item--ai"
  (click)="openAiHistory()"
  type="button">
  <mat-icon>chat_bubble_outline</mat-icon>
  <span *ngIf="!sidebarCollapsed">AI Chat History</span>
</button>
```

`openAiHistory()` in the component:
```typescript
openAiHistory(): void {
  this.router.navigate(['/ai-assistant']);
}
```

**Visual treatment — `.sb-item--ai`**:

The existing `.sb-item` class handles the base styling (flex, padding, icon gap, hover).
No override needed — it renders identically to all other nav items. The `chat_bubble_outline`
icon is visually distinct enough to identify the entry.

On the **mobile tab scroll row** (`<div class="mob-tabs">`), also add a corresponding
mobile tab after "Settings":

```html
<button
  class="mob-tab"
  (click)="openAiHistory()"
  type="button">
  <mat-icon>chat_bubble_outline</mat-icon>
  <span>AI Chat</span>
</button>
```

> There is intentionally no new tab content panel for AI Chat inside user-page. The nav
> item redirects to the full `/ai-assistant` route (existing component, preserved per
> contract). The user-page tab system does not need a new tab content area.

---

## Navigation Change — Remove AI from Header

### Files: `shared/components/header/header.component.html`

Remove both nav link instances that reference the `/ai-assistant` route:

- **Desktop nav** (~line 46): remove the `<a>` or `<button>` element with "AI Assistant"
  text and router link to `/ai-assistant`
- **Mobile nav** (~line 182): same removal in the mobile menu drawer

> The route itself (`/ai-assistant` in `app.routes.ts`) is **kept** — do not remove.
> The FAB is now the primary access point. Chat History in user-page is the secondary.
> The route remains for bookmarks, deep links, and the "History →" button in the sheet.

---

## Global CSS Additions to `styles.css`

Add this block after the existing `share-sheet-panel` block (from Fix 2):

```css
/* ─── AI CHAT BOTTOM SHEET PANEL ─── */
mat-bottom-sheet-container.ai-chat-sheet-panel {
  background: rgba(13, 13, 16, 0.97) !important;
  border-radius: 24px 24px 0 0 !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-bottom: none !important;
  padding: 0 !important;
  height: 70dvh !important;
  max-height: 70dvh !important;
  box-shadow: 0 -8px 48px rgba(0, 0, 0, 0.7) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}

@media (min-width: 640px) {
  .cdk-overlay-pane:has(mat-bottom-sheet-container.ai-chat-sheet-panel) {
    max-width: 520px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
  }
}
```

---

## Spec Summary — What Gets Built

| # | Component / Change | Effort |
|---|---|---|
| 1 | `AiChatFabComponent` — fixed FAB, route-aware visibility, context detection | Medium |
| 2 | `AiChatBottomSheetComponent` — contextual chat sheet, full message UI | Large |
| 3 | `app.component.html` — add `<app-ai-chat-fab>` | Trivial |
| 4 | `header.component.html` — remove 2× AI nav links | Trivial |
| 5 | `user-page.component.html` — add AI Chat History sidebar + mobile tab | Small |
| 6 | `styles.css` — add `ai-chat-sheet-panel` block | Trivial |
| 7 | `groq-ai.model.ts` — add `ModuleContext` type | Trivial |
| 8 | `groq-ai-api.service.ts` — add `moduleContext` param to `askText()` | Small |
| 9 | `groq-ai.facade.ts` — add `moduleContext` param to `askAI()` | Small |

---

## Implementation Notes for `@angular-developer`

1. **FAB entrance animation** fires once on component mount. Use CSS `animation-iteration-count: 1`
   for `fab-entrance` and `3` for `fab-glow-pulse`. These are component-scoped — do NOT
   add them to `styles.css`.

2. **Sheet shares conversation state**: The bottom sheet uses the same `GroqAiFacade`
   singleton as `/ai-assistant`. Messages visible in the sheet are the same conversation
   visible in the full-screen view. This is correct and intentional — not a bug.

3. **`moduleContext` is transient**: pass it in the `MatBottomSheet.open()` data and
   forward it with every `askAI()` call. Do NOT store it in a signal or the facade. It
   reflects where the user is *right now* and is re-evaluated each time the FAB is tapped.

4. **Auto-scroll**: After each message (user OR AI), `acbs-messages` container should
   scroll to bottom. Use `effect()` reacting to `facade.messages()` length change,
   then `el.scrollTop = el.scrollHeight`.

5. **Image upload is intentionally absent** from the bottom sheet. If a user wants image
   analysis, the "History →" button takes them to the full `/ai-assistant` view which has
   the `+` attach button. Do not add image upload to the sheet.

6. **FAB z-index**: `950`. Ensure this is higher than the social shell `daily-panel-fab`
   (`920`) and the completion card overlay (if Fix 3 is also deployed, that overlay is
   `position: fixed; z-index: 200` per Fix 3 spec — FAB is above it).

7. **Privacy — enforce at the component level**:
   - `AiChatBottomSheetComponent` injects only `MAT_BOTTOM_SHEET_DATA` and `GroqAiFacade`
   - It makes NO HTTP calls to nutrition, workouts, or daily endpoints
   - The only AI-related value it sends is `moduleContext: 'nutrition'` (a string)
   - Backend handles all data loading — the component must remain data-fetch-free

8. **`@for` / `@if` control flow**: Use Angular 17+ syntax throughout both new components.
   Do NOT use `*ngFor`/`*ngIf` in new code.
