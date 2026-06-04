using FitApp.Api.Data;
using FitApp.Api.Models.DTOs;
using FitApp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FitApp.Api.Services;

public class AuthService(AppDbContext db, JwtService jwt, EmailService email)
{
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
            Token = jwt.GenerateToken(user.Id, user.Email, user.FullName, user.IsAdmin)
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
            Token = jwt.GenerateToken(user.Id, user.Email, user.FullName, user.IsAdmin)
        }, null);
    }
}