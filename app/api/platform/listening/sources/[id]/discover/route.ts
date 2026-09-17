import { getEnv } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import { enqueueJob } from "@/lib/jobs/dispatch";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const denied=await requireAdmin(request);if(denied)return denied;
  const {id}=await params;
  const body=await request.json().catch(()=>({})) as Record<string,unknown>;
  const query=typeof body.query==='string'?body.query.trim().slice(0,120):'';
  const maxResults=typeof body.maxResults==='number'?Math.min(50,Math.max(1,Math.floor(body.maxResults))):25;
  const order=body.order==='viewCount'?'viewCount':body.order==='relevance'?'relevance':'date';
  const publishedAfter=typeof body.publishedAfter==='string'?body.publishedAfter.trim().slice(0,10):'';
  const publishedBefore=typeof body.publishedBefore==='string'?body.publishedBefore.trim().slice(0,10):'';
  const minDurationSeconds=typeof body.minDurationSeconds==='number'?Math.max(0,Math.min(7200,Math.floor(body.minDurationSeconds))):undefined;
  const maxDurationSeconds=typeof body.maxDurationSeconds==='number'?Math.max(0,Math.min(7200,Math.floor(body.maxDurationSeconds))):undefined;
  const madeForKids=body.madeForKids==='yes'||body.madeForKids==='no' ? body.madeForKids : 'all';
  const env=getEnv();
  const source=await env.DB.prepare("SELECT id FROM listening_sources WHERE id=? AND enabled=1").bind(id).first();
  if(!source)return Response.json({error:"Listening source not found or disabled"},{status:404});
  const jobId=await enqueueJob(env.DB,env,{jobType:"listening_discovery",entityType:"source",entityId:id,sourceId:id,request:{sourceId:id,query,maxResults,order,publishedAfter,publishedBefore,minDurationSeconds,maxDurationSeconds,madeForKids}});
  return Response.json({ok:true,jobId,status:"queued",query,maxResults,order},{status:202});
}
