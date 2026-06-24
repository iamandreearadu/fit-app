# NovaFit Design System -- Token Specification (Sprint 0)

> **Owner:** @design-system-architect
> **Consumer:** @angular-developer (implementation), @uiux-designer (spec authoring)
> **Created:** 2026-06-04
> **Status:** CANONICAL -- all new component CSS must reference these tokens exclusively.

---

## Audit Summary

Scanned **69 component CSS files** + `styles.css`. Found **~350+ hardcoded color violations** across ~40 files.

| Hardcoded Value | Occurrences | Files |
|-----------------|-------------|-------|
| `#fff` / `#ffffff` | 85 | 27 |
| `#7c4dff` (primary) | 38 | 11 |
| `#a78bfa` (primary-light) | 36 | 10 |
| `#ff4081` (accent) | 23 | 16 |
| `#4ade80` (success green) | 18 | 11 |
| `#38bdf8` (info blue) | 16 | 9 |
| `#0d0d10` (surface) | 11 | 11 |
| `#ffb74d` (warning orange) | 7 | 4 |
| `#ff9800` (calories orange) | 5 | 4 |
| Purple shade variants | 17 | 12 |
| Misc unique colors | 47 | 18 |
| Hardcoded rgba() values | ~200+ | 40+ |
| **styles.css hardcoded hex** | **45** | **1** |

---

## 1. Color Tokens

All tokens use the `--nova-` prefix. Existing `:root` vars (e.g., `--primary`) remain as aliases during migration, then are deprecated.

### 1.1 Surface / Background

```css
/* ── Base surfaces ── */
--nova-surface-base:       #0d0d10;      /* 11 occurrences -- app bg, modal bg, footer, menu */
--nova-surface-page:       #0d0d14;      /* 3 occurrences -- home page, hero, features-grid bg */
--nova-surface-raised:     #13131a;      /* 1 occurrence -- onboarding wizard bg */
--nova-surface-elevated:   #1a1a24;      /* 3 occurrences -- profile dropdown, social-profile panels */
--nova-surface-input:      #0b0b0b;      /* 1 occurrence -- ai-meal-analyzer camera bg */
--nova-surface-pure-black: #000;         /* 1 occurrence -- ai-meal-analyzer overlay */

/* ── Auth surfaces (gradient stops) ── */
--nova-surface-auth-dark:  #08080c;      /* 2 occurrences -- login/register bg */
--nova-surface-auth-tint1: #0e0a1a;      /* 2 occurrences -- login/register gradient */
--nova-surface-auth-tint2: #130818;      /* 1 occurrence -- login gradient */
--nova-surface-auth-tint3: #12080f;      /* 1 occurrence -- register gradient */

/* ── Scrollbar track ── */
--nova-surface-track:      #1a1a20;      /* 1 occurrence -- scrollbar track gradient stop */
--nova-surface-footer:     #141418;      /* 1 occurrence -- footer gradient stop */

/* ── White-alpha surface layers (glassmorphism building blocks) ── */
--nova-white-alpha-01:     rgba(255, 255, 255, 0.01);   /* 5 occurrences -- subtle bg for buttons/nav items */
--nova-white-alpha-02:     rgba(255, 255, 255, 0.02);   /* gradient fade stop */
--nova-white-alpha-025:    rgba(255, 255, 255, 0.025);  /* 5+ occurrences -- card base bg */
--nova-white-alpha-03:     rgba(255, 255, 255, 0.03);   /* 8+ occurrences -- card/section bg */
--nova-white-alpha-04:     rgba(255, 255, 255, 0.04);   /* 10+ occurrences -- search inputs, gradient fade */
--nova-white-alpha-05:     rgba(255, 255, 255, 0.05);   /* 8+ occurrences -- footer divider, chat bubble bg */
--nova-white-alpha-06:     rgba(255, 255, 255, 0.06);   /* 8+ occurrences -- pill-subtle bg, border-bottom */
--nova-white-alpha-07:     rgba(255, 255, 255, 0.07);   /* 10+ occurrences -- border-bottom, hover bg */
--nova-white-alpha-08:     rgba(255, 255, 255, 0.08);   /* 15+ occurrences -- card border, divider */
--nova-white-alpha-10:     rgba(255, 255, 255, 0.10);   /* 15+ occurrences -- border, hover bg, icon-btn border */
--nova-white-alpha-12:     rgba(255, 255, 255, 0.12);   /* 10+ occurrences -- hover border, handle/drag */
--nova-white-alpha-14:     rgba(255, 255, 255, 0.14);   /* 5+ occurrences -- ghost-btn border, hover border */
--nova-white-alpha-15:     rgba(255, 255, 255, 0.15);   /* 2 occurrences -- nav-btn border */
--nova-white-alpha-18:     rgba(255, 255, 255, 0.18);   /* 2 occurrences -- hover border */
--nova-white-alpha-20:     rgba(255, 255, 255, 0.20);   /* 3 occurrences -- social-link hover bg, handle */
--nova-white-alpha-25:     rgba(255, 255, 255, 0.25);   /* 2 occurrences -- hover border */
--nova-white-alpha-35:     rgba(255, 255, 255, 0.35);   /* 3 occurrences -- handle bar */
```

### 1.2 Text Colors

