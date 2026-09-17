PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  source_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','succeeded','failed','cancelled')),
  stage TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
  request_json TEXT NOT NULL,
  result_json TEXT,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 2,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_active ON generation_jobs(status, deleted_at, created_at);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_entity ON generation_jobs(entity_type, entity_id, deleted_at);

ALTER TABLE content_items ADD COLUMN generation_job_id TEXT;
ALTER TABLE content_items ADD COLUMN generation_stage TEXT;
ALTER TABLE content_items ADD COLUMN generation_error TEXT;

CREATE INDEX IF NOT EXISTS idx_content_generation_job ON content_items(generation_job_id);
