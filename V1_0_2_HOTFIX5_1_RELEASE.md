# English Mastery V1.0.2 Hotfix 5.1

This release fixes remote Cloudflare D1 migration failure `too many terms in compound SELECT: SQLITE_ERROR` when applying migrations 0043 and 0044.

## Root cause

The previous migrations used seven-term `UNION ALL` chains to seed stages/activities. Cloudflare D1's remote migration execution path can enforce a lower SQLite compound-SELECT limit than desktop SQLite.

## Fix

- 0043 stage seed now uses `WITH levels(level) AS (VALUES ...)`.
- 0044 stage/activity seed now uses `VALUES` CTEs.
- No `UNION ALL` remains in 0043 or 0044.
- Migration filenames/numbers remain unchanged because a failed D1 migration is rolled back and not recorded as applied.
- `scripts/test_d1_migrations.py` reproduces the strict limit with `SQLITE_LIMIT_COMPOUND_SELECT=3` and is part of `npm run check:release`.

## Retry

After replacing the project with Hotfix 5.1, run:

```bash
npx wrangler d1 migrations list english-mastery --remote
npm run db:migrate:remote
```

0043 and 0044 should still appear pending before the retry.
