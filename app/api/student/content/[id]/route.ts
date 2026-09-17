import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { getContent, questionForStudent } from "@/lib/content/store";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
import { isLessonVisible } from "@/lib/tenant/lesson-availability";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB),{tenantId}=await learnerTenantContext(env.DB,session.childId),{id}=await params;
  const meta=await env.DB.prepare("SELECT school_level FROM content_items WHERE id=? AND status='published' AND content_type IN ('article','lesson') AND (scope='global' OR (scope='tenant' AND tenant_id=?))").bind(id,tenantId).first<{school_level:string}>();
  if(!meta)return Response.json({error:"Learning content not found"},{status:404});
  const level=meta.school_level as import("@/lib/language/stages").LearningStage;
  if(!await isLessonVisible(env.DB,tenantId,level,"read",id,session.childId))return Response.json({error:"This lesson is not currently open for this learner"},{status:403});
  const content=await getContent(env.DB,id,true);if(!content)return Response.json({error:"Learning content not found"},{status:404});
  await env.DB.prepare("INSERT INTO learner_content_progress (child_id,content_id,status,progress_percent) VALUES (?,?,'started',10) ON CONFLICT(child_id,content_id) DO UPDATE SET progress_percent=MAX(progress_percent,10),updated_at=CURRENT_TIMESTAMP").bind(session.childId,id).run();
  const progress=await env.DB.prepare("SELECT status,progress_percent,started_at,completed_at,updated_at FROM learner_content_progress WHERE child_id=? AND content_id=?").bind(session.childId,id).first<{status:string;progress_percent:number;started_at:string;completed_at:string|null;updated_at:string}>();
  const attempts=await env.DB.prepare("SELECT COUNT(*) attempt_count,COALESCE(SUM(CASE WHEN is_correct=0 THEN 1 ELSE 0 END),0) wrong_attempts,COUNT(DISTINCT CASE WHEN is_correct=1 THEN question_id END) correct_questions FROM question_attempts WHERE child_id=? AND content_id=?").bind(session.childId,id).first<{attempt_count:number;wrong_attempts:number;correct_questions:number}>();
  const summary=await env.DB.prepare("SELECT passed,score,status FROM learning_summary_attempts WHERE child_id=? AND content_id=? ORDER BY created_at DESC LIMIT 1").bind(session.childId,id).first<{passed:number;score:number|null;status:string}>();
  const total=content.questions.length,questionsPassed=total===0||Number(attempts?.correct_questions||0)>=total,summaryPassed=Boolean(summary?.passed),status=questionsPassed&&summaryPassed?"pass":Number(attempts?.wrong_attempts||0)>0||summary?.status==="reviewed"&&!summaryPassed?"fail":"in_progress";
  const derivedProgress=status==="pass"?100:Math.min(99,Math.round((Number(attempts?.correct_questions||0)/Math.max(total,1))*80)+(summaryPassed?20:0));
  const publicContent={id:content.id,title:content.title,schoolLevel:content.school_level,topic:content.topic,description:content.description,sourceAttribution:content.source_attribution,body:content.body,questions:content.questions.map(q=>questionForStudent(q as Record<string,unknown>)),learningRecord:{status,progressPercent:Math.max(10,derivedProgress),attemptCount:Number(attempts?.attempt_count||0),wrongAttempts:Number(attempts?.wrong_attempts||0),correctQuestions:Number(attempts?.correct_questions||0),totalQuestions:total}};
  const response=Response.json({content:publicContent});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}
