# UI Spec: Social Feature — Mobile Fixes

## Audit Summary

Full read of all 63 files in `fit-app/src/app/features/social/`. Issues found across 10 components. Root cause of the "nav in footer" report and many layout breaks is a single architectural mismatch: `.social-shell` on mobile switches to `display: block` with the bottom nav rendered at the end of the DOM flow, but the host element has no flex/block constraint that forces the nav to stick. The `z-index: 50` on the nav is also too low and can be overridden. Secondary issues span page padding, dialog positioning, touch targets, and font size.

---

## 1. Bottom Navigation — Primary Bug

### File
`fit-app/src/app/features/social/components/bottom-nav/social-bottom-nav.component.css`

### Problem
The nav has `position: fixed; bottom: 0; z-index: 50`. This is architecturally correct but `z-index: 50` is too low — the daily-panel backdrop (`z-index: 299`), the daily-panel itself (`z-index: 300`), and any Angular Material dialog overlay (`z-index: 1000`) all render on top of it in certain states. More critically, because `.social-shell` on mobile renders as `display: block`, the browser's paint order can treat the fixed nav as subordinate to content painted later in the stacking context if any ancestor has a `transform`, `opacity`, `will-change`, or `filter` property set. The shell's `animation: slideUp` — which applies `transform` — creates a new stacking context that traps the fixed-position child.

### Root Cause (shell)
In `social-shell.component.css`:
```css
.social-shell {
  animation: slideUp 0.35s ease-out both;   /* ← creates stacking context */
}
```
Any `position: fixed` child of an element with an active CSS `transform` is positioned relative to that transformed ancestor, not the viewport. During the 0.35s animation, the bottom nav scrolls with content instead of sticking.

### Fix

**`social-shell.component.css`** — move the animation to `.social-content` (the scrollable region) instead of the shell root, so the shell itself never has an active transform:

```css
/* REMOVE from .social-shell: */
/* animation: slideUp 0.35s ease-out both; */

/* ADD to .social-content: */
.social-content {
  animation: slideUp 0.35s ease-out both;
}
```

**`social-bottom-nav.component.css`** — raise z-index to sit above content but below dialogs:

```css
.social-bottomnav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;                                          /* was 50 */
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 2px;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  height: calc(56px + env(safe-area-inset-bottom, 0px));
  background: rgba(13, 13, 16, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
```

**`social-top-bar.component.css`** — raise z-index to match:

```css
.social-topbar {
  z-index: 1000;   /* was 50 */
}
```

**`social-shell.component.css`** — also raise the FAB and backdrop so ordering is consistent:

```css
.daily-panel-fab {
  z-index: 1100;   /* was 301 — must sit above bottom nav */
}

.daily-panel-backdrop {
  z-index: 1050;   /* was 299 — must sit above bottom nav */
}
```

And the daily panel itself (`social-daily-panel.component.css`) already uses `z-index: 300` at `< 1200px`. This needs to be raised to sit above the bottom nav when the drawer is open:

```css
/* In social-daily-panel.component.css, inside @media (max-width: 1199px): */
.daily-panel {
  z-index: 1200;   /* was 300 — drawer must sit above the bottom nav and FAB */
}
```

---

## 2. Shell Layout — Page Padding Accounting

### File
`fit-app/src/app/features/social/social-shell.component.css`

### Problem
At `< 768px` the shell already sets:
```css
padding-top: calc(52px + env(safe-area-inset-top, 0px));
padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px));
```
This is correct in intent, but `overflow-y: unset` on `.social-content` means the page body is scrolled by the root viewport, not the `.social-content` container. This is intentional and correct for infinite scroll, but it means page-level components that use `position: sticky; bottom: 0` (post-detail composer) compete with the fixed bottom nav. No change needed at the shell level — the per-page fix is in section 6.

The one real shell issue: `.content-inner` has `padding: 0` on mobile but several pages add horizontal padding internally at different amounts (16px, 20px, 24px). This is fine — document it as intentional so the developer does not add horizontal padding at the shell level.

---

## 3. Top Bar — Missing Create Button Function

### Files
`fit-app/src/app/features/social/components/top-bar/social-top-bar.component.html`
`fit-app/src/app/features/social/components/top-bar/social-top-bar.component.ts`

