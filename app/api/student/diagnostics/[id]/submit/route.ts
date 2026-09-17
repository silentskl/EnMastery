import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { scorePaper2Question, type QuestionRow } from "@/lib/questions/scoring";
import { updateSkillEvidence } from "@/lib/student/mastery";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB),{tenantId}=await learnerTenantContext(env.DB,session.childId),{id}=await params;
  const body=await request.json().catch(()=>({})) as {responses?:Record<string,unknown>};
  const assessment=await env.DB.prepare("SELECT id,name,total_marks FROM assessments WHERE id=? AND assessment_type='diagnostic' AND status='published' AND (scope='global' OR (scope='tenant' AND tenant_id=?))").bind(id,tenantId).first<{id:string;name:string;total_marks:number}>();
  if(!assessment)return Response.json({error:"Diagnostic not found"},{status:404});
  const rows=await env.DB.prepare(`SELECT q.id,q.question_type,q.stem_json,q.answer_json,q.explanation_json,q.marks FROM assessment_items i JOIN questions q ON q.id=i.question_id
    WHERE i.assessment_id=? AND q.status='published' AND (q.scope='global' OR (q.scope='tenant' AND q.tenant_id=?)) ORDER BY i.item_order`).bind(id,tenantId).all<QuestionRow>();
  let score=0,max=0;const skillAgg=new Map<string,{sum:number;n:number}>(),detail=[] as Array<Record<string,unknown>>;
  for(const q of rows.results){const result=scorePaper2Question(q,body.responses?.[q.id]);score+=result.score;max+=result.maxScore;detail.push({questionId:q.id,score:result.score,maxScore:result.maxScore,correct:result.correct});const skills=await env.DB.prepare("SELECT skill_id FROM question_skills WHERE question_id=?").bind(q.id).all<{skill_id:string}>();for(const sk of skills.results){const value=Math.round(result.ratio*100),current=skillAgg.get(sk.skill_id)||{sum:0,n:0};current.sum+=value;current.n++;skillAgg.set(sk.skill_id,current);await updateSkillEvidence(env.DB,session.childId,sk.skill_id,value);}}
  const summary:Array<{skillId:string;score:number}>=[];for(const[skillId,value]of skillAgg)summary.push({skillId,score:Math.round(value.sum/value.n)});summary.sort((a,b)=>a.score-b.score);
  const readiness=max?Math.round(score/max*1000)/10:0,resultId=`diag-${crypto.randomUUID()}`;
  await env.DB.batch([
    env.DB.prepare("INSERT INTO diagnostic_results (id,child_id,assessment_id,score,max_score,readiness_percent,skill_summary_json) VALUES (?,?,?,?,?,?,?)").bind(resultId,session.childId,id,score,max,readiness,JSON.stringify(summary)),
    env.DB.prepare("INSERT INTO learner_attempts (id,child_id,activity_type,activity_id,completed_at,score,max_score,response_json,feedback_json) VALUES (?,?, 'diagnostic', ?, CURRENT_TIMESTAMP, ?, ?, ?, ?)").bind(`attempt-${crypto.randomUUID()}`,session.childId,id,score,max,JSON.stringify(body.responses||{}),JSON.stringify({readiness,summary}))
  ]);
  await env.DB.prepare("INSERT INTO xp_ledger (id,child_id,event_type,points,reference_id) VALUES (?,?, 'diagnostic_complete', 30, ?)").bind(`xp-${crypto.randomUUID()}`,session.childId,resultId).run();
  const response=Response.json({ok:true,resultId,score,maxScore:max,readinessPercent:readiness,weakSkills:summary.slice(0,3),detail});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}
