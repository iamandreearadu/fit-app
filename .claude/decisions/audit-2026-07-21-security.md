## Security Audit — FitApp (FitApp.Api/ .NET 10 + fit-app/ Angular 19) — 2026-07-21

Branch: Fix-Release. Audit-only; no source files were modified.
Scope: JWT/auth, endpoint authorization, ownership/data isolation, input/injection,
health-data privacy, secret management, CORS, frontend token storage, error responses.

---

### 🔴 CRITICAL — immediate fix required

- **[FitApp.Api]** `FitApp.Api/appsettings.json:13,19,28` + **[fit-app]** `fit-app/src/environments/environment.ts:6`, `fit-app/src/environments/environment.prod.ts:6`
  - Vulnerability: Hardcoded live secrets committed to git history (OWASP A07 / CWE-798, CWE-540). Sensitive credential exposure.
  - Impact: Every developer/CI system with repo read access — and anyone who ever cloned or forked — can recover all production credentials. Full compromise surface.
  - Proof: The files are currently gitignored and scrubbed from HEAD (`git grep` at HEAD finds nothing), BUT the exact secret values remain retrievable from history. `git log --all -S` locates them in commits **6e961a2 ("deploy preps")**, **8258c0f ("meal analyzer repair")**, **9e07edc ("update gitignore")**, across `appsettings.json`, `appsettings.Development.json`, `environment.ts`, and `environment.prod.ts`. Exposed values still valid today:
    - JWT signing secret `[REDACTED — see commit history reference above]` (`appsettings.json:13`) — anyone holding this can **forge valid JWTs for any user, including the seeded admin `andreea@gmail.com`**, defeating all authentication.
    - Groq API key `gsk_[REDACTED]` (backend + `environment.ts`).
    - Second Groq key `gsk_[REDACTED]` (`environment.prod.ts:6`).
    - Gmail SMTP app password `[REDACTED]` for `andreea.radu.dev@gmail.com` (`appsettings.json:28`) — allows sending mail as that account.
  - Fix:
    1. **Rotate every secret now** — regenerate the JWT secret, revoke both Groq keys and issue new ones, and revoke the Gmail app password. Rotation is mandatory; scrubbing files is not enough because history retains the old values.
    2. Move backend secrets to environment variables / .NET User Secrets; keep `appsettings.json` with structure only. The JWT secret is read from config (`Program.cs:29`, `JwtService.cs:12`) — no hardcoded fallback exists, so an env-var value drops in cleanly.
    3. Purge the values from history (`git filter-repo` / BFG) after rotation to prevent re-leak.
    ```json
    // appsettings.json — structure only, no values
    "Jwt": { "Secret": "", "Issuer": "fitapp-api", "Audience": "fitapp-angular" }
    ```

- **[fit-app]** `fit-app/src/environments/environment.ts:6`, `environment.prod.ts:6`
  - Vulnerability: Groq API key placed in frontend environment config (CWE-522). Any secret in a frontend `environment.*.ts` is compiled into the shipped JS bundle and is world-readable by design.
  - Impact: If any frontend code references `environment.groqApiKey`, the key ships to every browser and lets any visitor drain the Groq account's quota/billing or call models on the owner's dime. This is an unavoidable property of client-side secrets, not a bug that can be "hardened" — the key simply cannot live client-side.
  - Proof: Both env files define `groqApiKey`. Current mitigating fact worth stating precisely: **no code under `fit-app/src/app` references `groqApiKey` or calls `api.groq.com` directly** (verified by grep) — AI requests are correctly proxied through the backend `AiController` → `AiProxyService`. So the key is presently *dead config*. The exposure today is therefore via git history (see finding above), but the key is one `environment.groqApiKey` reference away from shipping to clients.
  - Fix: Remove `groqApiKey` and `groqApiUrl` from both frontend env files entirely — the backend proxy is the only correct caller. Rotate the keys (they are already leaked via history).

---

### 🟡 WARNING — fix before next release

