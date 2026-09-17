PRAGMA foreign_keys = ON;

-- V1.0.2 hotfix5.1: Tenant learning vocabulary policy and per-stage practice policy.
-- D1 compatibility note: seed rows use VALUES CTEs rather than compound UNION SELECTs.
ALTER TABLE tenant_daily_task_policy ADD COLUMN vocabulary_daily_words INTEGER NOT NULL DEFAULT 10 CHECK(vocabulary_daily_words BETWEEN 1 AND 50);
ALTER TABLE tenant_daily_task_policy ADD COLUMN vocabulary_review_window_days INTEGER NOT NULL DEFAULT 7 CHECK(vocabulary_review_window_days BETWEEN 1 AND 30);
ALTER TABLE tenant_daily_task_policy ADD COLUMN vocabulary_review_repetitions INTEGER NOT NULL DEFAULT 2 CHECK(vocabulary_review_repetitions BETWEEN 0 AND 10);

CREATE TABLE IF NOT EXISTS tenant_practice_policy (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  learner_stage TEXT NOT NULL CHECK(learner_stage IN ('P1-P4','P5','P6','S1','S2','S3','S4')),
  activity TEXT NOT NULL CHECK(activity IN ('listening','speaking','reading','writing','vocabulary','grammar','cloze')),
  content_stage TEXT NOT NULL CHECK(content_stage IN ('P1-P4','P5','P6','S1','S2','S3','S4')),
  question_count INTEGER NOT NULL DEFAULT 5 CHECK(question_count BETWEEN 1 AND 50),
  difficulty TEXT NOT NULL DEFAULT 'adaptive' CHECK(difficulty IN ('adaptive','easy','medium','hard')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(tenant_id,learner_stage,activity)
);
CREATE INDEX IF NOT EXISTS idx_tenant_practice_policy ON tenant_practice_policy(tenant_id,learner_stage,activity);

WITH
stages(level) AS (
  VALUES ('P1-P4'),('P5'),('P6'),('S1'),('S2'),('S3'),('S4')
),
activities(activity,question_count) AS (
  VALUES
    ('listening',5),
    ('speaking',3),
    ('reading',10),
    ('writing',1),
    ('vocabulary',10),
    ('grammar',10),
    ('cloze',10)
)
INSERT OR IGNORE INTO tenant_practice_policy(tenant_id,learner_stage,activity,content_stage,question_count,difficulty)
SELECT t.id,s.level,a.activity,s.level,a.question_count,'adaptive'
FROM tenants t
CROSS JOIN stages s
CROSS JOIN activities a;
