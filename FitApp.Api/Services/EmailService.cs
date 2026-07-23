using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace FitApp.Api.Services;

public class EmailService(IConfiguration config, ILogger<EmailService> logger)
{
    public async Task SendPasswordResetEmailAsync(string toEmail, string fullName, string resetUrl)
    {
        var safeName = System.Net.WebUtility.HtmlEncode(fullName);
        var safeUrl = System.Net.WebUtility.HtmlEncode(resetUrl);
        var body = new BodyBuilder
        {
            TextBody = $"Hi {fullName},\n\nReset your NovaFit password: {resetUrl}\n\nThis link expires in 30 minutes. If you did not request it, ignore this email.",
            HtmlBody = $$"""
                <!doctype html>
                <html lang="en">
                <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset your NovaFit password</title>
                  <style>body,.novafit-email-bg{background-color:#09080d!important}.novafit-email-card,.novafit-email-cell{background-color:#121018!important;color:#f7f5fb!important}</style>
                </head>
                <body class="novafit-email-bg" bgcolor="#09080d" style="margin:0;padding:32px 16px;background-color:#09080d;color:#f7f5fb;font-family:'Segoe UI',Arial,sans-serif">
                  <table class="novafit-email-bg" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#09080d" style="background-color:#09080d"><tr><td align="center" bgcolor="#09080d" style="background-color:#09080d">
                    <table class="novafit-email-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#121018" style="max-width:520px;background-color:#121018;border:1px solid #26212f;border-radius:22px">
                      <tr><td class="novafit-email-cell" bgcolor="#121018" style="padding:32px;background-color:#121018;color:#f7f5fb">
                        <div style="color:#9b6cff;font-size:12px;font-weight:700;letter-spacing:1.4px">NOVAFIT</div>
                        <h1 style="margin:20px 0 10px;color:#fff;font-size:26px">Reset your password</h1>
                        <p style="margin:0 0 26px;color:#aaa3b4;line-height:1.65">Hi {{safeName}}, choose a new password using the secure link below. It expires in 30 minutes.</p>
                        <a href="{{safeUrl}}" style="display:block;padding:15px 22px;border:1px solid #7650b7;border-radius:14px;background:#211832;color:#fff;text-align:center;text-decoration:none;font-size:13px;font-weight:600">Reset password &nbsp;&rarr;</a>
                        <p style="margin:24px 0 0;color:#777181;font-size:11px;line-height:1.6">If you did not request this change, you can safely ignore this email.</p>
                      </td></tr>
                    </table>
                  </td></tr></table>
                </body>
                </html>
                """
        };

        await SendAsync(toEmail, fullName, "Reset your NovaFit password", body, "password reset");
    }

    public async Task SendWelcomeEmailAsync(string toEmail, string fullName)
    {
        var body = new BodyBuilder
        {
            TextBody = $"""
                Hi {fullName},

                Welcome to NovaFit. Your account is ready.

                Complete your profile, then track meals, workouts, hydration, steps, and weekly progress in one place.

                Get started: {GetFrontendBaseUrl()}/onboarding/carousel

                Build consistency, not perfection.
                """,
            HtmlBody = BuildWelcomeHtml(fullName)
        };

        await SendAsync(toEmail, fullName, "Welcome to NovaFit", body, "welcome");
    }

    public async Task SendStreakReminderAsync(string toEmail, string fullName)
    {
        var safeName = System.Net.WebUtility.HtmlEncode(fullName);
        var body = new BodyBuilder
        {
            TextBody = $"Hi {fullName},\n\nYour NovaFit streak is at risk. Log today's progress to keep it going.",
            HtmlBody = $"<p>Hi {safeName},</p><p>Your NovaFit streak is at risk. Log today's progress to keep it going.</p>"
        };

        await SendAsync(toEmail, fullName, "Your NovaFit streak is waiting", body, "streak reminder");
    }

    private async Task SendAsync(
        string toEmail,
        string fullName,
        string subject,
        BodyBuilder body,
        string emailType)
    {
        try
        {
            var senderEmail = config["Email:SenderEmail"]
                ?? throw new InvalidOperationException("Email:SenderEmail is missing.");
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(config["Email:SenderName"] ?? "NovaFit", senderEmail));
            message.To.Add(new MailboxAddress(fullName, toEmail));
            message.Subject = subject;
            message.Body = body.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(
                config["Email:SmtpHost"] ?? throw new InvalidOperationException("Email:SmtpHost is missing."),
                config.GetValue<int>("Email:SmtpPort"),
                SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(
                senderEmail,
                config["Email:Password"] ?? throw new InvalidOperationException("Email:Password is missing."));
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            logger.LogInformation("{EmailType} email sent to {Email}", emailType, toEmail);
        }
        catch (Exception ex)
        {
            logger.LogWarning("Failed to send {EmailType} email to {Email}: {Error}", emailType, toEmail, ex.Message);
        }
    }

    private string GetFrontendBaseUrl() =>
        (config["App:FrontendBaseUrl"] ?? "http://localhost:4200").TrimEnd('/');

