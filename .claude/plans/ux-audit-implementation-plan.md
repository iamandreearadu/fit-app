# UX Audit Implementation Plan — May 2026

## Source audit
.claude/ux-audits/full-platform-audit.md

## Status
- [ ] Sprint 1 — Weeks 1–2 — Foundation & Quick Wins
- [ ] Sprint 2 — Weeks 3–4 — Core Loop Repair
- [ ] Sprint 3 — Weeks 5–6 — Onboarding & AI Restructure
- [ ] Sprint 4 — Weeks 7–8 — Social Layer & Polish

---

## THE AGENT TEAM

| Agent               | Role                                              | Model              |
|---------------------|---------------------------------------------------|--------------------|
| @product-strategist | Business validation, feature prioritization       | claude-opus-4-6    |
| @tech-architect     | ADRs, API contracts, architecture decisions       | claude-opus-4-6    |
| @uiux-designer      | UI specs, UX flows, component designs             | claude-sonnet-4-6  |
| @dotnet-developer   | Backend: entities, services, controllers          | claude-sonnet-4-6  |
| @angular-developer  | Frontend: models, facades, components, routes     | claude-sonnet-4-6  |
| @code-reviewer      | Architecture, security, performance review        | claude-sonnet-4-6  |

Standard workflow: @product-strategist → @tech-architect → @uiux-designer → @dotnet-developer → @angular-developer → @code-reviewer

---

## TECH STACK CONSTRAINTS — NEVER VIOLATE

- Frontend: Angular 19, Signals + Facade pattern. Components NEVER call API directly.
- Backend: .NET 10 / ASP.NET Core, clean architecture. Controllers thin. Logic in Services. EF entities never in API responses — always DTOs.
- Database: SQLite via EF Core 10.
- Real-time: SignalR — already live for chat and notifications. Leverage for streak updates and post-completion events.
- AI: Groq API — already integrated for text, vision, workout calorie estimation.
- Auth: JWT HS256 — user ID ALWAYS from token, NEVER from request body.
- Privacy absolute: BMI, body weight, goal calories, BMR, TDEE NEVER in social or public endpoints.
- Design: Dark-only #0D0D10, primary #7C4DFF, accent #FF4081, Poppins, glassmorphism. CSS variables for all colors — hardcoded hex is a code review failure.
- Every data view: three states — loading skeleton, empty (with converting CTA), error + retry.
- Touch targets: minimum 48×48px.

---

## THE 10 FIXES

### FIX 1 — Food database integration
**Priority:** CRITICAL | **Effort:** L | **Sprint:** 1 (start) → 2 (complete)
**Problem:** No food database. Users must manually enter protein/carbs/fat/calories per food item. Day-2 churn driver — users who attempt nutrition logging more than twice without autofill abandon permanently and never return.
**Fix:** Integrate Open Food Facts API (free, no API key required) for food search with macro autofill. Add "Recent foods" list (last 10 logged items) at the top of Add Meal screen. Keep manual entry as fallback. Barcode scanning is follow-up P2.
**Success metric:** Nutrition log completion rate on day 2 and day 7.

### FIX 2 — Share to beSocial at workout/meal completion
**Priority:** HIGH | **Effort:** M | **Sprint:** 2
**Problem:** beSocial is a separate navigation shell. Users who complete a workout or log a meal must intentionally navigate to beSocial and manually construct a post. Share rates are near zero. Social sharing is the primary viral loop for organic growth.
**Fix:** After workout save AND after meal save, trigger a "Share to beSocial?" bottom sheet with a pre-composed post preview — workout stats (duration, exercises, estimated calories) or meal macros auto-populated. One-tap publish, one-tap dismiss. Zero navigation required.
**Success metric:** Posts per DAU ratio. Week-1 vs week-4 share rate.

