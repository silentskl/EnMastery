# English Mastery v1.0.2 Hotfix 12.4.8

## Daily mission UNAVAILABLE self-heal

### Root cause
The Learn API treated an `UNAVAILABLE` placeholder as if it were a real, frozen daily assignment. Once Listening / Speaking / Reading / Writing had been materialised as a `skipped` card with `metadata.unavailable=true`, the Today endpoint saw the activity type as present and skipped the planner entirely. Even after the Tenant had enough published/eligible courses, that placeholder could therefore remain `UNAVAILABLE` for the rest of the day.

The weekly planner also selected/consumed a candidate before checking whether that date already had a concrete frozen assignment, which could unnecessarily exhaust a bounded candidate pool while repairing a partially materialised week.

### Fix
- Today materialisation now regards `metadata.unavailable=true` as a missing concrete assignment and invokes the bounded planner again.
- A persisted `UNAVAILABLE` card is explicitly a placeholder, not a real assignment. If an eligible lesson now exists, the planner updates that same row in place to a normal `todo` assignment.
- Existing concrete `todo`, `in_progress`, and `done` assignments remain immutable and are never replaced by this recovery path.
- Writing schedule presence is preserved: a pre-existing Writing placeholder can self-heal without changing whether Writing was scheduled for that date.
- Weekly repair calls `pickUnused()` only after confirming that a domain actually needs an assignment, preventing unused candidates from being consumed by already-complete/frozen dates.
- No migration is required. Refreshing Learn after deployment triggers the repair automatically.
