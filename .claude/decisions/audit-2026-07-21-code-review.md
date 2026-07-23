## Code Quality Audit — FitApp — 2026-07-21

Scope: read-only audit against CLAUDE.md mandates — TypeScript `any` usage, .NET async hygiene, `ProblemDetails` consistency, list-view loading/empty/error states, route lazy-loading, facade duplication, DTO/entity separation. No source files were modified.

---

### CRITICAL

- **fit-app** `fit-app/src/app/core/facade/workouts-tab.facade.ts:69-77` (also `getTemplate` L79-91, `createOrUpdateTemplate` L93-115, `deleteTemplate` L117-130)
  - Issue: `loadTemplates()` has no `try/catch` — only a bare `finally` that clears the loading flag:
    ```typescript
    async loadTemplates(): Promise<void> {
      this._loading.set(true);
      try {
        const templates = await this.workoutsSvc.listTemplates();
        this._templates.set(templates);
      } finally {
        this._loading.set(false);
      }
    }
    ```
    `WorkoutsTabFacade` has **no error signal at all** (confirmed: `grep -i error workouts-tab.facade.ts` → no matches), unlike every sibling facade (`NutritionTabFacade._error`, `SocialFeedFacade.feedError`, etc.). The caller, `workouts-tab.component.ts:87`, does `this.facade.loadTemplates().finally(() => this.loading.set(false))` with no `.catch()` either.
  - Impact: On any network/API failure, the rejection propagates as an **unhandled promise rejection** and `_templates` stays `[]`. The template (`workouts-tab.component.html:73-83`) has no error branch — it falls through straight to the empty-state branch ("No workouts yet — Click 'New workout' to create your first template"), actively telling the user they have no saved workouts when the real cause is a failed request. This directly violates the CLAUDE.md mandate: "Always: loading state, empty state, error state in every list view."
  - Fix:
    ```typescript
    private readonly _error = signal<string | null>(null);
    readonly error = this._error.asReadonly();

    async loadTemplates(): Promise<void> {
      this._loading.set(true);
      this._error.set(null);
      try {
        const templates = await this.workoutsSvc.listTemplates();
        this._templates.set(templates);
      } catch {
        this._error.set('Failed to load workouts. Please try again.');
      } finally {
        this._loading.set(false);
      }
    }
    ```
    …plus an `@if (facade.error() && !loading())` error block in `workouts-tab.component.html`, mirroring the pattern already used in `nutrition-tab`/`social-feed`/`social-notifications`.

---

### WARNING

- **fit-app** TypeScript strict mode violation — `: any` / `as any` — CLAUDE.md: "TypeScript strict — no `any`". 26 occurrences found across `fit-app/src`:
  - `api/blog.service.ts:15` `mapPost(d: any)`; `:42` `const dtos: any[]`
  - `api/nutrition-tab.service.ts:15` `normalizeType(raw: any)`; `:21` `mapMeal(d: any)`; `:23` `d.items.map((i: any) => ...)`; `:55` `const dtos: any[]`
  - `api/user.service.ts:66,78` `catch (err: any)`; `:108` `const dtos: any[]`; `:119` `mapDtoToProfile(dto: any)`; `:136` `mapDtoToDaily(d: any)`
  - `api/workouts-tab.service.ts:23` `normalizeType(raw: any)`; `:29` `mapTemplate(d: any)`; `:60` triple `(payload as any)?.cardio...`; `:79` `const dtos: any[]`
  - `features/user/workouts-tab/workouts-tab.component.ts:121` `togglePreview(w: any)`; `:127` `isExpanded(w: any)`; `:173` `} as any)`; `:191` `(item as any).notes`; `:244` `(e: any) => ...`; `:288` `createExerciseGroup(value?: any)`
  - `features/openai/groq/groq.component.ts:53` `onFileSelected(event: any)`
  - `features/onboarding/onboarding-wizard.component.ts:102` `...(current as any)`
  - `features/user/nutrition-tab/nutrition-tab.component.ts:152` `this.items.value as any[]`; `:245` `(raw.items as any[]).map(...)`
  - `shared/services/alert.service.ts:43` `(err as any).message`
  - Suggestion: highest-value fix first — the `mapXxx(d: any)` / `dtos: any[]` cluster in `api/*.service.ts` is the response-parsing boundary and should type against the backend DTO shape (or `unknown` + a type guard) since it's the widest blast radius (every list load in the app funnels through these). `catch (err: any)` should be `catch (err: unknown)` with a narrowing check. `workouts-tab.component.ts` has the highest concentration (6 occurrences) of any single file.

