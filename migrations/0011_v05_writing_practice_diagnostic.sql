PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS writing_submissions (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id),
  prompt_id TEXT NOT NULL REFERENCES content_items(id),
  submission_text TEXT NOT NULL,
  plan_json TEXT,
  word_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','evaluating','reviewed','failed')),
  scores_json TEXT,
  feedback_json TEXT,
  generation_job_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_writing_submissions_child ON writing_submissions(child_id, updated_at);

CREATE TABLE IF NOT EXISTS practice_sets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  school_level TEXT NOT NULL CHECK(school_level IN ('P5','P6')),
  set_type TEXT NOT NULL DEFAULT 'paper2' CHECK(set_type IN ('paper2','skill','diagnostic')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS practice_set_items (
  set_id TEXT NOT NULL REFERENCES practice_sets(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL,
  marks REAL NOT NULL DEFAULT 1,
  PRIMARY KEY(set_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_practice_items_order ON practice_set_items(set_id, item_order);

CREATE TABLE IF NOT EXISTS diagnostic_results (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id),
  assessment_id TEXT NOT NULL REFERENCES assessments(id),
  score REAL NOT NULL,
  max_score REAL NOT NULL,
  readiness_percent REAL NOT NULL,
  skill_summary_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_diag_child ON diagnostic_results(child_id, created_at);
