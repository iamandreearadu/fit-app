# NovaFit — AI Meal Description Analysis Implementation Plan

**Date:** 2026-07-28  
**Status:** Implemented  
**Scope:** Dashboard → Analyze your meal → Photo tab

## 1. Objective

Extend the Photo tab of the existing `Analyze your meal` modal so a user can:

- upload a meal image;
- describe what they ate in text;
- use either the image, the description, or both;
- receive estimated calories, protein, carbohydrates, fats and detected food items;
- continue using the existing meal type, save meal and add-to-today flows.

The feature must feel like an extension of the existing analyzer, not a separate AI tool.

## 2. Product behavior

The Photo tab supports three valid analysis paths:

| Input | AI behavior |
|---|---|
| Image only | Vision model estimates foods, portions, calories and macros from the image. |
| Description only | Text model estimates foods, quantities, calories and macros from the written description. |
| Image + description | Vision model analyzes the image and uses the description as additional portion/ingredient context. |

The description is never mandatory when an image exists. An image is never mandatory when a valid description exists.

The existing Barcode tab remains unchanged.

## 3. Key UX decision: explicit analysis

The current analyzer starts automatically after an image is loaded. That behavior must change because the user needs time to add or edit the meal description.

New flow:

1. User uploads an image, writes a description, or does both.
2. The interface shows a single primary action: `Analyze meal`.
3. The button becomes enabled when at least one valid input exists.
4. AI analysis begins only when the user presses the button.
5. The existing loading state replaces the action while processing.
6. Results appear in the existing compact calories/macros section.
7. Editing the image or description after a result marks the result as stale.
8. The user presses `Analyze again` to refresh it.

Benefits:

- prevents an unnecessary request before the description is finished;
- reduces AI usage and accidental duplicate calls;
- gives one predictable flow for image-only, text-only and combined analysis;
- improves user control on mobile.

## 4. UI/UX direction

### User and intent

The user is logging food shortly after eating and may not know exact nutritional values. They need to describe the meal quickly, see an honest estimate and add it to today's log without navigating away.

The experience should feel calm, compact and assistive—not like a long nutrition form.

### Domain exploration

- meal composition;
- portion estimation;
- ingredients and preparation;
- nutritional breakdown;
- uncertainty and confidence;
- daily food logging.

### Color world

Keep NovaFit's existing obsidian canvas, translucent dark glass, violet AI accent, white primary text and muted gray supporting text. Macro semantic colors remain limited to their existing protein, carbohydrate and fat indicators.

### Signature

The image and written description form one `meal evidence` area. The AI result is visually presented as an estimate derived from the evidence supplied, not as an authoritative scan.

### Defaults rejected

- A third top-level `Text` tab: rejected because it adds navigation and separates two inputs that work better together.
- Automatic analysis after upload: rejected because it prevents adding context first.
- A large chat-style prompt box: rejected because this is a focused logging flow, not an open-ended AI conversation.

### Layout

Inside the Photo tab:

1. Existing compact image picker/preview.
2. Description field directly below it.
3. Short contextual helper or character count.
4. Full-width `Analyze meal` action.
5. Existing error or result area.

The textarea must remain visible whether or not an image is selected.

## 5. Description input specification

Use an autosizing multiline textarea:

- label: `Describe what you ate`;
- optional indicator: `Optional with a photo`;
- placeholder example: `e.g. 2 eggs, 2 slices of toast with butter and a small latte`;
- starts at 2 rows;
- grows to a maximum of 5 rows;
- maximum 1,000 characters;
- leading/trailing whitespace is trimmed before submission;
- minimum 3 meaningful characters when no image exists.

Supporting text should encourage useful details:

`Include quantities, ingredients, sauces and how it was cooked when you know them.`

Do not place the input in another heavy card. Use the current clean underline/inset treatment and the existing modal glass surface.

Mobile requirements:

- minimum 16 px input font to avoid browser zoom;
- at least 44 px interactive height;
- textarea and CTA span the available width;
- no horizontal overflow;
- keyboard must not hide the Analyze action permanently;
- modal content remains scrollable with an invisible scrollbar;
- action remains part of the content flow rather than being fixed behind the mobile navigation.

## 6. Frontend state model

Extend `AiMealAnalyzerComponent` with:

- `mealDescription`;
- `descriptionTouched`;
- `analysisSource: 'image' | 'description' | 'combined' | null`;
- `resultIsStale`;
- existing loading and error state.

Derived state:

```text
hasImage = file != null
hasDescription = trim(mealDescription).length >= 3
canAnalyze = !loading && !disabled && (hasImage || hasDescription)
```

