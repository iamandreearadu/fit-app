# UI Spec: Sprint 3 — Dashboard Consolidated (Logging Restored)

**Owner:** @uiux-designer
**Date:** 2026-06-09
**Status:** CANONICAL
**Consumers:** @angular-developer (implementation), @code-reviewer (review)
**Depends on:**
- `.claude/design-system/tokens-sprint-0.md` — canonical `--nova-*` token dictionary
- `.claude/design-specs/redesign-sprint-2.md` — Sprint 2 component specs (Sections A–G as built)
- `.claude/decisions/redesign-daily-user-data-signals.md` — DashboardFacade signal architecture (ADR)
- `.claude/decisions/redesign-adr-3.md` — signal migration context

---

## Problem Statement

Sprint 2 produced a polished, read-only dashboard. Users can observe their data but cannot log anything. The entire daily data-entry surface (`DailyUserDataComponent`) and the weekly history accordion (`PreviousDailyUserDataComponent`) were dropped from the page. This spec consolidates Sprint 2's visual system with Sprint 1's logging functionality, and migrates both legacy components to the `--nova-*` token system.

---

## User Story

As a NovaFit user, I want to open the Dashboard and both see my progress at a glance **and** log my nutrition, activity, hydration, weight, and energy without navigating away, so that the dashboard is my single stop for the full daily fitness loop.

---

## UX Flow

1. User opens Dashboard → header bar (A) renders immediately (sticky)
2. RingsHeroComponent (B) animates in with loading arcs, then populates
3. QuickStatsRow (C) populates from DashboardFacade signals
4. DailyUserDataComponent (D) renders below — control bar + 3 logging cards
5. MacroProgressCard (E) and WeeklyWorkoutCard (F) sit side-by-side on desktop
6. AiInsightCard (G) renders full-width below E+F
7. PreviousDailyUserDataComponent (H) renders at the bottom inside a glass card wrapper with title "History"
8. User logs a value in Section D (e.g., water, weight) → DashboardFacade signals update → Rings Hero (B) and QuickStatsRow (C) and MacroProgressCard (E) re-render reactively with no page reload
9. User navigates to a previous day in Section H → day-detail modal opens over the dashboard

---

## Section Order (mobile-first, top to bottom)

| Section | Component | Status |
|---------|-----------|--------|
| A | `DashboardHeaderBarComponent` | Keep, unchanged |
| B | `RingsHeroComponent` | Keep, unchanged |
| C | `QuickStatsRowComponent` | Keep, unchanged |
| D | `DailyUserDataComponent` | RESTORE + token migration |
| E | `MacroProgressCardComponent` | Keep, unchanged |
| F | `WeeklyWorkoutCardComponent` | Keep, unchanged |
| G | `AiInsightCardComponent` | Keep, unchanged |
| H | `PreviousDailyUserDataComponent` | RESTORE + token migration + glass wrapper |
| — | `RecentActivityFeedComponent` | REMOVE — always empty, no data source |

---

## Dashboard Grid Layout

**File:** `dashboard-page.component.css`

Replace the existing grid CSS entirely with the following. The current file has sections A–G; after this sprint it must accommodate H as well.

```css
.dashboard-page {
  background: var(--nova-surface-base);
  min-height: 100vh;
  padding-bottom: var(--nova-space-16);   /* 64px — clears bottom nav */
}

.dashboard-grid {
  padding: 0 var(--nova-space-4);         /* 16px side padding */
  display: flex;
  flex-direction: column;
  gap: var(--nova-space-4);               /* 16px between sections */
}

@media (min-width: 768px) {
  .dashboard-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--nova-space-4);
    padding: 0 var(--nova-space-6);        /* 24px side padding */
  }

  /* Full-span sections */
  .dashboard-grid .section-full {
    grid-column: 1 / -1;
  }
}

/* ── Section entrance animations ── */
.dashboard-grid > * {
  animation: slideUp var(--nova-duration-entrance) var(--nova-ease-out) both;
}
/* slideUp keyframe is already defined in styles.css — do not re-declare */
```

**Template grid assignment in `dashboard-page.component.html`:**