```css
/* ── Text hierarchy ── */
--nova-text-primary:       #ffffff;                      /* 85 occ -- headings, strong labels */
--nova-text-secondary:     rgba(255, 255, 255, 0.85);   /* white-soft -- body text */
--nova-text-tertiary:      rgba(255, 255, 255, 0.65);   /* subheadings, secondary labels */
--nova-text-muted:         rgba(255, 255, 255, 0.55);   /* pill-subtle, placeholders */
--nova-text-hint:          rgba(255, 255, 255, 0.45);   /* label text, timestamps */
--nova-text-disabled:      rgba(255, 255, 255, 0.38);   /* disabled state, subtitles */
--nova-text-ghost:         rgba(255, 255, 255, 0.30);   /* placeholder, separator */
--nova-text-faint:         rgba(255, 255, 255, 0.20);   /* char counter default, faint text */
--nova-text-invisible:     rgba(255, 255, 255, 0.18);   /* empty state icons */

/* ── Onboarding text ── */
--nova-text-onboarding:    #e8e8f0;                     /* 3 occurrences -- onboarding wizard body text */
```

### 1.3 Primary (Purple) Scale

```css
/* ── Core primary ── */
--nova-primary:            #7c4dff;      /* 38+ occ in components, ~45 in styles.css -- buttons, active states, icons */
--nova-primary-light:      #a78bfa;      /* 36 occ -- secondary purple, macro dots, category badges */
--nova-primary-lighter:    #b39dff;      /* 5 occ -- social profile labels, feed labels, article-detail */
--nova-primary-mid:        #a07cff;      /* 2 occ -- top-bar search highlight */
--nova-primary-soft:       #9e7bff;      /* 2 occ -- gradient stop: groq-sidenav, openai */
--nova-primary-vivid:      #9c6bff;      /* 1 occ -- onboarding gradient stop */

/* ── Primary darker shades (gradient stops) ── */
--nova-primary-dark:       #5e35b1;      /* 4 occ -- gradient stop: blog, workouts, ai-analyzer, daily-data */
--nova-primary-deep:       #7c3aed;      /* 1 occ -- daily-panel macro gradient start */
--nova-primary-hover:      #6e3cff;      /* 1 occ -- scrollbar hover gradient */
--nova-primary-pressed:    #5c2fe0;      /* 1 occ -- scrollbar active gradient */

/* ── Primary alpha channels ── */
--nova-primary-rgb:        124, 77, 255; /* for rgba() composition -- already exists as --primary-rgb */
--nova-primary-alpha-06:   rgba(124, 77, 255, 0.06);    /* workout-set-row hover bg */
--nova-primary-alpha-08:   rgba(124, 77, 255, 0.08);    /* btn-add-ex hover, groq-sidenav hover, mat-menu ring */
--nova-primary-alpha-10:   rgba(124, 77, 255, 0.10);    /* streak-badge bg, ai-chat chip bg */
--nova-primary-alpha-12:   rgba(124, 77, 255, 0.12);    /* guided-empty icon bg, blog category active, macro-chip kcal */
--nova-primary-alpha-14:   rgba(124, 77, 255, 0.14);    /* card-hdr-icon bg, mh-icon-wrap bg, header active */
--nova-primary-alpha-15:   rgba(124, 77, 255, 0.15);    /* modal-icon-wrap bg */
--nova-primary-alpha-18:   rgba(124, 77, 255, 0.18);    /* pill bg, type-gym badge, nutrition type-pill */
--nova-primary-alpha-20:   rgba(124, 77, 255, 0.20);    /* user-page sb-toggle hover */
--nova-primary-alpha-22:   rgba(124, 77, 255, 0.22);    /* guided-empty icon border, groq chip border, ai-chat chip border */
--nova-primary-alpha-25:   rgba(124, 77, 255, 0.25);    /* streak-badge border, header hover border, blog category border */
--nova-primary-alpha-28:   rgba(124, 77, 255, 0.28);    /* card-hdr-icon border, mh-icon-wrap border, pill border */
--nova-primary-alpha-30:   rgba(124, 77, 255, 0.30);    /* type-gym border, blog category badge border */
--nova-primary-alpha-35:   rgba(124, 77, 255, 0.35);    /* primary-glow, btn-add-ex dashed, ai-chat send shadow */
--nova-primary-alpha-40:   rgba(124, 77, 255, 0.40);    /* focus ring, header active border, groq focus border */
--nova-primary-alpha-45:   rgba(124, 77, 255, 0.45);    /* ai-chat-fab shadow, share-sheet focus border */
--nova-primary-alpha-50:   rgba(124, 77, 255, 0.50);    /* header pressed border, scrollbar hover gradient stop */
--nova-primary-alpha-55:   rgba(124, 77, 255, 0.55);    /* streak-badge focus ring */
--nova-primary-alpha-60:   rgba(124, 77, 255, 0.60);    /* btn-add-ex hover border, scrollbar active gradient stop, ai-chat-fab hover shadow */
--nova-primary-alpha-75:   rgba(124, 77, 255, 0.75);    /* ai-chat-fab pulse peak shadow */
```

### 1.4 Accent (Pink) Scale