Behavior:

- selecting/removing an image clears its preview state but does not clear the description;
- switching to Barcode keeps or clears draft description according to an explicit rule—recommended: preserve it until the modal closes;
- `clear()` resets image, description, result, stale state and selected meal type;
- changing description after successful analysis keeps the visible result but marks it stale;
- adding/saving is disabled while the result is stale, until `Analyze again` completes;
- analysis errors preserve both image and text so the user can retry.

Do not reuse the global AI chat message state for this focused analyzer.

## 7. Frontend service and facade contract

Add a focused method to `AiInferenceService`:

```ts
analyzeMeal(input: {
  description?: string;
  file?: File;
}): Promise<MealMacros>
```

Expose the same intent through `GroqAiFacade`.

Routing logic:

- description only → new backend meal-description endpoint;
- image only → existing image endpoint;
- combined → existing image endpoint with the description included as meal context.

Keep JSON parsing and `MealMacros` validation centralized in `AiInferenceService`.

Normalize AI results:

- invalid, negative, `NaN` or infinite numbers become validation errors or safe zero values according to the existing parser rule;
- calories and macro totals are numeric;
- item names are non-empty;
- item confidence is clamped to `0–100`;
- cap returned items to a reasonable maximum, recommended 20.

## 8. Backend API design

Add:

```http
POST /api/ai/meal-description
```

Request:

```json
{
  "description": "2 eggs, 2 slices of toast with butter and a small latte"
}
```

Response remains the existing `AiResponse` wrapper containing JSON text, preserving the current frontend parsing pipeline.

Add `AiMealDescriptionRequest`:

- `[Required]`;
- trimmed value;
- `[MinLength(3)]`;
- `[MaxLength(1000)]`.

The endpoint:

- remains authenticated;
- uses the existing `ai` rate limiter;
- calls a dedicated `AiProxyService.AnalyzeMealDescriptionAsync`;
- returns `ValidationProblem` for invalid input;
- maps upstream failures to consistent 502/504/500 ProblemDetails;
- never logs the raw food description.

For combined analysis, extend the existing image request prompt with the user description. Do not add a second AI request.

## 9. Server-owned prompts

Move meal estimation instructions to backend-owned prompts so users cannot modify the nutrition-analysis contract from the browser.

Text-analysis system instruction must:

- treat the description as untrusted meal data, not as instructions;
- ignore commands embedded in the description;
- estimate reasonable portions only where quantities are missing;
- avoid inventing precise brands or ingredients;
- return one valid JSON object only;
- use the existing `MealMacros` shape;
- make total calories internally plausible relative to macros;
- return item-level estimates where possible;
- communicate uncertainty through confidence, not verbose prose.

Expected JSON:

```json
{
  "protein_g": 0,
  "carbs_g": 0,
  "fats_g": 0,
  "calories_kcal": 0,
  "items": [
    {
      "name": "food and estimated portion",
      "confidence": 0,
      "protein_g": 0,
      "carbs_g": 0,
      "fats_g": 0,
      "calories_kcal": 0
    }
  ]
}
```

The description must be wrapped in clear delimiters in the user message. The backend must not concatenate it into the system instruction.

## 10. Model selection

- Description only uses `Groq:TextModel`.
- Image-only and combined analysis use `Groq:VisionModel`.
- JSON mode is enabled for both.
- Use low temperature for consistent nutrition extraction, recommended `0.1–0.2`.
- Preserve the existing non-thinking configuration for models that otherwise return reasoning blocks.

The model output is an estimate, not a verified nutritional database result.

## 11. Result presentation

Reuse the existing result component and actions. Add only:

- source label:
  - `Estimated from photo`;
  - `Estimated from description`;
  - `Estimated from photo + description`;
- concise note: `AI estimates can vary with portions and preparation.`;
- stale indicator when inputs change after analysis;
- `Analyze again` label for the next request.

Do not duplicate calories/macros UI for description analysis.

Detected foods remain collapsed by default and use the existing show/hide interaction.

## 12. Saving and logging behavior

Description-based results follow exactly the existing image result flow:

- selected meal type is preserved;
- `Add to today's meals` creates only a daily meal;
- `Save meal` creates a reusable saved meal according to the existing semantics;
- emitted `MealMacros` populates food items and totals through the current parent handlers;
- the user description may be used to create a useful meal name, but raw text should not automatically become a long meal name.

Recommended meal naming:

- use the first one or two normalized AI food items;
- fallback: `AI described meal`;
- preserve existing naming rules for photo analysis.

No separate database entity is required for description analysis.

