# FitApp — Design System

Full reference for the visual language, tokens, patterns, and component styles used in the application.

> Source of truth for tokens: `fit-app/src/styles.css` `:root` block  
> Component styles: co-located `*.component.css` files  
> Angular Material theme: Indigo-Pink (prod) / Purple-Green (test) — `angular.json`

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [CSS Custom Properties (Tokens)](#css-custom-properties-tokens)
3. [Color Palette](#color-palette)
4. [Typography](#typography)
5. [Spacing](#spacing)
6. [Border Radius](#border-radius)
7. [Shadows & Elevation](#shadows--elevation)
8. [Animations & Transitions](#animations--transitions)
9. [Responsive Breakpoints](#responsive-breakpoints)
10. [Scrollbar](#scrollbar)
11. [Buttons](#buttons)
12. [Form Elements](#form-elements)
13. [Cards & Containers](#cards--containers)
14. [Modals & Overlays](#modals--overlays)
15. [Pills & Badges](#pills--badges)
16. [Dropdowns & Menus](#dropdowns--menus)
17. [Layout & Grid](#layout--grid)
18. [Components — Header (desktop)](#components--header-desktop)
19. [Components — Footer (desktop)](#components--footer-desktop)
20. [Components — Auth Pages](#components--auth-pages)
21. [Components — Hero Section](#components--hero-section)
22. [Components — Dashboard](#components--dashboard)
23. [Components — User Profile & Sidebar](#components--user-profile--sidebar)
24. [Components — Workouts](#components--workouts)
25. [Components — Blog](#components--blog)
26. [Components — AI Chat (Groq)](#components--ai-chat-groq)
27. [Mobile Navigation Components](#mobile-navigation-components)
28. [Angular Material Overrides](#angular-material-overrides)

---

## Design Principles

- **Dark theme only.** Single deep dark surface (`#0d0d10`) with white text — no light mode.
- **Glass morphism.** Cards, modals, and overlays use low-opacity backgrounds with `backdrop-filter: blur()`.
- **Purple-primary.** All interactive elements, focus states, and highlights use `#7c4dff`. Pink (`#ff4081`) is the secondary/danger accent.
- **Soft borders, not hard edges.** Borders are always `rgba(255,255,255,0.07–0.14)` — subtle, not structural.
- **Smooth motion.** Every interactive state: `0.15s–0.3s`, ease or ease-out. Reduced-motion respected via `@media (prefers-reduced-motion: reduce)`.
- **Poppins everywhere.** Single typeface, varied by weight and size only.
- **Touch targets minimum 48×48px.** All interactive elements on mobile.

---

## CSS Custom Properties (Tokens)

Defined in `styles.css` on `:root` — these are the tokens actually in production:

```css
/* ── Brand ── */
--primary:          #7c4dff
--primary-rgb:      124, 77, 255
--primary-light:    #a78bfa
--primary-glow:     rgba(124, 77, 255, 0.35)
--accent:           rgb(255, 64, 129)
--accent-background: rgba(255, 64, 129, 0.15)

/* ── Surface ── */
--surface:          #0d0d10
--white:            #ffffff
--white-soft:       rgba(255, 255, 255, 0.85)
--white-fade:       rgba(255, 255, 255, 0.08)
--background-fade:  linear-gradient(rgba(255,255,255,0.04), rgba(255,255,255,0.02))

/* ── Semantic ── */
--color-success:    #4ade80
--color-success-bg: rgba(74, 222, 128, 0.12)
--color-info:       #38bdf8
--color-info-bg:    rgba(56, 189, 248, 0.12)
--color-warning:    #ffb74d
--color-warning-bg: rgba(255, 183, 77, 0.12)
--color-error:      #ef5350
--color-error-bg:   rgba(239, 83, 80, 0.12)

/* ── Navigation (shared between bottom-nav, top-bar) ── */
--nav-height:             56px
--nav-bg:                 rgba(13, 13, 16, 0.95)
--nav-blur:               20px
--nav-border:             rgba(255, 255, 255, 0.07)
--nav-icon-inactive:      rgba(255, 255, 255, 0.4)
--nav-icon-hover:         rgba(255, 255, 255, 0.7)
--nav-create-gradient:    linear-gradient(135deg, var(--primary), var(--accent))
```

### z-index stack (reference, do not deviate)

| Level | Value | Component |
|---|---|---|
| Legacy | `100` | Old sticky elements — do not reuse |
| Social daily panel FAB | `920` | Desktop only |
| Social daily panel backdrop | `930` | Desktop only |
| Global nav | `1000` | `GlobalBottomNavComponent`, `GlobalTopBarComponent` |
| AI Chat FAB | `1050` | Above nav, below drawer |
| Side drawer backdrop | `1090` | |
| Side drawer panel | `1100` | `GlobalSideDrawerComponent` |
| Dialogs / sheets | `1200+` | Angular CDK managed |

---

## Color Palette

### Core

| Role | Value |
|---|---|
| Surface / App background | `#0d0d10` |
| Primary (purple) | `#7c4dff` |
| Primary light | `#a78bfa` |
| Primary glow | `rgba(124, 77, 255, 0.35)` |
| Accent (pink) | `rgb(255, 64, 129)` / `#ff4081` |
| Accent background | `rgba(255, 64, 129, 0.15)` |
| White text | `#ffffff` |
| White soft | `rgba(255, 255, 255, 0.85)` |
| White fade | `rgba(255, 255, 255, 0.08)` |

### Utility / Semantic

| Role | Value | Usage |
|---|---|---|
| Green | `#4ade80` | Success, gain, positive |
| Blue | `#38bdf8` | Info, maintain, hydration |
| Orange | `#ffb74d` | Calories, carbs, warning |
| Red / Error | `#ef5350` | Danger, delete |

### State / Badge Colors

| State | Background | Text |
|---|---|---|
| Lose weight | `rgba(255,64,129,0.12)` | `#ff4081` |
| Gain muscle | `rgba(74,222,128,0.10)` | `#4ade80` |
| Maintain | `rgba(56,189,248,0.10)` | `#38bdf8` |
| Beginner | `rgba(74,222,128,0.12)` | `#4ade80` |
| Intermediate | `rgba(251,191,36,0.12)` | `#fbbf24` |
| Advanced | `rgba(255,64,129,0.12)` | `#ff4081` |

### Macro Dot Colors (Nutrition)

```
protein: #a78bfa  (= var(--primary-light))
carbs:   #29b6f6  (blue)
fats:    #ffb74d  (= var(--color-warning))
other:   #ff4081  (= var(--accent))
```

---

## Typography

**Font Family:** `"Poppins", sans-serif` — global via `* { font-family: ... }`.  
Loaded via Google Fonts: `Poppins:400,700,900`.

| Role | Size | Weight | Notes |
|---|---|---|---|
| Hero title | `clamp(36px, 4.5vw, 64px)` | `800` | letter-spacing: `-1.5px`, line-height: `1.08` |
| Page heading | `28px–32px` | `800` | Dashboard greeting |
| Section title | `22px` | `600–800` | |
| Card title | `17px–20px` | `800` | |
| Body large | `16px` | `700` | |
| Body | `14px–15px` | `400–500` | |
| Small | `13px` | `500` | |
| Caption | `12px` | `500` | |
| Label / badge | `10px–11px` | `700` | UPPERCASE, letter-spacing: `0.05em` |

### Letter Spacing

- Hero / large headings: `-1.5px`
- Section headings: `-0.2px` to `-0.4px`
- Badges / labels: `0.05em`
- Logo / wordmark: `-0.4px`

---

## Spacing

Based on a **4px grid** (newer components use **8px grid**). Common values:

| Scale | Value |
|---|---|
| xs | `4px`, `6px`, `8px` |
| sm | `10px`, `12px` |
| md | `14px`, `16px`, `18px`, `20px` |
| lg | `24px`, `28px` |
| xl | `32px`, `36px`, `40px`, `48px` |
| 2xl | `56px`, `60px`, `64px` |

### Component Padding Patterns

| Context | Padding |
|---|---|
| Card body | `18px 22px 22px` |
| Card header | `18px 22px 14px` |
| Modal | `24px` |
| Modal header/footer | `18px 22px 16px` / `14px 22px` |
| Button (primary) | `10px 22px` |
| Button (ghost) | `9px 18px` |
| Input field | `10px 14px` |
| Pill / badge | `3px 9px` to `3px 10px` |

---

## Border Radius

| Scale | Value | Typical Use |
|---|---|---|
| xs | `6px`, `8px` | Small icon buttons |
| sm | `9px`, `10px`, `12px` | Input fields, menu items |
| md | `14px`, `16px` | Buttons, dropdowns |
| lg | `20px`, `24px` | Cards, modals, panels |
| pill | `999px` | Badges, chat bubbles, tags |
| circle | `50%` | Avatars, send button |

---

## Shadows & Elevation

| Name | Value | Use |
|---|---|---|
| Subtle dark | `0 2px 8px rgba(0,0,0,0.4)` | Small elements |
| Card at rest | `0 2px 12px rgba(0,0,0,0.4)` | Cards |
| Card hover | `0 4px 16px rgba(124,77,255,0.28)` | Cards on hover |
| Large | `0 12px 32px rgba(0,0,0,0.35)` | Panels |
| Modal | `0 32px 80px rgba(0,0,0,0.8)` | Full modals |
| Header | `-16px 0 48px rgba(0,0,0,0.55)` | Sticky desktop header |
| Primary glow | `0 6px 20px rgba(124,77,255,0.35)` | Primary buttons, send button |
| Dropdown | `0 12px 32px rgba(0,0,0,0.6)` | Dropdowns |
| Menu | `0 16px 40px rgba(0,0,0,0.6)` + `0 0 0 1px rgba(124,77,255,0.08)` | Material menus |

---

## Animations & Transitions

### Durations

| Speed | Range | Use |
|---|---|---|
| Instant | `0.12s–0.15s` | Color, border, opacity on hover |
| Fast | `0.18s–0.25s` | Transform (translate, scale) |
| Normal | `0.3s` | Slide, drawer, collapse |
| Entrance | `0.35s–0.45s` | Page/card appear |

### Easing

- `ease` — general hover effects
- `cubic-bezier(0.4, 0, 0.2, 1)` — Material-style ease-out for entrances and slides
- `cubic-bezier(0.34, 1.56, 0.64, 1)` — Spring bounce for create FAB and celebration animations

### Keyframe Animations (defined in `styles.css` — reuse, don't add new)

| Name | Description | Duration |
|---|---|---|
| `slideUp` | Page/card entrance — `opacity 0→1, translateY 18px→0` | `0.35–0.45s ease-out` |
| `slideIn` | Mobile drawer — `translateX 16px→0` | `0.22s` |
| `fadeIn` | Backdrop | `0.18s` |
| `slideInUp` | Move-up button | `0.4s` |
| `pulse` | Brand icon on auth pages — `scale 1→1.04` | `2s infinite` |
| `bounce` | AI typing dots — `translateY 0→-4px` | `1.2s infinite` |
| `heartbeat` | Footer icon | `1.5s infinite` |
| `spin` | Auto-save spinner | `1s linear infinite` |

### Hover / Interactive Patterns

| Element | Transform | Transition |
|---|---|---|
| Card hover | `translateY(-4px)` | `0.2s ease` |
| Button hover | `translateY(-1px)` | `0.15s ease` |
| Sidebar link hover | `translateX(3px)` | `0.15s ease` |
| Send button | `scale(1.05)` | `0.15s` |
| Bottom nav tab (press) | `scale(0.92)` | `0.1s` |
| Create FAB (press) | `scale(0.92)` | `0.1s` |

---

## Responsive Breakpoints

Desktop-first via `max-width` media queries.

| Breakpoint | px | Key change |
|---|---|---|
| Large desktop | `min-width: 1200px` | Multi-column wide layouts |
| Desktop | `max-width: 1100px` | Container padding adjustments |
| Small desktop | `max-width: 968px–1024px` | User sidebar collapses |
| Large tablet | `max-width: 900px` | Grid reduces to 1–2 columns |
| **Mobile threshold** | **`max-width: 768px`** | **Desktop nav hidden → mobile nav shown** |
| Modal → sheet | `max-width: 640px` | Modals become bottom sheets |
| Mobile | `max-width: 480px` | Single column |

### Mobile Navigation Architecture (≤ 768px)

At `768px`, the entire navigation layer switches:

| Hidden | Shown |
|---|---|
| `<app-header>` (`display: none !important`) | `<app-top-bar>` — fixed top, `z-index: 1000` |
| `<app-footer>` (`display: none`) | `<app-bottom-nav>` — fixed bottom, `z-index: 1000` |

**Page content** receives:
```css
padding-top: var(--nav-height);
padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom));
```
via the `.page-wrapper` class.

**Excluded routes** (no top-bar or bottom-nav): `/login`, `/register`, `/onboarding`, `/workout-session`

---

## Scrollbar

Custom webkit scrollbar applied globally:

```css
::-webkit-scrollbar        { width: 14px; height: 12px; }
::-webkit-scrollbar-track  {
  background: linear-gradient(var(--surface), #1a1a20);
  border-radius: 10px;
  box-shadow: inset 0 0 6px rgba(255,255,255,0.05);
}
::-webkit-scrollbar-thumb  {
  background: linear-gradient(var(--primary), var(--primary-glow));
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.4);
}
```

---

## Buttons

### Primary `.btn-primary`

```css
padding:       10px 22px
height:        40px–42px
background:    var(--primary)
color:         var(--white)
border-radius: 12px
font-size:     14px; font-weight: 700
transition:    opacity 0.2s, transform 0.2s
hover:         opacity 0.85; translateY(-1px)
disabled:      opacity 0.38
```

### Ghost `.btn-ghost`

```css
padding:       9px 18px
background:    transparent
border:        1px solid rgba(255,255,255,0.14)
color:         rgba(255,255,255,0.6)
border-radius: 12px
font-size:     13px; font-weight: 500
hover:         background rgba(255,255,255,0.07); color var(--white)
```

### Icon Round `.icon-btn-round`

```css
width/height:  32px    (small variant: 24px)
border-radius: 8px     (small: 6px)
border:        1px solid rgba(255,255,255,0.1)
background:    rgba(255,255,255,0.04)
color:         rgba(255,255,255,0.55)
hover:         background rgba(255,255,255,0.1); color var(--white)
```

### Dashed Add `.btn-add-ex`

```css
width:         100%
padding:       12px
border:        1.5px dashed rgba(124,77,255,0.35)
color:         rgba(124,77,255,0.8)
background:    transparent
border-radius: 10px
font-size:     13px; font-weight: 600
hover:         background rgba(124,77,255,0.08); border rgba(124,77,255,0.6); color var(--primary)
```

---

## Form Elements

### Angular Material Outlined Field — dark theme overrides

| State | Outline border | Label color |
|---|---|---|
| Default | `rgba(255,255,255,0.12)` | `rgba(255,255,255,0.45)` |
| Hover | `rgba(255,255,255,0.22)` | — |
| Focus | `var(--primary)` | `var(--primary)` |
| Error | `rgba(255,64,129,0.55)` | `var(--accent)` |

```
Input text:    var(--white)
Caret:         var(--primary)
Placeholder:   rgba(255,255,255,0.28)
Shape:         10px border-radius
Font size:     13px–14px
Height:        44px–52px
```

### Raw Input Fields

```css
padding:       10px 14px
background:    rgba(255,255,255,0.04)–rgba(255,255,255,0.06)
border:        1px solid rgba(255,255,255,0.08)
border-radius: 10px–12px
color:         var(--white)
font-size:     13px–14px
focus:         border-color rgba(124,77,255,0.4)–0.5; outline none
```

---

## Cards & Containers

### Base Card

```css
background:    rgba(255,255,255,0.025)–0.03
border:        1px solid rgba(255,255,255,0.08)
border-radius: 16px–20px
padding:       16px–28px
transition:    border-color 0.2s, transform 0.2s, box-shadow 0.2s
hover:         border-color rgba(255,255,255,0.12); translateY(-4px)
              box-shadow: 0 4px 16px rgba(124,77,255,0.28)
```

### Card Header `.card-hdr`

```css
padding:        18px 22px 14px
border-bottom:  1px solid rgba(255,255,255,0.06)
display:        flex; align-items: center; gap: 14px
```

### Card Header Icon `.card-hdr-icon`

```css
width/height:  40px; border-radius: 12px
background:    rgba(124,77,255,0.14)
border:        1px solid rgba(124,77,255,0.28)
color:         var(--primary)
icon-size:     22px
```

### Card Title / Subtitle

```css
/* title   */ font-size: 17px; font-weight: 800; color: var(--white)
/* subtitle */ font-size: 12px; color: rgba(255,255,255,0.4)
```

### Empty State `.empty`

```css
display:    flex; flex-direction: column; align-items: center
padding:    40px 20px
icon-size:  40px; color: rgba(255,255,255,0.18)
text:       font-size 15px; font-weight 600; color rgba(255,255,255,0.35)
```

### Loader Overlay `.loader-overlay`

```css
position:        absolute; inset: 0
background:      rgba(0,0,0,0.6); backdrop-filter: blur(4px)
border-radius:   20px; z-index: 100
display:         flex; align-items: center; justify-content: center
```

---

## Modals & Overlays

### Small Modal

```css
/* Backdrop .modal-bg */
background:      rgba(0,0,0,0.65); backdrop-filter: blur(8px); z-index: 1000

/* Box .modal-box */
background:    var(--surface)
border:        1px solid rgba(255,255,255,0.1)
border-radius: 24px; padding: 24px
max-width:     480px; max-height: 90dvh
```

### Large Modal / Panel

```css
/* Backdrop .overlay */
background:      rgba(0,0,0,0.82); backdrop-filter: blur(16px); z-index: 900

/* Panel .modal */
z-index:       901; background: var(--surface)
border-radius: 20px; border: 1px solid rgba(255,255,255,0.08)
box-shadow:    0 32px 80px rgba(0,0,0,0.8)
max-height:    92vh; overflow-y: auto
```

### Mobile: modals become bottom sheets (≤ 640px)

```css
border-radius: 24px 24px 0 0
max-height:    90dvh
position:      fixed; bottom: 0; left: 0; right: 0
```

---

## Pills & Badges

### Standard Pill `.pill`

```css
padding:       3px 9px; border-radius: 999px
font-size:     11px; font-weight: 700
background:    rgba(124,77,255,0.18); border: 1px solid rgba(124,77,255,0.28)
color:         var(--white)
```

### Subtle Pill `.pill-subtle`

```css
background:   rgba(255,255,255,0.06)
border-color: rgba(255,255,255,0.1)
color:        rgba(255,255,255,0.55)
```

### Category / Type Badges

```css
font-size:       10px; font-weight: 700
padding:         3px 10px; border-radius: 999px
text-transform:  uppercase; letter-spacing: 0.05em
```

Use semantic colors from the [State Colors](#state--badge-colors) table.

---

## Dropdowns & Menus

### Material Select Panel

```css
background:    var(--surface)
border-radius: 12px
box-shadow:    0 12px 32px rgba(0,0,0,0.6)
color:         var(--white-soft)
```

### Material Menu Panel

```css
background:    var(--surface); border-radius: 14px
box-shadow:    0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,77,255,0.08)
min-width:     200px

/* Item */
border-radius: 10px; color: rgba(255,255,255,0.8); font-size: 13px
hover-color:   var(--white); icon hover-color: var(--primary)
```

### Custom Dropdown

```css
background:    var(--surface)
border:        1px solid rgba(255,255,255,0.12)
border-radius: 14px
box-shadow:    0 12px 40px rgba(0,0,0,0.6)
```

---

## Layout & Grid

### Common Grids

| Pattern | CSS |
|---|---|
| 2-col equal | `grid-template-columns: 1fr 1fr; gap: 14px` |
| 3-col equal | `grid-template-columns: repeat(3, 1fr); gap: 12px` |
| Auto-fill cards | `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px` |
| Macro grid (4-col) | `grid-template-columns: repeat(4, 1fr); gap: 10px` |

### Container Max Widths

| Size | Value | Use |
|---|---|---|
| Small | `480px` / `560px` | Auth forms, small modals |
| Medium | `720px` / `800px` | Chat, blog post |
| Large | `1100px` / `1280px` | Page content wrapper |

---

## Components — Header (desktop)

Visible only at `> 768px`. Hidden on mobile via `display: none !important`.

```css
.app-header {
  height:     84px
  position:   sticky; top: 0; z-index: 100
  box-shadow: -16px 0 48px rgba(0,0,0,0.55)
}

.hdr-logo-text {
  font-size: 18px; font-weight: 800; letter-spacing: -0.4px
}

.hdr-link {
  padding: 7px 13px; border-radius: 10px
  font-size: 13px; font-weight: 500
  color:         rgba(255,255,255,0.65)
  hover-color:   var(--white)
  active-color:  var(--primary)
}

.hdr-avatar {
  width/height:  32px–34px; border-radius: 50%
  border:        2px solid rgba(124,77,255,0.45)
}
```

---

## Components — Footer (desktop)

Visible only at `> 768px`. Hidden on mobile via `display: none`.

```css
.app-footer {
  background:  linear-gradient(var(--surface), #141418)
  box-shadow:  0 -4px 20px rgba(0,0,0,0.4)
  margin-top:  auto
}

/* Social icons */
width/height:    44px; border-radius: 50%
backdrop-filter: blur(10px)
hover:           translateY(-4px); background rgba(255,255,255,0.2)

/* Heartbeat icon */
animation: heartbeat 1.5s infinite
```

---

## Components — Auth Pages

### Card

```css
max-width:       clamp(360px, 42vw, 560px)
background:      linear-gradient(rgba(255,255,255,0.06), rgba(255,255,255,0.03))
border:          1px solid rgba(255,255,255,0.08)
border-radius:   16px
box-shadow:      0 16px 48px rgba(0,0,0,0.55)
backdrop-filter: blur(12px)
animation:       slideUp 0.35s–0.45s ease-out
```

### Brand Icon

```css
width/height:  48px–50px; border-radius: 50%
background:    linear-gradient(var(--primary), #5e35b1)
box-shadow:    0 0 24px rgba(124,77,255,0.35)
animation:     pulse 2s infinite
```

### Title / Subtitle

```css
title:    font-size 21px–22px; font-weight 700; letter-spacing -0.3px
subtitle: font-size 11.5px–12px; color var(--white-soft)
```

### Social Auth Buttons

```css
height:        40px–42px; border-radius: 10px–12px
border:        1px solid rgba(255,255,255,0.08)
background:    transparent
hover:         background rgba(255,255,255,0.07); translateY(-1px)
```

---

## Components — Hero Section

```css
.hero {
  height:     calc(100vh - 74px)
  background: #0d0d14
}

/* Purple overlay */
background: radial-gradient(rgba(124,77,255,0.12), rgba(124,77,255,0.1))

/* Badge */
padding: 6px 16px; border-radius: 999px
background: rgba(124,77,255,0.18); border: 1px solid rgba(124,77,255,0.35)
font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em

/* Title */
font-size: clamp(36px, 4.5vw, 64px); font-weight: 800
letter-spacing: -1.5px; line-height: 1.08

/* Gradient text accent */
background: linear-gradient(var(--primary), var(--accent))
-webkit-background-clip: text; -webkit-text-fill-color: transparent

/* Description */
font-size: clamp(14px, 1.4vw, 17px); line-height: 1.8
color: rgba(255,255,255,0.65); max-width: 500px

/* Motivation card */
padding: 14px 18px; border-radius: 14px
background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08)
hover: translateX(6px); background rgba(255,255,255,0.07)

/* Pagination dots */
inactive: 7×7px circle; background rgba(255,255,255,0.28)
active:   28×7px pill;  background var(--primary); border-radius: 4px
```

---

## Components — Dashboard

The dashboard has been redesigned with a layered hierarchy. Full spec: `.claude/design-specs/dashboard-redesign.md`.

### Greeting Strip

```css
"Hello"  font-size: 28px; font-weight: 300; color: rgba(255,255,255,0.45)
name     font-size: 32px; font-weight: 800; color: var(--white); letter-spacing: -0.02em
```

### Progress Rings Hero (`RingsHeroComponent`)

Three concentric-style SVG rings (calorie / completion / water). Floats directly on surface — no card background, no border.

```css
/* Ring colors */
calorie ring:   stroke var(--primary); track rgba(124,77,255,0.12)
water ring:     stroke #22d3ee; track rgba(34,211,238,0.12)
activity ring:  stroke var(--color-success); track rgba(74,222,128,0.12)

/* SVG math (r=42, circumference=263.89) */
stroke-dashoffset: 263.89 * (1 - percentage / 100)
stroke-linecap: round; transform: rotate(-90deg)
```

### Macro Progress Card (`MacroProgressCardComponent`)

```css
background:    rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06)
border-radius: 20px; padding: 20px
```

### Quick Actions Strip (`QuickActionsStripComponent`)

Horizontal chip row below the rings hero.

```css
/* Chip */
padding: 8px 16px; border-radius: 999px
background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08)
font-size: 13px; font-weight: 600
hover: background rgba(255,255,255,0.09); border rgba(255,255,255,0.14)
```

### Daily User Data cards (Nutrition, Calories Burned, Hydration & Steps)

Three logging cards that remain unchanged from original design — interactive, form-based.

```css
background:    rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.08)
border-radius: 16px–20px
```

### Macro Dot Colors

```css
protein: #a78bfa;  carbs: #29b6f6;  fats: #ffb74d;  other: #ff4081
```

### AI Meal Analyzer Dropzone

```css
border:        1.5px dashed rgba(124,77,255,0.4)
border-radius: 14px
background:    rgba(0,0,0,0.88) with primary glow overlay
hover-border:  rgba(124,77,255,0.7)
padding:       24px 20px
```

---

## Components — User Profile & Sidebar

### Sidebar (desktop, `> 968px`)

```css
background:    rgba(255,255,255,0.025)
border:        1px solid rgba(255,255,255,0.07)
border-radius: 20px
position:      sticky; top: 24px
width:         256px  (collapsed: 64px)
transition:    width 0.3s ease
```

### Sidebar Nav Item

```css
padding:       11px 12px; border-radius: 12px
font-size:     13px; font-weight: 500
color:         rgba(255,255,255,0.48)
hover:         background rgba(255,255,255,0.07); color var(--white); translateX(3px)
active:        background rgba(124,77,255,0.18); color var(--primary); font-weight 700
```

---

## Components — Workouts

### Workout Card

```css
padding:       16px 18px; border-radius: 20px
background:    rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08)
hover:         border-color rgba(255,255,255,0.13); translateY(-4px)
```

### Type / Level Badges → see [State Colors](#state--badge-colors)

---

## Components — Blog

### Blog Post Card

```css
background:    rgba(255,255,255,0.03)
border:        1px solid rgba(255,255,255,0.08)
border-radius: 20px; overflow: hidden
image-height:  200px
hover:         border-color rgba(255,255,255,0.13); translateY(-4px)
```

### Post Title / Caption

```css
title:   font-size 16px; font-weight 700; color var(--white); line-height 1.3
caption: font-size 13px; color rgba(255,255,255,0.45); line-height 1.55
         -webkit-line-clamp: 3
```

---

## Components — AI Chat (Groq)

### Layout

```css
sidebar-width:  280px
messages-area:  max-width 720px; padding 20px 16px; gap 4px
```

### Message Bubbles

```css
/* User */
padding:       10px 14px
border-radius: 18px 18px 4px 18px
background:    var(--primary)
box-shadow:    0 2px 12px rgba(124,77,255,0.35)
max-width:     72%

/* AI */
padding:       10px 14px
border-radius: 18px 18px 18px 4px
background:    rgba(255,255,255,0.05)
border:        1px solid var(--white-fade)
color:         var(--white-soft)
max-width:     72%
```

### Input Bar

```css
border:        1px solid var(--white-fade)
border-radius: 55px; padding: 8px 10px 8px 16px
background:    var(--surface); margin-bottom: 26px

/* Textarea */
border-radius: 44px; background: rgba(255,255,255,0.05)
font-size: 14px; max-height: 110px; resize: none
focus: border-color rgba(124,77,255,0.5)

/* Send button */
width/height:  40px; border-radius: 50%
background:    var(--primary)
box-shadow:    0 2px 12px rgba(124,77,255,0.4)
hover:         scale(1.05); opacity 0.88
```

### Typing Indicator

```css
dots: 6×6px circles; background var(--white-soft); opacity 0.3–0.4
animation: bounce 1.2s infinite; delays: 0s, 0.2s, 0.4s
```

---

## Mobile Navigation Components

All mobile nav is visible only at `≤ 768px` (controlled by `AppComponent.showMainNav()`).

### App Bottom Nav (`app-bottom-nav`)

**File:** `shared/components/bottom-nav/app-bottom-nav.component.*`

```css
.app-bottomnav {
  position: fixed; bottom: 0; left: 0; right: 0
  z-index: 1000
  height: calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))
  padding-bottom: env(safe-area-inset-bottom, 0px)
  background: var(--nav-bg); backdrop-filter: blur(var(--nav-blur))
  border-top: 1px solid var(--nav-border)
  display: flex; align-items: center; justify-content: space-around
}
```

**Structure:** 4 standard tabs + 1 center Create FAB

```
[Dashboard] [Plans] [➕ Create] [Social•badge] [Profile]
```

**Tab states:**

| State | Icon color | Extra |
|---|---|---|
| Inactive | `var(--nav-icon-inactive)` | — |
| Active route | `var(--primary)` | 3×3px purple dot `::before` at top |
| Pressed | `scale(0.92)`, `0.1s` | — |

**Badge:** accent bg, `999px` radius, `9px` font, `1.5px` surface border — positioned `top: 6px; right: calc(50% - 20px)`.

**Center Create FAB:**
```css
width/height: 52px; border-radius: 16px
background: transparent (gradient applied by component via --nav-create-gradient)
transition: cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s (spring)
```

### App Top Bar (`app-top-bar`)

**File:** `shared/components/top-bar/app-top-bar.component.*`

```css
.app-topbar {
  position: fixed; top: 0; left: 0; right: 0
  z-index: 1000
  height: calc(var(--nav-height) + env(safe-area-inset-top, 0px))
  padding-top: env(safe-area-inset-top, 0px)
  background: var(--nav-bg); backdrop-filter: blur(var(--nav-blur))
  border-bottom: 1px solid var(--nav-border)
  display: flex; align-items: center; padding: 0 4px
}
```

**Three-zone layout:**
```
[Left: hamburger/back]  [Center: title (absolute)]  [Right: icons]
```

Center is `position: absolute; left: 0; right: 0; pointer-events: none` — centers over full bar width regardless of left/right asymmetry.

**Icon buttons (`.topbar-icon-btn`):**
```css
width/height: 48px; border-radius: 10px
color: var(--white-soft)
hover: background rgba(255,255,255,0.06)
active: background rgba(255,255,255,0.10)
focus-visible: outline 2px solid var(--primary)
```

**Title variants:**

| Class | Size | Weight | Use |
|---|---|---|---|
| `.app-topbar-screen-title` | `16px` | `600` | Root routes |
| `.app-topbar-context-title` | `16px` | `700` | Sub-routes (back context) |
| `.app-topbar-wordmark` | `18px` | `700` | Fallback / guest |

Scroll-to-hide: `html.topbar--scrolled-down app-top-bar .app-topbar` — managed globally in `styles.css`.

### More Sheet / Side Drawer

Overflow navigation for secondary pages (AI, Blog, Home, Logout).  
**Opened by:** hamburger in top-bar → `GlobalSideDrawerComponent` (`z-index: 1100`).

```css
/* Backdrop */
background: rgba(0,0,0,0.65); z-index: 1090

/* Panel */
background: var(--surface)
border-right: 1px solid rgba(255,255,255,0.08) (or border-radius 0 24px 24px 0 for sheet)
z-index: 1100

/* Items */
icon 22px + label + chevron; padding 14px vertical; border-radius 12px
logout: var(--accent) color; separated by divider
safe area: padding-bottom includes env(safe-area-inset-bottom)
```

---

## Angular Material Overrides

All applied globally in `styles.css`.

### Form Field (Outlined)

- Shape: `10px`
- Focus/active: `var(--primary)`
- Error: `var(--accent)`
- Dark theme: all text, labels, borders adapted

### Progress Bar

```css
height: 7px; border-radius: 4px
blue variant:  border-color var(--color-info)
green variant: border-color var(--color-success)
```

### Circular Progress

```css
color: var(--primary)
```

### Select / Autocomplete Panel → see [Dropdowns & Menus](#dropdowns--menus)

### Checkbox

```css
background:    rgba(124,77,255,0.14)
border:        1px solid rgba(124,77,255,0.28)
border-radius: 4px
checked-color: var(--primary)
```

### Ripple

Disabled or heavily muted across all interactive elements to maintain the dark glass aesthetic.

---

> Global tokens: `fit-app/src/styles.css`  
> Component styles: co-located `*.component.css`  
> Active redesign specs: `.claude/design-specs/`  
> Token expansion plan: `.claude/design-system/tokens.md`
