PRAGMA defer_foreign_keys = ON;

-- V0.6 R4 compatibility migration.
-- V0.5 was single-tenant: every Admin-created resource belonged to what is now tenant-default.
-- Migration 0017 introduced scope/tenant_id and conservatively defaulted all historical rows to global.
-- Recover only rows that existed before the V0.6 boundary. tenant-default.created_at is the durable
-- boundary timestamp created by 0017, so Platform Admin global resources created after V0.6 stay global.

-- 1) All V0.5 generation jobs were visible to the old single-tenant Admin. Reattach them to default.
UPDATE generation_jobs
SET tenant_id='tenant-default', scope='tenant'
WHERE tenant_id IS NULL
  AND scope='global'
  AND datetime(created_at) <= datetime((SELECT created_at FROM tenants WHERE id='tenant-default'))
  AND COALESCE(created_by,'admin')='admin';

-- 2) Question Bank expansion batches were Admin-created in V0.5.
UPDATE question_generation_batches
SET tenant_id='tenant-default', scope='tenant'
WHERE tenant_id IS NULL
  AND scope='global'
  AND datetime(created_at) <= datetime((SELECT created_at FROM tenants WHERE id='tenant-default'))
  AND COALESCE(created_by,'admin')='admin';

-- 3) Recover V0.5 Admin-created learning content.
-- Queue-generated content is linked through generation_job_id/entity_id. Manual Admin content used
-- dynamic content-/listen-/write- identifiers; deterministic seeded writing prompts remain global.
UPDATE content_items
SET tenant_id='tenant-default', scope='tenant'
WHERE tenant_id IS NULL
  AND scope='global'
  AND datetime(created_at) <= datetime((SELECT created_at FROM tenants WHERE id='tenant-default'))
  AND (
    generation_job_id IN (
      SELECT id FROM generation_jobs WHERE tenant_id='tenant-default' AND scope='tenant'
    )
    OR id IN (
      SELECT entity_id FROM generation_jobs
      WHERE tenant_id='tenant-default' AND scope='tenant'
        AND entity_type='content' AND entity_id IS NOT NULL
    )
    OR id LIKE 'content-%'
    OR id LIKE 'listen-%'
    OR (
      id LIKE 'write-%'
      AND id NOT IN ('write-p5-kindness','write-p6-responsibility','write-p6-situational')
    )
  );

-- 4) Recover questions produced by legacy Admin jobs/content/QBank batches.
UPDATE questions
SET tenant_id='tenant-default', scope='tenant'
WHERE tenant_id IS NULL
  AND scope='global'
  AND datetime(created_at) <= datetime((SELECT created_at FROM tenants WHERE id='tenant-default'))
  AND (
    source_content_id IN (
      SELECT id FROM content_items WHERE tenant_id='tenant-default' AND scope='tenant'
    )
    OR id IN (
      SELECT entity_id FROM generation_jobs
      WHERE tenant_id='tenant-default' AND scope='tenant'
        AND entity_type='question_bank_question' AND entity_id IS NOT NULL
    )
    OR id IN (
      SELECT b.question_id FROM question_bank_items b
      JOIN question_generation_batches qb ON qb.id=b.batch_id
      WHERE qb.tenant_id='tenant-default' AND qb.scope='tenant'
    )
    OR id IN (
      SELECT b.question_id FROM question_bank_items b
      JOIN generation_jobs j ON j.id=b.generation_job_id
      WHERE j.tenant_id='tenant-default' AND j.scope='tenant'
    )
    OR id IN (
      SELECT json_extract(CASE WHEN json_valid(result_json) THEN result_json ELSE '{}' END,'$.questionId')
      FROM generation_jobs
      WHERE tenant_id='tenant-default' AND scope='tenant'
        AND result_json IS NOT NULL
    )
  );

-- 5) Defensive recovery for any non-seed Practice/Assessment rows manually created before V0.6.
-- Normal V0.5 shipped sets/diagnostics remain global and are shown read-only in the Tenant Admin pool.
UPDATE practice_sets
SET tenant_id='tenant-default', scope='tenant'
WHERE tenant_id IS NULL
  AND scope='global'
  AND datetime(created_at) <= datetime((SELECT created_at FROM tenants WHERE id='tenant-default'))
  AND id NOT IN ('practice-p5-core','practice-p6-grammar','practice-p6-vocab','practice-p6-comprehension');

UPDATE assessments
SET tenant_id='tenant-default', scope='tenant'
WHERE tenant_id IS NULL
  AND scope='global'
  AND datetime(created_at) <= datetime((SELECT created_at FROM tenants WHERE id='tenant-default'))
  AND id NOT IN ('diag-p5-paper2','diag-p6-paper2');

-- 6) AI run history created in the single-tenant era belongs to tenant-default as well.
UPDATE ai_runs
SET tenant_id='tenant-default'
WHERE tenant_id IS NULL
  AND datetime(created_at) <= datetime((SELECT created_at FROM tenants WHERE id='tenant-default'));

PRAGMA defer_foreign_keys = OFF;