```
Section A   — outside .dashboard-grid (sticky, no animation)
Section B   — class="section-full"   animation-delay: 0ms
Section C   — class="section-full"   animation-delay: 60ms
Section D   — class="section-full"   animation-delay: 120ms
Section E   — (no section-full)      animation-delay: 180ms    ← left column on desktop
Section F   — (no section-full)      animation-delay: 240ms    ← right column on desktop
Section G   — class="section-full"   animation-delay: 300ms
Section H   — class="section-full"   animation-delay: 360ms
```

This places E (MacroProgressCard) and F (WeeklyWorkoutCard) side-by-side on desktop, matching Sprint 2's intent. All other sections span both columns. The stagger is extended by 60ms for H.

> NOTE: `RecentActivityFeedComponent` is removed from the template. Delete the `<app-recent-activity-feed>` element and its wrapping `<div>` entirely.

---

## Section D — DailyUserDataComponent (RESTORED)

**Path:** `src/app/features/dashboard/daily-user-data/daily-user-data.component.ts` (existing)
**Selector:** `app-daily-user-data`

### Role in the Consolidated Dashboard

Section D is the primary logging surface. It is placed between the at-a-glance summary (B, C) and the meal-derived read-only macros (E). It remains a single component; the DailyUserDataComponent refactor to individual metric cards described in ADR-3 is a future Sprint 4 concern. For Sprint 3, restore the component to the page as-is and apply the token migration below.

### Template Change in `dashboard-page.component.html`

Add after the Section C wrapper div:

```html
<!-- Section D: Daily Logging -->
<div class="section-full" style="animation-delay: 120ms;">
  <app-daily-user-data />
</div>
```

The existing `<div class="section-full" style="animation-delay: 120ms;">` that wraps `<app-macro-progress-card>` must be updated to `animation-delay: 180ms` to shift it down the stagger sequence, since D now occupies the 120ms slot.

### Token Migration — `daily-user-data.component.css`

Apply the following find-and-replace passes in the CSS file. Do not change any class names, selectors, or layout logic — this is a pure token substitution.

#### Pass 1 — Hardcoded rgba white values

| Find (exact value) | Replace with |
|--------------------|--------------|
| `rgba(255, 255, 255, 0.03)` | `var(--nova-white-alpha-03)` |
| `rgba(255, 255, 255, 0.04)` | `var(--nova-white-alpha-04)` |
| `rgba(255, 255, 255, 0.05)` | `var(--nova-white-alpha-05)` |
| `rgba(255, 255, 255, 0.06)` | `var(--nova-white-alpha-06)` |
| `rgba(255, 255, 255, 0.07)` | `var(--nova-white-alpha-07)` |
| `rgba(255, 255, 255, 0.08)` | `var(--nova-white-alpha-08)` |
| `rgba(255, 255, 255, 0.1)` | `var(--nova-white-alpha-10)` |
| `rgba(255, 255, 255, 0.10)` | `var(--nova-white-alpha-10)` |
| `rgba(255, 255, 255, 0.12)` | `var(--nova-white-alpha-12)` |
| `rgba(255, 255, 255, 0.14)` | `var(--nova-white-alpha-14)` |
| `rgba(255, 255, 255, 0.28)` | `var(--nova-text-faint)` |
| `rgba(255, 255, 255, 0.2)` | `var(--nova-white-alpha-20)` |
| `rgba(255, 255, 255, 0.3)` | `var(--nova-text-ghost)` |
| `rgba(255, 255, 255, 0.35)` | `var(--nova-white-alpha-35)` |
| `rgba(255, 255, 255, 0.45)` | `var(--nova-text-hint)` |

#### Pass 2 — Old system text token replacements

| Find | Replace with | Context |
|------|--------------|---------|
| `color: var(--white-soft)` | `color: var(--nova-text-secondary)` | `.daily-root`, `.ctrl-val`, `.net-label`, `.energy-btn` |
| `color: var(--white)` | `color: var(--nova-text-primary)` | `.ctrl-input`, `.ctrl-val`, `.net-value`, `.act-opt` |
| `var(--white-soft)` (any property) | `var(--nova-text-secondary)` | Any remaining occurrence |
| `var(--white)` (any property) | `var(--nova-text-primary)` | Any remaining occurrence |

#### Pass 3 — Card background and border radius