### Problem
The `+` button in the top bar has `aria-label="Create new post"` but its `(click)` handler is absent. On mobile this button does nothing. The bottom nav center FAB does open `CreateContentComponent`, but users tapping the top bar button get no response.

### Fix
Wire the top bar create button to open `CreateContentComponent` identically to how the bottom nav FAB does it. Inject `MatDialog` in `SocialTopBarComponent` and add:

```typescript
onNewPost(): void {
  this.dialog.open(CreateContentComponent, {
    panelClass: 'create-post-panel',
    maxWidth: '600px',
    width: '100%'
  });
}
```

Add `(click)="onNewPost()"` to the button in the template.

The button size is 36×36px with a 6px pseudo-element extension (`::before { inset: -6px }`), making the effective touch target 48×48px. That is correct — do not change.

---

## 4. Feed Page — FAB Positioning and Header Padding

### File
`fit-app/src/app/features/social/feed/social-feed.component.css`

### Problem 1 — Mobile FAB overlap
The feed FAB is positioned at `bottom: 88px`. The bottom nav is 56px + safe area. On devices with a home bar (34px safe area), the nav is 90px tall and the FAB at 88px will sit underneath it. Also, the FAB is shown only on mobile (`display: flex` in the `@media (max-width: 768px)` block) — this duplicates the center FAB already present in the bottom nav. Having two simultaneous create-post FABs is confusing.

### Fix — Remove the feed FAB entirely on mobile
The bottom nav's center circle button already provides the create-post action. The feed-level FAB should be removed from the mobile breakpoint:

```css
/* In the @media (max-width: 768px) block — remove: */
/* .feed-fab { display: flex; } */

/* The .feed-fab rule can remain for desktop fallback if needed, but on mobile suppress it: */
@media (max-width: 768px) {
  .feed-fab {
    display: none;    /* bottom nav center button handles this */
  }
  .feed-header-btn {
    display: none;
  }
  .feed-page {
    padding: 16px 0 120px;
  }
}
```

### Problem 2 — Feed header missing horizontal padding on mobile
`.feed-header` has no horizontal padding. On mobile where `.content-inner` has `padding: 0`, the title "Feed" renders flush against the screen edge.

### Fix
```css
@media (max-width: 768px) {
  .feed-header {
    padding: 0 16px;
    margin-bottom: 12px;
  }
}
```

---

## 5. Discover Page — Layout and Padding

### File
`fit-app/src/app/features/social/discover/social-discover.component.css`

### Problem 1 — Outer padding on mobile
`.discover-page` has `padding: 24px 16px 100px`. On mobile the `max-width: 680px` container is correct, but the 16px horizontal padding inside a page that itself gets 0 padding from `.content-inner` is fine. No change needed here — this is correctly scoped.

### Problem 2 — Search result follow button touch target
`.search-result-follow-btn` has `height: 34px` and `min-height: 44px`. Those two values conflict — the explicit `height: 34px` overrides `min-height`. On mobile the button is 34px tall, below the 48px minimum.

### Fix
```css
.search-result-follow-btn {
  /* Remove height: 34px — let min-height control it */
  padding: 6px 16px;
  min-height: 48px;           /* was 44px, raise to 48px for gym use */
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--primary);
  border: none;
  color: var(--white);
  flex-shrink: 0;
}
```

### Problem 3 — User card follow button
`.user-card-follow-btn` has `height: 36px; min-height: 48px` — same conflict. The explicit `height` wins.

### Fix
```css
.user-card-follow-btn {
  /* Remove height: 36px */
  padding: 6px 16px;
  min-height: 48px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--primary);
  border: none;
  color: var(--white);
  width: 100%;
}
```

### Problem 4 — Two-column posts grid on 480px screens
`.discover-posts-grid` collapses to 1 column at `< 640px`. However, the post-cards inside it are not constrained — with the outer padding and 1-column layout they render full-width, which is correct. No issue here.

---

## 6. Post Detail — Sticky Composer Conflict with Bottom Nav

### File
`fit-app/src/app/features/social/post-detail/social-post-detail.component.css`

### Problem
The comment composer uses `position: sticky; bottom: 0`. On mobile, the bottom nav is `position: fixed` at the bottom of the viewport. The sticky composer will render directly behind the nav bar, hiding the send button and part of the input field. The negative margin trick (`margin: 0 -16px -120px`) partially compensates for the bottom padding but does not account for the nav height dynamically.