- **fit-app** Duplicated load/loading/error pattern across facades — same `set(true) → try → catch → set-error → finally set(false)` shape is hand-written 15+ times with no shared helper:
  - `core/facade/social-feed.facade.ts`: `loadFeed` (L37-60), `loadDiscover` (L64-86), `loadMyFollowingCount` (L90-100), `loadSuggestedUsers` (L106-117)
  - `core/facade/social-profile.facade.ts`: `loadProfile` (L52-67), `loadProfileWorkouts` (L76-86), `loadProfileBlogs` (L88-98), `loadArchivedPosts` (L100-110), `loadArchivedWorkouts` (L112-122), `loadFollowList` (L171-191), `loadPublicStats` (L208-220)
  - `core/facade/nutrition-tab.facade.ts`: `loadMeals` (L35-46)
  - Suggestion: extract a small helper (e.g. `runLoad(loadingSig, errorSig, fn, errorMsg)`) in `core/facade/` or a shared base class — would cut ~10 lines to ~2 per call site and guarantee the CRITICAL-item-style omission (as in `workouts-tab.facade.ts`) can't happen again. Not urgent, but worth doing opportunistically the next time one of these files is touched.

---

### ADVISORY

- **fit-app** `features/user/nutrition-tab/nutrition-tab.component.ts:44` — `loading = false` is a plain field manually flipped (`:83-84`), and the template reads it without a getter/signal convention mismatch vs. the rest of the codebase's Signals-first state (CLAUDE.md: "Signals for all reactive state"). Not a functional bug (default change detection picks it up), but drifts from convention — `WorkoutsTabFacade`/`NutritionTabFacade` already expose proper signals that could be surfaced directly instead of a shadow component field.
- **fit-app** `nutrition-tab.component.html:73-85` — when `meals.length > 0` but a background reload fails (e.g., after a delete triggers `loadMeals()` internally), `facade.error()` is set but the error branch only renders inside `app-nutrition-guided-empty`, which is gated on `meals.length === 0`. A failure with a non-empty stale list currently surfaces no error to the user. Minor — worth a follow-up only if this proves to be a real user complaint.
- **FitApp.Api** `Controllers/WorkoutsController.cs:14-15` and `Controllers/NutritionController.cs:16-17` use `User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!` (null-forgiving, no throw), while `SocialController.cs:14-17` and `ConversationsController.cs:19-22` throw `UnauthorizedAccessException` on the same lookup. Functionally harmless under `[Authorize]` (the claim is guaranteed present), but the inconsistency is worth unifying into one shared base-controller property so future controllers copy one pattern, not two.

---

### Verified OK

- **FitApp.Api** — no `.Result`, `.Wait()`, or `.GetAwaiter().GetResult()` anywhere in `FitApp.Api/` (full-tree grep, zero matches). Async/await hygiene is clean.
- **FitApp.Api** — `Program.cs:153` (`builder.Services.AddProblemDetails()`) + `Program.cs:257` (`app.UseExceptionHandler()`) give every unhandled exception a `ProblemDetails` response by default. `SocialController` and `ConversationsController` additionally wrap every action in explicit `try/catch` → `Problem(statusCode:, detail:)` with structured logging before falling back to a generic 500 message (no stack-trace/exception-message leakage on the 500 path). `WorkoutsController`/`NutritionController` skip local try/catch and rely on the global handler — that's an accepted, consistent pattern for simple CRUD, not an omission.
- **FitApp.Api** — spot-checked `UsersController`, `BlogController`, `SocialController`, `WorkoutsController`, `NutritionController`, `ConversationsController`: every action returns a DTO type (`UserProfileDto`, `BlogPostDto`, `WorkoutTemplateDto`, `MacroProgressDto`, etc.) or an anonymous projection — no EF entity is ever returned directly. DTOs/entities stay separated per CLAUDE.md.
- **fit-app** `app.routes.ts` (all 10 top-level routes) and `features/social/social.routes.ts` (all 8 child routes) — every route uses `loadComponent`/`loadChildren`; there is no eager `import` of a feature component anywhere in the routing table.
- **fit-app** List-view states — `social-feed`, `social-discover`, `social-chat` (conversation list), and `social-notifications` each correctly implement all three of loading (skeleton), empty (with a "guided" variant on feed), and error (with a Retry action) states, gated on mutually-exclusive signal conditions. These are the reference implementation the `workouts-tab` CRITICAL item above should be brought in line with.

---

### Overall verdict

One CRITICAL (silent error-swallowing + missing error state in the workouts list, the one list view that doesn't follow the pattern every other list view in the codebase already uses correctly) and two WARNINGs (widespread `any` usage undermining the "TypeScript strict" mandate, and a duplicated loading/error boilerplate pattern in facades). Backend async hygiene, `ProblemDetails` usage, DTO/entity separation, and route lazy-loading are all clean. Fix the `WorkoutsTabFacade` error handling before merge; the `any` cleanup and facade-helper extraction can be scheduled as follow-up work.

**Counts:** 1 critical, 2 warnings, 3 advisory, 5 verified-OK areas.
