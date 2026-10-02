PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS speaking_reading_aloud_history (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  task_date TEXT NOT NULL,
  prompt_id TEXT,
  reference_text TEXT NOT NULL,
  transcript TEXT,
  duration_ms INTEGER,
  assessment_json TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_speaking_reading_aloud_history_child_date ON speaking_reading_aloud_history(child_id,task_date,created_at);
