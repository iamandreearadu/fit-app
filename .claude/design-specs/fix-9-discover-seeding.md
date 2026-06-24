## UI Spec: Fix 9 — beSocial Cold-Start Discover Seeding & Hybrid Feed

**Author:** @uiux-designer
**Date:** 2026-06-03
**Audit reference:** Full Platform Audit § 5 — beSocial ghost-town problem
**Contract reference:** `.claude/contracts/fix-9-discover-seeding.md`
**Implementation plan:** `.claude/plans/ux-audit-implementation-plan.md` — Fix 9, Sprint 4
**Status:** READY_FOR_IMPLEMENTATION

---

### User Story

As a new user who just registered, I want to land on beSocial and see real, high-quality
content immediately — without needing to follow anyone first — so that I understand the
value of the social layer before I've built any connections.

---

### Audit Context — The Ghost Town Problem

A brand-new user who navigates to the beSocial Feed sees nothing. No posts. No content.
No signal that other people are using the app. Fix 9 eliminates this by:

1. **Hybrid feed injection** — when a user follows < 3 people, the backend fills empty
   feed slots with NovaFit Official seed content. The frontend renders these with a
   distinct "editorial" card style to set the right expectation (this is curated content,
   not peer content).

2. **Verified account badge** — NovaFit Official carries `isVerified: true` in the API.
   The frontend renders a `verified` Material icon (purple checkmark) inline with the
   display name wherever that account appears: post cards, user cards, profile page.

3. **Suggested users on Discover** — the Discover page gets a `SuggestedUsersComponent`
   at the top, surfacing the 5 most relevant users to follow before the post grid. This
   uses `GET /api/social/discover/suggested` (which already excludes system accounts).

---

### Files Changed / Created

| Action | File | Change |
|--------|------|--------|
| **Create** | `features/social/components/suggested-users/suggested-users.component.ts` | Extracted from Fix 7 guided empty |
| **Create** | `features/social/components/suggested-users/suggested-users.component.html` | Suggested users list |
| **Create** | `features/social/components/suggested-users/suggested-users.component.css` | Component styles |
| **Modify** | `features/social/components/post-card/post-card.component.html` | Seed variant + verified badge |
| **Modify** | `features/social/components/post-card/post-card.component.css` | `.post-card--seed`, `.post-card-seed-*`, `.verified-badge` |
| **Modify** | `features/social/discover/social-discover.component.html` | Add `<app-suggested-users>` at top |
| **Modify** | `features/social/feed/guided-empty/social-feed-guided-empty.component.html` | Use `<app-suggested-users>` internally |
| **Modify** | `features/social/social-profile/social-profile.component.html` | Add verified badge to name |
| **Modify** | `core/models/social.model.ts` | Add `isVerified`, `isSeedContent` fields |

---

## Component 1 — `PostCardComponent` Modifications

### Changes Overview

The `PostCardComponent` receives two new optional fields on the `Post` model:
- `post.author.isVerified` → renders a `verified` icon inline after the display name
- `post.isSeedContent` → switches the card into editorial rendering mode

These are additive changes. When both flags are `undefined` or `false`, the component
renders exactly as it does today — no regression risk.

---

### 1a — Verified Badge (author row)

**Position**: Inline, immediately after `post.author.displayName`, before the date dot.

```
[avatar]  NovaFit Official  [verified]  · Jun 3
```

**HTML addition** (inside `.post-card-name-row`, after `.post-card-author-name`):

```html
@if (post().author.isVerified) {
  <mat-icon class="verified-badge" aria-label="Verified account">verified</mat-icon>
}
```

**CSS (add to `post-card.component.css`)**:

```css
/* ── Verified badge ────────────────────────────────────────────────────────── */
.verified-badge {
  font-size: 16px;
  width: 16px;
  height: 16px;
  color: var(--primary);
  flex-shrink: 0;
  /* vertical alignment with text */
  align-self: center;
  margin-left: 1px;
  margin-right: -2px;   /* tighten the gap before the date dot */
}
```

