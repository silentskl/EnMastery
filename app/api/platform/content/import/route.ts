import { getEnv } from "@/lib/cloudflare";
import { resolveIntegrations } from "@/lib/settings/runtime";
import { requireAdmin } from "@/lib/auth/admin";
import { createReadingImportJob } from "@/lib/jobs/lesson-create";

export async function POST(request:Request){
  const denied=await requireAdmin(request);if(denied)return denied;
  const body=await request.json().catch(()=>({})) as Record<string,unknown>;
  const sourceId=typeof body.sourceId==="string"?body.sourceId:"",url=typeof body.url==="string"?body.url.trim():"";
  const schoolLevel=body.schoolLevel==="P5"?"P5":"P6",topic=typeof body.topic==="string"&&body.topic.trim()?body.topic.trim():"Current Affairs";
  if(!sourceId||!url)return Response.json({error:"sourceId and url are required"},{status:400});
  const env=await resolveIntegrations(getEnv());
  const source=await env.DB.prepare("SELECT id,name,usage_mode,enabled FROM content_sources WHERE id=? AND enabled=1").bind(sourceId).first<{id:string;name:string;usage_mode:string;enabled:number}>();
  if(!source)return Response.json({error:"Content source not found or disabled"},{status:404});
  if(!env.MODELBRIDGE_API_KEY||!env.MODELBRIDGE_CHAT_MODEL)return Response.json({error:"ModelBridge is not configured"},{status:503});
  const skillIds=Array.isArray(body.skillIds)?body.skillIds.filter((x):x is string=>typeof x==="string"):[];
  try{
    const result=await createReadingImportJob(env,{source,url,sourceTitle:typeof body.sourceTitle==="string"?body.sourceTitle:"",schoolLevel,topic,skillIds});
    return Response.json({ok:result.status!=="failed",...result},{status:result.status==="queued"?202:result.status==="skipped"?200:503});
  }catch(e){return Response.json({error:e instanceof Error?e.message:"Could not create reading task"},{status:400});}
}
