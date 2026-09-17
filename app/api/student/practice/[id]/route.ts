import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { learnerTenantContext } from "@/lib/tenant/learner-context";

function safe<T>(value: string, fallback: T): T { try { return JSON.parse(value) as T; } catch { return fallback; } }

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const env = getEnv();
  const session = await ensureLearnerSession(request, env.DB);
  const { tenantId } = await learnerTenantContext(env.DB, session.childId);
  const { id } = await params;
  const set = await env.DB.prepare("SELECT id,name,description,school_level,set_type FROM practice_sets WHERE id=? AND status='published' AND (scope='global' OR (scope='tenant' AND tenant_id=?))")
    .bind(id, tenantId).first();
  if (!set) return Response.json({ error: "Practice set not found" }, { status: 404 });
  const rows = await env.DB.prepare(`SELECT q.id,q.question_type,q.stem_json,q.marks,i.item_order
    FROM practice_set_items i JOIN questions q ON q.id=i.question_id
    WHERE i.set_id=? AND q.status='published' AND (q.scope='global' OR (q.scope='tenant' AND q.tenant_id=?))
    ORDER BY i.item_order`).bind(id, tenantId).all<{ id:string; question_type:string; stem_json:string; marks:number; item_order:number }>();
  const questions = rows.results.map(q => ({ id:q.id, questionType:q.question_type, stem:safe<Record<string,unknown>>(q.stem_json,{}), marks:q.marks, order:q.item_order }));
  const response = Response.json({ set, questions });
  if (session.isNew) response.headers.set("Set-Cookie", learnerCookie(session.sessionId));
  return response;
}
