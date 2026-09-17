# V0.9.0 R16 — Learn Calendar & Idempotent Progress

## Learn home
The Learn page now has one canonical daily mission list (`StudentPlan`) plus a month calendar. The former `Learn by skill` card grid was removed to avoid presenting the same assigned lessons twice. Small library links remain for optional extra study.

## Daily progress calendar
`GET /api/student/progress/calendar?month=YYYY-MM` returns Singapore-date task aggregates from `learning_tasks`:
- assigned task count
- completed task count
- completion percentage

The current month can be browsed backwards. Future navigation is disabled.

## Idempotent completion
Before the Today plan or calendar is returned, R16 reconciles unfinished Today tasks against authoritative PASS records:
- Reading / Listening: `learner_content_progress.status='completed' AND progress_percent>=100`
- Writing: at least one `writing_submissions.passed=1` for the assigned prompt
- Speaking / Vocabulary continue to use their existing completion hooks.

This fixes the case where a learner opens a resource from its skill library, passes it, then returns to Today and sees the same resource as Todo.

## Completed resource navigation
- Completed Today tasks are no longer links.
- Completed Reading library entries link to their Past Work record.
- Completed Listening entries are PASS/read-only from the library and do not launch a fresh question flow.

No database migration is required.
