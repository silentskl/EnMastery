PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS tenant_learning_policy (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  pass_score INTEGER NOT NULL DEFAULT 60 CHECK(pass_score BETWEEN 1 AND 100),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO tenant_learning_policy(tenant_id,pass_score) SELECT id,60 FROM tenants;

CREATE TABLE IF NOT EXISTS cloze_summary_attempts (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES specialised_sessions(id) ON DELETE CASCADE,
  session_item_id TEXT NOT NULL REFERENCES specialised_session_items(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'evaluating' CHECK(status IN ('evaluating','reviewed','failed')),
  score INTEGER,
  passed INTEGER NOT NULL DEFAULT 0,
  feedback_json TEXT,
  generation_job_id TEXT,
  revision_of_summary_id TEXT REFERENCES cloze_summary_attempts(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_cloze_summary_item ON cloze_summary_attempts(child_id,session_item_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cloze_summary_session ON cloze_summary_attempts(session_id,created_at DESC);
