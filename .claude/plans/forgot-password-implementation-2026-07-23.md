# NovaFit — Forgot Password Implementation

Date: 2026-07-23  
Status: Implemented and verified

## Delivered

- Added the Login → Forgot Password → Reset Password flow.
- Added responsive `/forgot-password` and `/reset-password` pages using the shared dark glass authentication design.
- Added inline validation, password confirmation, independent password visibility controls, loading, success, invalid-token, and retry states.
- Added `POST /api/auth/forgot-password` with a generic response for both registered and unknown email addresses.
- Added `POST /api/auth/reset-password` with a generic invalid/expired-token response.
- Added cryptographically secure, URL-safe, single-use reset tokens with a 30-minute lifetime.
- Only SHA-256 token hashes are persisted; raw tokens are never stored or logged.
- A new request invalidates older tokens, and a successful reset invalidates every outstanding token for the account.
- Added branded HTML and plain-text password reset email content.
- Added `App:FrontendBaseUrl` configuration for absolute reset links.
- Existing `auth` rate limiting covers both new endpoints.

## Database

Migration: `20260723155825_AddPasswordResetTokens`

Table: `PasswordResetTokens`

- Primary key: `Id`
- Foreign key: `UserId` → `Users.Id`, cascade delete
- Unique index: `TokenHash`
- Indexes: `UserId`, `ExpiresAt`
- Audit/lifecycle fields: `CreatedAt`, `ExpiresAt`, `UsedAt`

The migration was applied to the local development database.

## Main changed areas

- `FitApp.Api/Models/Entities/PasswordResetToken.cs`
- `FitApp.Api/Models/DTOs/AuthDtos.cs`
- `FitApp.Api/Data/AppDbContext.cs`
- `FitApp.Api/Services/AuthService.cs`
- `FitApp.Api/Services/EmailService.cs`
- `FitApp.Api/Controllers/AuthController.cs`
- `FitApp.Api/appsettings.json`
- `fit-app/src/app/api/account.service.ts`
- `fit-app/src/app/app.routes.ts`
- `fit-app/src/app/features/auth/login/login.component.html`
- `fit-app/src/app/features/auth/forgot-password/*`
- `fit-app/src/app/features/auth/reset-password/*`
- `fit-app/src/app/features/auth/auth-shell.css`

## Verification

- .NET API build: passed with 0 warnings and 0 errors.
- Angular production build: passed.
- EF migration generation and local database update: passed.
- Existing unrelated Angular CSS budget warning remains for `daily-user-data.component.css` (476 bytes).

## Environment

Set `App:FrontendBaseUrl` to the deployed frontend origin in production. Configure SMTP values through production secrets/environment configuration; do not commit production credentials.
