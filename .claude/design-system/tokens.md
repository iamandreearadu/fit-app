# NovaFit Design System -- Token Audit & Expansion

**Author:** @design-system-architect
**Date:** 2026-06-04
**Consumers:** @uiux-designer, @angular-developer
**Source of truth:** `fit-app/src/styles.css` `:root` block

---

## SECTION 1 -- Current Token Inventory

### Tokens Defined in `:root` (styles.css lines 3-28)

| Token | Value | Usage Count (approx) |
|-------|-------|---------------------|
| `--primary` | `#7c4dff` | 80+ references across codebase |
| `--primary-rgb` | `124, 77, 255` | 3 references (share-to-social sheet) |
| `--primary-light` | `#a78bfa` | 12 references |
| `--primary-glow` | `rgba(124, 77, 255, 0.35)` | 6 references |
| `--surface` | `#0d0d10` | 15 references |
| `--white` | `#ffffff` | 30+ references |
| `--white-soft` | `rgba(255, 255, 255, 0.85)` | 20+ references |
| `--white-fade` | `rgba(255, 255, 255, 0.08)` | 8 references |
| `--accent` | `rgb(255, 64, 129)` | 12 references |
| `--accent-background` | `rgb(255, 64, 129, 0.15)` | 2 references |
| `--color-success` | `#4ade80` | 6 references |
| `--color-success-bg` | `rgba(74, 222, 128, 0.12)` | 2 references |
| `--color-info` | `#38bdf8` | 5 references |
| `--color-info-bg` | `rgba(56, 189, 248, 0.12)` | 2 references |
| `--color-warning` | `#ffb74d` | 3 references |
| `--color-warning-bg` | `rgba(255, 183, 77, 0.12)` | 2 references |
| `--color-error` | `#ef5350` | 2 references |
| `--color-error-bg` | `rgba(239, 83, 80, 0.12)` | 1 reference |
| `--background-fade` | `linear-gradient(...)` | 0 references in components |

### Material Design Token Overrides (styles.css lines 335-357)

These are Material-specific and correctly scoped. No changes needed.

---

## SECTION 2 -- Hardcoded Color Audit (Violations)

### 2a. `#fff` / `#ffffff` used instead of `var(--white)`

**Files with violations (57 instances):**
- `header.component.css` -- 10 instances of `color: #fff`
- `onboarding-wizard.component.css` -- 18 instances of `color: #fff`
- `daily-user-data.component.css` -- 5 instances
- `calorie-balance-card.component.css` -- 2 instances
- `dashboard.component.css` -- 1 instance
- `groq.component.css` -- 2 instances
- `workouts-tab.component.css` -- 4 instances
- `nutrition-tab.component.css` -- 3 instances
- `features-grid.component.css` -- 2 instances
- `hero-slider.component.css` -- 1 instance
- `benefits-showcase.component.css` -- 2 instances
- `fitness-metrics.component.css` -- 2 instances
- `ai-meal-analyzer.component.css` -- 4 instances
- `user-page.component.css` -- 3 instances
- `profile-tab.component.css` -- 3 instances

**Action:** Replace all `#fff` / `#ffffff` with `var(--white)`. This is a mechanical find-and-replace. No visual change.

### 2b. `#7c4dff` / `#7C4DFF` used instead of `var(--primary)`

**Files with violations (30+ instances):**
- `onboarding-wizard.component.css` -- 12 instances
- `profile-tab.component.css` -- 3 instances
- `user-page.component.css` -- 5 instances
- `workouts-tab.component.css` -- 7 instances
- `fitness-metrics.component.css` -- 1 instance
- `nutrition-tab.component.css` -- 3 instances
- `daily-panel.component.css` -- 2 instances

**Action:** Replace all `#7c4dff` / `#7C4DFF` with `var(--primary)`.

### 2c. `#a78bfa` used instead of `var(--primary-light)`

**Files with violations (25+ instances):**
- `daily-user-data.component.css` -- 10 instances
- `previous-daily-user-data.component.css` -- 5 instances
- `blog-content.component.css` -- 3 instances
- `workouts-content.component.css` -- 5 instances
- `features-grid.component.css` -- 1 instance
- `daily-panel.component.css` -- 1 instance

**Action:** Replace all `#a78bfa` with `var(--primary-light)`.

