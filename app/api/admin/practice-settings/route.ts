import { getEnv } from "@/lib/cloudflare";
import { requireTenantSession } from "@/lib/auth/tenant";
import { LEARNING_STAGES, isLearningStage, type LearningStage } from "@/lib/language/stages";
import {
  PRACTICE_ACTIVITIES, clampPracticeCount, clampVocabularyReviewRepetitions, clampVocabularyReviewWindowDays,
  isPracticeActivity, isPracticeDifficulty, type PracticeActivity, type PracticeDifficulty,
} from "@/lib/settings/practice-policy";
import { listPolicyVocabularyBooks, validatePolicyVocabularyBook } from "@/lib/vocabulary/policy-books";

type Row={learner_stage:LearningStage;activity:PracticeActivity;content_stage:LearningStage;question_count:number;difficulty:PracticeDifficulty;vocabulary_review_window_days:number;vocabulary_review_repetitions:number;vocabulary_collection_id:string|null};
export async function GET(request:Request){
 const auth=await requireTenantSession(request);if(auth.response)return auth.response;const db=getEnv().DB,s=auth.session!;
 const rows=await db.prepare("SELECT learner_stage,activity,content_stage,question_count,difficulty,vocabulary_review_window_days,vocabulary_review_repetitions,vocabulary_collection_id FROM tenant_practice_policy WHERE tenant_id=? ORDER BY learner_stage,activity").bind(s.tenant_id).all<Row>();
 return Response.json({stages:LEARNING_STAGES,activities:PRACTICE_ACTIVITIES,vocabularyCollections:await listPolicyVocabularyBooks(db,s.tenant_id),settings:rows.results.map((r:Row)=>({learnerStage:r.learner_stage,activity:r.activity,contentStage:r.content_stage,questionCount:Number(r.question_count),difficulty:r.difficulty,vocabularyReviewWindowDays:Number(r.vocabulary_review_window_days||7),vocabularyReviewRepetitions:Number(r.vocabulary_review_repetitions??2),vocabularyCollectionId:r.vocabulary_collection_id||null}))});
}
export async function PUT(request:Request){
 const auth=await requireTenantSession(request);if(auth.response)return auth.response;const db=getEnv().DB,s=auth.session!,body=await request.json().catch(()=>({}))as Record<string,unknown>;
 if(!isLearningStage(body.learnerStage))return Response.json({error:"Choose a valid learner stage"},{status:400});
 const raw=Array.isArray(body.settings)?body.settings:[];const stmts:D1PreparedStatement[]=[];
 for(const item of raw){
  if(!item||typeof item!=="object")continue;const x=item as Record<string,unknown>;if(!isPracticeActivity(x.activity)||!isLearningStage(x.contentStage))continue;
  const difficulty=isPracticeDifficulty(x.difficulty)?x.difficulty:"adaptive";const reviewWindow=x.activity==="vocabulary"?clampVocabularyReviewWindowDays(x.vocabularyReviewWindowDays):7;const reviewRepetitions=x.activity==="vocabulary"?clampVocabularyReviewRepetitions(x.vocabularyReviewRepetitions):2;
  let vocabularyCollectionId:string|null=null;if(x.activity==="vocabulary"){try{vocabularyCollectionId=await validatePolicyVocabularyBook(db,x.vocabularyCollectionId,s.tenant_id);}catch(e){return Response.json({error:e instanceof Error?e.message:"Choose a valid vocabulary word book"},{status:400});}}
  stmts.push(db.prepare(`INSERT INTO tenant_practice_policy(tenant_id,learner_stage,activity,content_stage,question_count,difficulty,vocabulary_review_window_days,vocabulary_review_repetitions,vocabulary_collection_id,updated_at) VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(tenant_id,learner_stage,activity) DO UPDATE SET content_stage=excluded.content_stage,question_count=excluded.question_count,difficulty=excluded.difficulty,vocabulary_review_window_days=excluded.vocabulary_review_window_days,vocabulary_review_repetitions=excluded.vocabulary_review_repetitions,vocabulary_collection_id=excluded.vocabulary_collection_id,updated_at=CURRENT_TIMESTAMP`).bind(s.tenant_id,body.learnerStage,x.activity,x.contentStage,clampPracticeCount(x.questionCount,x.activity),difficulty,reviewWindow,reviewRepetitions,vocabularyCollectionId));
 }
 if(!stmts.length)return Response.json({error:"No valid practice settings supplied"},{status:400});await db.batch(stmts);return Response.json({ok:true,learnerStage:body.learnerStage});
}
