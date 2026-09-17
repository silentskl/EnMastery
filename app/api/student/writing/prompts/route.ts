import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
import { getVisibleLessonIds } from "@/lib/tenant/lesson-availability";
import { getTenantPassScore } from "@/lib/settings/learning-policy";
import { getTenantDailyTaskPolicy } from "@/lib/settings/daily-task-policy";

type PromptRow={id:string;title:string;school_level:string;topic:string|null;description:string|null;body_json:string;reviewed_count:number;passed_count:number;last_reviewed_at:string|null;last_submission_at:string|null};
export async function GET(request:Request){
 const env=getEnv(),session=await ensureLearnerSession(request,env.DB),{tenantId,schoolLevel}=await learnerTenantContext(env.DB,session.childId),allowed=await getVisibleLessonIds(env.DB,tenantId,schoolLevel,"write"),passMark=await getTenantPassScore(env.DB,tenantId),dailyPolicy=await getTenantDailyTaskPolicy(env.DB,tenantId,schoolLevel);
 const locked=await env.DB.prepare(`SELECT w.prompt_id FROM writing_submissions w JOIN content_items c ON c.id=w.prompt_id WHERE w.child_id=? AND w.status='reviewed' AND w.passed=0 AND c.content_type='writing_prompt' AND c.status='published' AND c.school_level=? AND (c.scope='global' OR (c.scope='tenant' AND c.tenant_id=?)) AND NOT EXISTS (SELECT 1 FROM writing_submissions p WHERE p.child_id=w.child_id AND p.prompt_id=w.prompt_id AND p.passed=1) ORDER BY w.updated_at DESC,w.created_at DESC LIMIT 1`).bind(session.childId,schoolLevel,tenantId).first<{prompt_id:string}>();
 const lockedPromptId=locked?.prompt_id||null;
 const rows=await env.DB.prepare(`SELECT c.id,c.title,c.school_level,c.topic,c.description,v.body_json,COALESCE(ws.reviewed_count,0) reviewed_count,COALESCE(ws.passed_count,0) passed_count,ws.last_reviewed_at,ws.last_submission_at FROM content_items c JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version LEFT JOIN (SELECT prompt_id,SUM(CASE WHEN status='reviewed' THEN 1 ELSE 0 END) reviewed_count,SUM(CASE WHEN passed=1 THEN 1 ELSE 0 END) passed_count,MAX(CASE WHEN status='reviewed' THEN updated_at END) last_reviewed_at,MAX(updated_at) last_submission_at FROM writing_submissions WHERE child_id=? GROUP BY prompt_id) ws ON ws.prompt_id=c.id WHERE c.content_type='writing_prompt' AND c.status='published' AND c.school_level=? AND (c.scope='global' OR (c.scope='tenant' AND c.tenant_id=?)) ORDER BY CASE WHEN COALESCE(ws.passed_count,0)=0 THEN 0 ELSE 1 END,COALESCE(ws.last_reviewed_at,'1970-01-01') ASC,c.created_at,c.id`).bind(session.childId,schoolLevel,tenantId).all<PromptRow>();
 const prompts=rows.results.filter(x=>allowed.has(x.id)||x.id===lockedPromptId).map(x=>({...x,completed:Number(x.passed_count||0)>0}));
 const incomplete=prompts.filter(x=>!x.completed),allCompleted=prompts.length>0&&incomplete.length===0,nextPromptId=lockedPromptId||(incomplete[0]||prompts[0])?.id||null;
 const response=Response.json({prompts,nextPromptId,lockedPromptId,allCompleted,completedCount:prompts.length-incomplete.length,totalCount:prompts.length,passMark,writingMinimumWords:dailyPolicy.writingMinWords});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}
