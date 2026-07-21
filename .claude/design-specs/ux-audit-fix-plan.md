# UX Audit Fix Plan — Execuție

**Bazat pe:** `ux-audit-2026-06-25.md`  
**Strategie:** 3 prompts în ordine (P1 trebuie terminat înainte de P2+P3)

---

## Ordinea de execuție

```
P1 (Foundation — styles.css)
    ↓
P2 (HTML fixes) ←── paralel ──→ P3 (CSS component fixes)
    ↓
P4 (Token sweep — înlocuiește hardcoded rgba în toate componentele)
```

---

## PROMPT 1 — Foundation: Token System în styles.css

> **Agent:** `@angular-developer`  
> **Durată estimată:** ~10 min  
> **Fișiere afectate:** `fit-app/src/styles.css` only

```
Ești @angular-developer pe proiectul FitApp (Angular 19, dark glassmorphism theme).

Sarcina: aplică toate modificările de mai jos în fișierul:
  fit-app/fit-app/src/styles.css

MODIFICARE 1 — Adaugă blocul de tokeni noi imediat după linia `:root {` existentă (după `--nav-create-gradient`), ÎNAINTE de comentariul z-index stack.

Adaugă exact:

  /* ── Text hierarchy tokens ── */
  --text-primary:    rgba(255, 255, 255, 1.00);
  --text-secondary:  rgba(255, 255, 255, 0.70);
  --text-tertiary:   rgba(255, 255, 255, 0.50);
  --text-muted:      rgba(255, 255, 255, 0.35);
  --text-disabled:   rgba(255, 255, 255, 0.22);

  /* ── Surface elevation ── */
  --surface-raised:   #111116;
  --surface-elevated: #1a1a22;
  --surface-overlay:  #20202a;

  /* ── Border scale ── */
  --border-subtle:  rgba(255, 255, 255, 0.04);
  --border-default: rgba(255, 255, 255, 0.08);
  --border-strong:  rgba(255, 255, 255, 0.14);
  --border-focus:   var(--primary);

  /* ── Destructive (separat de --accent) ── */
  --color-destructive:    #ef5350;
  --color-destructive-bg: rgba(239, 83, 80, 0.10);

  /* ── Border radius scale ── */
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   24px;
  --radius-full: 9999px;

  /* ── Avatar sizes ── */
  --avatar-sm: 32px;
  --avatar-md: 40px;
  --avatar-lg: 88px;
  --avatar-xl: 108px;

MODIFICARE 2 — Redimensionează scrollbar-ul de la 14px la 6px.
Găsește: `::-webkit-scrollbar { width: 14px; height: 12px; }`
Înlocuiește cu: `::-webkit-scrollbar { width: 6px; height: 6px; }`

MODIFICARE 3 — Șterge clasa orfană .navbar (nu mai e folosită).
Găsește și șterge complet blocul:
  .navbar {
    height: 12vh;
  }

MODIFICARE 4 — Actualizează variabilele --color-error existente pentru a reflecta că destructive e acum separat:
Găsește: `--color-error: #ef5350;`
Înlocuiește cu: `--color-error: var(--color-destructive);`  (pentru backward compat)

Nu modifica NIMIC altceva. Nu adăuga comentarii extra. Nu reformata codul existent.
```

---

## PROMPT 2 — HTML Fixes (după P1)

> **Agent:** `@angular-developer`  
> **Durată estimată:** ~15 min  
> **Fișiere afectate:** 5 fișiere HTML

```
Ești @angular-developer pe proiectul FitApp (Angular 19).

Aplică EXACT modificările de mai jos. Nu adăuga features extra. Nu refactoriza cod neatins.

─── FIX 1: login.component.html — dezactivează link mort "Forgot password?" ───
Fișier: fit-app/fit-app/src/app/features/auth/login/login.component.html
Găsește: <a href="#" class="link-muted">Forgot password?</a>
Înlocuiește cu:
  <span class="link-muted link-muted--disabled" aria-disabled="true" title="Disponibil în curând">Forgot password?</span>

Adaugă în login.component.css:
  .link-muted--disabled { cursor: not-allowed; opacity: 0.4; pointer-events: none; }

─── FIX 2: login.component.html — dezactivează butoanele OAuth nefuncționale ───
Același fișier. Găsește cele 2 butoane din .social-row:
  <button type="button" class="social-btn" aria-label="Continue with Google">
  <button type="button" class="social-btn" aria-label="Continue with Apple">

Adaugă `disabled title="Disponibil în curând"` la ambele:
  <button type="button" class="social-btn" disabled title="Disponibil în curând" aria-label="Continue with Google">
  <button type="button" class="social-btn" disabled title="Disponibil în curând" aria-label="Continue with Apple">

Adaugă în login.component.css:
  .social-btn:disabled { opacity: 0.35; cursor: not-allowed; }

─── FIX 3: register.component.html — același tratament pentru OAuth (dacă există) ───
Fișier: fit-app/fit-app/src/app/features/auth/register/register.component.html
Aplică același FIX 2 pentru orice butoane de social login găsite.

─── FIX 4: hero-slider.component.html — migrează la Angular 17+ syntax ───
Fișier: fit-app/fit-app/src/app/features/home/hero-slider/hero-slider.component.html

Înlocuiește TOATE aparițiile de:
  *ngFor="let X of Y; let i = index"  →  @for (X of Y; track i) { ... }
  *ngFor="let X of Y"                 →  @for (X of Y; track $index) { ... }
  *ngIf="condiție"                    →  @if (condiție) { ... }
  *ngIf="!condiție"                   →  @if (!condiție) { ... }

Păstrează exact aceeași structură HTML, doar sintaxa directivelor se schimbă.
Verifică că nu mai există nicio directivă structurală cu * prefix în fișier după modificare.

─── FIX 5: social-profile.component.html — elimină inline styles ───
Fișier: fit-app/fit-app/src/app/features/social/social-profile/social-profile.component.html

Găsește:
  <span style="font-size: 11px; opacity: 0.5;">{{ workout.type }} · {{ workout.durationMin }} min</span>
Înlocuiește cu:
  <span class="workout-meta">{{ workout.type }} · {{ workout.durationMin }} min</span>

Găsește:
  <div class="archived-section-header" style="margin-top: 16px;">
Înlocuiește cu:
  <div class="archived-section-header archived-section-header--spaced">

Adaugă în social-profile.component.css:
  .workout-meta { font-size: 11px; opacity: 0.5; }
  .archived-section-header--spaced { margin-top: 16px; }

─── FIX 6: social-profile.component.html + css — bio show more ───
Fișier: fit-app/fit-app/src/app/features/social/social-profile/social-profile.component.html

Găsește blocul de bio:
  @if (facade.currentProfile()!.bio) {
    <p class="profile-bio">{{ facade.currentProfile()!.bio }}</p>
  }

Înlocuiește cu:
  @if (facade.currentProfile()!.bio) {
    <p class="profile-bio" [class.profile-bio--expanded]="bioExpanded()">
      {{ facade.currentProfile()!.bio }}
    </p>
    @if (facade.currentProfile()!.bio.length > 100) {
      <button class="profile-bio-toggle" (click)="bioExpanded.set(!bioExpanded())" type="button">
        {{ bioExpanded() ? 'Show less' : 'Show more' }}
      </button>
    }
  }

În social-profile.component.ts adaugă signal în clasa componentului:
  bioExpanded = signal(false);

În social-profile.component.css modifică:
  .profile-bio {
    -webkit-line-clamp: 2;
    /* restul rămâne */
  }
  .profile-bio--expanded {
    -webkit-line-clamp: unset;
    overflow: visible;
    display: block;
  }
  .profile-bio-toggle {
    background: none;
    border: none;
    color: var(--primary);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    padding: 2px 0;
    font-family: inherit;
    transition: opacity 0.15s;
  }
  .profile-bio-toggle:hover { opacity: 0.75; }
```

---

## PROMPT 3 — CSS Component Fixes (după P1, paralel cu P2)

> **Agent:** `@angular-developer`  
> **Durată estimată:** ~15 min  
> **Fișiere afectate:** 5 fișiere CSS

```
Ești @angular-developer pe proiectul FitApp (Angular 19).

Aplică EXACT modificările de mai jos. Nu adăuga features extra.

─── FIX 1: login.component.css — prefers-reduced-motion pentru orbs ───
Fișier: fit-app/fit-app/src/app/features/auth/login/login.component.css

Adaugă la FINALUL fișierului (după @keyframes orbFloat2):
  @media (prefers-reduced-motion: reduce) {
    .orb { animation: none; }
    .brand-logo { animation: none; box-shadow: 0 0 24px var(--primary-glow); }
  }

─── FIX 2: app-bottom-nav.component.css — focus-visible pe tab-uri ───
Fișier: fit-app/fit-app/src/app/shared/components/bottom-nav/app-bottom-nav.component.css

Adaugă după regula .app-bottomnav-tab:active:
  .app-bottomnav-tab:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: -2px;
    border-radius: 8px;
  }

