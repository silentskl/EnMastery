PRAGMA foreign_keys = ON;

-- V1.0.2 hotfix5.2: vocabulary spaced-review belongs to Practice Settings.
-- Keep legacy columns on tenant_daily_task_policy for schema compatibility, but no runtime
-- path reads them after this migration. Copy their existing values into the vocabulary
-- practice row so upgrades preserve the administrator's prior configuration.
ALTER TABLE tenant_practice_policy ADD COLUMN vocabulary_review_window_days INTEGER NOT NULL DEFAULT 7 CHECK(vocabulary_review_window_days BETWEEN 1 AND 30);
ALTER TABLE tenant_practice_policy ADD COLUMN vocabulary_review_repetitions INTEGER NOT NULL DEFAULT 2 CHECK(vocabulary_review_repetitions BETWEEN 0 AND 10);

UPDATE tenant_practice_policy
SET vocabulary_review_window_days = COALESCE((
      SELECT p.vocabulary_review_window_days
      FROM tenant_daily_task_policy p
      WHERE p.tenant_id=tenant_practice_policy.tenant_id
        AND p.school_level=tenant_practice_policy.learner_stage
    ), 7),
    vocabulary_review_repetitions = COALESCE((
      SELECT p.vocabulary_review_repetitions
      FROM tenant_daily_task_policy p
      WHERE p.tenant_id=tenant_practice_policy.tenant_id
        AND p.school_level=tenant_practice_policy.learner_stage
    ), 2),
    updated_at = CURRENT_TIMESTAMP
WHERE activity='vocabulary';