### Fix
Change the composer to `position: fixed` on mobile and add safe-area-aware bottom offset:

```css
/* Replace the existing .post-detail-composer rule: */
.post-detail-composer {
  position: sticky;
  bottom: 0;
  background: rgba(13, 13, 16, 0.95);
  backdrop-filter: blur(12px);
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 -16px -120px;
  z-index: 10;
}

@media (max-width: 768px) {
  .post-detail-composer {
    position: fixed;
    bottom: calc(56px + env(safe-area-inset-bottom, 0px));
    left: 0;
    right: 0;
    margin: 0;
    padding: 10px 16px;
    z-index: 999;              /* below bottom nav (1000) but above content */
  }

  /* Compensate so last comment is not hidden behind the double bar */
  .post-detail-page {
    padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px));
  }
}
```

### Problem 2 — Back button has no horizontal padding
`.post-detail-back` at `padding: 6px 0` renders flush against the edge on mobile because `.content-inner` has no horizontal padding.

### Fix
```css
@media (max-width: 768px) {
  .post-detail-back {
    padding: 6px 16px;
  }
  .post-detail-comments {
    padding: 0 16px;
  }
}
```

---

## 7. Chat Detail — Composer Sits Behind Bottom Nav

### File
`fit-app/src/app/features/social/chat-detail/social-chat-detail.component.css`

### Problem
`.chat-detail` uses `height: 100%` with a flex column. The shell's `.social-content` on mobile has `overflow-y: unset` and `min-height: 100dvh`. This means `.chat-detail` is not constrained to a viewport-height flex container — it simply stacks in flow. The message composer at the bottom has no `position: fixed` — it sits at the end of the scroll flow and is obscured by the bottom nav.

Additionally, the back button in the header is only 36×36px — below the 48px minimum touch target.

### Fix

**Constrain chat-detail to viewport height on mobile:**

The chat detail needs to behave as a true full-screen view. The shell's `.social-content` must be overridden for this route. The cleanest fix without touching the shell is to use `100dvh` offset calculations on `.chat-detail` directly:

```css
@media (max-width: 768px) {
  .chat-detail {
    height: calc(100dvh - 52px - 56px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
    /* 52px = top bar, 56px = bottom nav */
    position: relative;
  }

  /* Message area must flex-scroll within the fixed height */
  .msg-area {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* Composer anchored at bottom of the constrained container */
  .msg-composer {
    flex-shrink: 0;
    /* No position: fixed needed — the parent is height-constrained */
  }

  /* Back button touch target */
  .hdr-back-btn {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
  }
}
```

**Important note for `@angular-developer`:** For the `height` calculation to work, `.social-content` on mobile must have `overflow-y: auto` (not `unset`) so that `.chat-detail` sits inside a scrollable container that is itself bounded. The current `overflow-y: unset` causes the page body to scroll. For chat-detail only, we need the content area to not scroll — the chat's `.msg-area` should scroll internally. 

The recommended approach: add a CSS class `chat-detail-page` to `.social-content` when the chat-detail route is active, using Angular router's `routerLinkActive` equivalent on the shell, OR use an alternative host-element approach in `SocialChatDetailComponent`:

```css
/* In social-chat-detail.component.css, use :host to fill the available space */
:host {
  display: flex;
  flex-direction: column;
  height: 100%;
}
```

And in the shell's mobile CSS, ensure `.social-content` does not collapse for flex children:

```css
@media (max-width: 768px) {
  .social-content {
    display: flex;
    flex-direction: column;
  }
  .content-inner {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
}
```

---

## 8. Chat List — FAB Positioning

### File
`fit-app/src/app/features/social/chat/social-chat.component.css`

### Problem
`.conv-fab` is `position: fixed; bottom: 88px; right: 20px`. This FAB is supposed to float above the bottom nav. On devices with a home bar (safe-area-inset-bottom ~34px), the bottom nav is `calc(56px + 34px) = 90px` tall, so the FAB at 88px clips under it.

### Fix
```css
.conv-fab {
  position: fixed;
  bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 16px);
  /* 56px nav + safe area + 16px gap */
  right: 20px;
  /* rest of properties unchanged */
}
```