### FIX 3 — Post-log reward & feedback loop
**Priority:** HIGH | **Effort:** M | **Sprint:** 2
**Problem:** After saving a workout or meal, users get a toast notification and return to a list view. No calorie burn summary, no streak update, no progress visualization. The habit loop has no closing beat — no dopamine hit, no acknowledgment that the action mattered.
**Fix:** Post-workout: slide-up summary card showing duration, exercises completed, AI-estimated calories burned (Groq, already integrated), streak counter incrementing live via SignalR. Post-meal: animated macro progress bars updating in real time showing % of daily protein/carbs/fat targets hit. Both screens include optional share CTA (connects to Fix 2).
**Success metric:** Day-7 retention rate. Workout log frequency per user per week.

### FIX 4 — Onboarding aha moment restructure
**Priority:** HIGH | **Effort:** M | **Sprint:** 3
**Problem:** Onboarding collects 7+ fields (height, weight, age, gender, goal, activity level, dietary preference) before showing any value. The first genuine aha moment — personalized TDEE, BMR, BMI, goal calories — is buried after form completion. No value preview, no progressive reward, no guided first action. Research shows 60–70% abandonment on progressive forms longer than 4 steps with no perceived payoff.
**Fix:** (1) Add 2-screen "what you'll get" carousel before registration showing NovaFit's value props. (2) Split profile setup: collect only email + password + primary goal at registration. (3) Collect biometrics (height, weight, age, activity level) on first login as a distinct second step. (4) End with a full-screen "Your Numbers" reveal screen: TDEE, BMR, BMI, daily calorie target — this IS the aha moment, build the entire onboarding arc around it. (5) Immediately follow with a single guided first action CTA: "Log your first workout" with a pre-built template ready to use, or "Analyze your first meal" opening the AI meal analyzer.
**Success metric:** Onboarding completion rate. Day-1 first action rate (% of registered users who log at least one workout or meal within 24h).

### FIX 5 — Persistent streak counter in navigation
**Priority:** MEDIUM-HIGH | **Effort:** S | **Sprint:** 1
**Problem:** Streak data exists in DailyEntry entity but is only visible on the Dashboard. Users logging workouts or meals in their respective modules never see their streak. A user with a 30-day streak gets zero reminder while in the Workout tab. The single most effective retention mechanic in habit-forming apps is invisible during the core loop.
**Fix:** Add streak counter (flame icon + day count) to the persistent app header/top navigation bar — visible on every screen in both the main app and beSocial shell. Push notification if user hasn't logged anything by 8pm: "Don't break your X-day streak — log today's workout." On Dashboard, streak must be the first element above the fold, not buried below charts.
**Success metric:** Streak length distribution. % of users with streaks >7 days at week 4.

### FIX 6 — Active workout set logger redesign
**Priority:** HIGH | **Effort:** S | **Sprint:** 1
**Problem:** Set/rep/weight logging uses standard form text inputs. During an active workout — between sets, sweating, time pressure — this is too slow and too error-prone. 5 exercises × 4 sets = 40+ individual field interactions per session. Hevy and Strong own this UX — their set logging is the primary reason users choose them over alternatives.
**Fix:** Replace text inputs in the active workout logger with large +/− increment buttons flanking the weight and rep fields. Show previous session's values as ghost/placeholder text ("last time: 80kg × 8"). Swipe right on a set row to mark complete. Auto-start configurable rest timer after each set completion. Long-press to edit a set inline. Swipe left to delete a set. The keyboard should never appear during an active workout session for standard set logging.
**Success metric:** Workout session completion rate. Average sets logged per session.

