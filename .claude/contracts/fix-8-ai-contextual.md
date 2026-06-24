# API Contract: Fix 8 — AI as Contextual Layer, Not Dedicated Navigation Module

**Author:** @tech-architect  
**Date:** 2026-06-03  
**Status:** COMPLETE  
**ADR:** `.claude/decisions/fix-8-ai-contextual.md`  
**Sprint:** 3  
**Dependencies:** None (uses existing services internally)

---

## Status History

| Date | Status | Changed by | Note |
|---|---|---|---|
| 2026-06-03 | DRAFT | @tech-architect | ADR + contract created |
| 2026-06-03 | BACKEND_READY | @dotnet-developer | `ModuleContext` field + `BuildModuleContextAsync` implemented; zero-migration |
| 2026-06-03 | COMPLETE | @angular-developer | All frontend components implemented: `AiChatFabComponent`, `AiChatBottomSheetComponent`, `ModuleContext` type, `askText()`/`askAI()` updated, AI nav links removed from header, AI Chat History added to user-page sidebar + mobile tab, `ai-chat-sheet-panel` CSS added to styles.css, FAB registered in `app.component.html`. Zero `tsc --noEmit` errors. |

---

## IMPLEMENTED: 2026-06-03

**Modified endpoints:**

| Method | Route | Change |
|---|---|---|
| `POST` | `/api/ai/text` | Added optional `moduleContext` field to `AiTextRequest`; controller passes `userId` from JWT to `AskTextAsync`; `AiResponse` shape unchanged |

**Modified files:**
- `Models/DTOs/AiDtos.cs` — added `ModuleContext` with `[RegularExpression]` validation to `AiTextRequest`
- `Controllers/AiController.cs` — added `using System.Security.Claims`, `UserId` property, `ValidationProblem` guard, updated `AskTextAsync(req, UserId)` call
- `Services/AiProxyService.cs` — added `NutritionService`, `DailyDataService`, `AppDbContext` to primary constructor; changed `AskTextAsync` signature; added `BuildModuleContextAsync`, `BuildNutritionContextAsync`, `BuildWorkoutsContextAsync`, `BuildDashboardContextAsync`

**No migration.** No new entities. No new DI registrations.

**Privacy verification (completed):**
- ✅ `AiResponse` has NO new fields — context data is never returned to the client
- ✅ Context supplement injected into Groq request only — never stored in `ChatMessage` or any entity
- ✅ No health metrics (BMI, BMR, TDEE, GoalCalories, WeightKg, HeightCm) in any context string
- ✅ `BuildModuleContextAsync` logs at DEBUG only — no INFO-level exposure of user data
- ✅ `userId` extracted from JWT `sub` claim — never from request body
- ✅ Context injection failure degrades gracefully (try/catch → `LogWarning` → null → request proceeds without context)
- ✅ `moduleContext: null` or omitted → exact existing behavior preserved (backward compatible)

**Implementation notes:**
- `BuildNutritionContextAsync`: skips injection if no meals logged today (`TotalCalories == 0 && TargetCalories == 0`) — avoids confusing "0g protein" AI responses for new users
- `BuildWorkoutsContextAsync`: projects only `{ Title, Type, DurationMin }` from templates and `{ TemplateTitle, FinishedAt, SetsCompleted, DurationMin }` from sessions — no calorie columns loaded
- `BuildDashboardContextAsync`: uses existing `DailyDataService.GetStreakAsync` + a targeted projection on `DailyEntries` for today's steps/water/energy — skips if no data
- `"social"` context: static string, no DB query
- Energy level display: uses `/5` scale matching the `EnergyLevel` field range (1–5)

---

## Overview

Transforms the AI assistant from a standalone navigation module into a contextual layer
accessible from every authenticated screen. One existing endpoint is modified
(`POST /api/ai/text`) — all other AI/chat endpoints are unchanged. The modification adds
an optional `moduleContext` field to the request body. When set, the backend enriches the
Groq system prompt with the user's real data from the active module.

