# English Mastery V0.9.0 R10

## Writing

Past work exposes an explicit state for every saved version:

- `REVIEWING`: AI review is running and does not count toward Daily Writing.
- `FAIL`: AI review completed below the 60% pass mark. The learner must edit/review again.
- `PASS`: reviewed score is at least 60%. Only this state may complete the matching Daily Writing task.
- `REVIEW ERROR`: the AI job failed; the saved text is retained and Review can be retried.

`Edit` loads the exact historical submission into the Writing workspace. Saving creates a new `writing_submissions` row linked by `revision_of_submission_id`; historical text and feedback are never overwritten.

`Review` creates a new review version with the same text and plan, then runs ModelBridge again. This makes repeated reviews auditable and keeps the old score intact.

## Reading

Reading uses a strict mastery gate: every scored question must have a correct answer before the lesson becomes `PASS` and before a matching Daily Reading task can become `done`.

- `IN PROGRESS`: lesson opened, with no failed answer yet.
- `FAIL · REDO`: at least one incorrect attempt exists and the lesson has not reached 100%.
- `PASS`: progress is 100% and `learner_content_progress.status='completed'`.

`Read · Past work` derives its audit history from `learner_content_progress` and `question_attempts`. It shows each question, every answer attempt, correctness, feedback and timestamp.

## Vocabulary from selected text

The existing `SelectionVocabulary` flow now covers:

- Reading passage text.
- Reading question text/options and answer feedback.
- AI Writing review feedback in both the active Writing coach and Past work.

A learner can select a word or a phrase (up to 12 words), request its vocabulary explanation, and add it directly to the personal Vocabulary library with source context.
