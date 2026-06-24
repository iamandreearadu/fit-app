using System.Text;
using System.Threading.RateLimiting;
using System.IO.Compression;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.Data.Sqlite;
using FitApp.Api.Data;
using FitApp.Api.Hubs;
using FitApp.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ── Database ──────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(opt =>
{
    opt.UseSqlite(builder.Configuration.GetConnectionString("Default"));
    // Suppress PendingModelChangesWarning — startup already applies migrations via
    // db.Database.Migrate() and manual column patching above. EF Core 10 made this
    // warning an error by default, which blocks startup when migrations exist but
    // haven't been applied yet (normal for auto-migrate on startup pattern).
    opt.ConfigureWarnings(w => w.Ignore(
        Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
});

// ── JWT Authentication ────────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            NameClaimType = "sub"
        };

        // Allow JWT via query string for SignalR WebSocket connections
        opt.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(opt =>
{
    var origins = builder.Environment.IsDevelopment()
        ? new[] { "http://localhost:4200", "https://localhost:4200" }
        : new[] { "https://nove-fit.net", "https://www.nove-fit.net" };

    opt.AddPolicy("Angular", policy => policy
        .WithOrigins(origins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());  // Required for SignalR WebSocket
});

// ── HTTP Client for Groq AI ───────────────────────────────────────────────────
builder.Services.AddHttpClient("Groq", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Groq:BaseUrl"]!);
    client.DefaultRequestHeaders.Authorization =
        new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", builder.Configuration["Groq:ApiKey"]);
    client.Timeout = TimeSpan.FromSeconds(60);
});

// ── HTTP Client for USDA FoodData Central ────────────────────────────────────
builder.Services.AddHttpClient("USDA", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Usda:BaseUrl"]!);
    client.Timeout = TimeSpan.FromSeconds(15);
});

// ── In-memory cache (food search results, 30-min sliding TTL) ────────────────
builder.Services.AddMemoryCache();


// ── Response Compression ─────────────────────────────────────────────────────
builder.Services.AddResponseCompression(opts =>
{
    opts.EnableForHttps = true;
    opts.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(
        ["application/json", "text/json"]);
});
builder.Services.Configure<GzipCompressionProviderOptions>(opts =>
    opts.Level = CompressionLevel.Fastest);
// ── SignalR ───────────────────────────────────────────────────────────────────
builder.Services.AddSignalR();

// ── Application Services ──────────────────────────────────────────────────────
builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<MetricsService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<DailyDataService>();
builder.Services.AddScoped<WorkoutService>();
builder.Services.AddScoped<WorkoutSessionService>();
builder.Services.AddScoped<NutritionService>();
builder.Services.AddScoped<FoodSearchService>();
builder.Services.AddScoped<OnboardingService>();
builder.Services.AddScoped<BlogService>();
builder.Services.AddScoped<AiProxyService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<ChatService>();

// Social / Messaging / Notifications
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IFileStorageService, FileStorageService>();
builder.Services.AddScoped<IConversationService, ConversationService>();
builder.Services.AddScoped<ISocialService, SocialService>();

// Dashboard
builder.Services.AddScoped<IDashboardService, DashboardService>();

// ── Rate Limiting ─────────────────────────────────────────────────────────────
builder.Services.AddRateLimiter(o =>
{
    o.AddFixedWindowLimiter("auth", cfg =>
    {
        cfg.PermitLimit = 10;
        cfg.Window = TimeSpan.FromMinutes(1);
        cfg.QueueLimit = 0;
        cfg.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });
    o.RejectionStatusCode = 429;
});

// ── Controllers & OpenAPI ─────────────────────────────────────────────────────
builder.WebHost.ConfigureKestrel(opts =>
    opts.Limits.MaxRequestBodySize = 20 * 1024 * 1024); // 20 MB

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

var app = builder.Build();

// ── Startup guards ────────────────────────────────────────────────────────────
var usdaKey = app.Configuration["Usda:ApiKey"];
if (string.IsNullOrWhiteSpace(usdaKey) || usdaKey == "DEMO_KEY")
{
    app.Logger.LogWarning(
        "USDA API key is DEMO_KEY or empty (30 req/hr limit). " +
        "Register a production key at https://api.data.gov/signup/");
}

// ── Auto-migrate on startup ───────────────────────────────────────────────────
// Use a standalone connection so writes are committed before EF Core's Migrate() runs.
var connStr = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' is missing from appsettings.json.");
var dbPath = connStr.Replace("Data Source=", "", StringComparison.OrdinalIgnoreCase).Trim();

