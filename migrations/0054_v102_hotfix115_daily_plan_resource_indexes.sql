PRAGMA foreign_keys = ON;

-- Hotfix 11.5: keep the student Learn request inside Cloudflare Worker/D1 resource limits.
-- These indexes match the bounded Today/Week planner and progress-summary access paths.
CREATE INDEX IF NOT EXISTS idx_content_items_daily_plan
  ON content_items(school_level,status,content_type,scope,tenant_id,created_at,id);
CREATE INDEX IF NOT EXISTS idx_learning_tasks_daily_plan
  ON learning_tasks(child_id,task_date,cadence,source,activity_type,status);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_child_created
  ON xp_ledger(child_id,created_at,event_type);
