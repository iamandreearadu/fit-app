using System.Collections.Generic;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace FitApp.Api.Tests;

/// <summary>
/// Boots the real FitApp.Api pipeline (Program.cs, all controllers, real EF Core migrations)
/// against a throwaway SQLite file per factory instance, so ownership/authorization checks are
/// exercised through the actual Controller -> Service -> EF Core -> SQLite pipeline instead of
/// mocks. The db file is created fresh (path never exists beforehand) so Program.cs's manual
/// raw-SQL column-patch block is skipped and only db.Database.Migrate() applies the schema.
/// </summary>
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _dbPath = Path.Combine(
        Path.GetTempPath(), $"fitapp-test-{Guid.NewGuid():N}.db");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Jwt:Secret", "test-only-secret-not-for-production-use-32chars+");
        builder.UseSetting("Jwt:Issuer", "fitapp-api");
        builder.UseSetting("Jwt:Audience", "fitapp-angular");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = $"Data Source={_dbPath}",
                ["Jwt:Secret"] = "test-only-secret-not-for-production-use-32chars+",
                ["Jwt:Issuer"] = "fitapp-api",
                ["Jwt:Audience"] = "fitapp-angular",
                ["Groq:BaseUrl"] = "https://api.groq.com/openai/v1",
                ["Groq:ApiKey"] = "test-groq-key",
                ["Usda:BaseUrl"] = "https://api.nal.usda.gov/fdc/v1",
                ["Usda:ApiKey"] = "DEMO_KEY",
                ["Email:SmtpHost"] = "smtp.gmail.com",
                ["Email:SmtpPort"] = "587",
                ["Email:SenderEmail"] = "test@example.com",
                ["Email:SenderName"] = "FitApp Test",
                ["Email:Password"] = "test-password"
            });
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        try
        {
            if (File.Exists(_dbPath)) File.Delete(_dbPath);
            var wal = _dbPath + "-wal";
            var shm = _dbPath + "-shm";
            if (File.Exists(wal)) File.Delete(wal);
            if (File.Exists(shm)) File.Delete(shm);
        }
        catch
        {
            // best-effort cleanup — temp dir gets swept eventually regardless
        }
    }
}
