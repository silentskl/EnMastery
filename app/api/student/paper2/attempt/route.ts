import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { scorePaper2Question, type QuestionRow } from "@/lib/questions/scoring";
import { updateSkillEvidence } from "@/lib/student/mastery";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
export async function POST(request:Request){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB),{tenantId}=await learnerTenantContext(env.DB,session.childId),body=await request.json().catch(()=>({}))as Record<string,unknown>,questionId=String(body.questionId||""),setId=typeof body.setId==="string"?body.setId:"";
  if(!questionId)return Response.json({error:"questionId is required"},{status:400});
  const q=await env.DB.prepare("SELECT id,question_type,stem_json,answer_json,explanation_json,marks FROM questions WHERE id=? AND status='published' AND (scope='global' OR (scope='tenant' AND tenant_id=?))").bind(questionId,tenantId).first<QuestionRow>();
  if(!q)return Response.json({error:"Question not found"},{status:404});
  if(setId){
    const item=await env.DB.prepare("SELECT item_order FROM practice_set_items WHERE set_id=? AND question_id=?").bind(setId,questionId).first<{item_order:number}>();
    if(!item)return Response.json({error:"Question is not part of this Reading practice set"},{status:400});
    const blocked=await env.DB.prepare(`SELECT COUNT(*) blocked FROM practice_set_items i
      WHERE i.set_id=? AND i.item_order<?
        AND NOT EXISTS (SELECT 1 FROM question_attempts a WHERE a.child_id=? AND a.question_id=i.question_id AND a.is_correct=1)`).bind(setId,item.item_order,session.childId).first<{blocked:number}>();
    if(Number(blocked?.blocked||0)>0)return Response.json({error:"Answer the previous Reading question correctly before continuing"},{status:409});
  }
  const scored=scorePaper2Question(q,body.response),attemptId=`qattempt-${crypto.randomUUID()}`;
  await env.DB.prepare("INSERT INTO question_attempts (id,child_id,question_id,response_json,is_correct,score,max_score,feedback_json) VALUES (?,?,?,?,?,?,?,?)").bind(attemptId,session.childId,questionId,JSON.stringify(body.response??null),scored.correct?1:0,scored.score,scored.maxScore,JSON.stringify({feedback:scored.feedback})).run();
  const skills=await env.DB.prepare("SELECT skill_id FROM question_skills WHERE question_id=?").bind(questionId).all<{skill_id:string}>();for(const skill of skills.results)await updateSkillEvidence(env.DB,session.childId,skill.skill_id,Math.round(scored.ratio*100));
  await env.DB.prepare("INSERT INTO xp_ledger (id,child_id,event_type,points,reference_id) VALUES (?,?, 'paper2_question', ?, ?)").bind(`xp-${crypto.randomUUID()}`,session.childId,scored.correct?5:2,attemptId).run();
  const response=Response.json({ok:true,attemptId,...scored});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}
