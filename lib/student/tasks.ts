import {maybeGrantEnglishDailyReward} from "@/lib/student/game-rewards";

export function sgDate(date=new Date()){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Singapore",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);}
export function addDays(date:string,days:number){const d=new Date(`${date}T00:00:00+08:00`);d.setUTCDate(d.getUTCDate()+days);return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Singapore",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);}

type ReconcileWarning={taskId?:string;activityType?:string;stage:string;message:string};
export type DailyTaskReconcileResult={checked:number;completed:number;removedStale:number;warnings:ReconcileWarning[]};

function errorMessage(error:unknown){return error instanceof Error?error.message:String(error);}
function warn(stage:string,error:unknown,extra:Partial<ReconcileWarning>={}){
 const item:ReconcileWarning={stage,message:errorMessage(error),...extra};
 console.warn(`[daily-task] ${stage}`,item);
 return item;
}

async function grantDailyRewardBestEffort(db:D1Database,childId:string,date:string){
 try{await maybeGrantEnglishDailyReward(db,childId,date);}catch(error){console.warn("[daily-task] daily reward reconciliation failed",{childId,date,error:errorMessage(error)});}
}

export async function completeMatchingTasks(db:D1Database,childId:string,activityType:string,activityId?:string,awardXp=true){
 const date=sgDate();
 const rows=activityId
  ?await db.prepare("SELECT id,xp_reward,title FROM learning_tasks WHERE child_id=? AND task_date=? AND status!='done' AND (activity_id=? OR (activity_type=? AND activity_id IS NULL))").bind(childId,date,activityId,activityType).all<{id:string;xp_reward:number;title:string}>()
  :await db.prepare("SELECT id,xp_reward,title FROM learning_tasks WHERE child_id=? AND task_date=? AND status!='done' AND activity_type=?").bind(childId,date,activityType).all<{id:string;xp_reward:number;title:string}>();
 if(!rows.results.length){await grantDailyRewardBestEffort(db,childId,date);return 0;}
 for(const task of rows.results){
  await db.prepare("UPDATE learning_tasks SET status='done',completed_at=COALESCE(completed_at,CURRENT_TIMESTAMP) WHERE id=? AND child_id=?").bind(task.id,childId).run();
  if(awardXp&&task.xp_reward>0)await db.prepare("INSERT OR IGNORE INTO xp_ledger (id,child_id,event_type,points,reference_id) VALUES (?,?, 'task_complete', ?, ?)").bind(`xp-${task.id}`,childId,task.xp_reward,task.id).run();
 }
 // Rewards are supplemental. A reward-table/data problem must never make a
 // successfully completed learning task fail or make the Today API return 500.
 await grantDailyRewardBestEffort(db,childId,date);
 return awardXp?rows.results.reduce((n,t)=>n+Math.max(0,t.xp_reward),0):0;
}

async function removeStaleAdaptiveTask(db:D1Database,childId:string,date:string,taskId:string,warnings:ReconcileWarning[],activityType:string){
 // Delete the stale task first. XP/reward cleanup is bookkeeping and is deliberately
 // isolated so a legacy/partially migrated auxiliary table cannot block Today's plan.
 try{
  await db.prepare("DELETE FROM learning_tasks WHERE id=? AND child_id=? AND task_date=? AND source='adaptive'").bind(taskId,childId,date).run();
 }catch(error){warnings.push(warn("remove_stale_task",error,{taskId,activityType}));return false;}
 try{await db.prepare("DELETE FROM xp_ledger WHERE child_id=? AND event_type='task_complete' AND reference_id=?").bind(childId,taskId).run();}
 catch(error){warnings.push(warn("cleanup_stale_task_xp",error,{taskId,activityType}));}
 try{await db.prepare("DELETE FROM daily_game_rewards WHERE child_id=? AND source_type='english_daily_task' AND source_id=? AND status='available'").bind(childId,`daily-mission:${date}`).run();}
 catch(error){warnings.push(warn("cleanup_stale_daily_reward",error,{taskId,activityType}));}
 return true;
}

/**
 * Reconcile today's cards only from evidence created on the same Singapore day.
 * IMPORTANT: every activity-specific evidence lookup is isolated. Historical or
 * partially migrated optional data must never prevent the Today mission from loading.
 */
export async function reconcileTodayTaskProgress(db:D1Database,childId:string):Promise<DailyTaskReconcileResult>{
 const date=sgDate(),warnings:ReconcileWarning[]=[];
 const rows=await db.prepare("SELECT id,activity_type,activity_id,status,source,metadata_json FROM learning_tasks WHERE child_id=? AND task_date=?").bind(childId,date).all<{id:string;activity_type:string;activity_id:string|null;status:string;source:string;metadata_json:string|null}>();
 let completed=0,removedStale=0;
 for(const task of rows.results){
  const type=task.activity_type,id=task.activity_id;let passedToday=false,passedBeforeToday=false,evidenceAvailable=true;
  try{
   if((type==="reading"||type==="listening")&&id){
    const row=await db.prepare(`SELECT
       CASE WHEN status='completed' AND progress_percent>=100 AND date(COALESCE(completed_at,updated_at),'+8 hours')=? THEN 1 ELSE 0 END passed_today,
       CASE WHEN status='completed' AND progress_percent>=100 AND date(COALESCE(completed_at,updated_at),'+8 hours')<? THEN 1 ELSE 0 END passed_before
       FROM learner_content_progress WHERE child_id=? AND content_id=? LIMIT 1`).bind(date,date,childId,id).first<{passed_today:number;passed_before:number}>();
    passedToday=Boolean(row?.passed_today);passedBeforeToday=Boolean(row?.passed_before);
   }else if(type==="writing"&&id){
    const row=await db.prepare(`SELECT
       MAX(CASE WHEN passed=1 AND date(COALESCE(passed_at,updated_at),'+8 hours')=? THEN 1 ELSE 0 END) passed_today,
       MAX(CASE WHEN passed=1 AND date(COALESCE(passed_at,updated_at),'+8 hours')<? THEN 1 ELSE 0 END) passed_before
       FROM writing_submissions WHERE child_id=? AND prompt_id=?`).bind(date,date,childId,id).first<{passed_today:number|null;passed_before:number|null}>();
    passedToday=Boolean(row?.passed_today);passedBeforeToday=Boolean(row?.passed_before);
   }else if(type==="speaking"){
    const row=await db.prepare("SELECT COUNT(*) n FROM speaking_daily_mode_progress WHERE child_id=? AND task_date=? AND passed=1 AND mode IN ('conversation','reading_aloud','stimulus')").bind(childId,date).first<{n:number}>();
    passedToday=Number(row?.n||0)>=3;
   }else if(type==="vocabulary"){
    let target=1;try{const meta=JSON.parse(task.metadata_json||'{}') as {dailyTarget?:unknown};target=Math.max(1,Math.min(50,Math.round(Number(meta.dailyTarget)||1)))}catch{}
    const row=await db.prepare("SELECT COUNT(*) n FROM vocabulary_training_rollups WHERE child_id=? AND last_training_day=?").bind(childId,date).first<{n:number}>();
    passedToday=Number(row?.n||0)>=target;
   }
  }catch(error){
   evidenceAvailable=false;
   warnings.push(warn("read_completion_evidence",error,{taskId:task.id,activityType:type}));
  }
  if(!evidenceAvailable)continue;
  if(passedToday){
   if(task.status!=="done"){
    try{await completeMatchingTasks(db,childId,type,id??undefined,true);completed++;}
    catch(error){warnings.push(warn("mark_task_done",error,{taskId:task.id,activityType:type}));}
   }
   continue;
  }
  // Only remove a task when we positively proved its lesson was completed before
  // this Singapore day. Missing/invalid evidence never causes destructive repair.
  if(task.source==="adaptive"&&passedBeforeToday&&(type==="reading"||type==="listening"||type==="writing")){
   if(await removeStaleAdaptiveTask(db,childId,date,task.id,warnings,type))removedStale++;
  }
 }
 return{checked:rows.results.length,completed,removedStale,warnings};
}