### Problem 2 — Header padding
`.chat-list-header { padding: 0 20px 20px; }` — the top padding is 0, so the "Messages" title starts at the very top of the content area with no breathing room. On mobile, with the top bar taking 52px and the shell adding `padding-top: calc(52px + ...)`, the content starts immediately at the title. The title needs a top margin.

### Fix
```css
@media (max-width: 768px) {
  .chat-list-header {
    padding: 16px 20px 16px;
  }
  .chat-list-page {
    padding: 0 0 100px;
  }
}
```

---

## 9. Notifications Page — No Bottom Padding

### File
`fit-app/src/app/features/social/notifications/social-notifications.component.css`

### Problem
`.notif-page { padding: 0 0 24px; }` — only 24px bottom padding. On mobile, the last notification item is obscured by the fixed bottom nav (56px + safe area). There is also no horizontal padding and the notification items rely on their own `padding: 14px 16px` — which works fine. The only real issue is insufficient bottom padding.

### Fix
```css
@media (max-width: 768px) {
  .notif-page {
    padding: 0 0 calc(80px + env(safe-area-inset-bottom, 0px));
  }
  .notif-page-header {
    padding: 16px 16px 16px;
  }
}
```

The `.notif-mark-all` button touch target is only `padding: 4px 8px` with no `min-height`. On mobile this is tappable but barely.

### Fix
```css
.notif-mark-all {
  min-height: 44px;
  padding: 8px 12px;
}
```

---

## 10. Social Profile — Mobile Layout Issues

### File
`fit-app/src/app/features/social/social-profile/social-profile.component.css`

### Problem 1 — Profile tab labels hidden too early
```css
@media (max-width: 640px) {
  .profile-tab-btn span { display: none; }
}
```
This hides the text labels of the 4 tabs (Posts, Workouts, Articles, Stats) at 640px. The tabs then show only icons. However `.profile-tab-btn` has no `aria-label` attribute — assistive tech users lose context. More importantly, icon-only tabs without labels are non-obvious for "Stats" (bar_chart) and "Articles" (article) icons.

### Fix — Option A (preferred): keep labels but reduce font size
```css
@media (max-width: 640px) {
  .profile-tab-btn {
    font-size: 10px;
    padding: 10px 4px;
    gap: 3px;
    flex-direction: column;    /* stack icon above label */
  }
  .profile-tab-btn mat-icon {
    font-size: 20px;
    width: 20px;
    height: 20px;
  }
}
```
Remove the `span { display: none }` rule.

Instruct `@angular-developer`: add `[attr.aria-label]` to each `profile-tab-btn` regardless, e.g. `aria-label="Posts tab"`.

### Problem 2 — Action row wrapping on narrow screens
`.profile-action-row` wraps at `< 640px` but the buttons each have `flex: 1` which makes them equal-width. On very narrow screens (320px), two full-width buttons + the 48px more-button create a three-element row that wraps awkwardly.

### Fix
```css
@media (max-width: 480px) {
  .profile-action-row {
    gap: 8px;
  }
  .profile-action-btn {
    font-size: 13px;
    padding: 10px 14px;
  }
}
```

### Problem 3 — Profile overlay buttons not accessible on touch
`.profile-item-overlay { opacity: 0 }` appears only on `:hover`. On touch devices, hover never fires — users can never access the edit/archive/delete buttons on their own posts grid.

### Fix
Add a visible tap-to-reveal mechanism. The simplest approach: on mobile, show the overlay on `.profile-post-cell:focus-within` or expose a long-press. The pragmatic CSS-only fix is to always show a single small indicator icon, and show full overlay on focus:

```css
@media (max-width: 768px) {
  .profile-item-overlay {
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  /* Show on tap via active state */
  .profile-post-cell:active .profile-item-overlay,
  .profile-post-cell:focus .profile-item-overlay {
    opacity: 1;
  }
  /* Small persistent indicator dot in corner */
  .profile-post-cell.is-own-post::after {
    content: '';
    position: absolute;
    top: 6px;
    right: 6px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    pointer-events: none;
  }
}
```

Note for `@angular-developer`: the `is-own-post` class should be conditionally bound in the template via `[class.is-own-post]="facade.currentProfile()!.isOwnProfile"`.

