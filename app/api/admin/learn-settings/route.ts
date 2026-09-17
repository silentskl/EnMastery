import { getEnv } from "@/lib/cloudflare";
import { requireTenantSession } from "@/lib/auth/tenant";
import { LEARNING_STAGES, isLearningStage, type LearningStage } from "@/lib/language/stages";
import { clampLessonLimit, type LearnDomain } from "@/lib/tenant/lesson-availability";
import { clampPassScore, clampDailyGameMinutes, clampLessonRepeatCooldownDays, getTenantPassScore, getTenantDailyGameMinutes, getTenantLessonRepeatCooldownDays } from "@/lib/settings/learning-policy";
import { clampListenVideoMaxSeconds, clampReadMaxWords, clampVocabularyDailyWords, clampWritingMinWords, clampWritingWeekdays, getTenantDailyTaskPolicy } from "@/lib/settings/daily-task-policy";
import { listPolicyVocabularyBooks, validatePolicyVocabularyBook } from "@/lib/vocabulary/policy-books";

const domains: LearnDomain[] = ["listen", "speak", "read", "write"];
async function publishedCount(db: D1Database, tenantId: string, level: LearningStage, domain: LearnDomain) {
  const types = domain === "listen" ? ["audio", "video_ref"] : domain === "speak" ? ["oral_prompt"] : domain === "read" ? ["article", "lesson"] : ["writing_prompt"];
  const marks = types.map(() => "?").join(",");
  const row = await db.prepare(`SELECT COUNT(*) n FROM content_items WHERE status='published' AND school_level=? AND content_type IN (${marks}) AND (scope='global' OR (scope='tenant' AND tenant_id=?))`).bind(level, ...types, tenantId).first<{ n: number }>();
  return Number(row?.n || 0);
}
export async function GET(request: Request) {
  const auth = await requireTenantSession(request); if (auth.response) return auth.response; const s = auth.session!, db = getEnv().DB;
  const saved = await db.prepare("SELECT school_level,domain,lesson_limit FROM tenant_learn_availability WHERE tenant_id=? ORDER BY school_level,domain").bind(s.tenant_id).all<{ school_level: LearningStage; domain: LearnDomain; lesson_limit: number }>();
  const map = new Map<string, number>(saved.results.map((x): [string, number] => [`${x.school_level}:${x.domain}`, Number(x.lesson_limit)]));
  const rows: Array<{ schoolLevel: LearningStage; domain: LearnDomain; published: number; lessonLimit: number }> = [];
  const policies = [] as Array<{ schoolLevel: LearningStage; listenVideoMaxSeconds: number; readMaxWords: number; vocabularyDailyWords: number; vocabularyCollectionId:string|null; writingWeekdays:number[]; writingMinWords:number }>;
  for (const schoolLevel of LEARNING_STAGES) {
    for (const domain of domains) { const published = await publishedCount(db, s.tenant_id, schoolLevel, domain); rows.push({ schoolLevel, domain, published, lessonLimit: map.get(`${schoolLevel}:${domain}`) ?? Math.min(200, published) }); }
    const policy=await getTenantDailyTaskPolicy(db,s.tenant_id,schoolLevel); policies.push({schoolLevel:policy.schoolLevel,listenVideoMaxSeconds:policy.listenVideoMaxSeconds,readMaxWords:policy.readMaxWords,vocabularyDailyWords:policy.vocabularyDailyWords,vocabularyCollectionId:policy.vocabularyCollectionId,writingWeekdays:policy.writingWeekdays,writingMinWords:policy.writingMinWords});
  }
  return Response.json({ settings: rows, dailyTaskPolicies: policies, vocabularyCollections:await listPolicyVocabularyBooks(db,s.tenant_id), passScore: await getTenantPassScore(db, s.tenant_id), dailyGameMinutes: await getTenantDailyGameMinutes(db,s.tenant_id), lessonRepeatCooldownDays:await getTenantLessonRepeatCooldownDays(db,s.tenant_id) });
}
export async function PUT(request: Request) {
  const auth = await requireTenantSession(request); if (auth.response) return auth.response; const s = auth.session!, db = getEnv().DB;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>; if (!isLearningStage(body.schoolLevel)) return Response.json({ error: "Choose a valid learning stage" }, { status: 400 });
  const schoolLevel = body.schoolLevel, raw = (body.limits && typeof body.limits === "object" ? body.limits : {}) as Record<string, unknown>, rawPolicy = (body.dailyTaskPolicy && typeof body.dailyTaskPolicy === "object" ? body.dailyTaskPolicy : {}) as Record<string, unknown>;
  let vocabularyCollectionId:string|null;try{vocabularyCollectionId=await validatePolicyVocabularyBook(db,rawPolicy.vocabularyCollectionId,s.tenant_id);}catch(e){return Response.json({error:e instanceof Error?e.message:"Choose a valid vocabulary word book"},{status:400});}
  const previousCooldownDays=await getTenantLessonRepeatCooldownDays(db,s.tenant_id);
  const passScore = clampPassScore(body.passScore), dailyGameMinutes=clampDailyGameMinutes(body.dailyGameMinutes), lessonRepeatCooldownDays=clampLessonRepeatCooldownDays(body.lessonRepeatCooldownDays), listenVideoMaxSeconds = clampListenVideoMaxSeconds(rawPolicy.listenVideoMaxSeconds), readMaxWords = clampReadMaxWords(rawPolicy.readMaxWords), vocabularyDailyWords = clampVocabularyDailyWords(rawPolicy.vocabularyDailyWords), writingWeekdays=clampWritingWeekdays(rawPolicy.writingWeekdays), writingMinWords=clampWritingMinWords(rawPolicy.writingMinWords);
  const stmts = domains.map((domain) => db.prepare(`INSERT INTO tenant_learn_availability(tenant_id,school_level,domain,lesson_limit,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(tenant_id,school_level,domain) DO UPDATE SET lesson_limit=excluded.lesson_limit,updated_at=CURRENT_TIMESTAMP`).bind(s.tenant_id, schoolLevel, domain, clampLessonLimit(raw[domain])));
  stmts.push(db.prepare(`INSERT INTO tenant_learning_policy(tenant_id,pass_score,daily_game_minutes,lesson_repeat_cooldown_days,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(tenant_id) DO UPDATE SET pass_score=excluded.pass_score,daily_game_minutes=excluded.daily_game_minutes,lesson_repeat_cooldown_days=excluded.lesson_repeat_cooldown_days,updated_at=CURRENT_TIMESTAMP`).bind(s.tenant_id, passScore,dailyGameMinutes,lessonRepeatCooldownDays));
  stmts.push(db.prepare(`INSERT INTO tenant_daily_task_policy(tenant_id,school_level,listen_video_max_seconds,read_max_words,vocabulary_daily_words,vocabulary_collection_id,writing_weekdays_json,writing_min_words,updated_at) VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(tenant_id,school_level) DO UPDATE SET listen_video_max_seconds=excluded.listen_video_max_seconds,read_max_words=excluded.read_max_words,vocabulary_daily_words=excluded.vocabulary_daily_words,vocabulary_collection_id=excluded.vocabulary_collection_id,writing_weekdays_json=excluded.writing_weekdays_json,writing_min_words=excluded.writing_min_words,updated_at=CURRENT_TIMESTAMP`).bind(s.tenant_id, schoolLevel, listenVideoMaxSeconds, readMaxWords, vocabularyDailyWords,vocabularyCollectionId,JSON.stringify(writingWeekdays),writingMinWords));
  await db.batch(stmts);
  if(previousCooldownDays!==lessonRepeatCooldownDays){
    // Cooldown is Tenant-wide, so every learner stage must discard future unstarted
    // lesson rotations when the window changes.
    await db.prepare(`DELETE FROM learning_tasks WHERE source='adaptive' AND status IN ('todo','skipped') AND activity_type IN ('listening','speaking','reading','writing') AND task_date>=date('now','+8 hours') AND child_id IN (SELECT id FROM child_profiles WHERE tenant_id=?)`).bind(s.tenant_id).run();
  }else{
    await db.prepare(`DELETE FROM learning_tasks WHERE source='adaptive' AND status IN ('todo','skipped') AND activity_type IN ('listening','speaking','reading','writing','vocabulary') AND task_date>=date('now','+8 hours') AND child_id IN (SELECT id FROM child_profiles WHERE tenant_id=? AND school_level=?)`).bind(s.tenant_id, schoolLevel).run();
  }
  return Response.json({ ok: true, schoolLevel, passScore,dailyGameMinutes,lessonRepeatCooldownDays, dailyTaskPolicy: { listenVideoMaxSeconds, readMaxWords, vocabularyDailyWords,vocabularyCollectionId,writingWeekdays,writingMinWords } });
}