| Find | Replace with |
|------|--------------|
| `background: rgba(255, 255, 255, 0.03)` on `.card` | `background: var(--nova-glass-card-bg)` |
| `border: 1px solid rgba(255, 255, 255, 0.08)` on `.card` | `border: var(--nova-glass-card-border)` |
| `border-radius: 16px` on `.card` | `border-radius: var(--nova-radius-xl)` |
| `border-radius: 14px` on `.ctrl-bar` | `border-radius: var(--nova-radius-xl)` |
| `border-radius: 12px` on `.ctrl-section` | `border-radius: var(--nova-radius-md)` |
| `border-radius: 12px` on `.ctrl-ai` | `border-radius: var(--nova-radius-md)` |
| `border-radius: 12px` on `.ctrl-balance` | `border-radius: var(--nova-radius-md)` |
| `border-radius: 10px` on `.act-opt` | `border-radius: var(--nova-radius-lg)` |
| `border-radius: 9px` on `.ab` | `border-radius: var(--nova-radius-lg)` |
| `border-radius: 12px` on `.net-row` | `border-radius: var(--nova-radius-md)` |
| `border-radius: 10px` on `.btn-pick-meal` | `border-radius: var(--nova-radius-lg)` |

#### Pass 4 — Spacing (padding and gap values)

| Find (on specific selector) | Replace with |
|-----------------------------|--------------|
| `padding: 0px 20px` on `.daily-root` | `padding: 0 var(--nova-space-5)` |
| `gap: 28px` on `.daily-root` | `gap: var(--nova-space-7)` |
| `margin-bottom: 16px` on `.ctrl-bar` | `margin-bottom: var(--nova-space-4)` |
| `padding: 16px` on `.card` | `padding: var(--nova-space-4)` |
| `gap: 12px` on `.card` | `gap: var(--nova-space-3)` |
| `gap: 14px` on `.content-grid` | `gap: var(--nova-space-3)` |
| `padding: 20px 16px` in `@media (max-width: 960px) .daily-root` | `padding: var(--nova-space-5) var(--nova-space-4) var(--nova-space-8)` |
| `padding: 14px 12px 28px` in `@media (max-width: 540px) .daily-root` | `padding: var(--nova-space-3) var(--nova-space-3) var(--nova-space-7)` |

Note: `--nova-space-7` = 28px is defined as 7 × 4px base. Verify it exists in the token file; if not, use `28px` as a fallback until the token is added to `styles.css`.

#### Pass 5 — Icon badge background tokens

| Selector | Find | Replace with |
|----------|------|--------------|
| `.ci-purple` | `background: rgba(124, 77, 255, 0.14); color: #a78bfa` | `background: var(--nova-primary-alpha-14); color: var(--nova-primary-light)` |
| `.ci-orange` | `background: rgba(255, 64, 129, 0.15); color: var(--accent)` | `background: var(--nova-accent-alpha-12); color: var(--nova-accent)` |
| `.ci-blue` | `background: rgba(56, 189, 248, 0.15); color: #38bdf8` | `background: var(--nova-info-alpha-12); color: var(--nova-info)` |

Note: if `--nova-accent-alpha-12` and `--nova-info-alpha-12` are not yet in `tokens-sprint-0.md`, use the hardcoded `rgba()` values for now and file a token-addition request. Do not silently omit the color change.

#### Pass 6 — Card title typography

| Selector | Find | Replace with |
|----------|------|--------------|
| `.card-title` | `font-size: 14px; font-weight: 600; color: var(--white)` | `font-size: var(--nova-text-subtitle); font-weight: var(--nova-weight-bold); color: var(--nova-text-primary)` |

#### Pass 7 — Card badge (pill) tokens

| Selector | Find | Replace with |
|----------|------|--------------|
| `.b-purple` | `background: rgba(124, 77, 255, 0.12); color: #a78bfa` | `background: var(--nova-primary-alpha-12); color: var(--nova-primary-light); border: 1px solid var(--nova-primary-alpha-25); border-radius: var(--nova-radius-pill)` |
| `.b-orange` | `background: rgba(255, 64, 129, 0.15); color: var(--accent)` | `background: var(--nova-accent-alpha-12); color: var(--nova-accent); border: 1px solid rgba(255,64,129,0.28); border-radius: var(--nova-radius-pill)` |

