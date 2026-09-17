import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
import { getVisibleLessonIds } from "@/lib/tenant/lesson-availability";

export async function GET(request:Request){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB),{tenantId}=await learnerTenantContext(env.DB,session.childId),url=new URL(request.url),level=url.searchParams.get("level")==="P5"?"P5":"P6",allowed=await getVisibleLessonIds(env.DB,tenantId,level,"read");
  const rows=await env.DB.prepare(`SELECT c.id,c.title,c.school_level,c.topic,c.description,c.source_attribution,c.published_at,
      COALESCE(p.progress_percent,0) progress_percent,COALESCE(p.status,'not_started') progress_status,
      COUNT(a.id) attempt_count,COALESCE(SUM(CASE WHEN a.is_correct=0 THEN 1 ELSE 0 END),0) wrong_attempts,
      COUNT(DISTINCT CASE WHEN a.is_correct=1 THEN a.question_id END) correct_questions,
      (SELECT COUNT(*) FROM questions q WHERE q.source_content_id=c.id AND q.status='published' AND (q.scope='global' OR (q.scope='tenant' AND q.tenant_id=?))) total_questions
    FROM content_items c
    LEFT JOIN learner_content_progress p ON p.content_id=c.id AND p.child_id=?
    LEFT JOIN question_attempts a ON a.content_id=c.id AND a.child_id=?
    WHERE c.status='published' AND c.content_type IN ('article','lesson') AND c.school_level=? AND (c.scope='global' OR (c.scope='tenant' AND c.tenant_id=?))
    GROUP BY c.id,c.title,c.school_level,c.topic,c.description,c.source_attribution,c.published_at,p.progress_percent,p.status
    ORDER BY c.created_at ASC,c.id ASC LIMIT 200`).bind(tenantId,session.childId,session.childId,level,tenantId).all<{id:string}>();
  const contents=rows.results.filter(x=>allowed.has(x.id));const response=Response.json({contents,level});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}