> The `verified` Material icon is a filled checkmark-in-shield glyph. At 16px and
> `var(--primary)` (`#7c4dff`) it reads unambiguously as a verification mark without
> overwhelming the name row.

The verified badge appears on **any post author** where `isVerified === true`. This future-proofs the feature for non-official verified accounts without further code changes.

---

### 1b — Seed Content Card Variant

When `post().isSeedContent === true`, the card switches to **editorial rendering mode**.
This changes:
1. The card's visual container (border + background tint)
2. The author row (icon box replaces avatar + seed type badge added)
3. The follow button is **suppressed** (system account — follow from profile)

**Card host class toggle:**

```html
<article class="post-card"
         [class.post-card--article]="isArticle()"
         [class.post-card--seed]="post().isSeedContent"
         role="article">
```

**Card container CSS (add to `post-card.component.css`)**:

```css
/* ── Seed content card ─────────────────────────────────────────────────────── */
.post-card--seed {
  border: 1px solid rgba(124, 77, 255, 0.18);   /* subtle all-round purple border */
  border-radius: 14px;
  margin: 2px 0;
  background: rgba(124, 77, 255, 0.018);        /* near-invisible warm tint */
}

/* Override the default bottom-only separator */
.post-card--seed + .post-card--seed {
  margin-top: 10px;
}

.post-card--seed .post-card-footer {
  border-top: 1px solid rgba(124, 77, 255, 0.10); /* override default rgba white */
}
```

---

### 1c — Author Row: Seed Posts

For seed posts the circular avatar is **replaced** with a branded icon box. The existing
avatar markup is conditionally swapped:

```html
<!-- ── Name row ─────────────────────────────────────────────────────────── -->
<div class="post-card-name-row">

  @if (!post().isSeedContent) {
    <!-- === Standard avatar (unchanged) === -->
    <a [routerLink]="['/social/profile', post().author.id]"
       class="post-card-avatar-link" aria-hidden="true" tabindex="-1">
      <div class="post-card-avatar-wrap">
        @if (post().author.avatarUrl) {
          <img class="post-card-avatar"
               [src]="post().author.avatarUrl"
               [alt]="post().author.displayName"
               (error)="onImageError()" />
        } @else {
          <div class="post-card-avatar post-card-avatar--fallback">
            <mat-icon>person</mat-icon>
          </div>
        }
      </div>
    </a>
  } @else {
    <!-- === Seed icon box (replaces avatar) === -->
    <div class="post-card-seed-icon-wrap" aria-hidden="true">
      <mat-icon>{{ post().articleId ? 'menu_book' : 'auto_awesome' }}</mat-icon>
    </div>
  }

  <!-- Author name (same for both) -->
  <a [routerLink]="['/social/profile', post().author.id]"
     class="post-card-author-name">{{ post().author.displayName }}</a>

  <!-- Verified badge (applies to both seed and non-seed) -->
  @if (post().author.isVerified) {
    <mat-icon class="verified-badge" aria-label="Verified account">verified</mat-icon>
  }

  <!-- Date (same for both) -->
  <span class="post-card-date">· {{ post().createdAt | date:'MMM d' }}</span>

  <!-- Seed type badge (seed posts only — replaces follow button) -->
  @if (post().isSeedContent) {
    <span class="post-card-seed-badge"
          [class.post-card-seed-badge--article]="!!post().articleId">
      <mat-icon>{{ post().articleId ? 'menu_book' : 'auto_awesome' }}</mat-icon>
      {{ post().articleId ? 'NovaFit · Article' : 'NovaFit Tip' }}
    </span>
  }

  <!-- Follow button (non-seed, non-own, not following) -->
  @if (!post().isSeedContent && !post().isOwnPost && !post().isFollowingAuthor) {
    <button class="post-card-follow-btn" (click)="onFollow()" type="button">
      Follow
    </button>
  }

  <!-- Options menu (own posts only — seed posts are never own) -->
  @if (post().isOwnPost) {
    <div class="post-card-menu-wrap">
      <!-- ... existing menu markup unchanged ... -->
    </div>
  }

</div>

<!-- Suggested label (seed posts — below name row, above content) -->
@if (post().isSeedContent) {
  <div class="post-card-seed-label">
    Suggested for you
  </div>
}
```

