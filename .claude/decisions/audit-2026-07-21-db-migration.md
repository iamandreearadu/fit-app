## DB & Migration Audit — FitApp — 2026-07-21

Scope: `FitApp.Api/Data/AppDbContext.cs`, `FitApp.Api/Migrations/*.cs` (actual location — not `Data/Migrations/`, see note under Advisory), `FitApp.Api/Program.cs` startup migration logic, `FitApp.Api/Data/Seeds/*.cs`. Read-only review, no files modified.

### CRITICAL

**1. Deleting a BlogPost via the admin endpoint can crash with a SQLite FK constraint violation if the post has a linked social Post.**
`FitApp.Api/Services/BlogService.cs:78-85` (`DeleteAsync`, backing `DELETE /api/blog/{id}` — Admin) removes a `BlogPost` directly without first locating and removing/detaching any `Post` row whose `ArticleId` points at it:
```csharp
public async Task<bool> DeleteAsync(int id)
{
    var post = await db.BlogPosts.FindAsync(id);
    if (post is null) return false;
    db.BlogPosts.Remove(post);
    await db.SaveChangesAsync();
    return true;
}
```
`AppDbContext.cs:146-149` configures `Post.Article` with `OnDelete(DeleteBehavior.ClientSetNull)`. `ClientSetNull` only nulls the FK **in the change tracker** — it requires the dependent `Post` rows to already be loaded into the `DbContext`. At the database level SQLite gets **no cascade action at all** (`ClientSetNull` maps to `NO ACTION` in the generated schema), and `Microsoft.Data.Sqlite` enables `PRAGMA foreign_keys=ON` by default (nothing in `appsettings.json` / `Program.cs` disables it). So the delete above will throw a raw `SQLite Error 19: FOREIGN KEY constraint failed` (unhandled → 500) the moment an admin deletes an article that has ever been shared as a `Post` (which happens automatically for every user-written article per `SocialService`/`WriteArticle` flow, and is exactly what `NovaFitOfficialSeeder` does for 2 of its 3 seeded articles).

Contrast with the **correct** pattern already used elsewhere in the same codebase — `SocialService.cs:1011-1024` (`DeleteBlogFromProfileAsync`) explicitly loads and removes the linked `Post` first:
```csharp
var linkedPost = await db.Posts.FirstOrDefaultAsync(p => p.ArticleId == id);
if (linkedPost is not null) db.Posts.Remove(linkedPost);
db.BlogPosts.Remove(b);
```
`BlogService.DeleteAsync` needs the same fix (either load+null/remove the linked `Post`, or change the FK to `DeleteBehavior.SetNull` so the database enforces it unconditionally). This is an application-layer bug surfaced by the migration/FK configuration, not a migration file defect itself, but it's a direct consequence of the `ClientSetNull` choice and is real, currently reachable, and reproducible today — flagging as CRITICAL rather than advisory.

### WARNING

**2. `Program.cs` manually replays two migrations via raw SQL with a backfill condition that diverges from the real migration — silent data inconsistency depending on which code path a given database took.**
`Program.cs:166-227` runs a hand-written raw-SQL patch **before** `db.Database.Migrate()` that duplicates `20260408160000_AddArticleLinkToPost` and `20260423120000_AddOnboardingFields`, then stamps `__EFMigrationsHistory` so EF treats them as already applied (`Program.cs:210-212`). The backfill condition differs between the two code paths:
- Real migration (`20260423120000_AddOnboardingFields.cs:29`): `UPDATE Users SET OnboardingCompleted = 1 WHERE Age > 0 OR HeightCm > 0 OR LENGTH(Goal) > 0`
- Manual patch (`Program.cs:207`): `UPDATE "Users" SET "OnboardingCompleted" = 1 WHERE "Age" > 0 OR "HeightCm" > 0` — **missing the `LENGTH(Goal) > 0` clause**

A database that goes through the manual-patch path (i.e., any existing populated `fitapp.db` that predates the `OnboardingCompleted` column) will mark fewer users as onboarded than a database that runs the real EF migration — specifically, users who only ever filled in `Goal` (no `Age`/`HeightCm`) will incorrectly be routed back through the onboarding carousel. This is a genuine, silent behavioral divergence baked into deploy-time logic, not just a one-off historical fix. Recommend deleting the duplicate raw-SQL patch entirely and relying on the real migration + `db.Database.Migrate()`, or if the patch must stay (e.g. to unblock a specific broken prod DB state), make the backfill condition identical to the migration's.

