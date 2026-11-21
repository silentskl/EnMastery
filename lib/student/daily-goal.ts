import { sgDate } from "@/lib/student/tasks";

export const DAILY_STUDY_TARGET_SECONDS = 30 * 60;
export const DAILY_ACTIVITY_TARGETS = {
  conversation: 1,
  roleplay: 1,
  reading_aloud: 2,
  listening: 1,
} as const;
export type DailyActivityType = keyof typeof DAILY_ACTIVITY_TARGETS;
export type DailyGoalProgress = {
  date: string;
  activeSeconds: number;
  targetSeconds: number;
  counts: Record<DailyActivityType, number>;
  targets: typeof DAILY_ACTIVITY_TARGETS;
  tasksCompleted: number;
  tasksRequired: number;
  timeCompleted: boolean;
  completed: boolean;
};

export async function recordDailyGoalEvent(
  db: D1Database, childId: string, activityType: DailyActivityType, referenceId: string,
) {
  const date = sgDate();
  if (!referenceId.trim()) throw new Error("Daily goal completion needs an evidence reference");
  await db.prepare(
    "INSERT OR IGNORE INTO learner_daily_activity_events "+
    "(id,child_id,study_date,activity_type,reference_id) VALUES (?,?,?,?,?)",
  ).bind("goal-"+crypto.randomUUID(),childId,date,activityType,referenceId).run();
}

export async function getDailyGoalProgress(db: D1Database, childId: string): Promise<DailyGoalProgress> {
  const date = sgDate();
  const [time, events] = await Promise.all([
    db.prepare("SELECT active_seconds FROM learner_daily_study_time WHERE child_id=? AND study_date=?")
      .bind(childId,date).first<{active_seconds:number}>(),
    db.prepare("SELECT activity_type,COUNT(*) AS n FROM learner_daily_activity_events WHERE child_id=? AND study_date=? GROUP BY activity_type")
      .bind(childId,date).all<{activity_type:DailyActivityType;n:number}>(),
  ]);
  const counts: Record<DailyActivityType,number> = {conversation:0,roleplay:0,reading_aloud:0,listening:0};
  for (const entry of events.results) {
    if (entry.activity_type in counts) counts[entry.activity_type] = Math.max(0,Number(entry.n)||0);
  }
  const tasksRequired=Object.values(DAILY_ACTIVITY_TARGETS).reduce((a,b)=>a+b,0);
  const tasksCompleted=(Object.entries(DAILY_ACTIVITY_TARGETS) as [DailyActivityType,number][])
    .reduce((n,[kind,target])=>n+Math.min(target,counts[kind]),0);
  const activeSeconds=Math.max(0,Number(time?.active_seconds)||0);
  const timeCompleted=activeSeconds>=DAILY_STUDY_TARGET_SECONDS;
  return {date,activeSeconds,targetSeconds:DAILY_STUDY_TARGET_SECONDS,counts,
    targets:DAILY_ACTIVITY_TARGETS,tasksRequired,tasksCompleted,timeCompleted,
    completed:timeCompleted&&tasksCompleted===tasksRequired};
}

/** Accept monotonic, client-observed ACTIVE seconds, never raw duration.
 * The first zero-second heartbeat establishes the server's timing anchor.
 * No POST can add more than 30 seconds or more than elapsed real time.
 * A day-wide credit timestamp limits simultaneous tabs to one timeline.
 */
export async function recordDailyStudyHeartbeat(
  db: D1Database, childId: string, sessionId: string, clientSeconds: number, path: string,
) {
  if (!/^study-[a-f0-9]{32}$/i.test(sessionId)) throw new Error("Invalid study session ID");
  const date = sgDate();
  const wanted=Math.max(0,Math.min(86400,Math.floor(clientSeconds)));
  const safePath=path.slice(0,150);
  if (!(safePath==="/oral"||safePath.startsWith("/oral/")||
        safePath==="/learn/listen"||safePath.startsWith("/learn/listen/"))) {
    throw new Error("Learning time is only recorded on oral and listening practice pages");
  }
  await db.prepare("INSERT OR IGNORE INTO learner_study_sessions "+
    "(id,child_id,study_date,client_active_seconds,active_seconds,last_path) "+
    "VALUES (?,?,?,0,0,?)").bind(sessionId,childId,date,safePath).run();
  const previous=await db.prepare(
    "SELECT client_active_seconds,active_seconds FROM learner_study_sessions "+
    "WHERE id=? AND child_id=? AND study_date=?",
  ).bind(sessionId,childId,date).first<{client_active_seconds:number;active_seconds:number}>();
  if (!previous) throw new Error("Study session belongs to another learner or another day");
  // Clock time since started_at is the hard upper bound. A retry cannot
  // increment counters; a maliciously large request can never gain extra time.
  const updated=await db.prepare(
    "UPDATE learner_study_sessions SET "+
    "client_active_seconds=MAX(client_active_seconds,?),"+
    "active_seconds=active_seconds+MIN(30,MAX(0,?-client_active_seconds),"+
    "MAX(0,unixepoch('now')-unixepoch(started_at)-active_seconds)),"+
    "last_path=?,last_seen_at=CURRENT_TIMESTAMP "+
    "WHERE id=? AND child_id=? AND study_date=? RETURNING active_seconds",
  ).bind(wanted,wanted,safePath,sessionId,childId,date).first<{active_seconds:number}>();
  const claimed=Math.max(0,Math.min(30,Number(updated?.active_seconds||0)-Number(previous.active_seconds||0)));
  await db.prepare("INSERT OR IGNORE INTO learner_daily_study_time "+
    "(child_id,study_date,active_seconds) VALUES (?,?,0)").bind(childId,date).run();
  // SQL calculates the global time cap atomically, even when two sessions
  // heartbeat at almost the same instant.
  if (claimed>0) {
    await db.prepare(
      "UPDATE learner_daily_study_time SET active_seconds=active_seconds+"+
      "MIN(?,MAX(0,unixepoch('now')-unixepoch(last_credited_at))),"+
      "last_credited_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP "+
      "WHERE child_id=? AND study_date=?",
    ).bind(claimed,childId,date).run();
  }
}