    private string BuildWelcomeHtml(string fullName)
    {
        var safeName = System.Net.WebUtility.HtmlEncode(fullName);
        var onboardingUrl = System.Net.WebUtility.HtmlEncode($"{GetFrontendBaseUrl()}/onboarding/carousel");

        return $$"""
            <!doctype html>
            <html lang="en">
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to NovaFit</title>
              <style>
                body,.novafit-email-bg{background-color:#09080d!important}
                .novafit-email-card,.novafit-email-cell{background-color:#121018!important;color:#f7f5fb!important}
                .novafit-email-inset{background-color:#0e0c13!important}
                .novafit-email-footer{background-color:#0d0b11!important}
              </style>
            </head>
            <body class="novafit-email-bg" bgcolor="#09080d" style="margin:0;padding:0;background-color:#09080d;color:#f7f5fb;font-family:'Segoe UI',Arial,sans-serif">
              <div style="display:none;max-height:0;overflow:hidden;opacity:0">Your NovaFit account is ready. Start building your routine.</div>
              <table class="novafit-email-bg" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#09080d" style="width:100%;background-color:#09080d;padding:40px 16px">
                <tr><td align="center" bgcolor="#09080d" style="background-color:#09080d">
                  <table class="novafit-email-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#121018" style="width:100%;max-width:560px;background-color:#121018;border:1px solid #26212f;border-radius:24px;overflow:hidden">
                    <tr><td class="novafit-email-cell" bgcolor="#121018" style="padding:30px 36px 0;background-color:#121018;color:#f7f5fb">
                      <table role="presentation" cellspacing="0" cellpadding="0"><tr>
                        <td style="width:38px;height:38px;text-align:center;vertical-align:middle;background:#241a3a;border-radius:12px;color:#a879ff;font-size:17px;font-weight:800">N</td>
                        <td style="padding-left:11px;color:#f7f5fb;font-size:17px;font-weight:700">Nova<span style="color:#8b5cf6">Fit</span></td>
                      </tr></table>
                    </td></tr>
                    <tr><td class="novafit-email-cell" bgcolor="#121018" style="padding:44px 36px 34px;background-color:#121018;color:#f7f5fb">
                      <div style="margin-bottom:13px;color:#9b6cff;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Account ready</div>
                      <h1 style="margin:0 0 14px;color:#fff;font-size:30px;line-height:1.18;font-weight:750;letter-spacing:-.8px">Welcome, {{safeName}}.</h1>
                      <p style="margin:0;color:#aaa3b4;font-size:15px;line-height:1.7">Your fitness space is ready. Keep everything that shapes your progress in one calm, connected place.</p>
                    </td></tr>
                    <tr><td class="novafit-email-cell" bgcolor="#121018" style="padding:0 36px 34px;background-color:#121018;color:#f7f5fb">
                      <table class="novafit-email-inset" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#0e0c13" style="width:100%;background-color:#0e0c13;border-radius:18px">
                        <tr>
                          <td style="width:34px;padding:19px 0 19px 20px;color:#9b6cff;font-size:12px;font-weight:700;vertical-align:top">01</td>
                          <td style="padding:18px 20px"><div style="color:#f3f0f7;font-size:14px;font-weight:650">Track your day</div><div style="margin-top:4px;color:#777181;font-size:12px;line-height:1.5">Meals, workouts, water and steps in one dashboard.</div></td>
                        </tr>
                        <tr>
                          <td style="width:34px;padding:19px 0 19px 20px;border-top:1px solid #211d28;color:#9b6cff;font-size:12px;font-weight:700;vertical-align:top">02</td>
                          <td style="padding:18px 20px;border-top:1px solid #211d28"><div style="color:#f3f0f7;font-size:14px;font-weight:650">Understand the pattern</div><div style="margin-top:4px;color:#777181;font-size:12px;line-height:1.5">Use AI tools and weekly insights without the noise.</div></td>
                        </tr>
                        <tr>
                          <td style="width:34px;padding:19px 0 19px 20px;border-top:1px solid #211d28;color:#9b6cff;font-size:12px;font-weight:700;vertical-align:top">03</td>
                          <td style="padding:18px 20px;border-top:1px solid #211d28"><div style="color:#f3f0f7;font-size:14px;font-weight:650">See meaningful progress</div><div style="margin-top:4px;color:#777181;font-size:12px;line-height:1.5">Build consistency and review what actually changes.</div></td>
                        </tr>
                      </table>
                    </td></tr>
                    <tr><td class="novafit-email-cell" bgcolor="#121018" style="padding:0 36px 40px;background-color:#121018;color:#f7f5fb">
                      <a href="{{onboardingUrl}}" style="display:block;padding:15px 24px;border:1px solid #7650b7;border-radius:14px;background:#211832;color:#f7f5fb;text-align:center;text-decoration:none;font-size:13px;font-weight:600">Set up your NovaFit profile &nbsp;&rarr;</a>
                      <p style="margin:18px 0 0;color:#777181;font-size:11px;line-height:1.6;text-align:center">Build consistency, not perfection.</p>
                    </td></tr>
                    <tr><td class="novafit-email-footer" bgcolor="#0d0b11" style="padding:23px 36px;background-color:#0d0b11;border-top:1px solid #211d28;text-align:center">
                      <p style="margin:0;color:#66606e;font-size:10px;line-height:1.65">You received this email because a NovaFit account was created with this address.<br>If this wasn't you, you can safely ignore it.</p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """;
    }
}