─── FIX 3: post-card.component.html + css — aspect ratio conflict ───
Fișier: fit-app/fit-app/src/app/features/social/components/post-card/post-card.component.html

Găsește exact:
  <div class="post-card-image-wrap" style="aspect-ratio: 4/3; width: 100%; overflow: hidden">
Înlocuiește cu:
  <div class="post-card-image-wrap">

(elimini inline style; CSS-ul componentului cu aspect-ratio: 3/4 va prelua controlul)

─── FIX 4: post-card.component.css — z-index dropdown menu ───
Fișier: fit-app/fit-app/src/app/features/social/components/post-card/post-card.component.css

Găsește în .post-card-menu:
  z-index: 100;
Înlocuiește cu:
  z-index: 200;

─── FIX 5: social-feed.component.css — skeleton care reflectă structura reală ───
Fișier: fit-app/fit-app/src/app/features/social/feed/social-feed.component.css

Găsește și înlocuiește complet blocul:
  .feed-skeleton-card {
    background: rgba(255, 255, 255, 0.04);
    border-radius: 16px;
    height: 200px;
    animation: pulse 1.5s ease-in-out infinite;
  }

Cu:
  .feed-skeleton-card {
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding: 0;
    animation: pulse 1.5s ease-in-out infinite;
  }
  .feed-skeleton-card::before {
    content: '';
    display: block;
    height: 52px;
    margin: 12px 16px 8px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 8px;
  }
  .feed-skeleton-card::after {
    content: '';
    display: block;
    height: 180px;
    margin: 0 0 8px;
    background: rgba(255, 255, 255, 0.04);
  }