```css
/* ── Core accent ── */
--nova-accent:             rgb(255, 64, 129);    /* 23 occ -- like, danger, delete, accent actions */
--nova-accent-hex:         #ff4081;              /* hex alias for non-rgba contexts */

/* ── Accent alpha channels ── */
--nova-accent-alpha-01:    rgba(255, 64, 129, 0.01);    /* header logout bg */
--nova-accent-alpha-08:    rgba(255, 64, 129, 0.08);    /* header gradient stop */
--nova-accent-alpha-10:    rgba(255, 64, 129, 0.10);    /* btn-ghost danger hover, share-sheet delete bg, physical-stats icon bg */
--nova-accent-alpha-12:    rgba(255, 64, 129, 0.12);    /* lose-weight badge, icon-btn-round danger hover, macro-chip fats, workout-set-row delete bg */
--nova-accent-alpha-14:    rgba(255, 64, 129, 0.14);    /* header logout hover */
--nova-accent-alpha-15:    rgba(255, 64, 129, 0.15);    /* accent-bg, social-profile danger hover */
--nova-accent-alpha-18:    rgba(255, 64, 129, 0.18);    /* header logout border */
--nova-accent-alpha-20:    rgba(255, 64, 129, 0.20);    /* icon-btn-round danger border, macro-chip fats border */
--nova-accent-alpha-25:    rgba(255, 64, 129, 0.25);    /* btn-ghost danger border, share-sheet delete border, physical-stats icon border */
--nova-accent-alpha-40:    rgba(255, 64, 129, 0.40);    /* icon-btn-round danger hover border */
--nova-accent-alpha-50:    rgba(255, 64, 129, 0.50);    /* btn-ghost danger hover border */
--nova-accent-alpha-55:    rgba(255, 64, 129, 0.55);    /* mdc error outline */
--nova-accent-alpha-65:    rgba(255, 64, 129, 0.65);    /* icon-btn-round danger color */
--nova-accent-alpha-75:    rgba(255, 64, 129, 0.75);    /* btn-ghost danger text */
--nova-accent-alpha-85:    rgba(255, 64, 129, 0.85);    /* register button gradient stop */
```

### 1.5 Semantic Status Colors

```css
/* ── Success (green) ── */
--nova-success:            #4ade80;      /* 18 occ -- success feedback, gain-muscle goal, workout complete */
--nova-success-alt:        #4caf50;      /* 4 occ -- daily-panel check, calorie deficit, nova-1 score */
--nova-success-dark:       #65a30d;      /* 1 occ -- daily-panel macro gradient start */
--nova-success-mid:        #8bc34a;      /* 1 occ -- nova-2 score */
--nova-success-bg:         rgba(74, 222, 128, 0.10);    /* gain-muscle badge bg */
--nova-success-bg-12:      rgba(74, 222, 128, 0.12);    /* beginner badge, workout-set-row check bg */
--nova-success-bg-05:      rgba(74, 222, 128, 0.05);    /* workout-set-row completed bg */
--nova-success-border:     rgba(74, 222, 128, 0.25);    /* beginner badge border */
--nova-success-border-28:  rgba(74, 222, 128, 0.28);    /* gain goal border, workout-set-row check border */
--nova-success-border-30:  rgba(74, 222, 128, 0.30);    /* type-home badge border */

/* ── Info (blue) ── */
--nova-info:               #38bdf8;      /* 16 occ -- info, maintain goal, hydration, carbs macro */
--nova-info-alt:           #29b6f6;      /* 3 occ -- carbs macro dot (ai-analyzer, daily-panel) */
--nova-info-vibrant:       #22d3ee;      /* 3 occ -- daily-panel water icon, gradient stops */
--nova-info-dark:          #0ea5e9;      /* 1 occ -- daily-panel water gradient start */
--nova-info-deep:          #0284c7;      /* 1 occ -- daily-panel carbs macro gradient start */
--nova-info-material:      #2196f3;      /* 1 occ -- social-notifications comment icon fallback */
--nova-info-teal:          #00bcd4;      /* 1 occ -- social-profile blog icon color */
--nova-info-bg:            rgba(56, 189, 248, 0.10);    /* maintain badge, type-hybrid badge bg */
--nova-info-bg-12:         rgba(56, 189, 248, 0.12);    /* macro-chip carbs */
--nova-info-border-20:     rgba(56, 189, 248, 0.20);    /* macro-chip carbs border */
--nova-info-border-28:     rgba(56, 189, 248, 0.28);    /* maintain goal border */
--nova-info-border-30:     rgba(56, 189, 248, 0.30);    /* type-hybrid badge border */
--nova-info-teal-bg:       rgba(0, 188, 212, 0.12);     /* social-profile blog icon bg */

/* ── Warning (orange / amber) ── */
--nova-warning:            #ffb74d;      /* 7 occ -- fats macro, calorie icon, orange indicators */
--nova-warning-vivid:      #ff9800;      /* 5 occ -- calories, fire icon, surplus, nova-3 score */
--nova-warning-dark:       #d97706;      /* 1 occ -- daily-panel fats macro gradient start */
--nova-warning-bg:         rgba(255, 183, 77, 0.12);    /* existing --color-warning-bg */
--nova-warning-border:     rgba(255, 183, 77, 0.35);    /* streak-badge at-risk */
--nova-warning-glow:       rgba(255, 183, 77, 0.30);    /* streak-badge at-risk pulse */
--nova-warning-amber:      #fbbf24;      /* 1 occ -- intermediate badge text */
--nova-warning-amber-bg:   rgba(251, 191, 36, 0.12);    /* intermediate badge bg */
--nova-warning-amber-border: rgba(251, 191, 36, 0.25);  /* intermediate badge border */
--nova-warning-surplus-bg: rgba(255, 152, 0, 0.15);     /* calorie surplus badge bg */
--nova-warning-deficit-bg: rgba(76, 175, 80, 0.15);     /* calorie deficit badge bg */

/* ── Danger / Error (red) ── */
--nova-error:              #ef5350;      /* 1 occ -- daily-user-data error text */
--nova-error-alt:          #ff5252;      /* 2 occ -- groq-sidenav delete, top-bar clear */
--nova-error-deep:         #f44336;      /* 1 occ -- nova-4 score (worst) */
--nova-error-bg:           rgba(239, 83, 80, 0.12);     /* existing --color-error-bg */

/* ── Streak "at-risk" oranges ── */
--nova-streak-warm:        #ff9f40;      /* 2 occ -- streak flame color, streak count */
--nova-streak-hot:         #ff8c2a;      /* 1 occ -- streak flame hover/active */
--nova-streak-danger:      #ff6b50;      /* 2 occ -- at-risk streak, lost streak */
--nova-streak-risk-text:   #ff7043;      /* 1 occ -- at-risk strip text */
--nova-streak-risk-strong: #ff8c6b;      /* 1 occ -- at-risk strip strong text */
```

