import { resolveLearnerAiIntegrations, requireAuthenticatedLearner } from "@/lib/settings/learner-runtime";
import { learnerCookie } from "@/lib/student/session";
import { recordTenantAiUsage } from "@/lib/tenant/usage";
import { nextRoleplayReply, assessRoleplay, type RoleplayLine } from "@/lib/roleplay/engine";
import { findRoleplayScenario, type RoleplayLevel, type RoleplayScenario } from "@/lib/roleplay/scenarios";
import { conversationOverallScore } from "@/lib/student/speaking-daily";

type StoredSession={id:string;mode:string;prompt_title:string|null;prompt_text:string;status:string;turn_count:number};
type Turn={speaker:"learner"|"assistant";transcript:string|null;reply_text:string|null};
const MAX_TURNS=40;
function getDifficulty(value:unknown):RoleplayLevel{
  return value==="beginner"||value==="challenge"?value:"standard";
}
function replyJson(value:Record<string,unknown>,sessionCookie?:string){
  const response=Response.json(value);
  response.headers.set("Cache-Control","private, no-store");
  if(sessionCookie)response.headers.set("Set-Cookie",learnerCookie(sessionCookie));
  return response;
}
async function loadSession(db:D1Database,childId:string,id:string){
  const session=await db.prepare("SELECT id,mode,prompt_title,prompt_text,status,turn_count FROM speaking_sessions WHERE child_id=? AND id=?").bind(childId,id).first<StoredSession>();
  if(!session||session.mode!=="conversation"||!session.id.startsWith("roleplay-"))return null;
  let options:{sceneId?:string;level?:RoleplayLevel}={};
  try{options=JSON.parse(session.prompt_text) as typeof options}catch{}
  const scenario=options.sceneId===session.prompt_title?findRoleplayScenario(options.sceneId||""):null;
  if(!scenario)return null;
  return {session,scenario,level:getDifficulty(options.level)};
}
async function historyFor(db:D1Database,id:string):Promise<RoleplayLine[]>{
  const rows=await db.prepare(
    "SELECT speaker,transcript,reply_text FROM speaking_turns WHERE session_id=? ORDER BY rowid ASC LIMIT 100"
  ).bind(id).all<Turn>();
  return rows.results.map(row=>({speaker:row.speaker,text:(row.speaker==="learner"?row.transcript:row.reply_text)||""}));
}
export async function POST(request:Request){
  const {env,session,tenantId,quota}=await resolveLearnerAiIntegrations(request);
  const denied=requireAuthenticatedLearner(session);
  if(denied)return denied;
  const input=await request.json().catch(()=>({})) as Record<string,unknown>;
  const action=typeof input.action==="string"?input.action:"";
  if(!["start","reply","finish"].includes(action))return Response.json({error:"Unknown role-play action"},{status:400});
  if(!env.MODELBRIDGE_API_KEY||!env.MODELBRIDGE_CHAT_MODEL)return Response.json({error:"Your organisation needs a configured ModelBridge chat model"},{status:503});
  if(!quota.allowed)return Response.json({error:"Your organisation has reached its monthly AI request quota"},{status:429});
  const cookie=session.isNew?session.sessionId:undefined;

  if(action==="start"){
    const scenarioId=typeof input.scenarioId==="string"?input.scenarioId:"";
    const scenario=findRoleplayScenario(scenarioId);
    if(!scenario)return Response.json({error:"Please select a valid practice scenario"},{status:400});
    const level=getDifficulty(input.level),sessionId="roleplay-"+crypto.randomUUID();
    const promptText=JSON.stringify({sceneId:scenario.id,level});
    const turnId="turn-"+crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO speaking_sessions (id,child_id,mode,prompt_title,prompt_text,status) VALUES (?,?,'conversation',?,?,'active')")
        .bind(sessionId,session.childId,scenario.id,promptText),
      env.DB.prepare("INSERT INTO speaking_turns (id,session_id,child_id,speaker,reply_text) VALUES (?,?,?,'assistant',?)")
        .bind(turnId,sessionId,session.childId,scenario.openingLine),
    ]);
    return replyJson({sessionId,scenarioId,level,reply:scenario.openingLine,role:scenario.aiRole,turnCount:0,completed:false},cookie);
  }

  const sessionId=typeof input.sessionId==="string"?input.sessionId.trim().slice(0,140):"";
  if(!sessionId)return Response.json({error:"A conversation session is required"},{status:400});
  const loaded=await loadSession(env.DB,session.childId,sessionId);
  if(!loaded)return Response.json({error:"This conversation does not belong to the logged-in student"},{status:404});
  const {scenario,level}=loaded;
  if(loaded.session.status!=="active")return Response.json({error:"The role-play has already ended"},{status:409});
  const turnCount=Number(loaded.session.turn_count);
  if(turnCount<0||turnCount>MAX_TURNS)return Response.json({error:"The conversation is not ready for a new turn"},{status:409});
  const currentHistory=await historyFor(env.DB,sessionId);
  const priorLearnerTurns=currentHistory.filter(h=>h.speaker==="learner").length;
  if(priorLearnerTurns!==turnCount)return Response.json({error:"Another reply is still processing; please retry in a moment"},{status:409});

  if(action==="finish"){
    if(turnCount===0)return Response.json({error:"Speak to the role-play partner at least once before requesting feedback"},{status:400});
    try{
      const feedback=await assessRoleplay({
        baseUrl:env.MODELBRIDGE_BASE_URL,apiKey:env.MODELBRIDGE_API_KEY,
        model:env.MODELBRIDGE_CHAT_MODEL,scenario,level,history:currentHistory,
      });
      const score=conversationOverallScore(feedback);
      const changed=await env.DB.prepare(
        "UPDATE speaking_sessions SET status='completed',overall_score=?,feedback_json=?,completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP "+
        "WHERE id=? AND child_id=? AND status='active' AND turn_count=? AND "+
        "(SELECT COUNT(*) FROM speaking_turns WHERE session_id=? AND speaker='learner')=?"
      ).bind(score,JSON.stringify(feedback),sessionId,session.childId,turnCount,sessionId,turnCount).run();
      if(Number(changed.meta?.changes||0)!==1)return Response.json({error:"The conversation changed while feedback was being generated. Please retry."},{status:409});
      await recordTenantAiUsage(env.DB,{tenantId,childId:session.childId,purpose:"roleplay_feedback",model:env.MODELBRIDGE_CHAT_MODEL}).catch(()=>undefined);
      return replyJson({sessionId,completed:true,turnCount,feedback,overallScore:score},cookie);
    }catch(err){
      await recordTenantAiUsage(env.DB,{tenantId,childId:session.childId,purpose:"roleplay_feedback",model:env.MODELBRIDGE_CHAT_MODEL,status:"failed"}).catch(()=>undefined);
      return Response.json({error:err instanceof Error?err.message:"Role-play feedback temporarily unavailable"},{status:502});
    }
  }

  const transcript=typeof input.transcript==="string"?input.transcript.trim().slice(0,2400):"";
  if(!transcript)return Response.json({error:"A spoken or typed answer is required"},{status:400});
  if(turnCount>=MAX_TURNS)return Response.json({error:"Maximum practice length reached. End the session for feedback, or start a new one."},{status:409});

  // Claim the conversation index before an expensive model request.
  const claimed=await env.DB.prepare(
    "UPDATE speaking_sessions SET turn_count=turn_count+1,updated_at=CURRENT_TIMESTAMP "+
    "WHERE id=? AND child_id=? AND status='active' AND turn_count=? AND "+
    "(SELECT COUNT(*) FROM speaking_turns WHERE session_id=? AND speaker='learner')=?"
  ).bind(sessionId,session.childId,turnCount,sessionId,turnCount).run();
  if(Number(claimed.meta?.changes||0)!==1)return Response.json({error:"Another conversation request is in progress. Please retry."},{status:409});
  let persisted=false;
  try{
    const next=await nextRoleplayReply({
      baseUrl:env.MODELBRIDGE_BASE_URL,apiKey:env.MODELBRIDGE_API_KEY,model:env.MODELBRIDGE_CHAT_MODEL,
      scenario,level,transcript,history:currentHistory,turn:turnCount+1,
    });
    await env.DB.batch([
      env.DB.prepare("INSERT INTO speaking_turns (id,session_id,child_id,speaker,transcript) VALUES (?,?,?,'learner',?)")
        .bind("turn-"+crypto.randomUUID(),sessionId,session.childId,transcript),
      env.DB.prepare("INSERT INTO speaking_turns (id,session_id,child_id,speaker,reply_text) VALUES (?,?,?,'assistant',?)")
        .bind("turn-"+crypto.randomUUID(),sessionId,session.childId,next.reply),
    ]);
    persisted=true;
    await recordTenantAiUsage(env.DB,{tenantId,childId:session.childId,purpose:"roleplay_dialogue",model:env.MODELBRIDGE_CHAT_MODEL}).catch(()=>undefined);
    return replyJson({sessionId,reply:next.reply,role:scenario.aiRole,turnCount:turnCount+1,completed:false},cookie);
  }catch(err){
    if(!persisted){
      await env.DB.prepare(
        "UPDATE speaking_sessions SET turn_count=? WHERE id=? AND child_id=? AND status='active' AND turn_count=?"
      ).bind(turnCount,sessionId,session.childId,turnCount+1).run().catch(()=>undefined);
    }
    await recordTenantAiUsage(env.DB,{tenantId,childId:session.childId,purpose:"roleplay_dialogue",model:env.MODELBRIDGE_CHAT_MODEL,status:"failed"}).catch(()=>undefined);
    return Response.json({error:err instanceof Error?err.message:"The AI role-play partner is temporarily unavailable"},{status:502});
  }
}
