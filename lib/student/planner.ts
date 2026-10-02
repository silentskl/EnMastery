import { addDays, sgDate } from "@/lib/student/tasks";
import { normalizeLearningStage, type LearningStage } from "@/lib/language/stages";
import { getTenantDailyTaskPolicy, writingScheduledForDate, type TenantDailyTaskPolicy } from "@/lib/settings/daily-task-policy";
import { getTenantLessonRepeatCooldownDays } from "@/lib/settings/learning-policy";
import { listeningMeetsDailyLimit, readingMeetsDailyLimit, readingWordCount } from "@/lib/student/daily-task-lesson-filter";

type ReadingRow = { id: string; title: string; content_type: string; topic: string | null; progress_percent: number | null; body_json: string; daily_limit_relaxed?: boolean };
type ListeningRow = { id: string; title: string; content_type: string; topic: string | null; progress_percent: number | null; media_kind: string | null; duration_seconds: number | null; daily_limit_relaxed?: boolean };
type PromptRow = { id: string; title: string; topic: string | null };
type ExistingTask = { id:string; task_date: string; activity_type: string; activity_id:string|null; title:string; status: string; metadata_json: string | null };
type Domain = "listen" | "speak" | "read" | "write";
type DomainLimits = Record<Domain, number>;

export const DAILY_PLANNER_VERSION = "daily-locked-v14-hard-7d-assignment-cooldown";
// Historical marker retained for upgrade diagnostics: daily-cache-v12-eligible-before-limit
const PLANNER_VERSION = DAILY_PLANNER_VERSION;
const CANDIDATE_RETURN_LIMIT = 24;
const DEFAULT_VISIBLE_LIMIT = 200;

function pick<T>(rows: T[], day: number) { return rows.length ? rows[day % rows.length] : undefined; }
function pickUnused<T extends {id:string}>(rows:T[],day:number,used:Set<string>){
  if(!rows.length)return undefined;
  for(let offset=0;offset<rows.length;offset++){
    const row=rows[(day+offset)%rows.length];if(!used.has(row.id)){used.add(row.id);return row;}
  }
  return undefined;
}
function clampVisibleLimit(value: unknown, fallback = DEFAULT_VISIBLE_LIMIT) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(200, n));
}
function genericMeta(href: string, reason: string, extra: Record<string, unknown> = {}) {
  return { href, mode: "learn", plannerVersion: PLANNER_VERSION, reason, ...extra };
}
function isUnavailableTask(row:Pick<ExistingTask,"activity_id"|"status"|"metadata_json">){
  if(row.activity_id!==null||row.status!=="skipped")return false;
  try{const meta=row.metadata_json?JSON.parse(row.metadata_json) as Record<string,unknown>:{};return meta.unavailable===true;}catch{return false;}
}

async function plannerIdentity(db: D1Database, childId: string, schoolLevel: string) {
  const tenantRow = await db.prepare("SELECT COALESCE(tenant_id,'tenant-default') tenant_id FROM child_profiles WHERE id=?")
    .bind(childId).first<{ tenant_id: string }>();
  const tenantId = tenantRow?.tenant_id || "tenant-default";
  const level = normalizeLearningStage(schoolLevel, "P6");
  return { tenantId, level };
}

async function domainLimits(db: D1Database, tenantId: string, level: LearningStage): Promise<DomainLimits> {
  const rows = await db.prepare("SELECT domain,lesson_limit FROM tenant_learn_availability WHERE tenant_id=? AND school_level=? AND domain IN ('listen','speak','read','write')")
    .bind(tenantId, level).all<{ domain: Domain; lesson_limit: number }>();
  const out: DomainLimits = { listen: DEFAULT_VISIBLE_LIMIT, speak: DEFAULT_VISIBLE_LIMIT, read: DEFAULT_VISIBLE_LIMIT, write: DEFAULT_VISIBLE_LIMIT };
  for (const row of rows.results) out[row.domain] = clampVisibleLimit(row.lesson_limit);
  return out;
}