#### Pass 8 — Remaining primary/accent hardcoded hex values

| Find | Replace with |
|------|--------------|
| `color: #a78bfa` | `color: var(--nova-primary-light)` |
| `color: #7c4dff` (rare) | `color: var(--nova-primary)` |
| `background: #0d0d10` on `.act-panel` | `background: var(--nova-surface-base)` |
| `color: var(--primary)` | `color: var(--nova-primary)` |
| `var(--primary-glow)` on `.energy-active` | `var(--nova-primary-alpha-35)` |
| `var(--accent)` | `var(--nova-accent)` |
| `color: #4ade80` on `.sb-saved mat-icon` | `color: var(--nova-success)` |

### Control Bar Redesign

The control bar container (`.ctrl-bar`) must match the nova glass card style used across all other Sprint 2 sections. Apply these CSS changes directly to the `.ctrl-bar` rule:

```css
/* BEFORE */
.ctrl-bar {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  ...
}

/* AFTER (token-migrated) */
.ctrl-bar {
  background: var(--nova-glass-card-bg);
  border: var(--nova-glass-card-border);
  border-radius: var(--nova-radius-xl);
  ...
}
```

Section separators within the control bar:

```css
/* BEFORE */
.ctrl-sep {
  background: rgba(255, 255, 255, 0.1);
}

/* AFTER */
.ctrl-sep {
  background: var(--nova-white-alpha-10);
}
```

Label text inside control bar sections:

```css
/* BEFORE */
.ctrl-lbl {
  color: rgba(255, 255, 255, 0.35);
}

/* AFTER */
.ctrl-lbl {
  color: var(--nova-text-hint);
}
```

Value text inside control bar sections:

```css
/* BEFORE */
.ctrl-val {
  color: var(--white);
}

/* AFTER */
.ctrl-val {
  color: var(--nova-text-primary);
}
```

AI button icon container (`.ctrl-ai-icon`):

```css
/* BEFORE */
.ctrl-ai-icon {
  background: rgba(124, 77, 255, 0.12);
  color: #a78bfa;
}
.ctrl-ai:not([disabled]):hover .ctrl-ai-icon {
  background: rgba(124, 77, 255, 0.28);
}

/* AFTER */
.ctrl-ai-icon {
  background: var(--nova-primary-alpha-12);
  color: var(--nova-primary-light);
}
.ctrl-ai:not([disabled]):hover .ctrl-ai-icon {
  background: var(--nova-primary-alpha-35);
}
```

Calorie balance icon container (`.ctrl-balance-icon`):

```css
/* BEFORE */
.ctrl-balance-icon {
  background: rgba(255, 152, 0, 0.12);
  color: #ffb74d;
}
.ctrl-balance:hover .ctrl-balance-icon {
  background: rgba(255, 152, 0, 0.25);
}

/* AFTER */
.ctrl-balance-icon {
  background: var(--nova-warning-bg);
  color: var(--nova-warning);
}
.ctrl-balance:hover .ctrl-balance-icon {
  background: rgba(255, 183, 77, 0.25);  /* no token for this hover stop — acceptable */
}
```

Activity picker panel (`.act-panel`):

```css
/* AFTER */
.act-panel {
  background: var(--nova-surface-base);
  border: 1px solid var(--nova-white-alpha-12);
  border-radius: var(--nova-radius-xl);  /* was 16px */
}
.act-group-lbl {
  color: var(--nova-text-ghost);
}
.act-opt {
  color: var(--nova-text-secondary);
  border-radius: var(--nova-radius-lg);  /* was 10px */
}
.act-opt:hover {
  background: var(--nova-white-alpha-06);
}
.act-active,
.act-active:hover {
  background: var(--nova-primary-alpha-10) !important;
  color: var(--nova-primary-light) !important;
}
.act-active .act-ico {
  color: var(--nova-primary-light) !important;
}
.act-ico {
  color: var(--nova-white-alpha-35);
}
.act-divider {
  background: var(--nova-white-alpha-08);
}
```

---

## Section H — PreviousDailyUserDataComponent (RESTORED)

**Path:** `src/app/features/dashboard/previous-daily-user-data/previous-daily-user-data.component.ts` (existing)
**Selector:** `app-previous-daily-user-data`

### Glass Card Wrapper