**Seed icon box CSS:**

```css
.post-card-seed-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(124, 77, 255, 0.14);
  border: 1px solid rgba(124, 77, 255, 0.24);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.post-card-seed-icon-wrap mat-icon {
  font-size: 18px;
  width: 18px;
  height: 18px;
  color: var(--primary);
}
```

**Seed type badge CSS:**

```css
/* ── Seed type badges ─────────────────────────────────────────────────────── */
.post-card-seed-badge {
  margin-left: auto;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px 3px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  /* Default: tip variant (purple) */
  background: rgba(124, 77, 255, 0.12);
  color: var(--primary-light);
  border: 1px solid rgba(124, 77, 255, 0.22);
}

.post-card-seed-badge--article {
  /* Article variant (info blue) */
  background: var(--color-info-bg);
  color: var(--color-info);
  border: 1px solid rgba(56, 189, 248, 0.22);
}

.post-card-seed-badge mat-icon {
  font-size: 11px;
  width: 11px;
  height: 11px;
}
```

**"Suggested for you" label CSS:**

```css
.post-card-seed-label {
  padding: 2px 16px 6px;
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.30);
  letter-spacing: 0.01em;
}
```

---

### Seed Card Visual Summary

**NovaFit Tip card:**

```
┌──────────────────────────────────────────────── border: rgba(124,77,255,0.18) ──┐
│  [auto_awesome 18px in 36px box]  NovaFit Official [✓]  · Jun 3  [NovaFit Tip]  │
│  Suggested for you                                                               │
│                                                                                  │
│  💡 Tip: Progressive overload doesn't mean adding weight every session...        │
│  [Show more]                                                                     │
│ ─────────────────────────────────────────────────────────────────────────────── │
│  [♡ 0]  [💬 0]                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**NovaFit Article card:**

```
┌──────────────────────────────────────────── border: rgba(124,77,255,0.18) ─────┐
│  [menu_book 18px in 36px box]  NovaFit Official [✓]  · Jun 3  [NovaFit · Article]│
│  Suggested for you                                                               │
│                                                                                  │
│  TRAINING                                            ← article-post-category    │
│  The Beginner's Guide to Building Your First         ← article-post-title       │
│  Workout Plan                                                                    │
│                                                                                  │
│  ┌──────────────────────────────────────┐            ← 16:9 cover image          │
│  │          [cover image]               │                                        │
│  └──────────────────────────────────────┘                                        │
│                                                                                  │
│  This guide walks you through...  [Read more]                                    │
│ ─────────────────────────────────────────────────────────────────────────────── │
│  [♡ 0]  [💬 0]                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

> The article body content uses the existing `.article-post-*` classes — no change there.
> The seed variant only affects the card border/background, the author row, and the badge.
> Like and comment interactions work the same as regular posts.

---

### Responsive Adjustments — Seed Cards

**< 640px:** Reduce name row padding (existing responsive rules apply). Badge truncates
if needed:
```css
@media (max-width: 480px) {
  .post-card-seed-badge {
    font-size: 9px;
    padding: 3px 7px 3px 6px;
  }
}
```

**Seed cards in the discover posts grid** (desktop 2-column):
- The card border (`border-radius: 14px`) is already compatible with the grid layout.
- No specific grid overrides needed.

---

### Computed Signals to Add to `PostCardComponent`

```typescript
readonly isSeed   = computed(() => !!this.post().isSeedContent);
readonly isTip    = computed(() => this.isSeed() && !this.post().articleId);
readonly isEdArticle = computed(() => this.isSeed() && !!this.post().articleId);
```

These drive the template conditionals cleanly, avoiding repeated `post().isSeedContent`
and `post().articleId` calls in the template.

