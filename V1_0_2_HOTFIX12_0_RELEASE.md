# English Mastery v1.0.2 Hotfix 12.0

## Daily Vocabulary: New Learning + Review

- Splits Daily Vocabulary into two learner-visible groups: **New learning** and **Review**.
- Tenant Admin can configure **new words/day**, **review words/day**, and **dictation repetitions per word** (default 3).
- Both groups use the same four-stage flow:
  1. Chinese meaning + automatic English pronunciation + learner read-aloud/pronunciation pass.
  2. Audio dictation repeated the configured number of times.
  3. Choose the correct English definition; the target word is automatically pronounced on entry.
  4. Cloze completion in context.
- Vocabulary enrichment now asks ModelBridge for a concise Simplified Chinese meaning for every generated meaning.

## Review scheduling semantics

- **Review window** and **Required reviews** now explicitly describe review scheduling.
- After a term is first learned, it must appear for **Required reviews** review days inside the configured **Review window**.
- Example: `Review window = 7`, `Required reviews = 2` means two review appearances are required inside the 7-day window after first learning.
- The Daily Vocabulary Review group uses this schedule and respects the Admin-configured review item cap.

## Completion behaviour

- Completing New Learning alone no longer completes the whole Daily Vocabulary mission.
- Daily Vocabulary is marked Done only when New Learning and the required Review group are both complete.
- If review words/day is 0, New Learning alone satisfies the vocabulary mission.
- If a group has no eligible terms, that group is treated as complete for the day.

## Database

- Adds `0057_v102_hotfix120_vocab_daily_new_review.sql`.
- 57 migrations and 107 application tables after migration.

## Validation

- `python3 scripts/validate_release.py` — PASS.
- `python3 scripts/test_d1_migrations.py` — PASS.
- `python3 scripts/test_hotfix120.py` — PASS.
