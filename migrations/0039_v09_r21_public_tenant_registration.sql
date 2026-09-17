-- V0.9 R21: public tenant self-registration with a bounded registration throttle.
CREATE TABLE IF NOT EXISTS tenant_registration_attempts (
  id TEXT PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tenant_registration_attempts_ip_date ON tenant_registration_attempts(ip_hash,created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_registration_attempts_email_date ON tenant_registration_attempts(email_hash,created_at);
