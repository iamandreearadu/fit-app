# NovaFit — Analyze Your Meal Full-Screen Page Implementation Plan

**Date:** 2026-07-28  
**Status:** Implemented  
**Scope:** Dashboard → Analyze your meal  
**Decision:** Replace the dashboard analyzer modal with a dedicated authenticated page.

## 1. Objective

Move the complete meal-analysis workflow out of the constrained dashboard modal and into a full-screen route that:

- uses normal page scrolling instead of nested modal scrolling;
- remains fully usable with the mobile keyboard open;
- gives the photo, description, barcode, results and detected foods enough space;
- preserves the current NovaFit dark glass visual language;
- keeps all existing AI, validation, save and add-to-today behavior;
- can be extended later without introducing new modal-height regressions.

## 2. Why a page is now the correct pattern

The analyzer is no longer a short confirmation flow. It contains:

1. input-mode selection;
2. photo selection and preview;
3. optional written meal description;
4. barcode scanning and manual barcode entry;
5. an asynchronous AI state;
6. nutrition totals;
7. expandable detected foods;
8. meal-type selection;
9. save/add actions and multiple error states.

This is a task flow, not a lightweight overlay. Keeping it in a modal introduces:

- nested scrolling;
- content hidden behind the mobile navigation;
- unstable modal height when results expand;
- difficult keyboard behavior;
- competing close, scroll and save interactions;
- insufficient horizontal and vertical space for result review.

## 3. Route decision

Add the authenticated lazy route:

```text
/user-dashboard/analyze-meal
```

Use this route instead of `/dashboard/analyze-meal` because the existing dashboard route is `/user-dashboard`. Register the more specific route before `/user-dashboard` in `app.routes.ts`.

Proposed route:

```ts
{
  path: 'user-dashboard/analyze-meal',
  loadComponent: () =>
    import('./features/dashboard/analyze-meal-page/analyze-meal-page.component')
      .then(m => m.AnalyzeMealPageComponent),
  canActivate: [AuthGuard],
}
```

The dashboard entry action navigates with:

```ts
state: { returnUrl: '/user-dashboard' }
```

Fallback return destination: `/user-dashboard`.

## 4. Information architecture

### Page shell

The page consists of:

1. standard top bar;
2. page content column;
3. analyzer input area;
4. result area, rendered only after analysis;
5. final action area, rendered only for a current valid result.

### Content order

```text
Back + Analyze your meal
Short supporting sentence

Photo | Barcode

[Photo / barcode input]
[Meal description]
[Analyze meal]

[AI result summary]
[Detected foods disclosure]
[Meal type]
[Save meal] [Add to today's meals]
```

This order follows the user's mental sequence: provide evidence → request analysis → review estimate → choose destination.

## 5. Responsive behavior

### Mobile

- True full-screen page using the application canvas.
- Standard top bar with circular Back action and title `Analyze your meal`.
- Hide the global bottom navigation and AI floating action button on this route.
- Page content scrolls through the browser/document only.
- Account for `env(safe-area-inset-bottom)`.
- Content width: `100%`.
- Horizontal padding: existing mobile page gutter, approximately `16px`.
- No modal backdrop, modal frame, fixed modal height or inner scrollbar.
- Input and result actions use a minimum 44px touch target.
- When a valid result exists, actions may use a bottom sticky glass action bar, but it must:
  - stay above the safe area;
  - never cover content;
  - include matching bottom content padding;
  - become normal-flow content when the keyboard is open or available height is small.

### Desktop

- Keep the normal desktop application header/navigation.
- Center the workflow in a `720–820px` maximum-width column.
- Use the dashboard background treatment across the entire page.
- Do not imitate a large modal on desktop.
- Result groups may use a two-column layout only where this improves comparison; detected foods remains a single readable list.
- Actions remain within the centered content column.

## 6. Visual direction

### Intent

The user may be standing near a meal and wants a quick but reviewable estimate. The page should feel calm, focused and credible rather than conversational or decorative.

### Domain

- meal evidence;
- portion estimation;
- ingredient recognition;
- nutrition totals;
- confidence and review;
- logging a daily habit.

### Signature

The page expands progressively from evidence into a compact nutrition readout. The photo/description remain visually connected to the resulting macro summary, making the result feel derived from the user's evidence rather than generated in an unrelated card.

### Existing defaults to reject

- oversized modal container → normal page canvas;
- several nested glass cards → open sections separated by spacing and subtle surface shifts;
- permanently sticky controls → sticky only after a valid result and only when it does not compete with the keyboard;
- decorative gradients → violet is reserved for mode, progress and primary action states.

### Tokens and styling

- Reuse existing NovaFit tokens from `.claude/design-system/tokens.md`.
- Canvas: same dark radial background used by the dashboard.
- Surface strategy: subtle dark glass shifts; no heavy borders.
- Typography: existing Poppins hierarchy.
- Spacing base: 4px, using the existing `8/12/16/24/32px` rhythm.
- Violet remains the only primary accent.
- Macro semantic colors remain:
  - protein: violet;
  - carbs: cyan;
  - fats: pink.
- Avoid adding page-specific hardcoded colors when a semantic token exists.

