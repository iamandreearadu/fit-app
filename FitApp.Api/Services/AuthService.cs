using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.WebUtilities;
using System.Security.Cryptography;
using System.Text;

namespace FitApp.Api.Services;

public class AuthService(AppDbContext db, JwtService jwt, EmailService email, IConfiguration config)
{
    public const string ResetRequestMessage =
        "If an account exists for that email, a password reset link has been sent.";

    public async Task<AuthResponse?> LoginAsync(LoginRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email.ToLower());
        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return null;

        return new AuthResponse
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            IsAdmin = user.IsAdmin,
            Token = jwt.GenerateToken(user.Id, user.IsAdmin)
        };
    }

    public async Task<(AuthResponse? response, string? error)> RegisterAsync(RegisterRequest req)
    {
        var exists = await db.Users.AnyAsync(u => u.Email == req.Email.ToLower());
        if (exists)
            return (null, "Email is already in use.");

        var user = new User
        {
            Id = Guid.NewGuid().ToString(),
            Email = req.Email.ToLower(),
            FullName = req.FullName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            // Fix 4: capture primary goal at registration for immediate use in biometrics/TDEE flow.
            // Defaults to "maintain" for backward-compatible clients that omit the field.
            Goal = req.Goal ?? "maintain"
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        // Send welcome email (non-blocking)
        _ = email.SendWelcomeEmailAsync(user.Email, user.FullName);

        return (new AuthResponse
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            IsAdmin = user.IsAdmin,
            Token = jwt.GenerateToken(user.Id, user.IsAdmin)
        }, null);
    }

    public async Task RequestPasswordResetAsync(ForgotPasswordRequest req)
    {
        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(candidate => candidate.Email == normalizedEmail);
        if (user is null)
            return;

        var now = DateTime.UtcNow;
        var activeTokens = await db.PasswordResetTokens
            .Where(token => token.UserId == user.Id && token.UsedAt == null)
            .ToListAsync();

        foreach (var token in activeTokens)
            token.UsedAt = now;

        var rawToken = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = HashResetToken(rawToken),
            CreatedAt = now,
            ExpiresAt = now.AddMinutes(30)
        });

        await db.SaveChangesAsync();

        var frontendBaseUrl = (config["App:FrontendBaseUrl"] ?? "http://localhost:4200").TrimEnd('/');
        var resetUrl = $"{frontendBaseUrl}/reset-password?token={Uri.EscapeDataString(rawToken)}";
        await email.SendPasswordResetEmailAsync(user.Email, user.FullName, resetUrl);
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordRequest req)
    {
        var tokenHash = HashResetToken(req.Token);
        var now = DateTime.UtcNow;
        var resetToken = await db.PasswordResetTokens
            .Include(token => token.User)
            .FirstOrDefaultAsync(token =>
                token.TokenHash == tokenHash &&
                token.UsedAt == null &&
                token.ExpiresAt > now);

        if (resetToken is null)
            return false;

        resetToken.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);

        var outstandingTokens = await db.PasswordResetTokens
            .Where(token => token.UserId == resetToken.UserId && token.UsedAt == null)
            .ToListAsync();
        foreach (var token in outstandingTokens)
            token.UsedAt = now;

        await db.SaveChangesAsync();
        return true;
    }

    private static string HashResetToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
