import { normalizeLearningStage, type LearningStage } from "@/lib/language/stages";

export type TenantDailyTaskPolicy = {
  schoolLevel: LearningStage;
  listenVideoMaxSeconds: number;
  readMaxWords: number;
  vocabularyDailyWords: number;
  vocabularyNewWords: number;
  vocabularyReviewWords: number;
  vocabularySpellingRepetitions: number;
  vocabularyCollectionId: string | null;
  writingWeekdays: number[];
  writingMinWords: number;
};

export const DEFAULT_DAILY_TASK_POLICY = {
  listenVideoMaxSeconds: 0,
  readMaxWords: 0,
  vocabularyDailyWords: 10,
  vocabularyNewWords: 10,
  vocabularyReviewWords: 10,
  vocabularySpellingRepetitions: 3,
  writingWeekdays: [1,3,5] as number[],
  writingMinWords: 120,
} as const;

export function clampListenVideoMaxSeconds(value: unknown): number { const n=Math.round(Number(value)); return Number.isFinite(n)?Math.max(0,Math.min(7200,n)):0; }
export function clampReadMaxWords(value: unknown): number { const n=Math.round(Number(value)); return Number.isFinite(n)?Math.max(0,Math.min(10000,n)):0; }
export function clampVocabularyDailyWords(value: unknown): number { const n=Math.round(Number(value)); return Number.isFinite(n)?Math.max(1,Math.min(50,n)):10; }
export function clampVocabularyReviewWords(value: unknown): number { const n=Math.round(Number(value)); return Number.isFinite(n)?Math.max(0,Math.min(100,n)):10; }
export function clampVocabularySpellingRepetitions(value: unknown): number { const n=Math.round(Number(value)); return Number.isFinite(n)?Math.max(1,Math.min(10,n)):3; }
export function clampWritingMinWords(value:unknown):number { const n=Math.round(Number(value)); return Number.isFinite(n)?Math.max(40,Math.min(1000,n)):120; }
export function clampWritingWeekdays(value: unknown): number[] {
  let raw: unknown[] = [];
  if (Array.isArray(value)) {
    raw = value;
  } else if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      raw = Array.isArray(parsed) ? parsed : [];
    } catch {
      raw = [];
    }
  }
  const normalized = raw
    .map((item: unknown): number => Number(item))
    .filter((n: number): boolean => Number.isInteger(n) && n >= 1 && n <= 7);
  const out = Array.from(new Set<number>(normalized)).sort((a: number, b: number) => a - b);
  return out.length ? out : [1, 3, 5];
}
export function singaporeWeekday(dateString:string):number{
  const d=new Date(`${dateString}T12:00:00+08:00`);const day=d.getUTCDay();return day===0?7:day;
}
export function writingScheduledForDate(policy:Pick<TenantDailyTaskPolicy,"writingWeekdays">,dateString:string){return policy.writingWeekdays.includes(singaporeWeekday(dateString));}

export async function getTenantDailyTaskPolicy(db:D1Database,tenantId:string,schoolLevel:LearningStage):Promise<TenantDailyTaskPolicy>{
  const level=normalizeLearningStage(schoolLevel);
  const row=await db.prepare("SELECT listen_video_max_seconds,read_max_words,vocabulary_daily_words,vocabulary_new_words,vocabulary_review_words,vocabulary_spelling_repetitions,vocabulary_collection_id,writing_weekdays_json,writing_min_words FROM tenant_daily_task_policy WHERE tenant_id=? AND school_level=?")
    .bind(tenantId,level).first<{listen_video_max_seconds:number;read_max_words:number;vocabulary_daily_words:number;vocabulary_new_words:number;vocabulary_review_words:number;vocabulary_spelling_repetitions:number;vocabulary_collection_id:string|null;writing_weekdays_json:string;writing_min_words:number}>().catch(()=>null);
  return {
    schoolLevel:level,
    listenVideoMaxSeconds:clampListenVideoMaxSeconds(row?.listen_video_max_seconds ?? DEFAULT_DAILY_TASK_POLICY.listenVideoMaxSeconds),
    readMaxWords:clampReadMaxWords(row?.read_max_words ?? DEFAULT_DAILY_TASK_POLICY.readMaxWords),
    vocabularyDailyWords:clampVocabularyDailyWords(row?.vocabulary_daily_words ?? DEFAULT_DAILY_TASK_POLICY.vocabularyDailyWords),
    vocabularyNewWords:clampVocabularyDailyWords(row?.vocabulary_new_words ?? row?.vocabulary_daily_words ?? DEFAULT_DAILY_TASK_POLICY.vocabularyNewWords),
    vocabularyReviewWords:clampVocabularyReviewWords(row?.vocabulary_review_words ?? row?.vocabulary_daily_words ?? DEFAULT_DAILY_TASK_POLICY.vocabularyReviewWords),
    vocabularySpellingRepetitions:clampVocabularySpellingRepetitions(row?.vocabulary_spelling_repetitions ?? DEFAULT_DAILY_TASK_POLICY.vocabularySpellingRepetitions),
    vocabularyCollectionId:row?.vocabulary_collection_id || null,
    writingWeekdays:clampWritingWeekdays(row?.writing_weekdays_json ?? DEFAULT_DAILY_TASK_POLICY.writingWeekdays),
    writingMinWords:clampWritingMinWords(row?.writing_min_words ?? DEFAULT_DAILY_TASK_POLICY.writingMinWords),
  };
}