### 2d. `#ff4081` used instead of `var(--accent)`

**Files with violations (12 instances):**
- `physical-stats.component.css`, `social-profile.component.css`, `benefits-showcase.component.css`, `nutrition-tab.component.css`, `daily-panel.component.css`, `header.component.css`

**Action:** Replace all `#ff4081` with `var(--accent)`.

### 2e. `#0d0d10` used instead of `var(--surface)`

**Files with violations (10 instances):**
- `blog-content.component.css`, `workouts-content.component.css`, `daily-user-data.component.css`, `create-content.component.css`, `write-article.component.css`, `top-bar.component.css`, `social-chat.component.css`, `ai-meal-analyzer.component.css`, `previous-daily-user-data.component.css`

**Action:** Replace all `#0d0d10` with `var(--surface)`.

### 2f. `#4ade80` used instead of `var(--color-success)`

**Files:** `workouts-content.component.css`, `active-workout-session.component.css`, `register.component.css`, `nutrition-guided-empty.component.css`, `daily-user-data.component.css`, `previous-daily-user-data.component.css`, `daily-panel.component.css`, `stats-tab.component.css`

### 2g. `#38bdf8` used instead of `var(--color-info)`

**Files:** `daily-user-data.component.css`, `daily-panel.component.css`, `workouts-content.component.css`

### 2h. Rogue color values (not matching any token)