**Key constraint:** Context data (macro totals, workout details, daily stats) is injected
into the Groq system prompt **server-side only** — it is NEVER returned in the API response
and NEVER stored in chat message entities.

---

## Endpoints

| Method | Route | Auth | Change | Status |
|--------|-------|------|--------|--------|
| POST | `/api/ai/text` | Bearer | Add optional `moduleContext` field | **Modified** |
| POST | `/api/ai/image` | Bearer | No change | Unchanged |
| POST | `/api/ai/workout-calories` | Bearer | No change | Unchanged |
| GET | `/api/chat` | Bearer | No change (UI navigation change only) | Unchanged |
| GET | `/api/chat/{id}/messages` | Bearer | No change | Unchanged |
| POST | `/api/chat/{id}/messages` | Bearer | No change | Unchanged |
| DELETE | `/api/chat/{id}` | Bearer | No change | Unchanged |

---

## Endpoint 1 — POST /api/ai/text (modified)

### Change Summary

Add optional `moduleContext` field to `AiTextRequest`. When present and valid, the backend
loads the user's contextual data for the specified module and injects it as a system message
into the Groq LLM request. The `AiResponse` shape is **unchanged** — context data stays
server-side.

### Authentication

`Authorization: Bearer <token>` — required.  
UserId extracted from JWT `sub` claim. The controller passes `userId` to the service.

### Request Body — `AiTextRequest` (updated)