A better UX solution (recommended): replace the hover-only overlay with an always-visible `•••` button on the post cell when `isOwnProfile` is true, which opens a bottom sheet on mobile. This is a scope increase — flag for backlog.

### Problem 4 — Avatar edit overlay not discoverable on mobile
`.profile-avatar-edit-overlay { opacity: 0 }` on desktop, shown on `hover`. On mobile there is no visual affordance that the avatar is tappable to change the photo.

### Fix
Always show the overlay at reduced opacity on mobile:

```css
@media (max-width: 768px) {
  .profile-avatar-ring--editable .profile-avatar-edit-overlay {
    opacity: 0.6;    /* always visible on mobile */
  }
}
```

### Problem 5 — Stats tab bottom padding
`.stats-tab { padding: 20px 0 80px }` — the 80px bottom padding is insufficient on mobile (56px nav + safe area + gap needed = ~90px minimum). Stats cards at the bottom may be cut off.

### Fix
```css
@media (max-width: 768px) {
  .stats-tab {
    padding: 16px 0 calc(80px + env(safe-area-inset-bottom, 0px));
  }
}
```

---

## 11. Create Content Dialog — Bottom Sheet Positioning

### File
`fit-app/src/app/features/social/components/create-content/create-content.component.css`

### Problem
At `< 640px` the dialog becomes a bottom sheet (`border-radius: 24px 24px 0 0`). The Angular Material dialog is centered by default — the bottom sheet appearance via CSS alone does not reposition it to `bottom: 0`. The CSS `border-radius` change makes it look bottom-sheet-like only if the dialog is already at the bottom, which it is not unless the panel class forces it.

The `panelClass: 'create-post-panel'` is set in the `onNewPost()` call, but there is no global CSS rule for `.create-post-panel` that positions the dialog at the bottom.

### Fix
Add to `styles.css` (global, so it applies to the Angular Material overlay):

```css
/* Create post dialog — mobile bottom sheet */
@media (max-width: 640px) {
  .cdk-global-overlay-wrapper:has(.create-post-panel) {
    align-items: flex-end !important;
  }
  .create-post-panel .mat-mdc-dialog-container {
    border-radius: 24px 24px 0 0 !important;
    max-height: 95dvh;
    margin: 0;
    width: 100vw;
    max-width: 100vw !important;
  }
}
```

If `:has()` selector support is a concern (it is broadly supported as of 2024), the alternative is to use `MatDialogConfig.position = { bottom: '0' }` in the TypeScript when on mobile:

```typescript
// In bottom-nav and top-bar onNewPost(), detect mobile and adjust:
onNewPost(): void {
  const isMobile = window.innerWidth <= 640;
  this.dialog.open(CreateContentComponent, {
    panelClass: 'create-post-panel',
    maxWidth: isMobile ? '100vw' : '600px',
    width: '100%',
    position: isMobile ? { bottom: '0' } : undefined
  });
}
```

This TypeScript approach is more reliable. Use it in both `SocialBottomNavComponent` and `SocialTopBarComponent`.

---

## 12. Edit Post Dialog — Bottom Sheet Missing

### File
`fit-app/src/app/features/social/components/edit-post/edit-post.component.css`

### Problem
Same issue as create-content. The edit post dialog has `@media (max-width: 640px) { border-radius: 24px 24px 0 0 }` but no Angular Material panel positioning to push it to the bottom. It appears centered on mobile.

### Fix
Wherever `EditPostComponent` is opened (check `social-profile.component.ts`, `social-feed.component.ts`, `post-card.component.ts`), apply the same mobile positioning pattern:

```typescript
const isMobile = window.innerWidth <= 640;
this.dialog.open(EditPostComponent, {
  panelClass: 'edit-post-panel',
  maxWidth: isMobile ? '100vw' : '560px',
  width: '100%',
  position: isMobile ? { bottom: '0' } : undefined,
  data: { post }
});
```

Add corresponding global CSS for `.edit-post-panel` matching the pattern from section 11.

---

## 13. Article Detail — Bottom Padding Insufficient

### File
`fit-app/src/app/features/social/article-detail/article-detail.component.css`

### Problem
`.article-page { padding: 16px 20px 60px }` on mobile (overridden to `12px 16px 60px` at `< 640px`). The 60px bottom padding does not account for the fixed bottom nav (56px + safe area). On devices with home bars the last paragraph of the article is obscured.

