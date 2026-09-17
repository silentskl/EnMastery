# English Mastery V1.0.2 Hotfix 4

## Tenant welcome email

A welcome email is now attempted whenever a new tenant gains its initial Tenant Admin identity:

- public self-registration (`/register`);
- Platform Admin creates a tenant and supplies its Tenant Admin details;
- Platform Admin creates a tenant without an Admin and later configures its first Tenant Admin.

The email is sent through the Platform SMTP integration. It includes the organisation name, tenant slug, Admin email, Tenant Admin login URL and onboarding guidance. Passwords are never included in email.

SMTP delivery failure does not roll back an already-created tenant. Delivery outcome is retained in audit details.

## Forgot password / email reset

Tenant Admin login now exposes **Forgot password? Reset it by email**.

Flow:

1. Enter tenant slug and Admin email.
2. English Mastery issues a cryptographically random 256-bit token when the account exists.
3. Only the SHA-256 hash is stored in D1.
4. An SMTP email contains a link to `/admin/reset-password?token=...`.
5. The link expires after 30 minutes and can be used only once.
6. A successful reset clears lockout counters, consumes all outstanding reset tokens for that Admin/tenant and terminates existing Tenant Admin sessions.

Security controls include generic responses for unknown accounts, hashed account/IP request-throttle keys, per-IP and per-account hourly request limits, no password/token logging, and invalidation of a token when SMTP delivery fails.

## Database

New migration:

`0042_v102_account_email_password_reset.sql`

New tables:

- `tenant_password_reset_attempts`
- `tenant_password_reset_tokens`

## SMTP prerequisite

Platform → Integrations → SMTP must be enabled and configured. The same SMTP connection now covers system notifications, tenant welcome mail and Tenant Admin password-reset links.