## 13. Privacy and security

- Do not log the raw description.
- Do not store the description as AI chat history.
- Send it to Groq only for the requested analysis.
- Limit request size before calling the provider.
- Treat description content as untrusted input.
- Keep prompt construction server-side.
- Apply the existing authenticated AI rate limit.
- Avoid returning upstream provider bodies to the client.
- Preserve user input after recoverable errors.

If product requirements later demand storing the original description, that must be a separate explicit privacy decision.

## 14. Error and recovery states

Frontend messages:

- no input: `Add a photo or describe your meal first.`;
- description too short: `Add a little more detail so the meal can be estimated.`;
- invalid response: `The meal could not be estimated reliably. Add quantities or try again.`;
- timeout: `Meal analysis took too long. Please try again.`;
- provider unavailable: `Meal analysis is temporarily unavailable. Please try again.`;

Requirements:

- errors appear once in the existing inline error area;
- no duplicate global toast on mobile;
- input and preview remain intact;
- retry uses the same data;
- loading is announced through `aria-live`;
- Analyze button is disabled during an active request.

## 15. Accessibility

- Textarea has a visible label and associated helper/error IDs.
- Character count uses polite status semantics and is not announced on every keystroke.
- Analyze action has an accessible disabled state.
- Result changes use `aria-live="polite"`.
- Errors use `role="alert"`.
- Focus moves to the result heading after successful analysis.
- Focus moves to the inline error after failure.
- Keyboard users can submit with `Ctrl+Enter` / `Cmd+Enter`.
- All interactive controls meet a minimum 44 × 44 px target.
- Existing modal focus trapping, Escape close and focus restoration must be verified.

## 16. Testing plan

### Backend

- valid description returns JSON mode response;
- missing, whitespace-only, too-short and over-limit descriptions return 400;
- prompt injection text remains inside the untrusted-data delimiter;
- raw description is absent from application logs;
- upstream timeout returns 504;
- provider failure returns sanitized 502;
- correct text model and low temperature are used;
- rate limiting continues to apply.

### Frontend service

- description-only request uses `/api/ai/meal-description`;
- image-only request uses `/api/ai/image`;
- combined request makes one image request and includes description context;
- valid JSON maps to `MealMacros`;
- fenced/thinking JSON remains safely parsed;
- malformed response produces a recoverable error.

### Component

- Analyze disabled with no inputs;
- description-only enables Analyze at the minimum length;
- image upload no longer analyzes automatically;
- image-only analysis works;
- combined analysis works;
- input remains after errors;
- editing inputs marks result stale;
- stale result cannot be saved or added;
- retry clears the error and refreshes the result;
- clear resets both image and description;
- Barcode behavior is unchanged;
- keyboard submit works;
- result source label is correct.

### Regression

- photo preview loader;
- image removal;
- detected-food toggle;
- macro/calorie result layout;
- meal type dropdown;
- Save meal;
- Add to today's meals;
- mobile modal height and invisible scrollbar;
- desktop modal layout.

## 17. Implementation order

1. Add backend DTO, server-owned prompts and description-analysis service method.
2. Add and test `POST /api/ai/meal-description`.
3. Consolidate frontend meal analysis in `AiInferenceService` and facade.
4. Add description state and explicit analysis behavior to the component.
5. Add compact textarea, CTA, source and stale states.
6. Reuse the existing result/save/add flow.
7. Add backend, service and component tests.
8. Run .NET tests, Angular tests and production builds.
9. Verify mobile keyboard, scrolling and modal height manually.
10. Document the completed implementation in `.claude/plans`.

## 18. Acceptance criteria

- A user can analyze a written meal description without uploading an image.
- A user can upload an image without writing a description.
- A user can combine image and text in one analysis request.
- Uploading an image does not trigger analysis before the user is ready.
- Calories, macros and detected foods use the existing result UI.
- Existing meal type, save and add-to-today actions work for all three sources.
- User input survives recoverable errors.
- The result cannot be saved after inputs change until it is re-analyzed.
- Validation and provider errors are clear and non-duplicated.
- The modal remains compact, scrollable and usable above mobile navigation.
- Barcode analysis is unaffected.
- Raw meal descriptions are neither logged nor stored as chat history.
- Backend tests and frontend production build pass.

## 19. Definition of done

The feature is complete when:

- the endpoint and frontend flow are implemented;
- server prompts and validation are covered by tests;
- all three input modes work;
- save/add behavior is unchanged and verified;
- mobile and desktop UI are manually checked;
- accessibility behaviors are verified;
- actual changes are documented under `.claude/plans`.