### FIX 7 — First login guided state (empty state conversion)
**Priority:** HIGH | **Effort:** S | **Sprint:** 1
**Problem:** After completing profile setup, users land on a blank Dashboard. No workout templates exist, no meals are logged, no social connections exist. This is the motivational cliff — the highest-risk churn moment in the entire user lifecycle. An empty product feels like a broken product.
**Fix:** Workout module empty state: show 3 pre-built workout templates (Push Day, Pull Day, Full Body) with a single "Start this workout" CTA — zero setup required for the first session. Nutrition module empty state: AI meal analyzer as the primary CTA ("Take a photo of your meal"), manual entry as secondary. Social feed empty state: show 5 suggested users to follow with inline follow buttons, no navigation required. beSocial Discover: pre-seeded with "NovaFit Official" admin account posting high-quality fitness content.
**Success metric:** % of new users who complete first workout within 48h. % who log first meal within 48h.

### FIX 8 — AI as contextual layer, not dedicated navigation module
**Priority:** MEDIUM | **Effort:** M | **Sprint:** 3
**Problem:** AI Chat is a top-level navigation item alongside Dashboard, Workouts, Nutrition. Users must remember it exists and navigate to it intentionally. AI usage is driven by curiosity, not habit. AI meal analyzer and calorie estimator are not surfaced at the moment of need — they require deliberate discovery. Low DAU on AI features despite high intrinsic value.
**Fix:** Remove AI Chat from top-level navigation. Replace with a persistent floating action button (sparkle/AI icon, bottom-right) available in every module. Tapping opens a bottom sheet chat interface that is context-aware — if user is in the Nutrition module, AI's system context includes their current macro data; if in Workouts, it includes their current template. Chat history remains accessible from the Me/Profile tab as a secondary action. AI meal analyzer surfaces as the PRIMARY CTA inside the Add Meal flow (above manual entry). AI calorie estimator surfaces as a card in the post-workout summary screen (Fix 3).
**Success metric:** AI feature usage per DAU. Meal analyzer activations per nutrition log session.

### FIX 9 — beSocial cold-start Discover seeding
**Priority:** MEDIUM | **Effort:** S | **Sprint:** 4
**Problem:** At launch, the Discover page shows few or no real users. A ghost town on Discover signals low traction at the worst possible moment — the user's first social experience in the app. Ghost town perception compounds: users don't follow anyone, so their feed stays empty, so they never return to beSocial, so the social layer delivers zero retention value.
**Fix:** Create a "NovaFit Official" verified admin account that posts workout tips, nutrition advice, and motivational content on a regular schedule — seeds Discover with active content from day 1. During cold start, hybrid-populate the social feed with blog articles surfaced as feed cards and AI-generated workout tips as "NovaFit Tip" posts. Add "Suggested for You" logic on Discover: match users by primary fitness goal and show profiles with similar goals first. Never show an empty Discover page — always have at least 5 content items visible.
**Success metric:** Follow rate on Discover page. Feed scroll depth on first session.

### FIX 10 — Daily entry calorie auto-population from nutrition log
**Priority:** MEDIUM | **Effort:** S | **Sprint:** 1
**Problem:** The daily entry form asks users to manually input calorie intake for the day — but total calories are already tracked in the Nutrition module through meal logging. This is a data redundancy that creates a fragmented product perception: users correctly infer the two systems are disconnected and don't trust either. Entering the same data twice is friction that signals bad product design.
**Fix:** Auto-populate the calorie intake field in the daily entry form by summing all MealEntry calories for that UserId + Date. Render it as a read-only display field with a small "from your nutrition log" label, not a manual entry field. If no meals are logged for the day, show 0 with a "Log meals to track calories" inline CTA linking directly to the Nutrition module. Same logic for water intake if tracked via nutrition entries. Daily entry becomes a confirmation summary, not a redundant re-entry form.
**Success metric:** Daily entry completion rate. Time-to-complete daily entry form.

---

## SPRINT PLAN

### SPRINT 1 — Weeks 1–2 — Foundation & Quick Wins
**Sprint goal:** Ship all S-effort fixes and begin the food database integration. Close the most visible gaps without touching the core navigation or onboarding architecture.