The back button is 40×40px — slightly below the 48px minimum for a gym-use app.

### Fix
```css
@media (max-width: 640px) {
  .article-page {
    padding: 12px 16px calc(80px + env(safe-area-inset-bottom, 0px));
  }
  .article-back-btn {
    width: 48px;
    height: 48px;
    min-width: 48px;
    min-height: 48px;
    margin-bottom: 16px;
  }
}
```

---

## 14. Post Card — Name Row Overflow on Mobile

### File
`fit-app/src/app/features/social/components/post-card/post-card.component.css`

### Problem
`.post-card-name-row { flex-wrap: nowrap }` — the row containing author name, date, and a follow/menu button never wraps. On narrow screens (320–360px), a long author name combined with the date and a "Follow" button will overflow or cause the follow button to be pushed off-screen.

### Fix
```css
@media (max-width: 480px) {
  .post-card-name-row {
    flex-wrap: wrap;
    row-gap: 2px;
  }
  .post-card-author-name {
    max-width: 120px;       /* truncate long names on very small screens */
  }
  .post-card-follow-btn {
    margin-left: auto;
    flex-basis: auto;
  }
}
```

### Problem 2 — Menu button touch target on mobile
`.post-card-menu-btn` is 44×44px. This meets minimum but the effective tap area is tight given it sits at the end of a cramped row. The circular border-radius means corner areas are not tappable. Acceptable as-is — no change needed.

---

## 15. Z-Index Hierarchy (Consolidated Reference)

After applying all fixes, the z-index ladder for the social module on mobile must be:

| Layer | z-index | Element |
|---|---|---|
| Content | 1–99 | All page content |
| Fixed page elements | 10 | Post-detail composer (desktop sticky) |
| Bottom nav / top bar | 1000 | `.social-bottomnav`, `.social-topbar` |
| Post-detail composer (mobile) | 999 | Sits just below nav |
| Daily panel FAB | 1100 | `.daily-panel-fab` |
| Bottom nav backdrop (daily) | 1050 | `.daily-panel-backdrop` |
| Daily panel drawer | 1200 | `.daily-panel` at `< 1199px` |
| Dialogs / mat-overlays | 1300+ | Angular Material default (`1000` mat-dialog CDK, but should not conflict since we keep ours at 1200 max) |

**Important:** Angular Material's CDK overlay default z-index is `1000`. Since we set the bottom nav to `z-index: 1000`, it will compete with mat-menu dropdowns and mat-snackbar. To avoid this, either:
- Set the bottom nav to `z-index: 900` and the daily-panel-backdrop to `z-index: 950`, daily-panel to `z-index: 980`, FAB to `z-index: 970`
- OR keep nav at `z-index: 1000` and raise CDK overlays via global CSS: `.cdk-overlay-container { z-index: 1001 !important; }`

**Recommended:** Keep nav at `z-index: 900` and add `body { --cdk-z-index-overlay-container: 1000; }` or a global override, since the CDK overlay container handles all dialogs, menus, and toasts.

**Revised z-index ladder:**

| Layer | z-index |
|---|---|
| Page content | 1–50 |
| Post-detail composer (mobile fixed) | 800 |
| Bottom nav / top bar | 900 |
| Daily panel FAB | 920 |
| Daily panel backdrop | 930 |
| Daily panel drawer | 950 |
| Angular Material CDK overlay | 1000+ (default, unchanged) |

Apply these values accordingly across:
- `social-bottom-nav.component.css` → `z-index: 900`
- `social-top-bar.component.css` → `z-index: 900`
- `social-shell.component.css` `.daily-panel-fab` → `z-index: 920`
- `social-shell.component.css` `.daily-panel-backdrop` → `z-index: 930`
- `social-daily-panel.component.css` at `< 1199px` → `z-index: 950`
- `social-post-detail.component.css` `.post-detail-composer` mobile → `z-index: 800`

---

## 16. Summary: All Files to Edit

