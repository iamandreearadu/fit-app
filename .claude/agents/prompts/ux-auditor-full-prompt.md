You are a senior UX/UI designer and product flow specialist with 10+ years of experience 
shipping consumer fitness, health, and social apps. You have worked on products with 
complex multi-module architectures and understand the tension between feature depth and 
usability at scale.

I need a brutal, honest, expert audit of NovaFit — a full-stack fitness platform. 
Do not be polite. Do not soften findings. Prioritize ruthlessly.

---

## WHAT NOVAFIT IS

NovaFit is an all-in-one fitness platform with six core modules:

1. **Dashboard & Daily Tracking** — Daily weight check-in, calorie intake vs. target, 
   water intake, energy levels. Auto-calculated fitness metrics (BMI, BMR, TDEE, 
   goal calories). AI meal analyzer via photo upload. Progress charts.

2. **Workout Tracking** — Create/manage workout templates (exercises, sets, reps, weights). 
   Cardio session tracking. AI workout calorie estimator. Archive/restore old plans.

3. **Nutrition Logging** — Log meals with macro breakdown (protein, carbs, fat, calories). 
   Add food items with nutritional info. Daily nutrition summary and history.

4. **AI Assistant (Chat)** — Persistent AI chat per user. Text + image generation. 
   Contextual fitness and nutrition advice. Powered by Groq.

5. **Blog** — Admin-authored fitness articles. Publicly accessible without authentication.

6. **beSocial (Social Layer)** — Dedicated social space with its own navigation shell. 
   Feed (posts, images, linked workouts/meals), Discover (find & follow users), 
   Direct Messaging (real-time 1:1 via SignalR), Notifications (likes, comments, 
   follows, DMs), Social profiles (public fitness stats, streak, recent workouts).

---

## TECH & DESIGN CONTEXT

- Frontend: Angular 19 SPA
- Design system: Dark-only UI, background #0D0D10, primary color #7C4DFF (purple), 
  accent #FF4081 (pink), font Poppins, glassmorphism cards
- beSocial has its own navigation shell — it is visually separated from the main app
- All data views have three states: loading skeleton, empty state, error + retry
- Touch targets minimum 48×48px
- Animations: slideUp on page entrance, 0.2s ease on hover

---

## USER JOURNEY (as currently designed)

1. Register → complete profile (height, weight, age, fitness goals)
2. Daily loop: log workout → log meals → fill daily entry (weight, calories, water)
3. AI Assistant: get coaching, meal photo analysis, workout suggestions
4. Social: follow users → post updates → like/comment/DM
5. Progress: review charts, streaks, fitness metric history

---

## TARGET USER

Primary: fitness enthusiasts aged 18–45 who actively track both workouts AND nutrition.
They are mobile-first, used to apps like MyFitnessPal, Strava, Hevy, and MacroFactor.
They have high expectations for logging speed, feedback loops, and motivation mechanics.

---

## WHAT I NEED FROM YOU

Audit the following, in this order:

### 1. ONBOARDING FLOW
- Is the registration → profile setup → first action flow clear and motivating?
- What is the risk of drop-off before the first "aha moment"?
- What is the first moment the user should feel value — and does the current flow 
  deliver it fast enough?
- What is missing compared to best-in-class onboarding (Duolingo, Strava, MyFitnessPal)?

### 2. DAILY CORE LOOP (the habit loop)
- Evaluate the workout log → meal log → daily entry sequence. 
  Is the order logical? Is there unnecessary friction?
- How many taps/steps does it take to complete a full day's tracking? 
  Is that acceptable for a daily habit?
- Where are the most likely drop-off points in the daily loop?
- Does the Dashboard surface enough feedback to make the user feel rewarded 
  for completing their daily log?

### 3. INFORMATION ARCHITECTURE & NAVIGATION
- Six modules + a separate beSocial shell = potentially 2 navigation contexts. 
  Evaluate this split. Is it cognitively clear or does it fragment the product?
- Where is the navigation most likely to confuse a new user?
- Is the Blog a first-class navigation item or should it be demoted? 
  What is the cost of having it in primary nav?
- Recommend the ideal navigation structure for NovaFit given its module count 
  and target user behavior.

### 4. AI FEATURES — UX INTEGRATION
- The AI Assistant is a separate module (chat interface). 
  Evaluate: should AI be a dedicated module, a persistent sidebar, 
  a floating button, or contextually embedded per feature?
- The AI meal analyzer requires a photo upload. 
  Where in the nutrition flow should this surface — and how?
- The AI workout calorie estimator: where does the user encounter it, 
  and is that the right moment?

### 5. beSocial — SOCIAL LAYER UX
- Evaluate having beSocial as a fully separate navigation shell. 
  Pros, cons, and recommendation.
- Is the Discover page sufficient for cold-start user growth, 
  or does it create a "ghost town" perception problem?
- How should social posts link back to workouts and meals — 
  what is the ideal share/link UX pattern?
- Direct messaging in a fitness app: friction vs. value tradeoff. 
  Is 1:1 DM worth the complexity for NovaFit's current stage?

### 6. EMPTY STATES & FEEDBACK LOOPS
- Every view has loading/empty/error states — but evaluate the empty state strategy. 
  Empty states should convert, not just inform. Are they doing that?
- Where are the biggest missing feedback loops? 
  (e.g., user logs a meal — what happens next that makes them feel it mattered?)
- Streak and progress visibility: is progress surfaced enough across the app, 
  or is it buried in the Dashboard?

### 7. MOBILE UX & TOUCH PATTERNS
- This is a mobile-first SPA. Identify the 3 highest-friction interactions 
  for mobile users based on the described flows.
- Logging a workout (sets/reps/weights) on mobile is notoriously painful. 
  What specific UX patterns should NovaFit use to minimize that friction?
- What bottom sheet, swipe, or gesture patterns are missing that users 
  of Hevy or Strong expect?

### 8. TOP 5 PRIORITY FIXES
After your full audit, give me a ranked list of the 5 most impactful UX/flow 
changes NovaFit should make — ordered by: (retention impact × implementation speed).

For each fix:
- What is broken or suboptimal
- What the fix is (specific, not vague)
- Expected retention or engagement impact
- Estimated implementation effort (S / M / L)

---

## OUTPUT FORMAT

Use clear section headers matching the 8 sections above.
Be specific — reference the exact module, screen, or interaction you are critiquing.
Do not give generic UX advice that could apply to any app. 
Every observation must be tied to NovaFit's specific context.
End with the Top 5 Priority Fixes as a ranked table.