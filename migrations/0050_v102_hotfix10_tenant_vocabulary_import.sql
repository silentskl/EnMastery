PRAGMA foreign_keys = ON;

-- Hotfix 10: move managed/custom word-book creation and bulk import to Tenant Admin.
-- Existing learner-owned custom collections remain readable for backwards compatibility.
ALTER TABLE vocabulary_collections ADD COLUMN tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_vocab_collections_tenant ON vocabulary_collections(tenant_id,collection_type,status,sort_order);
