import { resolveLearnerAiIntegrations, requireAuthenticatedLearner } from "@/lib/settings/learner-runtime";
import { learnerCookie } from "@/lib/student/session";
import { recordTenantAiUsage } from "@/lib/tenant/usage";
import { nextRoleplayReply, assessRoleplay, type RoleplayLine } from "@/lib/roleplay/engine";
import { findRoleplayScenario, type RoleplayLevel } from "@/lib/roleplay/scenarios";
import { conversationOverallScore } from "@/lib/student/speaking-daily";
import { recordDailyGoalEvent } from "@/lib/student/daily-goal";
import { PSLE_ORAL_PASS_MARK } from "@/lib/speaking/psle-oral";
import type { ConversationFeedback } from "@/lib/speaking/types";

type Phase="first"|"rehearsal"|"ready_final"|"final"|"passed";
type PracticeState={
  phase:Phase;
  cycle:number;
  phaseStartLine:number;
  rehearsalIndex:number;
  script:RoleplayLine[];
  improvedLines:string[];
  baselineScore?:number;
};
type StoredSession={
  id:string;mode:string;prompt_title:string|null;prompt_text:string;
  status:string;turn_count:number;feedback_json:string|null;
};
type Turn={speaker:"learner"|"assistant";transcript:string|null;reply_text:string|null};
const MAX_TOTAL_TURNS=400;
const MAX_STAGE_TURNS=20;
function getDifficulty(value:unknown):RoleplayLevel {
  return value==="beginner"||value==="challenge"?value:"standard";
}
function emptyState():PracticeState {
  return {phase:"first",cycle:1,phaseStartLine:0,rehearsalIndex:0,script:[],improvedLines:[]};
}
function readState(raw:string|null):PracticeState {
  try {
    const item=JSON.parse(raw||"null") as Partial<PracticeState>|null;
    if(item && ["first","rehearsal","ready_final","final","passed"].includes(item.phase||"")
      && Number.isInteger(item.cycle)&&Number.isInteger(item.phaseStartLine)
      && Number.isInteger(item.rehearsalIndex)&&Array.isArray(item.script)&&Array.isArray(item.improvedLines)){
      return item as PracticeState;
    }
  }catch{}
  return emptyState();
}
function replyJson(value:Record<string,unknown>,sessionCookie?:string) {
  const response=Response.json(value);
  response.headers.set("Cache-Control","private, no-store");
  if(sessionCookie)response.headers.set("Set-Cookie",learnerCookie(sessionCookie));
  return response;
}
async function loadSession(db:D1Database,childId:string,id:string){
  const session=await db.prepare(
    "SELECT id,mode,prompt_title,prompt_text,status,turn_count,feedback_json FROM speaking_sessions WHERE child_id=? AND id=?"
  ).bind(childId,id).first<StoredSession>();
  if(!session||session.mode!=="conversation"||!session.id.startsWith("roleplay-"))return null;
  let options:{sceneId?:string;level?:RoleplayLevel}={};
  try{options=JSON.parse(session.prompt_text) as typeof options}catch{}
  const scenario=options.sceneId===session.prompt_title?findRoleplayScenario(options.sceneId||""):null;
  if(!scenario)return null;
  return {session,scenario,level:getDifficulty(options.level),state:readState(session.feedback_json)};
}
async function historyFor(db:D1Database,id:string):Promise<RoleplayLine[]> {
  const rows=await db.prepare(
    "SELECT speaker,transcript,reply_text FROM speaking_turns WHERE session_id=? ORDER BY rowid ASC LIMIT 1000"
  ).bind(id).all<Turn>();
  return rows.results.map(row=>({speaker:row.speaker,text:(row.speaker==="learner"?row.transcript:row.reply_text)||""}));
}
function transcriptMatch(expected:string,actual:string):boolean {
  const words=(v:string)=>v.toLowerCase().replace(/[^a-z0-9' ]/g," ").split(/\s+/).filter(Boolean);
  const target=words(expected),heard=words(actual);
  if(target.length===0||heard.length===0||heard.length<Math.max(2,target.length*.55))return false;
  const counts=new Map<string,number>();
  for(const word of target)counts.set(word,(counts.get(word)||0)+1);
  let matched=0;
  for(const word of heard){
    const available=counts.get(word)||0;
    if(available>0){matched++;counts.set(word,available-1)}
  }
  return matched/target.length>=.6;
}
async function changePhase(db:D1Database,args:{
  childId:string;session:StoredSession;state:PracticeState;
  status?:string;score?:number;appendOpening?:string;
}):Promise<boolean>{
  const {childId,session,state}=args;
  const changed=await db.prepare(
    "UPDATE speaking_sessions SET status=?,overall_score=?,feedback_json=?,completed_at=CASE WHEN ?='completed' THEN CURRENT_TIMESTAMP ELSE NULL END,updated_at=CURRENT_TIMESTAMP "+
    "WHERE id=? AND child_id=? AND status='active' AND turn_count=? AND COALESCE(feedback_json,'')=COALESCE(?,'') "+
    "AND (SELECT COUNT(*) FROM speaking_turns WHERE session_id=? AND speaker='learner')=?"
  ).bind(args.status||"active",args.score??null,JSON.stringify(state),args.status||"active",session.id,childId,session.turn_count,session.feedback_json,session.id,session.turn_count).run();
  if(Number(changed.meta?.changes||0)!==1)return false;
  if(args.appendOpening){
    await db.prepare("INSERT INTO speaking_turns (id,session_id,child_id,speaker,reply_text) VALUES (?,?,?,'assistant',?)")
      .bind("turn-"+crypto.randomUUID(),session.id,childId,args.appendOpening).run();
  }
  return true;
}

export async function POST(request:Request){
  const {env,session,tenantId,quota}=await resolveLearnerAiIntegrations(request);
  const denied=requireAuthenticatedLearner(session);
  if(denied)return denied;
  const input=await request.json().catch(()=>({})) as Record<string,unknown>;
  const action=typeof input.action==="string"?input.action:"";
  if(!["start","reply","finish","rehearse","begin_final"].includes(action))
    return Response.json({error:"Unknown role-play action"},{status:400});
  const requiresAi=action==="start"||action==="reply"||action==="finish";
  if(requiresAi&&(!env.MODELBRIDGE_API_KEY||!env.MODELBRIDGE_CHAT_MODEL))
    return Response.json({error:"Your organisation needs a configured ModelBridge chat model"},{status:503});
  if(requiresAi&&!quota.allowed)
    return Response.json({error:"Your organisation has reached its monthly AI request quota"},{status:429});
  const cookie=session.isNew?session.sessionId:undefined;

  if(action==="start"){
    const scenarioId=typeof input.scenarioId==="string"?input.scenarioId:"";
    const scenario=findRoleplayScenario(scenarioId);
    if(!scenario)return Response.json({error:"Please select a valid practice scenario"},{status:400});
    const level=getDifficulty(input.level),sessionId="roleplay-"+crypto.randomUUID();
    const promptText=JSON.stringify({sceneId:scenario.id,level});
    await env.DB.batch([
      env.DB.prepare("INSERT INTO speaking_sessions (id,child_id,mode,prompt_title,prompt_text,status,feedback_json) VALUES (?,?,'conversation',?,?,'active',?)")
        .bind(sessionId,session.childId,scenario.id,promptText,JSON.stringify(emptyState())),
      env.DB.prepare("INSERT INTO speaking_turns (id,session_id,child_id,speaker,reply_text) VALUES (?,?,?,'assistant',?)")
        .bind("turn-"+crypto.randomUUID(),sessionId,session.childId,scenario.openingLine),
    ]);
    return replyJson({sessionId,scenarioId,level,phase:"first",cycle:1,reply:scenario.openingLine,role:scenario.aiRole,turnCount:0,completed:false},cookie);
  }

  const sessionId=typeof input.sessionId==="string"?input.sessionId.trim().slice(0,140):"";
  if(!sessionId)return Response.json({error:"A role-play session is required"},{status:400});
  const loaded=await loadSession(env.DB,session.childId,sessionId);
  if(!loaded)return Response.json({error:"This conversation does not belong to the logged-in student"},{status:404});
  const {scenario,level,state}=loaded;
  if(loaded.session.status!=="active")return Response.json({error:"The role-play has already passed"},{status:409});
  const turnCount=Number(loaded.session.turn_count);
  if(turnCount<0||turnCount>=MAX_TOTAL_TURNS)return Response.json({error:"Maximum practice length reached. Start a fresh role-play."},{status:409});
  const currentHistory=await historyFor(env.DB,sessionId);
  const priorLearnerTurns=currentHistory.filter(h=>h.speaker==="learner").length;
  if(priorLearnerTurns!==turnCount)return Response.json({error:"Another reply is still processing; please retry"},{status:409});
  const stageHistory=currentHistory.slice(state.phaseStartLine);
  const stageTurnCount=stageHistory.filter(h=>h.speaker==="learner").length;

  if(action==="begin_final"){
    if(state.phase!=="ready_final")return Response.json({error:"Read all of the improved replies before starting round three"},{status:409});
    const next:PracticeState={...state,phase:"final",phaseStartLine:currentHistory.length};
    if(!await changePhase(env.DB,{childId:session.childId,session:loaded.session,state:next,appendOpening:scenario.openingLine}))
      return Response.json({error:"The role-play changed; please retry"},{status:409});
    return replyJson({sessionId,phase:"final",cycle:state.cycle,reply:scenario.openingLine,turnCount:0},cookie);
  }

  if(action==="finish"){
    if(!["first","final"].includes(state.phase))return Response.json({error:"Complete the guided reading before finishing this round"},{status:409});
    if(stageTurnCount===0)return Response.json({error:"Speak to your partner at least once before requesting feedback"},{status:400});
    try{
      const feedback=await assessRoleplay({
        baseUrl:env.MODELBRIDGE_BASE_URL,apiKey:env.MODELBRIDGE_API_KEY,
        model:env.MODELBRIDGE_CHAT_MODEL,scenario,level,history:stageHistory,
      });
      const score=conversationOverallScore(feedback);
      if(state.phase==="first"){
        let position=0;
        const script:RoleplayLine[]=stageHistory.map(line=>
          line.speaker==="learner"?{speaker:"learner",text:feedback.improvedLines[position++]}:line);
        if(script[0]?.speaker!=="assistant"||position!==feedback.improvedLines.length)
          throw new Error("Cannot construct the improved role-play replay");
        const next:PracticeState={...state,phase:"rehearsal",script,improvedLines:feedback.improvedLines,rehearsalIndex:0,baselineScore:score};
        if(!await changePhase(env.DB,{childId:session.childId,session:loaded.session,state:next,score}))
          return Response.json({error:"The role-play changed while coaching was generated. Please retry."},{status:409});
        await recordTenantAiUsage(env.DB,{tenantId,childId:session.childId,purpose:"roleplay_feedback",model:env.MODELBRIDGE_CHAT_MODEL}).catch(()=>undefined);
        return replyJson({
          sessionId,phase:"rehearsal",cycle:state.cycle,completed:false,passed:false,
          feedback,overallScore:score,reply:script[0].text,
          rehearsalIndex:0,rehearsalTotal:feedback.improvedLines.length,
          rehearsalLine:feedback.improvedLines[0],
        },cookie);
      }
      const passed=score>=PSLE_ORAL_PASS_MARK;
      const next:PracticeState=passed
        ? {...state,phase:"passed"}
        : {...emptyState(),cycle:state.cycle+1,phaseStartLine:currentHistory.length};
      if(!await changePhase(env.DB,{
        childId:session.childId,session:loaded.session,state:next,
        status:passed?"completed":"active",score,appendOpening:passed?undefined:scenario.openingLine,
      }))return Response.json({error:"The role-play changed during scoring; please retry."},{status:409});
      if(passed)await recordDailyGoalEvent(env.DB,session.childId,"roleplay",sessionId);
      await recordTenantAiUsage(env.DB,{tenantId,childId:session.childId,purpose:"roleplay_feedback",model:env.MODELBRIDGE_CHAT_MODEL}).catch(()=>undefined);
      return replyJson({
        sessionId,phase:next.phase,cycle:next.cycle,completed:passed,passed,
        feedback,overallScore:score,passMark:PSLE_ORAL_PASS_MARK,
        reply:passed?feedback.reply:scenario.openingLine,turnCount:0,
      },cookie);
    }catch(err){
      await recordTenantAiUsage(env.DB,{tenantId,childId:session.childId,purpose:"roleplay_feedback",model:env.MODELBRIDGE_CHAT_MODEL,status:"failed"}).catch(()=>undefined);
      return Response.json({error:err instanceof Error?err.message:"Role-play feedback temporarily unavailable"},{status:502});
    }
  }

  const transcript=typeof input.transcript==="string"?input.transcript.trim().slice(0,2400):"";
  if(!transcript)return Response.json({error:"A spoken answer is required"},{status:400});
  if(action==="rehearse"&&state.phase!=="rehearsal")
    return Response.json({error:"Guided replay is not active"},{status:409});
  if(action==="reply"&&state.phase!=="first"&&state.phase!=="final")
    return Response.json({error:"Read the improved dialogue before continuing free conversation"},{status:409});
  if(action==="reply"&&stageTurnCount>=MAX_STAGE_TURNS)
    return Response.json({error:"This round reached 20 replies; request feedback before continuing"},{status:409});

  if(action==="rehearse"){
    const expected=state.improvedLines[state.rehearsalIndex];
    if(!expected)return Response.json({error:"The guided script is already complete"},{status:409});
    if(!transcriptMatch(expected,transcript))
      return Response.json({error:"Please read the displayed improved sentence aloud more completely before continuing."},{status:422});
  }
  // Concurrent speech submissions cannot claim the same turn or replay the
  // same improved line. Each rehearsal claim is just as strict as free chat.
  const claimed=await env.DB.prepare(
    "UPDATE speaking_sessions SET turn_count=turn_count+1,updated_at=CURRENT_TIMESTAMP "+
    "WHERE id=? AND child_id=? AND status='active' AND turn_count=? "+
    "AND (SELECT COUNT(*) FROM speaking_turns WHERE session_id=? AND speaker='learner')=?"
  ).bind(sessionId,session.childId,turnCount,sessionId,turnCount).run();
  if(Number(claimed.meta?.changes||0)!==1)return Response.json({error:"Another conversation request is in progress. Please retry."},{status:409});

  let persisted=false;
  try{
    let reply:string;
    let nextState=state;
    if(action==="rehearse"){
      const nextIndex=state.rehearsalIndex+1;
      const remaining=nextIndex<state.improvedLines.length;
      // Each AI character line from round one is replayed verbatim, without
      // spending extra AI calls or secretly supplying the student's reply.
      const learnerPosition=state.script.findIndex((line,i)=>line.speaker==="learner" &&
        state.script.slice(0,i+1).filter(part=>part.speaker==="learner").length===nextIndex);
      reply=state.script.slice(learnerPosition+1).find(line=>line.speaker==="assistant")?.text||"Thank you.";
      nextState={...state,rehearsalIndex:nextIndex,phase:remaining?"rehearsal":"ready_final"};
    }else{
      const next=await nextRoleplayReply({
        baseUrl:env.MODELBRIDGE_BASE_URL,apiKey:env.MODELBRIDGE_API_KEY,model:env.MODELBRIDGE_CHAT_MODEL,
        scenario,level,transcript,history:stageHistory,turn:stageTurnCount+1,
      });
      reply=next.reply;
    }
    await env.DB.batch([
      env.DB.prepare("INSERT INTO speaking_turns (id,session_id,child_id,speaker,transcript) VALUES (?,?,?,'learner',?)")
        .bind("turn-"+crypto.randomUUID(),sessionId,session.childId,transcript),
      env.DB.prepare("INSERT INTO speaking_turns (id,session_id,child_id,speaker,reply_text) VALUES (?,?,?,'assistant',?)")
        .bind("turn-"+crypto.randomUUID(),sessionId,session.childId,reply),
      env.DB.prepare("UPDATE speaking_sessions SET feedback_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND child_id=? AND turn_count=?")
        .bind(JSON.stringify(nextState),sessionId,session.childId,turnCount+1),
    ]);
    persisted=true;
    if(action==="reply")
      await recordTenantAiUsage(env.DB,{tenantId,childId:session.childId,purpose:"roleplay_dialogue",model:env.MODELBRIDGE_CHAT_MODEL}).catch(()=>undefined);
    return replyJson({
      sessionId,phase:nextState.phase,cycle:nextState.cycle,reply,role:scenario.aiRole,
      turnCount:action==="reply"?stageTurnCount+1:0,completed:false,
      rehearsalIndex:nextState.rehearsalIndex,
      rehearsalTotal:nextState.improvedLines.length,
      rehearsalLine:nextState.improvedLines[nextState.rehearsalIndex],
    },cookie);
  }catch(err){
    if(!persisted){
      await env.DB.prepare(
        "UPDATE speaking_sessions SET turn_count=? WHERE id=? AND child_id=? AND status='active' AND turn_count=?"
      ).bind(turnCount,sessionId,session.childId,turnCount+1).run().catch(()=>undefined);
    }
    if(action==="reply")
      await recordTenantAiUsage(env.DB,{tenantId,childId:session.childId,purpose:"roleplay_dialogue",model:env.MODELBRIDGE_CHAT_MODEL,status:"failed"}).catch(()=>undefined);
    return Response.json({error:err instanceof Error?err.message:"The AI role-play partner is temporarily unavailable"},{status:502});
  }
}
