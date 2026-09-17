import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { serveR2Audio } from "@/lib/listening/audio-serve";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB),{tenantId}=await learnerTenantContext(env.DB,session.childId),{id}=await params;
  const row=await env.DB.prepare("SELECT a.r2_key,a.mime_type,a.byte_length FROM content_audio_assets a JOIN content_items c ON c.id=a.content_id WHERE a.content_id=? AND c.status='published' AND (c.scope='global' OR (c.scope='tenant' AND c.tenant_id=?))").bind(id,tenantId).first<{r2_key:string;mime_type:string;byte_length:number}>();
  if(!row)return new Response("Not found",{status:404});const response=await serveR2Audio(request,env.MEDIA,{key:row.r2_key,mimeType:row.mime_type,size:row.byte_length});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}
