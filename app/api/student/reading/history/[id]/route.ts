import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { learnerTenantContext } from "@/lib/tenant/learner-context";

function safeJson<T>(text:string|null,fallback:T):T{try{return text?JSON.parse(text) as T:fallback}catch{return fallback}}

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB),{tenantId}=await learnerTenantContext(env.DB,session.childId),{id}=await params;
  const record=await env.DB.prepare(`SELECT c.id,c.title,c.school_level,c.topic,p.status progress_status,p.progress_percent,p.started_at,p.completed_at,p.updated_at
    FROM learner_content_progress p JOIN content_items c ON c.id=p.content_id
    WHERE p.child_id=? AND p.content_id=? AND c.content_type IN ('article','lesson') AND (c.scope='global' OR (c.scope='tenant' AND c.tenant_id=?))`)
    .bind(session.childId,id,tenantId).first<{id:string;title:string;school_level:string;topic:string|null;progress_status:string;progress_percent:number;started_at:string;completed_at:string|null;updated_at:string}>();
  if(!record)return Response.json({error:"Reading record not found"},{status:404});
  const questions=await env.DB.prepare(`SELECT id,question_type,stem_json,marks,created_at FROM questions WHERE source_content_id=? AND status='published' AND (scope='global' OR (scope='tenant' AND tenant_id=?)) ORDER BY created_at,id`).bind(id,tenantId).all<{id:string;question_type:string;stem_json:string;marks:number;created_at:string}>();
  const attempts=await env.DB.prepare(`SELECT id,question_id,response_json,is_correct,score,max_score,feedback_json,created_at FROM question_attempts WHERE child_id=? AND content_id=? ORDER BY created_at,id`).bind(session.childId,id).all<{id:string;question_id:string;response_json:string;is_correct:number;score:number;max_score:number;feedback_json:string|null;created_at:string}>();
  const grouped=new Map<string,typeof attempts.results>();for(const a of attempts.results){const list=grouped.get(a.question_id)||[];list.push(a);grouped.set(a.question_id,list)}
  const items=questions.results.map((q,index)=>{const qa=grouped.get(q.id)||[];const stem=safeJson<{prompt?:string;options?:string[]}>(q.stem_json,{});return{id:q.id,order:index+1,questionType:q.question_type,prompt:stem.prompt||`Question ${index+1}`,options:stem.options||[],marks:q.marks,passed:qa.some(a=>Boolean(a.is_correct)),attempts:qa.map(a=>({id:a.id,response:safeJson<Record<string,unknown>>(a.response_json,{}),correct:Boolean(a.is_correct),score:a.score,maxScore:a.max_score,feedback:safeJson<Record<string,unknown>>(a.feedback_json,{}),createdAt:a.created_at}))}});
  const wrongAttempts=attempts.results.filter(a=>!a.is_correct).length,correctQuestions=items.filter(x=>x.passed).length,totalQuestions=items.length;
  const status=record.progress_status==="completed"&&Number(record.progress_percent)>=100?"pass":wrongAttempts>0?"fail":"in_progress";
  const response=Response.json({record:{...record,status,scorePercent:Math.min(100,Math.round(correctQuestions/Math.max(1,totalQuestions)*100)),attemptCount:attempts.results.length,wrongAttempts,correctQuestions,totalQuestions},questions:items});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}