Section H is wrapped in a nova glass card container in `dashboard-page.component.html`. This wrapper provides the consistent card frame; the inner component handles its own list and modal logic.

```html
<!-- Section H: History -->
<div class="section-full dash-history-wrap" style="animation-delay: 360ms;">
  <div class="dash-history-card">
    <div class="dash-history-hdr">
      <span class="dash-history-title">History</span>
    </div>
    <app-previous-daily-user-data />
  </div>
</div>
```

CSS for the wrapper (add to `dashboard-page.component.css`):

```css
.dash-history-card {
  background: var(--nova-glass-card-bg);
  border: var(--nova-glass-card-border);
  border-radius: var(--nova-radius-xl);
  overflow: hidden;  /* clip inner component's border-radius */
}

.dash-history-hdr {
  padding: var(--nova-space-4) var(--nova-space-5) var(--nova-space-3);
  border-bottom: 1px solid var(--nova-white-alpha-06);
}

.dash-history-title {
  font-size: var(--nova-text-subtitle);   /* 16px */
  font-weight: var(--nova-weight-bold);
  color: var(--nova-text-primary);
}
```

The inner `PreviousDailyUserDataComponent` has its own `.previous-root` padding (`16px 24px 40px`). That padding must be reduced since the outer glass card now provides the visual container:

Add a scoped override at the bottom of `dashboard-page.component.css` (or via `:host` in `previous-daily-user-data.component.css` — use the page-level approach to avoid touching the component):

```css
/* Reduce previous-root padding when nested inside the glass card wrapper */
.dash-history-card app-previous-daily-user-data .previous-root {
  padding: var(--nova-space-4) var(--nova-space-5) var(--nova-space-5);
}
```

Note: This uses a deep selector on a non-encapsulated element. If the component uses `ViewEncapsulation.Emulated` (default), this will not penetrate the shadow boundary unless `:host ::ng-deep` is used. Preferred approach: add a CSS class `.nested-mode` to `PreviousDailyUserDataComponent` and conditionalize the padding via an `@Input() nested: boolean = false`.

### Token Migration — `previous-daily-user-data.component.css`

#### Pass 1 — Hardcoded rgba white values

| Find | Replace with |
|------|--------------|
| `rgba(255,255,255,.02)` | `var(--nova-white-alpha-02)` |
| `rgba(255,255,255,.025)` | `var(--nova-glass-card-bg)` |
| `rgba(255,255,255,.03)` | `var(--nova-white-alpha-03)` |
| `rgba(255,255,255,.04)` | `var(--nova-white-alpha-04)` |
| `rgba(255,255,255,.05)` | `var(--nova-white-alpha-05)` |
| `rgba(255,255,255,.06)` | `var(--nova-white-alpha-06)` |
| `rgba(255,255,255,.07)` | `var(--nova-white-alpha-07)` |
| `rgba(255,255,255,.08)` | `var(--nova-white-alpha-08)` |
| `rgba(255,255,255,.12)` | `var(--nova-white-alpha-12)` |
| `rgba(255,255,255,.18)` | `var(--nova-text-invisible)` |
| `rgba(255,255,255,.28)` | `var(--nova-text-faint)` |
| `rgba(255,255,255,.35)` | `var(--nova-white-alpha-35)` |
| `rgba(255,255,255,.4)` | `var(--nova-text-hint)` |

#### Pass 2 — Old system text tokens

| Find | Replace with |
|------|--------------|
| `color: var(--white)` | `color: var(--nova-text-primary)` |
| `color: var(--white-soft)` | `color: var(--nova-text-secondary)` |

#### Pass 3 — Day-row card tokens

| Selector | Find | Replace with |
|----------|------|--------------|
| `.day-row` | `background: rgba(255,255,255,.025); border: 1px solid rgba(255,255,255,.07); border-radius: 14px` | `background: var(--nova-glass-card-bg); border: var(--nova-glass-card-border); border-radius: var(--nova-radius-xl)` |
| `.day-row:hover, .day-row:focus-visible` | `background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.12)` | `background: var(--nova-white-alpha-05); border-color: var(--nova-glass-card-hover-border)` |
| `.dr-sep` | `background: rgba(255,255,255,.08)` | `background: var(--nova-white-alpha-08)` |

