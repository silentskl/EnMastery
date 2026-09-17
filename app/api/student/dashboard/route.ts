import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { learnerTenantContext } from "@/lib/tenant/learner-context";

export async function GET(request: Request) {
  const env = getEnv();
  const session = await ensureLearnerSession(request, env.DB);
  const profile = await env.DB.prepare("SELECT nickname,school_level,target_al,tenant_id FROM child_profiles WHERE id=?").bind(session.childId).first<{nickname:string;school_level:string;target_al:string;tenant_id:string|null}>();
  const { tenantId } = await learnerTenantContext(env.DB, session.childId);
  const xp = await env.DB.prepare("SELECT COALESCE(SUM(points),0) AS xp FROM xp_ledger WHERE child_id=?").bind(session.childId).first<{xp:number}>();
  const completed = await env.DB.prepare("SELECT COUNT(*) AS n FROM learner_content_progress WHERE child_id=? AND status='completed'").bind(session.childId).first<{n:number}>();
  const available = await env.DB.prepare("SELECT COUNT(*) AS n FROM content_items WHERE status='published' AND content_type IN ('article','audio','video_ref') AND school_level=? AND (scope='global' OR (scope='tenant' AND tenant_id=?))").bind(profile?.school_level || 'P6',tenantId).first<{n:number}>();
  const mastery = await env.DB.prepare("SELECT s.name,m.mastery FROM skill_mastery m JOIN skills s ON s.id=m.skill_id WHERE m.child_id=? ORDER BY m.updated_at DESC LIMIT 12").bind(session.childId).all<{name:string;mastery:number}>();
  const recent = await env.DB.prepare("SELECT c.id,c.title,c.topic,c.content_type,p.progress_percent FROM learner_content_progress p JOIN content_items c ON c.id=p.content_id WHERE p.child_id=? AND p.status='started' AND (c.scope='global' OR (c.scope='tenant' AND c.tenant_id=?)) ORDER BY p.updated_at DESC LIMIT 4").bind(session.childId,tenantId).all<{id:string;title:string;topic:string|null;content_type:string;progress_percent:number}>();
  const tenant=await env.DB.prepare("SELECT name FROM tenants WHERE id=?").bind(tenantId).first<{name:string}>();
  const response = Response.json({profile:profile||{nickname:'Student',school_level:'P6',target_al:'AL2'},tenantName:tenant?.name||null,xp:xp?.xp||0,completedLessons:completed?.n||0,availableLessons:available?.n||0,mastery:mastery.results,recent:recent.results});
  if (session.isNew) response.headers.set("Set-Cookie", learnerCookie(session.sessionId));
  return response;
}
