## DevOps & Release Readiness Audit — FitApp — 2026-07-21

Branch audited: `Fix-Release` (up to date with `origin/Fix-Release`). Remote: `https://github.com/iamandreearadu/fit-app.git` — **confirmed PUBLIC repo** (`gh repo view` → `"isPrivate":false`).

---

### CRITICAL

**1. Real production secrets are committed in plaintext in git history, on a public GitHub repo.**
`FitApp.Api/appsettings.json`, `FitApp.Api/appsettings.Development.json`, and `fit-app/src/environments/environment.ts` / `environment.prod.ts` were tracked with live values before being gitignored in commits `296c523` ("gitignore"), `23ba36a` ("remove secret keys from git tracking"), and `6e961a2` ("deploy preps"). Removing a file from tracking does **not** remove it from history — anyone with `git clone` access (i.e. anyone on the internet, since the repo is public) can run `git show 6e961a2~1:FitApp.Api/appsettings.json` and recover:
- The full JWT signing secret (`Jwt:Secret`)
- At least **two** distinct Groq API keys (found via `git show 23ba36a` and `git show 6e961a2~1:fit-app/src/environments/environment.ts` — e.g. `gsk_o7PH...5cQl`, `gsk_UplS...kmml`)
- The Gmail SMTP account + app password (`Email:SenderEmail` = `andreea.radu.dev@gmail.com`, `Email:Password`)