| Hardcoded Value | Where | What It Should Be |
|----------------|-------|-------------------|
| `#141418` | footer.component.css | Needs new token `--surface-elevated` |
| `#13131a` | onboarding-wizard.component.css | Needs new token `--surface-elevated` |
| `#1a1a24` | social-profile.component.css (2x) | Needs new token `--surface-elevated` |
| `#0d0d14` | home-page.component.css, hero-slider.component.css | Needs new token `--surface-alt` or use `--surface` |
| `#0b0b0b` | ai-meal-analyzer.component.css | Use `--surface` |
| `#08080c` | login.component.css, register.component.css | Auth-specific, acceptable if intentional |
| `#e8e8f0` | onboarding-wizard.component.css | Needs new token `--text-primary` |
| `#9e7bff` | groq-sidenav.component.css, openai.component.css | Needs new token `--primary-lighter` |
| `#5e35b1` | workouts-content.component.css, blog-content.component.css, daily-user-data.component.css, ai-meal-analyzer.component.css | Needs new token `--primary-dark` |
| `#ff9800` | active-workout-session.component.css, calorie-balance-card.component.css, workouts-tab.component.css | Needs new token `--color-calorie` (semantic: calorie/energy) |
| `#ff9f40` / `#ff8c2a` / `#ff6b50` / `#ff8c6b` / `#ff7043` | dashboard.component.css, user-page.component.css | Streak amber/warning gradient -- needs `--color-streak` and `--color-streak-hot` |
| `#4caf50` | calorie-balance-card.component.css, daily-panel.component.css, ai-meal-analyzer.component.css | Competing with `--color-success` (#4ade80). Standardize to one green. |
| `#29b6f6` | ai-meal-analyzer.component.css, daily-panel.component.css | Competing with `--color-info` (#38bdf8). Standardize to one blue. |
| `#ff5252` / `#ff9800` / `#ef5350` | Various | Multiple reds/oranges used inconsistently |
| `#22d3ee` | daily-panel.component.css | Needs token: `--color-hydration` |
| `#b39dff` / `#a07cff` | social-feed.component.css, article-detail.component.css, social-top-bar.component.css | Primary light variants -- standardize to `--primary-light` |

---

## SECTION 3 -- Inconsistent Border Opacity Values

The codebase uses `rgba(255, 255, 255, X)` for borders at **11 different opacity levels**:

| Opacity | Count (approx) | Usage |
|---------|----------------|-------|
| 0.01 | 3 | Ghost card backgrounds (header) |
| 0.03 | 8 | Card backgrounds (section, linked-content) |
| 0.04 | 4 | Subtle backgrounds (icon-btn-round) |
| 0.05 | 3 | Hover backgrounds (groq-sidenav) |
| 0.06 | 5 | Card border-bottom dividers |
| 0.07 | 6 | Modal dividers, section borders |
| 0.08 | 15 | Primary border token (`--white-fade`) |
| 0.10 | 12 | Interactive element borders |
| 0.12 | 6 | Hover state borders |
| 0.14 | 4 | Prominent borders (ghost buttons) |
| 0.15 | 3 | Strong borders (header) |
| 0.18 | 3 | Active/focus borders |
| 0.22 | 2 | Hover outline borders |
| 0.25 | 3 | Strong hover borders |

**Standardization:** Collapse to 5 canonical border tokens:

| Token | Value | Purpose |
|-------|-------|---------|
| `--border-subtle` | `rgba(255, 255, 255, 0.06)` | Dividers, section separators |
| `--border-default` | `rgba(255, 255, 255, 0.10)` | Card borders, input outlines |
| `--border-strong` | `rgba(255, 255, 255, 0.16)` | Interactive element borders, hover states |
| `--border-focus` | `rgba(255, 255, 255, 0.24)` | Focus rings, active borders |
| `--border-primary` | `rgba(124, 77, 255, 0.28)` | Primary-tinted borders (icon containers, pills) |

---

## SECTION 4 -- Inconsistent Background Opacity Values

Similar problem for `rgba(255, 255, 255, X)` backgrounds:

**Standardization:** 4 canonical surface overlay tokens:

| Token | Value | Purpose |
|-------|-------|---------|
| `--surface-card` | `rgba(255, 255, 255, 0.03)` | Default card/section background |
| `--surface-hover` | `rgba(255, 255, 255, 0.06)` | Hover state background for cards |
| `--surface-active` | `rgba(255, 255, 255, 0.10)` | Active/pressed state, selected items |
| `--surface-elevated` | `#1a1a24` | Elevated surfaces (dropdowns, popovers, profile headers) |

---

## SECTION 5 -- Missing Semantic Tokens (New Additions)

### 5a. Text Hierarchy Tokens

Currently, text opacity is hardcoded as `rgba(255, 255, 255, X)` at 8+ opacity levels. No text hierarchy tokens exist.

| Token | Value | Purpose |
|-------|-------|---------|
| `--text-primary` | `#ffffff` | Headings, hero text, primary content. Alias of `--white`. |
| `--text-secondary` | `rgba(255, 255, 255, 0.75)` | Body text, descriptions |
| `--text-tertiary` | `rgba(255, 255, 255, 0.50)` | Captions, timestamps, metadata |
| `--text-muted` | `rgba(255, 255, 255, 0.35)` | Placeholders, disabled labels, hints |
| `--text-disabled` | `rgba(255, 255, 255, 0.20)` | Disabled state text |

**Rationale:** Apple HIG defines 4 text levels (primary/secondary/tertiary/quaternary). Material 3 uses on-surface/on-surface-variant/outline. We align with Apple's approach since our dark theme matches their aesthetic more closely.

### 5b. Overlay Tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--overlay-scrim` | `rgba(0, 0, 0, 0.65)` | Modal backdrop (currently hardcoded in `.modal-bg`) |
| `--overlay-heavy` | `rgba(0, 0, 0, 0.82)` | Full overlay backdrop (currently in `.overlay`) |
| `--overlay-loader` | `rgba(0, 0, 0, 0.60)` | Loading overlay (currently in `.loader-overlay`) |

### 5c. Surface Variant Tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--surface` | `#0d0d10` | (existing) App background |
| `--surface-card` | `rgba(255, 255, 255, 0.03)` | Card/section fill |
| `--surface-hover` | `rgba(255, 255, 255, 0.06)` | Hover state |
| `--surface-active` | `rgba(255, 255, 255, 0.10)` | Active/pressed state |
| `--surface-elevated` | `#1a1a24` | Elevated surface (dropdown, popover, sticky header) |
| `--surface-overlay` | `rgba(13, 13, 16, 0.97)` | Overlay surface (bottom sheets with blur) |

### 5d. Macro Color Tokens (Nutrition Domain)

These colors appear repeatedly hardcoded across dashboard, nutrition-tab, daily-panel, and ai-meal-analyzer components:

| Token | Value | Purpose |
|-------|-------|---------|
| `--macro-protein` | `#a78bfa` | Protein bars, dots, chips. Alias of `--primary-light`. |
| `--macro-carbs` | `#38bdf8` | Carbohydrate bars, dots, chips. Alias of `--color-info`. |
| `--macro-fat` | `#ffb74d` | Fat bars, dots, chips. Alias of `--color-warning`. |
| `--macro-protein-bg` | `rgba(167, 139, 250, 0.12)` | Protein chip/badge background |
| `--macro-carbs-bg` | `rgba(56, 189, 248, 0.12)` | Carbs chip/badge background |
| `--macro-fat-bg` | `rgba(255, 183, 77, 0.12)` | Fat chip/badge background |

**Note:** These are semantic aliases, not new colors. They allow nutrition components to reference purpose-named tokens while the underlying values stay synced with the palette.

### 5e. Streak/Engagement Tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--color-streak` | `#ff9f40` | Streak flame icon, streak badge default |
| `--color-streak-hot` | `#ff6b50` | At-risk streak, high urgency |
| `--color-calorie` | `#ff9800` | Calorie displays, energy/fire contexts |

### 5f. Primary Palette Expansion

| Token | Value | Purpose |
|-------|-------|---------|
| `--primary-dark` | `#5e35b1` | Dark end of primary gradient (used in CTAs) |
| `--primary-lighter` | `#b39dff` | Lighter primary for secondary text accents |

---

## SECTION 6 -- Motion Tokens (New)

**No motion tokens currently exist in `:root`.** All duration and easing values are hardcoded in individual component CSS files.

### Duration Tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--duration-micro` | `150ms` | Hover, tap, color change, icon swap |
| `--duration-standard` | `250ms` | Card enter, state change, toggle |
| `--duration-emphasis` | `350ms` | Page entrance, slideUp, significant state change |
| `--duration-celebration` | `600ms` | Ring close, streak milestone, PR achievement |
| `--duration-data` | `250ms` | Skeleton to content, number settle |

### Easing Tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--ease-standard` | `ease-out` | Default for all transitions |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Celebration bounce, pop-in effects |
| `--ease-decelerate` | `cubic-bezier(0.0, 0.0, 0.2, 1)` | Elements entering the screen |
| `--ease-accelerate` | `cubic-bezier(0.4, 0.0, 1, 1)` | Elements exiting the screen |

**Reference:** Material 3 motion tokens use `emphasized-decelerate` and `emphasized-accelerate` for the same purpose. Our `--ease-decelerate` maps to their `emphasized-decelerate`.

---

## SECTION 7 -- Typography Tokens (New)

**No typography tokens exist in `:root`.** Font sizes and weights are hardcoded in every component.

### Scale Tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--font-family` | `'Poppins', sans-serif` | Global font family |
| `--text-xs` | `11px` | Labels, badges, uppercase micro-text |
| `--text-sm` | `13px` | Captions, metadata, timestamps |
| `--text-base` | `15px` | Body text, default readable size |
| `--text-lg` | `17px` | Card titles, emphasized body |
| `--text-xl` | `20px` | Section titles, card headers |
| `--text-2xl` | `24px` | Page sub-headings |
| `--text-3xl` | `32px` | Page headings |
| `--text-hero` | `clamp(36px, 4.5vw, 64px)` | Hero/display text |

### Weight Tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--weight-regular` | `400` | Body text |
| `--weight-medium` | `500` | Emphasized body, descriptions |
| `--weight-semibold` | `600` | Section titles, navigation |
| `--weight-bold` | `700` | Card titles, buttons, labels |
| `--weight-black` | `800` | Page headings, hero text, display numbers |

---

## SECTION 8 -- Border Radius Tokens (Standardized)

Current state: 15+ different radius values used. Standardize to 6:

| Token | Value | Purpose |
|-------|-------|---------|
| `--radius-xs` | `6px` | Small icon buttons, tiny chips |
| `--radius-sm` | `10px` | Input fields, menu items, small interactive elements |
| `--radius-md` | `14px` | Buttons, sections, workout set rows |
| `--radius-lg` | `20px` | Cards, modals, large containers |
| `--radius-xl` | `24px` | Bottom sheets, large modals |
| `--radius-pill` | `999px` | Badges, pills, avatars, tags |

---

## SECTION 9 -- Shadow Tokens (Standardized)

| Token | Value | Purpose |
|-------|-------|---------|
| `--shadow-card` | `0 2px 12px rgba(0, 0, 0, 0.4)` | Card at rest |
| `--shadow-card-hover` | `0 4px 16px rgba(124, 77, 255, 0.28)` | Card hover with primary glow |
| `--shadow-dropdown` | `0 12px 32px rgba(0, 0, 0, 0.6)` | Dropdowns, select panels |
| `--shadow-modal` | `0 32px 80px rgba(0, 0, 0, 0.8)` | Modal dialogs |
| `--shadow-sheet` | `0 -8px 48px rgba(0, 0, 0, 0.7)` | Bottom sheets |
| `--shadow-glow` | `0 6px 20px rgba(124, 77, 255, 0.35)` | Primary CTA glow |

---

## SECTION 10 -- New Tokens for Dashboard & beSocial Redesign

### 10a. Progress Ring Tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--ring-calorie` | `var(--primary)` | Calorie progress ring stroke |
| `--ring-calorie-bg` | `rgba(124, 77, 255, 0.12)` | Calorie ring track |
| `--ring-water` | `#22d3ee` | Water/hydration ring stroke |
| `--ring-water-bg` | `rgba(34, 211, 238, 0.12)` | Water ring track |
| `--ring-activity` | `var(--color-success)` | Activity/workout ring stroke |
| `--ring-activity-bg` | `rgba(74, 222, 128, 0.12)` | Activity ring track |
| `--ring-stroke-width` | `8px` | Ring stroke thickness (on 8px grid) |
| `--ring-track-width` | `8px` | Ring background track thickness |
| `--ring-size-sm` | `96px` | Small ring (inline metric) -- 12 x 8px |
| `--ring-size-md` | `136px` | Medium ring (dashboard secondary) -- 17 x 8px |
| `--ring-size-lg` | `192px` | Large ring (dashboard hero) -- 24 x 8px |

**Source:** Apple Fitness+ uses 3 concentric rings with distinct colors. Our tokens map: calorie = purple (brand), water = cyan (universal hydration), activity = green (universal health).

### 10b. Today Score Token

| Token | Value | Purpose |
|-------|-------|---------|
| `--score-text-size` | `48px` | Today Score display number size (6 x 8px) |
| `--score-text-weight` | `800` | Today Score weight |
| `--score-complete` | `var(--color-success)` | Score at 100% |
| `--score-partial` | `var(--primary)` | Score between 1-99% |
| `--score-empty` | `var(--text-muted)` | Score at 0% |

### 10c. Fitness Data Card Tokens (Social Posts)

| Token | Value | Purpose |
|-------|-------|---------|
| `--fitness-card-bg` | `rgba(124, 77, 255, 0.06)` | Workout/meal linked content background |
| `--fitness-card-border` | `rgba(124, 77, 255, 0.18)` | Linked content border |
| `--fitness-card-accent` | `var(--primary)` | Left accent band for workout cards |
| `--fitness-card-meal-accent` | `var(--color-success)` | Left accent band for meal cards |
| `--fitness-stat-size` | `18px` | Stat number font size in fitness cards |
| `--fitness-stat-weight` | `700` | Stat number weight |

### 10d. Reaction Tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--reaction-fire` | `#ff6b35` | Fire reaction icon color |
| `--reaction-fire-bg` | `rgba(255, 107, 53, 0.12)` | Fire reaction background |
| `--reaction-strong` | `#fbbf24` | Flex/strong reaction color |
| `--reaction-strong-bg` | `rgba(251, 191, 36, 0.12)` | Strong reaction background |
| `--reaction-heart` | `var(--accent)` | Heart/love reaction (existing like) |
| `--reaction-heart-bg` | `var(--accent-background)` | Heart reaction background |
| `--reaction-clap` | `var(--color-success)` | Clap/well-done reaction |
| `--reaction-clap-bg` | `var(--color-success-bg)` | Clap reaction background |
| `--reaction-target` | `var(--color-info)` | Target/goal-hit reaction |
| `--reaction-target-bg` | `var(--color-info-bg)` | Target reaction background |

### 10e. Achievement/Celebration Tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--celebration-gold` | `#fbbf24` | Streak milestone, achievement badge |
| `--celebration-gold-bg` | `rgba(251, 191, 36, 0.15)` | Achievement badge background |
| `--celebration-glow` | `rgba(251, 191, 36, 0.35)` | Achievement glow effect |

---

## SECTION 11 -- Complete `:root` Block (Implementation-Ready)

This is the complete token set for `@angular-developer` to add to `fit-app/src/styles.css`.

```css
:root {
  /* ── Brand Palette ── */
  --primary:           #7c4dff;
  --primary-rgb:       124, 77, 255;
  --primary-dark:      #5e35b1;
  --primary-light:     #a78bfa;
  --primary-lighter:   #b39dff;
  --primary-glow:      rgba(124, 77, 255, 0.35);

  --accent:            rgb(255, 64, 129);
  --accent-background: rgba(255, 64, 129, 0.15);

  /* ── Surface / Background ── */
  --surface:           #0d0d10;
  --surface-card:      rgba(255, 255, 255, 0.03);
  --surface-hover:     rgba(255, 255, 255, 0.06);
  --surface-active:    rgba(255, 255, 255, 0.10);
  --surface-elevated:  #1a1a24;
  --surface-overlay:   rgba(13, 13, 16, 0.97);
  --background-fade:   linear-gradient(to bottom, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));

  /* ── Text Hierarchy ── */
  --white:             #ffffff;
  --white-soft:        rgba(255, 255, 255, 0.85);
  --white-fade:        rgba(255, 255, 255, 0.08);
  --text-primary:      #ffffff;
  --text-secondary:    rgba(255, 255, 255, 0.75);
  --text-tertiary:     rgba(255, 255, 255, 0.50);
  --text-muted:        rgba(255, 255, 255, 0.35);
  --text-disabled:     rgba(255, 255, 255, 0.20);

  /* ── Border ── */
  --border-subtle:     rgba(255, 255, 255, 0.06);
  --border-default:    rgba(255, 255, 255, 0.10);
  --border-strong:     rgba(255, 255, 255, 0.16);
  --border-focus:      rgba(255, 255, 255, 0.24);
  --border-primary:    rgba(124, 77, 255, 0.28);

  /* ── Semantic Colors ── */
  --color-success:     #4ade80;
  --color-success-bg:  rgba(74, 222, 128, 0.12);
  --color-info:        #38bdf8;
  --color-info-bg:     rgba(56, 189, 248, 0.12);
  --color-warning:     #ffb74d;
  --color-warning-bg:  rgba(255, 183, 77, 0.12);
  --color-error:       #ef5350;
  --color-error-bg:    rgba(239, 83, 80, 0.12);

  /* ── Domain: Nutrition / Macros ── */
  --macro-protein:     var(--primary-light);
  --macro-carbs:       var(--color-info);
  --macro-fat:         var(--color-warning);
  --macro-protein-bg:  rgba(167, 139, 250, 0.12);
  --macro-carbs-bg:    rgba(56, 189, 248, 0.12);
  --macro-fat-bg:      rgba(255, 183, 77, 0.12);
  --color-calorie:     #ff9800;

  /* ── Domain: Streak / Engagement ── */
  --color-streak:      #ff9f40;
  --color-streak-hot:  #ff6b50;

  /* ── Domain: Hydration ── */
  --color-hydration:   #22d3ee;

  /* ── Overlay ── */
  --overlay-scrim:     rgba(0, 0, 0, 0.65);
  --overlay-heavy:     rgba(0, 0, 0, 0.82);
  --overlay-loader:    rgba(0, 0, 0, 0.60);

  /* ── Progress Rings ── */
  --ring-calorie:      var(--primary);
  --ring-calorie-bg:   rgba(124, 77, 255, 0.12);
  --ring-water:        var(--color-hydration);
  --ring-water-bg:     rgba(34, 211, 238, 0.12);
  --ring-activity:     var(--color-success);
  --ring-activity-bg:  rgba(74, 222, 128, 0.12);
  --ring-stroke-width: 8px;
  --ring-track-width:  8px;
  --ring-size-sm:      96px;
  --ring-size-md:      136px;
  --ring-size-lg:      192px;

  /* ── Fitness Data Cards (Social) ── */
  --fitness-card-bg:           rgba(124, 77, 255, 0.06);
  --fitness-card-border:       rgba(124, 77, 255, 0.18);
  --fitness-card-accent:       var(--primary);
  --fitness-card-meal-accent:  var(--color-success);
  --fitness-stat-size:         18px;
  --fitness-stat-weight:       700;

  /* ── Reactions ── */
  --reaction-fire:       #ff6b35;
  --reaction-fire-bg:    rgba(255, 107, 53, 0.12);
  --reaction-strong:     #fbbf24;
  --reaction-strong-bg:  rgba(251, 191, 36, 0.12);
  --reaction-heart:      var(--accent);
  --reaction-heart-bg:   var(--accent-background);
  --reaction-clap:       var(--color-success);
  --reaction-clap-bg:    var(--color-success-bg);
  --reaction-target:     var(--color-info);
  --reaction-target-bg:  var(--color-info-bg);

  /* ── Celebration / Achievement ── */
  --celebration-gold:    #fbbf24;
  --celebration-gold-bg: rgba(251, 191, 36, 0.15);
  --celebration-glow:    rgba(251, 191, 36, 0.35);

  /* ── Today Score ── */
  --score-text-size:     48px;
  --score-text-weight:   800;
  --score-complete:      var(--color-success);
  --score-partial:       var(--primary);
  --score-empty:         var(--text-muted);

  /* ── Shadows ── */
  --shadow-card:        0 2px 12px rgba(0, 0, 0, 0.4);
  --shadow-card-hover:  0 4px 16px rgba(124, 77, 255, 0.28);
  --shadow-dropdown:    0 12px 32px rgba(0, 0, 0, 0.6);
  --shadow-modal:       0 32px 80px rgba(0, 0, 0, 0.8);
  --shadow-sheet:       0 -8px 48px rgba(0, 0, 0, 0.7);
  --shadow-glow:        0 6px 20px rgba(124, 77, 255, 0.35);

  /* ── Border Radius ── */
  --radius-xs:          6px;
  --radius-sm:          10px;
  --radius-md:          14px;
  --radius-lg:          20px;
  --radius-xl:          24px;
  --radius-pill:        999px;

  /* ── Motion: Duration ── */
  --duration-micro:       150ms;
  --duration-standard:    250ms;
  --duration-emphasis:    350ms;
  --duration-celebration: 600ms;
  --duration-data:        250ms;

  /* ── Motion: Easing ── */
  --ease-standard:    ease-out;
  --ease-spring:      cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-decelerate:  cubic-bezier(0.0, 0.0, 0.2, 1);
  --ease-accelerate:  cubic-bezier(0.4, 0.0, 1, 1);

  /* ── Typography ── */
  --font-family:       'Poppins', sans-serif;
  --text-xs:           11px;
  --text-sm:           13px;
  --text-base:         15px;
  --text-lg:           17px;
  --text-xl:           20px;
  --text-2xl:          24px;
  --text-3xl:          32px;
  --text-hero:         clamp(36px, 4.5vw, 64px);
  --weight-regular:    400;
  --weight-medium:     500;
  --weight-semibold:   600;
  --weight-bold:       700;
  --weight-black:      800;
}
```

---

## SECTION 12 -- Migration Priority

### Phase 1 (Before any redesign work)
1. Add new tokens to `:root` -- additive, zero risk
2. Replace hardcoded `#fff` with `var(--white)` -- mechanical, zero visual change
3. Replace hardcoded `#7c4dff` / `#7C4DFF` with `var(--primary)` -- same
4. Replace hardcoded `#a78bfa` with `var(--primary-light)` -- same
5. Replace hardcoded `#ff4081` with `var(--accent)` -- same
6. Replace hardcoded `#0d0d10` with `var(--surface)` -- same

### Phase 2 (During redesign)
7. Replace hardcoded `rgba(255,255,255,0.XX)` text values with `--text-*` tokens
8. Replace hardcoded border `rgba` values with `--border-*` tokens
9. Replace hardcoded background `rgba` values with `--surface-*` tokens
10. Replace hardcoded transitions with `--duration-*` and `--ease-*` tokens

### Phase 3 (New feature tokens)
11. Apply `--ring-*` tokens in new ProgressRing component
12. Apply `--fitness-card-*` tokens in redesigned post-card
13. Apply `--reaction-*` tokens in new reaction system
14. Apply `--celebration-*` tokens in celebration animations
