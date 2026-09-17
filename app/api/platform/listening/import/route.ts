import { getEnv } from "@/lib/cloudflare";
import { resolveIntegrations } from "@/lib/settings/runtime";
import { requireAdmin } from "@/lib/auth/admin";
import { createListeningImportJob } from "@/lib/jobs/lesson-create";
import type { ListeningDiscoveredItem, ListeningSource } from "@/lib/listening/types";
export async function POST(request:Request){
 const denied=await requireAdmin(request);if(denied)return denied;
 const body=await request.json().catch(()=>({})) as Record<string,unknown>;
 const sourceId=typeof body.sourceId==="string"?body.sourceId:"",item=body.item&&typeof body.item==="object"?body.item as ListeningDiscoveredItem:null;
 const schoolLevel=body.schoolLevel==="P5"?"P5":"P6",topic=typeof body.topic==="string"&&body.topic.trim()?body.topic.trim():"Listening Practice";
 if(!sourceId||!item?.title||!item.url||!item.provider||!item.id)return Response.json({error:"sourceId and discovered item are required"},{status:400});
 const env=await resolveIntegrations(getEnv());const source=await env.DB.prepare("SELECT * FROM listening_sources WHERE id=? AND enabled=1").bind(sourceId).first<ListeningSource>();
 if(!source)return Response.json({error:"Listening source not found or disabled"},{status:404});
 if(!env.MODELBRIDGE_API_KEY||!env.MODELBRIDGE_CHAT_MODEL)return Response.json({error:"ModelBridge is not configured"},{status:503});
 const skillIds=Array.isArray(body.skillIds)?body.skillIds.filter((x):x is string=>typeof x==="string"&&x.startsWith("L-")):[];
 try{const result=await createListeningImportJob(env,{source,item,schoolLevel,topic,skillIds,useCompanion:body.useCompanion===true,teacherTranscript:typeof body.teacherTranscript==="string"?body.teacherTranscript.trim():""});return Response.json({ok:result.status!=="failed",...result},{status:result.status==="queued"?202:result.status==="skipped"?200:503});}
 catch(e){return Response.json({error:e instanceof Error?e.message:"Could not create listening task"},{status:400});}
}