These must be treated as **already compromised**, independent of any deployment work. This is also the actual root cause of today's incident: `appsettings.json`/`environment.ts` didn't "go missing" — they were correctly gitignored going forward, but since there is no alternate provisioning path (no template, no vault, no CI secret injection — see #2), the *only* remaining copies of working config were these historical commits and one person's local disk.

**Action, in order:**
1. Rotate the JWT secret, both Groq API keys, and the Gmail app password today — public exposure can't be un-published, so history-scrubbing alone is not sufficient.
2. Only after rotation, optionally purge history (`git filter-repo` / BFG) and force-push if the team wants the old values gone from clones going forward — coordinate with all collaborators first, this rewrites shared history on a repo with open PRs.

**2. There is no deployment path from a fresh clone to a running instance — none of it exists in the repo.**
Full-repo search (`Dockerfile*`, `docker-compose*`, `.github/**`, `Procfile`, `render.yaml`, `fly.toml`, `azure-pipelines.yml`, `vercel.json`, `netlify.toml`) returned **zero matches**, excluding `node_modules`/`.git`. There is no `.env.example`, no `FitApp.Api/appsettings.Example.json`, no `fit-app/src/environments/environment.example.ts` — no template of any kind for the config a fresh clone needs.

Notably, `.claude/agents/devops-engineer.md` contains a fully written Dockerfile, docker-compose.yml, nginx.conf, and two GitHub Actions workflows (CI + deploy) — but this is agent-persona *reference material*, not implemented anywhere in the actual repository. A fresh clone today has no documented, automated, or template-driven way to reach production, only the option of reconstructing secrets from git history (see #1) or asking the one person who has them locally.

**3. README.md's "Environment Setup" section is not usable instructions.**
`README.md:140-148` reads:
```
## Environment Setup
Configure:
* JWT secret
* Database connection
* AI API key
* Email credentials
```
This doesn't name the files (`FitApp.Api/appsettings.json`, `fit-app/src/environments/environment.ts`), doesn't say they're gitignored/must be created manually, gives no format/example, and doesn't mention the Usda config keys that `Program.cs` also requires (see Advisory #3). A new contributor following the README literally cannot get the app running — which is exactly what happened today.

---

### WARNING

**1. Startup fails ungracefully for most missing config, despite one good exception.**
`Program.cs:168-169` does throw a clear, named `InvalidOperationException` ("Connection string 'Default' is missing from appsettings.json.") — that one's good. But:
- `Program.cs:29` — `builder.Configuration["Jwt:Secret"]!` uses the null-forgiving operator. If `Jwt:Secret` is absent, this surfaces later as an unhandled `NullReferenceException` inside `Encoding.UTF8.GetBytes(jwtSecret)` with no indication of what config key is missing.
- `Program.cs:80` and `Program.cs:89` — `new Uri(builder.Configuration["Groq:BaseUrl"]!)` and `new Uri(builder.Configuration["Usda:BaseUrl"]!)` throw generic `ArgumentNullException`/`UriFormatException` if unset, again with no actionable message.

Net effect: today's failure mode (missing `appsettings.json` → hard crash) is the norm, not the exception, for most of the required config surface.

**2. No health check endpoint.** Grepped `FitApp.Api` for `AddHealthChecks`, `MapHealthChecks`, `/health` — no matches. Needed for any future container/load-balancer/orchestration setup, and useful right now to distinguish "process is up" from "process can reach the DB/Groq/SMTP."

**3. No structured logging.** Only the default `Logging:LogLevel` block in `appsettings.json` (`Default: Information`, `Microsoft.AspNetCore: Warning`). No Serilog, no App Insights, no file/JSON sink — grepped `FitApp.Api` and the `.csproj` for `Serilog`/`AddLogging`, no matches. Fine for local dev; would make diagnosing a production incident like today's much harder after the fact (console-only logs, gone on restart).

**4. Production CORS origins are hardcoded in source, not config-driven.** `Program.cs:66-68`:
```csharp
var origins = builder.Environment.IsDevelopment()
    ? new[] { "http://localhost:4200", "https://localhost:4200" }
    : new[] { "https://nove-fit.net", "https://www.nove-fit.net" };
```
This is *not* broken (correctly branches dev vs. prod, not localhost-only — see Verified OK), but changing the production domain requires a code change + rebuild rather than an environment/config change. Minor inflexibility, worth moving to `appsettings`/env var when the Docker/CI work happens.

---

### ADVISORY

**1. SQLite as the production DB for a multi-user social app.** Single-writer file locking will serialize concurrent writes (posts, likes, comments, DMs, notifications). Not a blocker at current scale and appears to be an accepted tradeoff per `CLAUDE.md`, but flag it as the first likely bottleneck if concurrent write volume (especially SignalR-driven chat/notifications) grows — worth a `@performance-engineer` look before any real user-growth push, not before.

**2. `Usda:BaseUrl` / `Usda:ApiKey` (`Program.cs:87-90, 158-164`) is an undocumented config/secret surface.** Used for food search (USDA FoodData Central), has its own graceful-degradation warning if left as `DEMO_KEY` (`Program.cs:158-164` — this one's actually a good example of the pattern #1 WARNING should follow elsewhere), but isn't mentioned anywhere in `CLAUDE.md`'s Environment section or README. Should be included in whatever config template gets created to close CRITICAL #2/#3.

**3. No container `HEALTHCHECK` / orchestration primitives** — moot until Docker work exists at all (CRITICAL #2), just noting it's part of the same gap.

---

### Verified OK

- **CORS is not the "hardcoded to localhost" failure mode the audit brief flagged as a risk to check** — `Program.cs:64-75` correctly branches dev vs. production origins and includes the real production domain (`nove-fit.net`). See Warning #4 for the one real nit (hardcoded, not config-driven).
- **`db.Database.Migrate()` runs automatically on startup as `CLAUDE.md` documents**, plus defensive idempotent column-patching and migration-history stamping for existing DBs (`Program.cs:166-237`) — more careful than the bare minimum.
- **The combined single-host deployment model is real and coherent, just never packaged.** `fit-app/angular.json` builds to `../FitApp.Api/wwwroot/angular-build` with a `production` file-replacement for `environment.prod.ts`; `Program.cs:274-297` serves that output as static files with SPA fallback whenever `!IsDevelopment()`. This is a working production-serving strategy on paper — it just has no build/publish automation wired up (ties directly to CRITICAL #2).
- **Rate limiting is configured on the auth endpoints** (`Program.cs:135-145`, 10 req/min fixed window, 429 on rejection).
- **Current `.gitignore` hygiene is correct going forward** — `FitApp.Api/appsettings.json`, `appsettings.Development.json`, `*.db`, and `fit-app/src/environments/environment*.ts` are all properly excluded today. The problem is entirely retroactive (CRITICAL #1) and provisioning-related (CRITICAL #2/#3), not current-state carelessness.

---

### Overall verdict

**Not production-ready for automated/repeatable deployment, and there is an active security incident that outranks the deployment gap.** Priority order:

1. **Today:** rotate JWT secret, both exposed Groq API keys, and the Gmail app password — public repo, confirmed plaintext exposure in history (CRITICAL #1).
2. **Next:** add `FitApp.Api/appsettings.Example.json` and `fit-app/src/environments/environment.example.ts` (committed, no real values) and rewrite the README's Environment Setup section to point at them — closes the "how does a fresh clone even start" gap (CRITICAL #2/#3) without requiring Docker/CI yet.
3. **Then:** implement the Dockerfile / docker-compose.yml / GitHub Actions workflows already fully specified in `.claude/agents/devops-engineer.md` — currently zero of that spec exists in the actual repo.
4. **Alongside:** harden startup config validation (Warning #1) and add a health check endpoint (Warning #2) so the next missing-config incident fails loudly and specifically instead of crashing on `Encoding.UTF8.GetBytes(null)`.
