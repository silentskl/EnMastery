PRAGMA foreign_keys = ON;

-- V1.0.2 Hotfix 7: tenant-selected vocabulary books for Daily Learning and Practice.
ALTER TABLE tenant_daily_task_policy
  ADD COLUMN vocabulary_collection_id TEXT REFERENCES vocabulary_collections(id) ON DELETE SET NULL;

ALTER TABLE tenant_practice_policy
  ADD COLUMN vocabulary_collection_id TEXT REFERENCES vocabulary_collections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_daily_vocab_collection
  ON tenant_daily_task_policy(tenant_id,school_level,vocabulary_collection_id);
CREATE INDEX IF NOT EXISTS idx_tenant_practice_vocab_collection
  ON tenant_practice_policy(tenant_id,learner_stage,activity,vocabulary_collection_id);
