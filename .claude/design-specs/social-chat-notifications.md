# UI Spec: Social Feed, Direct Messaging & Notifications
_Written by @uiux-designer — 2026-04-07_

---

## Component 1 — PostCard (Standalone, Reusable)

### User Story
As a user, I want to see fitness posts from athletes I follow so I can stay motivated and engaged.

### Layout
- Structure: flex column, gap 0, card pattern (glass morphism)
- Header row: avatar + meta + follow button
- Optional LinkedContentPreview block
- Content text block
- Optional image block
- Footer action row

### Visual Spec
- Container: `background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 16px;`
- Avatar: 36px circle, `border: 2px solid var(--primary); object-fit: cover;`
- Display name: 14px / 700 / `var(--white)`
- Timestamp: `.pill-subtle` — `font-size: 11px; color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.06); border-radius: 999px; padding: 2px 8px;`
- Follow button: `.btn-ghost` — hidden if own post or already following
- Content text: 14px / 400 / `var(--white-soft)`, `-webkit-line-clamp: 4`, "Show more" link in `var(--primary)`
- Image: `border-radius: 12px; max-height: 320px; width: 100%; object-fit: cover;`
- Footer: `display: flex; gap: 16px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06);`
- Like button: `mat-icon favorite_border` → `favorite` when liked, color `var(--accent)` when liked. Count 13px / 500
- Comment button: `mat-icon chat_bubble_outline`, count 13px / 500

### LinkedContentPreview (sub-component)
- Container: `background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 10px 14px; margin: 10px 0;`
- Type badge: `.pill` with semantic color (Workout→primary, Meal→success, Daily→info)
- Title: 13px / 700 / `var(--white)`
- Subtitle: 12px / 400 / `rgba(255,255,255,0.5)`
- Workout variant: type badge + name + duration chip
- Meal variant: calories number (16px/800/white) + macro mini-bar (protein=`--color-success`, carbs=`--color-info`, fats=`--color-warning`, widths proportional)
- Daily variant: steps count + net calories ring (simple CSS circle)

### States
- Loading: not applicable (parent handles skeleton)
- Like optimistic: toggle immediately, revert on API error
- Follow: ghost button → "Following" state, `var(--primary)` border
- Image error: fallback `rgba(255,255,255,0.04)` block with `mat-icon image_not_supported`

### Interactions
- Hover on card: `transform: translateY(-2px); border-color: rgba(255,255,255,0.12);` 0.2s ease
- Like tap: icon swap + count ±1, color transition 0.15s
- "Show more": inline expand, no navigation
- Comment button click: emit `commentClicked` output → parent navigates to post detail
- Avatar/name click: navigate to `/social/profile/{authorId}`

### Angular Material Components
- `mat-icon` for like, comment, follow icons
- `mat-icon-button` for action buttons

### CSS Classes
- `.post-card`, `.post-card-header`, `.post-card-avatar`, `.post-card-meta`
- `.post-card-follow-btn` (extends `.btn-ghost`)
- `.post-card-content`, `.post-card-content--clamped`, `.post-card-show-more`
- `.post-card-image`, `.post-card-footer`
- `.post-card-action-btn`, `.post-card-action-btn--liked`
- `.linked-content-preview`, `.linked-content-badge`, `.linked-content-macro-bar`

### Responsiveness
- Desktop: max-width 680px, full layout
- Mobile (<640px): padding reduced to 12px, image max-height 240px, footer buttons larger touch targets (48px min)

### Accessibility
- `aria-label="Like post"` / `aria-pressed="true/false"` on like button
- `aria-label="Comment on post"` on comment button
- `alt` on avatar image = author display name
- `role="article"` on card container

---

## Component 2 — Social Feed (/social)

### User Story
As a user, I want to see an infinite scroll feed of posts from athletes I follow.

### Layout
- Single column, max-width 680px, centered
- "New Post" button: top-right on desktop (inside feed header), fixed FAB on mobile
- Feed list: `display: flex; flex-direction: column; gap: 16px;`
- Sentinel div at bottom for IntersectionObserver

