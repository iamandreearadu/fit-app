# ADR: Fix 8 — AI as Contextual Layer, Not Dedicated Navigation Module

**Author:** @tech-architect  
**Date:** 2026-06-03  
**Status:** DRAFT  
**Sprint:** 3  
**Related:** `.claude/contracts/fix-8-ai-contextual.md`, `.claude/plans/ux-audit-implementation-plan.md` (Fix 8)

---

## Context

### The Problem

AI Chat is a top-level navigation item (`/ai-assistant`) alongside Dashboard, Workouts,
and Nutrition. Users must remember it exists and navigate to it intentionally. AI usage is
curiosity-driven, not habit-driven. The AI meal analyzer and workout calorie estimator —
both high-value features — are buried behind deliberate discovery. DAU on AI features is
low despite high intrinsic value.

Critically, the AI assistant has zero awareness of what the user is currently doing. A
user in the Nutrition module asking "How am I doing today?" gets a generic response because
the Groq system prompt has no context about their current macro progress. A user in the
Workouts module asking "What should I do differently?" gets no reference to their actual
workout data.

### Current State

```
Navigation: Dashboard | Workouts | Nutrition | AI Assistant | Profile
                                                ↑ dedicated route
Route: /ai-assistant (lazy-loaded OpenaiComponent)
Backend: POST /api/ai/text — accepts { prompt, systemPrompt }
         Frontend sends systemPrompt from ai-prompts.ts (static, no user context)
History: GET/POST/DELETE /api/chat — AI conversation CRUD
```

The frontend currently composes the entire `systemPrompt` client-side from static constants
in `ai-prompts.ts` and sends it with every `POST /api/ai/text` request. The backend simply
passes it through to Groq. No user-specific context is ever injected.

### Desired State

```
Navigation: Dashboard | Workouts | Nutrition | Profile
                                                ↳ "AI Chat History" secondary action
AI FAB: Persistent sparkle icon (bottom-right) on every authenticated screen
        Tap → context-aware bottom sheet chat
Backend: POST /api/ai/text — accepts { prompt, systemPrompt, moduleContext }
         When moduleContext is set, backend injects user's real data into Groq prompt
         Context data stays server-side — never returned in API response
History: GET/POST/DELETE /api/chat — unchanged API, moved to Profile section in UI
```

---

## Decision

### 1. Remove AI Chat from primary navigation — route change only

Remove the `/ai-assistant` link from the main header navigation (both desktop sidebar and
mobile bottom nav). The route itself (`/ai-assistant`) remains functional for deep-link
backward compatibility but is no longer discoverable from primary nav.

AI chat history (`GET /api/chat`, `GET /api/chat/{id}/messages`) moves to a secondary
action in the Me/Profile section — a "Chat History" button or card. **This is a frontend
navigation change only. The backend API endpoints are unchanged.**

### 2. Add `moduleContext` parameter to `POST /api/ai/text`

Extend the existing `AiTextRequest` DTO with an optional `moduleContext` field:

```
"nutrition" | "workouts" | "dashboard" | "social" | null
```

When `moduleContext` is non-null, the backend enriches the Groq system prompt with the
user's real data before sending to Groq. **The enriched data is never returned in the API
response** — it is injected server-side into the LLM prompt and stays there.

### 3. Server-side context injection — data stays on the server

This is the most critical architectural decision. The context data (today's macro totals,
workout template names, last session stats) is loaded by the backend service, formatted
into a system prompt supplement, and prepended to the LLM messages array. It never appears
in the `AiResponse.Content` as structured data — it only influences the LLM's response.

**Why server-side, not client-side:**
1. **Privacy enforcement** — the frontend never needs to know the user's exact macro data
   to ask the AI a question. The data stays in the backend service layer.
2. **No new public endpoints** — we don't need `GET /api/nutrition/today/macro-progress`
   to be called from the AI chat component. The data is read internally by
   `AiProxyService`.
3. **Prompt consistency** — the backend controls the exact format and boundary of the
   context injection. The frontend can't accidentally misconstruct or leak the prompt.