### 1.6 Gradient Tokens

```css
/* ── Brand gradients ── */
--nova-gradient-primary:          linear-gradient(135deg, var(--nova-primary), var(--nova-primary-dark));
    /* 4 occ -- blog CTA, workouts CTA, ai-analyzer CTA, daily-data CTA */

--nova-gradient-primary-soft:     linear-gradient(135deg, var(--nova-primary), var(--nova-primary-soft));
    /* 2 occ -- groq-sidenav header, openai chat header */

--nova-gradient-brand:            linear-gradient(135deg, var(--nova-primary), var(--nova-accent));
    /* 3 occ -- hero CTA, benefits-showcase CTA, active-workout finish */

--nova-gradient-brand-reverse:    linear-gradient(135deg, var(--nova-accent), var(--nova-primary));
    /* 2 occ -- benefits-showcase headline, CTA */

--nova-gradient-onboarding:       linear-gradient(135deg, var(--nova-primary) 0%, var(--nova-primary-vivid) 100%);
    /* 1 occ -- onboarding submit button */

--nova-gradient-login-btn:        linear-gradient(110deg, #fff 40%, rgba(124, 77, 255, 0.9) 100%);
    /* 1 occ -- login submit */

--nova-gradient-register-btn:     linear-gradient(110deg, #fff 40%, rgba(255, 64, 129, 0.85) 100%);
    /* 1 occ -- register submit */

/* ── Surface gradients ── */
--nova-gradient-page:             linear-gradient(180deg, var(--nova-surface-page) 0%, var(--nova-surface-base) 100%);
    /* 1 occ -- features-grid bg */

--nova-gradient-footer:           linear-gradient(135deg, var(--nova-surface-base) 0%, var(--nova-surface-footer) 100%);
    /* 1 occ -- footer bg */

--nova-gradient-fade:             linear-gradient(to bottom, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
    /* existing --background-fade */

/* ── Overlay gradients ── */
--nova-gradient-image-overlay:    linear-gradient(to top, rgba(13, 13, 16, 0.65) 0%, transparent 55%);
    /* 1 occ -- blog card image overlay */

/* ── Macro gradients (daily-panel) ── */
--nova-gradient-water-low:        linear-gradient(90deg, #0ea5e9, #38bdf8);
--nova-gradient-water-mid:        linear-gradient(90deg, #38bdf8, #22d3ee);
--nova-gradient-water-high:       linear-gradient(90deg, #65a30d, #4ade80);
--nova-gradient-water-over:       linear-gradient(90deg, #4ade80, #22d3ee);
--nova-gradient-macro-protein:    linear-gradient(90deg, #7c3aed, #a78bfa);
--nova-gradient-macro-carbs:      linear-gradient(90deg, #0284c7, #29b6f6);
--nova-gradient-macro-fats:       linear-gradient(90deg, #d97706, #ffb74d);
```

### 1.7 Shadow / Elevation Tokens

```css
/* ── Shadow base color ── */
--nova-shadow-color:       rgba(0, 0, 0, 0.4);   /* universal shadow base */

/* ── Elevation levels ── */
--nova-shadow-card:        0 2px 12px rgba(0, 0, 0, 0.4);
--nova-shadow-card-hover:  0 4px 16px var(--nova-primary-alpha-28);
--nova-shadow-dropdown:    0 12px 32px rgba(0, 0, 0, 0.6);
--nova-shadow-menu:        0 16px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--nova-primary-alpha-08);
--nova-shadow-modal:       0 32px 80px rgba(0, 0, 0, 0.8);
--nova-shadow-modal-confirm: 0 16px 48px rgba(0, 0, 0, 0.7);
--nova-shadow-sheet:       0 -8px 48px rgba(0, 0, 0, 0.7);
--nova-shadow-ai-analyzer: 0 24px 64px rgba(0, 0, 0, 0.75);
--nova-shadow-nav:         -16px 0 48px rgba(0, 0, 0, 0.55);
--nova-shadow-footer:      0 -4px 20px rgba(0, 0, 0, 0.4);

/* ── Glow shadows ── */
--nova-shadow-primary-glow: 0 6px 20px var(--nova-primary-alpha-35);
--nova-shadow-primary-btn:  0 4px 16px var(--nova-primary-alpha-28);
--nova-shadow-fab-rest:     0 4px 20px var(--nova-primary-alpha-45), 0 2px 8px rgba(0, 0, 0, 0.4);
--nova-shadow-fab-hover:    0 6px 28px var(--nova-primary-alpha-60), 0 2px 8px rgba(0, 0, 0, 0.4);
--nova-shadow-send-btn:     0 2px 12px var(--nova-primary-alpha-35);
--nova-shadow-send-btn-hover: 0 2px 12px var(--nova-primary-alpha-40);

/* ── Focus rings ── */
--nova-focus-ring:          0 0 0 2px var(--nova-primary-alpha-40);
--nova-focus-ring-accent:   0 0 0 2px var(--nova-accent-alpha-40);
```

