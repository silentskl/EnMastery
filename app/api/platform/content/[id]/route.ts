import { getEnv } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import { getContent } from "@/lib/content/store";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const denied=await requireAdmin(request);if(denied)return denied;const{id}=await params;const env=getEnv();const content=await getContent(env.DB,id,false);if(!content)return Response.json({error:"Content not found"},{status:404});return Response.json({content});}
