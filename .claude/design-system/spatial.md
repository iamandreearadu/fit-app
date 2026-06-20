# NovaFit Design System -- Spatial System

**Author:** @design-system-architect
**Date:** 2026-06-04
**Consumers:** @uiux-designer, @angular-developer
**Depends on:** `tokens.md` (radius and spacing references)

---

## Spatial Philosophy

All spacing values are multiples of 8px. The only exception is 4px for micro spacing (icon padding, badge gaps). No arbitrary pixel values. Every dimension must be expressible as `N x 8px` (or `N x 4px` for micro).

**Grid unit:** 8px
**Micro unit:** 4px

---

## SECTION 1 -- Spacing Scale (Complete)

| Name | Value | Factor | Usage |
|------|-------|--------|-------|
| `micro` | `4px` | 0.5x | Icon internal padding, badge gap, divider margin |
| `tight` | `8px` | 1x | Inline spacing, gap between icon and label, compact list item gap |
| `base` | `16px` | 2x | Card padding, standard gap between elements, form field gap |
| `comfortable` | `24px` | 3x | Section internal spacing, card header/body separation |
| `loose` | `32px` | 4x | Between sections, above/below section headers |
| `spacious` | `48px` | 6x | Touch target height, large section spacing |
| `page` | `64px` | 8x | Page top padding, hero section spacing |

---

## SECTION 2 -- Card System

### 2.1 Standard Card

| Property | Value | Notes |
|----------|-------|-------|
| Padding (body) | `16px` | Standard for all card bodies. Replaces current 18px-28px range. |
| Padding (header) | `16px 16px 12px` | Header has less bottom padding to visually connect to body |
| Border radius | `var(--radius-lg)` = `20px` | All primary content cards |
| Border | `1px solid var(--border-default)` | `rgba(255, 255, 255, 0.10)` |
| Background | `var(--surface-card)` | `rgba(255, 255, 255, 0.03)` |
| Min height | `none` | Cards size to content. No minimum. |
| Max width | `none` for full-bleed; `600px` for centered content cards | |

### 2.2 Card Vertical Stack

| Property | Value | Notes |
|----------|-------|-------|
| Gap between cards (same section) | `16px` | Cards within the same content area |
| Gap between sections (different content) | `32px` | Between Dashboard sections, between profile tabs content |
| Gap between page header and first card | `24px` | Below greeting strip / page title |

### 2.3 Card Header

| Property | Value | Notes |
|----------|-------|-------|
| Icon container size | `40px x 40px` (5 x 8px) | Standardized across all card headers |
| Icon container radius | `var(--radius-md)` = `12px` | Current: 12px. Keep. |
| Icon size inside container | `22px` | Optical center in 40px container |
| Gap between icon and text | `12px` | 1.5 x 8px, acceptable micro spacing |
| Title font | `var(--text-lg)` / `var(--weight-black)` | 17px / 800 |
| Subtitle font | `var(--text-sm)` / `var(--weight-regular)` | 13px / 400 |
| Header border-bottom | `1px solid var(--border-subtle)` | `rgba(255, 255, 255, 0.06)` |

### 2.4 Card Border Radius Standardization

**Current state:** Cards use 16px, 18px, 20px, 24px -- four different values.

**Standard:**
| Context | Radius | Token |
|---------|--------|-------|
| Primary content cards | `20px` | `var(--radius-lg)` |
| Nested sections within cards | `14px` | `var(--radius-md)` |
| Modal/sheet top corners | `24px` | `var(--radius-xl)` |
| Inputs, buttons | `10px` - `14px` | `var(--radius-sm)` to `var(--radius-md)` |
| Pills, badges, avatars | `999px` | `var(--radius-pill)` |

---

## SECTION 3 -- Dashboard Spatial Rules

### 3.1 Dashboard Page Layout (Top to Bottom)

```
+------------------------------------------+
| App Header (56px)                        |  Fixed top
+------------------------------------------+
| Safe Area Top (env(safe-area-inset-top)) |  iOS only
+------------------------------------------+
| Greeting Strip (64px)                    |  Sticky on scroll
|   Name + Streak Badge (prominent)        |
+------------------------------------------+
| Progress Rings Hero (240px)              |  3 rings + Today Score
|   [Calorie Ring] [Water Ring] [Activity] |
|   Today Score: 72%                       |
+------------------------------------------+
| Quick-Log Strip (56px)                   |  Horizontal scroll
|   [+Water] [+Meal] [+Steps] [AI Analyze]|
+------------------------------------------+
| Metric Cards Grid (variable)             |  2-column on mobile
|   [Calories Remaining] [Net Calories]    |
|   [Macros Progress]    [Weight Today]    |
|   [Energy Level]       [Steps Detail]    |
+------------------------------------------+
| AI Daily Insight (80px)                  |  Single sentence
+------------------------------------------+
| History Section (collapsed)              |  Accordion, default closed
|   "View previous days" CTA              |
+------------------------------------------+
| Bottom spacing (64px)                    |  Safe area + clearance
+------------------------------------------+
```

