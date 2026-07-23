## Product Strategy Audit — FitApp — 2026-07-21

_Light strategic gut-check. Read-only pass over `features/`, `FitApp.Api/Services`, and notification/streak logic. Not exhaustive._

Primary competitor lens: MyFitnessPal (nutrition), Strava (social), Hevy (workouts).

---

### Biggest risk to retention

**A solo new user hears nothing from the app after they close it.** The habit-loop infrastructure is actually built — streaks are first-class (`DailyDataService.GetStreakAsync` is the single source of truth, surfaced in the dashboard streak-chip and even injected into the AI daily insight). That's the good news. The problem is the _re-engagement_ side: `NotificationType` is exactly `{ Like, Comment, Follow, NewMessage }` — **every notification is triggered by another user's action.** There is no `BackgroundService` / `IHostedService` / scheduler in the API at all. So:

- A new user with no followers (i.e. every new user) generates zero notifications and receives zero pushes.
- Nothing tells a user "you haven't logged today" or "your 7-day streak ends at midnight."
- The streak — the one built-in habit mechanic — can silently break because nothing defends it.

This is the classic day-3 churn trap: the app depends on a social network the new user doesn't have yet, while the solo-tracking loop (the actual reason they downloaded a fitness app) has no return hook. **Biggest churn driver by a wide margin.**

### Biggest missed quick win

**Streak-in-danger reminder.** Both halves of the machine already exist — streak computation (`DailyDataService`) and delivery channels (`NotificationHub`/SignalR in-app, plus `MailKit`/Gmail SMTP for email). The only missing piece is a scheduled job that, each evening, finds users with an active streak and no `DailyEntry` for today, and pings them. This is the single highest impact-per-effort item on the board: it directly defends the one retention mechanic that's already built, and it converts the dormant email + notification infra into a daily-return engine. Runner-up quick wins, both cheap and absent: **data export** (trust/lock-in, table stakes vs MFP) and **referral** (the social layer is the natural growth surface but there's no invite loop).

### Monetization status

**None. Zero revenue path in the codebase.** No premium/subscription/paywall/billing/Stripe anywhere in real source (all `premium`/`plan` grep hits are workout _plans_ or design-skill docs). The app is 100% free with an expensive dependency: **every AI call hits the Groq API on the app's dime** — chat, meal-analyzer vision, workout-calorie estimation, and the per-dashboard AI insight. So AI cost scales linearly with engagement while revenue stays at zero. Not a criticism of an early build, but stated plainly: **the most costly feature (AI) is free and unmetered, and there is no tier to move heavy users into.** This is the natural home for the first paywall.

### Effort/impact concerns

The **social layer is disproportionately large relative to the core value prop.** Built social surface: feed, discover, suggested-users, follow, like, comment, post-detail, article/blog authoring, DMs with real-time SignalR chat, notifications, profile with 5+ sub-components (activity grid, athlete stats bar, recent performance, private stats, stats-tab). That's easily the biggest feature cluster in the app — a full Strava-style social network — yet it only produces value at network scale, which a young app doesn't have. Meanwhile the **AI differentiator is reactive** (user must open chat / upload a meal photo) rather than proactive coaching, and the persona doc itself flags proactive AI as the intended edge. Net: heavy investment sunk into network-effect features that can't pay off pre-scale, while the always-available solo AI coach — which _would_ create daily value for a user of one — is under-leveraged.

### Overall verdict

The core loop is well-built and the bones of retention (streaks, AI insight, onboarding wizard, active workout session, food search) are genuinely there — this is further along than a typical MVP. But it's **built like a social network waiting for a crowd, when it should behave like a personal coach that works for an audience of one.** The gap is not more features; it's closing the loop on the features already shipped: defend the streak, put the app on a schedule so it can reach out first, and meter the AI so engagement funds itself. Fix re-engagement before adding anything new.