**Fixes in this sprint:**
- Fix 5 — Persistent streak counter in navigation (S)
- Fix 6 — Active workout set logger redesign (S)
- Fix 7 — First login guided state / empty state conversion (S)
- Fix 10 — Daily entry calorie auto-population (S)
- Fix 1 — Food database integration: START (L — backend + API integration this sprint, frontend next sprint)

**Rationale:** All four S-effort fixes are independent — no shared dependencies, no architectural changes. They can run in parallel across agents. Fix 1 starts this sprint because it is the highest-priority fix overall and its backend (Open Food Facts API integration, FoodItem search service, Recent foods endpoint) must be ready before the frontend can be built in Sprint 2.

**Dependencies:** None. These fixes build on existing infrastructure only.

**Sprint 1 agent focus:**
- @dotnet-developer: Fix 10 (daily entry service update), Fix 1 backend (Open Food Facts service, search endpoint, recent foods endpoint), Fix 6 backend (workout session save endpoint update for completion event)
- @angular-developer: Fix 5 (streak component in app shell), Fix 6 (set logger component redesign), Fix 7 (empty state components for all three modules), Fix 10 (daily entry form update)
- @tech-architect: ADR + contract for Fix 1 (food database), Fix 3 (post-log completion events — SignalR design)
- @uiux-designer: Spec Fix 6 (set logger interaction patterns), Fix 7 (empty state designs for all modules), Fix 5 (streak placement in navigation)
- @code-reviewer: Privacy check on Fix 10 (calorie data must not be exposed in social endpoints), Fix 1 contract review

---

### SPRINT 2 — Weeks 3–4 — Core Loop Repair
**Sprint goal:** Complete the food database frontend, ship post-log reward screens, and add the beSocial share flow. Make completing a workout or logging a meal feel rewarding for the first time.

**Fixes in this sprint:**
- Fix 1 — Food database integration: COMPLETE (frontend — search UI, recent foods list, autofill in Add Meal)
- Fix 2 — Share to beSocial at workout/meal completion (M)
- Fix 3 — Post-log reward & feedback loop (M)

**Rationale:** Fix 3 (post-log summary card) and Fix 2 (share bottom sheet) are tightly coupled — the share CTA lives inside the post-log summary screen. Build Fix 3 first, then Fix 2 slots into it. Fix 1 frontend completes here because the backend is ready from Sprint 1.

**Dependencies:** Fix 1 backend complete (Sprint 1). SignalR completion event design finalized (Sprint 1 @tech-architect).

**Sprint 2 agent focus:**
- @angular-developer: Fix 1 frontend (food search component, recent foods component, autofill integration in NutritionFacade), Fix 3 (WorkoutCompletionCardComponent, MealCompletionFeedbackComponent), Fix 2 (ShareToSocialBottomSheetComponent)
- @dotnet-developer: Fix 2 backend (post creation from workout/meal context endpoint), Fix 3 backend (SignalR streak-updated event, workout completion summary DTO)
- @uiux-designer: Spec Fix 3 (completion card designs — workout and meal variants), Fix 2 (share bottom sheet UX)
- @code-reviewer: Fix 2 privacy check (workout summary shared to social must NOT include calories burned as a health metric — only exercise names and duration are public), Fix 3 SignalR event security

---

### SPRINT 3 — Weeks 5–6 — Onboarding & AI Restructure
**Sprint goal:** Restructure onboarding to deliver the aha moment before the user hits a blank dashboard. Demote AI Chat from navigation and surface AI contextually at moments of need.

**Fixes in this sprint:**
- Fix 4 — Onboarding aha moment restructure (M)
- Fix 8 — AI as contextual layer, not dedicated module (M)

**Rationale:** These two fixes both require changes to the app's navigation shell and routing architecture — they should be done in the same sprint to avoid touching the shell twice. Fix 4 changes the onboarding route flow. Fix 8 removes a navigation item and adds a persistent FAB to the shell.

