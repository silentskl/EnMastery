# English Mastery V1.0.2 Hotfix 12.4.3

## Deployment dependency readiness fix

- Fixes update failure where `node_modules` existed but `node_modules/.bin/tsc` did not.
- Deployment now validates required local npm binaries instead of treating the directory alone as a complete install.
- Normal deploy/update requires `wrangler`, `tsc`, `next`, and `opennextjs-cloudflare`; `--skip-build` only requires `wrangler`.
- Missing/incomplete dependencies automatically trigger the resilient installer.
- Dependency installation explicitly uses `--include=dev`, so TypeScript and Wrangler are installed even when the host sets `NODE_ENV=production` or omits dev dependencies by default.
- `--skip-install` now fails early with a precise list of missing commands instead of reaching `tsc: command not found`.
- No database migration and no application behavior change.