```json
{
  "prompt": "How am I doing with my protein today?",
  "systemPrompt": "You are a fitness assistant...",
  "moduleContext": "nutrition"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `prompt` | string | Yes | Non-empty | User's question to the AI |
| `systemPrompt` | string? | No | — | Client-provided system prompt (existing behavior, unchanged) |
| `moduleContext` | string? | No | Regex: `^(nutrition\|workouts\|dashboard\|social)$` | Module the user is currently viewing; triggers server-side context injection |

### Backward Compatibility

- `moduleContext` defaults to `null` when omitted
- `moduleContext: null` preserves exact existing behavior (no context injection)
- Existing clients that omit the field continue to work unchanged
- The `systemPrompt` field behavior is unchanged — it still sends the client's prompt as-is

### Server-Side Behavior

When `moduleContext` is non-null:

1. Controller extracts `userId` from JWT `sub` claim
2. Controller calls `aiProxy.AskTextAsync(req, userId)` (new signature)
3. Service calls `BuildModuleContextAsync(userId, moduleContext)` — a new private method
4. Returns a context supplement string (or `null` if no data available)
5. Context supplement is prepended as a `system` role message in the Groq messages array
6. Client's `systemPrompt` is added as a second `system` message (if present)
7. User's `prompt` is added as the `user` message
8. Full messages array is sent to Groq `TextModel`
9. Groq response is returned as-is in `AiResponse.Content`

**Message construction order:**
```
messages[0] = { role: "system", content: <moduleContext supplement> }  // only when moduleContext is set
messages[1] = { role: "system", content: <req.SystemPrompt> }         // only when systemPrompt is provided
messages[2] = { role: "user",   content: <req.Prompt> }
```

### Context Data per Module

| `moduleContext` | Data Source | Injected Supplement |
|---|---|---|
| `"nutrition"` | `NutritionService.GetTodayMacroProgressAsync(userId)` → `MacroProgressDto` | `"User's nutrition today: {TotalProtein}g protein of {TargetProtein}g target, {TotalCarbs}g carbs of {TargetCarbs}g, {TotalFat}g fat of {TargetFat}g. Total calories: {TotalCalories} of {TargetCalories} target."` |
| `"workouts"` | `db.WorkoutTemplates` (most recent non-archived) + `db.WorkoutSessions` (most recent) | `"User's workout context: Most recent workout template: '{Title}' ({Type}, {DurationMin} min). Last completed session: '{TemplateTitle}' on {FinishedAt:yyyy-MM-dd}, {SetsCompleted} sets, {DurationMin} min."` |
| `"dashboard"` | `DailyDataService.GetStreakAsync(userId)` → `StreakDto` + `db.DailyEntries` (today) | `"User's dashboard context: Current streak: {Current} days. Today: {Steps} steps, {WaterL}L water, energy {EnergyLevel}/10."` |
| `"social"` | None — static prompt | `"User is browsing the social feed. Respond about fitness community topics, motivation, or social engagement."` |
| `null` | — | No enrichment — prompt sent as-is (existing behavior) |

**Null-safety:** If a module's data query returns no results (e.g., no workout templates exist,
no daily entry for today), the `BuildModuleContextAsync` method returns `null` and no
context system message is prepended. The request proceeds with the client's system prompt only.

### Response — 200 OK — `AiResponse` (unchanged)

```json
{
  "content": "You're doing great on protein! You've hit 68g of your 150g target so far today..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `content` | string | AI-generated response text |

**CRITICAL:** The `AiResponse` has **NO new fields**. Context data (macro totals, workout
details, daily stats) is consumed by the LLM server-side and reflected only in the AI's
conversational response text. The raw structured data is never returned as a response field.

### Error Responses

| Status | Condition | Detail |
|--------|-----------|--------|
| 400 | Invalid `moduleContext` value | Regex validation failure |
| 401 | Missing/invalid JWT | Framework default |
| 500 | Groq API failure | ProblemDetails: "AI request failed. Please try again." |

### Example: Without moduleContext (unchanged behavior)

**Request:**
```json
{
  "prompt": "What are good sources of protein?",
  "systemPrompt": "You are a fitness assistant..."
}
```

**Response:**
```json
{
  "content": "TITLE:\nGreat Protein Sources\n\nDESCRIPTION:\nHere are some excellent sources of protein..."
}
```

### Example: With moduleContext = "nutrition"

**Request:**
```json
{
  "prompt": "How am I doing with my protein today?",
  "systemPrompt": "You are a fitness assistant...",
  "moduleContext": "nutrition"
}
```

**Server-side injection (NOT visible to client):**
```
System message 1: "User's nutrition today: 68g protein of 150g target, 120g carbs of 250g target, 45g fat of 65g target. Total calories: 1240 of 2172 target."
System message 2: "You are a fitness assistant..."
User message: "How am I doing with my protein today?"
```

**Response:**
```json
{
  "content": "TITLE:\nProtein Progress Update\n\nDESCRIPTION:\nYou've hit 68g of your 150g protein target so far today — that's about 45%. You're on a good pace if you have 2-3 meals left..."
}
```

### Example: With moduleContext = "workouts"

**Request:**
```json
{
  "prompt": "What should I focus on in my next session?",
  "systemPrompt": "You are a fitness assistant...",
  "moduleContext": "workouts"
}
```

**Server-side injection (NOT visible to client):**
```
System message 1: "User's workout context: Most recent workout template: 'Push Day' (strength, 45 min). Last completed session: 'Push Day' on 2026-06-02, 18 sets, 42 min."
System message 2: "You are a fitness assistant..."
User message: "What should I focus on in my next session?"
```

**Response:**
```json
{
  "content": "TITLE:\nNext Session Focus\n\nDESCRIPTION:\nBased on your last Push Day session (18 sets, 42 min), you hit good volume..."
}
```

---

## Request DTO

### Current `AiTextRequest` (before Fix 8)

```csharp
public class AiTextRequest
{
    public string Prompt { get; set; } = string.Empty;
    public string? SystemPrompt { get; set; }
}
```

### Modified `AiTextRequest` (after Fix 8)

```csharp
using System.ComponentModel.DataAnnotations;

namespace FitApp.Api.Models.DTOs;

public class AiTextRequest
{
    public string Prompt { get; set; } = string.Empty;
    public string? SystemPrompt { get; set; }

    /// <summary>
    /// Module the user is currently viewing when asking the AI.
    /// When non-null, the backend injects the user's real data into the Groq system prompt.
    /// Valid values: "nutrition" | "workouts" | "dashboard" | "social" | null.
    /// PRIVACY: the injected context data is server-side only — never returned in AiResponse.
    /// </summary>
    [RegularExpression("^(nutrition|workouts|dashboard|social)$",
        ErrorMessage = "moduleContext must be 'nutrition', 'workouts', 'dashboard', or 'social'.")]
    public string? ModuleContext { get; set; }
}
```

### Response DTO — `AiResponse` (unchanged)

```csharp
public class AiResponse
{
    public string Content { get; set; } = string.Empty;
    // NO new fields — context data is never returned
}
```

---

## Service Method Signatures

### Current `AiProxyService.AskTextAsync`

```csharp
public async Task<AiResponse> AskTextAsync(AiTextRequest req)
```

### Modified `AiProxyService.AskTextAsync`

```csharp
public async Task<AiResponse> AskTextAsync(AiTextRequest req, string userId)
```

**New parameter:** `userId` — extracted from JWT by the controller, passed to the service
so it can load the user's contextual data without the controller fetching it.

### New private method: `BuildModuleContextAsync`

```csharp
private async Task<string?> BuildModuleContextAsync(string userId, string moduleContext)
```

Returns a formatted context string for the specified module, or `null` if no data is
available. This string is prepended as a system message in the Groq messages array.

### Required DI additions to `AiProxyService`

Current constructor:
```csharp
public class AiProxyService(IConfiguration config, IHttpClientFactory httpFactory, ILogger<AiProxyService> logger)
```

Modified constructor:
```csharp
public class AiProxyService(
    IConfiguration config,
    IHttpClientFactory httpFactory,
    ILogger<AiProxyService> logger,
    NutritionService nutritionService,
    DailyDataService dailyDataService,
    AppDbContext db)
```

**Why these services:**
- `NutritionService` — for `GetTodayMacroProgressAsync(userId)` (nutrition context)
- `DailyDataService` — for `GetStreakAsync(userId)` (dashboard context)
- `AppDbContext` — direct query for `WorkoutTemplates` and `WorkoutSessions` (workouts context),
  and `DailyEntries` (dashboard context today row)

### Controller change: `AiController.AskText`

Current:
```csharp
[HttpPost("text")]
public async Task<IActionResult> AskText([FromBody] AiTextRequest req)
{
    var result = await aiProxy.AskTextAsync(req);
    return Ok(result);
}
```

Modified:
```csharp
private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)
    ?? User.FindFirstValue("sub")
    ?? throw new UnauthorizedAccessException();

[HttpPost("text")]
public async Task<IActionResult> AskText([FromBody] AiTextRequest req)
{
    try
    {
        var result = await aiProxy.AskTextAsync(req, UserId);
        return Ok(result);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "AI text request failed");
        return Problem("AI request failed. Please try again.", statusCode: 500);
    }
}
```

**Note:** Add `using System.Security.Claims;` to the controller imports.

---

## TypeScript Interfaces

### New type: `ModuleContext` (fit-app/src/app/core/models/groq-ai.model.ts)

```typescript
export type ModuleContext = 'nutrition' | 'workouts' | 'dashboard' | 'social';
```

Add to the existing `groq-ai.model.ts` file alongside `ChatMessage` and `ChatConversation`.

### No new response interfaces

The `AiResponse` interface (currently inline in `groq-ai-api.service.ts`) is unchanged:

```typescript
interface AiResponse {
  content: string;
}
```

---

## TypeScript API Service Changes

### File: `fit-app/src/app/api/groq-ai-api.service.ts`

#### Method: `askText` — add `moduleContext` parameter

**Current:**
```typescript
async askText(prompt: string): Promise<string> {
  const res = await firstValueFrom(
    this.http.post<AiResponse>(`${this.baseUrl}/text`, {
      prompt,
      systemPrompt: `${BASE_SYSTEM_PROMPT}\n\n${OUTPUT_FORMAT_PROMPT}`,
      temperature: 0.6,
    }),
  );
  return this.validateGenericResponse(res.content);
}
```

**Modified:**
```typescript
async askText(prompt: string, moduleContext?: ModuleContext): Promise<string> {
  const res = await firstValueFrom(
    this.http.post<AiResponse>(`${this.baseUrl}/text`, {
      prompt,
      systemPrompt: `${BASE_SYSTEM_PROMPT}\n\n${OUTPUT_FORMAT_PROMPT}`,
      moduleContext: moduleContext ?? null,
    }),
  );
  return this.validateGenericResponse(res.content);
}
```

**Changes:**
1. Add `moduleContext?: ModuleContext` optional parameter
2. Include `moduleContext` in POST body (null when unset — preserves existing behavior)
3. Import `ModuleContext` from `core/models/groq-ai.model`

---

## TypeScript Facade Changes

### File: `fit-app/src/app/core/facade/groq-ai.facade.ts`

#### Method: `askAI` — add `moduleContext` parameter

**Current:**
```typescript
async askAI(
  prompt: string,
  file?: File,
  imagePreview?: string,
): Promise<void> {
  // ...
  aiResponse = await this.groqService.askText(prompt);
  // ...
}
```

**Modified:**
```typescript
async askAI(
  prompt: string,
  file?: File,
  imagePreview?: string,
  moduleContext?: ModuleContext,
): Promise<void> {
  // ...
  aiResponse = await this.groqService.askText(prompt, moduleContext);
  // ...
}
```

**Changes:**
1. Add `moduleContext?: ModuleContext` optional parameter
2. Pass `moduleContext` to `groqService.askText()`
3. Image analysis (`analyzeImage`) is NOT affected — `moduleContext` only applies to text requests
4. Import `ModuleContext` from `core/models/groq-ai.model`

---

## Navigation Changes (frontend-only — no API changes)

These changes affect only the frontend UI. No backend endpoints are modified.

### Remove AI from primary navigation

| File | Element | Action |
|---|---|---|
| `shared/components/header/header.component.html` | "AI Assistant" desktop nav link (~line 46) | **Remove** |
| `shared/components/header/header.component.html` | "AI Assistant" mobile nav link (~line 182) | **Remove** |

### Keep `/ai-assistant` route

| File | Action | Reason |
|---|---|---|
| `app.routes.ts` | **No change** — keep the route entry | Backward compatibility for bookmarks/deep links |

### Add chat history to Profile section

| File | Element | Action |
|---|---|---|
| `features/user/user-page.component.ts` | "Chat History" card/button | **Add** — navigates to `/ai-assistant` or opens inline conversation list |

### Add persistent AI FAB

| Component | Location | Description |
|---|---|---|
| `AiChatFabComponent` | `core/components/ai-chat-fab/` | Fixed-position sparkle FAB, visible on all authenticated routes |
| `AiChatBottomSheetComponent` | `core/components/ai-chat-bottom-sheet/` | Context-aware chat interface opened by the FAB |

### FAB module context detection

The `AiChatFabComponent` determines `moduleContext` from the current router URL:

```typescript
import { ModuleContext } from '../../models/groq-ai.model';

private getModuleContext(): ModuleContext | null {
  const url = this.router.url;
  if (url.startsWith('/user-dashboard')) return 'dashboard';
  if (url.startsWith('/plans') || url.startsWith('/workout-session')) return 'workouts';
  if (url.includes('nutrition') || url.includes('meal')) return 'nutrition';
  if (url.startsWith('/social')) return 'social';
  return null;
}
```

This value is passed with every `askAI()` call from the bottom sheet chat.

### App shell integration

Render the FAB in the app shell (after `<router-outlet>`), conditionally visible when:
1. `authStore.authUser()` is non-null (user is logged in)
2. Current route is NOT `/login`, `/register`, or `/onboarding/*`

---

## New Frontend Components

### `AiChatFabComponent`

| Property | Value |
|---|---|
| **Selector** | `app-ai-chat-fab` |
| **Location** | `core/components/ai-chat-fab/` |
| **Standalone** | Yes |
| **Dependencies** | `Router`, `MatBottomSheet`, `AuthenticationStore` |
| **Behavior** | Fixed bottom-right button; sparkle icon (`auto_awesome`); opens `AiChatBottomSheetComponent` via `MatBottomSheet.open()` |
| **Context** | Reads `router.url` to determine `moduleContext`; passes to bottom sheet |
| **Visibility** | Hidden on guest routes (login/register/onboarding) |

### `AiChatBottomSheetComponent`

| Property | Value |
|---|---|
| **Selector** | (rendered via `MatBottomSheet`) |
| **Location** | `core/components/ai-chat-bottom-sheet/` |
| **Standalone** | Yes |
| **Dependencies** | `GroqAiFacade`, `MAT_BOTTOM_SHEET_DATA` |
| **Behavior** | Chat interface with message list (scrollable), text input, send button |
| **Context** | Receives `moduleContext` from FAB via `MAT_BOTTOM_SHEET_DATA` |
| **State** | Uses existing `GroqAiFacade` signals: `messages`, `loading`, `conversations`, `conversationId` |
| **Privacy** | Component NEVER fetches or displays macro data, workout data, or health metrics — it only sends `moduleContext` string |

---

## Notes for @dotnet-developer

### Implementation checklist:

- [ ] **`Models/DTOs/AiDtos.cs`** — Add `ModuleContext` property to `AiTextRequest` with `[RegularExpression]` validation
- [ ] **`Controllers/AiController.cs`** — Add `UserId` property (JWT `sub` claim extraction); modify `AskText` to call `aiProxy.AskTextAsync(req, UserId)`. Add `using System.Security.Claims;`
- [ ] **`Services/AiProxyService.cs`** — Major changes:
  - Add `NutritionService`, `DailyDataService`, `AppDbContext` to constructor DI
  - Change `AskTextAsync` signature to `AskTextAsync(AiTextRequest req, string userId)`
  - Add private method `BuildModuleContextAsync(string userId, string moduleContext)` per implementation in ADR
  - Modify `AskTextAsync` to prepend context system message when `moduleContext` is non-null

### Build verification:

After changes, verify:
- `POST /api/ai/text` with `moduleContext: null` or omitted — same behavior as before
- `POST /api/ai/text` with `moduleContext: "nutrition"` — enriched response referencing today's macros
- `POST /api/ai/text` with `moduleContext: "invalid"` — 400 validation error
- `AiResponse` shape is unchanged (no new fields)

### PRIVACY CHECKLIST (non-negotiable):

- [ ] Context data (macros, workout details, daily stats) is ONLY added as system messages to the Groq request
- [ ] `AiResponse` DTO has NO new fields — context data is never returned to the client
- [ ] Context data is NOT stored in `ChatMessage` entities — only the user's prompt and the AI's response text are stored
- [ ] No health metrics (BMI, BMR, TDEE, GoalCalories, weight, height) are included in any context supplement — only operational data (macro totals/targets, workout names/durations, steps/water)
- [ ] `BuildModuleContextAsync` does NOT log context strings at INFO level — use DEBUG only
- [ ] `AiController.AskText` extracts `userId` from JWT `sub` claim — never from request body

### No migration needed. No new entities. No new DI registrations.

`AiProxyService` is already registered as scoped. `NutritionService`, `DailyDataService`,
and `AppDbContext` are already registered. The only change is adding them to the
`AiProxyService` primary constructor.

---

## Notes for @angular-developer

### Implementation checklist:

- [ ] **`core/models/groq-ai.model.ts`** — Add `ModuleContext` type export
- [ ] **`api/groq-ai-api.service.ts`** — Add `moduleContext` parameter to `askText()` method; import `ModuleContext`
- [ ] **`core/facade/groq-ai.facade.ts`** — Add `moduleContext` parameter to `askAI()` method; pass to `groqService.askText()`; import `ModuleContext`
- [ ] **`shared/components/header/header.component.html`** — Remove "AI Assistant" nav links (desktop ~line 46, mobile ~line 182)
- [ ] **`features/user/user-page.component.ts`** — Add "Chat History" card/button linking to `/ai-assistant`
- [ ] **`core/components/ai-chat-fab/ai-chat-fab.component.ts`** — New standalone component: FAB with sparkle icon, route-based moduleContext detection, opens bottom sheet
- [ ] **`core/components/ai-chat-bottom-sheet/ai-chat-bottom-sheet.component.ts`** — New standalone component: chat interface bottom sheet using `GroqAiFacade` signals

### Integration:

- [ ] **App shell** — Render `<app-ai-chat-fab>` after `<router-outlet>`, conditional on `authStore.authUser()` being non-null and route not being login/register/onboarding
- [ ] **Route `/ai-assistant`** — Keep as-is (backward compat). No change to `app.routes.ts`

### Key notes:

- The FAB MUST NOT appear on `/login`, `/register`, or `/onboarding/*` routes
- The bottom sheet shares state with existing chat — same `GroqAiFacade` signals (`messages`, `loading`, `conversations`, `conversationId`)
- **CRITICAL:** The component NEVER fetches or passes macro data, workout data, or health metrics. It only sends `moduleContext: 'nutrition'` (a string enum). The backend handles all data loading.
- `moduleContext` is a transient value per request — NOT stored in any signal or state
- Image analysis calls (`analyzeImage`, `analyzeMealImage`) are not affected by this change — `moduleContext` only applies to text requests

---

## Notes for @uiux-designer

Design specs needed for:

1. **AI FAB** — size (56dp standard), position (bottom-right, 16px margin), icon (`auto_awesome` mat-icon), animation (subtle pulse on first visit), z-index layering, shadow treatment on dark `#0D0D10` surface
2. **AI Chat Bottom Sheet** — mobile-first layout, message bubbles (user vs AI), input area, context indicator ("Asking about your nutrition..." subtle label), close affordance, slide-up transition from FAB position
3. **Chat History in Profile** — card treatment, placement within user-page layout, conversation preview list
4. Follow design system: dark `#0D0D10`, primary `#7C4DFF`, accent `#FF4081`, Poppins, glassmorphism

---

## Privacy Verification Checklist

For @code-reviewer — verify each item before approving:

### Server-side (AiProxyService)
- [ ] `BuildModuleContextAsync` output is prepended as a system message to the Groq request ONLY
- [ ] `BuildModuleContextAsync` output is NOT stored in any entity (`ChatMessage`, etc.)
- [ ] `BuildModuleContextAsync` does NOT include BMI, BMR, TDEE, GoalCalories, WeightKg, or HeightCm
- [ ] `BuildModuleContextAsync` does NOT log at INFO level (DEBUG only)
- [ ] `AiResponse` has NO new fields after the change

### Controller
- [ ] `userId` is extracted from JWT `sub` claim, never from request body
- [ ] No new endpoints expose health data

### Frontend
- [ ] `AiChatBottomSheetComponent` does NOT fetch macro data, workout data, or health metrics
- [ ] `AiChatFabComponent` only derives a string enum from the route URL — no data fetching
- [ ] `askText()` sends only `{ prompt, systemPrompt, moduleContext }` — no health data in request body
- [ ] No social component imports `GroqAiFacade` or any AI-related service

### Chat storage
- [ ] Only `prompt` (user text) and `content` (AI response text) are stored in `ChatMessage` entities
- [ ] The context supplement string is NOT persisted anywhere

---

## Implementation Log

```
2026-06-03 - DRAFT created by @tech-architect
2026-06-03 - BACKEND_READY by @dotnet-developer — AiTextRequest.ModuleContext added,
             AiProxyService.BuildModuleContextAsync implemented for all 4 modules,
             AiController updated to pass userId from JWT. Zero new migrations.
```
