const ALWAYS_REQUIRED=["listening","speaking","reading","vocabulary"] as const;

export function sgRewardDate(date=new Date()){
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Singapore",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
}

export async function grantDailyGameReward(
  db:D1Database,
  childId:string,
  sourceType:"english_daily_task"|"science_daily_session",
  sourceId:string,
  sourceLabel:string,
){
  const id=`reward-${crypto.randomUUID()}`;
  const result=await db.prepare(`INSERT OR IGNORE INTO daily_game_rewards
    (id,child_id,reward_date,source_type,source_id,source_label)
    VALUES (?,?,?,?,?,?)`).bind(id,childId,sgRewardDate(),sourceType,sourceId,sourceLabel.slice(0,120)).run();
  return Number(result.meta?.changes||0)>0;
}

/**
 * Daily English reward policy: Listening, Speaking, Reading and Vocabulary must
 * all exist and be complete. Writing is also required whenever today's planner
 * assigned a Writing task. This keeps Writing cadence configurable without
 * making non-Writing days impossible to complete.
 */
export async function maybeGrantEnglishDailyReward(db:D1Database,childId:string,date=sgRewardDate()){
  const rows=await db.prepare(`SELECT activity_type,COUNT(*) total,
      SUM(CASE WHEN status='done' OR (status='skipped' AND instr(COALESCE(metadata_json,''),'\"unavailable\":true')>0) THEN 1 ELSE 0 END) done
    FROM learning_tasks
    WHERE child_id=? AND task_date=? AND activity_type IN ('listening','speaking','reading','writing','vocabulary')
    GROUP BY activity_type`).bind(childId,date).all<{activity_type:string;total:number;done:number}>();
  const byType=new Map(rows.results.map(r=>[r.activity_type,{total:Number(r.total||0),done:Number(r.done||0)}]));
  const mandatoryReady=ALWAYS_REQUIRED.every(type=>{const x=byType.get(type);return Boolean(x&&x.total>0&&x.done===x.total)});
  const writing=byType.get("writing");const writingReady=!writing||writing.total===0||writing.done===writing.total;
  if(!mandatoryReady||!writingReady)return false;
  const label=writing?.total?"Daily mission · Listen · Speak · Read · Write · Vocabulary":"Daily mission · Listen · Speak · Read · Vocabulary";
  return grantDailyGameReward(db,childId,"english_daily_task",`daily-mission:${date}`,label);
}