**Dependencies:** Fix 7 empty states complete (Sprint 1) — the "guided first action" at the end of onboarding links to the pre-built templates and meal analyzer CTAs built in Fix 7.

**Sprint 3 agent focus:**
- @tech-architect: ADR for navigation shell changes (AI FAB, onboarding route restructure)
- @uiux-designer: Full onboarding flow spec (carousel → registration → biometrics → Your Numbers reveal → first action CTA), AI FAB + bottom sheet context-aware chat spec
- @angular-developer: OnboardingCarouselComponent, YourNumbersRevealComponent, onboarding route guard refactor, AIChatFabComponent (persistent, shell-level), AIChatBottomSheetComponent (context-aware), remove AI Chat from primary nav, add to Me/Profile tab
- @dotnet-developer: Onboarding step tracking endpoint (to resume incomplete onboarding), AI chat context injection (current module context passed to Groq system prompt)
- @code-reviewer: Onboarding privacy check (biometric data collected in step 2 — ensure height/weight/age never appear in any social or public response), AI bottom sheet context check (macro data passed to Groq stays server-side, never in API response)

---

### SPRINT 4 — Weeks 7–8 — Social Layer & Polish
**Sprint goal:** Eliminate the beSocial cold-start ghost town problem and ship final polish across the audit fixes. Validate all 10 fixes against their acceptance criteria.

**Fixes in this sprint:**
- Fix 9 — beSocial cold-start Discover seeding (S)
- Polish pass on all 10 fixes: edge cases, loading states, error states, accessibility

**Rationale:** Fix 9 is S-effort and primarily operational (creating the NovaFit Official account, scheduling content, configuring the Suggested for You algorithm). The rest of the sprint is QA and polish — ensuring every fix has correct loading/empty/error states and meets the 48×48px touch target requirement.

**Dependencies:** All Fixes 1–8 complete.

**Sprint 4 agent focus:**
- @dotnet-developer: Fix 9 — Suggested for You endpoint (match by fitness goal), feed hybrid-population logic (blog cards + AI tips as feed items during cold start)
- @angular-developer: Fix 9 — SuggestedUsersComponent on Discover, feed content card variant for blog/tip items, NovaFit Official account badge UI
- @code-reviewer: Full audit pass — verify all 10 fixes against Definition of Done below, privacy check on Suggested for You (must not use health metrics for matching — use fitness goal enum only)
- @uiux-designer: Polish pass — verify all empty states convert, all loading skeletons match final designs, streak component placement final review

---

## NEW API ENDPOINTS REQUIRED

| Method | Path | Description | Auth | Key DTO fields |
|--------|------|-------------|------|----------------|
| GET | /api/nutrition/foods/search?q= | Search Open Food Facts for food items | Bearer | name, calories, protein, carbs, fat per 100g |
| GET | /api/nutrition/foods/recent | Last 10 food items logged by this user | Bearer | foodItemId, name, macros, lastUsed |
| GET | /api/workouts/sessions/{id}/completion-summary | Post-workout summary for completion card | Bearer | duration, exerciseCount, estimatedCalories, streakDay |
| POST | /api/social/posts/from-workout/{workoutId} | Create pre-composed post from workout session | Bearer | postId, previewText, workoutStats (no health metrics) |
| POST | /api/social/posts/from-meal/{mealId} | Create pre-composed post from meal entry | Bearer | postId, previewText, mealName (no macro data) |
| GET | /api/users/me/streak | Current streak count for navigation display | Bearer | currentStreak, lastLogDate, atRiskToday |
| GET | /api/social/discover/suggested | Suggested users matched by fitness goal | Bearer | userId, displayName, avatarUrl, fitnessGoal, workoutsThisMonth |
| GET | /api/daily/today/summary | Today's daily entry with auto-populated nutrition totals | Bearer | caloriesFromNutritionLog, waterFromLogs, manualWeight, energyLevel |
| POST | /api/onboarding/step | Track onboarding step completion for resume logic | Bearer | stepName, completedAt |
| GET | /api/onboarding/status | Check if onboarding is complete or which step to resume | Bearer | isComplete, lastCompletedStep, nextStep |