## 7. Component architecture

### New page container

Create:

```text
features/dashboard/analyze-meal-page/
  analyze-meal-page.component.ts
  analyze-meal-page.component.html
  analyze-meal-page.component.css
  analyze-meal-page.component.spec.ts
```

Responsibilities:

- own route/back-navigation behavior;
- render the focused page shell;
- coordinate successful save/add actions;
- refresh daily nutrition data after persistence;
- show operation-level success/failure feedback;
- decide whether unsaved work requires confirmation.

### Existing analyzer component

Continue reusing:

```text
daily-user-data/ai-meal-analyzer/
```

Refactor it into an embeddable workflow component:

- remove assumptions that it always lives inside a modal;
- keep image, description, barcode, analysis and result state inside it;
- keep its existing outputs initially to minimize regression risk;
- expose a read-only dirty/current-result state to the page container if needed;
- avoid route or dashboard persistence logic inside the analyzer.

Do not duplicate the analyzer markup in the new page.

### Persistence extraction

The current `persistAnalyzedMeal(...)` belongs to `DailyUserDataComponent`. Move the shared transformation/persistence behavior into the dashboard facade or a focused meal-log service so both the route page and dashboard data refresh use one implementation.

The extracted operation must:

- map detected foods into `MealEntry.items`;
- preserve total macro fallback when item details are absent;
- use the current dashboard date;
- preserve the selected meal type;
- return the saved entry or a typed failure;
- avoid duplicating nutrition totals.

After the new page owns the analyzer, remove:

- `AiMealAnalyzerComponent` from `DailyUserDataComponent.imports`;
- `showAnalyzeOverlay`;
- `openMealAnalyze()` / `closeMealAnalyze()`;
- analyzer modal markup;
- analyzer-modal-only CSS;
- parent analyzer handlers once their shared logic has moved.

## 8. Navigation and global chrome

### Dashboard entry point

Change the `Analyze your meal` button from toggling `showAnalyzeOverlay` to:

```ts
router.navigate(['/user-dashboard/analyze-meal'], {
  state: { returnUrl: router.url }
});
```

### Mobile top bar

Update `AppTopBarComponent`:

- `contextTitle()` returns `Analyze your meal` for the new route;
- `hideRightIcons()` returns true;
- the existing circular Back action is used;
- no duplicate title is rendered inside the page on mobile.

### Bottom navigation

Update `AppComponent.showBottomNav()` so it is false on the analyzer route.

### Other global floating UI

Hide `AiChatFabComponent` and Move Up control on this focused route if they visually or functionally conflict with the analyzer actions. Prefer one explicit global route-exclusion rule rather than component-specific CSS hiding.

## 9. State and back-navigation behavior

### State classification

The analyzer page is clean when:

- no image is selected;
- description is empty;
- no product/result exists.

It is dirty when the user has:

- selected a photo;
- entered a meaningful description;
- scanned/loaded a barcode product;
- generated an unsaved result.

### Back behavior

- Clean state: return immediately.
- Successfully added/saved state: return immediately.
- Dirty unsaved state: show the standard NovaFit glass confirmation dialog:
  - title: `Leave meal analysis?`
  - body: `Your photo, description and current estimate will be discarded.`
  - secondary: `Keep editing`
  - destructive/confirm: `Leave`

Use a route `CanDeactivate` guard or a page-owned navigation blocker so browser Back, top-bar Back and programmatic navigation behave consistently.

Do not show the confirmation while an upload/AI request can be safely cancelled; first cancel or ignore the pending result, then navigate.

### Refresh and deep links

- Direct access to `/user-dashboard/analyze-meal` must work.
- Refreshing the page resets local draft evidence; no draft persistence is required in phase one.
- A completed Add action returns to the dashboard and the dashboard reloads its current summary.

## 10. Loading, success and error states

### Photo preparation

- Keep the optimized object-URL preview.
- Show `Preparing photo` only until the browser decodes the preview.
- Prevent Analyze while the preview is preparing.

### AI analysis

- Keep the image overlay progress state.
- Keep the Analyze button progress label.
- Prevent repeated requests.
- If the user changes evidence after analysis, preserve the stale-result warning and disable final actions.

### Errors

- Validation errors remain inline next to the relevant input.
- AI errors remain inline in the analyzer.
- Persistence errors appear near final actions; do not rely only on toastr, especially because mobile toastr is intentionally hidden.
- Preserve user evidence after recoverable errors.

### Success

- `Add to today's meals`: save, refresh dashboard data, then return to dashboard.
- `Save meal`: retain the currently established product behavior unless separately changed; show a clear success state before returning.
- Prevent double submission while saving.

## 11. Scroll and keyboard contract

- Only the page/document scrolls.
- No `overflow: auto` on the analyzer root or result region.
- Detected foods expansion increases document height naturally.
- On analysis success, scroll/focus the result heading only if it is outside the viewport.
- On error, focus the inline error without jumping the page unnecessarily.
- Textarea uses at least 16px font size on mobile to prevent iOS zoom.
- Sticky actions must respond to `visualViewport`/layout naturally and must not sit above the keyboard as a detached overlay.
- Scrollbars may follow the application's invisible-scrollbar convention, but scrollability must remain available by touch, wheel and keyboard.

