PRAGMA foreign_keys = ON;

ALTER TABLE vocabulary_items ADD COLUMN entry_type TEXT NOT NULL DEFAULT 'word';
ALTER TABLE vocabulary_items ADD COLUMN normalized_text TEXT;
ALTER TABLE vocabulary_items ADD COLUMN details_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE vocabulary_items ADD COLUMN enrichment_model TEXT;
ALTER TABLE vocabulary_items ADD COLUMN enrichment_version TEXT NOT NULL DEFAULT 'v1';
ALTER TABLE vocabulary_items ADD COLUMN created_at TEXT;
ALTER TABLE vocabulary_items ADD COLUMN updated_at TEXT;

UPDATE vocabulary_items
SET normalized_text = lower(trim(lemma)),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE normalized_text IS NULL OR normalized_text = '' OR created_at IS NULL OR updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vocabulary_lookup
ON vocabulary_items(normalized_text, entry_type);

ALTER TABLE learner_vocabulary ADD COLUMN source_content_id TEXT REFERENCES content_items(id);
ALTER TABLE learner_vocabulary ADD COLUMN detail_snapshot_json TEXT;
ALTER TABLE learner_vocabulary ADD COLUMN source_sentence TEXT;
ALTER TABLE learner_vocabulary ADD COLUMN learner_note TEXT;
ALTER TABLE learner_vocabulary ADD COLUMN status TEXT NOT NULL DEFAULT 'learning';
ALTER TABLE learner_vocabulary ADD COLUMN review_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE learner_vocabulary ADD COLUMN correct_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE learner_vocabulary ADD COLUMN last_reviewed_at TEXT;
ALTER TABLE learner_vocabulary ADD COLUMN updated_at TEXT;

UPDATE learner_vocabulary SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_learner_vocab_due
ON learner_vocabulary(child_id, next_review_at, status);

CREATE TABLE IF NOT EXISTS vocabulary_contexts (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id),
  vocabulary_id TEXT NOT NULL REFERENCES vocabulary_items(id),
  content_id TEXT REFERENCES content_items(id),
  context_text TEXT NOT NULL,
  context_type TEXT NOT NULL DEFAULT 'lesson',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vocab_contexts_lookup
ON vocabulary_contexts(child_id, vocabulary_id, created_at);

CREATE TABLE IF NOT EXISTS vocabulary_review_events (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id),
  vocabulary_id TEXT NOT NULL REFERENCES vocabulary_items(id),
  rating TEXT NOT NULL CHECK(rating IN ('again','hard','good','easy')),
  previous_mastery REAL NOT NULL,
  new_mastery REAL NOT NULL,
  previous_due_at TEXT,
  next_due_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vocab_review_events_child
ON vocabulary_review_events(child_id, created_at);
