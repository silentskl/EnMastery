import { resolveLearnerIntegrations } from "@/lib/settings/learner-runtime";
import { learnerCookie } from "@/lib/student/session";
import { addVocabularyToCollection,ensureCollectionAccess } from "@/lib/vocabulary/collections";
import { listVocabulary, saveVocabulary } from "@/lib/vocabulary/store";
import { validateVocabularyDetail } from "@/lib/vocabulary/enrich";

export async function GET(request:Request){
  const {env,session}=await resolveLearnerIntegrations(request);
  const items=await listVocabulary(env.DB,session.childId);
  const now=Date.now();
  const stats={total:items.length,due:items.filter(x=>!x.nextReviewAt||new Date(x.nextReviewAt).getTime()<=now).length,phrases:items.filter(x=>x.detail.entryType==="phrase").length,mastered:items.filter(x=>x.status==="mastered"||x.mastery>=85).length};
  const res=Response.json({items,stats});if(session.isNew)res.headers.set("Set-Cookie",learnerCookie(session.sessionId));return res;
}

export async function POST(request:Request){
  const {env,session}=await resolveLearnerIntegrations(request);
  try{
    const body=await request.json() as {detail?:unknown;term?:unknown;sourceContentId?:unknown;sourceSentence?:unknown;collectionId?:unknown};
    const requested=typeof body.term==="string"?body.term:body.detail&&typeof body.detail==="object"&&"term" in body.detail?String((body.detail as {term?:unknown}).term||""):"";
    const detail=validateVocabularyDetail(body.detail,requested);
    const collectionId=typeof body.collectionId==="string"?body.collectionId.trim():"";
    if(collectionId){const collection=await ensureCollectionAccess(env.DB,session.childId,collectionId);if(collection.collection_type!=="custom")throw new Error("Choose an available Tenant custom word book");}
    const id=await saveVocabulary(env.DB,{childId:session.childId,detail,sourceContentId:typeof body.sourceContentId==="string"?body.sourceContentId:null,sourceSentence:typeof body.sourceSentence==="string"?body.sourceSentence.slice(0,700):null,model:env.MODELBRIDGE_CHAT_MODEL||null});
    if(collectionId)await addVocabularyToCollection(env.DB,session.childId,collectionId,id);
    const res=Response.json({ok:true,id,collectionId:collectionId||null});if(session.isNew)res.headers.set("Set-Cookie",learnerCookie(session.sessionId));return res;
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Could not save vocabulary."},{status:400});}
}