- **[FitApp.Api]** `FitApp.Api/Program.cs:135-145` (no AI rate limit) vs `AiController.cs:19-75`
  - Issue: The fixed-window rate limiter ("auth", 10/min) is applied only to `AuthController` (`[EnableRateLimiting("auth")]`). The AI endpoints (`/api/ai/text|image|workout-calories`), which each incur a paid Groq API call, have no rate limiting.
  - Risk: Medium likelihood × high cost impact. Any single authenticated user can loop `/api/ai/image` (vision model) and run up unbounded Groq billing / exhaust quota for all users — an authenticated cost-DoS.
  - Recommendation: Add a per-user rate-limit policy (e.g. token-bucket keyed on the JWT `sub`) and apply `[EnableRateLimiting("ai")]` to `AiController`.

- **[FitApp.Api]** `FitApp.Api/Services/UserService.cs:27` and `Models/DTOs/UserDtos.cs:58`, `Models/DTOs/SocialDtos.cs:39,105,288`
  - Issue: Avatar/post/blog images are accepted as raw base64/URL strings and stored verbatim with **no size, MIME, or base64-format validation**. `UserService.UpdateProfileAsync` does `user.ImageUrl = req.ImageUrl` directly; `CreatePostRequest.ImageUrl`, `UpdatePostRequest.ImageUrl`, and `CreateUserBlogRequest.Image` are `string?` with no `[MaxLength]`. The proper validator `FileStorageService.SaveImageAsync` (5 MB cap + MIME allowlist, `FileStorageService.cs:5,35-37`) is used **only for chat images**, not these paths.
  - Risk: Medium. Bounded only by the 20 MB Kestrel request cap (`Program.cs:149`) — an authenticated user can persist ~20 MB data-URI blobs per profile/post directly into the SQLite row, causing DB bloat and slow queries (health-metric-free, so not a leak). No MIME allowlist on these paths.
  - Recommendation: Route avatar/post/blog images through `FileStorageService` (or equivalent) so the 5 MB cap and MIME allowlist apply, and add `[MaxLength]` to the image string fields as defense-in-depth.

- **[FitApp.Api]** `FitApp.Api/Services/JwtService.cs:18-19,30`
  - Issue: JWT payload embeds `email` and full `name` (PII), and tokens live 7 days (`expires: DateTime.UtcNow.AddDays(7)`) with no refresh/revocation mechanism.
  - Risk: Low–medium. JWT payloads are base64 (not encrypted); anyone who obtains a token reads the user's email/name. The 7-day non-revocable lifetime, combined with `localStorage` storage (below), gives a stolen token a long usable window with no server-side kill switch.
  - Recommendation: Drop `email`/`name` from the token (fetch via `/api/users/me`); shorten access-token lifetime (e.g. 1 h or 1 day) and/or add a refresh + revocation (jti deny-list) path. `jti` is already issued (`JwtService.cs:20`), so a deny-list is low-effort.

---

### 🟢 ADVISORY — improve over time

- **[fit-app]** JWT is stored in `localStorage` (`fit-app/src/app/shared/services/local-storage.service.ts`). This is the documented FitApp convention (XSS-exfiltration risk traded for tab-persistence/UX). Acceptable **because no XSS sink was found** in the codebase (no `innerHTML`, no `bypassSecurityTrust*`). Keep it under review; if an XSS vector is ever introduced, this becomes a token-theft vector. Consider httpOnly-cookie auth long-term.
- **[FitApp.Api]** `appsettings.json:8` sets `"AllowedHosts": "*"`. CORS is correctly restricted (below), but tightening `AllowedHosts` to the production host is defense-in-depth.
- **[FitApp.Api]** No `UseHttpsRedirection()` / HSTS in `Program.cs`. Acceptable only if TLS is terminated at a reverse proxy in production; otherwise add it.
- **[FitApp.Api]** `appsettings.Development.json` (gitignored) also carried the secrets historically — include it in the history purge.

---

### ✅ Controls Verified

