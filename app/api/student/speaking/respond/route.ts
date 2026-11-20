import { resolveLearnerAiIntegrations, requireAuthenticatedLearner } from "@/lib/settings/learner-runtime";
import { learnerCookie } from "@/lib/student/session";
import { evaluatePsleConversationTurn, PSLE_CONVERSATION_QUESTION_COUNT } from "@/lib/speaking/evaluate";
import { updateSkillEvidence } from "@/lib/student/mastery";
import { conversationOverallScore, recordDailySpeakingModeScore } from "@/lib/student/speaking-daily";
import { recordTenantAiUsage } from "@/lib/tenant/usage";
import { sgDate } from "@/lib/student/tasks";
import type { ConversationFeedback } from "@/lib/speaking/types";

type Session={id:string;mode:string;prompt_title:string|null;prompt_text:string;status:string;turn_count:number};
type TurnRow={speaker:"learner"|"assistant";transcript:string|null;reply_text:string|null;evaluation_json:string|null};
const feedbackKeys=["relevance","development","grammar","vocabulary","interaction"] as const;

/** Five learner turns: description, then four distinct answers to AI questions. */
export async function POST(request:Request){
  const {env,session,tenantId,quota}=await resolveLearnerAiIntegrations(request);
  const denied=requireAuthenticatedLearner(session);
  if(denied)return denied;
  if(!quota.allowed)return Response.json({error:"Monthly AI request quota reached"},{status:429});
  if(!env.MODELBRIDGE_API_KEY||!env.MODELBRIDGE_CHAT_MODEL)return Response.json({error:"AI conversation is not configured for this organisation"},{status:503});

  const body=await request.json().catch(()=>({})) as Record<string,unknown>;
  const promptId=typeof body.promptId==="string"?body.promptId.trim().slice(0,200):"";
  const transcript=typeof body.transcript==="string"?body.transcript.trim().slice(0,3000):"";
  const previousId=typeof body.sessionId==="string"?body.sessionId.trim().slice(0,150):"";
  if(!promptId||!transcript)return Response.json({error:"Oral task and spoken answer are required"},{status:400});
  if(body.mode!=="stimulus"||body.track==="pet")return Response.json({error:"Only PSLE picture conversation is supported"},{status:400});

  // Authoritative task: the student cannot supply a substitute image, prompt or history.
  const assignment=await env.DB.prepare(
    "SELECT v.body_json FROM speaking_daily_prompt_assignments a "+
    "JOIN content_items c ON c.id=a.prompt_id "+
    "JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version "+
    "WHERE a.child_id=? AND a.task_date=? AND a.mode='stimulus' AND a.prompt_id=? "+
    "AND c.status='published' AND c.content_type='oral_prompt' "+
    "AND (c.scope='global' OR (c.scope='tenant' AND c.tenant_id=?)) "+
    "AND json_extract(v.body_json,'$.mode')='stimulus' "+
    "AND COALESCE(json_extract(v.body_json,'$.examTrack'),'')<>'PET' LIMIT 1"
  ).bind(session.childId,sgDate(),promptId,tenantId).first<{body_json:string}>();
  if(!assignment)return Response.json({error:"This picture conversation is not assigned to your account today"},{status:403});
  let prompt="",sceneDescription="",pictureUrl="";
  try{
    const data=JSON.parse(assignment.body_json) as {prompt?:unknown;stimulusAlt?:unknown;stimulusImageUrl?:unknown};
    prompt=typeof data.prompt==="string"?data.prompt.trim().slice(0,1800):"";
    sceneDescription=typeof data.stimulusAlt==="string"?data.stimulusAlt.trim().slice(0,1200):"";
    pictureUrl=typeof data.stimulusImageUrl==="string"?data.stimulusImageUrl.trim():"";
  }catch{}
  if(!prompt||!pictureUrl)return Response.json({error:"This oral task has no picture. Ask your teacher to publish a photograph-backed prompt."},{status:422});

  let sessionId=previousId;
  if(!sessionId){
    sessionId="speak-"+crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO speaking_sessions (id,child_id,mode,prompt_title,prompt_text,status) VALUES (?,?, 'stimulus',?,?,'active')"
    ).bind(sessionId,session.childId,promptId,prompt).run();
  }
  const active=await env.DB.prepare(
    "SELECT id,mode,prompt_title,prompt_text,status,turn_count FROM speaking_sessions WHERE id=? AND child_id=?"
  ).bind(sessionId,session.childId).first<Session>();
  if(!active||active.mode!=="stimulus"||active.prompt_title!==promptId||active.prompt_text!==prompt)return Response.json({error:"Conversation session does not match this picture"},{status:403});
  if(active.status==="completed")return Response.json({error:"This conversation is complete. Start a new practice session."},{status:409});
  const index=Number(active.turn_count);
  if(index<0||index>PSLE_CONVERSATION_QUESTION_COUNT)return Response.json({error:"Conversation has already reached the maximum rounds"},{status:409});

  // Atomic optimistic claim: next turn cannot start while the previous AI answer is still being generated.
  const claim=await env.DB.prepare(
    "UPDATE speaking_sessions SET turn_count=turn_count+1,updated_at=CURRENT_TIMESTAMP "+
    "WHERE id=? AND child_id=? AND status='active' AND turn_count=? "+
    "AND (SELECT COUNT(*) FROM speaking_turns WHERE session_id=? AND speaker='learner')=?"
  ).bind(sessionId,session.childId,index,sessionId,index).run();
  if(Number(claim.meta?.changes||0)!==1)return Response.json({error:"Previous turn is still processing; please retry"},{status:409});

  let stored=false;
  try{
    const rows=await env.DB.prepare(
      "SELECT speaker,transcript,reply_text,evaluation_json FROM speaking_turns WHERE session_id=? ORDER BY rowid ASC"
    ).bind(sessionId).all<TurnRow>();
    const prior=rows.results;
    if(prior.filter(r=>r.speaker==="learner").length!==index)throw new Error("Conversation turns are out of sync");
    const history=prior.map(row=>({
      role:row.speaker==="learner"?"user" as const:"assistant" as const,
      content:(row.speaker==="learner"?row.transcript:row.reply_text)||"",
    }));
    const evaluation=await evaluatePsleConversationTurn({
      baseUrl:env.MODELBRIDGE_BASE_URL,apiKey:env.MODELBRIDGE_API_KEY,model:env.MODELBRIDGE_CHAT_MODEL,
      prompt,sceneDescription,transcript,turnIndex:index,history,
    });
    const completed=evaluation.completed;
    let feedback:ConversationFeedback=evaluation;
    let overallScore:number|undefined;
    if(completed){
      const all=[...prior.filter(row=>row.speaker==="learner").flatMap(row=>{
        try{return row.evaluation_json?[JSON.parse(row.evaluation_json) as ConversationFeedback]:[]}catch{return[]}
      }),evaluation];
      const averages=Object.fromEntries(feedbackKeys.map(k=>[k,Math.round(all.reduce((n,item)=>n+Number(item[k]||0),0)/all.length)])) as Record<typeof feedbackKeys[number],number>;
      feedback={...evaluation,...averages};
      overallScore=conversationOverallScore(feedback);
    }

    const learnerTurn="turn-"+crypto.randomUUID(),examinerTurn="turn-"+crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO speaking_turns (id,session_id,child_id,speaker,transcript,evaluation_json) VALUES (?,?,?,'learner',?,?)")
        .bind(learnerTurn,sessionId,session.childId,transcript,JSON.stringify(evaluation)),
      env.DB.prepare("INSERT INTO speaking_turns (id,session_id,child_id,speaker,reply_text) VALUES (?,?,?,'assistant',?)")
        .bind(examinerTurn,sessionId,session.childId,evaluation.reply),
      env.DB.prepare(
        "UPDATE speaking_sessions SET status=?,overall_score=?,feedback_json=?,completed_at=CASE WHEN ?=1 THEN CURRENT_TIMESTAMP ELSE NULL END,updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(completed?"completed":"active",overallScore??null,completed?JSON.stringify(feedback):null,completed?1:0,sessionId),
    ]);
    stored=true;

    let dailySpeaking;
    if(completed){
      try{
        await updateSkillEvidence(env.DB,session.childId,"S-SBC-IDEA",Math.round((feedback.relevance+feedback.development)/2));
        await updateSkillEvidence(env.DB,session.childId,"S-INTERACT",feedback.interaction);
        dailySpeaking=await recordDailySpeakingModeScore(env.DB,{childId:session.childId,mode:"stimulus",promptId,score:overallScore??0});
      }catch(err){console.error("[psle-conversation] completion metrics update failed",err)}
    }
    await recordTenantAiUsage(env.DB,{tenantId,childId:session.childId,purpose:"psle_stimulus_conversation",model:env.MODELBRIDGE_CHAT_MODEL}).catch(()=>undefined);
    const response=Response.json({
      sessionId,feedback,phase:completed?"completed":"questions",
      questionNumber:Math.min(index+1,PSLE_CONVERSATION_QUESTION_COUNT),
      questionTotal:PSLE_CONVERSATION_QUESTION_COUNT,
      completed,overallScore,dailySpeaking,
    });
    response.headers.set("Cache-Control","private, no-store");
    if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));
    return response;
  }catch(err){
    if(!stored){
      await env.DB.prepare(
        "UPDATE speaking_sessions SET turn_count=? WHERE id=? AND child_id=? AND status='active' AND turn_count=?"
      ).bind(index,sessionId,session.childId,index+1).run().catch(()=>undefined);
    }
    await recordTenantAiUsage(env.DB,{tenantId,childId:session.childId,purpose:"psle_stimulus_conversation",model:env.MODELBRIDGE_CHAT_MODEL,status:"failed"}).catch(()=>undefined);
    return Response.json({error:err instanceof Error?err.message:"AI examiner is temporarily unavailable"},{status:502});
  }
}