### Visual Spec
- Page header: "Feed" 22px/800 left + "+" button right (desktop only)
- New Post FAB (mobile): 56px circle, `background: linear-gradient(135deg, var(--primary), var(--accent))`, `position: fixed; bottom: 88px; right: 20px;` (above bottom nav)
- Loading more spinner: `mat-spinner diameter=32` centered below last post
- Page entrance: `animation: slideUp 0.35s ease-out both`

### States
- **Loading (initial):** 3 skeleton PostCards — `background: rgba(255,255,255,0.04); border-radius: 16px; height: 200px; animation: pulse 1.5s ease-in-out infinite;`
- **Empty:** `.empty` pattern — `mat-icon people` 40px / `rgba(255,255,255,0.18)` + "Follow athletes to see their posts" 15px/muted + Discover `.btn-primary` button
- **Error:** accent-colored banner `rgba(255,64,129,0.12)` + retry button
- **Loading more:** spinner below list, `hasMore = false` hides sentinel

### Interactions
- IntersectionObserver on sentinel: fires `loadMore()` when 200px from bottom
- Pull-to-refresh: not required (button at top instead)
- New Post FAB/button: opens Create Post modal (desktop) or bottom sheet (mobile)

### Angular Material Components
- `mat-spinner` for load-more indicator
- `mat-icon` for empty state and FAB

### CSS Classes
- `.feed-page`, `.feed-header`, `.feed-list`
- `.feed-skeleton`, `.feed-skeleton-card` with `@keyframes pulse`
- `.feed-sentinel`, `.feed-load-more`
- `.feed-fab` (mobile FAB)

### Responsiveness
- Desktop (>768px): "+" button in header, no FAB
- Mobile (<768px): FAB visible, header button hidden
- Single column always

---

## Component 3 — Create Post (Modal / Bottom Sheet)

### User Story
As a user, I want to share a fitness update with optional image and linked workout/meal/daily data.

### Layout
**Desktop (>640px):** centered modal, max-width 560px
**Mobile (<640px):** bottom sheet, `border-radius: 24px 24px 0 0`, max-height 90dvh, scrollable

### Visual Spec
- Backdrop: `rgba(0,0,0,0.65); backdrop-filter: blur(8px);`
- Box: `background: var(--surface); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 24px;`
- Title: "New Post" 20px/800
- Textarea: `mat-form-field appearance="outline"`, placeholder "What's your fitness update?", auto-grow
- Char counter: bottom-right of textarea, 13px — green 0-399, yellow 400-479 (`var(--color-warning)`), red 480+ (`var(--color-error)`)
- Image dropzone: `border: 1.5px dashed rgba(124,77,255,0.35); border-radius: 12px; padding: 24px; text-align: center;` + `mat-icon cloud_upload` + "Drag & drop or click"
- Image preview: thumbnail 80px + X button to remove
- "Share from your data" section: `mat-button-toggle-group` for type (Workout/Meal/Daily) + `mat-select` for specific item + live `LinkedContentPreview`
- Post button: `.btn-primary`, disabled+muted until content or image present, shows `mat-spinner diameter=18` while submitting

### States
- Empty form: Post button disabled (`opacity: 0.4; cursor: not-allowed`)
- Image selected: dropzone replaced by preview
- Link selected: LinkedContentPreview appears below selectors
- Submitting: button spinner, inputs disabled

### Interactions
- Mobile: `slideInSheet` 0.3s ease-out from bottom
- Desktop: `fadeIn` 0.2s
- Close: X button top-right, backdrop click (optional)
- Image drop: `dragover` → dropzone border color `var(--primary)`, brightness 1.1

### Angular Material Components
- `mat-form-field appearance="outline"` for textarea
- `mat-button-toggle-group` for type selector
- `mat-select` for item selector
- `mat-spinner` for submit loading
- `mat-dialog` for desktop, custom bottom sheet for mobile

### Responsiveness
- Desktop: modal 560px centered
- Mobile (<640px): bottom sheet, full-width, `border-radius: 24px 24px 0 0`

---

## Component 4 — Discover (/social/discover)

### User Story
As a new user, I want to discover athletes to follow and browse recent posts.

