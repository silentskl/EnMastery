# English Mastery V1.0.2 Hotfix 9

Hotfix 9 is an availability fix for the Hotfix 8 Daily Task rollover logic.

## Fixes
- Today mission generation is now authoritative and runs before completion reconciliation.
- Daily completion reconciliation is best-effort and cannot turn `/api/student/plan` or the progress calendar into HTTP 500.
- Reading/listening/writing/speaking/vocabulary evidence checks are isolated per task; one malformed historical record or optional-table issue does not affect other task cards.
- Stale adaptive-task deletion is separated from XP and game-reward bookkeeping. Auxiliary cleanup failures are logged but do not block task generation.
- Daily reward reconciliation is non-blocking when a learning task is completed.
- Planner stale-future cache cleanup is also non-blocking.
- If a stale current-day task is removed, the plan is materialised again immediately so the learner still receives a replacement task.
- Plan and calendar responses are `no-store`; server logs include `[daily-task]`, `[daily-planner]`, `[student-plan]`, and `[progress-calendar]` diagnostics for any degraded cleanup.

No database migration is required; migration count remains 49.