---

## Component 2 — `SuggestedUsersComponent`

### Extraction from Fix 7

Fix 7 built the user suggestion cards inside `SocialFeedGuidedEmptyComponent`. Fix 9
requires the same UI on the Discover page. Extract the suggestion-cards section into a
**standalone reusable component** at `features/social/components/suggested-users/`.

`SocialFeedGuidedEmptyComponent` then uses `<app-suggested-users>` internally (no
visual change to its output — just code organisation).

**Selector:** `app-suggested-users`
**Location:** `features/social/components/suggested-users/`
**Standalone:** Yes
**Dependencies:** `SocialFacade`, `MatIconModule`, `MatProgressSpinnerModule`

### UX Flow on Discover Page

1. Discover page loads → `SuggestedUsersComponent` calls `GET /api/social/discover/suggested?limit=5`
2. Loading: 3 skeleton rows with staggered `pulse` animation
3. Loaded: Up to 5 user rows with avatar, name, verified badge, follow button
4. User taps Follow → button transitions to "Following" state; `SocialFacade.follow()` called
5. If API returns 0 users: section collapses entirely (no empty state message — just hidden)

**Show/hide condition on Discover page:**
- Always render the component — it self-hides when result count is 0.
- The component does not check following count — it always attempts to load suggestions.
  On the discover page (exploration context), suggestions are always relevant.

### Layout

```
┌──────────────────────────────────────────────────┐
│  ─── Suggested for you ──────────────────────    │  ← section label (.sug-section-label)
│                                                  │
│  [AV]  NovaFit Official  [✓]  [OFFICIAL]  [+]   │  ← .sug-user-row
│  [AV]  Alex Popescu          [LOSE WT]    [+]    │
│  [AV]  Maria Ionescu          [GAIN]     [+]     │
│  [AV]  Bogdan Radu          [MAINTAIN]   [+]     │
│  [AV]  Diana Pop              [CARDIO]   [+]     │
│                                                  │
└──────────────────────────────────────────────────┘
```

> NovaFit Official is excluded from `GET /api/social/discover/suggested` per the contract
> (`!u.IsSystemAccount` filter). So it will NOT appear in this section.
> The layout above is illustrative — "Official" badge shown for context only.

### Visual Spec

**Section label** — reuse the `.feed-suggest-section-label` pattern from Fix 7:

```css
.sug-section-label {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.sug-section-label-text {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.35);
  white-space: nowrap;
}
.sug-section-label-line {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
}
```

**User row** — `.sug-user-row`:

```css
.sug-user-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.sug-user-row:last-child { border-bottom: none; }
```

**Avatar** — `.sug-avatar`:

```css
.sug-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid var(--primary);
  object-fit: cover;
  flex-shrink: 0;
  display: block;
}
.sug-avatar--fallback {
  background: rgba(124, 77, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}
.sug-avatar--fallback mat-icon {
  font-size: 20px;
  width: 20px;
  height: 20px;
  color: var(--primary);
}
```

Avatar is wrapped in a `<a [routerLink]="['/social/profile', user.userId]">` for navigation.

**Name + badge column** — `.sug-info`:

```css
.sug-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
```

Name row (inline flex, wraps verified badge):
```css
.sug-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.sug-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--white);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}
.sug-name:hover { color: var(--primary-light); }
```

**Verified badge in SuggestedUsersComponent:**
```css
.sug-verified {
  font-size: 14px;
  width: 14px;
  height: 14px;
  color: var(--primary);
  flex-shrink: 0;
}
```

Fitness goal badge — reuse `.pill` base from `fix-7-empty-states.md` (`.pill-goal-*` classes):

```html
@if (user.fitnessGoal) {
  <span class="pill pill-goal-{{ user.fitnessGoal | lowercase }}">
    {{ goalLabel(user.fitnessGoal) }}
  </span>
}
```

