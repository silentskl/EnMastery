PRAGMA foreign_keys = ON;

-- Tenant-wide reward duration. One unlocked daily game session may run for at most this many minutes.
ALTER TABLE tenant_learning_policy ADD COLUMN daily_game_minutes INTEGER NOT NULL DEFAULT 10 CHECK(daily_game_minutes BETWEEN 0 AND 60);

-- Stage-specific Writing cadence and minimum length for Daily Learning.
ALTER TABLE tenant_daily_task_policy ADD COLUMN writing_weekdays_json TEXT NOT NULL DEFAULT '[1,3,5]';
ALTER TABLE tenant_daily_task_policy ADD COLUMN writing_min_words INTEGER NOT NULL DEFAULT 120 CHECK(writing_min_words BETWEEN 40 AND 1000);

-- Persisted speaking fallback/cache so all three Learn → Speak modes always have content.
CREATE TABLE IF NOT EXISTS speaking_prompt_cache (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  school_level TEXT NOT NULL CHECK(school_level IN ('P1-P4','P5','P6','S1','S2','S3','S4')),
  mode TEXT NOT NULL CHECK(mode IN ('conversation','reading_aloud','stimulus')),
  prompts_json TEXT NOT NULL DEFAULT '[]',
  source_fingerprint TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(tenant_id,school_level,mode)
);
CREATE INDEX IF NOT EXISTS idx_speaking_prompt_cache_updated ON speaking_prompt_cache(tenant_id,school_level,updated_at);

-- One migration row per active tenant is enough because the new columns carry defaults.
UPDATE tenant_learning_policy SET daily_game_minutes=COALESCE(daily_game_minutes,10),updated_at=CURRENT_TIMESTAMP;
UPDATE tenant_daily_task_policy SET writing_weekdays_json=COALESCE(NULLIF(writing_weekdays_json,''),'[1,3,5]'),writing_min_words=COALESCE(writing_min_words,120),updated_at=CURRENT_TIMESTAMP;
