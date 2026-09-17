import type { LearningStage } from "@/lib/language/stages";

export type LearnDomain = "listen" | "speak" | "read" | "write";
export type SchoolLevel = LearningStage;

export async function getLessonLimit(
  db: D1Database,
  tenantId: string,
  schoolLevel: SchoolLevel,
  domain: LearnDomain,
): Promise<number | null> {
  const row = await db.prepare("SELECT lesson_limit FROM tenant_learn_availability WHERE tenant_id=? AND school_level=? AND domain=?")
    .bind(tenantId, schoolLevel, domain).first<{ lesson_limit: number }>();
  return row ? Math.max(0, Number(row.lesson_limit) || 0) : null;
}

export async function effectiveLessonLimit(
  db: D1Database,
  tenantId: string,
  schoolLevel: SchoolLevel,
  domain: LearnDomain,
  fallback = 200,
): Promise<number> {
  const configured = await getLessonLimit(db, tenantId, schoolLevel, domain);
  return configured === null ? fallback : configured;
}

export function clampLessonLimit(value: unknown): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(200, n));
}

const domainTypes: Record<LearnDomain, string[]> = {
  listen: ["audio", "video_ref"],
  speak: ["oral_prompt"],
  read: ["article", "lesson"],
  write: ["writing_prompt"],
};

export async function getVisibleLessonIds(
  db: D1Database,
  tenantId: string,
  schoolLevel: SchoolLevel,
  domain: LearnDomain,
): Promise<Set<string>> {
  const limit = await effectiveLessonLimit(db, tenantId, schoolLevel, domain, 200);
  if (limit <= 0) return new Set<string>();
  const types = domainTypes[domain];
  const marks = types.map(() => "?").join(",");
  const scope = tenantId ? "(scope='global' OR (scope='tenant' AND tenant_id=?))" : "scope='global'";
  const binds: unknown[] = [schoolLevel, ...types];
  if (tenantId) binds.push(tenantId);
  binds.push(limit);
  const rows = await db.prepare(
    `SELECT id FROM content_items WHERE status='published' AND school_level=? AND content_type IN (${marks}) AND ${scope} ORDER BY created_at ASC,id ASC LIMIT ?`,
  ).bind(...binds).all<{ id: string }>();
  return new Set(rows.results.map((x) => x.id));
}

/**
 * Lightweight visibility check for a single lesson. Daily-assigned lessons are
 * always open even when the rolling Tenant access window has moved on.
 */
export async function isLessonVisible(
  db:D1Database,
  tenantId:string,
  schoolLevel:SchoolLevel,
  domain:LearnDomain,
  lessonId:string,
  childId?:string,
):Promise<boolean>{
  if(childId){
    const assigned=await db.prepare(`SELECT 1 ok FROM learning_tasks
      WHERE child_id=? AND task_date=date('now','+8 hours') AND cadence='daily'
        AND activity_type=? AND activity_id=? LIMIT 1`)
      .bind(childId,domain==='listen'?'listening':domain==='speak'?'speaking':domain==='read'?'reading':'writing',lessonId)
      .first<{ok:number}>();
    if(assigned)return true;
  }
  const limit=await effectiveLessonLimit(db,tenantId,schoolLevel,domain,200);
  if(limit<=0)return false;
  const types=domainTypes[domain],marks=types.map(()=>'?').join(','),scope=tenantId?"(scope='global' OR (scope='tenant' AND tenant_id=?))":"scope='global'",binds:unknown[]=[schoolLevel,...types];
  if(tenantId)binds.push(tenantId);binds.push(limit,lessonId);
  const row=await db.prepare(`SELECT 1 ok FROM (
    SELECT id FROM content_items
    WHERE status='published' AND school_level=? AND content_type IN (${marks}) AND ${scope}
    ORDER BY created_at ASC,id ASC LIMIT ?
  ) visible WHERE id=? LIMIT 1`).bind(...binds).first<{ok:number}>();
  return Boolean(row);
}