### 3.2 Progress Rings Hero Section

| Property | Value | Notes |
|----------|-------|-------|
| Section height | `240px` (30 x 8px) | Fixed height container |
| Section padding | `24px 16px` | |
| Ring container layout | `flex`, `justify-content: center`, `gap: 24px` | |
| Primary ring size | `var(--ring-size-lg)` = `192px` | Calorie ring, center position |
| Secondary ring size | `var(--ring-size-md)` = `136px` | Water + Activity, flanking |
| Today Score position | Centered below rings | `margin-top: 8px` |
| Today Score font | `var(--score-text-size)` = `48px` / `var(--score-text-weight)` = `800` | |

**Responsive behavior:**

| Viewport Width | Ring Layout | Primary Ring | Secondary Rings |
|---------------|-------------|-------------|-----------------|
| >= 430px | 3 rings side-by-side | 192px | 136px |
| 390px - 429px | 3 rings, tighter gap | 176px (22 x 8px) | 120px (15 x 8px) |
| 375px - 389px | 3 rings, minimal gap | 160px (20 x 8px) | 112px (14 x 8px) |
| < 375px | Stacked: primary on top, 2 secondary below | 160px | 96px side-by-side |

### 3.3 Quick-Log Strip

| Property | Value | Notes |
|----------|-------|-------|
| Height | `56px` (7 x 8px) | Slightly above 48px touch min for padding |
| Padding | `0 16px` | Horizontal only |
| Button height | `40px` (5 x 8px) | Inside the 56px strip |
| Button min-width | `80px` (10 x 8px) | Enough for icon + short label |
| Button gap | `8px` | |
| Overflow | `overflow-x: auto; -webkit-overflow-scrolling: touch` | Horizontal scroll on narrow viewports |
| Scroll padding | `padding-left: 16px; padding-right: 16px` | Ensure first/last buttons aren't edge-flush |
| Scroll snap | `scroll-snap-type: x mandatory; scroll-snap-align: start` | Snap to button boundaries |

### 3.4 Metric Cards Grid

| Property | Value | Notes |
|----------|-------|-------|
| Layout | `display: grid` | |
| Columns (>= 430px mobile) | `grid-template-columns: repeat(2, 1fr)` | 2-column |
| Columns (< 430px mobile) | `grid-template-columns: 1fr` | 1-column |
| Columns (>= 768px tablet) | `grid-template-columns: repeat(3, 1fr)` | 3-column |
| Columns (>= 1024px desktop) | `grid-template-columns: repeat(3, 1fr)` | 3-column, max-width 800px centered |
| Gap | `16px` | Standard card gap |
| Padding | `0 16px` | Container horizontal padding |
| Full-span cards | Macros Progress card spans 2 columns (`grid-column: 1 / -1`) | Contains 3 macro bars |

### 3.5 Sticky Header Behavior

| Property | Value | Notes |
|----------|-------|-------|
| App header height | `56px` (7 x 8px) | Fixed, always visible |
| Greeting strip height | `64px` (8 x 8px) | Becomes sticky when rings scroll out of view |
| Sticky top offset | `56px` | Below app header |
| Sticky background | `var(--surface)` with `backdrop-filter: blur(16px)` | Glassmorphism on sticky header ONLY (overlay context -- per design system rule) |
| Sticky border-bottom | `1px solid var(--border-subtle)` | Appears only when sticky |
| Sticky z-index | `10` | Above content, below modals |

### 3.6 Safe Area Handling

```css
.dashboard-page {
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(env(safe-area-inset-bottom) + 64px);
}
```

| Property | Value | Notes |
|----------|-------|-------|
| Top safe area | `env(safe-area-inset-top)` | iOS notch / Dynamic Island |
| Bottom safe area | `env(safe-area-inset-bottom) + 64px` | iOS home indicator + content clearance |
| Bottom clearance (no safe area) | `64px` | Default bottom spacing for scroll clearance |

---

## SECTION 4 -- beSocial Spatial Rules

### 4.1 Feed Card Anatomy

