import { getEnv } from "@/lib/cloudflare";
import { requireTenantSession } from "@/lib/auth/tenant";
import { getContent } from "@/lib/content/store";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const a=await requireTenantSession(request);if(a.response)return a.response;const s=a.session!,{id}=await params,env=getEnv();const owned=await env.DB.prepare("SELECT id FROM content_items WHERE id=? AND ((scope='global' AND status='published') OR (scope='tenant' AND tenant_id=?))").bind(id,s.tenant_id).first();if(!owned)return Response.json({error:"Content not found"},{status:404});const content=await getContent(env.DB,id,false);return content?Response.json({content}):Response.json({error:"Content not found"},{status:404});}