- **JWT validation** (`Program.cs:33-43`): `ValidateIssuer`, `ValidateAudience`, `ValidateLifetime`, `ValidateIssuerSigningKey` all `true`; issuer/audience bound to config. HS256 (`JwtService.cs:13`). Signing secret is 32 chars = 256 bits (meets HS256 minimum) and read from config — no hardcoded fallback. SignalR query-string token handler present and correctly scoped to `/hubs` (`Program.cs:46-58`).
- **Endpoint authorization coverage: 14/14 controllers correct.** All of Users, Daily, Workouts, WorkoutSessions, Nutrition, Ai, Chat, Social, Conversations, Notifications, Dashboard, Onboarding carry class-level `[Authorize]`. `AuthController` is public login/register only and is rate-limited. `BlogController` is public on GET and `[Authorize(Roles="Admin")]` on POST/PUT/DELETE (`BlogController.cs:28,36,45`). No unprotected data endpoints.
- **Ownership / data isolation:** `userId` is always derived from JWT claims (`ClaimTypes.NameIdentifier` ?? `sub`), never from request body/query/route — grep for `[FromQuery] userId` / `[FromBody] userId` returns nothing. Service-layer ownership enforced: DM access gated by `IsParticipantAsync` (`ConversationService.cs:206,245`), message delete restricted to own messages (`:291-296`), notification mark-read filtered by `RecipientId == userId` (`NotificationService.cs:133-136`), social mutations throw `UnauthorizedAccessException`→`Forbid()`. Social read-by-id uses 404 (`KeyNotFoundException`) to avoid existence leakage.
- **Health-data privacy:** Public-facing DTOs expose no health metrics. `UserSocialProfileResponse`/`UserSearchResult`/`SuggestedUserResponse` (`SocialDtos.cs:129-207`) and `UserPublicStatsResponse` (`StatsDtos.cs:15-21`) carry only display name, avatar, counts, workout volume/streak, and the coarse `Goal` string. BMI/weight/BMR/TDEE/calorie targets are confined to `UserMetricsDto`, served only by the self-only `/api/users/me/*` endpoints (`UsersController.cs:66-68`). Share-to-social flows strip metrics server-side (`SharePostResponse`/`PostFromMealRequest` privacy invariants).
- **Injection:** No `FromSqlRaw`/`ExecuteSqlRaw`/`ExecuteSqlInterpolated` anywhere — EF Core parameterization throughout. No `innerHTML` or `bypassSecurityTrust*` in the Angular app (Angular auto-escaping intact).
- **Input validation:** Request DTOs use `[Required]`/`[MaxLength]` on text (`SocialDtos.cs`), `[Range]` on biometrics (`UserDtos.cs:50-55`); Kestrel body cap 20 MB (`Program.cs:149`); chat image upload validated to 5 MB + MIME allowlist (`FileStorageService.cs`). (Gap: avatar/post/blog images bypass this — see WARNING.)
- **CORS** (`Program.cs:64-75`): origins restricted per-environment (`localhost:4200` dev / `nove-fit.net` prod); `AllowCredentials` present for SignalR; **no `AllowAnyOrigin()`**.
- **Error responses:** Controllers return `ProblemDetails` via `Problem(...)`; catch-alls emit generic "An unexpected error occurred." with the exception only `logger.LogError`'d, never serialized. `ex.Message` reaches responses only for app-authored `KeyNotFoundException`/`InvalidOperationException` messages (e.g. "Workout not found") — no stack traces or `ex.ToString()` exposed.
- **Secret hygiene going forward:** `.gitignore:54-63` now excludes `appsettings.json`, `appsettings.Development.json`, and all `environment.*.ts` — new commits won't re-add them (history purge + rotation still required).

---

### Overall Security Posture

- [ ] ✅ Production-ready — no critical findings
- [ ] ⚠️ Conditional — fix warnings before release
- [x] ❌ Not ready — critical findings must be resolved first

**Critical findings:** 2 (committed live secrets in git history; Groq key in frontend config)
**Warnings:** 3 (no AI rate limit; unvalidated avatar/post/blog image storage; long-lived JWT carrying PII)
**Health data exposure risk:** Low — authorization, ownership isolation, and DTO minimization are consistently correct; no health metric is reachable by an unauthorized user. The critical findings are credential/secret exposure, not health-data leakage.

**Single most important action:** Rotate the JWT signing secret immediately — its presence in git history lets anyone with repo access forge tokens for any account (including admin), which silently defeats every authorization control verified above. Rotate the Groq keys and Gmail app password in the same pass, then purge history.
