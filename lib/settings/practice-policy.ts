import { LEARNING_STAGES, normalizeLearningStage, type LearningStage } from "@/lib/language/stages";

export const PRACTICE_ACTIVITIES = ["listening","speaking","reading","writing","vocabulary","grammar","cloze"] as const;
export type PracticeActivity = (typeof PRACTICE_ACTIVITIES)[number];
export const PRACTICE_DIFFICULTIES = ["adaptive","easy","medium","hard"] as const;
export type PracticeDifficulty = (typeof PRACTICE_DIFFICULTIES)[number];

export type TenantPracticePolicy = {
  learnerStage: LearningStage;
  activity: PracticeActivity;
  contentStage: LearningStage;
  questionCount: number;
  difficulty: PracticeDifficulty;
  vocabularyReviewWindowDays: number;
  vocabularyReviewRepetitions: number;
  vocabularyCollectionId: string | null;
};

const DEFAULT_COUNTS: Record<PracticeActivity,number> = {listening:5,speaking:3,reading:10,writing:1,vocabulary:10,grammar:10,cloze:10};
export function isPracticeActivity(value:unknown): value is PracticeActivity { return typeof value === "string" && (PRACTICE_ACTIVITIES as readonly string[]).includes(value); }
export function isPracticeDifficulty(value:unknown): value is PracticeDifficulty { return typeof value === "string" && (PRACTICE_DIFFICULTIES as readonly string[]).includes(value); }
export function clampPracticeCount(value:unknown,activity:PracticeActivity){const n=Math.round(Number(value));return Math.max(1,Math.min(50,Number.isFinite(n)?n:DEFAULT_COUNTS[activity]));}
export function clampVocabularyReviewWindowDays(value:unknown){const n=Math.round(Number(value));return Number.isFinite(n)?Math.max(1,Math.min(30,n)):7;}
export function clampVocabularyReviewRepetitions(value:unknown){const n=Math.round(Number(value));return Number.isFinite(n)?Math.max(0,Math.min(10,n)):2;}
export function difficultyRange(value:PracticeDifficulty):[number,number]|null { if(value==="easy")return[1,2];if(value==="medium")return[3,3];if(value==="hard")return[4,5];return null; }

export async function getTenantPracticePolicy(db:D1Database,tenantId:string,learnerStage:LearningStage,activity:PracticeActivity):Promise<TenantPracticePolicy>{
  const row=await db.prepare("SELECT content_stage,question_count,difficulty,vocabulary_review_window_days,vocabulary_review_repetitions,vocabulary_collection_id FROM tenant_practice_policy WHERE tenant_id=? AND learner_stage=? AND activity=?")
    .bind(tenantId,learnerStage,activity).first<{content_stage:string;question_count:number;difficulty:string;vocabulary_review_window_days:number;vocabulary_review_repetitions:number;vocabulary_collection_id:string|null}>().catch(()=>null);
  return {
    learnerStage,activity,
    contentStage:normalizeLearningStage(row?.content_stage,learnerStage),
    questionCount:clampPracticeCount(row?.question_count,activity),
    difficulty:isPracticeDifficulty(row?.difficulty)?row.difficulty:"adaptive",
    vocabularyReviewWindowDays:clampVocabularyReviewWindowDays(row?.vocabulary_review_window_days),
    vocabularyReviewRepetitions:clampVocabularyReviewRepetitions(row?.vocabulary_review_repetitions),
    vocabularyCollectionId:row?.vocabulary_collection_id || null,
  };
}

export async function ensureTenantPracticeDefaults(db:D1Database,tenantId:string){
  const stmts:D1PreparedStatement[]=[];
  for(const learnerStage of LEARNING_STAGES)for(const activity of PRACTICE_ACTIVITIES)stmts.push(db.prepare(
    "INSERT OR IGNORE INTO tenant_practice_policy(tenant_id,learner_stage,activity,content_stage,question_count,difficulty,vocabulary_review_window_days,vocabulary_review_repetitions) VALUES(?,?,?,?,?,'adaptive',7,2)"
  ).bind(tenantId,learnerStage,activity,learnerStage,DEFAULT_COUNTS[activity]));
  if(stmts.length)await db.batch(stmts);
}
