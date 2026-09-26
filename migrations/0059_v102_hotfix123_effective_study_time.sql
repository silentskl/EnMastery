-- V1.0.2 Hotfix 12.3
-- Effective study time and idle episodes are stored per browser study session/day.
-- The client sends monotonic cumulative counters; the server records only positive
-- deltas so retries/pagehide heartbeats cannot double-count either metric.

CREATE TABLE IF NOT EXISTS learner_study_sessions (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  study_date TEXT NOT NULL,
  client_active_seconds INTEGER NOT NULL DEFAULT 0,
  active_seconds INTEGER NOT NULL DEFAULT 0,
  client_idle_count INTEGER NOT NULL DEFAULT 0,
  idle_count INTEGER NOT NULL DEFAULT 0,
  last_path TEXT,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(client_active_seconds >= 0),
  CHECK(active_seconds >= 0),
  CHECK(client_idle_count >= 0),
  CHECK(idle_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_learner_study_sessions_child_date
  ON learner_study_sessions(child_id,study_date);