#### Pass 4 — Stat colors

| Selector | Find | Replace with |
|----------|------|--------------|
| `.dr-green` | `color: #4ade80` | `color: var(--nova-success)` |
| `.dr-purple` | `color: #a78bfa` | `color: var(--nova-primary-light)` |
| `.dr-orange` | `color: var(--accent)` | `color: var(--nova-accent)` |
| `.dr-weekday` | `color: #a78bfa` | `color: var(--nova-primary-light)` |
| `.week-icon` | `color: #a78bfa` | `color: var(--nova-primary-light)` |

#### Pass 5 — Modal tokens

| Selector | Find | Replace with |
|----------|------|--------------|
| `.modal-backdrop` | `background: rgba(0,0,0,.7); backdrop-filter: blur(14px)` | `background: rgba(0,0,0,0.65); backdrop-filter: blur(8px)` (align with nova modal spec) |
| `.modal-card` | `background: #0d0d10; border: 1px solid rgba(255,255,255,.08); border-radius: 24px` | `background: var(--nova-surface-base); border: var(--nova-glass-card-border); border-radius: var(--nova-radius-xl)` |
| `.modal-hdr` | `border-bottom: 1px solid rgba(255,255,255,.07)` | `border-bottom: 1px solid var(--nova-white-alpha-07)` |
| `.modal-hdr-icon-wrap` | `background: rgba(124,77,255,.15)` | `background: var(--nova-primary-alpha-15)` |
| `.modal-hdr-icon-wrap mat-icon` | `color: #a78bfa` | `color: var(--nova-primary-light)` |
| `.modal-date` | `color: var(--white)` | `color: var(--nova-text-primary)` |
| `.modal-date-full` | `color: rgba(255,255,255,.35)` | `color: var(--nova-white-alpha-35)` |
| `.modal-close-btn` | `background: rgba(255,255,255,.06) !important; color: var(--white) !important` | `background: var(--nova-white-alpha-06) !important; color: var(--nova-text-primary) !important` |

#### Pass 6 — Stat tile tokens

| Selector | Find | Replace with |
|----------|------|--------------|
| `.stat-tile` | `background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 14px` | `background: var(--nova-white-alpha-03); border: var(--nova-glass-card-border); border-radius: var(--nova-radius-xl)` |
| `.stat-tile--highlight` | `background: rgba(196,181,253,.05); border-color: rgba(167,139,250,.2)` | `background: var(--nova-primary-alpha-06); border-color: var(--nova-primary-alpha-25)` |
| `.st-label` | `color: rgba(255,255,255,.35)` | `color: var(--nova-white-alpha-35)` |
| `.st-value` | `color: var(--white)` | `color: var(--nova-text-primary)` |
| `.st-value.st-text` | `color: var(--white-soft)` | `color: var(--nova-text-secondary)` |
| `.st-unit` | `color: rgba(255,255,255,.3)` | `color: var(--nova-text-ghost)` |
| `.dot-protein` | `background: #a78bfa` | `background: var(--nova-primary-light)` |
| `.dot-carbs` | `background: #38bdf8` | `background: var(--nova-info)` |
| `.dot-fats` | `background: var(--accent)` | `background: var(--nova-accent)` |

#### Pass 7 — History bar and empty state

| Selector | Find | Replace with |
|----------|------|--------------|
| `.hist-title` | `color: rgba(255,255,255,.4)` | `color: var(--nova-text-hint)` |
| `.week-range` | `color: var(--white)` | `color: var(--nova-text-primary)` |
| `.empty-state` | `background: rgba(255,255,255,.02); border: 1px dashed rgba(255,255,255,.08); border-radius: 16px; color: rgba(255,255,255,.35)` | `background: var(--nova-white-alpha-02); border: 1px dashed var(--nova-white-alpha-08); border-radius: var(--nova-radius-xl); color: var(--nova-white-alpha-35)` |
| `.dr-chevron` | `color: rgba(255,255,255,.18)` | `color: var(--nova-text-invisible)` |

---

## Responsiveness

### Section D (DailyUserDataComponent)

The existing responsive grid (`.content-grid`) logic is preserved:
- `≥ 769px`: 3-column grid (`repeat(3, 1fr)`)
- `≤ 768px`: 2-column grid; third card spans full width, centered to column width
- `≤ 540px`: single column

