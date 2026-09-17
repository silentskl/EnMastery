PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS generation_job_logs (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info' CHECK(level IN ('debug','info','warn','error')),
  event_type TEXT NOT NULL,
  stage TEXT,
  message TEXT NOT NULL,
  details_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_generation_job_logs_job_time ON generation_job_logs(job_id,created_at,id);