**3. `20260624071754_AddFollowingIdIndex` silently drops two columns that were added 20 days earlier and never appear in a later "remove" migration name — real data-loss precedent, not just naming hygiene.**
`20260604100000_AddLinkedContentDataJsonToPost.cs` adds `Posts.LinkedContentDataJson`; `20260604100100_AddReactionTypeToLike.cs` adds `Likes.ReactionType`. Twenty days later, `20260624071754_AddFollowingIdIndex.cs:13-19` — despite its name suggesting only an index change — drops both columns:
```csharp
migrationBuilder.DropColumn(name: "LinkedContentDataJson", table: "Posts");
migrationBuilder.DropColumn(name: "ReactionType", table: "Likes");
```
Neither property exists in the current `Post`/`Like` entities or `AppDbContext`, confirming this was an intentional feature revert, not an accident — but any row that had these columns populated on a deployed database between 2026-06-04 and 2026-06-24 lost that data permanently, with no way to recover it via `Down()` (the rollback just re-adds the empty columns, `20260624071754_AddFollowingIdIndex.cs:25-35`). This is worth recording as a concrete precedent of a destructive migration having actually shipped in this repo — future migrations that drop columns should be preceded by a data-export/confirmation step if there's any chance the column was populated in a real deployed environment.

**4. `20260529084321_AddSystemWorkoutTemplates` has a `Down()` that corrupts existing system-template rows instead of restoring them.**
`Up()` makes `WorkoutTemplates.UserId` nullable (to support `UserId = null` system templates — now actively used by `WorkoutTemplateSeeder.cs`, which seeds 3 rows with `UserId = null`). `Down()` (`20260529084321_AddSystemWorkoutTemplates.cs:36-44`) reverts the column to non-nullable using `defaultValue: ""`:
```csharp
migrationBuilder.AlterColumn<string>(
    name: "UserId", table: "WorkoutTemplates", type: "TEXT",
    nullable: false, defaultValue: "", ...);
```
On SQLite this is a table rebuild; any row with `UserId IS NULL` (i.e. every seeded system template) gets backfilled to `UserId = ""` rather than a real `Users.Id`. `""` matches no row in `Users`, so those templates become orphaned against `FK_WorkoutTemplates_Users_UserId` — silently broken referential integrity (SQLite disables FK checks only transiently during the rebuild, so it won't throw at migration time, but the data is corrupt afterward and any strict FK-aware tooling or future migration touching that FK will surface it). Rolling back this migration on any database that has run `WorkoutTemplateSeeder` will corrupt the system template rows. If rollback of this migration is ever exercised, the system template rows must be deleted first.

### ADVISORY

**5. Migrations live at `FitApp.Api/Migrations/`, not `FitApp.Api/Data/Migrations/`.** The task brief, CLAUDE.md's repository structure section, and the `db-migration-specialist` persona all reference `Data/Migrations/`. The actual `--output-dir` used historically is `FitApp.Api/Migrations/` (confirmed via `dotnet ef migrations add ... --output-dir Data/Migrations` guidance in the persona file vs. the real folder found on disk). Doc drift only — no functional impact — but worth fixing in CLAUDE.md / the agent persona so future migration commands don't accidentally create a second, parallel `Data/Migrations/` folder.

**6. CLAUDE.md claims "Admin seeded on first run: andreea@gmail.com" — no such seed exists in the current codebase.** Searched all of `FitApp.Api` for `andreea@gmail.com` / `admin@` and found no matches. The only `IsAdmin = true` account is the synthetic `NovaFitOfficialSeeder` system account (`official@novafit.com`, `Data/Seeds/NovaFitOfficialSeeder.cs:44`), which has `PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString())` — i.e., intentionally unloggable. There is currently no seeded, loggable admin account anywhere in `Program.cs` or `Data/Seeds/`. Either the admin user is created out-of-band (manually, or via a script not in this repo) or the CLAUDE.md line is stale. Worth confirming with the team — if there truly is no admin bootstrap path, the `/api/blog` Admin-only CRUD and other admin-gated endpoints have no way to be exercised on a fresh clone without manual DB surgery.

**7. Startup manual-patch block in `Program.cs` (`Program.cs:172-227`) is a maintenance hazard beyond finding #2.** It reads `sqlite_master`/`pragma_table_info` directly, applies raw `ALTER TABLE`, and hand-stamps `__EFMigrationsHistory` rows for 7 different migrations across two different mechanisms (explicit stamps at lines 211-212, and a "baseline stamp if history has <3 rows" loop at lines 214-226). This pattern only exists to reconcile a database that was apparently patched out-of-band before migrations caught up (per the comment at `Program.cs:20-23` about `PendingModelChangesWarning`). It works, but every future schema change now has to be mentally cross-checked against this block to make sure it doesn't double-apply or skip a column. Recommend a cleanup pass once all production databases are confirmed to have caught up past `20260423120000_AddOnboardingFields`, so this block (and the associated `PendingModelChangesWarning` suppression at `Program.cs:24-25`) can be deleted.

**8. `WorkoutTemplate.UserId` cascade-deletes on `User` delete while also being nullable for system templates (`AppDbContext.cs:52-59`).** This is intentional and correctly commented (system templates have `UserId = null` so they're never touched by the cascade), and it works correctly under normal `Migrate()`-driven schema evolution — flagging only because it's the same column implicated in Warning #4's rollback bug, so any fix to #4 should double-check this comment/config stays consistent.

### Verified OK

- **`DailyEntry(UserId, Date)` unique index** — present, `AppDbContext.cs:45`, created in `InitialCreate.cs:229-233` (`IX_DailyEntries_UserId_Date`).
- **`Like(UserId, PostId)` unique index** — present, `AppDbContext.cs:155`, created in `AddSocialChatNotifications.cs:291-295`. `Like.PostId` also has its own standalone index (`IX_Likes_PostId`) for like-count queries.
- **`Follow(FollowerId, FollowingId)` unique index** — present, plus a deliberate non-unique `IX_Follows_FollowingId` for follower-count/fan-out queries (`AppDbContext.cs:183-186`, migration `20260624071754_AddFollowingIdIndex.cs`... note: despite the misleading drop-columns content noted in Warning #3, the index itself — created by an earlier migration and preserved — is correctly in place).
- **All FK columns checked (`Post.UserId`, `Post.LinkedWorkoutId/LinkedMealId/LinkedDailyEntryId/ArticleId`, `Comment.PostId/UserId`, `Notification.RecipientId/ActorId`, `ConversationParticipant.UserId`, `DirectMessage.SenderId`, `BlogPost.AuthorId`, `WorkoutTemplate.UserId`, `ChatConversation.UserId`, `ChatMessage.ConversationId`, `WorkoutSession.WorkoutTemplateId`) are indexed** — either via EF Core's automatic per-FK index or an explicit composite index that leads with that column. No missing-index findings from the original task brief materialized; the index strategy documented in the `db-migration-specialist` persona has clearly already been applied (`AddPerformanceIndexes`, `AddFollowingIdIndex` migrations).
- **Cascade delete configuration** — `WorkoutTemplate → WorkoutExercise/CardioDetails` (Cascade, `AppDbContext.cs:60-61`), `MealEntry → FoodItem` (Cascade, `:98`), `ChatConversation → ChatMessage` (Cascade, `:115`), `Post → Like/Comment` (Cascade, `:159-164`, `:170-178`), `Conversation → ConversationParticipant/DirectMessage` (Cascade, `:203-211`) — all explicitly configured and correct, no orphan risk. `Follow`'s two FKs to `User` both use `Restrict` specifically to avoid a cascade cycle (commented, intentional). `Post.LinkedWorkout/LinkedMeal/LinkedDailyEntry` use `SetNull` so deleting a workout/meal/daily-entry doesn't delete the social post referencing it — correct design.
- **Data seeding idempotency** — `BlogPostSeeder`, `UserSeeder`, `NovaFitOfficialSeeder`, `WorkoutTemplateSeeder` (`Data/Seeds/*.cs`) all guard with an existence check (`AnyAsync`/id lookup) before inserting, and none will duplicate or crash on repeated `SeedAsync` calls at every startup.
- **Migration `Down()` coverage** — every migration file has a non-empty, non-throwing `Down()` except the one already flagged in Warning #4 (which is present but semantically wrong, not missing).
- **SQLite ALTER TABLE compatibility** — `AddSystemWorkoutTemplates`'s `AlterColumn` (nullable change) and all `AddColumn`/`DropColumn`/`CreateIndex`/`RenameColumn` operations across the full migration history use only operations EF Core's SQLite provider handles via automatic table rebuild; nothing here requires a manual workaround.

### Overall verdict

**1 CRITICAL, 3 WARNING, 4 ADVISORY.** The index strategy and cascade-delete configuration are in good shape — this team has clearly already applied the FitApp index playbook correctly, and there's nothing left to add from the original scope (Post/Comment/Notification FK indexes are all present). The real risk in this codebase is not missing indexes; it's **procedural drift around migrations**: a hand-rolled raw-SQL replay path in `Program.cs` that has already diverged from its corresponding EF migration (Warning #2), a migration that dropped populated columns under a misleading name (Warning #3), a rollback path that would corrupt seeded system-template rows (Warning #4), and — most urgently — a live application bug (Critical #1) where the `ClientSetNull` FK behavior chosen for `Post.Article` is not honored by one of the two code paths that delete a `BlogPost`, meaning the admin "delete article" endpoint will 500 today against any article that's been shared as a post. Fix Critical #1 first; it's a live bug, not a historical migration concern.
