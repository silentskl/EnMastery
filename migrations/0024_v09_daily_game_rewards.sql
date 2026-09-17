-- V0.9.0 R2 · Daily practice reward tokens and curated Poki launch catalog.
-- One completed daily learning unit unlocks one launch. Games stay hosted by Poki.

CREATE TABLE IF NOT EXISTS reward_game_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  category TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_game_rewards (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  reward_date TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('english_daily_task','science_daily_session')),
  source_id TEXT NOT NULL,
  source_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','used')),
  game_id TEXT REFERENCES reward_game_catalog(id),
  unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at TEXT,
  UNIQUE(child_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_game_rewards_child_status
  ON daily_game_rewards(child_id, status, reward_date, unlocked_at);

INSERT OR IGNORE INTO reward_game_catalog (id,name,url,category,sort_order) VALUES
 ('poki-2048','2048','https://poki.com/en/g/2048','Brain',10),
 ('poki-monkey-mart','Monkey Mart','https://poki.com/en/g/monkey-mart','Simulation',20),
 ('poki-stickman-hook','Stickman Hook','https://poki.com/en/g/stickman-hook','Skill',30),
 ('poki-drive-mad','Drive Mad','https://poki.com/en/g/drive-mad','Physics',40),
 ('poki-papas-freezeria','Papa''s Freezeria','https://poki.com/en/g/papas-freezeria','Simulation',50),
 ('poki-blumgi-slime','Blumgi Slime','https://poki.com/en/g/blumgi-slime','Arcade',60),
 ('poki-brain-test','Brain Test: Tricky Puzzles','https://poki.com/en/g/brain-test-tricky-puzzles','Brain',70),
 ('poki-tiny-fishing','Tiny Fishing','https://poki.com/en/g/tiny-fishing','Skill',80);
