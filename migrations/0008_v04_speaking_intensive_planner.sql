PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS speaking_sessions (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id),
  mode TEXT NOT NULL CHECK(mode IN ('conversation','reading_aloud','stimulus')),
  prompt_title TEXT,
  prompt_text TEXT NOT NULL,
  reference_text TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed')),
  turn_count INTEGER NOT NULL DEFAULT 0,
  overall_score REAL,
  feedback_json TEXT,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_speaking_sessions_child ON speaking_sessions(child_id, updated_at);

CREATE TABLE IF NOT EXISTS speaking_turns (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES speaking_sessions(id) ON DELETE CASCADE,
  child_id TEXT NOT NULL REFERENCES child_profiles(id),
  speaker TEXT NOT NULL CHECK(speaker IN ('learner','assistant')),
  transcript TEXT,
  reply_text TEXT,
  duration_ms INTEGER,
  stt_provider TEXT,
  evaluation_json TEXT,
  pronunciation_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_speaking_turns_session ON speaking_turns(session_id, created_at);

CREATE TABLE IF NOT EXISTS content_audio_assets (
  content_id TEXT PRIMARY KEY REFERENCES content_items(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_length INTEGER NOT NULL,
  transcript_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listening_segments (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  segment_order INTEGER NOT NULL,
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  transcript TEXT NOT NULL,
  normalized_answer TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(content_id, segment_order)
);
CREATE INDEX IF NOT EXISTS idx_listening_segments_content ON listening_segments(content_id, segment_order);

CREATE TABLE IF NOT EXISTS intensive_listening_attempts (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id),
  content_id TEXT NOT NULL REFERENCES content_items(id),
  segment_id TEXT NOT NULL REFERENCES listening_segments(id),
  attempt_type TEXT NOT NULL CHECK(attempt_type IN ('dictation','shadowing')),
  response_text TEXT,
  score REAL NOT NULL DEFAULT 0,
  feedback_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_intensive_attempts_child ON intensive_listening_attempts(child_id, content_id, created_at);

ALTER TABLE learning_tasks ADD COLUMN metadata_json TEXT;
ALTER TABLE learning_tasks ADD COLUMN completed_at TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_tasks_unique_daily
ON learning_tasks(child_id, task_date, activity_type, COALESCE(activity_id,''), title);