Goal label mapping function (in component):
```typescript
goalLabel(goal: string): string {
  const map: Record<string, string> = {
    lose: 'Lose weight', gain: 'Build muscle',
    maintain: 'Maintain', strength: 'Strength', cardio: 'Cardio',
  };
  return map[goal.toLowerCase()] ?? goal;
}
```

**Follow button** — `.sug-follow-btn`:

Reuse exact spec from `fix-7-empty-states.md` §3 (`.feed-suggest-follow-btn`):

| State | Visual |
|-------|--------|
| Default (not following) | `background: var(--primary)` + `add` icon + "Follow" text, `min-height: 48px` |
| Loading (API call) | Spinner (diameter 14), `background: rgba(124,77,255,0.45)`, disabled |
| Following | Ghost style, `check` icon + "Following", `pointer-events: none` |

```css
.sug-follow-btn {
  padding: 7px 14px;
  min-height: 48px;
  border-radius: 10px;
  background: var(--primary);
  border: none;
  color: var(--white);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  transition: opacity 0.15s, transform 0.15s;
}
.sug-follow-btn:hover:not(:disabled) {
  opacity: 0.85;
  transform: translateY(-1px);
}
.sug-follow-btn--following {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.55);
  pointer-events: none;
}
.sug-follow-btn--loading {
  background: rgba(124, 77, 255, 0.45);
  cursor: default;
  pointer-events: none;
}
.sug-follow-btn mat-icon {
  font-size: 16px;
  width: 16px;
  height: 16px;
}
```

### Loading State — Skeleton Rows

3 rows, staggered `pulse`:
```css
.sug-skeleton-row {
  height: 64px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  animation: pulse 1.8s ease-in-out infinite;
}
.sug-skeleton-row:nth-child(1) { animation-delay: 0ms; }
.sug-skeleton-row:nth-child(2) { animation-delay: 150ms; }
.sug-skeleton-row:nth-child(3) { animation-delay: 300ms; }
```

### Empty State

When 0 users returned — component renders nothing (`@if (users().length > 0)`).
The section disappears cleanly without any empty-state message or icon.
This is intentional: if there are no suggestions, surfacing the section would create
confusion ("why is this here?"). The discover page has ample content below.

### Error State

When the API call fails — swallow silently. Log at WARNING level in the component.
Do not show an error banner for suggestions failure — it's non-critical content.
The rest of the Discover page still renders normally.

### Component Signals

```typescript
readonly users     = signal<SuggestedUser[]>([]);
readonly loading   = signal(true);
readonly following = signal<Set<string>>(new Set());
readonly pending   = signal<Set<string>>(new Set());
```

`SuggestedUser` interface (from existing `social.model.ts`, already defined in Fix 7):
```typescript
interface SuggestedUser {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  fitnessGoal?: string;
  workoutsThisMonth?: number;
  isVerified?: boolean;   // NEW — added in Fix 9
}
```

> `isVerified` is NOT on the `SuggestedUserResponse` DTO per the contract.
> The contract's `GET /api/social/discover/suggested` response shape does NOT include
> `isVerified`. The verified badge on the suggested users component is driven by
> `isVerified` on the `UserSummary` DTO, which is only available via `PostResponse.author`
> and `UserSocialProfileResponse`, NOT `SuggestedUserResponse`.
>
> **Therefore: do NOT render a verified badge inside `SuggestedUsersComponent`.**
> The verified badge spec for suggested users is omitted — the badge only appears where
> `UserSummary.isVerified` is available (post cards, profile page).

### Angular Material Components — SuggestedUsersComponent
- `mat-icon` — `person`, `add`, `check`, `verified`
- `mat-progress-spinner` (diameter: 14) — follow loading state
- `RouterLink` — avatar and name link to profile

### Template Structure

