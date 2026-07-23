# NovaFit — Forgot Password Implementation Plan

Date: 2026-07-23  
Status: Approved for implementation

## Objective

Implement a complete, secure password-reset flow for NovaFit across API, database, email, and Angular UI. The flow must work on desktop and mobile, match the current dark-glass authentication design, and must not reveal whether an email address is registered.

## User flow

1. The user selects **Forgot password?** on Login.
2. NovaFit opens `/forgot-password`.
3. The user enters an email address.
4. The API always returns the same successful response, whether or not the account exists.
5. For an existing account, the API:
   - invalidates previous unused reset tokens;
   - generates a cryptographically secure random token;
   - stores only a SHA-256 hash of the token;
   - gives the token a 30-minute expiry;
   - sends a reset link to the account email.
6. The user opens `/reset-password?token=...`.
7. The user enters and confirms a new password.
8. The API validates the token, expiry, one-time-use status, and password policy.
9. The password is re-hashed with BCrypt, the token is marked used, and all other active reset tokens are invalidated.
10. The UI confirms completion and sends the user to Login.

## Security decisions

- Never expose account existence through response status, response body, or UI copy.
- Apply the existing `auth` rate limiter to both reset endpoints.
- Generate tokens with `RandomNumberGenerator.GetBytes(32)`.
- Place the raw URL-safe token only in the email link.
- Persist only its SHA-256 hash.
- Tokens expire after 30 minutes and are single-use.
- Requesting another reset invalidates older unused tokens.
- Resetting a password invalidates every outstanding token for that user.
- Do not log raw reset tokens or reset links.
- Validate the new password on both client and server.
- Confirmation password is a client concern and is never sent to the API.
- Return a generic invalid/expired-link error for token validation failures.

## Backend implementation

### Data model

Add `PasswordResetToken`:

- `Id`
- `UserId`
- `TokenHash`
- `ExpiresAt`
- `UsedAt`
- `CreatedAt`
- navigation to `User`

Add database indexes:

- unique index on `TokenHash`;
- index on `UserId`;
- index on `ExpiresAt`.

Create and apply an EF Core migration.

### API contract

Add:

- `POST /api/auth/forgot-password`
  - request: `{ email }`
  - response: generic success message
- `POST /api/auth/reset-password`
  - request: `{ token, newPassword }`
  - success: password updated
  - invalid, expired, or used token: generic `400` problem response

### Services

Extend `AuthService` with:

- reset-request orchestration;
- secure token generation and hashing;
- reset-token validation;
- password update and token invalidation.

Extend `EmailService` with:

- a branded password-reset email;
- an absolute frontend URL from configuration;
- plain-text fallback plus HTML content.

Configuration:

- `App:FrontendBaseUrl` with a local development default.
- Never store SMTP secrets or reset tokens in source control.

## Frontend implementation

### API and facade

Add typed methods to the auth/account API layer:

- `requestPasswordReset(email)`
- `resetPassword(token, newPassword)`

Expose loading and safe error states without altering the authenticated session.

### Forgot Password page

Route: `/forgot-password`

- email input with existing validation;
- generic success state;
- resend option after completion;
- back-to-login link;
- no account enumeration language.

### Reset Password page

Route: `/reset-password`

- read token from query parameters;
- new password input;
- confirm password input;
- independent show/hide controls;
- matching-password validation;
- expired/invalid-link state;
- success state with Login action.

### Login integration

- Replace the disabled “Forgot password?” text with a real router link.

## UI/UX direction

- Reuse `auth-shell.css` and the current NovaFit glassmorphism.
- Desktop: split editorial/form composition consistent with Login/Register.
- Mobile: single-column, edge-to-edge form with safe-area padding.
- Minimum 44–48 px touch targets.
- Inline errors under the relevant field.
- Loading state in the primary action.
- Success and invalid-link states use icon + text, never color alone.
- Respect `prefers-reduced-motion`.

## Email behavior in development

- If SMTP is configured, send the email normally.
- If SMTP is unavailable, log only that delivery failed; never log the raw token.
- API response remains generic in every case.

## Verification

Backend:

- request for existing and missing email returns identical success;
- token hash is stored, raw token is not;
- expired token is rejected;
- used token is rejected;
- second request invalidates first token;
- successful reset allows new password and rejects old password;
- rate limiting remains active.

Frontend:

- Login link opens Forgot Password;
- email validation and generic success state work;
- reset form rejects mismatched passwords;
- missing/invalid token displays recovery state;
- successful reset returns user to Login;
- responsive checks at 360 px, 390 px, 768 px, and desktop;
- Angular production build passes.

## Documentation after implementation

Write the completed implementation record to:

`.claude/plans/forgot-password-implementation-2026-07-23.md`

Include changed files, migration name, API contract, security properties, tests, and any environment configuration required.
