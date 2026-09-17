import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { learnerTenantContext } from "@/lib/tenant/learner-context";

type Row={id:string;title:string;school_level:string;topic:string|null;progress_status:string;progress_percent:number;started_at:string;completed_at:string|null;updated_at:string;attempt_count:number;wrong_attempts:number;correct_questions:number;total_questions:number;last_attempt_at:string|null};

export async function GET(request:Request){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB),{tenantId}=await learnerTenantContext(env.DB,session.childId);
  const rows=await env.DB.prepare(`SELECT c.id,c.title,c.school_level,c.topic,p.status progress_status,p.progress_percent,p.started_at,p.completed_at,p.updated_at,
      COUNT(a.id) attempt_count,
      COALESCE(SUM(CASE WHEN a.is_correct=0 THEN 1 ELSE 0 END),0) wrong_attempts,
      COUNT(DISTINCT CASE WHEN a.is_correct=1 THEN a.question_id END) correct_questions,
      (SELECT COUNT(*) FROM questions q WHERE q.source_content_id=c.id AND q.status='published' AND (q.scope='global' OR (q.scope='tenant' AND q.tenant_id=?))) total_questions,
      MAX(a.created_at) last_attempt_at
    FROM learner_content_progress p
    JOIN content_items c ON c.id=p.content_id
    LEFT JOIN question_attempts a ON a.child_id=p.child_id AND a.content_id=p.content_id
    WHERE p.child_id=? AND c.content_type IN ('article','lesson') AND (c.scope='global' OR (c.scope='tenant' AND c.tenant_id=?))
    GROUP BY c.id,c.title,c.school_level,c.topic,p.status,p.progress_percent,p.started_at,p.completed_at,p.updated_at
    ORDER BY COALESCE(MAX(a.created_at),p.updated_at) DESC,c.id DESC LIMIT 200`)
    .bind(tenantId,session.childId,tenantId).all<Row>();
  const records=rows.results.map(x=>({...x,status:x.progress_status==="completed"&&Number(x.progress_percent)>=100?"pass":Number(x.wrong_attempts)>0?"fail":"in_progress",scorePercent:Math.min(100,Math.round(Number(x.correct_questions||0)/Math.max(1,Number(x.total_questions||0))*100))}));
  const response=Response.json({records});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}
