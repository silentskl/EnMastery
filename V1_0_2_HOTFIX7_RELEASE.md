# English Mastery V1.0.2 Hotfix 7

Hotfix 7 completes the remaining Tenant Admin vocabulary policy, lesson-stage reassignment and configurable source Cloze generation work on top of V1.0.2 Hotfix 6.1.

## Delivered

### 1. Vocabulary Learning and Practice word books
- Learning Settings exposes a word-book selector for every learning stage.
- Practice Settings exposes an independent word-book selector for Vocabulary Practice.
- Only published system word books can be assigned by policy.
- Student training resolves the effective word book server-side and locks the selector when a Tenant Admin policy is active.
- Daily Planner uses the assigned Learning word book when creating future Vocabulary missions.
- Vocabulary Practice and Daily Vocabulary Learning remain separate workflows; finishing Practice does not mark the Daily Learning mission complete.

### 2. Lesson stage reassignment
- Tenant-owned Reading, Listening, Speaking and Writing content can be moved among P1–P4, P5, P6, S1, S2, S3 and S4.
- The update endpoint checks tenant ownership and blocks changes while generation is still running.
- Linked question rows are moved to the same stage in the same operation.
- Existing content IDs, question IDs and learner attempt/history references are preserved.
- Future unstarted adaptive tasks for students in the old/new affected stages are removed so the planner rebuilds them with the current stage library.
- Platform/global content is not editable by a Tenant Admin.

### 3. Configurable source Cloze generation
For each source batch, administrators can set:
- Minimum passage characters: 200–6000
- Maximum passage characters: 200–8000
- Words/blanks to fill per passage: 1–30

The requested values are persisted in the generation job, injected into the ModelBridge generation instruction and validated before questions are saved. A generated result is rejected unless it satisfies the character range, contains exactly the ordered markers `___1___` through `___N___`, returns exactly N questions, uses an allowed Cloze type, supplies four distinct options per item and has an answer matching one option.

Cloze duplicate detection includes the configured min/max/blanks key, allowing the same source URL to be generated again when its Cloze shape is intentionally changed.

## Database
- New migration: `0049_v102_hotfix7_vocab_books.sql`
- Adds `vocabulary_collection_id` to `tenant_daily_task_policy`.
- Adds `vocabulary_collection_id` to `tenant_practice_policy`.
- Both columns reference `vocabulary_collections(id)` and use `ON DELETE SET NULL`.

## Validation
See `TEST_REPORT_V1.0.2_HOTFIX7_FINAL.txt`. All source-level, D1 migration, regression, syntax and style gates passed. The sandbox cannot resolve public npm registry DNS, so the dependency-backed Next/OpenNext build must be run with `npm run verify:release` in the deployment environment where npm dependencies are available.
