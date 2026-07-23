using FitApp.Api.Data;
using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Services;

public sealed class StreakReminderWorker(
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment,
    ILogger<StreakReminderWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (environment.IsEnvironment("Testing") || !configuration.GetValue("Reminders:Streak:Enabled", false)) return;
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(15));
        do
        {
            try { await SendDueRemindersAsync(stoppingToken); }
            catch (Exception ex) { logger.LogError(ex, "Streak reminder cycle failed."); }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task SendDueRemindersAsync(CancellationToken cancellationToken)
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById(configuration["Reminders:TimeZone"] ?? "Europe/Bucharest");
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone);
        if (localNow.Hour != configuration.GetValue("Reminders:Streak:Hour", 18)) return;

        var today = DateOnly.FromDateTime(localNow).ToString("yyyy-MM-dd");
        var yesterday = DateOnly.FromDateTime(localNow).AddDays(-1).ToString("yyyy-MM-dd");
        var utcDayStart = TimeZoneInfo.ConvertTimeToUtc(localNow.Date, zone);
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();
        var email = scope.ServiceProvider.GetRequiredService<EmailService>();
        var actorId = await db.Users.Where(u => u.Email == "official@novafit.com")
            .Select(u => u.Id).FirstOrDefaultAsync(cancellationToken);
        if (actorId is null) return;

        var dueUsers = await db.Users
            .Where(u => u.Id != actorId
                && db.DailyEntries.Any(d => d.UserId == u.Id && d.Date == yesterday)
                && !db.DailyEntries.Any(d => d.UserId == u.Id && d.Date == today)
                && !db.Notifications.Any(n => n.RecipientId == u.Id && n.Type == NotificationType.StreakReminder && n.CreatedAt >= utcDayStart))
            .Select(u => new { u.Id, u.Email, u.FullName }).ToListAsync(cancellationToken);

        foreach (var user in dueUsers)
        {
            await notifications.CreateAndPushAsync(user.Id, actorId, NotificationType.StreakReminder, null,
                "Your streak is at risk. Log today's progress to keep it going.");
            await email.SendStreakReminderAsync(user.Email, user.FullName);
        }
    }
}
