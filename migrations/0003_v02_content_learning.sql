PRAGMA foreign_keys = ON;

ALTER TABLE content_items ADD COLUMN description TEXT;
ALTER TABLE content_items ADD COLUMN source_attribution TEXT;
ALTER TABLE content_items ADD COLUMN published_at TEXT;
ALTER TABLE questions ADD COLUMN marks REAL NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS content_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK(source_type IN ('rss','webpage')),
  base_url TEXT NOT NULL,
  allowed_host TEXT NOT NULL,
  topic TEXT,
  usage_mode TEXT NOT NULL DEFAULT 'reference_only' CHECK(usage_mode IN ('reference_only','public_domain','licensed','owned')),
  enabled INTEGER NOT NULL DEFAULT 1,
  last_discovered_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_content_sources_enabled ON content_sources(enabled, source_type);

CREATE TABLE IF NOT EXISTS content_imports (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES content_sources(id),
  source_url TEXT NOT NULL,
  source_title TEXT,
  source_excerpt TEXT,
  content_hash TEXT,
  r2_key TEXT,
  school_level TEXT NOT NULL,
  target_topic TEXT,
  status TEXT NOT NULL DEFAULT 'fetched' CHECK(status IN ('fetched','adapted','failed')),
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_content_imports_source ON content_imports(source_id, created_at);

CREATE TABLE IF NOT EXISTS learner_content_progress (
  child_id TEXT NOT NULL REFERENCES child_profiles(id),
  content_id TEXT NOT NULL REFERENCES content_items(id),
  status TEXT NOT NULL DEFAULT 'started' CHECK(status IN ('started','completed')),
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK(progress_percent BETWEEN 0 AND 100),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(child_id, content_id)
);

CREATE TABLE IF NOT EXISTS question_attempts (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id),
  content_id TEXT REFERENCES content_items(id),
  question_id TEXT NOT NULL REFERENCES questions(id),
  response_json TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  score REAL NOT NULL DEFAULT 0,
  max_score REAL NOT NULL DEFAULT 1,
  feedback_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_question_attempts_child ON question_attempts(child_id, created_at);
CREATE INDEX IF NOT EXISTS idx_question_attempts_question ON question_attempts(question_id, created_at);