4. **Code reviewer checkability** — all context data flows through one method
   (`BuildModuleContext`) that can be audited for health metric leaks.

### 4. Persistent AI FAB — frontend-only component

A floating action button (sparkle/AI icon) rendered at the app shell level, visible on
every authenticated screen. Tapping opens a bottom sheet with a context-aware chat
interface. The FAB reads the current route to determine `moduleContext` and passes it
with every `POST /api/ai/text` call.

---

## Clean Architecture Boundaries

- **Controller responsibility:** HTTP binding only — the `AiController.AskText` action
  extracts `userId` from JWT and passes the full `AiTextRequest` (now including
  `moduleContext`) to `AiProxyService`. The controller does NOT load macro data or workout
  data.
- **Service responsibility:** `AiProxyService.AskTextAsync` is extended to accept a
  `userId` parameter. When `moduleContext` is non-null, it calls a new private method
  `BuildModuleContextAsync` which loads data from `NutritionService` / `WorkoutService` /
  `DailyDataService` and formats it into a system prompt supplement. This supplement is
  prepended to the messages array sent to Groq.
- **What stays out of controllers:** No data loading, no prompt construction, no context
  enrichment.
- **What stays out of components:** No macro data fetching for AI purposes. The component
  only sends `moduleContext: 'nutrition'` — the backend handles the rest.
- **What stays out of API responses:** The enriched system prompt and all context data
  (macro totals, workout names, session stats) are NEVER included in `AiResponse`.

---

## Data Model

### No New EF Entities

No schema changes. The `moduleContext` parameter is transient request data — it tells the
backend what to load, not what to store.

### Modified DTO: `AiTextRequest`

```csharp
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
    [RegularExpression("^(nutrition|workouts|dashboard|social)$")]
    public string? ModuleContext { get; set; }
}
```

### No change to `AiResponse`

```csharp
public class AiResponse
{
    public string Content { get; set; } = string.Empty;
    // NO new fields — context data is never returned
}
```

### TypeScript Interface Update (groq-ai.model.ts or ai.model.ts)

```typescript
export type ModuleContext = 'nutrition' | 'workouts' | 'dashboard' | 'social';
```

---

## API Contract

| Method | Route | Auth | Change | Status |
|--------|-------|------|--------|--------|
| POST | `/api/ai/text` | Bearer | Add `moduleContext` to request body | Modified |
| POST | `/api/ai/image` | Bearer | No change | Unchanged |
| POST | `/api/ai/workout-calories` | Bearer | No change | Unchanged |
| GET | `/api/chat` | Bearer | No change (navigation change only) | Unchanged |
| GET | `/api/chat/{id}/messages` | Bearer | No change | Unchanged |
| POST | `/api/chat/{id}/messages` | Bearer | No change | Unchanged |
| DELETE | `/api/chat/{id}` | Bearer | No change | Unchanged |

### POST /api/ai/text (modified)

**Change:** Add optional `moduleContext` field. When present AND a valid JWT is provided,
the backend enriches the Groq system prompt with the user's contextual data.

