import { LEARNING_STAGES, type LearningStage } from "@/lib/language/stages";

export const DEFAULT_VOCABULARY_SPECIALIST_DAILY_WORDS = 10;
export const MIN_VOCABULARY_SPECIALIST_DAILY_WORDS = 10;
export const MAX_VOCABULARY_SPECIALIST_DAILY_WORDS = 30;

export function clampVocabularySpecialistDailyWords(value: unknown) {
  const n = Math.round(Number(value));
  return Number.isFinite(n)
    ? Math.max(MIN_VOCABULARY_SPECIALIST_DAILY_WORDS, Math.min(MAX_VOCABULARY_SPECIALIST_DAILY_WORDS, n))
    : DEFAULT_VOCABULARY_SPECIALIST_DAILY_WORDS;
}

export async function getVocabularySpecialistPolicy(db: D1Database, tenantId: string, learnerStage: LearningStage) {
  const row = await db.prepare("SELECT daily_words FROM tenant_vocabulary_specialist_policy WHERE tenant_id=? AND learner_stage=?")
    .bind(tenantId, learnerStage).first<{ daily_words: number }>().catch(() => null);
  return { learnerStage, dailyWords: clampVocabularySpecialistDailyWords(row?.daily_words) };
}

export async function ensureVocabularySpecialistDefaults(db: D1Database, tenantId: string) {
  const statements = LEARNING_STAGES.map(stage => db.prepare(
    "INSERT OR IGNORE INTO tenant_vocabulary_specialist_policy(tenant_id,learner_stage,daily_words) VALUES(?,?,?)"
  ).bind(tenantId, stage, DEFAULT_VOCABULARY_SPECIALIST_DAILY_WORDS));
  if (statements.length) await db.batch(statements);
}