| File | Changes |
|---|---|
| `social-shell.component.css` | Move `slideUp` animation from `.social-shell` to `.social-content`; raise FAB z-index to 920, backdrop to 930; add flex column to `.social-content` and `.content-inner` on mobile |
| `social-bottom-nav.component.css` | Raise z-index to 900 |
| `social-top-bar.component.css` | Raise z-index to 900 |
| `social-top-bar.component.html` | Add `(click)="onNewPost()"` to the `+` button |
| `social-top-bar.component.ts` | Inject `MatDialog`, add `onNewPost()` method |
| `social-daily-panel.component.css` | Raise z-index to 950 at `< 1199px` |
| `social-feed.component.css` | Remove mobile FAB display; fix `.feed-header` padding on mobile |
| `social-discover.component.css` | Fix height/min-height conflict on follow buttons |
| `social-chat.component.css` | Fix `.conv-fab` bottom offset with safe-area; add header top padding on mobile |
| `social-chat-detail.component.css` | Fix height calculation for constrained chat view; fix back button touch target |
| `social-shell.component.css` | Add flex column to content-inner on mobile (for chat-detail height fix) |
| `social-post-detail.component.css` | Fix composer positioning on mobile; add padding to back button and comments |
| `social-notifications.component.css` | Increase bottom padding; fix `notif-mark-all` touch target |
| `social-profile.component.css` | Fix tab labels (remove `span { display: none }`, use column flex instead); overlay touch access on mobile; avatar edit overlay always visible on mobile; fix stats-tab bottom padding |
| `article-detail.component.css` | Fix bottom padding; fix back button size |
| `post-card.component.css` | Fix name-row overflow on narrow screens |
| `create-content.component.ts` + `social-bottom-nav.component.ts` + `social-top-bar.component.ts` | Mobile-aware dialog positioning |
| `styles.css` | Global panel class CSS for bottom-sheet dialogs on mobile |

---

## 17. UX Flow Fixes

### Chat Detail — Keyboard-aware composer
On mobile, when the virtual keyboard opens, it pushes the viewport up. With the composer `position: fixed` above the bottom nav, it will be lifted with the keyboard. This is the correct behavior. However the message area needs to shrink accordingly. Use:

```css
@media (max-width: 768px) {
  .chat-detail {
    height: 100%;
    /* Let the browser handle viewport resize via visual viewport API */
  }
  .msg-area {
    overscroll-behavior: contain;
  }
}
```

Optionally, in `SocialChatDetailComponent.ts`, listen to `window.visualViewport.resize` to adjust the composer offset when the keyboard appears. This is a progressive enhancement, not required for the initial fix.

### Post Detail — Tap to show comment delete button
`.comment-delete-btn { opacity: 0 }` is revealed on `.comment-row:hover`. On mobile, hover does not reliably fire. 

Fix: show delete button always on mobile (it only renders for own comments, so it is not a moderation concern):

```css
@media (max-width: 768px) {
  .comment-delete-btn {
    opacity: 1;
    color: rgba(255, 255, 255, 0.3);    /* subtle, not distracting */
  }
  .comment-delete-btn:active {
    color: var(--accent);
  }
}
```

### Discover Page — Search input on iOS
The `type="search"` input will show a native "search" keyboard on iOS. The `.discover-search-input::-webkit-search-cancel-button { display: none }` is already set, which prevents the iOS native X button from appearing (since we have our own clear button). This is correct.

Add `autocorrect="off" autocapitalize="none"` to the search input to prevent iOS from capitalizing search queries and autocorrecting athlete names — both of which break search functionality.

```html
<!-- In social-discover.component.html, on the input: -->
<input
  class="discover-search-input"
  type="search"
  placeholder="Search athletes by name..."
  autocomplete="off"
  autocorrect="off"
  autocapitalize="none"
  spellcheck="false"
  ...
/>
```

---

## Breakpoints Cheat Sheet (FitApp convention, confirmed from design system)

| Breakpoint | Value | Used for |
|---|---|---|
| Mobile | `max-width: 768px` | Show bottom nav / top bar; primary mobile layout switch |
| Narrow modal | `max-width: 640px` | Bottom sheet dialogs; single-column discover grid |
| Very narrow | `max-width: 480px` | Single column layouts; reduced font sizes |
| Very small | `max-width: 400px` | Profile grid 2-col fallback (already in place) |
| Tablet | `max-width: 968px` | Not directly used in social — desktop side-nav threshold |
| Wide panel | `max-width: 1199px` | Daily panel becomes a drawer |