### Layout
- Section 1 "Athletes to Follow": section title + horizontal scroll strip
- Section 2 "Recent Posts": section title + 2-column grid

### Visual Spec
**UserCard (160px wide):**
- `background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 16px;`
- Avatar: 56px circle, purple border
- Name: 14px/700, centered
- Followers count: 12px/400/muted
- Follow button: `.btn-primary` small (36px height, `padding: 6px 16px`)
- After follow: `.btn-ghost` "Following"

**Horizontal strip:** `display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none;`
Fade-out gradient at right edge via `::after` pseudo-element

**Posts grid:** `display: grid; grid-template-columns: 1fr 1fr; gap: 12px;`
Compact PostCard: no linked content, text truncated to 2 lines, smaller image (160px max)

### States
- Loading: 4 skeleton UserCards + 4 skeleton grid cards with pulse animation
- Empty: `mat-icon explore` + "No athletes to discover yet"

### Angular Material Components
- `mat-spinner` for loading

### CSS Classes
- `.discover-page`, `.discover-section`, `.discover-section-title`
- `.user-card-strip`, `.user-card`, `.user-card-avatar`, `.user-card-follow-btn`
- `.discover-posts-grid`

### Responsiveness
- Desktop: 2-column grid for posts
- Mobile (<640px): single column grid for posts, UserCard strip scrolls same way

---

## Component 5 — Post Detail (/social/post/:id)

### User Story
As a user, I want to read the full post and all comments, and add my own comment.

### Layout
- Full PostCard at top (no follow button in header)
- Comments section header: "Comments (n)"
- Scrollable comment list
- Sticky composer bar at bottom

### Visual Spec
- Comments header: 16px/700, `.pill` with count
- Comment row: `display: flex; gap: 10px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.04);`
  - Avatar: 32px circle
  - Name: 13px/700
  - Content: 14px/400/`var(--white-soft)`
  - Timestamp: 11px/muted
  - Delete icon: `mat-icon delete_outline`, `color: var(--accent)`, visible on hover for own comments only
- Composer bar: `position: sticky; bottom: 0; background: rgba(13,13,16,0.95); backdrop-filter: blur(12px); padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.06);`
  - `mat-form-field appearance="outline"` full-width, placeholder "Add a comment..."
  - Send button: 44px circle, `background: var(--primary)`, `mat-icon send`

### States
- Loading: 4 skeleton comment rows
- Empty: `chat_bubble_outline` icon 32px + "Be the first to comment" 14px/muted (no icon, just text)
- Delete confirmation: `MatDialog` small confirmation (not native `confirm()`)
- Submitting comment: send button shows `mat-spinner diameter=18`

### Interactions
- Delete hover: icon appears with fade-in 0.15s
- Submit on Enter (no shift): sends comment
- Auto-scroll to latest comment after own submission

### Angular Material Components
- `mat-form-field appearance="outline"` for comment input
- `mat-dialog` for delete confirmation
- `mat-spinner` for submit loading

### Responsiveness
- Desktop: max-width 680px centered
- Mobile: full-width, composer bar above system nav

---

## Component 6 — Social Profile (/social/profile/:userId)

### User Story
As a user, I want to view an athlete's public profile, their stats, and follow them.

### Layout
- Profile header (avatar + name + bio)
- Stats row (3 equal columns)
- Action row (follow/message buttons)
- Posts 3-column grid

### Visual Spec
**Profile header:**
- Avatar: 88px circle, `border: 3px solid var(--primary); box-shadow: 0 0 20px var(--primary-glow);`
- Display name: 24px/800/`var(--white)`, centered
- Bio: 14px/400/`var(--white-soft)`, centered, max 2 lines

**Stats row:**
- Container: `display: grid; grid-template-columns: 1fr 1fr 1fr; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;`
- Each cell: `padding: 16px; text-align: center; border-right: 1px solid rgba(255,255,255,0.06);`
- Number: 22px/800/`var(--white)`
- Label: 11px/700/uppercase/`rgba(255,255,255,0.4)`/letter-spacing 0.05em

