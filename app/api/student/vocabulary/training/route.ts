import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession,learnerCookie } from "@/lib/student/session";
import { getTrainingQueue,getTrainingSettings,recordTrainingAttempt,type TrainingMode } from "@/lib/vocabulary/collections";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
import { getTenantDailyTaskPolicy } from "@/lib/settings/daily-task-policy";
import { getTenantPracticePolicy } from "@/lib/settings/practice-policy";
import { stageCoreVocabularyBookId } from "@/lib/vocabulary/policy-books";
export async function GET(request:Request){
 const env=getEnv(),session=await ensureLearnerSession(request,env.DB),u=new URL(request.url),settings=await getTrainingSettings(env.DB,session.childId),ctx=await learnerTenantContext(env.DB,session.childId),dailyPolicy=await getTenantDailyTaskPolicy(env.DB,ctx.tenantId,ctx.schoolLevel),practice=u.searchParams.get("practice")==="1";
 const vocabularyPolicy=await getTenantPracticePolicy(env.DB,ctx.tenantId,ctx.schoolLevel,"vocabulary"),practicePolicy=practice?vocabularyPolicy:null;
 let policyCollection=practice?practicePolicy?.vocabularyCollectionId:dailyPolicy.vocabularyCollectionId;
 if(!policyCollection){const stage=practice?(practicePolicy?.contentStage||ctx.schoolLevel):ctx.schoolLevel,core=stageCoreVocabularyBookId(stage);policyCollection=settings.collections.find(c=>c.id===core)?.id||settings.collections.find(c=>c.stage===stage&&c.collectionType==="system")?.id||settings.collections[0]?.id||null;}
 const collectionId=policyCollection;if(!collectionId)return Response.json({error:"No vocabulary collection is available for the configured stage"},{status:404});
 const group=u.searchParams.get("group")==="review"?"review":u.searchParams.get("group")==="new"?"new":"mixed";
 const requested=Number(u.searchParams.get("count")||0),count=practicePolicy?.questionCount||(group==="review"?dailyPolicy.vocabularyReviewWords:group==="new"?dailyPolicy.vocabularyNewWords:dailyPolicy.vocabularyNewWords)||requested||settings.dailyTarget||10;
 const reviewPolicy={windowDays:vocabularyPolicy.vocabularyReviewWindowDays,reviewRepetitions:vocabularyPolicy.vocabularyReviewRepetitions,difficulty:practicePolicy?.difficulty||("adaptive" as const)};
 const items=await getTrainingQueue(env.DB,session.childId,collectionId,count,reviewPolicy,group);const collection=settings.collections.find(c=>c.id===collectionId)||null;
 const r=Response.json({collection,items,dailyTarget:count,newTarget:dailyPolicy.vocabularyNewWords,reviewTarget:dailyPolicy.vocabularyReviewWords,spellingRepetitions:dailyPolicy.vocabularySpellingRepetitions,group,policyLocked:true,policyCollectionId:policyCollection||null,reviewPolicy:practicePolicy?{windowDays:practicePolicy.vocabularyReviewWindowDays,reviewRepetitions:practicePolicy.vocabularyReviewRepetitions}:null,practicePolicy});if(session.isNew)r.headers.set("Set-Cookie",learnerCookie(session.sessionId));return r;
}
export async function POST(request:Request){const env=getEnv(),session=await ensureLearnerSession(request,env.DB);try{const body=await request.json() as {collectionId?:unknown;vocabularyId?:unknown;mode?:unknown;correct?:unknown;response?:unknown};const modes=new Set<TrainingMode>(["pronounce","meaning","dictation","definition_spelling","cloze"]);const mode=typeof body.mode==="string"&&modes.has(body.mode as TrainingMode)?body.mode as TrainingMode:null;if(!mode||typeof body.collectionId!=="string"||typeof body.vocabularyId!=="string")return Response.json({error:"Invalid training attempt"},{status:400});const progress=await recordTrainingAttempt(env.DB,{childId:session.childId,collectionId:body.collectionId,vocabularyId:body.vocabularyId,mode,correct:Boolean(body.correct),response:typeof body.response==="string"?body.response:""});return Response.json({ok:true,progress});}catch(e){return Response.json({error:e instanceof Error?e.message:"Could not save training attempt"},{status:400});}}
