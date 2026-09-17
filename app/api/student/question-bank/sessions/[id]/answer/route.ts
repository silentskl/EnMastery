import { resolveLearnerAiIntegrations } from "@/lib/settings/learner-runtime";
import { requireAuthenticatedLearner } from "@/lib/settings/learner-runtime";
import { learnerCookie } from "@/lib/student/session";
import { enqueueJob } from "@/lib/jobs/dispatch";
import { finaliseSpecialisedSession, scoreBankQuestion } from "@/lib/question-bank/session";
import { safeJson } from "@/lib/content/store";
import { updateSkillEvidence } from "@/lib/student/mastery";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {env,session,tenantId,quota}=await resolveLearnerAiIntegrations(request);const denied= requireAuthenticatedLearner(session);if(denied)return denied;
  const {id}=await params;
  const body=await request.json().catch(()=>({})) as Record<string,unknown>;
  const itemId=String(body.itemId||"");
  const responseBody=body.response??{};
  const specialised=await env.DB.prepare("SELECT id,mode,category FROM specialised_sessions WHERE id=? AND child_id=? AND status IN ('active','evaluating')")
    .bind(id,session.childId).first<{id:string;mode:"practice"|"exam";category:string}>();
  if(!specialised)return Response.json({error:"Active session not found"},{status:404});
  const item=await env.DB.prepare("SELECT id,question_id,question_type,stem_json,answer_json,explanation_json,marks,status FROM specialised_session_items WHERE id=? AND session_id=?")
    .bind(itemId,id).first<{id:string;question_id:string;question_type:string;stem_json:string;answer_json:string;explanation_json:string|null;marks:number;status:string}>();
  if(!item)return Response.json({error:"Question not found"},{status:404});
  if(item.status!=="pending"&&item.status!=="failed")return Response.json({error:"This item has already been submitted"},{status:409});

  if(specialised.category==="reading_comprehension"||specialised.category==="cloze"){
    const scored=scoreBankQuestion(item.answer_json,responseBody,item.stem_json),score=scored.ratio*item.marks,ex=safeJson<Record<string,unknown>>(item.explanation_json,{});
    const itemStatus=specialised.mode==="practice"&&!scored.correct?"failed":"completed";
    await env.DB.prepare("UPDATE specialised_session_items SET response_json=?,score=?,max_score=?,feedback_json=?,status=?,answered_at=CURRENT_TIMESTAMP,completed_at=CASE WHEN ?='completed' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id=?")
      .bind(JSON.stringify(responseBody),score,item.marks,JSON.stringify({correct:scored.correct,feedback:scored.feedback,explanation:String(ex.text||ex.explanation||"")}),itemStatus,itemStatus,itemId).run();
    const skillRows=await env.DB.prepare("SELECT skill_id FROM question_skills WHERE question_id=?").bind(item.question_id).all<{skill_id:string}>();
    for(const sk of skillRows.results)await updateSkillEvidence(env.DB,session.childId,sk.skill_id,scored.ratio*100);
    await finaliseSpecialisedSession(env.DB,id);
    const out=Response.json({ok:true,status:itemStatus,...(specialised.mode==="practice"?{score,maxScore:item.marks,correct:scored.correct,feedback:scored.feedback,explanation:String(ex.text||ex.explanation||"")}:{})});
    if(session.isNew)out.headers.set("Set-Cookie",learnerCookie(session.sessionId));return out;
  }

  if(!quota.allowed)return Response.json({error:"This organisation has reached its monthly AI request quota"},{status:429});
  const text=typeof (responseBody as {text?:unknown})?.text==="string"?(responseBody as {text:string}).text.trim():"";
  if(text.length<20)return Response.json({error:specialised.category==="oral"?"Record or enter a fuller spoken response before submitting.":"Write a fuller response before submitting."},{status:400});
  if(!env.MODELBRIDGE_API_KEY||!env.MODELBRIDGE_CHAT_MODEL)return Response.json({error:"Your organisation has not configured ModelBridge"},{status:503});
  await env.DB.prepare("UPDATE specialised_session_items SET response_json=?,status='evaluating',answered_at=CURRENT_TIMESTAMP WHERE id=?").bind(JSON.stringify({text}),itemId).run();
  await env.DB.prepare("UPDATE specialised_sessions SET status='evaluating' WHERE id=?").bind(id).run();
  const profile=await env.DB.prepare("SELECT school_level FROM child_profiles WHERE id=?").bind(session.childId).first<{school_level:string}>();
  const stem=safeJson<Record<string,unknown>>(item.stem_json,{}),jobType=specialised.category==="oral"?"specialised_oral_eval":"specialised_writing_eval";
  const jobId=await enqueueJob(env.DB,env,{jobType,entityType:"specialised_item",entityId:itemId,tenantId,createdBy:session.childId,request:{sessionId:id,itemId,childId:session.childId,mode:specialised.mode,questionId:item.question_id,questionType:item.question_type,schoolLevel:profile?.school_level==="P5"?"P5":"P6",prompt:String(stem.prompt||""),referenceText:String(stem.referenceText||""),writingType:String(stem.writingType||"continuous"),text,marks:item.marks}});
  await env.DB.prepare("UPDATE specialised_session_items SET generation_job_id=? WHERE id=?").bind(jobId,itemId).run();
  const out=Response.json({ok:true,status:"evaluating",jobId},{status:202});if(session.isNew)out.headers.set("Set-Cookie",learnerCookie(session.sessionId));return out;
}
