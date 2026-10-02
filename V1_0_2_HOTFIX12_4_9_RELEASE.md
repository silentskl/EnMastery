# English Mastery v1.0.2 Hotfix 12.4.9

## Completed learning history restored

### Regression fixed
Completed Daily Mission cards had become non-clickable because the learner plan rendered every `done` task as a static `<div>`. The monthly progress calendar also rendered historical dates as static cells, so learners could no longer reopen the work that produced a PASS.

### Learner history flow
- A completed Daily Mission card is clickable again and opens `/learn/history/[taskId]`.
- A calendar day with assigned tasks links to `/learn/history?date=YYYY-MM-DD`.
- The day history page lists the original Daily Mission tasks and lets the learner open each completed record.
- The task detail reuses retained evidence instead of recomputing or overwriting history.

### Evidence shown
- Reading / Listening: lesson snapshot, submitted answers, correctness, feedback/explanations, plus intensive dictation/shadowing attempts when present.
- Writing: every stored submission/review version, original text, score, feedback and revision lineage.
- Speaking: daily mode scores, Conversation/Stimulus transcripts and AI feedback, and Reading Aloud assessment history.
- Vocabulary: retained daily training events, responses and correctness.

### Speaking Reading Aloud audit preservation
Previously Reading Aloud only wrote the daily PASS score and XP; transcript and assessment details were not retained. Migration `0062_v102_hotfix1249_learning_history_restore.sql` adds `speaking_reading_aloud_history`, and new assessments persist the reference text, browser transcript, duration, assessment JSON and score. Older rows cannot be reconstructed if those details were never stored; the UI states that limitation instead of inventing history.

### Compatibility
- Existing Reading/Writing history tables and Past Work routes are unchanged.
- Existing Daily Mission assignments are not rewritten.
- Adds migration 0062; schema is now 62 migrations / 115 application tables.
