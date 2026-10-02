import {getEnv} from "@/lib/cloudflare";
import {ensureLearnerSession,learnerCookie} from "@/lib/student/session";
import {sgDate} from "@/lib/student/tasks";

export async function GET(request:Request){
 const env=getEnv(),session=await ensureLearnerSession(request,env.DB),url=new URL(request.url),date=(url.searchParams.get("date")||sgDate()).slice(0,10);
 const rows=await env.DB.prepare(`SELECT id,task_date,activity_type,activity_id,title,target_minutes,xp_reward,status,metadata_json,completed_at,created_at
   FROM learning_tasks WHERE child_id=? AND task_date=? AND cadence='daily'
   ORDER BY CASE activity_type WHEN 'listening' THEN 1 WHEN 'speaking' THEN 2 WHEN 'reading' THEN 3 WHEN 'writing' THEN 4 WHEN 'vocabulary' THEN 5 ELSE 9 END,created_at`)
   .bind(session.childId,date).all<Record<string,unknown>>();
 const tasks=rows.results.map(row=>{let metadata:Record<string,unknown>={};try{metadata=row.metadata_json?JSON.parse(String(row.metadata_json)) as Record<string,unknown>:{};}catch{}const{metadata_json,...rest}=row;return{...rest,metadata};});
 const response=Response.json({date,tasks});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}
