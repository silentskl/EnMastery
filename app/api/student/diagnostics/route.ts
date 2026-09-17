import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { learnerTenantContext } from "@/lib/tenant/learner-context";

export async function GET(request: Request) {
  const env = getEnv();
  const session = await ensureLearnerSession(request, env.DB);
  const { tenantId } = await learnerTenantContext(env.DB, session.childId);
  const rows = await env.DB.prepare(`SELECT a.id,a.name,a.school_level,a.duration_minutes,a.total_marks,COUNT(i.question_id) question_count
    FROM assessments a LEFT JOIN assessment_items i ON i.assessment_id=a.id
    WHERE a.assessment_type='diagnostic' AND a.status='published' AND (a.scope='global' OR (a.scope='tenant' AND a.tenant_id=?))
    GROUP BY a.id ORDER BY a.school_level`).bind(tenantId).all();
  const response = Response.json({ diagnostics: rows.results });
  if (session.isNew) response.headers.set("Set-Cookie", learnerCookie(session.sessionId));
  return response;
}