```
+------------------------------------------+
| Header: Avatar(32) + Name + Time + Menu  |  40px
+------------------------------------------+
| Text content (if present)                |  Variable
+------------------------------------------+
| Fitness Data Block (if linked content)   |  Variable (80-120px)
|   [Accent band] [Icon] [Title]           |
|   [Stat] [Stat] [Stat] [Stat]           |
+------------------------------------------+
| Image (if present)                       |  Variable, aspect-ratio preserved
+------------------------------------------+
| Footer: Reactions + Comment count        |  40px
+------------------------------------------+
```

| Property | Value | Notes |
|----------|-------|-------|
| Card padding | `16px` | All sides |
| Header height | `40px` (5 x 8px) | Avatar 32px + 4px top/bottom |
| Avatar size | `32px` (4 x 8px) | Down from 36px. Still above link touch target. |
| Avatar radius | `50%` | Circle |
| Gap: avatar to name | `8px` | |
| Name font | `var(--text-base)` / `var(--weight-semibold)` | 15px / 600 |
| Time font | `var(--text-sm)` / `var(--weight-regular)` | 13px / 400, color: `var(--text-tertiary)` |
| Text content padding | `8px 0` | Between header and text |
| Text content font | `var(--text-base)` / `var(--weight-regular)` | 15px / 400 |
| Fitness data block margin | `8px 0` | Above and below |
| Fitness data block padding | `16px` | Internal |
| Fitness data block radius | `var(--radius-md)` = `14px` | Nested within card |
| Fitness data accent band | `3px` wide, left border | `var(--fitness-card-accent)` or `var(--fitness-card-meal-accent)` |
| Stat grid layout | `display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px` | 4-column for workout stats |
| Stat value font | `var(--fitness-stat-size)` / `var(--fitness-stat-weight)` | 18px / 700 |
| Stat label font | `var(--text-xs)` / `var(--weight-medium)` | 11px / 500, color: `var(--text-tertiary)` |
| Image max-height | `400px` | Prevent overly tall images |
| Image radius | `var(--radius-md)` = `14px` | Rounded corners |
| Footer height | `40px` (5 x 8px) | |
| Footer gap | `16px` | Between reaction bar and comment button |
| Reaction button touch target | `48px x 48px` | Minimum tap area, visual size 40px |
| Card gap in feed | `16px` | Between cards |
| Card min-height | `120px` (15 x 8px) | Prevents content collapse on short text-only posts |

### 4.2 Macro Chips (within Meal Post)

| Property | Value | Notes |
|----------|-------|-------|
| Chip height | `24px` (3 x 8px) | Compact |
| Chip padding | `4px 8px` | |
| Chip gap | `8px` | Between chips |
| Chip font | `var(--text-xs)` / `var(--weight-bold)` | 11px / 700 |
| Chip radius | `var(--radius-xs)` = `6px` | |
| Protein chip | bg: `var(--macro-protein-bg)`, color: `var(--macro-protein)`, border: `1px solid rgba(167, 139, 250, 0.2)` |
| Carbs chip | bg: `var(--macro-carbs-bg)`, color: `var(--macro-carbs)`, border: `1px solid rgba(56, 189, 248, 0.2)` |
| Fat chip | bg: `var(--macro-fat-bg)`, color: `var(--macro-fat)`, border: `1px solid rgba(255, 183, 77, 0.2)` |

### 4.3 Bottom Navigation

| Property | Value | Notes |
|----------|-------|-------|
| Nav height | `56px` (7 x 8px) | Standard mobile bottom nav |
| Nav background | `var(--surface)` | Opaque |
| Nav border-top | `1px solid var(--border-subtle)` | |
| Content clearance below nav | `56px + env(safe-area-inset-bottom)` | Content must not be hidden behind nav |
| Icon size | `24px` (3 x 8px) | Material icon standard |
| Label font | `var(--text-xs)` / `var(--weight-medium)` | 11px / 500 |
| Label margin-top | `4px` | Below icon |
| Item touch target | `48px x 48px` minimum | Each nav item |
| Item width | Equal distribution: `calc(100% / 5)` | 5 items |
| Active indicator | 3px tall bar above icon, `var(--primary)`, `var(--radius-pill)` | |
| Active icon color | `var(--primary)` | |
| Inactive icon color | `var(--text-muted)` | |
| Active label color | `var(--text-primary)` | |
| Inactive label color | `var(--text-muted)` | |

### 4.4 Top Bar (Mobile)