**Action row:**
- Follow/Unfollow: `.btn-primary` full-width on mobile, fixed-width on desktop
- Message: `.btn-ghost`
- Own profile: "Edit Profile" + "New Post" instead

**Posts grid:**
- `display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px;`
- Each cell: `aspect-ratio: 1; overflow: hidden;`
- Image: `width: 100%; height: 100%; object-fit: cover;`
- Text-only post: `background: rgba(255,255,255,0.04);` + first line of content, 12px/muted centered

### States
- Loading: skeleton header (avatar circle, name bar, stats row) + 9 skeleton grid cells
- Empty posts: `mat-icon photo_camera` + "No posts yet"
- Own profile + no posts: "Share your first post" CTA

### Interactions
- Stats row click: Followers → follower list modal, Following → following list modal (future)
- Post grid tap: navigate to `/social/post/{id}`
- Follow toggle: optimistic update

### Responsiveness
- Desktop: max-width 680px centered, action buttons side-by-side
- Mobile (<640px): action buttons full-width stacked

---

## Component 7 — Conversation List (/social/chat)

### User Story
As a user, I want to see all my direct message conversations with unread indicators.

### Layout
- Page header: "Messages" + new conversation FAB/button
- Scrollable list of ConversationRows
- Sentinel for potential infinite scroll (if many conversations)

### Visual Spec
**ConversationRow:**
- Height: 72px min, `padding: 12px 16px`
- Avatar: 44px circle
- Name: 14px/600 (700 if unread), `var(--white)`
- Last message preview: 13px/400/`rgba(255,255,255,0.45)`, truncated 1 line
- Timestamp: 11px/400/`rgba(255,255,255,0.35)`, right-aligned
- Unread badge: `background: var(--primary); color: var(--white); font-size: 11px/700; border-radius: 999px; min-width: 20px; height: 20px; padding: 0 5px;` max "99+"
- Hover: `background: rgba(255,255,255,0.04);` 0.15s
- Active/selected: `background: rgba(124,77,255,0.08); border-left: 3px solid var(--primary);`

**New conversation FAB:** 56px circle, `background: var(--primary)`, `mat-icon edit`, `position: fixed; bottom: 88px; right: 20px;`

### States
- Loading: 5 skeleton rows with pulse
- Empty: `mat-icon chat_bubble_outline` 40px/muted + "No conversations yet" + "Find Athletes" `.btn-primary`

### Angular Material Components
- `mat-icon` throughout
- Custom bottom sheet or `MatDialog` for new conversation (user search)

### Responsiveness
- Desktop: full-width list within social shell content area (max-width 680px)
- Mobile: full-screen list, FAB above bottom nav

---

## Component 8 — Conversation Detail (/social/chat/:id)

### User Story
As a user, I want to send and receive real-time direct messages with images.

### Layout
- Fixed header (60px): back arrow + avatar + name
- Scrollable message area (`flex: 1; overflow-y: auto`)
- Fixed composer bar at bottom

### Visual Spec
**Header:**
- `height: 60px; background: rgba(13,13,16,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.06);`
- Back: `mat-icon arrow_back`, `mat-icon-button`
- Avatar: 38px circle
- Name: 15px/700

**Message bubbles:**
- Own: `background: var(--primary); color: var(--white); border-radius: 18px 18px 4px 18px; padding: 10px 14px; max-width: 72%; align-self: flex-end;`
- Other: `background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px 18px 18px 4px; padding: 10px 14px; max-width: 72%; align-self: flex-start;`
- Timestamp: 10px/muted below bubble
- Deleted: `font-style: italic; color: rgba(255,255,255,0.3); font-size: 13px;` "Message deleted"

**Image message:** `border-radius: 12px; max-width: 240px; cursor: pointer;` + lightbox on tap

**Date separator:** `text-align: center; font-size: 12px; color: rgba(255,255,255,0.3); margin: 16px 0;` with flanking `rgba(255,255,255,0.06)` lines