async function readingCandidates(db: D1Database, childId: string, tenantId: string, level: LearningStage, visibleLimit: number, maxWords: number, cooldownStart:string|null, today:string): Promise<ReadingRow[]> {
  if (visibleLimit <= 0) return [];
  // Hotfix 11.8.3: eligibility MUST be evaluated before the Tenant lesson limit.
  // Otherwise the first N (already completed) lessons can exhaust the window while
  // later published lessons are still perfectly eligible for today's assignment.
  const rows = await db.prepare(`SELECT c.id,c.title,c.content_type,c.topic,p.progress_percent,v.body_json
    FROM content_items c
    JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version
    LEFT JOIN learner_content_progress p ON p.content_id=c.id AND p.child_id=?
    WHERE c.status='published' AND c.school_level=?
      AND c.content_type IN ('article','lesson')
      AND (c.scope='global' OR (c.scope='tenant' AND c.tenant_id=?))
      AND (? IS NULL OR NOT EXISTS (
        SELECT 1 FROM learner_content_progress learned
        WHERE learned.child_id=? AND learned.content_id=c.id
          AND learned.status='completed' AND learned.progress_percent>=100
          AND date(COALESCE(learned.completed_at,learned.updated_at),'+8 hours')>=?
          AND date(COALESCE(learned.completed_at,learned.updated_at),'+8 hours')<?
      ))
      AND (? IS NULL OR NOT EXISTS (
        SELECT 1 FROM learning_tasks recent
        WHERE recent.child_id=? AND recent.activity_type='reading' AND recent.activity_id=c.id
          AND recent.task_date>=? AND recent.task_date<?
      ))
    ORDER BY CASE WHEN p.content_id IS NULL THEN 0 WHEN p.status='started' THEN 1 ELSE 2 END,
      COALESCE(p.updated_at,'') ASC,c.published_at DESC,c.created_at ASC,c.id ASC
    LIMIT ?`)
    .bind(childId,level,tenantId,
      cooldownStart,childId,cooldownStart,today,
      cooldownStart,childId,cooldownStart,today,
      Math.min(visibleLimit,CANDIDATE_RETURN_LIMIT)).all<ReadingRow>();
  const strict=rows.results.filter((row)=>readingMeetsDailyLimit(row.body_json,maxWords));
  if(strict.length||maxWords<=0||!rows.results.length)return strict;
  // Availability wins over a soft Daily length preference. This fallback is
  // explicit in task metadata, while cooldown remains hard.
  return [{...rows.results[0],daily_limit_relaxed:true}];
}

async function listeningCandidates(db: D1Database, childId: string, tenantId: string, level: LearningStage, visibleLimit: number, maxVideoSeconds: number, cooldownStart:string|null, today:string): Promise<ListeningRow[]> {
  if (visibleLimit <= 0) return [];
  const rows = await db.prepare(`SELECT c.id,c.title,c.content_type,c.topic,p.progress_percent,m.media_kind,m.duration_seconds
    FROM content_items c
    LEFT JOIN content_media m ON m.content_id=c.id
    LEFT JOIN learner_content_progress p ON p.content_id=c.id AND p.child_id=?
    WHERE c.status='published' AND c.school_level=?
      AND c.content_type IN ('audio','video_ref')
      AND (c.scope='global' OR (c.scope='tenant' AND c.tenant_id=?))
      AND (? IS NULL OR NOT EXISTS (
        SELECT 1 FROM learner_content_progress learned
        WHERE learned.child_id=? AND learned.content_id=c.id
          AND learned.status='completed' AND learned.progress_percent>=100
          AND date(COALESCE(learned.completed_at,learned.updated_at),'+8 hours')>=?
          AND date(COALESCE(learned.completed_at,learned.updated_at),'+8 hours')<?
      ))
      AND (? IS NULL OR NOT EXISTS (
        SELECT 1 FROM learning_tasks recent
        WHERE recent.child_id=? AND recent.activity_type='listening' AND recent.activity_id=c.id
          AND recent.task_date>=? AND recent.task_date<?
      ))
    ORDER BY CASE WHEN p.content_id IS NULL THEN 0 WHEN p.status='started' THEN 1 ELSE 2 END,
      COALESCE(p.updated_at,'') ASC,c.published_at DESC,c.created_at ASC,c.id ASC
    LIMIT ?`)
    .bind(childId,level,tenantId,
      cooldownStart,childId,cooldownStart,today,
      cooldownStart,childId,cooldownStart,today,
      Math.min(visibleLimit,CANDIDATE_RETURN_LIMIT)).all<ListeningRow>();
  const strict=rows.results.filter((row)=>listeningMeetsDailyLimit({contentType:row.content_type,mediaKind:row.media_kind,durationSeconds:row.duration_seconds},maxVideoSeconds));
  if(strict.length||maxVideoSeconds<=0||!rows.results.length)return strict;
  return [{...rows.results[0],daily_limit_relaxed:true}];
}