**Privacy note for @code-reviewer:** /api/social/posts/from-workout must NEVER include estimated calories burned in the post payload — calories are a health metric. Include only exercise names, duration, and set count. /api/social/discover/suggested must NEVER include BMI, weight, goal calories, BMR, or TDEE — match on fitnessGoal enum only.

---

## NEW ANGULAR COMPONENTS REQUIRED

| Component | Module | Replaces / Extends |
|-----------|--------|--------------------|
| StreakBadgeComponent | shared/components | New — added to AppShellComponent |
| WorkoutSetRowComponent | features/workouts | Replaces current form input row in active workout logger |
| WorkoutCompletionCardComponent | features/workouts | New — shown after workout save |
| MealCompletionFeedbackComponent | features/nutrition | New — shown after meal save |
| ShareToSocialBottomSheetComponent | shared/components | New — triggered from both completion screens |
| FoodSearchComponent | features/nutrition | New — replaces manual entry as primary add-food flow |
| RecentFoodsListComponent | features/nutrition | New — shown above FoodSearchComponent |
| WorkoutsEmptyStateComponent | features/workouts | Extends existing empty state — adds pre-built templates |
| NutritionEmptyStateComponent | features/nutrition | Extends existing empty state — adds AI analyzer CTA |
| SocialFeedEmptyStateComponent | features/social | Extends existing empty state — adds inline follow suggestions |
| AIChatFabComponent | core/shell | New — persistent FAB in AppShellComponent |
| AIChatBottomSheetComponent | core/shell | New — context-aware chat, replaces dedicated AI Chat route |
| OnboardingCarouselComponent | features/onboarding | New — pre-registration value preview |
| YourNumbersRevealComponent | features/onboarding | New — post-biometrics TDEE/BMR/BMI reveal screen |
| SuggestedUsersComponent | features/social | New — shown on Discover page, also in feed empty state |
| DailyEntryCalorieSummaryComponent | features/dashboard | Extends daily entry form — replaces calorie input with read-only display |

---

## CROSS-CUTTING CONCERNS

### SignalR new events required
| Event name | Hub | Triggered by | Received by | Payload |
|------------|-----|--------------|-------------|---------|
| streak-updated | /hubs/notifications | Any daily log action (workout, meal, daily entry) | AppShellComponent → StreakBadgeComponent | { currentStreak: number, isNewRecord: boolean } |
| workout-completion | /hubs/notifications | POST /api/workouts/sessions/{id}/complete | WorkoutCompletionCardComponent | { sessionId, estimatedCalories, streakDay } |

### Shared DTOs reused across multiple fixes
- `WorkoutCompletionSummaryDto` — used by Fix 3 completion card AND Fix 2 share bottom sheet
- `UserStreakDto` — used by Fix 5 nav badge AND Fix 3 completion card
- `FoodItemDto` — used by Fix 1 search results AND Fix 1 recent foods list

### Shared Angular components reused across fixes
- `ShareToSocialBottomSheetComponent` — called by both WorkoutCompletionCardComponent (Fix 3) and MealCompletionFeedbackComponent (Fix 3). Fix 2 is just the trigger logic, not a separate component.
- `StreakBadgeComponent` — rendered in AppShellComponent (Fix 5) and inside WorkoutCompletionCardComponent (Fix 3).

### Privacy audit — endpoints touching health metrics
Every endpoint below must be reviewed by @code-reviewer before merge:
- /api/workouts/sessions/{id}/completion-summary — estimatedCalories is OK for the user's own view, must NOT appear in any social-facing DTO
- /api/social/posts/from-workout — strip all calorie data before creating post DTO
- /api/social/posts/from-meal — strip all macro totals before creating post DTO (meal name only)
- /api/social/discover/suggested — fitness goal enum is public; BMI/weight/TDEE are not
- /api/daily/today/summary — caloriesFromNutritionLog is private to the authenticated user only, Bearer required

