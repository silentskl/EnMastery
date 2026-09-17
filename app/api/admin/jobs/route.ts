import{getEnv}from"@/lib/cloudflare";
import{requireTenantSession}from"@/lib/auth/tenant";
import{getQueueRuntimePolicy,setQueueRuntimePolicy,sweepTimedOutJobs}from"@/lib/jobs/timeout";

export async function GET(request:Request){
 const a=await requireTenantSession(request);if(a.response)return a.response;const s=a.session!,url=new URL(request.url),entityId=url.searchParams.get("entityId"),sourceId=url.searchParams.get("sourceId"),db=getEnv().DB;
 await sweepTimedOutJobs(db,{tenantId:s.tenant_id}).catch(error=>console.error("[admin-jobs] timeout sweep failed",error));
 let sql=`SELECT g.id,g.job_type,g.entity_type,g.entity_id,g.source_id,g.status,g.stage,g.progress,g.result_json,g.error,g.retry_count,g.max_retries,g.created_at,g.enqueued_at,g.started_at,g.completed_at,g.updated_at FROM generation_jobs g WHERE g.deleted_at IS NULL AND g.tenant_id=? AND g.scope='tenant'`,binds:string[]=[s.tenant_id];
 if(entityId){sql+=" AND g.entity_id=?";binds.push(entityId)}if(sourceId){sql+=" AND g.source_id=?";binds.push(sourceId)}
 sql+=" ORDER BY CASE g.status WHEN 'running' THEN 0 WHEN 'queued' THEN 1 WHEN 'failed' THEN 2 WHEN 'succeeded' THEN 3 ELSE 4 END,CASE WHEN g.status='queued' THEN COALESCE(g.enqueued_at,g.created_at) END ASC,CASE WHEN g.status IN ('succeeded','failed','cancelled') THEN COALESCE(g.completed_at,g.updated_at) END DESC,g.created_at DESC LIMIT 200";
 const [rows,queuedRows,stats,policy]=await Promise.all([
  db.prepare(sql).bind(...binds).all<Record<string,unknown>>(),
  db.prepare("SELECT id FROM generation_jobs WHERE tenant_id=? AND scope='tenant' AND status='queued' AND deleted_at IS NULL ORDER BY COALESCE(enqueued_at,created_at),rowid LIMIT 200").bind(s.tenant_id).all<{id:string}>(),
  db.prepare("SELECT queued_count queued,running_count running,succeeded_count succeeded,failed_count failed,timed_out_count timed_out FROM generation_job_status_rollups WHERE tenant_id=? AND scope='tenant'").bind(s.tenant_id).first<{queued:number;running:number;succeeded:number;failed:number;timed_out:number}>(),
  getQueueRuntimePolicy(db,s.tenant_id)
 ]);
 const queuePosition=new Map(queuedRows.results.map((row,index)=>[row.id,index+1]));
 const jobs=rows.results.map(row=>({...row,queue_position:row.status==='queued'?queuePosition.get(String(row.id))??null:null}));
 return Response.json({jobs,stats:{queued:Number(stats?.queued||0),running:Number(stats?.running||0),succeeded:Number(stats?.succeeded||0),failed:Number(stats?.failed||0),timedOut:Number(stats?.timed_out||0)},policy,timeZone:"Asia/Singapore"});
}
export async function PATCH(request:Request){const a=await requireTenantSession(request);if(a.response)return a.response;const s=a.session!,body=await request.json().catch(()=>({})) as Record<string,unknown>;const policy=await setQueueRuntimePolicy(getEnv().DB,s.tenant_id,body.taskTimeoutMinutes,s.user_id);return Response.json({ok:true,policy});}