```html
@if (!loading() || users().length > 0) {
  <section class="sug-container" aria-label="Suggested users">

    @if (loading()) {
      @for (s of [1,2,3]; track $index) {
        <div class="sug-skeleton-row" aria-hidden="true"></div>
      }
    } @else {
      @if (users().length > 0) {
        <div class="sug-section-label">
          <span class="sug-section-label-line"></span>
          <span class="sug-section-label-text">Suggested for you</span>
          <span class="sug-section-label-line"></span>
        </div>

        <div class="sug-list">
          @for (user of users(); track user.userId) {
            <div class="sug-user-row">
              <a [routerLink]="['/social/profile', user.userId]"
                 class="sug-avatar-link" aria-hidden="true" tabindex="-1">
                @if (user.avatarUrl) {
                  <img class="sug-avatar" [src]="user.avatarUrl" [alt]="user.displayName" />
                } @else {
                  <div class="sug-avatar sug-avatar--fallback">
                    <mat-icon>person</mat-icon>
                  </div>
                }
              </a>

              <div class="sug-info">
                <div class="sug-name-row">
                  <a [routerLink]="['/social/profile', user.userId]" class="sug-name">
                    {{ user.displayName }}
                  </a>
                </div>
                @if (user.fitnessGoal) {
                  <span class="pill pill-goal-{{ user.fitnessGoal | lowercase }}">
                    {{ goalLabel(user.fitnessGoal) }}
                  </span>
                }
              </div>

              <button
                class="sug-follow-btn"
                [class.sug-follow-btn--following]="isFollowing(user.userId)"
                [class.sug-follow-btn--loading]="isPending(user.userId)"
                [disabled]="isPending(user.userId) || isFollowing(user.userId)"
                (click)="onFollow(user.userId)"
                type="button"
                [attr.aria-label]="isFollowing(user.userId) ? 'Following ' + user.displayName : 'Follow ' + user.displayName"
                [attr.aria-pressed]="isFollowing(user.userId)">
                @if (isPending(user.userId)) {
                  <mat-spinner diameter="14" />
                } @else if (isFollowing(user.userId)) {
                  <mat-icon>check</mat-icon> Following
                } @else {
                  <mat-icon>add</mat-icon> Follow
                }
              </button>
            </div>
          }
        </div>
      }
    }

  </section>
}
```

---

## Component 3 — `SocialDiscoverComponent` Modifications

### Adding `SuggestedUsersComponent` to the Top

**Position in the template:** Below the search bar, above the existing "Athletes to Follow" section. Only shown when **not in search mode** (`!isSearchMode()`).

```html
<!-- Search bar (unchanged) -->
<div class="discover-search-wrap"> ... </div>

@if (isSearchMode()) {
  <!-- existing search-mode content, unchanged -->
} @else {
  <!-- === NEW: Suggested for you section === -->
  <app-suggested-users class="discover-suggested" />

  <!-- === EXISTING: Discover content === -->
  @if (facade.isLoadingDiscover()) { ... }
  @if (facade.discoverError() ...) { ... }
  @if (!facade.isLoadingDiscover() && !facade.discoverError()) {
    <!-- Athletes to Follow (existing) -->
    <!-- Recent Posts (existing) -->
  }
}
```

**CSS addition to `social-discover.component.css`:**

```css
/* Suggested users section — sits between search bar and athletes strip */
.discover-suggested {
  display: block;
  /* No extra margin needed — discover-page gap: 32px handles spacing */
}
```

No other CSS changes needed. The component handles its own internal layout.

### Verified Badge in "Athletes to Follow" User Cards

The existing `.user-card` in the horizontal strip renders author data from
`facade.discoverPosts()` (mapped to `uniqueAuthors()`). These authors come from
`PostResponse.author` which now has `isVerified`. Add the verified badge inline
after the user name in `.user-card-name`:

**HTML change in `social-discover.component.html`** (inside the `.user-card` loop):

```html
<div class="user-card-name-row">
  <a [routerLink]="['/social/profile', author.id]" class="user-card-name">
    {{ author.displayName }}
  </a>
  @if (author.isVerified) {
    <mat-icon class="user-card-verified" aria-label="Verified account">verified</mat-icon>
  }
</div>
```

Replace the existing single `<a class="user-card-name">` with the above wrapper div.

