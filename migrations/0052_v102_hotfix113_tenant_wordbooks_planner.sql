PRAGMA foreign_keys = ON;

-- Hotfix 11.3: all custom word books are Tenant-owned.
-- Preserve every historical learner-created collection by assigning it to the
-- learner's Tenant, then clear the legacy owner pointer. Any orphan legacy
-- custom collection falls back to tenant-default rather than disappearing.
UPDATE vocabulary_collections
SET tenant_id = COALESCE(
      tenant_id,
      (SELECT COALESCE(cp.tenant_id,'tenant-default') FROM child_profiles cp WHERE cp.id=vocabulary_collections.owner_child_id),
      'tenant-default'
    ),
    owner_child_id = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE collection_type='custom'
  AND (owner_child_id IS NOT NULL OR tenant_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_vocab_collections_tenant_stage
  ON vocabulary_collections(tenant_id,collection_type,stage,status,sort_order);