---

## DEFINITION OF DONE

| Fix | Acceptance criterion |
|-----|---------------------|
| Fix 1 | User can search "chicken breast" in Add Meal, select a result, and have protein/carbs/fat/calories auto-filled without typing any macro values manually. Recent foods list shows last 10 items on Add Meal open. |
| Fix 2 | After saving a workout, a bottom sheet appears within 300ms with a pre-composed post showing workout name, duration, and exercise count. User can publish in one tap or dismiss. Post appears in beSocial feed. |
| Fix 3 | After saving a workout, a full-screen summary card is shown with: duration, exercise count, estimated calories (Groq), current streak day. Streak counter animates increment. After saving a meal, macro progress bars update visibly with animation. |
| Fix 4 | A new user who registers sees the value carousel before entering any data. After completing biometrics, they see a "Your Numbers" screen with their TDEE, BMR, BMI, and goal calories before reaching the Dashboard. First action CTA is the first thing they see after the reveal. |
| Fix 5 | Streak counter (flame icon + day number) is visible in the top navigation bar on every screen — Dashboard, Workouts, Nutrition, beSocial, Me. Counter updates in real time after any log action without page refresh. |
| Fix 6 | During an active workout session, tapping a set row shows +/− buttons for reps and weight with no keyboard appearing. Previous session values are shown as placeholder. Swiping right on a set row marks it complete with a visual confirmation. Rest timer starts automatically after set completion. |
| Fix 7 | A user who has never logged a workout sees 3 pre-built template cards (Push Day, Pull Day, Full Body) with a "Start this workout" CTA on the Workouts empty state. Nutrition empty state shows AI analyzer as primary CTA. Social feed empty state shows 5 suggested users with inline follow buttons. |
| Fix 8 | AI Chat is not visible in the primary bottom navigation. A floating sparkle icon is visible on every screen. Tapping it opens a bottom sheet chat. If opened from the Nutrition module, the AI's first response demonstrates awareness of the user's current macro context. Chat history is accessible from the Me tab. |
| Fix 9 | The Discover page always shows a minimum of 5 content items regardless of how many real users exist. "NovaFit Official" account is present and has at least 10 posts. Suggested users section matches the viewing user's primary fitness goal. |
| Fix 10 | The daily entry form's calorie field displays the sum of all meal entries for today, is read-only, and shows "from your nutrition log" label. If no meals are logged, it shows 0 with an inline "Log meals" CTA. Field cannot be manually edited. |

---

## RISKS & BLOCKERS

| Sprint | Top risk | Mitigation |
|--------|----------|------------|
| Sprint 1 | Open Food Facts API rate limits or data quality issues delay Fix 1 backend | Test API response quality for Romanian/Eastern European food items in week 1. If quality is insufficient, fall back to USDA FoodData Central (also free). Do not block Sprint 2 frontend on this — build the frontend against a mock service. |
| Sprint 2 | Share bottom sheet (Fix 2) requires a new post creation flow that touches the beSocial backend — risk of scope creep into the social feed architecture | Constrain Fix 2 to creating a post via a single new endpoint. Do not refactor existing post creation. The bottom sheet calls one endpoint and closes. No feed redesign in this sprint. |
| Sprint 3 | Navigation shell refactor for AI FAB and onboarding route changes may break existing deep links and route guards | @tech-architect must document all affected routes before @angular-developer touches the shell. @code-reviewer must regression-test all existing routes after merge. |
| Sprint 4 | Cold-start seeding (Fix 9) requires operational work (creating NovaFit Official account, scheduling content) that is outside the dev workflow | Assign content creation to the product owner, not the dev agents. Agents build the infrastructure (Suggested for You endpoint, feed hybrid-population logic). Content is a separate workstream. |