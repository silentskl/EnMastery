PRAGMA defer_foreign_keys = ON;

-- V1.0.2 hotfix5.1: expand Tenant Learn settings to all English learning stages
-- and add per-stage filters used only by adaptive Daily Task generation.
-- D1 compatibility note: seed rows use VALUES CTEs instead of long UNION ALL chains,
-- because the remote D1 migration backend enforces a low SQLITE_LIMIT_COMPOUND_SELECT.
ALTER TABLE tenant_learn_availability RENAME TO tenant_learn_availability_v102h4;
CREATE TABLE tenant_learn_availability (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  school_level TEXT NOT NULL CHECK(school_level IN ('P1-P4','P5','P6','S1','S2','S3','S4')),
  domain TEXT NOT NULL CHECK(domain IN ('listen','speak','read','write')),
  lesson_limit INTEGER NOT NULL DEFAULT 0 CHECK(lesson_limit BETWEEN 0 AND 200),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(tenant_id,school_level,domain)
);
INSERT INTO tenant_learn_availability(tenant_id,school_level,domain,lesson_limit,updated_at)
SELECT tenant_id,school_level,domain,lesson_limit,updated_at
FROM tenant_learn_availability_v102h4;
DROP TABLE tenant_learn_availability_v102h4;
CREATE INDEX IF NOT EXISTS idx_tenant_learn_availability ON tenant_learn_availability(tenant_id,school_level,domain);

CREATE TABLE IF NOT EXISTS tenant_daily_task_policy (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  school_level TEXT NOT NULL CHECK(school_level IN ('P1-P4','P5','P6','S1','S2','S3','S4')),
  listen_video_max_seconds INTEGER NOT NULL DEFAULT 0 CHECK(listen_video_max_seconds BETWEEN 0 AND 7200),
  read_max_words INTEGER NOT NULL DEFAULT 0 CHECK(read_max_words BETWEEN 0 AND 10000),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(tenant_id,school_level)
);
CREATE INDEX IF NOT EXISTS idx_tenant_daily_task_policy ON tenant_daily_task_policy(tenant_id,school_level);

-- 0 means unlimited, preserving the pre-hotfix Daily Task behaviour until a Tenant Admin chooses limits.
WITH levels(level) AS (
  VALUES ('P1-P4'),('P5'),('P6'),('S1'),('S2'),('S3'),('S4')
)
INSERT OR IGNORE INTO tenant_daily_task_policy(tenant_id,school_level,listen_video_max_seconds,read_max_words)
SELECT t.id,l.level,0,0
FROM tenants t
CROSS JOIN levels l;
