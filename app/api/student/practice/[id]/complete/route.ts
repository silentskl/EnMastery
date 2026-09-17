import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { completeMatchingTasks } from "@/lib/student/tasks";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB),{tenantId}=await learnerTenantContext(env.DB,session.childId),{id}=await params;
  const exists=await env.DB.prepare("SELECT id FROM practice_sets WHERE id=? AND status='published' AND (scope='global' OR (scope='tenant' AND tenant_id=?))").bind(id,tenantId).first();
  if(!exists)return Response.json({error:"Practice set not found"},{status:404});
  const coverage=await env.DB.prepare(`SELECT COUNT(DISTINCT i.question_id) total,
      COUNT(DISTINCT CASE WHEN a.is_correct=1 THEN i.question_id END) correct
    FROM practice_set_items i
    JOIN questions q ON q.id=i.question_id AND q.status='published' AND (q.scope='global' OR (q.scope='tenant' AND q.tenant_id=?))
    LEFT JOIN question_attempts a ON a.question_id=i.question_id AND a.child_id=?
    WHERE i.set_id=?`).bind(tenantId,session.childId,id).first<{total:number;correct:number}>();
  if(!coverage?.total||Number(coverage.correct||0)<Number(coverage.total||0))return Response.json({error:"Answer every question correctly before completing this Reading task",correct:Number(coverage?.correct||0),total:Number(coverage?.total||0)},{status:409});
  const xp=await completeMatchingTasks(env.DB,session.childId,"reading",id);const response=Response.json({ok:true,xp,passed:true,correct:coverage.correct,total:coverage.total});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}
