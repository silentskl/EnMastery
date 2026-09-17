PRAGMA foreign_keys = ON;

-- V0.9.0 R6 · Writing/Reading mastery gates + one daily English game reward.
-- Writing remains historically versioned, but only a reviewed score >= 60 is a pass.
ALTER TABLE writing_submissions ADD COLUMN review_score INTEGER;
ALTER TABLE writing_submissions ADD COLUMN passed INTEGER NOT NULL DEFAULT 0 CHECK (passed IN (0,1));
ALTER TABLE writing_submissions ADD COLUMN passed_at TEXT;

-- Backfill legacy reviewed submissions using the six scoring dimensions already stored.
UPDATE writing_submissions
SET review_score = CAST(ROUND((
    COALESCE(json_extract(scores_json,'$.content'),0) +
    COALESCE(json_extract(scores_json,'$.organisation'),0) +
    COALESCE(json_extract(scores_json,'$.vocabulary'),0) +
    COALESCE(json_extract(scores_json,'$.grammar'),0) +
    COALESCE(json_extract(scores_json,'$.mechanics'),0) +
    COALESCE(json_extract(scores_json,'$.taskFulfilment'),0)
  ) / 6.0) AS INTEGER)
WHERE status='reviewed' AND scores_json IS NOT NULL;

UPDATE writing_submissions
SET passed = CASE WHEN COALESCE(review_score,0) >= 60 THEN 1 ELSE 0 END,
    passed_at = CASE WHEN COALESCE(review_score,0) >= 60 THEN COALESCE(passed_at,updated_at) ELSE NULL END
WHERE status='reviewed';

CREATE INDEX IF NOT EXISTS idx_writing_submissions_child_prompt_passed
  ON writing_submissions(child_id,prompt_id,passed,review_score,updated_at);

-- R2-R5 awarded one token per completed unit. R6 changes policy to exactly one
-- available token after the full daily Listen/Speak/Read/Write mission passes.
-- Used rewards are retained as history; unused legacy tokens are removed.
DELETE FROM daily_game_rewards
WHERE status='available' AND source_type IN ('english_daily_task','science_daily_session');