### 1.8 Overlay / Backdrop Tokens

```css
--nova-overlay-light:      rgba(0, 0, 0, 0.60);   /* loader-overlay, modal-bg */
--nova-overlay-medium:     rgba(0, 0, 0, 0.65);   /* modal-bg */
--nova-overlay-heavy:      rgba(0, 0, 0, 0.82);   /* large overlay */
--nova-overlay-backdrop-sm: blur(4px);              /* loader overlay */
--nova-overlay-backdrop-md: blur(8px);              /* modal-bg */
--nova-overlay-backdrop-lg: blur(16px);             /* large overlay */
--nova-overlay-backdrop-xl: blur(20px);             /* ai-chat bottom sheet */
```

### 1.9 NOVA Score Colors (AI Meal Analyzer)

```css
--nova-score-1:            #4caf50;      /* NOVA 1 -- unprocessed */
--nova-score-2:            #8bc34a;      /* NOVA 2 -- processed culinary */
--nova-score-3:            #ff9800;      /* NOVA 3 -- processed */
--nova-score-4:            #f44336;      /* NOVA 4 -- ultra-processed */
```

### 1.10 Macro Dot Colors (Charts / Nutrition)

```css
--nova-macro-protein:      #a78bfa;      /* == --nova-primary-light */
--nova-macro-carbs:        #29b6f6;      /* == --nova-info-alt */
--nova-macro-fats:         #ffb74d;      /* == --nova-warning */
--nova-macro-other:        #ff4081;      /* == --nova-accent */
```

---

## 2. Spacing Scale

Strict 8px grid. Only these values are allowed. No arbitrary pixel values.

```css
--nova-space-1:     4px;     /* micro -- icon padding, badge gap, internal micro */
--nova-space-2:     8px;     /* tight -- inline spacing, grid gap tight */
--nova-space-3:     12px;    /* compact -- grid gap, small section spacing */
--nova-space-4:     16px;    /* base -- card padding min, modal gap, section padding */
--nova-space-5:     20px;    /* cozy -- modal padding, section bottom padding */
--nova-space-6:     24px;    /* comfortable -- modal padding, section gap */
--nova-space-7:     28px;    /* roomy -- card body bottom padding, guided-empty CTA margin */
--nova-space-8:     32px;    /* loose -- between sections, guided-empty top padding */
--nova-space-10:    40px;    /* wide -- empty state padding, large section */
--nova-space-12:    48px;    /* touch -- touch target minimum, hero padding */
--nova-space-16:    64px;    /* jumbo -- large section spacing, page margins */
```

### Semantic Spacing Aliases

```css
--nova-space-card-x:       22px;   /* horizontal card padding (exception: 22px is non-grid but established pattern -- 20px or 24px allowed on new components) */
--nova-space-card-y-top:   18px;   /* card header top padding (exception: transitional -- migrate to 16px) */
--nova-space-card-y-bottom: 22px;  /* card body bottom padding (exception: transitional -- migrate to 24px) */
--nova-space-card-header-bottom: 14px;   /* card header bottom gap (exception: transitional -- migrate to 16px) */
```

> **Migration note:** The current codebase uses `18px`, `22px`, `14px` pervasively for card padding. These are NOT on the 8px grid. New components MUST use `16px`, `24px`, or `20px`. Existing components migrate in Sprint 1.

### Off-Grid Values Found (must migrate)

| Value | Occurrences | Migration Target |
|-------|-------------|------------------|
| `3px` (pill padding-y) | 8+ | `4px` (--nova-space-1) |
| `6px` (field-group gap) | 10+ | `8px` (--nova-space-2) |
| `7px` (btn gap) | 2 | `8px` (--nova-space-2) |
| `9px` (btn-ghost padding-y) | 3 | `8px` (--nova-space-2) |
| `10px` (btn-primary padding-y, input padding) | 15+ | `8px` or `12px` |
| `14px` (card-hdr gap, card-hdr padding-bottom) | 20+ | `16px` (--nova-space-4) |
| `18px` (card-hdr padding-top, card-body padding) | 20+ | `16px` or `20px` |
| `22px` (card padding-x) | 20+ | `20px` or `24px` |
| `36px` (section-header margin-bottom) | 3 | `32px` (--nova-space-8) |

---

## 3. Border-Radius Scale

