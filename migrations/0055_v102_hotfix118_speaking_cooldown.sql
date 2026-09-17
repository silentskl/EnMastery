PRAGMA foreign_keys = ON;

-- Tenant-wide minimum time before any learned lesson may be selected again for Daily Learning.
-- 7 is the product default; 0 disables the cooldown. The planner uses recent learner evidence
-- and recent daily assignments, then permits the lesson again after the configured window.
ALTER TABLE tenant_learning_policy
  ADD COLUMN lesson_repeat_cooldown_days INTEGER NOT NULL DEFAULT 7
  CHECK(lesson_repeat_cooldown_days BETWEEN 0 AND 90);

-- Speaking Daily Learning is a three-part scored gate. Merely opening/clicking a tab is
-- never completion evidence. Each required mode must achieve the Tenant mastery pass mark.
CREATE TABLE IF NOT EXISTS speaking_daily_mode_progress (
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  task_date TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('conversation','reading_aloud','stimulus')),
  prompt_id TEXT,
  score REAL NOT NULL DEFAULT 0,
  pass_mark INTEGER NOT NULL DEFAULT 60,
  passed INTEGER NOT NULL DEFAULT 0 CHECK(passed IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(child_id,task_date,mode)
);
CREATE INDEX IF NOT EXISTS idx_speaking_daily_mode_date
  ON speaking_daily_mode_progress(child_id,task_date,passed,mode);
CREATE INDEX IF NOT EXISTS idx_speaking_daily_prompt_date
  ON speaking_daily_mode_progress(child_id,prompt_id,task_date);

CREATE INDEX IF NOT EXISTS idx_learning_tasks_repeat_window
  ON learning_tasks(child_id,activity_type,task_date,activity_id);
CREATE INDEX IF NOT EXISTS idx_content_progress_recent
  ON learner_content_progress(child_id,updated_at,content_id,status);
CREATE INDEX IF NOT EXISTS idx_writing_submissions_repeat_window
  ON writing_submissions(child_id,prompt_id,updated_at);

-- Remove legacy placeholder cards such as "choose a reading lesson". Daily Listening,
-- Speaking and Reading must now bind a concrete resource, or be a non-clickable UNAVAILABLE card.
DELETE FROM xp_ledger
WHERE event_type='task_complete' AND reference_id IN (
  SELECT id FROM learning_tasks
  WHERE source='adaptive' AND cadence='daily'
    AND activity_type IN ('listening','speaking','reading')
    AND activity_id IS NULL
    AND task_date>date('now','+8 hours')
);

DELETE FROM learning_tasks
WHERE source='adaptive' AND cadence='daily'
  AND activity_type IN ('listening','speaking','reading')
  AND activity_id IS NULL
  AND task_date>date('now','+8 hours');

-- Hotfix false-positive Speaking PASS cards from the previous click/visit based behaviour.
DELETE FROM xp_ledger
WHERE event_type='task_complete' AND reference_id IN (
  SELECT id FROM learning_tasks
  WHERE source='adaptive' AND activity_type='speaking'
    AND task_date>date('now','+8 hours')
);

DELETE FROM daily_game_rewards
WHERE source_type='english_daily_task' AND status='available'
  AND reward_date>date('now','+8 hours')
  AND child_id IN (
    SELECT child_id FROM learning_tasks
    WHERE source='adaptive' AND activity_type='speaking'
      AND task_date>date('now','+8 hours')
  );

UPDATE learning_tasks
SET status='todo', completed_at=NULL
WHERE source='adaptive' AND activity_type='speaking'
  AND task_date>date('now','+8 hours') AND status='done';
