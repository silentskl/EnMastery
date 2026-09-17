# English Mastery v1.0.2 Hotfix 2

## Fix
- Replaced the top-level `cloudflare:sockets` import in the shared SMTP module with Cloudflare-supported Node compatibility APIs: `node:net` and `node:tls`.
- This prevents `next build` / OpenNext page-data collection from trying to evaluate a Workers-only module in the Node.js build process.
- SMTP still supports plain TCP, implicit TLS (465), STARTTLS (587), AUTH LOGIN, and AUTH PLAIN.
- Port 25 remains intentionally blocked because Cloudflare Workers does not allow outbound SMTP on port 25.

## Compatibility
- `wrangler.jsonc` uses compatibility date `2026-08-25` and `nodejs_compat`, which supports `node:net` and `node:tls` in Workers.
