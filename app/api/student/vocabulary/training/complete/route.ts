import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession } from "@/lib/student/session";
import { completeMatchingTasks } from "@/lib/student/tasks";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
import { getTenantDailyTaskPolicy } from "@/lib/settings/daily-task-policy";

export async function POST(request:Request){
 const env=getEnv(),session=await ensureLearnerSession(request,env.DB),body=await request.json().catch(()=>({})) as {group?:unknown};
 const group=body.group==="review"?"review":body.group==="new"?"new":null;
 if(!group)return Response.json({error:"Choose new or review group"},{status:400});
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Singapore",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 await env.DB.prepare("INSERT OR REPLACE INTO vocabulary_daily_group_completions(child_id,task_date,group_name,completed_at) VALUES(?,?,?,CURRENT_TIMESTAMP)").bind(session.childId,today,group).run();
 const ctx=await learnerTenantContext(env.DB,session.childId),policy=await getTenantDailyTaskPolicy(env.DB,ctx.tenantId,ctx.schoolLevel);
 const rows=await env.DB.prepare("SELECT group_name FROM vocabulary_daily_group_completions WHERE child_id=? AND task_date=?").bind(session.childId,today).all<{group_name:string}>();
 const done=new Set(rows.results.map(r=>r.group_name)),allDone=done.has("new")&&(policy.vocabularyReviewWords===0||done.has("review"));
 const xp=allDone?await completeMatchingTasks(env.DB,session.childId,"vocabulary",undefined,true):0;
 return Response.json({ok:true,group,allDone,xp,completedGroups:[...done]});
}
