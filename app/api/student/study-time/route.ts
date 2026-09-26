import {getEnv} from "@/lib/cloudflare";
import {ensureLearnerSession,learnerCookie} from "@/lib/student/session";
import {sgDate} from "@/lib/student/tasks";

type Body={sessionId?:unknown;activeSeconds?:unknown;idleCount?:unknown;path?:unknown;studyDate?:unknown};
const SESSION_ID=/^study-[a-zA-Z0-9_-]{8,96}$/;
function clampInt(value:unknown,min:number,max:number){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.floor(n))):min}
function safePath(value:unknown){if(typeof value!=="string")return null;const path=value.trim();return path.startsWith("/")?path.slice(0,240):null}
function safeDate(value:unknown,today:string){return typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Math.abs(Date.parse(`${value}T00:00:00+08:00`)-Date.parse(`${today}T00:00:00+08:00`))<=86400000?value:today}

export async function POST(request:Request){
 const env=getEnv(),session=await ensureLearnerSession(request,env.DB),body=await request.json().catch(()=>({})) as Body,today=sgDate();
 const sessionId=typeof body.sessionId==="string"&&SESSION_ID.test(body.sessionId)?body.sessionId:"";
 if(!sessionId)return Response.json({error:"Invalid study session"},{status:400});
 const studyDate=safeDate(body.studyDate,today),reported=clampInt(body.activeSeconds,0,24*60*60),reportedIdle=clampInt(body.idleCount,0,1440),path=safePath(body.path);
 const existing=await env.DB.prepare("SELECT child_id,study_date,client_active_seconds,active_seconds,client_idle_count,idle_count FROM learner_study_sessions WHERE id=? LIMIT 1").bind(sessionId).first<{child_id:string;study_date:string;client_active_seconds:number;active_seconds:number;client_idle_count:number;idle_count:number}>();
 let accepted=0,acceptedIdle=0,total=0,totalIdle=0;
 if(!existing){
   // A new client session can submit at most two minutes and a few idle transitions
   // before its first heartbeat. This keeps forged first requests bounded.
   accepted=Math.min(reported,120);acceptedIdle=Math.min(reportedIdle,4);total=accepted;totalIdle=acceptedIdle;
   await env.DB.prepare("INSERT INTO learner_study_sessions(id,child_id,study_date,client_active_seconds,active_seconds,client_idle_count,idle_count,last_path) VALUES(?,?,?,?,?,?,?,?)")
     .bind(sessionId,session.childId,studyDate,reported,accepted,reportedIdle,acceptedIdle,path).run();
 }else{
   if(existing.child_id!==session.childId)return Response.json({error:"Study session does not belong to this learner"},{status:403});
   const previous=Number(existing.client_active_seconds||0),rawDelta=Math.max(0,reported-previous),previousIdle=Number(existing.client_idle_count||0),rawIdleDelta=Math.max(0,reportedIdle-previousIdle);
   // Heartbeats normally arrive every 30 seconds. Caps tolerate background/network delay
   // without letting one request create hours of time or hundreds of idle events.
   accepted=Math.min(rawDelta,120);acceptedIdle=Math.min(rawIdleDelta,4);total=Number(existing.active_seconds||0)+accepted;totalIdle=Number(existing.idle_count||0)+acceptedIdle;
   await env.DB.prepare("UPDATE learner_study_sessions SET client_active_seconds=MAX(client_active_seconds,?),active_seconds=active_seconds+?,client_idle_count=MAX(client_idle_count,?),idle_count=idle_count+?,last_path=?,last_seen_at=CURRENT_TIMESTAMP WHERE id=?")
     .bind(reported,accepted,reportedIdle,acceptedIdle,path,sessionId).run();
 }
 const response=Response.json({ok:true,acceptedSeconds:accepted,acceptedIdleCount:acceptedIdle,totalSeconds:total,totalIdleCount:totalIdle,studyDate});
 response.headers.set("Cache-Control","no-store, max-age=0");if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}
