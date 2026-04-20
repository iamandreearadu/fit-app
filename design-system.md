# FitApp — Design System

Full reference for the visual language, tokens, patterns, and component styles used in the application.

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
18. [Components — Header](#components--header)
19. [Components — Footer](#components--footer)
20. [Components — Auth Pages](#components--auth-pages)
21. [Components — Hero Section](#components--hero-section)
22. [Components — Dashboard](#components--dashboard)
23. [Components — User Profile & Sidebar](#components--user-profile--sidebar)
24. [Components — Workouts](#components--workouts)
25. [Components — Blog](#components--blog)
26. [Components — AI Chat (Groq)](#components--ai-chat-groq)
27. [Angular Material Overrides](#angular-material-overrides)

---

## Design Principles

- **Dark theme only.** The entire app uses a single deep dark surface (`#0d0d10`) with white text.
- **Glass morphism.** Cards, modals, and overlays use low-opacity backgrounds with `backdrop-filter: blur()` to create a layered depth.
- **Purple-primary.** All interactive elements, focus states, and highlights use `#7c4dff` (violet/purple). Pink (`#ff4081`) is the secondary/danger accent.
- **Soft borders, not hard edges.** Borders are always `rgba(255,255,255,0.08–0.14)` — subtle, not structural.
- **Smooth motion.** Every interactive state transition is animated: `0.15s–0.3s`, primarily ease or ease-out.
- **Poppins everywhere.** A single typeface, varied only by weight and size.

---

## CSS Custom Properties (Tokens)

Defined in `src/styles.css` on `:root`:

```css
--primary:        #7c4dff
--primary-glow:   rgba(124, 77, 255, 0.35)
--accent:         rgb(255, 64, 129)
--accent-bg:      rgba(255, 64, 129, 0.15)
--surface:        #0d0d10
--white:          #ffffff
--white-soft:     rgba(255, 255, 255, 0.85)
--white-fade:     rgba(255, 255, 255, 0.08)
--bg-fade:        linear-gradient(rgba(255,255,255,0.04), rgba(255,255,255,0.02))
```

---

## Color Palette

### Core

| Role | Value |
|---|---|
| Surface / App background | `#0d0d10` |
| Primary (purple) | `#7c4dff` |
| Primary glow | `rgba(124, 77, 255, 0.35)` |
| Accent (pink/rose) | `rgb(255, 64, 129)` / `#ff4081` |
| Accent background | `rgba(255, 64, 129, 0.15)` |
| White text | `#ffffff` |
| White soft | `rgba(255, 255, 255, 0.85)` |
| White fade | `rgba(255, 255, 255, 0.08)` |

### Utility / Semantic

| Role | Value | Usage |
|---|---|---|
| Green | `#4ade80` | Success, gain, positive |
| Blue | `#38bdf8` | Info, maintain, hydration |
| Light purple | `#a78bfa` | Gym-type badge, secondary accent |
| Orange | `#ff9800` / `#ffb74d` | Calories, fire, carbs |
| Yellow | `#fbbf24` | Intermediate badge, fat macros |
| Red / Error | `#ff4081` / `#ef5350` | Danger, delete, lose-goal badge |

### State Colors (badges / goals)

| State | Background | Text |
|---|---|---|
| Lose weight | `rgba(255,64,129,0.12)` | `#ff4081` |
| Gain muscle | `rgba(74,222,128,0.10)` | `#4ade80` |
| Maintain | `rgba(56,189,248,0.10)` | `#38bdf8` |
| Beginner | `rgba(74,222,128,0.12)` | `#4ade80` |
| Intermediate | `rgba(251,191,36,0.12)` | `#fbbf24` |
| Advanced | `rgba(255,64,129,0.12)` | `#ff4081` |

---

## Typography

### Font Family

```
"Poppins", sans-serif
```

Loaded via Google Fonts: `Poppins:400,700,900` (imported in `styles.css`).
Applied globally via `* { font-family: "Poppins", sans-serif; }`.

### Scale

| Role | Size | Weight | Notes |
|---|---|---|---|
| Hero title | `clamp(36px, 4.5vw, 64px)` | `800` | Letter spacing: `-1.5px`, line-height: `1.08` |
| Page heading | `28px–32px` | `800` | Dashboard greeting |
| Section title | `22px` | `600–800` | |
| Card title | `17px–20px` | `800` | |
| Body large | `16px` | `700` | |
| Body | `14px–15px` | `400–500` | |
| Small | `13px` | `500` | |
| Caption | `12px` | `500` | |
| Label / badge | `10px–11px` | `700` | Uppercase, letter-spacing: `0.05em` |

### Letter Spacing

- Hero / large headings: `-1.5px`
- Section headings: `-0.2px` to `-0.4px`
- Badges / labels: `0.05em`
- Logo: `-0.4px`

---

## Spacing

Based on a **4px grid**. Common values:

| Scale | Value |
|---|---|
| xs | `4px`, `6px`, `8px` |
| sm | `10px`, `12px` |
| md | `14px`, `16px`, `18px`, `20px` |
| lg | `24px`, `28px` |
| xl | `32px`, `36px`, `40px`, `48px` |
| 2xl | `56px`, `60px`, `100px` |

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
| Medium dark | `0 2px 12px rgba(0,0,0,0.4)` | Cards at rest |
| Card hover | `0 4px 16px rgba(124,77,255,0.28)` | Cards on hover |
| Large | `0 12px 32px rgba(0,0,0,0.35)` | Panels |
| Modal | `0 32px 80px rgba(0,0,0,0.8)` | Full modals |
| Header | `-16px 0 48px rgba(0,0,0,0.55)` | Sticky header |
| Primary glow | `0 6px 20px rgba(124,77,255,0.35)` | Primary buttons, send button |
| Primary glow large | `0 12px 28px rgba(124,77,255,0.35)` | Auth brand icon |
| Dropdown | `0 12px 32px rgba(0,0,0,0.6)` | Dropdowns, menus |
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

### Keyframe Animations

**slideUp** — page/card entrance
```css
@keyframes slideUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* Duration: 0.35s–0.45s, ease-out */
```

**slideIn** — mobile drawer
```css
@keyframes slideIn {
  from { opacity: 0.8; transform: translateX(16px); }
  to   { opacity: 1;   transform: none; }
}
/* Duration: 0.22s */
```

**fadeIn** — backdrop
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
/* Duration: 0.18s */
```

**slideInUp** — move-up button
```css
@keyframes slideInUp {
  from { opacity: 0; transform: translateY(40px) scale(0.85); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
/* Duration: 0.4s */
```

**pulse** — brand icon on auth pages
```css
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.04); }
}
/* Duration: 2s, infinite */
```

**bounce** — AI typing indicator dots
```css
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-4px); }
}
/* Dot delays: 0s, 0.2s, 0.4s — duration: 1.2s, infinite */
```

**heartbeat** — footer powered-by icon
```css
@keyframes heartbeat {
  0%, 50%, 100% { transform: scale(1); }
  25%            { transform: scale(1.2); }
}
/* Duration: 1.5s, infinite */
```

**spin** — auto-save spinner
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
/* Duration: 1s, linear, infinite */
```

### Hover/Interactive Patterns

| Interaction | Transform | Transition |
|---|---|---|
| Card hover | `translateY(-4px)` | `0.2s ease` |
| Button hover | `translateY(-1px)` | `0.15s ease` |
| Sidebar link hover | `translateX(3px)` | `0.15s ease` |
| Blog/workout card | `translateY(-4px)` | `0.2s ease` |
| Hero motivation card | `translateX(6px)` | `0.2s ease` |
| Social footer button | `translateY(-4px)` | `0.2s ease` |
| Send button hover | `scale(1.05)` | `0.15s` |
| Auth social button | `translateY(-1px)` | `0.15s` |

---

## Responsive Breakpoints

Desktop-first approach using `max-width` media queries.

| Name | Breakpoint | Notes |
|---|---|---|
| Large desktop | `min-width: 1200px` | Multi-column wide layouts |
| Desktop | `max-width: 1100px` | Container padding adjustments |
| Small desktop | `max-width: 968px–1024px` | Sidebar collapses |
| Large tablet | `max-width: 900px` | Grid reduces to 1–2 columns |
| Tablet | `max-width: 768px` | Navigation changes |
| Tablet portrait | `max-width: 640px–720px` | Modals go full-width |
| Mobile | `max-width: 480px–540px` | Single column, bottom-sheet modals |

### Key layout changes at breakpoints

- **Header**: Nav links hidden → hamburger menu at `768px`
- **Modals**: Fixed width → full screen / bottom sheet at `540px–640px`
- **User sidebar**: Sticky collapsible sidebar → hidden drawer at `968px`
- **Grids**: 3-col / 2-col → 1-col at `640px–720px`
- **Hero**: Multi-column layout → stacked at `900px`
- **AI chat sidebar**: Always visible → overlay toggle at `768px`

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
::-webkit-scrollbar-thumb:hover  { /* lighter purple gradient */ }
::-webkit-scrollbar-thumb:active { /* darker purple gradient */ }
```

---

## Buttons

### Primary `.btn-primary`

```css
padding:       10px 22px
background:    #7c4dff
color:         #fff
border-radius: 12px
font-size:     14px
font-weight:   700
height:        40px–42px
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
font-size:     13px
font-weight:   500
hover:         background rgba(255,255,255,0.07); color #fff
```

### Icon Round `.icon-btn-round`

```css
width/height:  32px    (small variant: 24px)
border-radius: 8px     (small: 6px)
border:        1px solid rgba(255,255,255,0.1)
background:    rgba(255,255,255,0.04)
color:         rgba(255,255,255,0.55)
hover:         background rgba(255,255,255,0.1); color #fff
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
hover:         background rgba(124,77,255,0.08); border rgba(124,77,255,0.6); color #7c4dff
```

---

## Form Elements

### Angular Material Outlined Field — dark theme overrides

| State | Outline border | Label color |
|---|---|---|
| Default | `rgba(255,255,255,0.12)` | `rgba(255,255,255,0.45)` |
| Hover | `rgba(255,255,255,0.22)` | — |
| Focus | `#7c4dff` | `#7c4dff` |
| Error | `rgba(255,64,129,0.55)` | `#ff4081` |

```
Input text color:    #fff
Caret color:         #7c4dff
Placeholder:         rgba(255,255,255,0.28)
Container shape:     10px border-radius
Font size:           13px–14px
Height:              44px–52px
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
hover:         border-color rgba(255,255,255,0.12); translateY(-4px to -6px)
```

### Card Header `.card-hdr`

```css
padding:        18px 22px 14px
border-bottom:  1px solid rgba(255,255,255,0.06)
display:        flex
align-items:    center
gap:            14px
```

### Card Header Icon `.card-hdr-icon`

```css
width/height:  40px
border-radius: 12px
background:    rgba(124,77,255,0.14)
border:        1px solid rgba(124,77,255,0.28)
color:         #7c4dff
icon-size:     22px
```

### Card Title / Subtitle

```css
/* title */
font-size:   17px; font-weight: 800; color: #fff

/* subtitle */
font-size:   12px; color: rgba(255,255,255,0.4)
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
background:      rgba(0,0,0,0.6)
backdrop-filter: blur(4px)
border-radius:   20px
z-index:         100
display:         flex; align-items: center; justify-content: center
```

---

## Modals & Overlays

### Small Modal

```css
/* Backdrop .modal-bg */
background:      rgba(0,0,0,0.65)
backdrop-filter: blur(8px)
z-index:         1000

/* Box .modal-box */
background:    #0d0d10
border:        1px solid rgba(255,255,255,0.1)
border-radius: 24px
padding:       24px
max-width:     480px
max-height:    90dvh
```

### Large Modal / Panel

```css
/* Backdrop .overlay */
background:      rgba(0,0,0,0.82)
backdrop-filter: blur(16px)
z-index:         900

/* Panel .modal */
z-index:       901
background:    #0d0d10
border-radius: 20px
border:        1px solid rgba(255,255,255,0.08)
box-shadow:    0 32px 80px rgba(0,0,0,0.8)
max-height:    92vh; overflow-y: auto

/* Header */
padding:      18px 22px 16px
border-bottom: 1px solid rgba(255,255,255,0.07)

/* Footer */
padding:     14px 22px
border-top:  1px solid rgba(255,255,255,0.07)
```

### Mobile: modals become bottom sheets

- `border-radius: 24px 24px 0 0`
- `max-height: 90dvh`
- `position: fixed; bottom: 0; left: 0; right: 0`

---

## Pills & Badges

### Standard Pill `.pill`

```css
padding:       3px 9px
border-radius: 999px
font-size:     11px; font-weight: 700
background:    rgba(124,77,255,0.18)
border:        1px solid rgba(124,77,255,0.28)
color:         #fff
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
padding:         3px 10px
border-radius:   999px
text-transform:  uppercase
letter-spacing:  0.05em
```

Use semantic colors from the [State Colors](#state-colors-badges--goals) table above.

---

## Dropdowns & Menus

### Material Select Panel

```css
background:    var(--surface)   /* #0d0d10 */
border-radius: 12px
box-shadow:    0 12px 32px rgba(0,0,0,0.6)
color:         var(--white-soft)
```

### Material Menu Panel

```css
background:    #0d0d10
border-radius: 14px
box-shadow:    0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,77,255,0.08)
min-width:     200px

/* Item */
border-radius: 10px
color:         rgba(255,255,255,0.8)
font-size:     13px
hover-color:   #fff

/* Item icon */
font-size:     18px; color: rgba(255,255,255,0.6)
hover-color:   #7c4dff
```

### Custom Dropdown

```css
background:    #0d0d10
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

## Components — Header

```css
.app-header {
  height:     84px
  position:   sticky; top: 0
  z-index:    100
  box-shadow: -16px 0 48px rgba(0,0,0,0.55)
}

.hdr-logo-text {
  font-size:      18px; font-weight: 800
  letter-spacing: -0.4px
}

.hdr-link {
  padding:       7px 13px
  border-radius: 10px
  font-size:     13px; font-weight: 500
  color:         rgba(255,255,255,0.65)
  hover-color:   #fff
  active-color:  var(--primary)
}

.hdr-avatar {
  width/height:  32px–34px
  border-radius: 50%
  border:        2px solid rgba(124,77,255,0.45)
}
```

---

## Components — Footer

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
width/height:  48px–50px
border-radius: 50%
background:    linear-gradient(#7c4dff, darker-purple)
box-shadow:    0 0 24px rgba(124,77,255,0.35)
animation:     pulse 2s infinite
```

### Title / Subtitle

```css
title:    font-size 21px–22px; font-weight 700; letter-spacing -0.3px
subtitle: font-size 11.5px–12px; color var(--white-soft)
```

### Divider

```css
lines: linear-gradient(transparent → rgba(255,255,255,0.08) → transparent)
text:  font-size 11px–12px; padding 0 8px–10px
```

### Social Auth Buttons

```css
height:        40px–42px
border:        1px solid rgba(255,255,255,0.08)
border-radius: 10px–12px
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

/* Overlay */
background: radial-gradient(rgba(124,77,255,0.12), rgba(124,77,255,0.1))
z-index:    1

/* Badge */
padding:        6px 16px; border-radius: 999px
background:     rgba(124,77,255,0.18); border: 1px solid rgba(124,77,255,0.35)
font-size:      12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em

/* Title */
font-size:      clamp(36px, 4.5vw, 64px); font-weight: 800
letter-spacing: -1.5px; line-height: 1.08

/* Gradient text accent */
background:               linear-gradient(#7C4DFF, #ff4081)
-webkit-background-clip:  text
-webkit-text-fill-color:  transparent

/* Description */
font-size:  clamp(14px, 1.4vw, 17px); line-height: 1.8
color:      rgba(255,255,255,0.65); max-width: 500px

/* Motivation card */
padding:    14px 18px; border-radius: 14px
background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08)
hover:      translateX(6px); background rgba(255,255,255,0.07)

/* Pagination dots */
inactive: 7×7px circle; background rgba(255,255,255,0.28)
active:   28×7px pill;  background var(--primary); border-radius: 4px
```

---

## Components — Dashboard

### Greeting Strip

```css
"Hello"   font-size: 28px; font-weight: 300; color: rgba(255,255,255,0.45); letter-spacing: -0.01em
name      font-size: 32px; font-weight: 800; color: #fff; letter-spacing: -0.02em
```

### Control Bar (date / activity picker)

```css
height:        52px
background:    rgba(255,255,255,0.03)
border:        1px solid rgba(255,255,255,0.08)
border-radius: 14px
padding:       0 4px

/* Section */
padding:       0 16px; height: 100%; border-radius: 12px; cursor: pointer
hover:         background rgba(255,255,255,0.05)
```

### Macro Dot Colors

```css
protein: #a78bfa  (light purple)
carbs:   #29b6f6  (blue)
fats:    #ffb74d  (orange)
other:   #ff4081  (pink)
```

### Net Calorie Row

```css
padding:       11px 14px; border-radius: 12px
background:    rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08)
margin-top:    auto
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

### Sidebar

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
hover:         background rgba(255,255,255,0.07); color #fff; translateX(3px)
active:        background rgba(124,77,255,0.18); color #7c4dff; font-weight 700
```

---

## Components — Workouts

### Workout Card

```css
padding:       16px 18px; border-radius: 20px
background:    rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08)
hover:         border-color rgba(255,255,255,0.13); translateY(-4px)
```

### Type / Level Badges → see [State Colors](#state-colors-badges--goals)

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
title:   font-size 16px; font-weight 700; color #fff; line-height 1.3
caption: font-size 13px; color rgba(255,255,255,0.45); line-height 1.55
         -webkit-line-clamp: 3
```

### Search Bar

```css
height:        44px; border-radius: 12px
background:    rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08)
focus:         border-color rgba(124,77,255,0.4)
```

---

## Components — AI Chat (Groq)

### Layout

```css
sidebar-width:   280px
messages-area:   max-width 720px; padding 20px 16px; gap 4px
```

### Message Bubbles

```css
/* User */
padding:       10px 14px
border-radius: 18px 18px 4px 18px     /* bottom-right cut */
background:    var(--primary)
color:         #fff
box-shadow:    0 2px 12px rgba(124,77,255,0.35)
max-width:     72%

/* AI */
padding:       10px 14px
border-radius: 18px 18px 18px 4px     /* bottom-left cut */
background:    rgba(255,255,255,0.05)
border:        1px solid var(--white-fade)
color:         var(--white-soft)
max-width:     72%
```

### Input Bar

```css
border:        1px solid var(--white-fade)
border-radius: 55px
padding:       8px 10px 8px 16px
background:    var(--surface)
margin-bottom: 26px

/* Textarea */
border-radius: 44px
background:    rgba(255,255,255,0.05)
font-size:     14px; max-height: 110px; resize: none
focus:         border-color rgba(124,77,255,0.5)

/* Send button */
width/height:  40px; border-radius: 50%
background:    var(--primary)
box-shadow:    0 2px 12px rgba(124,77,255,0.4)
hover:         scale(1.05); opacity 0.88
```

### Chat Sidebar

```css
background:    rgba(255,255,255,0.06) color-mix
border-right:  1px solid var(--white-fade)

/* Conversation item */
padding:       9px 8px 9px 12px; border-radius: 10px
color:         var(--white-soft)
hover:         background rgba(255,255,255,0.05); color var(--white)
active:        background rgba(124,77,255,0.12); border-color rgba(124,77,255,0.25)
```

### Typing Indicator

```css
dots: 6×6px circles; background var(--white-soft); opacity 0.3–0.4
animation: bounce 1.2s infinite; delays: 0s, 0.2s, 0.4s
```

---

## Angular Material Overrides

All Material component overrides are applied globally in `styles.css`.

### Form Field (Outlined)

- Shape: `10px`
- Focus/active color: `#7c4dff`
- Error color: `#ff4081`
- Dark theme: all text, labels, borders adapted (see [Form Elements](#form-elements))

### Progress Bar

```css
height: 7px; border-radius: 4px
blue variant:  border-color #38bdf8
green variant: border-color #4ade80
```

### Circular Progress

```css
color: #7c4dff
```

### Select / Autocomplete Panel → see [Dropdowns & Menus](#dropdowns--menus)

### Checkbox (custom pseudo styles)

```css
background:    rgba(124,77,255,0.14)
border:        1px solid rgba(124,77,255,0.28)
border-radius: 4px
checked-color: #7c4dff
```

### Ripple

Disabled or heavily muted across interactive elements to maintain the dark glass aesthetic.

---

> All global tokens live in `fit-app/src/styles.css`.
> Component styles are co-located: `*.component.css` next to each component.
> Angular Material theme: **Indigo-Pink** (production) / **Purple-Green** (test) — configured in `angular.json`.