| Property | Value | Notes |
|----------|-------|-------|
| Height | `56px` (7 x 8px) | Matches app header |
| Padding | `0 16px` | Horizontal |
| Background | `var(--surface)` | Opaque |
| Border-bottom | `1px solid var(--border-subtle)` | |
| Sticky behavior | `position: sticky; top: 0; z-index: 10` | Sticks on scroll |
| Logo/title font | `var(--text-xl)` / `var(--weight-black)` | 20px / 800 |
| Action icons | `24px`, `var(--text-secondary)` | Search, notifications |
| Action icon touch target | `48px x 48px` | Minimum |

### 4.5 Side Navigation (Desktop)

| Property | Value | Notes |
|----------|-------|-------|
| Width | `240px` (30 x 8px) | Fixed desktop sidebar |
| Collapsed width | `64px` (8 x 8px) | Icon-only mode |
| Collapse breakpoint | `968px` | Below this, sidebar collapses |
| Hide breakpoint | `768px` | Below this, sidebar hides, bottom nav appears |
| Padding | `16px` | Internal |
| Nav item height | `48px` (6 x 8px) | Touch target |
| Nav item padding | `12px 16px` | Internal |
| Nav item gap | `4px` | Between items |
| Nav item radius | `var(--radius-sm)` = `10px` | |
| Active item bg | `rgba(var(--primary-rgb), 0.12)` | |
| Active item color | `var(--primary)` | |
| Hover item bg | `var(--surface-hover)` | |

---

## SECTION 5 -- Navigation Clearance & Z-Index

### Z-Index Scale

| Level | Z-Index | Elements |
|-------|---------|----------|
| Base | `0` | Page content |
| Elevated | `1` | Cards with hover lift |
| Sticky | `10` | Sticky headers, sticky greeting strip |
| Navigation | `100` | Bottom nav, side nav |
| Overlay loader | `100` | In-card loading overlays |
| Sheet | `500` | Bottom sheets |
| Backdrop | `900` | Modal/overlay backdrops |
| Modal | `901` | Modal content |
| Toast | `1000` | Toast notifications (toastr) |

### Content Clearance

| Context | Bottom Padding/Margin | Reason |
|---------|----------------------|--------|
| Dashboard (no bottom nav) | `64px` | Scroll clearance |
| beSocial (with bottom nav) | `calc(56px + env(safe-area-inset-bottom) + 16px)` = ~`88px` | Nav height + safe area + breathing room |
| beSocial with daily panel FAB | Add `56px` to above | FAB floating above bottom nav |
| Any page with AI Chat FAB | FAB floats at `bottom: calc(env(safe-area-inset-bottom) + 16px)` on Dashboard, `bottom: calc(56px + env(safe-area-inset-bottom) + 16px)` on beSocial | Above bottom nav |

---

## SECTION 6 -- Responsive Breakpoints (Definitive)

| Name | Value | Direction | Key Changes |
|------|-------|-----------|-------------|
| `sm` | `375px` | `min-width` | Smallest supported viewport. iPhone SE. |
| `md` | `430px` | `min-width` | Standard mobile. Metric grid goes 2-column. Ring sizes increase. |
| `tablet` | `768px` | `min-width` | Side nav appears (collapsed). Metric grid goes 3-column. Modals stay centered (not bottom-sheet). |
| `desktop` | `968px` | `min-width` | Side nav expands to full 240px. Content max-width applied. |
| `large` | `1200px` | `min-width` | Max content width for centered layouts. |

### Breakpoint Behavior Table

| Element | < 375px | 375-429px | 430-767px | 768-967px | >= 968px |
|---------|---------|-----------|-----------|-----------|---------|
| App header | 56px, hamburger | 56px, hamburger | 56px, hamburger | 56px, full nav | 56px, full nav |
| Dashboard rings | Stacked | 3 inline (tight) | 3 inline (standard) | 3 inline (standard) | 3 inline (spacious) |
| Metric grid | 1-column | 1-column | 2-column | 3-column | 3-column (max 800px) |
| Social feed | Full-bleed | Full-bleed | Full-bleed | Centered (max 600px) | Centered (max 600px) |
| Social nav | Bottom nav | Bottom nav | Bottom nav | Side nav (collapsed) | Side nav (expanded) |
| Modals | Bottom sheet | Bottom sheet | Bottom sheet (< 640px) | Centered dialog | Centered dialog |
| Feed card width | 100% | 100% | 100% | 100% of content area | 100% of content area |

---

## SECTION 7 -- Touch Target Compliance

Every interactive element must meet the 48px minimum touch target rule. This is non-negotiable for a fitness app used at the gym.