## 12. Accessibility requirements

- Page has one visible `h1` on desktop; the mobile top-bar title provides the route title while a visually hidden `h1` preserves document structure.
- Back control has an accessible name.
- Tabs retain correct active state and keyboard access.
- Loading regions use `aria-busy`.
- Status/error messages use appropriate live regions.
- Focus order follows visual order.
- Sticky actions remain reachable without trapping focus.
- All actions are at least 44×44px on touch devices.
- Text and controls meet WCAG 2.2 AA contrast.
- Motion respects `prefers-reduced-motion`.

## 13. Implementation phases

### Phase 1 — Route and shell

1. Add the authenticated lazy route.
2. Create `AnalyzeMealPageComponent`.
3. Add route-aware top-bar title/back behavior.
4. hide bottom navigation and conflicting floating UI.
5. Add page-level responsive shell and dashboard background.

### Phase 2 — Shared persistence

1. Extract analyzer-to-meal mapping from `DailyUserDataComponent`.
2. Add a facade/service operation for saving analyzed meals.
3. Cover item mapping, macro fallback and failure behavior with unit tests.
4. Use the new operation from the page.

### Phase 3 — Embed the analyzer

1. Render the existing analyzer inside the page.
2. Remove modal size/overflow assumptions from its CSS.
3. Add page presentation hooks only where necessary.
4. Preserve photo, description, barcode, stale result and detected-food behavior.

### Phase 4 — Navigation safety

1. Track dirty state.
2. Add the leave-confirmation flow.
3. Support top-bar Back, browser Back and direct navigation consistently.
4. Return to dashboard after successful final action.

### Phase 5 — Remove the modal

1. Change the dashboard action to route navigation.
2. Remove overlay state, handlers, template and obsolete CSS.
3. Remove unused imports.
4. Confirm there is only one analyzer entry implementation.

### Phase 6 — Polish and documentation

1. Validate mobile safe areas and keyboard behavior.
2. Validate desktop max-width and page hierarchy.
3. Update `.claude/design-system/components.md`.
4. Update `.claude/design-specs/dashboard-redesign.md`.
5. Update `CLAUDE.md` application structure and route documentation.
6. Write the implementation report in `.claude/plans`.

## 14. Test plan

### Route and shell

- unauthenticated access redirects according to `AuthGuard`;
- authenticated direct access renders the page;
- mobile top bar shows Back + `Analyze your meal`;
- right-side search/notification actions are hidden;
- bottom navigation is absent;
- desktop navigation remains available.

### Analyzer regression

- photo preview uses the optimized object URL;
- photo selection does not auto-analyze;
- description-only analysis works;
- photo-only analysis works;
- combined analysis sends one AI request;
- barcode flow still works;
- detected foods expands without nested scroll;
- edited evidence marks the result stale;
- clear resets all state.

### Persistence

- Add creates one daily meal and returns to dashboard;
- totals refresh after returning;
- save/add cannot be double-submitted;
- item-level macros map correctly;
- fallback item preserves aggregate macros;
- failure preserves the analysis and allows retry.

### Navigation

- Back leaves immediately when clean;
- Back prompts when dirty;
- Keep editing stays on the page with state intact;
- Leave discards state and returns;
- successful persistence does not show the dirty-state prompt.

### Responsive and accessibility

- test at 320, 360, 390, 430 and 768px widths;
- test desktop at 1024, 1440 and 1920px;
- textarea remains visible above the mobile keyboard;
- no content sits behind browser safe areas;
- no internal analyzer scrollbar;
- keyboard-only flow reaches all controls;
- focus and live status behavior is correct.

## 15. Verification commands

```powershell
cd fit-app
npx ng test --watch=false --browsers=ChromeHeadless `
  --include='src/app/features/dashboard/analyze-meal-page/analyze-meal-page.component.spec.ts' `
  --include='src/app/features/dashboard/daily-user-data/ai-meal-analyzer/ai-meal-analyzer.component.spec.ts'
npm run build
```

Run the relevant backend tests only if persistence/API code changes beyond frontend orchestration.

## 16. Acceptance criteria

- `Analyze your meal` opens `/user-dashboard/analyze-meal`.
- The analyzer is no longer rendered as a dashboard modal.
- Mobile uses the standard Back/title top bar and no bottom navigation.
- Desktop uses a centered readable workflow, not a modal simulation.
- The page has one natural scroll container.
- Expanded detected foods never create an inner scroll area.
- Photo, description, combined and barcode flows still work.
- Save/add behavior produces the same daily nutrition data as before.
- Dirty work is protected on navigation.
- Recoverable errors preserve user input.
- Relevant tests and production build pass.
- Design, structure and implementation documentation are updated.

## 17. Rollback boundary

Keep the migration isolated so it can be reverted cleanly:

- the existing analyzer component remains reusable;
- backend AI endpoints are unchanged;
- meal DTOs and persistence schema are unchanged;
- rollback requires restoring the dashboard modal wrapper and removing the route/page shell, not reverting the analyzer functionality developed so far.
