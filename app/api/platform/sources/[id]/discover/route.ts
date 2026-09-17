import { getEnv } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import { enqueueJob } from "@/lib/jobs/dispatch";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){const denied=await requireAdmin(request);if(denied)return denied;const {id}=await params;const env=getEnv();const source=await env.DB.prepare("SELECT id FROM content_sources WHERE id=? AND enabled=1").bind(id).first();if(!source)return Response.json({error:"Source not found or disabled"},{status:404});const jobId=await enqueueJob(env.DB,env,{jobType:"reading_discovery",entityType:"source",entityId:id,sourceId:id,request:{sourceId:id}});return Response.json({ok:true,jobId,status:"queued"},{status:202});}