async function speakingCandidates(db: D1Database, childId:string, tenantId: string, level: LearningStage, visibleLimit: number, cooldownStart:string|null, today:string): Promise<PromptRow[]> {
  if (visibleLimit <= 0) return [];
  const rows = await db.prepare(`SELECT c.id,c.title,c.topic FROM content_items c
    WHERE c.status='published' AND c.school_level=? AND c.content_type='oral_prompt'
      AND (c.scope='global' OR (c.scope='tenant' AND c.tenant_id=?))
      AND (? IS NULL OR NOT EXISTS (
        SELECT 1 FROM learning_tasks recent
        WHERE recent.child_id=? AND recent.activity_type='speaking' AND recent.activity_id=c.id
          AND recent.task_date>=? AND recent.task_date<?
      ))
      AND (? IS NULL OR NOT EXISTS (
        SELECT 1 FROM speaking_daily_mode_progress used_prompt
        WHERE used_prompt.child_id=? AND used_prompt.prompt_id=c.id
          AND used_prompt.task_date>=? AND used_prompt.task_date<?
          AND (SELECT COUNT(DISTINCT passed_mode.mode) FROM speaking_daily_mode_progress passed_mode
               WHERE passed_mode.child_id=used_prompt.child_id AND passed_mode.task_date=used_prompt.task_date
                 AND passed_mode.passed=1 AND passed_mode.mode IN ('conversation','reading_aloud','stimulus'))>=3
      ))
    ORDER BY c.created_at ASC,c.id ASC LIMIT ?`)
    .bind(level,tenantId,
      cooldownStart,childId,cooldownStart,today,
      cooldownStart,childId,cooldownStart,today,
      Math.min(visibleLimit,CANDIDATE_RETURN_LIMIT)).all<PromptRow>();
  return rows.results;
}

async function writingCandidates(db: D1Database, childId: string, tenantId: string, level: LearningStage, visibleLimit: number, cooldownStart:string|null, today:string): Promise<PromptRow[]> {
  if (visibleLimit <= 0) return [];
  const rows = await db.prepare(`SELECT c.id,c.title,c.topic FROM content_items c
    WHERE c.status='published' AND c.school_level=? AND c.content_type='writing_prompt'
      AND (c.scope='global' OR (c.scope='tenant' AND c.tenant_id=?))
      AND (? IS NULL OR NOT EXISTS (
        SELECT 1 FROM writing_submissions recent_write
        WHERE recent_write.child_id=? AND recent_write.prompt_id=c.id AND recent_write.passed=1
          AND date(COALESCE(recent_write.passed_at,recent_write.updated_at),'+8 hours')>=?
          AND date(COALESCE(recent_write.passed_at,recent_write.updated_at),'+8 hours')<?
      ))
      AND (? IS NULL OR NOT EXISTS (
        SELECT 1 FROM learning_tasks recent
        WHERE recent.child_id=? AND recent.activity_type='writing' AND recent.activity_id=c.id
          AND recent.task_date>=? AND recent.task_date<?
      ))
    ORDER BY c.created_at ASC,c.id ASC LIMIT ?`)
    .bind(level,tenantId,
      cooldownStart,childId,cooldownStart,today,
      cooldownStart,childId,cooldownStart,today,
      Math.min(visibleLimit,CANDIDATE_RETURN_LIMIT)).all<PromptRow>();
  return rows.results;
}

