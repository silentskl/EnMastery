import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { DAILY_PLANNER_VERSION, ensureTodayPlan, ensureWeeklyPlan, learnerStreak } from "@/lib/student/planner";
import { addDays, sgDate } from "@/lib/student/tasks";
import { normalizeLearningStage } from "@/lib/language/stages";

type DbTask={id:string;task_date:string;activity_type:string;activity_id:string|null;title:string;target_minutes:number;xp_reward:number;status:string;metadata_json:string|null};
function decode(rows:DbTask[]){return rows.map(r=>{let metadata:Record<string,unknown>={};try{metadata=r.metadata_json?JSON.parse(r.metadata_json) as Record<string,unknown>:{};}catch{}return{...r,metadata};});}
async function queryTasks(db:D1Database,childId:string,start:string,end:string){return (await db.prepare("SELECT id,task_date,activity_type,activity_id,title,target_minutes,xp_reward,status,metadata_json FROM learning_tasks WHERE child_id=? AND task_date BETWEEN ? AND ? AND cadence='daily' ORDER BY task_date,CASE activity_type WHEN 'listening' THEN 1 WHEN 'speaking' THEN 2 WHEN 'reading' THEN 3 WHEN 'writing' THEN 4 WHEN 'vocabulary' THEN 5 ELSE 9 END,created_at").bind(childId,start,end).all<DbTask>()).results;}
function message(error:unknown){return error instanceof Error?error.message:String(error)}
function isCurrentOrPreserved(task:DbTask){return task.status==="done"||task.status==="in_progress"||Boolean(task.metadata_json?.includes(`\"plannerVersion\":\"${DAILY_PLANNER_VERSION}\"`));}
function todayNeedsMaterialization(rows:DbTask[],today:string){const current=rows.filter(r=>r.task_date===today&&isCurrentOrPreserved(r));const have=new Set(current.map(r=>r.activity_type));return !["listening","speaking","reading","vocabulary"].every(type=>have.has(type));}
async function ensureEmergencyTodayPlan(db:D1Database,childId:string,today:string){
 const resources=[
  ["listening","Listening · Temporarily unavailable",10],
  ["speaking","Speaking · Temporarily unavailable",8],
  ["reading","Reading · Temporarily unavailable",12],
 ] as Array<[string,string,number]>;
 const existing=await db.prepare("SELECT DISTINCT activity_type FROM learning_tasks WHERE child_id=? AND task_date=? AND cadence='daily'").bind(childId,today).all<{activity_type:string}>(),have=new Set(existing.results.map(x=>x.activity_type));
 const statements:D1PreparedStatement[]=[];
 for(const[type,title,minutes]of resources){if(have.has(type))continue;statements.push(db.prepare("INSERT OR IGNORE INTO learning_tasks (id,child_id,task_date,cadence,activity_type,activity_id,title,target_minutes,xp_reward,status,source,metadata_json) VALUES (?,?,?,'daily',?,NULL,?,?,0,'skipped','adaptive',?)").bind(`task-${crypto.randomUUID()}`,childId,today,type,title,minutes,JSON.stringify({href:"",mode:"learn",plannerVersion:"daily-fallback-v4",reason:"planner_degraded",unavailable:true})));}
 if(!have.has("vocabulary"))statements.push(db.prepare("INSERT OR IGNORE INTO learning_tasks (id,child_id,task_date,cadence,activity_type,activity_id,title,target_minutes,xp_reward,status,source,metadata_json) VALUES (?,?,?,'daily','vocabulary',NULL,'Vocabulary · daily review',10,12,'todo','adaptive',?)").bind(`task-${crypto.randomUUID()}`,childId,today,JSON.stringify({href:"/learn/vocabulary",mode:"learn",plannerVersion:"daily-fallback-v4",reason:"planner_degraded"})));
 if(statements.length)await db.batch(statements);
}
function errorResponse(error:unknown,stage:string,requestId:string){const detail=message(error);console.error("[student-plan] request failed",{requestId,stage,error:detail});const response=Response.json({error:{code:"student_plan_failed",message:detail,stage,requestId}},{status:500});response.headers.set("Cache-Control","no-store, max-age=0");response.headers.set("X-Request-Id",requestId);return response;}

export async function GET(request:Request){
 const env=getEnv(),requestId=crypto.randomUUID();let stage="session",session:Awaited<ReturnType<typeof ensureLearnerSession>>|null=null;
 try{
  session=await ensureLearnerSession(request,env.DB);stage="profile";
  const url=new URL(request.url),today=sgDate(),todayOnly=url.searchParams.get("scope")==="today",end=todayOnly?today:addDays(today,6),profile=await env.DB.prepare("SELECT school_level FROM child_profiles WHERE id=?").bind(session.childId).first<{school_level:string}>();
  if(!profile)throw new Error(`Learner profile not found for ${session.childId}`);
  const level=normalizeLearningStage(profile.school_level,"P6"),warnings:Array<{stage:string;message:string}>=[];
  stage="load_existing_tasks";let rows=await queryTasks(env.DB,session.childId,today,end);

  // Critical Hotfix 11.5 rule: the Learn page never runs the seven-day planner.
  // It first returns an already persisted current mission, otherwise materialises today only.
  if(todayOnly?todayNeedsMaterialization(rows,today):true){
   stage=todayOnly?"materialize_today":"materialize_week";
   try{
    if(todayOnly)await ensureTodayPlan(env.DB,session.childId,level);else await ensureWeeklyPlan(env.DB,session.childId,level);
   }catch(error){
    warnings.push({stage,message:message(error)});console.error("[student-plan] planner degraded",{requestId,childId:session.childId,stage,error:message(error)});
    stage="emergency_today_plan";await ensureEmergencyTodayPlan(env.DB,session.childId,today).catch(fallbackError=>{throw new Error(`Planner failed (${message(error)}); emergency plan also failed (${message(fallbackError)})`)});
   }
   stage="reload_tasks";rows=await queryTasks(env.DB,session.childId,today,end);
  }

  // Completion is written by the activity completion endpoints. GET stays read-mostly;
  // no per-card evidence reconciliation or week rebuild is allowed in the page request.
  stage="streak";let streak=0;
  if(!todayOnly){try{streak=await learnerStreak(env.DB,session.childId)}catch(error){warnings.push({stage,message:message(error)});}}
  const response=Response.json({today,streak,tasks:decode(rows),requestId,...(warnings.length?{warnings}:{}),plannerMode:todayOnly?"today-bounded":"week-bounded"});
  response.headers.set("Cache-Control","no-store, max-age=0");response.headers.set("X-Request-Id",requestId);response.headers.set("X-Plan-Mode",todayOnly?"today-bounded":"week-bounded");if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
 }catch(error){return errorResponse(error,stage,requestId)}
}