if (File.Exists(dbPath) && new FileInfo(dbPath).Length > 0)
{
    using var raw = new SqliteConnection($"Data Source={dbPath}");
    raw.Open();

    // Ensure __EFMigrationsHistory exists
    Exec(raw, """
        CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
            "MigrationId" TEXT NOT NULL CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY,
            "ProductVersion" TEXT NOT NULL
        )
        """);

    // Guard: skip column patches if core tables don't exist yet (fresh db)
    var hasPosts = Scalar(raw, "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='Posts'") > 0;
    var hasUsers = Scalar(raw, "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='Users'") > 0;

    // Check which new columns exist
    var hasArticleId  = hasPosts && Scalar(raw, "SELECT COUNT(*) FROM pragma_table_info('Posts') WHERE name='ArticleId'")  > 0;
    var hasOnboarding = hasUsers && Scalar(raw, "SELECT COUNT(*) FROM pragma_table_info('Users') WHERE name='OnboardingCompleted'") > 0;

    // Apply missing columns directly — idempotent, no dependency on migration history
    if (hasPosts && !hasArticleId)
    {
        Exec(raw, "ALTER TABLE \"Posts\" ADD COLUMN \"ArticleId\" INTEGER");
        Exec(raw, "CREATE INDEX IF NOT EXISTS \"IX_Posts_ArticleId\" ON \"Posts\"(\"ArticleId\")");
    }
    if (hasUsers && !hasOnboarding)
    {
        Exec(raw, "ALTER TABLE \"Users\" ADD COLUMN \"OnboardingCompleted\" INTEGER NOT NULL DEFAULT 0");
        Exec(raw, "ALTER TABLE \"Users\" ADD COLUMN \"DietaryPreference\" TEXT");
        // Backfill: users with biometric data (Age > 0 OR HeightCm > 0)
        // are marked as onboarding complete — they used the old wizard.
        // Users with no biometrics will be routed through the new carousel
        // on next login. Intentional — they benefit from the new flow.
        Exec(raw, "UPDATE \"Users\" SET \"OnboardingCompleted\" = 1 WHERE \"Age\" > 0 OR \"HeightCm\" > 0");
    }

    // Stamp these migrations so EF Core's Migrate() treats them as applied
    Exec(raw, "INSERT OR IGNORE INTO __EFMigrationsHistory (MigrationId, ProductVersion) VALUES ('20260408160000_AddArticleLinkToPost', '10.0.5')");
    Exec(raw, "INSERT OR IGNORE INTO __EFMigrationsHistory (MigrationId, ProductVersion) VALUES ('20260423120000_AddOnboardingFields', '10.0.5')");

    // Stamp baseline migrations for fresh EnsureCreated databases that have no history at all
    if (Scalar(raw, "SELECT COUNT(*) FROM __EFMigrationsHistory") < 3)
    {
        foreach (var m in new[] {
            "20260327105004_InitialCreate",
            "20260401073945_AddIsAdminToUsers",
            "20260401083523_AddChatConversations",
            "20260407101453_AddSocialChatNotifications",
            "20260408130513_AddProfileSections" })
        {
            Exec(raw, $"INSERT OR IGNORE INTO __EFMigrationsHistory (MigrationId, ProductVersion) VALUES ('{m}', '10.0.5')");
        }
    }
}

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    await FitApp.Api.Data.Seeds.BlogPostSeeder.SeedAsync(db);
    await FitApp.Api.Data.Seeds.UserSeeder.SeedAsync(db);
    await FitApp.Api.Data.Seeds.WorkoutTemplateSeeder.SeedAsync(db);
    await FitApp.Api.Data.Seeds.NovaFitOfficialSeeder.SeedAsync(db);
}

static void Exec(SqliteConnection c, string sql)
{
    using var cmd = c.CreateCommand();
    cmd.CommandText = sql;
    cmd.ExecuteNonQuery();
}
static long Scalar(SqliteConnection c, string sql)
{
    using var cmd = c.CreateCommand();
    cmd.CommandText = sql;
    return (long)(cmd.ExecuteScalar() ?? 0L);
}

// ── Ensure upload directories exist ──────────────────────────────────────────
var chatUploadsDir = Path.Combine(app.Environment.WebRootPath ?? "wwwroot", "uploads", "chat");
Directory.CreateDirectory(chatUploadsDir);

// ── Middleware ────────────────────────────────────────────────────────────────
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseRateLimiter();
app.UseResponseCompression();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();  // available at /openapi/v1.json
}

app.UseCors("Angular");
app.UseAuthentication();
app.UseAuthorization();

// ── Static files ──────────────────────────────────────────────────────────────
app.UseStaticFiles();

// Serve Angular SPA from wwwroot/angular-build/browser in production
if (!app.Environment.IsDevelopment())
{
    var spaPath = Path.Combine(app.Environment.WebRootPath ?? "wwwroot", "angular-build", "browser");
    if (Directory.Exists(spaPath))
    {
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(spaPath),
            RequestPath = ""
        });
    }
}

app.MapControllers();

// ── SignalR Hubs ──────────────────────────────────────────────────────────────
app.MapHub<ChatHub>("/hubs/chat");
app.MapHub<NotificationHub>("/hubs/notifications");

// ── Angular SPA fallback (non-API / non-hub routes → index.html) ──────────────
if (!app.Environment.IsDevelopment())
{
    app.MapFallbackToFile("angular-build/browser/index.html");
}

app.Run();
