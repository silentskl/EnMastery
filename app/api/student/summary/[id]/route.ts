import { resolveLearnerAiIntegrations } from "@/lib/settings/learner-runtime";
import { requireAuthenticatedLearner } from "@/lib/settings/learner-runtime";
import { learnerCookie } from "@/lib/student/session";
import { enqueueJob } from "@/lib/jobs/dispatch";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
import { getTenantPassScore } from "@/lib/settings/learning-policy";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {env,session}=await resolveLearnerAiIntegrations(request);const denied=requireAuthenticatedLearner(session);if(denied)return denied;const {id}=await params;
 const row=await env.DB.prepare("SELECT id,summary_text,word_count,status,score,passed,feedback_json,generation_job_id,created_at,reviewed_at FROM learning_summary_attempts WHERE child_id=? AND content_id=? ORDER BY created_at DESC LIMIT 1").bind(session.childId,id).first<Record<string,unknown>>();
 const {tenantId}=await learnerTenantContext(env.DB,session.childId),passMark=await getTenantPassScore(env.DB,tenantId);
 const r=Response.json({summary:row||null,passMark});if(session.isNew)r.headers.set("Set-Cookie",learnerCookie(session.sessionId));return r;
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const {env,session,tenantId,quota}=await resolveLearnerAiIntegrations(request);const denied= requireAuthenticatedLearner(session);if(denied)return denied;if(!quota.allowed)return Response.json({error:"This organisation has reached its monthly AI request quota"},{status:429});
 const {id}=await params,b=await request.json().catch(()=>({})) as Record<string,unknown>,text=String(b.summary||"").trim(),words=text.split(/\s+/).filter(Boolean).length;
 if(words<15)return Response.json({error:"Write at least 15 words before requesting a summary review"},{status:400});
 if(!env.MODELBRIDGE_API_KEY||!env.MODELBRIDGE_CHAT_MODEL)return Response.json({error:"Your organisation has not configured ModelBridge"},{status:503});
 const {tenantId:learnerTenant}=await learnerTenantContext(env.DB,session.childId);
 const passMark=await getTenantPassScore(env.DB,learnerTenant);
 const item=await env.DB.prepare("SELECT id,title,school_level,content_type,description FROM content_items WHERE id=? AND status='published' AND content_type IN ('article','lesson','audio','video_ref') AND (scope='global' OR (scope='tenant' AND tenant_id=?))").bind(id,learnerTenant).first<{id:string;title:string;school_level:string;content_type:string;description:string|null}>();
 if(!item)return Response.json({error:"Learning item not found"},{status:404});
 const skillType=item.content_type==="article"||item.content_type==="lesson"?"reading":"listening";
 const previous=await env.DB.prepare("SELECT id FROM learning_summary_attempts WHERE child_id=? AND content_id=? ORDER BY created_at DESC LIMIT 1").bind(session.childId,id).first<{id:string}>();
 const summaryId=`summary-${crypto.randomUUID()}`;
 await env.DB.prepare("INSERT INTO learning_summary_attempts (id,child_id,content_id,skill_type,summary_text,word_count,status,revision_of_summary_id) VALUES (?,?,?,?,?,?,'evaluating',?)").bind(summaryId,session.childId,id,skillType,text,words,previous?.id||null).run();
 const jobId=await enqueueJob(env.DB,env,{jobType:"summary_feedback",entityType:"learning_summary",entityId:summaryId,tenantId,createdBy:session.childId,request:{summaryId,childId:session.childId,contentId:id,skillType,schoolLevel:item.school_level,title:item.title,summary:text,passMark}});
 await env.DB.prepare("UPDATE learning_summary_attempts SET generation_job_id=? WHERE id=?").bind(jobId,summaryId).run();
 const r=Response.json({ok:true,summaryId,jobId,status:"evaluating",passMark},{status:202});if(session.isNew)r.headers.set("Set-Cookie",learnerCookie(session.sessionId));return r;
}