**Composer bar:**
- `position: sticky; bottom: 0; background: rgba(13,13,16,0.95); backdrop-filter: blur(12px); padding: 10px 16px; border-top: 1px solid rgba(255,255,255,0.06);`
- Attach icon: `mat-icon-button attach_file`, 40px
- Textarea: `mat-form-field outline` auto-grow, max 4 rows
- Send button: 44px circle `background: var(--primary)`, `mat-icon send`
- Image preview strip: above composer when image selected, `border-radius: 8px; width: 64px; height: 64px; object-fit: cover;` + X button

**Lightbox:** `position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(12px); z-index: 1000;` image centered, tap to close

### States
- Loading: 6 skeleton bubbles alternating left/right, pulse animation
- Sending: send button spinner, message appears with `opacity: 0.6`
- Image uploading: progress indicator on image preview

### Interactions
- Auto-scroll to bottom on new message
- Send on Enter (Shift+Enter for newline)
- Long-press own message → `mat-menu` with Delete option

### Angular Material Components
- `mat-icon-button` for back, attach, send
- `mat-form-field appearance="outline"` for composer
- `mat-menu` for message options
- `mat-spinner` for send loading

### Responsiveness
- Mobile: full-screen, header 60px, composer above safe area
- Desktop: within social shell content area max-width 680px

---

## Component 9 — Notification Bell (in FitApp Header)

### User Story
As a user, I want to see real-time notifications for likes, comments, follows, and messages.

### Layout
- `mat-icon-button` in header nav
- Badge overlay (absolute positioned)
- Dropdown panel (below button, right-aligned)

### Visual Spec
**Bell button:**
- `mat-icon-button` with `notifications_none` / `notifications` / `notifications_active`
- Badge: `background: var(--primary); color: var(--white); font-size: 11px/700; min-width: 16px; height: 16px; border-radius: 999px; position: absolute; top: 4px; right: 4px;` max "9+"

**Dropdown panel:**
- `width: 280px; background: var(--surface); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; box-shadow: 0 12px 32px rgba(0,0,0,0.6); backdrop-filter: blur(12px);`
- `animation: slideUp 0.2s ease-out both`
- `max-height: 400px; overflow-y: auto;`

**"Mark all read" button:**
- Top of panel, right-aligned, 13px/600, `color: var(--primary)`, flat

**NotificationItem:**
- `padding: 12px 16px; display: flex; gap: 10px; align-items: flex-start;`
- Actor avatar: 32px circle + 16px type-icon overlay (Like=`var(--accent)`, Comment=`var(--color-info)`, Follow=`var(--color-success)`, Message=`var(--primary)`)
- Message: 13px/400/`var(--white-soft)`, actor name in 600
- Timestamp: 11px/`rgba(255,255,255,0.35)`
- Unread dot: 6px circle `var(--primary)`, absolute right
- Unread row background: `rgba(124,77,255,0.06)`
- Hover: `background: rgba(255,255,255,0.04);`

**Empty state:** "No notifications yet" 14px/muted centered, `padding: 32px`

### States
- No notifications: bell icon `notifications_none`, no badge
- Unread present: `notifications_active`, badge visible
- All read: `notifications`, no badge
- Dropdown loading: 3 skeleton rows

### Interactions
- Click bell: toggle dropdown
- Click outside: close dropdown
- Click notification: close dropdown + navigate to relevant route (post detail, profile, conversation)
- Mark all read: transitions all unread dots out 0.3s

### Angular Material Components
- `mat-icon-button` for bell
- `mat-icon` for notification type icons

### CSS Classes
- `.notif-bell-btn`, `.notif-badge`
- `.notif-dropdown`, `.notif-dropdown--open`
- `.notif-mark-all`, `.notif-list`
- `.notif-item`, `.notif-item--unread`, `.notif-item-avatar-wrap`, `.notif-item-type-icon`
- `.notif-item-body`, `.notif-item-message`, `.notif-item-time`, `.notif-item-dot`

### Responsiveness
- Desktop: dropdown right-aligned below bell, 280px
- Mobile (<480px): `position: fixed; bottom: 0; left: 0; right: 0; border-radius: 24px 24px 0 0;` full-width bottom sheet with backdrop

---

## Component 10 — Responsiveness Summary

