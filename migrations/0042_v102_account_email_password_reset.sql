-- V1.0.2 hotfix4: secure Tenant Admin password reset by email.
CREATE TABLE IF NOT EXISTS tenant_password_reset_attempts (
  id TEXT PRIMARY KEY,
  account_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tenant_password_reset_attempts_account_date
  ON tenant_password_reset_attempts(account_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_password_reset_attempts_ip_date
  ON tenant_password_reset_attempts(ip_hash, created_at);

CREATE TABLE IF NOT EXISTS tenant_password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  requested_ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tenant_password_reset_tokens_lookup
  ON tenant_password_reset_tokens(token_hash, expires_at, consumed_at);
CREATE INDEX IF NOT EXISTS idx_tenant_password_reset_tokens_user
  ON tenant_password_reset_tokens(user_id, tenant_id, created_at);
