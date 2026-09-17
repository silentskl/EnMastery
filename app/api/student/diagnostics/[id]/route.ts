import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
function safe<T>(value:string,fallback:T):T{try{return JSON.parse(value) as T}catch{return fallback}}
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB),{tenantId}=await learnerTenantContext(env.DB,session.childId),{id}=await params;
  const assessment=await env.DB.prepare("SELECT id,name,school_level,duration_minutes,total_marks FROM assessments WHERE id=? AND assessment_type='diagnostic' AND status='published' AND (scope='global' OR (scope='tenant' AND tenant_id=?))").bind(id,tenantId).first();
  if(!assessment)return Response.json({error:"Diagnostic not found"},{status:404});
  const rows=await env.DB.prepare(`SELECT q.id,q.question_type,q.stem_json,q.marks,i.item_order FROM assessment_items i JOIN questions q ON q.id=i.question_id
    WHERE i.assessment_id=? AND q.status='published' AND (q.scope='global' OR (q.scope='tenant' AND q.tenant_id=?)) ORDER BY i.item_order`).bind(id,tenantId).all<{id:string;question_type:string;stem_json:string;marks:number;item_order:number}>();
  const questions=rows.results.map(q=>({id:q.id,questionType:q.question_type,stem:safe<Record<string,unknown>>(q.stem_json,{}),marks:q.marks,order:q.item_order}));
  const response=Response.json({assessment,questions});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}
