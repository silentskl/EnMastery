PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS parent_credentials (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  last_login_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learner_accounts (
  child_id TEXT PRIMARY KEY REFERENCES child_profiles(id) ON DELETE CASCADE,
  login_name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pin_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  last_login_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  child_id TEXT REFERENCES child_profiles(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK(session_type IN ('parent','student')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token_hash, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, expires_at);

CREATE TABLE IF NOT EXISTS guest_migrations (
  guest_child_id TEXT PRIMARY KEY,
  target_child_id TEXT NOT NULL REFERENCES child_profiles(id),
  migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
