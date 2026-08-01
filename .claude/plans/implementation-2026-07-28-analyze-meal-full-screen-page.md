# NovaFit — Analyze Your Meal Full-Screen Page Implementation

**Date:** 2026-07-28  
**Status:** Completed  
**Route:** `/user-dashboard/analyze-meal`

## Outcome

`Analyze your meal` now opens a dedicated authenticated page instead of a dashboard modal. The workflow uses the full viewport, normal document scrolling and the existing analyzer for photo, description, combined and barcode analysis.

## Implemented

- Added a lazy authenticated analyzer route and page container.
- Added the standard mobile Back + title treatment.
- Hidden mobile bottom navigation, AI chat FAB and Move Up control on the focused route.
- Kept the desktop application header and centered content at a readable maximum width.
- Removed the analyzer modal state, markup, imports and modal-only CSS from `DailyUserDataComponent`.
- Changed the dashboard action to route navigation with a safe return URL.
- Extracted analyzed-meal mapping and persistence into `DashboardFacade.saveAnalyzedMeal`.
- Refreshes both the current nutrition summary and aggregated dashboard after saving.
- Added inline persistence errors that preserve the current analysis and re-enable final actions.
- Added analyzer dirty-state and save-completion APIs.
- Added a `CanDeactivate` guard with a NovaFit dark-glass discard confirmation.
- Protected accidental browser refresh when evidence or an unsaved result exists.
- Preserved the optimized object-URL image preview and all stale-result behavior.
- Added background AI-image preparation immediately after selection.
- Meal photos are resized to a maximum 1600px edge and encoded as JPEG at 84% quality when this produces a smaller payload.
- Prepared images are cached per selected `File`, so Analyze reuses the completed optimization rather than recompressing.
- Added 45-second image and 25-second text request timeouts with actionable inline errors.
- Added client and backend duration measurements without logging meal text or image data.
- Text-only nutrition analysis now uses production `openai/gpt-oss-20b` with low reasoning effort; Qwen 27B remains dedicated to vision.
- Client cancellation is propagated through the API to the Groq request.

## Responsive behavior

- Mobile renders directly on the dashboard canvas with `16px` gutters and safe-area bottom spacing.
- No modal height, overlay frame or analyzer-level scroll container remains.
- Desktop uses a restrained glass workspace in a centered `780px` column.
- Detected foods expand through normal page height.

## Main files

- `fit-app/src/app/features/dashboard/analyze-meal-page/*`
- `fit-app/src/app/features/dashboard/daily-user-data/ai-meal-analyzer/*`
- `fit-app/src/app/features/dashboard/daily-user-data/daily-user-data.component.*`
- `fit-app/src/app/core/facade/dashboard.facade.ts`
- `fit-app/src/app/app.routes.ts`
- `fit-app/src/app/app.component.*`
- `fit-app/src/app/shared/components/top-bar/app-top-bar.component.ts`
- `fit-app/src/app/core/components/ai-chat-fab/ai-chat-fab.component.ts`

## Verification

- Analyzer + page targeted Angular tests: **12 passed, 0 failed**.
- Backend tests: **48 passed, 0 failed**.
- Angular production build: **passed**.