**CSS addition to `social-discover.component.css`:**

```css
.user-card-name-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 100%;
}

.user-card-verified {
  font-size: 14px;
  width: 14px;
  height: 14px;
  color: var(--primary);
  flex-shrink: 0;
}
```

The same pattern applies to **search result rows** (`.search-result-row`). Add a
verified badge after `.search-result-name` for search results where `user.isVerified`:

```html
<a [routerLink]="['/social/profile', user.id]" class="search-result-name">
  {{ user.displayName }}
</a>
@if (user.isVerified) {
  <mat-icon class="search-result-verified" aria-label="Verified account">verified</mat-icon>
}
```

```css
.search-result-verified {
  font-size: 15px;
  width: 15px;
  height: 15px;
  color: var(--primary);
  flex-shrink: 0;
}
```

> `SearchResult` DTO (`/api/social/users/search`) does not include `isVerified` per the
> contract — that field is only on `UserSummary` (post authors) and
> `UserSocialProfileResponse`. The search result verified badge spec is DEFERRED until
> the search DTO is updated. Add a `// TODO: isVerified when search DTO supports it` comment.

---

## Component 4 — Social Profile Page Modifications

### Verified Badge on Profile Header

The `social-profile.component.html` renders the user's display name in a heading.
Add the verified badge immediately after it:

```html
<!-- Inside the profile header section, after the display name -->
<h1 class="profile-display-name">
  {{ profile().displayName }}
  @if (profile().isVerified) {
    <mat-icon class="profile-verified-badge" aria-label="Verified account">verified</mat-icon>
  }
</h1>
```

**CSS (in `social-profile.component.css`):**

```css
.profile-display-name {
  /* existing font styles — just adding flex/inline-flex for badge alignment */
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.profile-verified-badge {
  font-size: 20px;
  width: 20px;
  height: 20px;
  color: var(--primary);
  flex-shrink: 0;
}
```

> The larger size (20px vs 16px in post cards) is appropriate for a profile header —
> the name is displayed at a larger scale and the badge should match.

---

## TypeScript Model Changes — `core/models/social.model.ts`

```typescript
// UserSummary — add isVerified
export interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl?: string;
  isVerified?: boolean;     // NEW: renders .verified-badge
}

// Post — add isSeedContent
export interface Post {
  // ... existing fields unchanged ...
  isSeedContent?: boolean;  // NEW: drives .post-card--seed editorial mode
}

// UserSocialProfile — add isVerified
export interface UserSocialProfile {
  // ... existing fields unchanged ...
  isVerified?: boolean;     // NEW: renders .profile-verified-badge
}
```

All three additions are optional (`?`) — backward compatible with any data that doesn't
include them yet. No component will break if these fields are `undefined`.

---

## Feed Seeding — Frontend Guarantee

The backend guarantees minimum 5 items in the feed when `followingIds.Count < 3`.
The frontend's existing logic in `social-feed.component.html` handles this correctly:

```html
<!-- Guided empty state — only fires when feed is EMPTY and followingCount === 0 -->
@if (
  !facade.isLoadingFeed() &&
  facade.feed().length === 0 &&
  !facade.feedError() &&
  facade.myFollowingCount() === 0 &&
  !facade.isLoadingFollowingCount()
) {
  <app-social-feed-guided-empty />
}
```

**No change needed** to this condition. With Fix 9's backend seeding, a new user with
`followingIds.Count < 3` will always receive seed posts, so `facade.feed().length === 0`
will be `false`. The guided empty state becomes a fallback for the edge case where the
seeder hasn't run yet or all seed posts have been deleted.

**The "never show empty feed" guarantee is backend-enforced.** The frontend renders
whatever the API returns — seed posts appear in the feed list alongside regular posts,
styled via `.post-card--seed`.

---

## Full Visual Hierarchy — Discovery Experience

