# NovaFit — AI Meal Description Analysis Implementation

**Date:** 2026-07-28  
**Status:** Completed  
**Scope:** Dashboard → Analyze your meal → Photo tab

## Outcome

Users can now estimate a meal's calories and macronutrients from:

- a photo;
- a written description;
- a photo and description together.

The feature reuses the existing review, meal-type selection, save, and add-to-today flows. A photo is no longer analyzed immediately after selection, so users can add useful context before making a single explicit request.

## Backend

- Added `AiMealDescriptionRequest` with required length validation and a 1,000-character limit.
- Added authenticated `POST /api/ai/meal-description`.
- Added a server-owned nutrition prompt that treats the description as untrusted meal data, estimates reasonable portions, and requests strict structured JSON.
- Added deterministic inference settings for nutrition estimation.
- Kept upstream failures sanitized and mapped timeout/upstream/internal failures to appropriate HTTP responses.
- Existing AI rate limiting applies to the new endpoint.

## Frontend service

- Consolidated meal inference behind `AiInferenceService.analyzeMeal(...)`.
- Description-only analysis uses `/api/ai/meal-description`.
- Image-only and combined analysis use `/api/ai/image`; combined analysis includes the description as additional meal context.
- Response normalization now trims food names, removes empty items, limits item count, and clamps confidence values.
- `GroqAiFacade` exposes the unified input contract while the legacy image helper remains compatible.

## Modal and interaction

- Added a compact, underline-only meal-description textarea below the image area.
- Added validation, character count, keyboard submission with Ctrl/Cmd + Enter, loading state, and an explicit Analyze action.
- Removing a selected photo preserves the written description.
- Clearing the form resets all evidence and results.
- Results show their source: photo, description, or photo + description.
- Editing the evidence after analysis marks the result as stale and prevents saving until re-analysis.
- Added accessible labels, live error feedback, focus transfer to result/error, and mobile-safe 44px actions.
- Removed the duplicate parent toast for inference failures; the modal remains the single error surface.

## Main files

- `FitApp.Api/Models/DTOs/AiDtos.cs`
- `FitApp.Api/Controllers/AiController.cs`
- `FitApp.Api/Services/AiProxyService.cs`
- `FitApp.Api.Tests/AiMealDescriptionTests.cs`
- `fit-app/src/app/api/ai-inference.service.ts`
- `fit-app/src/app/core/facade/groq-ai.facade.ts`
- `fit-app/src/app/features/dashboard/daily-user-data/ai-meal-analyzer/*`
- `fit-app/src/app/features/dashboard/daily-user-data/daily-user-data.component.*`

## Verification

- Backend release tests: **48 passed, 0 failed**.
- Targeted Angular analyzer tests: **6 passed, 0 failed**.
- Angular production build: **passed**.

