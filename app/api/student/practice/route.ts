import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { learnerTenantContext } from "@/lib/tenant/learner-context";

export async function GET(request: Request) {
  const env = getEnv();
  const session = await ensureLearnerSession(request, env.DB);
  const { tenantId, schoolLevel } = await learnerTenantContext(env.DB, session.childId);
  const rows = await env.DB.prepare(`SELECT p.id,p.name,p.description,p.school_level,p.set_type,COUNT(i.question_id) question_count
    FROM practice_sets p LEFT JOIN practice_set_items i ON i.set_id=p.id
    WHERE p.status='published' AND p.school_level=? AND (p.scope='global' OR (p.scope='tenant' AND p.tenant_id=?))
    GROUP BY p.id ORDER BY p.name`).bind(schoolLevel, tenantId).all();
  const response = Response.json({ sets: rows.results });
  if (session.isNew) response.headers.set("Set-Cookie", learnerCookie(session.sessionId));
  return response;
}
