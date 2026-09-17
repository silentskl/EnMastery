# English Mastery V1.0.2 Hotfix 5

## Tenant Admin learning policy

Learning Settings now covers all configured learner stages: P1–P4, P5, P6, S1, S2, S3 and S4.

Per stage, Tenant Admin can configure:

- Listening lesson visibility
- Speaking lesson visibility
- Reading lesson visibility
- Writing lesson visibility
- Listening video maximum duration used by adaptive Daily Tasks (0 = unlimited)
- Reading passage maximum word count used by adaptive Daily Tasks (0 = unlimited)
- Vocabulary words per Daily Vocabulary task
- Vocabulary review window in days
- Required review appearances inside that window

Daily Tasks use published lessons only. Reading and video-Listening candidates must meet the configured maximums; when a cap is active, candidates with an unknown measurable length are skipped. Audio-only Listening is not restricted by the video-duration setting. The existing `Lessons visible to students` value is now enforced before Daily Task selection.

## Vocabulary spaced review

Vocabulary uses the existing training-event history rather than a parallel progress store. A word's review count is based on distinct learning dates. Pronunciation, meaning, dictation and other exercise steps completed on the same calendar day count as one appearance for repetition scheduling.

Example: a 7-day window with 2 required reviews means a newly learned word is prioritised on two additional learning days within that 7-day window. Words still owed a review are prioritised before new/lower-priority vocabulary when the Daily Vocabulary queue is generated.

## Tenant Admin Practice Settings

A new Practice Settings panel configures seven practice areas independently for each learner stage:

- Listening
- Speaking
- Reading
- Writing
- Vocabulary
- Grammar
- Cloze

Each area has:

- Content stage (P1–P4, P5, P6, S1, S2, S3 or S4)
- Questions/items per practice
- Difficulty (Adaptive, Easy, Medium or Hard)

The policy is connected to the real student practice paths: Listening selection, Question Bank sessions for Speaking/Reading/Writing/Cloze, Vocabulary training and Grammar exercise selection.

## Student Practice page

`Today's four-skill mission` / `StudentPlan` is removed from `/practice`. Daily learning missions stay on Learn/Plan surfaces so the Practice page remains focused on practice choices.

## Tenant creation defaults

Self-registration and Platform Admin tenant creation initialise all seven Learning stages, Daily Task policies and all 7 × 7 Practice policy rows for the new tenant.

## Database

Hotfix 5 adds:

- `0043_v102_daily_task_filters_learning_stages.sql`
- `0044_v102_learning_vocabulary_practice_policy.sql`

The resulting schema has 44 migrations and 98 application tables in the release self-check database.

## Dependency installation and release verification

The release contains `scripts/install-deps-resilient.sh` and two convenience commands:

```bash
npm run deps:install
npm run verify:release
```

`deps:install` tries an explicitly supplied `NPM_REGISTRY` first, then npmjs, npmmirror, Tencent Cloud npm mirror, Huawei Cloud npm mirror and Yarn registry. `verify:release` installs dependencies and runs the complete release gate.

The full release gate is:

```text
typecheck
→ typecheck:workers
→ Hotfix 5 regression tests
→ Next production build
→ OpenNext/Cloudflare build
→ release self-check
→ style audit
```