```css
--nova-radius-xs:      4px;     /* micro corners -- chip close, inner elements */
--nova-radius-sm:      8px;     /* small -- icon-btn-round, legal-link, progress bar, tags */
--nova-radius-md:      12px;    /* medium -- buttons, inputs, dropdowns, btn-add-ex, cards(inner) */
--nova-radius-lg:      16px;    /* large -- guided-empty icon, chat bubbles */
--nova-radius-xl:      20px;    /* extra-large -- cards, modals, loader-overlay */
--nova-radius-2xl:     24px;    /* dialog -- modal-box, bottom sheets, dialog containers */
--nova-radius-pill:    999px;   /* pill -- badges, tags, avatar indicator, scrollbar */
--nova-radius-circle:  50%;     /* circle -- avatars */
```

### Current Border-Radius Values Found

| Value | Token | Occurrences |
|-------|-------|-------------|
| `4px` | `--nova-radius-xs` | 5+ |
| `6px` | migrate to `--nova-radius-sm` (8px) | 3 |
| `8px` | `--nova-radius-sm` | 15+ |
| `9px` | migrate to `--nova-radius-sm` (8px) | 3 |
| `10px` | migrate to `--nova-radius-md` (12px) | 20+ |
| `12px` | `--nova-radius-md` | 25+ |
| `14px` | migrate to `--nova-radius-lg` (16px) | 10+ |
| `16px` | `--nova-radius-lg` | 5+ |
| `18px` | migrate to `--nova-radius-lg` (16px) | 3 |
| `20px` | `--nova-radius-xl` | 15+ |
| `24px` | `--nova-radius-2xl` | 10+ |
| `999px` | `--nova-radius-pill` | 10+ |
| `50%` | `--nova-radius-circle` | 10+ |

---

## 4. Motion Tokens

```css
/* ── Durations ── */
--nova-duration-instant:   100ms;   /* tooltip show/hide */
--nova-duration-micro:     150ms;   /* hover, tap feedback, icon color change */
--nova-duration-fast:      180ms;   /* ghost-btn transitions, quick state changes */
--nova-duration-standard:  200ms;   /* card hover, state change, border-color */
--nova-duration-moderate:  250ms;   /* skeleton-to-content, data load */
--nova-duration-slow:      300ms;   /* complex state changes, multi-property */
--nova-duration-entrance:  350ms;   /* page/card entrance (slideUp) */
--nova-duration-dramatic:  450ms;   /* slideUp with stagger */
--nova-duration-celebrate: 600ms;   /* streak celebrate, PR, completion */

/* ── Easings ── */
--nova-ease-default:       ease;              /* general purpose */
--nova-ease-out:           ease-out;          /* entrances, reveals */
--nova-ease-in-out:        ease-in-out;       /* symmetric transitions */
--nova-ease-spring:        cubic-bezier(0.34, 1.56, 0.64, 1);  /* celebration bounce */

/* ── Composed transitions (common patterns) ── */
--nova-transition-hover:       all var(--nova-duration-micro) var(--nova-ease-default);
--nova-transition-state:       all var(--nova-duration-standard) var(--nova-ease-out);
--nova-transition-ghost-btn:   background var(--nova-duration-fast), color var(--nova-duration-fast), border-color var(--nova-duration-fast);
--nova-transition-card:        border-color var(--nova-duration-standard), transform var(--nova-duration-standard), box-shadow var(--nova-duration-standard);
```

### Current Transition Durations Found

| Duration | Token | Occurrences |
|----------|-------|-------------|
| `0.15s` / `150ms` | `--nova-duration-micro` | 30+ |
| `0.18s` / `180ms` | `--nova-duration-fast` | 15+ |
| `0.2s` / `200ms` | `--nova-duration-standard` | 40+ |
| `0.22s` / `220ms` | migrate to `--nova-duration-moderate` | 3 |
| `0.25s` / `250ms` | `--nova-duration-moderate` | 5+ |
| `0.3s` / `300ms` | `--nova-duration-slow` | 10+ |
| `0.35s` / `350ms` | `--nova-duration-entrance` | 8+ |
| `0.45s` / `450ms` | `--nova-duration-dramatic` | 3 |

---

## 5. Typography Tokens

```css
/* ── Font family ── */
--nova-font-family:        "Poppins", sans-serif;

/* ── Font sizes ── */
--nova-text-xs:            10px;    /* label/badge micro */
--nova-text-sm:            11px;    /* label, pill, badge, uppercase section heads */
--nova-text-body-sm:       12px;    /* caption, card-subtitle, timestamps */
--nova-text-body:          13px;    /* btn-ghost, menu items, search input */
--nova-text-body-md:       14px;    /* body text, btn-primary, input fields */
--nova-text-body-lg:       15px;    /* row titles, empty state text */
--nova-text-subtitle:      16px;    /* modal-title, av-name, macro currency */
--nova-text-card-title:    17px;    /* card-title */
--nova-text-heading-sm:    19px;    /* mh-title (modal heading) */
--nova-text-heading:       20px;    /* card heading, guided-empty headline */
--nova-text-heading-lg:    22px;    /* section-title */
--nova-text-page-title:    26px;    /* social-profile name */
--nova-text-page-heading:  28px;    /* page heading, footer brand */
--nova-text-display:       32px;    /* large headings */
--nova-text-hero:          clamp(36px, 4.5vw, 64px);  /* hero title */

/* ── Font weights ── */
--nova-weight-regular:     400;     /* body text */
--nova-weight-medium:      500;     /* secondary body, labels */
--nova-weight-semibold:    600;     /* section title, row title */
--nova-weight-bold:        700;     /* buttons, pill, brand, strong text */
--nova-weight-extrabold:   800;     /* headings, card-title, section-title */
--nova-weight-black:       900;     /* hero title (Note: Poppins 900 used in import) */

/* ── Letter spacing ── */
--nova-tracking-tight:     -1.5px;  /* hero title */
--nova-tracking-snug:      -0.5px;  /* section-title */
--nova-tracking-normal:    0;
--nova-tracking-wide:      0.02em;  /* btn-primary */
--nova-tracking-wider:     0.05em;  /* label/badge */
--nova-tracking-widest:    0.09em;  /* sec-head uppercase */
--nova-tracking-loose:     0.10em;  /* social-profile section label */

/* ── Line height ── */
--nova-leading-tight:      1.1;     /* headings */
--nova-leading-snug:       1.2;     /* card-title, guided-empty headline */
--nova-leading-normal:     1.5;     /* body text, descriptions */
--nova-leading-relaxed:    1.6;     /* article body, long-form text */
```