These breakpoints operate inside the dashboard grid's 2-column layout. On desktop (≥ 768px), Section D spans both columns via `.section-full`. The inner 3-col content grid then occupies the full dashboard width — this is correct and intentional.

### Section H (PreviousDailyUserDataComponent)

The glass card wrapper is always full-span (`.section-full`). The inner component's existing responsive CSS remains intact. The day-detail modal (`modal-backdrop` + `modal-card`) is already position:fixed — it overlays the full viewport correctly on all breakpoints.

Mobile bottom sheet conversion at `< 640px` for the day-detail modal (to align with nova modal spec):

Add to `previous-daily-user-data.component.css`:

```css
@media (max-width: 640px) {
  .modal-backdrop {
    align-items: flex-end;
    padding: 0;
  }
  .modal-card {
    width: 100%;
    max-height: 88dvh;
    border-radius: var(--nova-radius-xl) var(--nova-radius-xl) 0 0;
    /* 20px 20px 0 0 */
  }
}
```

---

## States (required for all data views)

### Section D Loading State

The existing `.load-overlay` pattern is retained. After token migration:
```css
.load-overlay {
  background: rgba(13, 13, 16, 0.55);  /* nova-surface-base at 55% — no direct token, leave as-is */
  backdrop-filter: blur(4px);
  border-radius: var(--nova-radius-xl);  /* was 20px */
}
```

### Section H Loading State

The existing empty state (`.empty-state` with dashed border) is preserved and token-migrated (see Pass 7 above). No additional loading skeleton is required for Sprint 3 — the component already renders loading via the existing week-navigation pattern.

### Section H Empty State (no history)

Existing `.empty-state` element is used as-is. After token migration it reads:
```
mat-icon "history" (or "calendar_today")     ← 24px, var(--nova-text-invisible)
<span> "No previous entries"                 ← 14px, var(--nova-white-alpha-35)
```

---

## Interactions

### Section D

- Control bar section hover: `background: var(--nova-white-alpha-05); transition: background 0.15s` (unchanged logic, token-migrated value)
- Activity picker open/close: existing `act-panel` + `picker-bd` pattern retained; panel now uses `var(--nova-surface-base)` background
- Auto-save badge: `.sb-saving` spinner uses `color: var(--nova-text-disabled)` (was `rgba(255,255,255,0.5)`); `.sb-saved` uses `color: var(--nova-success)` (was `#4ade80`); `.sb-error` uses `color: var(--nova-accent)` (was `var(--accent)`)
- Meal picker modal: modal background `var(--nova-surface-base)`, border `var(--nova-glass-card-border)`, radius `var(--nova-radius-xl)` — apply token migration to `.mp-box` and related selectors following the same substitution pattern

### Section H

- Day row hover: `background: var(--nova-white-alpha-05); border-color: var(--nova-glass-card-hover-border); transform: translateY(-2px)` (add transform to the existing rule — currently only bg/border transition)
- Day row transition: `transition: background var(--nova-duration-micro), border-color var(--nova-duration-micro), transform var(--nova-duration-standard)` (was `background .15s, border-color .15s` — add transform)
- Modal open: existing backdrop + card renders; no change to animation

---

## Angular Material Components (existing, no changes needed)

Section D and H use the following Material components already — no new imports required:
- `MatIconModule` — icons throughout
- `MatProgressBarModule` — `.pbar` progress bars in Section D
- `MatProgressSpinnerModule` — `.load-overlay` spinner
- `MatButtonModule` — adjust and undo buttons

---

## CSS Classes to Preserve (do not rename)

The following class names are referenced in the existing templates and must not be renamed during token migration:

**Section D:** `.daily-root`, `.ctrl-wrap`, `.ctrl-bar`, `.ctrl-section`, `.ctrl-grow`, `.ctrl-ico`, `.ctrl-body`, `.ctrl-lbl`, `.ctrl-input`, `.ctrl-val`, `.ctrl-chevron`, `.ctrl-sep`, `.ctrl-end`, `.ctrl-ai`, `.ctrl-ai-icon`, `.ctrl-balance`, `.ctrl-balance-icon`, `.act-panel`, `.act-group-lbl`, `.act-opt`, `.act-active`, `.act-ico`, `.act-divider`, `.picker-bd`, `.save-badge`, `.sb-visible`, `.sb-saving`, `.sb-saved`, `.sb-error`, `.content-grid`, `.card`, `.card-head`, `.card-head-left`, `.card-icon-wrap`, `.ci-purple`, `.ci-orange`, `.ci-blue`, `.card-title`, `.card-head-right`, `.btn-undo`, `.card-badge`, `.b-purple`, `.b-orange`, `.macros-list`, `.macro-row`, `.mdot`, `.d-protein`, `.d-carbs`, `.d-fats`, `.net-row`, `.track`, `.track-header`, `.track-name`, `.pbar`, `.pbar-blue`, `.pbar-green`, `.energy-section`, `.energy-label`, `.energy-btns`, `.energy-btn`, `.energy-active`, `.energy-selected-label`, `.btn-pick-meal`, `.mp-box`, `.mp-icon-wrap`, `.mp-search-wrap`, `.mp-search`, `.mp-list`, `.mp-item`, `.mp-item-body`, `.mp-name`, `.mp-kcal`, `.mp-chips`, `.mp-chip`, `.mp-p`, `.mp-c`, `.mp-f`, `.load-overlay`, `.cb-box`, `.cb-icon-wrap`

**Section H:** `.previous-root`, `.hist-bar`, `.hist-title`, `.week-controls`, `.week-range`, `.week-icon`, `.empty-state`, `.day-list`, `.day-row`, `.dr-date`, `.dr-weekday`, `.dr-num`, `.dr-mon`, `.dr-sep`, `.dr-stats`, `.dr-stat`, `.dr-green`, `.dr-purple`, `.dr-orange`, `.dr-chevron`, `.modal-backdrop`, `.modal-card`, `.modal-hdr`, `.modal-hdr-left`, `.modal-hdr-icon-wrap`, `.modal-date`, `.modal-date-full`, `.modal-close-btn`, `.modal-body`, `.stats-grid`, `.stat-tile`, `.stat-tile--highlight`, `.st-label`, `.st-value`, `.st-unit`, `.macro-label-row`, `.macro-dot`, `.dot-protein`, `.dot-carbs`, `.dot-fats`

---

## Accessibility

All existing ARIA attributes in Section D and H are preserved. No new ARIA roles are introduced by the token migration.

New additions for Sprint 3:
- Section H glass card wrapper: `role="region"` `aria-label="Daily history"` on `.dash-history-card`
- History section title: `id="history-heading"` on `.dash-history-title`; add `aria-labelledby="history-heading"` to the `role="region"` element

---

## Implementation Checklist for @angular-developer

1. Open `dashboard-page.component.html`
   - Add `<app-daily-user-data>` wrapped in `.section-full` at `animation-delay: 120ms` (Section D)
   - Shift `<app-macro-progress-card>` wrapper to `animation-delay: 180ms`
   - Shift `<app-weekly-workout-card>` wrapper to `animation-delay: 240ms`
   - Shift `<app-ai-insight-card>` wrapper to `animation-delay: 300ms`
   - Add Section H glass card wrapper with `<app-previous-daily-user-data>` at `animation-delay: 360ms`
   - Remove `<app-recent-activity-feed>` and its wrapper div entirely

2. Open `dashboard-page.component.css`
   - Add `.dash-history-card`, `.dash-history-hdr`, `.dash-history-title` CSS (Section H wrapper)
   - Add `< 640px` bottom-sheet media query for Section H modal

3. Open `daily-user-data.component.css`
   - Apply all 8 token migration passes in order
   - Do not change any class names or layout properties

4. Open `previous-daily-user-data.component.css`
   - Apply all 7 token migration passes in order
   - Add `< 640px` bottom-sheet rule at end of file
   - Do not change any class names or layout properties

5. Verify `DailyUserDataComponent` has `DashboardFacade` injected (per ADR-3 Phase 1 requirements) and that the form-based auto-save is disabled to prevent double-save. If the facade is not yet wired, the component can still be restored to the page with its original auto-save intact — flag for ADR-3 Phase 2 follow-up.

6. Test the full page scroll order on mobile (390px viewport) and confirm the section sequence A→B→C→D→E→F→G→H with no layout shift.
