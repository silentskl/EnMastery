PRAGMA defer_foreign_keys = ON;

-- V0.6 R3 final tenant account model:
-- Platform Admin -> Tenant Admin -> Student.
-- There is no Parent/Teacher/Learner tenant role. Each tenant has one active Admin account,
-- managed only from Platform > Tenants.
-- For tenant-default, preserve xiaoganglau@gmail.com when it exists and is active.

-- First reduce historical R2 Parent operators to one active account per tenant.
UPDATE tenant_members AS m
SET status='disabled', updated_at=CURRENT_TIMESTAMP
WHERE m.role='parent' AND m.status='active'
  AND m.user_id <> (
    SELECT m2.user_id
    FROM tenant_members m2
    JOIN users u2 ON u2.id=m2.user_id
    LEFT JOIN staff_credentials c2 ON c2.user_id=m2.user_id
    WHERE m2.tenant_id=m.tenant_id AND m2.role='parent' AND m2.status='active'
    ORDER BY
      CASE WHEN m2.tenant_id='tenant-default' AND lower(u2.email)='xiaoganglau@gmail.com' THEN 0 ELSE 1 END,
      CASE WHEN c2.user_id IS NOT NULL THEN 0 ELSE 1 END,
      m2.created_at ASC,
      u2.email ASC
    LIMIT 1
  );

-- The retained tenant operator is an Admin identity.
UPDATE users
SET role='admin', updated_at=CURRENT_TIMESTAMP
WHERE id IN (
  SELECT user_id FROM tenant_members WHERE role='parent' AND status='active'
);

-- Invalidate sessions for historical operators that are no longer the tenant Admin.
DELETE FROM staff_sessions
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_members m
  WHERE m.tenant_id=staff_sessions.tenant_id
    AND m.user_id=staff_sessions.user_id
    AND m.role='parent' AND m.status='active'
);

-- Replace membership with the final Admin/Student model. Disabled historical Parent memberships
-- are intentionally not copied; child/profile history remains intact through its own foreign keys.
ALTER TABLE tenant_members RENAME TO tenant_members_v06r2;
CREATE TABLE tenant_members (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('admin','student')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','invited','disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id,user_id)
);
INSERT INTO tenant_members (tenant_id,user_id,role,status,created_at,updated_at)
SELECT tenant_id,user_id,'admin',status,created_at,updated_at
FROM tenant_members_v06r2 WHERE role='parent' AND status='active';
INSERT INTO tenant_members (tenant_id,user_id,role,status,created_at,updated_at)
SELECT tenant_id,user_id,'student',status,created_at,updated_at
FROM tenant_members_v06r2 WHERE role='student';
DROP TABLE tenant_members_v06r2;
CREATE INDEX idx_tenant_members_user ON tenant_members(user_id,status,tenant_id);
CREATE INDEX idx_tenant_members_role ON tenant_members(tenant_id,role,status);
CREATE UNIQUE INDEX idx_tenant_single_active_admin ON tenant_members(tenant_id) WHERE role='admin' AND status='active';

-- child_profiles.parent_user_id is a legacy ownership column. Under R3 it points to the
-- tenant's single Admin so historical Guest Parent identities are no longer operational owners.
UPDATE child_profiles AS c
SET parent_user_id=(
  SELECT m.user_id FROM tenant_members m
  WHERE m.tenant_id=c.tenant_id AND m.role='admin' AND m.status='active' LIMIT 1
)
WHERE c.tenant_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM tenant_members m
  WHERE m.tenant_id=c.tenant_id AND m.role='admin' AND m.status='active'
);

-- Session role follows the product role as well.
ALTER TABLE staff_sessions RENAME TO staff_sessions_v06r2;
CREATE TABLE staff_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK(role='admin'),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO staff_sessions (id,user_id,tenant_id,role,token_hash,expires_at,created_at,last_seen_at)
SELECT id,user_id,tenant_id,'admin',token_hash,expires_at,created_at,last_seen_at
FROM staff_sessions_v06r2;
DROP TABLE staff_sessions_v06r2;
CREATE INDEX idx_staff_sessions_token ON staff_sessions(token_hash,expires_at);
CREATE INDEX idx_staff_sessions_tenant ON staff_sessions(tenant_id,user_id,expires_at);

PRAGMA defer_foreign_keys = OFF;
