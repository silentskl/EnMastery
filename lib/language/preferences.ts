import { defaultLearningStage, normalizeLearningStage, type LearningStage } from "@/lib/language/stages";

export async function getLanguagePreferences(db:D1Database, childId:string){
  const child=await db.prepare("SELECT school_level FROM child_profiles WHERE id=?").bind(childId).first<{school_level:string}>();
  const fallback=defaultLearningStage(child?.school_level);
  const row=await db.prepare("SELECT vocabulary_stage,grammar_stage FROM learner_language_preferences WHERE child_id=?").bind(childId).first<{vocabulary_stage:string;grammar_stage:string}>();
  return {vocabularyStage:normalizeLearningStage(row?.vocabulary_stage,fallback),grammarStage:normalizeLearningStage(row?.grammar_stage,fallback)};
}

export async function setLanguagePreference(db:D1Database,childId:string,module:"vocabulary"|"grammar",stage:LearningStage){
  const current=await getLanguagePreferences(db,childId);
  const vocabularyStage=module==="vocabulary"?stage:current.vocabularyStage;
  const grammarStage=module==="grammar"?stage:current.grammarStage;
  await db.prepare(`INSERT INTO learner_language_preferences (child_id,vocabulary_stage,grammar_stage,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(child_id) DO UPDATE SET vocabulary_stage=excluded.vocabulary_stage,grammar_stage=excluded.grammar_stage,updated_at=CURRENT_TIMESTAMP`)
    .bind(childId,vocabularyStage,grammarStage).run();
  return {vocabularyStage,grammarStage};
}
