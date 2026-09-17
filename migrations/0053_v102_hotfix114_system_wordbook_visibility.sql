PRAGMA foreign_keys = ON;

-- Tenant-level overrides for which published System vocabulary books are visible
-- in learner-facing vocabulary browsing. Missing rows use product defaults:
-- P1-P4, P5 and P6 visible; all other System books hidden.
CREATE TABLE IF NOT EXISTS tenant_system_vocabulary_visibility (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL REFERENCES vocabulary_collections(id) ON DELETE CASCADE,
  visible INTEGER NOT NULL CHECK (visible IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, collection_id)
);
CREATE INDEX IF NOT EXISTS idx_tenant_system_vocab_visibility
  ON tenant_system_vocabulary_visibility(tenant_id, visible, collection_id);