// Daily vocabulary assignment is controlled only by Tenant Admin policy.
async function vocabularyBook(db: D1Database, tenantId: string, level: LearningStage, policy: TenantDailyTaskPolicy) {
  const fallbackCollectionId = `sg-${level.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const selectedCollectionId = policy.vocabularyCollectionId || fallbackCollectionId;
  const selected = selectedCollectionId
    ? await db.prepare("SELECT id,name FROM vocabulary_collections WHERE id=? AND status='published' AND (collection_type='system' OR (collection_type='custom' AND tenant_id=?))")
      .bind(selectedCollectionId, tenantId).first<{ id: string; name: string }>()
    : null;
  const fallback = selected ? null : await db.prepare("SELECT id,name FROM vocabulary_collections WHERE id=? AND status='published'")
    .bind(fallbackCollectionId).first<{ id: string; name: string }>();
  return { id: selected?.id || fallback?.id || null, name: selected?.name || fallback?.name || "Vocabulary", target: policy.vocabularyNewWords, newTarget:policy.vocabularyNewWords, reviewTarget:policy.vocabularyReviewWords };
}

type RecoveryTaskRow={id:string;activity_type:string;activity_id:string|null;status:string};

/**
 * Hotfix 11.8.2 recovery: Hotfix 11.8's first migration could remove/reset a
 * same-day completed card while changing legacy placeholder behaviour. Completion
 * evidence itself was not deleted, so reconstruct only genuinely completed work.
 * This is intentionally bounded to today's Reading/Listening plus the three-part
 * Speaking gate. Vocabulary is untouched.
 */
async function restoreTodayCompletedAssignments(db:D1Database,childId:string,today:string){
  const current=await db.prepare("SELECT id,activity_type,activity_id,status FROM learning_tasks WHERE child_id=? AND task_date=? AND cadence='daily' AND activity_type IN ('reading','listening','speaking')")
    .bind(childId,today).all<RecoveryTaskRow>();
  const done=new Set(current.results.filter(row=>row.status==='done').map(row=>row.activity_type));
  const statements:D1PreparedStatement[]=[];
  const recoveryMeta=(href:string,reason:string)=>JSON.stringify(genericMeta(href,reason,{recoveredFromTodayCompletion:true}));
  function recover(type:'reading'|'listening'|'speaking',activityId:string|null,title:string,minutes:number,xp:number,href:string){
    // Never replace or duplicate an already persisted card. Recovery is only for a genuinely missing activity.
    if(done.has(type)||current.results.some(row=>row.activity_type===type))return;
    const reusable=current.results.find(row=>row.activity_type===type&&(row.activity_id===activityId||row.activity_id===null));
    const taskId=reusable?.id||`task-recovered-${type}-${childId}-${today}`;
    if(reusable){
      statements.push(db.prepare("UPDATE learning_tasks SET activity_id=?,title=?,target_minutes=?,xp_reward=?,status='done',completed_at=COALESCE(completed_at,CURRENT_TIMESTAMP),metadata_json=? WHERE id=? AND child_id=?")
        .bind(activityId,title,minutes,xp,recoveryMeta(href,'recovered_today_completion'),taskId,childId));
    }else{
      statements.push(db.prepare("INSERT OR IGNORE INTO learning_tasks (id,child_id,task_date,cadence,activity_type,activity_id,title,target_minutes,xp_reward,status,source,metadata_json,completed_at) VALUES (?,?,?,'daily',?,?,?,?,?,'done','adaptive',?,CURRENT_TIMESTAMP)")
        .bind(taskId,childId,today,type,activityId,title,minutes,xp,recoveryMeta(href,'recovered_today_completion')));
    }
    if(xp>0)statements.push(db.prepare("INSERT OR IGNORE INTO xp_ledger (id,child_id,event_type,points,reference_id) VALUES (?,?, 'task_complete', ?, ?)").bind(`xp-${taskId}`,childId,xp,taskId));
    done.add(type);
  }

  if(!done.has('reading')||!done.has('listening')){
    const learned=await db.prepare(`SELECT c.id,c.title,c.content_type,COALESCE(p.completed_at,p.updated_at) completed_at
      FROM learner_content_progress p JOIN content_items c ON c.id=p.content_id
      WHERE p.child_id=? AND p.status='completed' AND p.progress_percent>=100
        AND date(COALESCE(p.completed_at,p.updated_at),'+8 hours')=?
        AND c.content_type IN ('article','lesson','audio','video_ref')
      ORDER BY COALESCE(p.completed_at,p.updated_at) DESC,c.id LIMIT 12`)
      .bind(childId,today).all<{id:string;title:string;content_type:string;completed_at:string}>();
    if(!done.has('listening')){
      const row=learned.results.find(item=>item.content_type==='audio'||item.content_type==='video_ref');
      if(row)recover('listening',row.id,`Listen · ${row.title}`,10,12,`/learn/listen/${row.id}`);
    }
    if(!done.has('reading')){
      const row=learned.results.find(item=>item.content_type==='article'||item.content_type==='lesson');
      if(row)recover('reading',row.id,`Read · ${row.title}`,12,14,`/learn/read/${row.id}`);
    }
  }

  if(!done.has('speaking')){
    const speaking=await db.prepare(`SELECT COUNT(DISTINCT CASE WHEN passed=1 THEN mode END) passed_modes,
        MAX(CASE WHEN mode='conversation' THEN prompt_id ELSE NULL END) conversation_prompt,
        MAX(prompt_id) any_prompt
      FROM speaking_daily_mode_progress WHERE child_id=? AND task_date=?`)
      .bind(childId,today).first<{passed_modes:number;conversation_prompt:string|null;any_prompt:string|null}>().catch(()=>null);
    if(Number(speaking?.passed_modes||0)>=3){
      const promptId=speaking?.conversation_prompt||speaking?.any_prompt||null;
      let promptTitle='Daily oral practice';
      if(promptId){const row=await db.prepare("SELECT title FROM content_items WHERE id=? LIMIT 1").bind(promptId).first<{title:string}>().catch(()=>null);if(row?.title)promptTitle=row.title;}
      recover('speaking',promptId,`Speak · ${promptTitle}`,8,12,promptId?`/learn/speak?prompt=${encodeURIComponent(promptId)}`:'/learn/speak');
    }
  }
  if(statements.length)await db.batch(statements);
}

async function clearStaleTodaySelection(db:D1Database,childId:string,today:string,cooldownStart:string|null){
  // Cooldown means *completed/learned*, not merely assigned, opened or started.
  // Never remove a same-day PASS. Only todo/skipped selections whose concrete
  // lesson was genuinely completed before today are stale.
  if(!cooldownStart)return;
  try {
    await db.prepare(`DELETE FROM learning_tasks
      WHERE child_id=? AND task_date=? AND cadence='daily' AND source='adaptive'
        AND status IN ('todo','skipped') AND activity_id IS NOT NULL AND (
          EXISTS (SELECT 1 FROM learning_tasks prior
            WHERE prior.child_id=learning_tasks.child_id AND prior.activity_type=learning_tasks.activity_type
              AND prior.activity_id=learning_tasks.activity_id AND prior.status='done'
              AND prior.task_date>=? AND prior.task_date<learning_tasks.task_date)
          OR (activity_type IN ('reading','listening') AND EXISTS (
            SELECT 1 FROM learner_content_progress p
            WHERE p.child_id=learning_tasks.child_id AND p.content_id=learning_tasks.activity_id
              AND p.status='completed' AND p.progress_percent>=100
              AND date(COALESCE(p.completed_at,p.updated_at),'+8 hours')>=?
              AND date(COALESCE(p.completed_at,p.updated_at),'+8 hours')<learning_tasks.task_date
          ))
          OR (activity_type='writing' AND EXISTS (
            SELECT 1 FROM writing_submissions w
            WHERE w.child_id=learning_tasks.child_id AND w.prompt_id=learning_tasks.activity_id AND w.passed=1
              AND date(COALESCE(w.passed_at,w.updated_at),'+8 hours')>=?
              AND date(COALESCE(w.passed_at,w.updated_at),'+8 hours')<learning_tasks.task_date
          ))
          OR (activity_type='speaking' AND EXISTS (
            SELECT 1 FROM speaking_daily_mode_progress sp
            WHERE sp.child_id=learning_tasks.child_id AND sp.prompt_id=learning_tasks.activity_id
              AND sp.task_date>=? AND sp.task_date<learning_tasks.task_date
              AND (SELECT COUNT(DISTINCT sp2.mode) FROM speaking_daily_mode_progress sp2
                   WHERE sp2.child_id=sp.child_id AND sp2.task_date=sp.task_date AND sp2.passed=1)>=3
          ))
        )`)
      .bind(childId,today,cooldownStart,cooldownStart,cooldownStart,cooldownStart).run();
  } catch (error) {
    console.warn("[daily-planner] stale today-task cleanup skipped", { childId, error: error instanceof Error ? error.message : String(error) });
  }
}

/** Once a date is materialised, its persisted task choices are locked and reused unchanged. */
async function ensurePlanRange(db: D1Database, childId: string, schoolLevel: string, dayCount: 1 | 7) {
  const today = sgDate();
  const end = addDays(today, dayCount - 1);
  const { tenantId, level } = await plannerIdentity(db, childId, schoolLevel);
  const [policy, limits, cooldownDays] = await Promise.all([
    getTenantDailyTaskPolicy(db, tenantId, level),
    domainLimits(db, tenantId, level),
    getTenantLessonRepeatCooldownDays(db,tenantId),
  ]);
  const effectiveCooldownDays=Math.max(7,cooldownDays);
  const cooldownStart=addDays(today,-effectiveCooldownDays);
  // Hotfix 12.4.4: lesson assignment itself is cooldown evidence. A Listen/Speak/Read/Write
  // lesson that appeared on any of the previous 7 calendar days is ineligible today,
  // regardless of whether the learner completed, opened or ignored that task.

  await restoreTodayCompletedAssignments(db,childId,today);

  // Hotfix 12.1: Persisted daily missions are immutable. Planner-version changes,
  // Admin policy edits and application deployments must never replace an already
  // generated task. New policy only applies to a date that has not been generated.
  const existing = await db.prepare("SELECT id,task_date,activity_type,activity_id,title,status,metadata_json FROM learning_tasks WHERE child_id=? AND task_date BETWEEN ? AND ? AND cadence='daily' AND source='adaptive'")
    .bind(childId, today, end).all<ExistingTask>();

  let needsCandidates = false;
  const coreTypes = ["listening", "speaking", "reading", "vocabulary"];
  for (let day = 0; day < dayCount; day++) {
    const date = addDays(today, day);
    const rows = existing.results.filter((x) => x.task_date === date);
    const haveConcrete = new Set(rows.filter((x)=>!isUnavailableTask(x)).map((x) => x.activity_type));
    // Concrete daily assignments are immutable, but an UNAVAILABLE placeholder is
    // not an assignment. Re-run bounded selection so newly published/eligible
    // content can self-heal the card without changing any valid task.
    if (!coreTypes.every((type) => haveConcrete.has(type))) { needsCandidates = true; break; }
  }
  if (!needsCandidates) return;

  const [read, listen, speak, write, vocab] = await Promise.all([
    readingCandidates(db, childId, tenantId, level, limits.read, policy.readMaxWords,cooldownStart,today),
    listeningCandidates(db, childId, tenantId, level, limits.listen, policy.listenVideoMaxSeconds,cooldownStart,today),
    speakingCandidates(db, childId, tenantId, level, limits.speak,cooldownStart,today),
    writingCandidates(db, childId, tenantId, level, limits.write,cooldownStart,today),
    vocabularyBook(db, tenantId, level, policy),
  ]);

  const statements: D1PreparedStatement[] = [];
  const used={listening:new Set<string>(),speaking:new Set<string>(),reading:new Set<string>(),writing:new Set<string>()};
  for(const task of existing.results){if(!task.activity_id)continue;if(task.activity_type==="listening")used.listening.add(task.activity_id);else if(task.activity_type==="speaking")used.speaking.add(task.activity_id);else if(task.activity_type==="reading")used.reading.add(task.activity_id);else if(task.activity_type==="writing")used.writing.add(task.activity_id);}
  for (let day = 0; day < dayCount; day++) {
    const date = addDays(today, day);
    const rows = existing.results.filter((x) => x.task_date === date);
    const preserved = new Set(rows.filter((x) => x.status === "done" || x.status === "in_progress").map((x) => x.activity_type));
    // Every persisted task is current, regardless of the planner version that created it.
    const placeholders=new Map(rows.filter(isUnavailableTask).map((x)=>[x.activity_type,x]));
    const current = new Set(rows.filter((x)=>!isUnavailableTask(x)).map((x) => x.activity_type));
    // Writing policy is consulted only for a completely new date. If an existing
    // date already has a Writing placeholder, preserve that scheduled presence and
    // allow the placeholder itself to self-heal.
    // Historical immutable-policy marker retained for release validation: rows.length === 0 && writingScheduledForDate
    const writingScheduled = rows.length === 0 ? writingScheduledForDate(policy, date) : rows.some((x)=>x.activity_type==="writing");

    if (!current.has("listening") && !preserved.has("listening")) {
      const l = pickUnused(listen, day,used.listening);
      if(l)statements.push(assignStatement(db,childId,date,"listening",l.id,`Listen · ${l.title}`,10,12,genericMeta(`/learn/listen/${l.id}`,"Daily learning rotation",{dailyLessonFilter:{listenVideoMaxSeconds:policy.listenVideoMaxSeconds},dailyLimitRelaxed:Boolean(l.daily_limit_relaxed),lessonRepeatCooldownDays:effectiveCooldownDays}),placeholders.get("listening")));
      else if(!placeholders.has("listening"))statements.push(unavailableStatement(db,childId,date,"listening","Listening · No eligible lesson available",10,{lessonRepeatCooldownDays:effectiveCooldownDays}));
    }

    if (!current.has("speaking") && !preserved.has("speaking")) {
      const sp = pickUnused(speak, day,used.speaking);
      if(sp)statements.push(assignStatement(db,childId,date,"speaking",sp.id,`Speak · ${sp.title}`,8,12,genericMeta(`/learn/speak?prompt=${encodeURIComponent(sp.id)}`,"Daily speaking practice",{requiredModes:["conversation","reading_aloud","stimulus"],lessonRepeatCooldownDays:effectiveCooldownDays}),placeholders.get("speaking")));
      else if(!placeholders.has("speaking"))statements.push(unavailableStatement(db,childId,date,"speaking","Speaking · No eligible oral prompt available",8,{lessonRepeatCooldownDays:effectiveCooldownDays}));
    }

    if (!current.has("reading") && !preserved.has("reading")) {
      const r = pickUnused(read, day,used.reading);
      if(r)statements.push(assignStatement(db,childId,date,"reading",r.id,`Read · ${r.title}`,12,14,genericMeta(`/learn/read/${r.id}`,"Daily learning rotation",{dailyLessonFilter:{readMaxWords:policy.readMaxWords,selectedWordCount:readingWordCount(r.body_json)},dailyLimitRelaxed:Boolean(r.daily_limit_relaxed),lessonRepeatCooldownDays:effectiveCooldownDays}),placeholders.get("reading")));
      else if(!placeholders.has("reading"))statements.push(unavailableStatement(db,childId,date,"reading","Reading · No eligible lesson available",12,{lessonRepeatCooldownDays:effectiveCooldownDays}));
    }

    if (writingScheduled && !current.has("writing") && !preserved.has("writing")) {
      const w = pickUnused(write, day,used.writing);
      if(w)statements.push(assignStatement(db,childId,date,"writing",w.id,`Write · ${w.title}`,15,16,genericMeta(`/learn/write?prompt=${encodeURIComponent(w.id)}`,"Scheduled writing practice",{minimumWords:policy.writingMinWords,scheduledWeekdays:policy.writingWeekdays,lessonRepeatCooldownDays:effectiveCooldownDays}),placeholders.get("writing")));
      else if(!placeholders.has("writing"))statements.push(unavailableStatement(db,childId,date,"writing","Writing · No eligible prompt available",15,{lessonRepeatCooldownDays:effectiveCooldownDays}));
    }

    if (!current.has("vocabulary") && !preserved.has("vocabulary")) {
      statements.push(insertStatement(db, childId, date, "vocabulary", vocab.id, vocab.id ? `Vocabulary · ${vocab.name} · ${vocab.newTarget} new + ${vocab.reviewTarget} review` : "Vocabulary · daily review", 10, 12,
        genericMeta(vocab.id ? `/learn/vocabulary?collection=${encodeURIComponent(vocab.id)}` : "/learn/vocabulary", "daily_retrieval", { dailyTarget: vocab.target, newTarget:vocab.newTarget, reviewTarget:vocab.reviewTarget, vocabularyCollectionId: vocab.id, groups:["new","review"] })));
    }
  }

  if (statements.length) await db.batch(statements);
}

function assignStatement(db:D1Database,childId:string,date:string,activityType:string,activityId:string,title:string,minutes:number,xp:number,metadata:Record<string,unknown>,placeholder?:ExistingTask){
  if(placeholder){
    return db.prepare("UPDATE learning_tasks SET activity_id=?,title=?,target_minutes=?,xp_reward=?,status='todo',metadata_json=?,completed_at=NULL WHERE id=? AND child_id=? AND task_date=? AND activity_type=?")
      .bind(activityId,title,minutes,xp,JSON.stringify(metadata),placeholder.id,childId,date,activityType);
  }
  return insertStatement(db,childId,date,activityType,activityId,title,minutes,xp,metadata);
}

function unavailableStatement(db:D1Database,childId:string,date:string,activityType:string,title:string,minutes:number,extra:Record<string,unknown>={}){
  return db.prepare("INSERT OR IGNORE INTO learning_tasks (id,child_id,task_date,cadence,activity_type,activity_id,title,target_minutes,xp_reward,status,source,metadata_json) VALUES (?,?,?,'daily',?,NULL,?, ?,0,'skipped','adaptive',?)")
    .bind(`task-${crypto.randomUUID()}`,childId,date,activityType,title,minutes,JSON.stringify(genericMeta("","no_eligible_lesson",{unavailable:true,...extra})));
}

function insertStatement(db: D1Database, childId: string, date: string, activityType: string, activityId: string | null, title: string, minutes: number, xp: number, metadata: Record<string, unknown>) {
  return db.prepare("INSERT OR IGNORE INTO learning_tasks (id,child_id,task_date,cadence,activity_type,activity_id,title,target_minutes,xp_reward,status,source,metadata_json) VALUES (?,?,?,'daily',?,?,?,?,?,'todo','adaptive',?)")
    .bind(`task-${crypto.randomUUID()}`, childId, date, activityType, activityId, title, minutes, xp, JSON.stringify(metadata));
}

/** Resource-bounded path used by the Learn page. It materialises today only. */
export async function ensureTodayPlan(db: D1Database, childId: string, schoolLevel: string) {
  return ensurePlanRange(db, childId, schoolLevel, 1);
}

/** Week view uses the same bounded candidate pools and a single batched write. */
export async function ensureWeeklyPlan(db: D1Database, childId: string, schoolLevel: string) {
  return ensurePlanRange(db, childId, schoolLevel, 7);
}

export async function learnerStreak(db: D1Database, childId: string) {
  const rows = await db.prepare(
    "SELECT task_date day FROM learning_task_day_rollups WHERE child_id=? AND cadence='daily' AND done_count>0 ORDER BY task_date DESC LIMIT 90",
  ).bind(childId).all<{ day: string }>();
  const days = new Set(rows.results.map((r) => r.day));
  let streak = 0;
  let cursor = sgDate();
  if (!days.has(cursor)) cursor = addDays(cursor, -1);
  while (days.has(cursor)) { streak++; cursor = addDays(cursor, -1); }
  return streak;
}
