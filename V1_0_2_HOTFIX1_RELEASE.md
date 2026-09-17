# English Mastery v1.0.2 Hotfix 1

## Fixes

- Fixed Cloudflare `cloudflare:sockets` TypeScript compatibility in `lib/notifications/smtp.ts`.
  - Do not import `Socket` from `cloudflare:sockets`; the module exports `connect`.
  - Derive the socket type with `ReturnType<typeof connect>`.
  - Pass required `allowHalfOpen: false` in `SocketOptions`.
  - Explicitly type `secureTransport` as `"off" | "on" | "starttls"`.
- Added `english-mastery-*/**` to the TypeScript exclude list to avoid duplicate diagnostics when a release archive is accidentally extracted inside another English Mastery project directory.

## Validation

- SMTP module targeted TypeScript check: PASS against the Cloudflare socket declaration shape used by current Workers types.
- Release self-check: see test report.
