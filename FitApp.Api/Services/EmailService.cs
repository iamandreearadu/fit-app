using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace FitApp.Api.Services;

public class EmailService(IConfiguration config, ILogger<EmailService> logger)
{
    public async Task SendWelcomeEmailAsync(string toEmail, string fullName)
    {
        try
        {
            var host = config["Email:SmtpHost"]!;
            var port = int.Parse(config["Email:SmtpPort"]!);
            var senderEmail = config["Email:SenderEmail"]!;
            var senderName = config["Email:SenderName"]!;
            var password = config["Email:Password"]!;

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(senderName, senderEmail));
            message.To.Add(new MailboxAddress(fullName, toEmail));
            message.Subject = "Welcome to FitApp! 🎉";

            message.Body = new TextPart("html")
            {
                Text = BuildWelcomeHtml(fullName)
            };

            using var client = new SmtpClient();
            await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(senderEmail, password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            logger.LogInformation("Welcome email sent to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            // Email failure should never block registration
            logger.LogWarning("Failed to send welcome email to {Email}: {Error}", toEmail, ex.Message);
        }
    }

    private static string BuildWelcomeHtml(string fullName) => $"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Welcome to FitApp</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
            <tr>
              <td align="center">
                <table width="560" cellpadding="0" cellspacing="0"
                       style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 48px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:700;letter-spacing:-0.5px;">
                        FitApp 💪
                      </h1>
                      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">
                        Your personal fitness companion
                      </p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:40px 48px;">
                      <h2 style="margin:0 0 16px;color:#18181b;font-size:22px;font-weight:600;">
                        Hey {fullName}, welcome aboard! 🎉
                      </h2>
                      <p style="margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.7;">
                        We're thrilled to have you join <strong>FitApp</strong> — your new home for tracking
                        workouts, nutrition, and daily wellness goals.
                      </p>
                      <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.7;">
                        Here's what you can do right away:
                      </p>

                      <!-- Feature list -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                        <tr>
                          <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
                            <span style="font-size:20px;">🏋️</span>
                            <span style="margin-left:12px;color:#27272a;font-size:14px;font-weight:500;">
                              Log your workouts and track progress
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
                            <span style="font-size:20px;">🥗</span>
                            <span style="margin-left:12px;color:#27272a;font-size:14px;font-weight:500;">
                              Monitor your nutrition and daily macros
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
                            <span style="font-size:20px;">💧</span>
                            <span style="margin-left:12px;color:#27272a;font-size:14px;font-weight:500;">
                              Stay on top of hydration and step goals
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0;">
                            <span style="font-size:20px;">🤖</span>
                            <span style="margin-left:12px;color:#27272a;font-size:14px;font-weight:500;">
                              Get AI-powered fitness insights
                            </span>
                          </td>
                        </tr>
                      </table>

                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="http://localhost:4200"
                               style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);
                                      color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;
                                      padding:14px 36px;border-radius:8px;letter-spacing:0.2px;">
                              Start Your Journey →
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#fafafa;padding:24px 48px;text-align:center;border-top:1px solid #f4f4f5;">
                      <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.6;">
                        You're receiving this email because you just created a FitApp account.<br/>
                        If this wasn't you, please ignore this message.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """;
}