| Element | Visual Size | Touch Target | Method |
|---------|------------|-------------|--------|
| Primary button | `42px` height | `48px` | Padding extends to 48px |
| Ghost button | `38px` height | `48px` | Padding extends to 48px |
| Icon button (round) | `32px` | `48px` | Invisible `::before` pseudo-element extends touch area |
| Bottom nav item | Full width / 5 | `48px x 48px` | Full item is tappable |
| Feed card reaction | `40px` | `48px` | Padding around icon |
| Card header avatar | `32px` | `48px` | Link wraps with padding |
| Quick-log strip button | `40px` | `48px` | Container padding |
| Metric card quick-log CTA | `48px` | `48px` | Direct size |
| Checkbox / toggle | `20px` visual | `48px` | Label wraps the checkbox with padding |

**Implementation pattern for small visual + large touch:**
```css
.icon-btn {
  width: 32px;
  height: 32px;
  position: relative;
}
.icon-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
}
```

---

## SECTION 8 -- Content Max-Widths

| Context | Max Width | Centering |
|---------|----------|-----------|
| Dashboard content area | `800px` | `margin: 0 auto; padding: 0 16px;` |
| Social feed | `600px` | `margin: 0 auto; padding: 0 16px;` |
| Social profile | `600px` | Same as feed |
| Modal dialog | `480px` | Centered via flex |
| Bottom sheet | `480px` on desktop | `margin: 0 auto;` on >= 640px |
| Article detail | `680px` | `margin: 0 auto; padding: 0 24px;` |
| Blog content | `800px` | `margin: 0 auto; padding: 0 16px;` |
| AI chat page | `720px` | `margin: 0 auto;` |

---

## SECTION 9 -- Typography Spatial Rules

| Context | Line Height | Letter Spacing | Notes |
|---------|------------|----------------|-------|
| Hero text (clamp 36-64px) | `1.1` | `-1.5px` | Tight for impact |
| Page heading (32px) | `1.2` | `-0.5px` | Slightly tight |
| Section title (20px) | `1.3` | `0` | Standard |
| Card title (17px) | `1.3` | `0` | Standard |
| Body text (15px) | `1.5` | `0` | Comfortable reading |
| Caption (13px) | `1.4` | `0` | Slightly tighter than body |
| Label / badge (11px) | `1` | `0.05em` | Uppercase, wide spacing |

---

## SECTION 10 -- Spatial Audit of Current Violations

### Non-8px Values Found in Codebase

| Value | Where | Replace With |
|-------|-------|-------------|
| `3px` | Badge padding, accent bands | Keep -- micro decoration (3px accent band is visual, not spatial) |
| `5px` | None found | |
| `6px` | `field-group` gap, `section-subtitle` margin | Keep -- `6px` = 1.5 x 4px micro, acceptable for text spacing |
| `7px` | `btn-primary` gap, `mat-progress-bar` height | `8px` gap; keep 7px bar height (visual, not spatial) |
| `9px` | `btn-ghost` padding, `pill` padding | Keep -- `9px` padding is `8px + 1px border` visual alignment |
| `10px` | Multiple border-radius values, menu padding | `var(--radius-sm)` = `10px` -- already in scale |
| `11px` | Font sizes | `var(--text-xs)` = `11px` -- in typography scale |
| `13px` | Font sizes, icon sizes | `var(--text-sm)` = `13px` -- in scale |
| `14px` | Border-radius, gap, font size, modal gap | `var(--radius-md)` = `14px`; `14px` gap acceptable as `16px - 2px` visual adjustment; `14px` font not in scale -- use `var(--text-base)` (15px) |
| `18px` | Font sizes, padding, icon sizes | `18px` = 2.25 x 8px. Not on grid. Replace padding `18px` with `16px`. Font `18px` should be `var(--fitness-stat-size)`. |
| `22px` | Font sizes, padding, icon sizes | `22px` = 2.75 x 8px. Not on grid. Replace padding `22px` with `24px`. Font `22px` acceptable as section title. |

### Priority Spacing Fixes

1. Card body padding `18px 22px 22px` -> `16px` (all sides uniform)
2. Card header padding `18px 22px 14px` -> `16px 16px 12px`
3. Modal body padding `18px 22px 12px` -> `16px 16px 12px`
4. Modal header padding `18px 22px 16px` -> `16px 16px 16px`
5. Modal footer padding `14px 22px` -> `16px`
6. `.sec-head` margin-bottom `14px` -> `16px`
7. Grid gap `14px` -> `16px`
8. Grid-3 gap `12px` -> keep (acceptable as 1.5 x 8px)

These are subtle visual changes (2-6px adjustments) but bring the system onto the 8px grid for maintainability.
