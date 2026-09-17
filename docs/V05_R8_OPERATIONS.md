# V0.5.0 R8 — Question Bank Auto-Expansion Operations

## What changed

R8 turns the Question Bank from a seeded/manual library into a production expansion workflow.

```text
Admin chooses source + P5/P6 + category + subcategory + skill + topic + difficulty + count
        ↓
question_generation_batches row is created
        ↓
source-brief generation_job is created
        ↓
N placeholder questions + question_bank_items + generation_jobs are created
        ↓
ONLY AFTER all rows are durable, Queue wake-up messages are sent
        ↓
english-mastery-task-runner executes exactly one queued job at a time
        ↓
source profile/page → internal brief (or profile-only fallback)
        ↓
ModelBridge generates one original Question Bank item
        ↓
server structure validation
        ↓
near-duplicate check against existing P5/P6 bank
        ↓
local quality score
        ↓
Draft / duplicate / failed
        ↓
Admin bulk Review → Publish / Reject / Retry / Delete
```

Practice and specialised Exam still consume only `questions.status='published'` items mapped through `question_bank_items`. Learn lessons are never used by this pipeline.

## Admin workflow

Open:

```text
https://study.wisewavesg.com/platform/question-bank
```

Choose:

- Level: P5 / P6
- Category: Oral / Reading Comprehension / Cloze / Writing
- Subcategory
- Reference source
- Curriculum skill
- Topic/context
- Difficulty 1–5
- Batch size 1–50

Press **Create & queue N drafts**.

### Available generation subcategories

- Oral: conversation, stimulus, reading aloud
- Reading Comprehension: mixed, literal, inferential, evaluative, vocabulary in context, visual text, synthesis/transformation, open-ended comprehension
- Cloze: grammar, vocabulary, comprehension cloze
- Writing: continuous, situational


The UI immediately shows a batch. Placeholder Question Bank rows exist before AI work starts. You may leave the page; generation continues through the persistent serial Queue.

## Source handling and copyright rule

For `reference_only`, `format_reference` and `curriculum_reference` sources:

1. the Task Runner attempts one source fetch for the whole batch;
2. ModelBridge converts the fetched material into a short internal reference brief;
3. raw source text is not stored in Question Bank questions;
4. the item generator is explicitly instructed not to reproduce or closely paraphrase protected passages/questions;
5. learner-facing passages/questions are original.

If source fetch fails (PDF/robots/network/HTML incompatibility), the batch switches to `profile_only` and continues using the configured source profile. The batch is not lost.

## Serial execution

`workers/task-runner/wrangler.jsonc` remains:

```text
max_batch_size = 1
max_concurrency = 1
```

The Queue message is only a wake-up signal. D1 selects the oldest `generation_jobs.status='queued'` row by `created_at, rowid`, so source/AI jobs run one at a time across the whole platform.

For a Question Bank batch, the source-brief job is inserted first, followed by item jobs. Therefore the source brief is prepared before the first item whenever the Queue is healthy.

## Draft review states

Question Bank expansion rows use:

- `generating`
- `needs_review`
- `duplicate`
- `failed`
- `approved`
- `rejected`

Generated questions never auto-publish.

### Publish

Only `needs_review` questions are published. They then become eligible for Practice / specialised Exam sessions.

### Reject

Reject keeps the question record for audit but prevents learner use. If generation is still running, its generation job is cancelled without deleting the Question Bank row.

### Retry / regenerate

- failed item: reuses its failed job where possible;
- duplicate/rejected item: creates a new persistent generation job for the same placeholder question;
- the new job re-enters the serial Queue.

### Delete

Delete is blocked for published items. Unpublished generated items and their mappings/job linkage are removed.

## Automatic validation

Every generated item must pass category-specific structure validation before it can become a reviewable Draft.

Examples:

- objective Reading/Cloze: exactly four distinct options + one `correctOption`;
- Reading: age/level-appropriate passage length;
- Reading Aloud: bounded reference-text word count;
- Writing: valid continuous/situational type and minimum word requirement;
- every item: non-empty prompt and explanation.

A generated item that fails structural validation becomes `failed` and can be retried.

## Duplicate detection

R8 calculates:

- SHA-256 normalized question fingerprint;
- lexical token similarity against up to 300 recent items in the same category and school level.

A similarity of 0.82 or higher is treated as a probable duplicate. The item is stored with `review_status='duplicate'` and is not eligible for learner use.

## Quality score

The current score is an automated pre-review indicator, not a teacher mark. It combines:

- valid question structure;
- prompt clarity;
- explanation quality;
- category-appropriate passage/options/task structure;
- novelty versus the existing bank.

Human review remains mandatory.

## R7 defects fixed in R8

1. Specialised `oral_reading_aloud` used the general conversation evaluation path. R8 now uses reading-aloud text coverage/accuracy/fluency practice scoring.
2. `SpecialisedSessionRunner` captured nullable `data/item` values in callbacks; R8 rewrites it with stable narrowed `session/current` references.
3. Completed specialised Exam sessions now expose item review after the full test is complete.
4. Admin retry dispatch failures now call `failJob`, so a failed Queue send does not leave a job permanently `queued` without a message.
5. R8 bulk reject cancels a running generation job without using entity-deleting `softDeleteJob`; the rejected Question Bank row remains available for audit.

## Database migration

R8 adds:

```text
0016_v05_question_bank_expansion.sql
```

New table:

```text
question_generation_batches
```

Additional `question_bank_items` fields include:

```text
batch_id
generation_job_id
review_status
quality_score
quality_json
fingerprint
duplicate_of_question_id
generation_error
updated_at
```

Existing published Question Bank items are migrated to `review_status='approved'`. Existing draft items are mapped to `needs_review`.

## Upgrade

From R7 or any earlier V0.5 release:

```bash
unzip english-mastery-v0.5.0-cloudflare-free-r8.zip
cd english-mastery-v0.5.0
cp ../<old-directory>/.deploy.env .deploy.env
chmod +x scripts/deploy.sh
./scripts/deploy.sh update
```

The deploy helper continues to run selfcheck + TypeScript + OpenNext build before applying the new production migration.
