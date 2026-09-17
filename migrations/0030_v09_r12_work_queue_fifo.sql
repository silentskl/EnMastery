PRAGMA foreign_keys = ON;

ALTER TABLE generation_jobs ADD COLUMN enqueued_at TEXT;
UPDATE generation_jobs SET enqueued_at=created_at WHERE enqueued_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_generation_jobs_fifo
  ON generation_jobs(status, deleted_at, enqueued_at, created_at);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_tenant_fifo
  ON generation_jobs(tenant_id, scope, status, deleted_at, enqueued_at);

CREATE TRIGGER IF NOT EXISTS trg_generation_jobs_enqueued_at
AFTER INSERT ON generation_jobs
FOR EACH ROW WHEN NEW.enqueued_at IS NULL
BEGIN
  UPDATE generation_jobs
  SET enqueued_at=strftime('%Y-%m-%d %H:%M:%f','now')
  WHERE id=NEW.id;
END;
