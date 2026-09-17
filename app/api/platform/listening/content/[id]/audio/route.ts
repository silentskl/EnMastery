import { getEnv } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import { serveR2Audio } from "@/lib/listening/audio-serve";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const denied=await requireAdmin(request);if(denied)return denied;const env=getEnv();const{id}=await params;const row=await env.DB.prepare("SELECT r2_key,mime_type,byte_length FROM content_audio_assets WHERE content_id=?").bind(id).first<{r2_key:string;mime_type:string;byte_length:number}>();if(!row)return new Response("Not found",{status:404});return serveR2Audio(request,env.MEDIA,{key:row.r2_key,mimeType:row.mime_type,size:row.byte_length});}