| Rule | Mechanism |
|---|---|
| Feed/Discover/Profile: single column mobile | `max-width: 680px; width: 100%;` always single column |
| Profile posts grid: stays 3-col, smaller | grid stays `repeat(3, 1fr)`, cells scale with container |
| Chat: list and detail are separate full-screen on mobile | router navigation, no split-pane |
| Create post: bottom sheet on mobile | `position: fixed; bottom: 0; border-radius: 24px 24px 0 0` at `<640px` |
| Notification dropdown: full-width fixed bottom on mobile | `position: fixed; bottom: 0; left: 0; right: 0` at `<480px` |
| Social shell sidebar: hidden on mobile | `display: none` at `<768px` |
| Social shell top bar: mobile only | `display: none` at `>768px` |
| Social shell bottom nav: mobile only | `display: none` at `>768px` |
| Touch targets: all interactive ≥48px | `min-height: 48px` or `::before` hit area expansion |
| PostCard image: shorter on mobile | `max-height: 240px` at `<640px` |

---

## New CSS Classes Inventory

All classes are scoped to their component CSS files. None added to global `styles.css`.

| Class | Component | Purpose |
|---|---|---|
| `.post-card` | PostCard | Card container |
| `.post-card-header` | PostCard | Avatar + meta row |
| `.post-card-avatar` | PostCard | 36px avatar with purple border |
| `.post-card-content--clamped` | PostCard | 4-line clamp |
| `.post-card-show-more` | PostCard | Expand toggle |
| `.post-card-action-btn--liked` | PostCard | Accent color state |
| `.linked-content-preview` | PostCard | Sub-card container |
| `.linked-content-macro-bar` | PostCard | Nutrition mini-bar |
| `.feed-skeleton-card` | Feed | Pulse skeleton block |
| `.feed-sentinel` | Feed | IntersectionObserver target |
| `.feed-fab` | Feed | Mobile new post FAB |
| `.create-post-sheet` | CreatePost | Mobile bottom sheet |
| `.create-post-dropzone` | CreatePost | Dashed purple image zone |
| `.create-post-char-counter` | CreatePost | Live character count |
| `.user-card-strip` | Discover | Horizontal scroll container |
| `.user-card` | Discover | 160px athlete card |
| `.discover-posts-grid` | Discover | 2-col grid |
| `.post-detail-comments` | PostDetail | Comments section |
| `.comment-row` | PostDetail | Single comment |
| `.comment-delete-btn` | PostDetail | Hover-visible delete |
| `.post-detail-composer` | PostDetail | Sticky bottom bar |
| `.profile-avatar-ring` | Profile | 88px avatar + glow |
| `.profile-stats-row` | Profile | 3-col stats grid |
| `.profile-posts-grid` | Profile | 3-col square grid |
| `.profile-action-row` | Profile | Follow/message buttons |
| `.conv-row` | ConvList | Single conversation item |
| `.conv-row--unread` | ConvList | Bold name + badge |
| `.conv-row-badge` | ConvList | Purple unread count |
| `.conv-list-fab` | ConvList | New conversation FAB |
| `.msg-area` | ConvDetail | Scrollable message list |
| `.msg-bubble` | ConvDetail | Base bubble styles |
| `.msg-bubble--own` | ConvDetail | Right, primary bg |
| `.msg-bubble--other` | ConvDetail | Left, translucent bg |
| `.msg-bubble--deleted` | ConvDetail | Italic muted |
| `.msg-date-separator` | ConvDetail | Centered date pill |
| `.msg-composer` | ConvDetail | Sticky input bar |
| `.msg-image-preview` | ConvDetail | Pre-send image strip |
| `.msg-lightbox` | ConvDetail | Full-screen image view |
| `.notif-bell-btn` | NotifBell | Icon button wrapper |
| `.notif-badge` | NotifBell | Unread count pill |
| `.notif-dropdown` | NotifBell | Panel container |
| `.notif-item--unread` | NotifBell | Highlighted row |
| `.notif-item-type-icon` | NotifBell | 16px overlay icon |
| `.notif-item-dot` | NotifBell | 6px unread indicator |