### Current Font Sizes Found in Components

| Size | Token | Occurrences |
|------|-------|-------------|
| `10px` | `--nova-text-xs` | 5+ |
| `11px` | `--nova-text-sm` | 15+ |
| `12px` | `--nova-text-body-sm` | 25+ |
| `13px` | `--nova-text-body` | 20+ |
| `14px` | `--nova-text-body-md` | 30+ |
| `15px` | `--nova-text-body-lg` | 10+ |
| `16px` | `--nova-text-subtitle` | 15+ |
| `17px` | `--nova-text-card-title` | 5+ |
| `18px` | _icon sizes only, not text_ | -- |
| `19px` | `--nova-text-heading-sm` | 2 |
| `20px` | `--nova-text-heading` | 10+ |
| `22px` | `--nova-text-heading-lg` | 8+ |
| `26px` | `--nova-text-page-title` | 2 |
| `28px` | `--nova-text-page-heading` | 5+ |
| `48px` | _icon size (groq empty)_ | 1 |

---

## 6. Glass Surface Tokens

```css
/* ── Glass card (standard content card) ── */
--nova-glass-card-bg:         var(--nova-white-alpha-025);
--nova-glass-card-border:     1px solid var(--nova-white-alpha-08);
--nova-glass-card-radius:     var(--nova-radius-xl);
--nova-glass-card-hover-border: var(--nova-white-alpha-12);

/* ── Glass section (inner section within a card) ── */
--nova-glass-section-bg:      var(--nova-white-alpha-03);
--nova-glass-section-border:  1px solid var(--nova-white-alpha-07);
--nova-glass-section-radius:  var(--nova-radius-lg);

/* ── Glass input (search bars, text areas) ── */
--nova-glass-input-bg:        var(--nova-white-alpha-04);
--nova-glass-input-border:    1px solid var(--nova-white-alpha-08);
--nova-glass-input-focus:     var(--nova-primary-alpha-40);
--nova-glass-input-radius:    var(--nova-radius-md);

/* ── Glass overlay (modals, sheets -- true glassmorphism) ── */
--nova-glass-overlay-bg:      rgba(13, 13, 16, 0.97);
--nova-glass-overlay-border:  1px solid var(--nova-white-alpha-10);
--nova-glass-overlay-backdrop: var(--nova-overlay-backdrop-xl);

/* ── Glass divider ── */
--nova-glass-divider:         1px solid var(--nova-white-alpha-06);
--nova-glass-divider-strong:  1px solid var(--nova-white-alpha-08);
```

---

## 7. Icon Size Tokens

```css
--nova-icon-xs:       12px;    /* pill icons */
--nova-icon-sm:       13px;    /* icon-btn-round.small */
--nova-icon-md:       16px;    /* btn-ghost icons, icon-btn-round */
--nova-icon-default:  18px;    /* btn-primary icons, modal-icon-wrap, sec-head */
--nova-icon-lg:       22px;    /* card-hdr-icon, mh-icon-wrap */
--nova-icon-xl:       28px;    /* guided-empty-icon */
--nova-icon-2xl:      40px;    /* empty-state icon */
--nova-icon-hero:     48px;    /* groq empty state */
```

---

## 8. Z-Index Scale

```css
--nova-z-base:       0;
--nova-z-dropdown:   100;      /* loader-overlay */
--nova-z-sticky:     200;      /* sticky headers */
--nova-z-overlay:    900;      /* large overlay */
--nova-z-modal:      901;      /* modal on top of overlay */
--nova-z-sheet:      1000;     /* modal-bg, bottom sheets */
--nova-z-toast:      1100;     /* toast notifications */
```

---

## 9. Breakpoint Tokens

These are for documentation reference only -- CSS custom properties cannot be used in `@media` queries. Use these values consistently.

```
NOVA_BREAKPOINT_MOBILE:      480px
NOVA_BREAKPOINT_MODAL_SHEET: 640px
NOVA_BREAKPOINT_TABLET:      768px
NOVA_BREAKPOINT_SIDEBAR:     968px
NOVA_BREAKPOINT_DESKTOP:     1200px
```

---

## 10. Token-to-Legacy Mapping

For backward compatibility during migration, maintain aliases:

