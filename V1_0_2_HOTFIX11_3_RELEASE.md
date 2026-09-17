# English Mastery v1.0.2 Hotfix 11.3

## Fixes

- Removes `LIKE` / `GLOB` matching from the Daily Planner materialisation path. Planner cache cleanup now uses SQLite `instr()`, avoiding Cloudflare D1 `LIKE or GLOB pattern too complex` failures.
- Planner cache version is bumped to `daily-cache-v8-tenant-vocab-d1-safe` so unstarted legacy cached tasks are rebuilt after deployment.
- Today Mission degraded fallback now fills **missing** Listening / Speaking / Reading / Vocabulary / scheduled Writing tasks even when a partial mission already exists. A planner error can no longer leave only Speaking + Vocabulary visible.
- Daily Vocabulary word-book assignment is **Tenant Admin only**. Student APIs can no longer change the Daily Learning collection; Student word-book cards no longer expose `Use for daily learning`.
- Tenant Admin Learning Settings now visibly owns `Use for daily learning` for each learner stage.
- Removes the PERSONAL word-book model. All custom word books are Tenant-owned.
- Migration `0052_v102_hotfix113_tenant_wordbooks_planner.sql` converts historical learner-owned custom word books to their learner's Tenant and clears the legacy `owner_child_id` while preserving the book and all memberships.
- Student lesson vocabulary can still be saved into Tenant custom word books available to that learner.
- Inherits Hotfix 11.2 resilient model-JSON repair, import idempotency/de-duplication, persistent FIFO vocabulary import, and configurable Work Queue timeout.

## Database

- 52 migrations.
- Latest migration: `0052_v102_hotfix113_tenant_wordbooks_planner.sql`.

## Release gate

Run `npm run verify:release` in a dependency-backed environment.
