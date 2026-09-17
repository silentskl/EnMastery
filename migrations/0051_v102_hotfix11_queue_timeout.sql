PRAGMA foreign_keys = ON;

-- Hotfix 11: configurable Work Queue timeout policy.
-- A missing row intentionally means the default 120 minutes, so existing tenants
-- and newly-created tenants do not require eager seed rows.
CREATE TABLE IF NOT EXISTS queue_runtime_policy (
  scope_type TEXT NOT NULL CHECK(scope_type IN ('platform','tenant')),
  scope_id TEXT NOT NULL,
  task_timeout_minutes INTEGER NOT NULL DEFAULT 120 CHECK(task_timeout_minutes BETWEEN 5 AND 1440),
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(scope_type,scope_id)
);

INSERT OR IGNORE INTO queue_runtime_policy(scope_type,scope_id,task_timeout_minutes)
VALUES ('platform','platform',120);

CREATE INDEX IF NOT EXISTS idx_queue_runtime_policy_scope
  ON queue_runtime_policy(scope_type,scope_id);
