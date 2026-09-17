# V0.9.0 R13 — Status-filtered bulk selection

R13 standardises administration screens around one rule:

1. Filter records by **Status**.
2. Use **Select filtered** (or `Select up to 20 filtered` for the curated Story Bank).
3. Apply the allowed bulk action only to those selected records.
4. Changing the status filter clears selection, preventing hidden rows from remaining selected accidentally.

## Listening / Curated Story Bank

The 120-story bank derives two operational states:

- **Curated** — publisher metadata is available but no approved YouTube video has been resolved yet.
- **Resolved** — an approved video ID has been resolved and stored.

Selecting `Curated only` followed by `Select up to 20 filtered` queues the first 20 currently-curated records across the filtered result set, not merely the current page. After successful resolution and refresh, those records are no longer in `Curated only`, so the same operation naturally selects the next batch.

The backend batch cap remains 20 to control external API and AI workload.

## Other administration screens

- **Content Library**: status filter; select filtered; bulk-publish selected Draft lessons.
- **Listening Lesson Library**: status filter; select filtered; bulk-publish selected Draft lessons.
- **Listening/Content Sources**: Enabled/Off status filtering. Off sources cannot run discovery.
- **Question Manager**: question status filter; select filtered; bulk-publish or bulk-delete unpublished questions.
- **Question Bank Review**: review-status filter; selected bulk actions keep their existing backend validity checks.
- **Courses**: course status filter; select filtered; bulk Archive or Restore to Draft.

## Safety rules

Bulk actions never silently widen beyond the current filtered view. Selection is cleared when a status filter changes. Publishing acts only on Draft/unpublished entities. Course status bulk writes are tenant-scoped; Restore to Draft is restricted to Archived courses. R12 Work Queue deletion rules are unchanged.

No database migration is required for R13.
