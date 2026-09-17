import {getEnv} from "@/lib/cloudflare";
import {requireTenantSession} from "@/lib/auth/tenant";

export async function PUT(request:Request){
 const auth=await requireTenantSession(request);if(auth.response)return auth.response;
 const body=await request.json().catch(()=>({})) as Record<string,unknown>,collectionId=typeof body.collectionId==="string"?body.collectionId.trim():"",visible=body.visible;
 if(!collectionId||typeof visible!=="boolean")return Response.json({error:"collectionId and visible are required"},{status:400});
 const db=getEnv().DB,book=await db.prepare("SELECT id FROM vocabulary_collections WHERE id=? AND collection_type='system' AND status='published'").bind(collectionId).first<{id:string}>();
 if(!book)return Response.json({error:"Published System word book not found"},{status:404});
 await db.prepare(`INSERT INTO tenant_system_vocabulary_visibility(tenant_id,collection_id,visible,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP)
   ON CONFLICT(tenant_id,collection_id) DO UPDATE SET visible=excluded.visible,updated_at=CURRENT_TIMESTAMP`).bind(auth.session!.tenant_id,collectionId,visible?1:0).run();
 return Response.json({ok:true,collectionId,visible});
}
