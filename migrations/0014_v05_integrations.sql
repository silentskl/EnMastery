CREATE TABLE IF NOT EXISTS integration_settings (
  setting_key TEXT PRIMARY KEY,
  setting_type TEXT NOT NULL CHECK(setting_type IN ('text','secret')),
  value_text TEXT,
  value_ciphertext TEXT,
  iv TEXT,
  display_hint TEXT,
  source TEXT NOT NULL DEFAULT 'admin',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_integration_settings_type ON integration_settings(setting_type);
