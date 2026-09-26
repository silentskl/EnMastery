-- V1.0.2 Hotfix 12.0: split Daily Vocabulary into new-learning and review groups.
-- Review window/required reviews now define review scheduling: after first learning,
-- a word must appear for the configured number of review days inside the window.
ALTER TABLE tenant_daily_task_policy ADD COLUMN vocabulary_new_words INTEGER NOT NULL DEFAULT 10 CHECK(vocabulary_new_words BETWEEN 1 AND 50);
ALTER TABLE tenant_daily_task_policy ADD COLUMN vocabulary_review_words INTEGER NOT NULL DEFAULT 10 CHECK(vocabulary_review_words BETWEEN 0 AND 100);
ALTER TABLE tenant_daily_task_policy ADD COLUMN vocabulary_spelling_repetitions INTEGER NOT NULL DEFAULT 3 CHECK(vocabulary_spelling_repetitions BETWEEN 1 AND 10);

UPDATE tenant_daily_task_policy
SET vocabulary_new_words=COALESCE(vocabulary_daily_words,10),
    vocabulary_review_words=COALESCE(vocabulary_daily_words,10),
    vocabulary_spelling_repetitions=3;

CREATE TABLE IF NOT EXISTS vocabulary_daily_group_completions (
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  task_date TEXT NOT NULL,
  group_name TEXT NOT NULL CHECK(group_name IN ('new','review')),
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(child_id,task_date,group_name)
);
CREATE INDEX IF NOT EXISTS idx_vocab_daily_group_completion ON vocabulary_daily_group_completions(child_id,task_date);
