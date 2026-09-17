# English Mastery v1.0.2 Hotfix 6

This release consolidates the post-Hotfix-5.2 learning-policy, daily-progress, vocabulary, grammar and student-management work.

## Key changes

- Daily Progress reads persisted `learning_tasks` directly and never invokes Weekly Planner.
- Today mission refresh accepts a persisted mission only when all required activity types are present; incomplete cached days self-repair.
- Daily game reward requires Listening, Speaking, Reading and Vocabulary, plus Writing when Writing is scheduled. Tenant Admin controls the daily game time limit; default 10 minutes.
- Writing Daily Learning supports configurable weekdays and configurable minimum word count.
- Speaking has persistent cache/fallback content for AI Talking, Reading Aloud and Simulated Communication.
- Tenant Admin can delete Student/Learner accounts with related learning records cleaned safely.
- Learn Vocabulary daily word count is enforced by Tenant Learning Settings; students cannot choose the count.
- Word Book import supports `word,synonyms`, creating a new book or appending to an existing book; duplicate words merge synonyms.
- Vocabulary entries share the same synonym/near-synonym detail model, including nuance notes where available.
- Built-in vocabulary coverage expanded across P1-P4, P5, P6, S1, S2, S3 and S4.
- Grammar coverage expanded to at least 12 topics and 24 exercises per stage.
- Learning Settings and Practice Settings use compact table layouts.
- Vocabulary Review Window / Required Reviews are Practice Settings, not Learning Settings.

## Database

Latest migrations: 0046-0048. Total migrations in this package: 48.