```
/social/discover
├── Search bar (existing)
│
└── [Not in search mode]
    │
    ├── SuggestedUsersComponent          ← NEW (Fix 9)
    │   ─── Suggested for you ───
    │   [AV]  User A  [LOSE WT]  [+ Follow]
    │   [AV]  User B  [GAIN]     [+ Follow]
    │   [AV]  User C  [MAINTAIN] [+ Follow]
    │
    ├── Athletes to Follow               ← EXISTING (with verified badge added)
    │   horizontal scroll card strip
    │   [NovaFit Official [✓]] [User A] [User B] ...
    │
    └── Recent Posts                     ← EXISTING (with seed card styling)
        2-column grid (desktop) / 1-column (mobile)
        [seed card] [seed card]
        [seed card] [user card]
        ...
```

---

## States Summary

| Component | Loading | Empty | Error |
|-----------|---------|-------|-------|
| `SuggestedUsersComponent` | 3 skeleton rows (staggered pulse) | Hides silently | Hides silently (non-critical) |
| `PostCardComponent` (seed variant) | N/A | N/A | N/A |
| Discover "Athletes to Follow" | Existing skeleton cards (unchanged) | Existing empty state (unchanged) | Existing error banner (unchanged) |
| Feed with seed posts | Existing skeleton (unchanged) | Existing guided empty (unchanged) | Existing error banner (unchanged) |

---

## Accessibility

| Element | Implementation |
|---------|----------------|
| Verified badge | `aria-label="Verified account"` on each `mat-icon` — screen readers announce "Verified account" |
| Seed type badge | Text content ("NovaFit Tip" / "NovaFit · Article") is visible text — no ARIA override needed |
| Seed icon box (replaces avatar) | `aria-hidden="true"` — decorative icon, not navigable |
| "Suggested for you" label | `aria-label="Suggested users"` on the `<section>` wrapping the list |
| Follow button state | `aria-pressed="true/false"`, `aria-label="Follow Jane Doe"` / `"Following Jane Doe"` |
| Follow loading state | `aria-busy="true"` on the button during API call |
| Seed card | `role="article"` (same as regular post card — no change) |
| Profile verified badge | `aria-label="Verified account"` inline within the `<h1>` |
| Min touch target | All follow buttons: `min-height: 48px` ✅ |
| Skeleton rows | `aria-hidden="true"` on each skeleton element |

---

## Implementation Notes for `@angular-developer`

1. **Extract `SuggestedUsersComponent` first.** Both `SocialFeedGuidedEmptyComponent`
   (Fix 7) and `SocialDiscoverComponent` (Fix 9) need it. Build the shared component,
   update Fix 7's guided empty to use it, then add it to discover. This order avoids
   the component being built twice.

2. **`.post-card--seed` uses `!important` on the border** — because the base
   `.post-card` rule has `border: none`. The `!important` is necessary to override it
   from the modifier class. This is the only `!important` in the component CSS.

3. **`isVerified` on `SuggestedUserResponse` is NOT in the contract.** The `SuggestedUsersComponent` should NOT render a verified badge — the `SuggestedUserResponse` DTO doesn't carry that field. This is explicitly noted in the spec above.

4. **`isSeedContent` defaults to `false`** when omitted from the API response —
   TypeScript optional fields default to `undefined`, which is falsy. The `@if (post().isSeedContent)` and `computed()` signals handle this correctly.

5. **Seed cards in the feed maintain the same IntersectionObserver pagination behaviour**
   — `isSeedContent` posts count the same as regular posts in the template `@for` loop.
   The `HasMore` flag from the API is already based on real post count only (per contract),
   so the feed doesn't endlessly paginate trying to fill seed slots.

6. **NovaFit Official posts in the organic feed (when user follows them)** will have
   `isSeedContent === false` — they render as normal post cards with a verified badge
   but WITHOUT the seed card treatment. The editorial styling is only for cold-start
   injected posts.

7. **`@for (s of [1,2,3]; track $index)` pattern** for skeleton rows in `SuggestedUsersComponent` — avoids creating a signal or class property just for a static loop count.
