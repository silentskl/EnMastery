PRAGMA foreign_keys=ON;

-- Daily PSLE study contract. The day is always calculated server-side in
-- Asia/Singapore. Events are authoritative evidence from completed activities;
-- never accept event counts from a student browser.
CREATE TABLE IF NOT EXISTS learner_daily_activity_events (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  study_date TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('conversation','roleplay','reading_aloud','listening')),
  reference_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (child_id,study_date,activity_type,reference_id)
);
CREATE INDEX IF NOT EXISTS idx_daily_activity_child_date ON learner_daily_activity_events(child_id,study_date,activity_type);

-- One aggregate per child/day prevents parallel browser tabs from counting
-- identical wall-clock seconds twice. Session claims are bounded to real time.
CREATE TABLE IF NOT EXISTS learner_daily_study_time (
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  study_date TEXT NOT NULL,
  active_seconds INTEGER NOT NULL DEFAULT 0 CHECK (active_seconds >= 0),
  last_credited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(child_id,study_date)
);
