import { getEnv } from "@/lib/cloudflare";
import { requireTenantSession } from "@/lib/auth/tenant";
import { createTenantCustomCollection } from "@/lib/vocabulary/collections";
import { parseVocabularyImportText } from "@/lib/vocabulary/import";
import { createJob,failJob } from "@/lib/jobs/store";
import { dispatchJob } from "@/lib/jobs/dispatch";
export async function POST(request:Request){
 const a=await requireTenantSession(request);if(a.response)return a.response;const s=a.session!,env=getEnv();
 try{
  const body=await request.json().catch(()=>({})) as Record<string,unknown>,mode=body.mode==="new"?"new":"existing",raw=typeof body.text==="string"?body.text:"";
  if(new TextEncoder().encode(raw).byteLength>2_000_000)return Response.json({error:"Import input is too large (max 2 MB per task)"},{status:413});
  const items=parseVocabularyImportText(raw,2000);if(!items.length)return Response.json({error:"Add at least one valid word or phrase"},{status:400});
  let collectionId="",created=false;
  if(mode==="new"){collectionId=await createTenantCustomCollection(env.DB,s.tenant_id,typeof body.name==="string"?body.name:"",typeof body.description==="string"?body.description:"",typeof body.stage==="string"?body.stage:null);created=true;}
  else{collectionId=typeof body.collectionId==="string"?body.collectionId.trim():"";const owned=await env.DB.prepare("SELECT id FROM vocabulary_collections WHERE id=? AND tenant_id=? AND collection_type='custom' AND status='published'").bind(collectionId,s.tenant_id).first<{id:string}>();if(!owned)return Response.json({error:"Choose one of this Tenant's word books"},{status:400});}
  const jobId=await createJob(env.DB,{jobType:"vocabulary_import",entityType:"vocabulary_collection",entityId:collectionId,tenantId:s.tenant_id,scope:"tenant",createdBy:s.user_id,maxRetries:2,request:{tenantId:s.tenant_id,collectionId,sourceName:typeof body.sourceName==="string"?body.sourceName.slice(0,120):"editor",items,cursor:0,stats:{added:0,updated:0,skipped:0,failed:0}}});
  try{await dispatchJob(jobId,env);return Response.json({ok:true,jobId,collectionId,created,total:items.length,status:"queued"},{status:202});}catch(e){await failJob(env.DB,jobId,e);return Response.json({error:e instanceof Error?e.message:"Could not enqueue vocabulary import",jobId,collectionId,created},{status:503});}
 }catch(e){return Response.json({error:e instanceof Error?e.message:"Could not create vocabulary import task"},{status:400});}
}
