import { getEnv } from "@/lib/cloudflare";
import { requireTenantSession } from "@/lib/auth/tenant";
import { createTenantCustomCollection,listTenantVocabularyCollections } from "@/lib/vocabulary/collections";
export async function GET(request:Request){const a=await requireTenantSession(request);if(a.response)return a.response;return Response.json({collections:await listTenantVocabularyCollections(getEnv().DB,a.session!.tenant_id)});}
export async function POST(request:Request){const a=await requireTenantSession(request);if(a.response)return a.response;try{const b=await request.json().catch(()=>({})) as Record<string,unknown>;const id=await createTenantCustomCollection(getEnv().DB,a.session!.tenant_id,typeof b.name==="string"?b.name:"",typeof b.description==="string"?b.description:"",typeof b.stage==="string"?b.stage:null);return Response.json({ok:true,id},{status:201});}catch(e){return Response.json({error:e instanceof Error?e.message:"Could not create word book"},{status:400});}}
