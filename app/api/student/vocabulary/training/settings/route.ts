import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession,learnerCookie } from "@/lib/student/session";
import { getTrainingSettings } from "@/lib/vocabulary/collections";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
import { getTenantDailyTaskPolicy } from "@/lib/settings/daily-task-policy";
import { getTenantPracticePolicy } from "@/lib/settings/practice-policy";
import { stageCoreVocabularyBookId } from "@/lib/vocabulary/policy-books";

export async function GET(request:Request){
 const env=getEnv(),session=await ensureLearnerSession(request,env.DB),u=new URL(request.url),practice=u.searchParams.get("practice")==="1";
 const data=await getTrainingSettings(env.DB,session.childId),ctx=await learnerTenantContext(env.DB,session.childId),dailyPolicy=await getTenantDailyTaskPolicy(env.DB,ctx.tenantId,ctx.schoolLevel),vocabularyPolicy=await getTenantPracticePolicy(env.DB,ctx.tenantId,ctx.schoolLevel,"vocabulary"),practicePolicy=practice?vocabularyPolicy:null;
 let policyCollectionId=practice?practicePolicy?.vocabularyCollectionId:dailyPolicy.vocabularyCollectionId;
 if(!policyCollectionId){const stage=practice?(practicePolicy?.contentStage||ctx.schoolLevel):ctx.schoolLevel,core=stageCoreVocabularyBookId(stage);policyCollectionId=data.collections.find(c=>c.id===core)?.id||data.collections.find(c=>c.stage===stage&&c.collectionType==="system")?.id||data.collections[0]?.id||null;}
 let collections=data.collections.map(c=>({...c,active:c.id===policyCollectionId}));
 if(policyCollectionId&&!collections.some(c=>c.id===policyCollectionId)){const assigned=await env.DB.prepare(`SELECT c.id,c.name,c.code,c.description,c.cefr_level,c.stage,COUNT(ci.vocabulary_id) item_count FROM vocabulary_collections c LEFT JOIN vocabulary_collection_items ci ON ci.collection_id=c.id WHERE c.id=? AND c.status='published' AND c.collection_type='system' GROUP BY c.id`).bind(policyCollectionId).first<{id:string;name:string;code:string|null;description:string;cefr_level:string|null;stage:string|null;item_count:number}>();if(assigned)collections=[...collections,{id:assigned.id,name:assigned.name,code:assigned.code,description:assigned.description,collectionType:"system" as const,scope:"system" as const,cefrLevel:assigned.cefr_level,stage:assigned.stage,itemCount:Number(assigned.item_count||0),masteredCount:0,completionPercent:0,averageMastery:0,active:true,dailyTarget:data.dailyTarget}];}
 const r=Response.json({...data,collections,activeCollectionId:policyCollectionId,dailyTarget:practicePolicy?.questionCount||dailyPolicy.vocabularyNewWords,newTarget:dailyPolicy.vocabularyNewWords,reviewTarget:dailyPolicy.vocabularyReviewWords,spellingRepetitions:dailyPolicy.vocabularySpellingRepetitions,reviewPolicy:{windowDays:vocabularyPolicy.vocabularyReviewWindowDays,reviewRepetitions:vocabularyPolicy.vocabularyReviewRepetitions},policyLocked:true,policyCollectionId:policyCollectionId||null,policyCollectionName:collections.find(c=>c.id===policyCollectionId)?.name||null,assignmentSource:"tenant_admin",practicePolicy});
 if(session.isNew)r.headers.set("Set-Cookie",learnerCookie(session.sessionId));return r;
}
export async function PUT(){return Response.json({error:"Daily vocabulary word books are assigned by Tenant Admin"},{status:403});}
