PRAGMA defer_foreign_keys = ON;

-- V0.6 R2 role simplification:
-- Platform Admin remains outside tenant membership.
-- Every tenant member is either Parent (tenant operator) or Student.
-- Historical admin/teacher tenant users become Parent; historical parent accounts keep their password.

UPDATE users SET role='parent', updated_at=CURRENT_TIMESTAMP WHERE role IN ('admin','teacher');
UPDATE tenant_members SET role='parent', updated_at=CURRENT_TIMESTAMP WHERE role IN ('admin','teacher');

-- Parent accounts created before multi-tenant used parent_credentials. Make those credentials
-- available to the tenant Parent workspace without exposing or resetting the password.
INSERT INTO staff_credentials (user_id,password_hash,failed_attempts,locked_until,last_login_at,updated_at)
SELECT p.user_id,p.password_hash,p.failed_attempts,p.locked_until,p.last_login_at,CURRENT_TIMESTAMP
FROM parent_credentials p
JOIN tenant_members m ON m.user_id=p.user_id AND m.role='parent'
ON CONFLICT(user_id) DO NOTHING;

-- Replace tenant membership with the two-role model.
ALTER TABLE tenant_members RENAME TO tenant_members_v06r1;
CREATE TABLE tenant_members (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('parent','student')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','invited','disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id,user_id)
);
INSERT INTO tenant_members (tenant_id,user_id,role,status,created_at,updated_at)
SELECT tenant_id,user_id,CASE WHEN role='student' THEN 'student' ELSE 'parent' END,status,created_at,updated_at
FROM tenant_members_v06r1;
DROP TABLE tenant_members_v06r1;
CREATE INDEX idx_tenant_members_user ON tenant_members(user_id,status,tenant_id);
CREATE INDEX idx_tenant_members_role ON tenant_members(tenant_id,role,status);

-- Tenant operator sessions now have one role only: Parent.
ALTER TABLE staff_sessions RENAME TO staff_sessions_v06r1;
CREATE TABLE staff_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'parent' CHECK(role='parent'),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO staff_sessions (id,user_id,tenant_id,role,token_hash,expires_at,created_at,last_seen_at)
SELECT id,user_id,tenant_id,'parent',token_hash,expires_at,created_at,last_seen_at FROM staff_sessions_v06r1;
DROP TABLE staff_sessions_v06r1;
CREATE INDEX idx_staff_sessions_token ON staff_sessions(token_hash,expires_at);
CREATE INDEX idx_staff_sessions_tenant ON staff_sessions(tenant_id,user_id,expires_at);

-- Tenant type is intentionally removed. A tenant is simply a partner workspace.
ALTER TABLE tenants DROP COLUMN tenant_type;

PRAGMA defer_foreign_keys = OFF;
