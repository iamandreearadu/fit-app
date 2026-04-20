# FitApp — Design System

Full reference for the visual language, tokens, patterns, and component styles.

> Source of truth: `fit-app/src/styles.css`
> Component styles: co-located `*.component.css` files
> Angular Material theme: Indigo-Pink (prod) / Purple-Green (test)

---

## Design Principles

- **Dark theme only.** Single deep dark surface (`#0d0d10`) with white text.
- **Glass morphism.** Cards, modals, and overlays use low-opacity backgrounds with `backdrop-filter: blur()`.
- **Purple-primary.** All interactive elements use `#7c4dff`. Pink (`#ff4081`) is secondary/danger.
- **Soft borders.** Always `rgba(255,255,255,0.08–0.14)` — subtle, not structural.
- **Smooth motion.** Every interactive state: `0.15s–0.3s`, ease or ease-out.
- **Poppins everywhere.** Single typeface, varied by weight and size only.

---

## CSS Custom Properties (Tokens)

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
| Light purple | `#a78bfa` | Gym-type badge, secondary accent |
| Orange | `#ff9800` / `#ffb74d` | Calories, fire, carbs |
| Yellow | `#fbbf24` | Intermediate badge, fat macros |
| Red / Error | `#ff4081` / `#ef5350` | Danger, delete, lose-goal |

### Macro Dot Colors
```
protein: #a78bfa  (light purple)
carbs:   #29b6f6  (blue)
fats:    #ffb74d  (orange)
other:   #ff4081  (pink)
```

### State / Badge Colors
| State | Background | Text |
|---|---|---|
| Lose weight | `rgba(255,64,129,0.12)` | `#ff4081` |
| Gain muscle | `rgba(74,222,128,0.10)` | `#4ade80` |
| Maintain | `rgba(56,189,248,0.10)` | `#38bdf8` |
| Strength | `rgba(167,139,250,0.14)` | `#a78bfa` |
| Cardio | `rgba(56,189,248,0.10)` | `#38bdf8` |

---

## Typography

**Font Family:** `"Poppins", sans-serif` — global, all elements

| Role | Size | Weight | Notes |
|---|---|---|---|
| Hero title | `clamp(36px, 4.5vw, 64px)` | `800` | letter-spacing: -1.5px |
| Page heading | `28px–32px` | `800` | |
| Section title | `22px` | `600–800` | |
| Card title | `17px–20px` | `800` | |
| Body | `14px–16px` | `400–500` | |
| Caption | `12px` | `500` | |
| Label / badge | `10px–11px` | `700` | UPPERCASE, letter-spacing: 0.05em |

---

## Spacing (4px grid)

`4 / 6 / 8 / 10 / 12 / 14 / 16 / 18 / 20 / 24 / 28 / 32 / 36 / 40 / 48 / 56 / 60 / 64px`

### Component Padding
| Context | Padding |
|---|---|
| Card body | `18px 22px 22px` |
| Card header | `18px 22px 14px` |
| Modal | `24px` |
| Button (primary) | `10px 22px` |
| Button (ghost) | `9px 18px` |
| Input field | `10px 14px` |
| Pill / badge | `3px 9px` to `3px 10px` |

---

## Border Radius

| Scale | Value | Use |
|---|---|---|
| xs | `6px`, `8px` | Icon buttons |
| sm | `9px`, `10px`, `12px` | Inputs, menu items |
| md | `14px`, `16px` | Buttons, dropdowns |
| lg | `20px`, `24px` | Cards, modals |
| pill | `999px` | Badges, tags, bubbles |
| circle | `50%` | Avatars |

---

## Shadows & Elevation

| Name | Value |
|---|---|
| Card at rest | `0 2px 12px rgba(0,0,0,0.4)` |
| Card hover | `0 4px 16px rgba(124,77,255,0.28)` |
| Modal | `0 32px 80px rgba(0,0,0,0.8)` |
| Primary glow | `0 6px 20px rgba(124,77,255,0.35)` |
| Dropdown | `0 12px 32px rgba(0,0,0,0.6)` |

---

## Animations & Transitions

### Keyframes (defined in styles.css — reuse, don't add new)
- `slideUp` — page/card entrance: `opacity 0→1, translateY 18px→0, 0.35–0.45s ease-out`
- `slideIn` — mobile drawer: `0.22s`
- `fadeIn` — backdrop: `0.18s`
- `pulse` — brand icons: `scale 1→1.04, 2s infinite`
- `bounce` — AI typing dots: `translateY 0→-4px, 1.2s infinite`
- `spin` — auto-save: `rotate 360deg, 1s linear infinite`

### Hover Patterns
| Element | Transform | Duration |
|---|---|---|
| Card | `translateY(-4px)` | `0.2s ease` |
| Button | `translateY(-1px)` | `0.15s ease` |
| Sidebar link | `translateX(3px)` | `0.15s ease` |
| Send button | `scale(1.05)` | `0.15s` |

---

## Responsive Breakpoints (desktop-first, max-width)

| Breakpoint | Px | Key change |
|---|---|---|
| Large tablet | `900px` | Grid reduces |
| Tablet | `768px` | Nav → hamburger, AI chat overlay |
| Sidebar | `968px` | User sidebar collapses |
| Modal → sheet | `640px` | Modals become bottom sheets |
| Mobile | `480px` | Single column |

---

## Global CSS Classes (from styles.css — reuse these)

### Buttons
- `.btn-primary` — purple filled, 42px height
- `.btn-ghost` — transparent, bordered
- `.btn-add-ex` — dashed purple, full-width add button

### Cards
- `.card-hdr` — card header with border-bottom
- `.card-hdr-icon` — 40px icon container, purple tint
- `.empty` — empty state (icon + text centered)
- `.loader-overlay` — absolute overlay with blur

### Pills
- `.pill` — purple tinted badge
- `.pill-subtle` — muted badge

---

## Angular Material Overrides (global in styles.css)

- Form fields: outlined, `border-radius: 10px`, focus color `#7c4dff`, error `#ff4081`
- Progress bar: `height: 7px; border-radius: 4px`
- Circular progress: `color: #7c4dff`
- Checkbox: purple custom styles
- Ripple: disabled/muted

---

## Components Quick Reference

### Card (base)
```css
background: rgba(255,255,255,0.025);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 20px;
padding: 16px–28px;
transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
/* hover: */
border-color: rgba(255,255,255,0.12);
transform: translateY(-4px);
box-shadow: 0 4px 16px rgba(124,77,255,0.28);
```

### Modal (small)
```css
/* Backdrop */
background: rgba(0,0,0,0.65); backdrop-filter: blur(8px);
/* Box */
background: #0d0d10; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1);
max-width: 480px;
/* Mobile → bottom sheet */
border-radius: 24px 24px 0 0; position: fixed; bottom: 0; left: 0; right: 0;
```

### AI Chat bubbles
```css
/* User */ background: var(--primary); border-radius: 18px 18px 4px 18px;
/* AI   */ background: rgba(255,255,255,0.05); border-radius: 18px 18px 18px 4px;
max-width: 72%;
```