─── FIX 6: post-card.component.css — înlocuiește --surface-elevated fallback ───
Fișier: fit-app/fit-app/src/app/features/social/components/post-card/post-card.component.css

Găsește în .post-card-menu:
  background: var(--surface-elevated, #1a1a24);
Înlocuiește cu:
  background: var(--surface-elevated);
(acum variabila există în styles.css după P1)
```

---

## PROMPT 4 — Token Sweep (după P1, P2, P3)

> **Agent:** `@angular-developer`  
> **Durată estimată:** ~25 min  
> **Fișiere afectate:** toate CSS-urile din features/ și shared/  
> **ATENȚIE:** Rulează DUPĂ ce P1 a adăugat tokenii în styles.css

```
Ești @angular-developer pe proiectul FitApp (Angular 19).

Sarcina: înlocuiește valorile hardcoded de text opacity cu tokenele din styles.css.
Tokenii disponibili (adăugați în P1):
  --text-primary:   rgba(255,255,255,1.00)
  --text-secondary: rgba(255,255,255,0.70)
  --text-tertiary:  rgba(255,255,255,0.50)
  --text-muted:     rgba(255,255,255,0.35)
  --text-disabled:  rgba(255,255,255,0.22)

REGULA DE MAPARE (folosește cea mai apropiată valoare):
  Orice rgba(255,255,255,X) unde:
    X >= 0.85  → var(--text-primary)   [sau rămâne --white-soft dacă deja există]
    0.60-0.84  → var(--text-secondary)
    0.40-0.59  → var(--text-tertiary)
    0.25-0.39  → var(--text-muted)
    X <= 0.24  → var(--text-disabled)

FIȘIERE DE PARCURS — înlocuiește în fiecare:
1. fit-app/fit-app/src/app/features/dashboard/dashboard/dashboard.component.css
2. fit-app/fit-app/src/app/features/auth/login/login.component.css
3. fit-app/fit-app/src/app/features/auth/register/register.component.css
4. fit-app/fit-app/src/app/features/social/components/post-card/post-card.component.css
5. fit-app/fit-app/src/app/features/social/feed/social-feed.component.css
6. fit-app/fit-app/src/app/features/social/social-profile/social-profile.component.css
7. fit-app/fit-app/src/app/shared/components/bottom-nav/app-bottom-nav.component.css
8. fit-app/fit-app/src/app/shared/components/top-bar/app-top-bar.component.css

NU înlocui:
- Valorile din .brand-panel-bg (radial-gradient backgrounds) — sunt decorative, nu text
- Culori de border (rgba cu scopul de border/separator)
- Culori de background (card backgrounds, overlay backgrounds)
- Variabilele deja existente (--white-soft, --primary, --accent etc.)

ÎNLOCUIEȘTE DOAR: proprietățile `color:` și `fill:` cu rgba(255,255,255,X).

Raportează la final: câte înlocuiri ai făcut per fișier.
```

---

## Cum rulezi totul dintr-o comandă

Workflow recomandat în terminal Claude Code:

```
# Pasul 1 — Foundation (obligatoriu primul)
@angular-developer [PROMPT 1 de mai sus]

# Pasul 2 — Paralel după ce P1 e gata
@angular-developer [PROMPT 2]   ← într-o sesiune
@angular-developer [PROMPT 3]   ← în altă sesiune în paralel

# Pasul 3 — Token sweep (după ce P1+P2+P3 sunt gata)
@angular-developer [PROMPT 4]
```

Sau dacă vrei totul dintr-o singură sesiune de agent, combini P2+P3 într-un singur prompt și dai P1 → P2+P3 → P4 secvențial.

---

## Verificare după execuție

Checklist rapid:
- [ ] `styles.css` — există `--text-primary`, `--surface-elevated`, `--radius-md`, `--color-destructive`
- [ ] `styles.css` — scrollbar width este `6px`
- [ ] `styles.css` — clasa `.navbar { height: 12vh }` nu mai există
- [ ] `login.component.html` — "Forgot password?" e `<span>`, nu `<a href="#">`
- [ ] `login.component.html` — butoanele Google/Apple au `disabled`
- [ ] `hero-slider.component.html` — nu mai există `*ngIf` sau `*ngFor`
- [ ] `post-card.component.html` — `<div class="post-card-image-wrap">` fără `style=` inline
- [ ] `app-bottom-nav.component.css` — există `:focus-visible` pe `.app-bottomnav-tab`
- [ ] `login.component.css` — există `@media (prefers-reduced-motion: reduce)` la final
- [ ] `social-profile.component.ts` — există `bioExpanded = signal(false)`