**Request body — `AiTextRequest` (updated):**
```json
{
  "prompt": "How am I doing with my protein today?",
  "systemPrompt": "You are a fitness assistant...",
  "moduleContext": "nutrition"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `prompt` | string | Yes | — | User's question |
| `systemPrompt` | string? | No | — | Client-provided system prompt (existing) |
| `moduleContext` | string? | No | `nutrition` \| `workouts` \| `dashboard` \| `social` | Current module for context injection |

**Server-side behavior when `moduleContext` is set:**

The backend calls `BuildModuleContextAsync(userId, moduleContext)` which returns a
context supplement string. This string is prepended to the system messages sent to Groq.

**Context data loaded per module:**

| moduleContext | Data loaded | Source | Injected as |
|---|---|---|---|
| `"nutrition"` | Today's macro totals + targets | `NutritionService.GetTodayMacroProgressAsync(userId)` | `"User's nutrition today: {totalProtein}g protein of {targetProtein}g target, {totalCarbs}g carbs of {targetCarbs}g, {totalFat}g fat of {targetFat}g. Total calories: {totalCalories} of {targetCalories} target."` |
| `"workouts"` | User's most recent workout template name + last session summary | `db.WorkoutTemplates` query (most recent non-archived) + `db.WorkoutSessions` query (most recent) | `"User's most recent workout template: '{title}' ({type}, {durationMin} min). Last completed session: {sessionDate}, {setsCompleted} sets, {durationMin} min."` |
| `"dashboard"` | Today's daily entry (steps, water, energy) + streak | `DailyDataService` + `DailyDataService.GetStreakAsync(userId)` | `"User's today: {steps} steps, {waterL}L water, energy level {energyLevel}/10. Current streak: {streak} days."` |
| `"social"` | No user data injected | — | `"User is browsing the social feed. Respond about fitness community, motivation, or social engagement."` |
| `null` | No enrichment | — | Prompt sent as-is (existing behavior) |

**CRITICAL PRIVACY CONSTRAINT:**
The context supplement is injected into the **Groq system prompt only**. It is:
- ✅ Sent to Groq as part of the `messages` array (system role)
- ❌ NEVER returned in `AiResponse.Content` as structured data
- ❌ NEVER stored in `ChatMessage` entities (only the user's prompt and AI's response text are stored)
- ❌ NEVER logged at INFO level (use DEBUG only, with PII redaction in production)

**Response — unchanged:**
```json
{
  "content": "You're doing great on protein! You've hit 68g of your 150g target so far today..."
}
```

The AI's response text may reference the context data conversationally (e.g., "you've hit
68g protein") — this is intentional and expected. The privacy constraint is that the raw
context data (macro totals, workout details) is never returned as structured fields in the
response DTO.

### Error Responses — unchanged

| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid JWT |
| 500 | Groq API failure |

---

## Navigation Changes (frontend-only, no backend changes)

### Remove from primary navigation

| Element | Current location | Action |
|---|---|---|
| "AI Assistant" link | Header desktop sidebar + mobile bottom nav | **Remove** |
| `/ai-assistant` route | `app.routes.ts` | **Keep** (backward compat) but no nav link |

### Add to Me/Profile section

| Element | Location | Action |
|---|---|---|
| "Chat History" | `features/user/user-page.component` | **Add** — button/card linking to `/ai-assistant` or opening inline chat history |

### Add persistent AI FAB

| Element | Location | Description |
|---|---|---|
| `AiChatFabComponent` | App shell (after `<router-outlet>`) | Fixed-position sparkle icon, bottom-right, visible on all authenticated routes |
| `AiChatBottomSheetComponent` | Opened by FAB | Context-aware chat bottom sheet with message input |

### Chat history API — no change

`GET /api/chat`, `GET /api/chat/{id}/messages`, `POST /api/chat/{id}/messages`,
`DELETE /api/chat/{id}` — all endpoints remain exactly as-is. The only change is where
the frontend renders the conversation list UI (moved from dedicated `/ai-assistant` page
to a secondary section in Profile).

---

## Frontend Architecture

### New components:

| Component | Location | Description |
|---|---|---|
| `AiChatFabComponent` | `core/components/ai-chat-fab/` | Persistent FAB — sparkle icon, fixed bottom-right, opens bottom sheet |
| `AiChatBottomSheetComponent` | `core/components/ai-chat-bottom-sheet/` | Context-aware chat interface — message list, input, send button |

### Modified files:

| File | Change |
|---|---|
| `shared/components/header/header.component.html` | Remove "AI Assistant" nav link (both desktop + mobile) |
| `api/groq-ai-api.service.ts` | Add `moduleContext` parameter to `askText()` method |
| `core/facade/groq-ai.facade.ts` | Add `moduleContext` parameter to `askAI()`, pass current route context |
| `features/user/user-page.component` | Add "Chat History" card/button linking to conversation list |
| `app.routes.ts` | Keep `/ai-assistant` route (backward compat) — no change needed |

### Module context detection:

The `AiChatFabComponent` determines `moduleContext` from the current route:

```typescript
private getModuleContext(): ModuleContext | null {
  const url = this.router.url;
  if (url.startsWith('/user-dashboard')) return 'dashboard';
  if (url.startsWith('/plans') || url.startsWith('/workout-session')) return 'workouts';
  if (url.includes('nutrition') || url.includes('meal')) return 'nutrition';
  if (url.startsWith('/social')) return 'social';
  return null;
}
```

This value is passed with every `POST /api/ai/text` call from the bottom sheet.

### Signal/state:

No new signals needed. The bottom sheet chat uses the existing `GroqAiFacade` signals
(`messages`, `loading`, `conversations`, `conversationId`). The `moduleContext` is a
transient value per request, not stored state.

---

## Instructions for @dotnet-developer

### Files to modify:

1. **`Models/DTOs/AiDtos.cs`** — Add `ModuleContext` field to `AiTextRequest` with regex
   validation (`^(nutrition|workouts|dashboard|social)$`)
2. **`Controllers/AiController.cs`** — Modify `AskText` action to extract `userId` from
   JWT and pass it to `AiProxyService.AskTextAsync`:
   ```csharp
   private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)
       ?? User.FindFirstValue("sub")
       ?? throw new UnauthorizedAccessException();

   [HttpPost("text")]
   public async Task<IActionResult> AskText([FromBody] AiTextRequest req)
   {
       var result = await aiProxy.AskTextAsync(req, UserId);
       return Ok(result);
   }
   ```
3. **`Services/AiProxyService.cs`** — Major changes:
   - Change `AskTextAsync` signature to `AskTextAsync(AiTextRequest req, string userId)`
   - Add DI for `NutritionService`, `AppDbContext` (for workout queries),
     `DailyDataService`
   - Add private method `BuildModuleContextAsync(string userId, string moduleContext)`
   - When `moduleContext` is non-null, call `BuildModuleContextAsync` and prepend the
     result as an additional system message before the client's `systemPrompt`

### New private method in `AiProxyService`:

```csharp
private async Task<string?> BuildModuleContextAsync(string userId, string moduleContext)
{
    switch (moduleContext)
    {
        case "nutrition":
            var macros = await nutritionService.GetTodayMacroProgressAsync(userId);
            return $"User's nutrition today: {macros.TotalProtein}g protein of {macros.TargetProtein}g target, " +
                   $"{macros.TotalCarbs}g carbs of {macros.TargetCarbs}g, " +
                   $"{macros.TotalFat}g fat of {macros.TargetFat}g. " +
                   $"Total calories: {macros.TotalCalories} of {macros.TargetCalories} target.";

        case "workouts":
            var template = await db.WorkoutTemplates.AsNoTracking()
                .Where(w => w.UserId == userId && !w.IsArchived)
                .OrderByDescending(w => w.UpdatedAt)
                .Select(w => new { w.Title, w.Type, w.DurationMin })
                .FirstOrDefaultAsync();
            var session = await db.WorkoutSessions.AsNoTracking()
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.FinishedAt)
                .Select(s => new { s.TemplateTitle, s.DurationMin, s.SetsCompleted, s.FinishedAt })
                .FirstOrDefaultAsync();
            var parts = new List<string>();
            if (template is not null)
                parts.Add($"Most recent workout template: '{template.Title}' ({template.Type}, {template.DurationMin} min).");
            if (session is not null)
                parts.Add($"Last completed session: '{session.TemplateTitle}' on {session.FinishedAt:yyyy-MM-dd}, {session.SetsCompleted} sets, {session.DurationMin} min.");
            return parts.Count > 0
                ? "User's workout context: " + string.Join(" ", parts)
                : null;

        case "dashboard":
            var streak = await dailyDataService.GetStreakAsync(userId);
            var today = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");
            var daily = await db.DailyEntries.AsNoTracking()
                .FirstOrDefaultAsync(d => d.UserId == userId && d.Date == today);
            var dashParts = new List<string>();
            dashParts.Add($"Current streak: {streak.Current} days.");
            if (daily is not null)
                dashParts.Add($"Today: {daily.Steps} steps, {daily.WaterL}L water, energy {daily.EnergyLevel}/10.");
            return "User's dashboard context: " + string.Join(" ", dashParts);

        case "social":
            return "User is browsing the social feed. Respond about fitness community topics, motivation, or social engagement.";

        default:
            return null;
    }
}
```

### Message construction in `AskTextAsync`:

```csharp
public async Task<AiResponse> AskTextAsync(AiTextRequest req, string userId)
{
    var messages = new List<object>();

    // 1. Module context (server-side only — never returned to client)
    if (!string.IsNullOrEmpty(req.ModuleContext))
    {
        var context = await BuildModuleContextAsync(userId, req.ModuleContext);
        if (!string.IsNullOrEmpty(context))
            messages.Add(new { role = "system", content = context });
    }

    // 2. Client system prompt (existing behavior)
    if (!string.IsNullOrEmpty(req.SystemPrompt))
        messages.Add(new { role = "system", content = req.SystemPrompt });

    // 3. User prompt
    messages.Add(new { role = "user", content = req.Prompt });

    return await CallGroqAsync(config["Groq:TextModel"]!, messages);
}
```

### PRIVACY CHECKLIST (non-negotiable):
- [ ] Context data (macros, workout details, daily stats) is ONLY added as system messages to the Groq request
- [ ] `AiResponse` DTO has NO new fields — context data is never returned to the client
- [ ] Context data is NOT stored in `ChatMessage` entities — only the user's prompt and the AI's response text
- [ ] No health metrics (BMI, BMR, TDEE, GoalCalories, weight) are included in any context supplement — only operational data (macro totals/targets, workout names/durations, steps/water)
- [ ] `BuildModuleContextAsync` does NOT log context strings at INFO level — use DEBUG only

### No migration needed. No new entities.

---

## Instructions for @angular-developer

### Files to modify:

1. **`shared/components/header/header.component.html`** — Remove "AI Assistant" nav links
   from both desktop sidebar (line ~46) and mobile bottom nav (line ~182)
2. **`api/groq-ai-api.service.ts`** — Modify `askText()` to accept and send `moduleContext`:
   ```typescript
   async askText(prompt: string, moduleContext?: ModuleContext): Promise<string> {
     const res = await firstValueFrom(
       this.http.post<AiResponse>(`${this.baseUrl}/text`, {
         prompt,
         systemPrompt: `${BASE_SYSTEM_PROMPT}\n\n${OUTPUT_FORMAT_PROMPT}`,
         moduleContext: moduleContext ?? null,
       })
     );
     return this.validateGenericResponse(res.content);
   }
   ```
3. **`core/facade/groq-ai.facade.ts`** — Modify `askAI()` to accept and pass
   `moduleContext`
4. **`core/models/groq-ai.model.ts`** — Add `ModuleContext` type:
   ```typescript
   export type ModuleContext = 'nutrition' | 'workouts' | 'dashboard' | 'social';
   ```
5. **`features/user/user-page.component`** — Add "Chat History" card/button that navigates
   to `/ai-assistant` or opens a chat history panel inline

### New components:

6. **`core/components/ai-chat-fab/ai-chat-fab.component.ts`** — Standalone component:
   - Fixed position FAB (bottom-right, z-index above content, below modals)
   - Sparkle/auto_awesome mat-icon
   - Visible on all authenticated routes (rendered in app shell, hidden on guest routes)
   - Hidden when bottom sheet is open
   - `@HostListener('click')` opens `AiChatBottomSheetComponent`
   - Determines `moduleContext` from current `Router.url`

7. **`core/components/ai-chat-bottom-sheet/ai-chat-bottom-sheet.component.ts`** — Standalone:
   - Full bottom sheet chat interface (MatBottomSheet or custom overlay)
   - Message list (scrollable, auto-scroll to bottom)
   - Text input + send button
   - Reads `moduleContext` from the FAB that opened it
   - Passes `moduleContext` with every `askAI()` call
   - Uses existing `GroqAiFacade` signals for messages/loading/conversations
   - Close button / swipe-down to dismiss
   - Chat history toggle to browse past conversations

### Integration:

8. **App shell** — Render `<app-ai-chat-fab>` after `<router-outlet>` in the main app
   component, conditional on `authStore.authUser()` being non-null
9. **Route `/ai-assistant`** — Keep as-is for backward compatibility. Users who bookmarked
   it can still access it. The `OpenaiComponent` remains functional.

### Key notes:
- The FAB must NOT appear on the `/login`, `/register`, or `/onboarding/*` routes
- The bottom sheet shares conversation state with the existing chat history — same
  `GroqAiFacade` signals
- **CRITICAL:** The `moduleContext` value is a simple string enum derived from the route.
  The component NEVER fetches or passes macro data, workout data, or any health metric
  to the bottom sheet. The backend handles all context loading.

---

## Instructions for @uiux-designer

Design specs needed for:

1. **AI FAB** — size, position, icon, animation (pulse on first visit?), z-index layering
   relative to other FABs/bottom sheets, shadow treatment on dark surface
2. **AI Chat Bottom Sheet** — layout (mobile-first), message bubbles, input area, context
   indicator ("Asking about your nutrition..." subtle label), close affordance, transition
   animation (slide up from FAB position)
3. **Chat History in Profile** — card treatment, placement within user-page layout, how
   many recent conversations to preview
4. Follow existing design system: dark #0D0D10, primary #7C4DFF, accent #FF4081, Poppins,
   glassmorphism

---

## Consequences & Trade-offs

### What we gain
- **Context-aware AI** — the assistant knows what the user is doing right now and can give
  specific, actionable responses ("You've hit 68g of your 150g protein target")
- **Zero-navigation AI access** — the FAB is always visible, one tap to ask
- **Server-side privacy enforcement** — context data loaded and consumed server-side only.
  The frontend sends a string enum, not health data.
- **No new endpoints** — modifies one existing endpoint, adds one field
- **No migration** — no schema changes
- **Backward compatible** — `moduleContext: null` preserves exact existing behavior

### What we accept
- **Additional DB queries per AI request** — when `moduleContext` is set, each `POST
  /api/ai/text` call triggers 1–2 extra DB queries (e.g., `GetTodayMacroProgressAsync`).
  These are lightweight single-row aggregates. Acceptable latency impact: <50ms added to a
  Groq call that takes 1–3 seconds.
- **Groq token usage increase** — the context supplement adds ~50–100 tokens to the system
  prompt. Marginal cost increase at current Groq pricing.
- **AI response may conversationally reference private data** — the AI might say "You've
  eaten 1,240 calories today." This is visible in the chat UI (which is private to the
  authenticated user) and stored in `ChatMessage.Content` (also private). This is the
  intended behavior — the privacy constraint is that the raw data never appears as
  structured API response fields.
- **`/ai-assistant` route stays but is unlinked** — a dead route that users who
  bookmarked it can still reach. It will be removed in a future cleanup sprint.

### Privacy constraints (re-stated for @code-reviewer)
1. `BuildModuleContextAsync` output — injected into Groq system prompt ONLY. Never
   returned in `AiResponse`, never stored as a separate field, never logged at INFO.
2. `AiResponse` shape — UNCHANGED. No new fields. The context data is consumed by the LLM
   and reflected only in the AI's conversational response text.
3. Health metrics excluded from context — `BuildModuleContextAsync` loads operational data
   only (macro totals, workout names, steps). It does NOT inject BMI, BMR, TDEE,
   GoalCalories, WeightKg, or HeightCm into the Groq prompt.
4. `ChatMessage` storage — only the user's prompt text and the AI's response text are
   stored. The context supplement is never persisted.
