# English Mastery v1.0.2 Hotfix 11.9

## D1 rows-read optimisation

- Replaces repeated full-history aggregation for progress calendar/streak, vocabulary review, Tenant AI usage and Work Queue status with incrementally maintained rollups.
- Replaces Question Bank, Cloze and vocabulary candidate `ORDER BY RANDOM()` sorting with indexed cursor sampling and wrap-around pagination.
- Removes the Work Queue correlated queue-position counter and calculates positions from one tenant-bounded FIFO page.
- Adds covering indexes for Reading/Listening history, Question Bank visibility, Tenant dashboard counts and Work Queue display/FIFO access.
- Keeps the only remaining `ORDER BY RANDOM()` on the fixed eight-row reward catalogue; it is bounded and cannot grow through Tenant content.

## Database

- Adds `0056_v102_hotfix119_d1_rows_read_optimization.sql`.
- 56 migrations, 106 application tables and 17 maintenance triggers.
- New rollups are backfilled during migration and maintained for INSERT, DELETE, value update and key-moving update operations.
- Existing question-bank and vocabulary catalogue rows receive stable indexed sampling keys; newly generated Question Bank items receive a cryptographically random 31-bit key.

## Release gate

- `scripts/test_hotfix119.py` validates schema counts, rollup correctness, indexed sampling, removal of unbounded random sorting and SQLite `EXPLAIN QUERY PLAN` indexed `SEARCH` paths.
- `scripts/test_d1_migrations.py` runs migration 0056 under the D1-compatible compound-SELECT limit.
- `npm run check:release` now includes Hotfix 11.9.