```css
:root {
  /* Legacy aliases -- DEPRECATED, do not use in new code */
  --primary:            var(--nova-primary);
  --primary-rgb:        var(--nova-primary-rgb);
  --primary-light:      var(--nova-primary-light);
  --primary-glow:       var(--nova-primary-alpha-35);
  --surface:            var(--nova-surface-base);
  --white:              var(--nova-text-primary);
  --white-soft:         var(--nova-text-secondary);
  --white-fade:         var(--nova-white-alpha-08);
  --accent:             var(--nova-accent);
  --accent-background:  var(--nova-accent-alpha-15);
  --color-success:      var(--nova-success);
  --color-success-bg:   var(--nova-success-bg-12);
  --color-info:         var(--nova-info);
  --color-info-bg:      var(--nova-info-bg-12);
  --color-warning:      var(--nova-warning);
  --color-warning-bg:   var(--nova-warning-bg);
  --color-error:        var(--nova-error);
  --color-error-bg:     var(--nova-error-bg);
  --background-fade:    var(--nova-gradient-fade);

  /* New token: surface-elevated used by post-card */
  --surface-elevated:   var(--nova-surface-elevated);
  /* New token: color-error alias used by post-card */
  --color-error:        var(--nova-error);
}
```

---

## 11. Implementation Instructions for @angular-developer

### Sprint 0 Scope

**Goal:** Define all tokens in `styles.css :root` without breaking any existing component. Zero visual regression.

### Step-by-step

1. **Add all `--nova-*` tokens to `:root` in `fit-app/src/styles.css`**
   - Place them ABOVE the existing legacy vars.
   - Group by section (surface, text, primary, accent, semantic, gradient, shadow, glass, motion, typography, icon, z-index).
   - Add a clear comment header for each section.

2. **Rewrite legacy vars as aliases**
   - Change `--primary: #7c4dff` to `--primary: var(--nova-primary)`.
   - Do this for ALL existing `:root` vars listed in Section 10.
   - This ensures existing `var(--primary)` references continue working.

3. **Migrate `styles.css` internal hardcoded values**
   - The 45 hardcoded hex values inside `styles.css` itself should be replaced with `var(--nova-*)` references.
   - Example: `.btn-primary { background: #7c4dff }` becomes `.btn-primary { background: var(--nova-primary) }`.
   - Example: `.card-title { color: #fff }` becomes `.card-title { color: var(--nova-text-primary) }`.

4. **Do NOT touch component CSS files in Sprint 0**
   - Component migration happens in Sprint 1, file by file.
   - Sprint 0 is ONLY about establishing the token dictionary and migrating `styles.css`.

5. **Verify zero regression**
   - `ng serve` and visually confirm: landing page, dashboard, social feed, profile, workouts, nutrition, AI chat, onboarding.
   - No color, spacing, or animation should change.

### Sprint 1 Plan (component migration)

Priority order based on violation count:

| Priority | Component | Violations | Files |
|----------|-----------|------------|-------|
| P0 | daily-user-data | 40+ | 1 |
| P0 | header | 25+ | 1 |
| P0 | onboarding-wizard | 25+ | 1 |
| P1 | workouts-content | 20+ | 1 |
| P1 | blog-content | 20+ | 1 |
| P1 | social-daily-panel | 20+ | 1 |
| P1 | social-profile | 15+ | 1 |
| P1 | user-page | 15+ | 1 |
| P2 | nutrition-tab | 12+ | 1 |
| P2 | workouts-tab | 12+ | 1 |
| P2 | calorie-balance-card | 8+ | 1 |
| P2 | previous-daily-user-data | 10+ | 1 |
| P2 | ai-meal-analyzer | 10+ | 1 |
| P2 | groq (AI chat) | 8+ | 1 |
| P3 | All remaining (~25 files) | 1-6 each | 25 |

### Linting Rule (Sprint 2+)

After migration, add a stylelint rule to prevent hardcoded colors:

```json
{
  "rules": {
    "color-no-hex": true,
    "color-named": "never",
    "declaration-property-value-disallowed-list": {
      "/color|background|border|box-shadow|text-shadow/": ["/^#/", "/^rgb/"]
    }
  }
}
```

### File Organization

```
styles.css
  |-- Section: NOVA DESIGN TOKENS
  |     |-- 1. Color: Surface
  |     |-- 2. Color: Text
  |     |-- 3. Color: Primary
  |     |-- 4. Color: Accent
  |     |-- 5. Color: Semantic
  |     |-- 6. Color: Gradients
  |     |-- 7. Shadow / Elevation
  |     |-- 8. Glass Surface
  |     |-- 9. Overlay / Backdrop
  |     |-- 10. Spacing
  |     |-- 11. Border Radius
  |     |-- 12. Motion
  |     |-- 13. Typography
  |     |-- 14. Icon Sizes
  |     |-- 15. Z-Index
  |     |-- 16. NOVA Score / Macro
  |-- Section: LEGACY ALIASES (deprecated)
  |-- Section: EXISTING STYLES (unchanged)
```

---

## References

- **Material 3 Design Tokens:** Token naming follows M3's flat namespace pattern (category-variant-state). Ref: https://m3.material.io/foundations/design-tokens
- **Radix Colors:** Alpha channel approach for dark theme surfaces inspired by Radix's alpha scale. Ref: https://www.radix-ui.com/colors
- **Apple HIG Motion:** Duration tiers (micro/standard/dramatic/celebration) follow Apple's guidance on animation timing. Ref: https://developer.apple.com/design/human-interface-guidelines/motion
