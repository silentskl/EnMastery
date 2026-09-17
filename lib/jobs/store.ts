import { refreshQuestionGenerationBatch } from "@/lib/question-bank/batch";
export type JobStatus="queued"|"running"|"succeeded"|"failed"|"cancelled";
export type JobLogLevel="debug"|"info"|"warn"|"error";
function redactLogValue(value:unknown,depth=0):unknown{
  if(depth>6)return "[max-depth]";
  if(Array.isArray(value))return value.slice(0,100).map(v=>redactLogValue(v,depth+1));
  if(value&&typeof value==="object"){const out:Record<string,unknown>={};for(const[k,v]of Object.entries(value as Record<string,unknown>)){const low=k.toLowerCase();out[k]=/(authorization|api.?key|token|secret|password|cookie)/.test(low)?"[REDACTED]":redactLogValue(v,depth+1)}return out}
  if(typeof value==="string")return value.length>24000?value.slice(0,24000)+"…[truncated]":value;
  return value===undefined?null:value;
}
export async function appendJobLog(db:D1Database,jobId:string,args:{level?:JobLogLevel;eventType:string;stage?:string|null;message:string;details?:unknown}){
  const details=args.details===undefined?null:JSON.stringify(redactLogValue(args.details));
  await db.prepare("INSERT INTO generation_job_logs (id,job_id,level,event_type,stage,message,details_json) VALUES (?,?,?,?,?,?,?)").bind(`jlog-${crypto.randomUUID()}`,jobId,args.level||"info",args.eventType,args.stage??null,args.message.slice(0,4000),details).run().catch(()=>undefined);
}
export async function getJobLogs(db:D1Database,jobId:string){const r=await db.prepare("SELECT id,level,event_type,stage,message,details_json,created_at FROM generation_job_logs WHERE job_id=? ORDER BY created_at,id LIMIT 300").bind(jobId).all();return r.results;}

export async function getLatestModelBridgeResponse(db:D1Database,jobId:string){
  const rows=await db.prepare("SELECT id,details_json,created_at FROM generation_job_logs WHERE job_id=? AND event_type='modelbridge_response' ORDER BY created_at DESC,id DESC LIMIT 20").bind(jobId).all<{id:string;details_json:string|null;created_at:string}>();
  for(const row of rows.results){
    if(!row.details_json)continue;
    try{
      const event=JSON.parse(row.details_json) as {phase?:unknown;status?:unknown;response?:unknown;raw?:unknown};
      const status=Number(event.status);
      if(event.phase!=="response"||!Number.isFinite(status)||status<200||status>=300)continue;
      if(event.response&&typeof event.response==="object")return{response:event.response,logId:row.id,createdAt:row.created_at,status};
      if(typeof event.raw==="string"&&event.raw.trim()){const parsed=JSON.parse(event.raw) as unknown;if(parsed&&typeof parsed==="object")return{response:parsed,logId:row.id,createdAt:row.created_at,status};}
    }catch{}
  }
  return null;
}
export function jobErrorDetails(error:unknown){if(error instanceof Error)return{name:error.name,message:error.message,stack:error.stack||null,...((error as Error&{details?:unknown}).details!==undefined?{details:(error as Error&{details?:unknown}).details}:{})};return{message:String(error)}}

export type GenerationJob={id:string;job_type:string;entity_type:string|null;entity_id:string|null;source_id:string|null;tenant_id:string|null;scope:"global"|"tenant";status:JobStatus;stage:string;progress:number;request_json:string;result_json:string|null;error:string|null;retry_count:number;max_retries:number;created_at:string;enqueued_at:string|null;started_at:string|null;completed_at:string|null;updated_at:string;deleted_at:string|null};
export async function createJob(db:D1Database,args:{jobType:string;entityType?:string;entityId?:string;sourceId?:string;request:unknown;createdBy?:string;maxRetries?:number;tenantId?:string|null;scope?:"global"|"tenant"}){const id=`job-${crypto.randomUUID()}`;const tenantId=args.tenantId||null,scope=args.scope||(tenantId?"tenant":"global");await db.prepare("INSERT INTO generation_jobs (id,job_type,entity_type,entity_id,source_id,status,stage,progress,request_json,created_by,max_retries,tenant_id,scope,enqueued_at) VALUES (?,?,?,?,?,'queued','queued',0,?,?,?,?,?,strftime('%Y-%m-%d %H:%M:%f','now'))").bind(id,args.jobType,args.entityType||null,args.entityId||null,args.sourceId||null,JSON.stringify(args.request),args.createdBy||"admin",args.maxRetries??2,tenantId,scope).run();return id;}
export async function getJob(db:D1Database,id:string){return db.prepare("SELECT * FROM generation_jobs WHERE id=? AND deleted_at IS NULL").bind(id).first<GenerationJob>();}
export async function setJob(db:D1Database,id:string,patch:{status?:JobStatus;stage?:string;progress?:number;result?:unknown;error?:string|null;started?:boolean;completed?:boolean;request?:unknown}){const current=await getJob(db,id);if(!current)return;if(current.status==="failed"&&current.stage==="timed_out")return;const nextStatus=patch.status??current.status,nextStage=patch.stage??current.stage,nextProgress=patch.progress??current.progress;await db.prepare("UPDATE generation_jobs SET status=?,stage=?,progress=?,result_json=?,error=?,request_json=?,started_at=?,completed_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(nextStatus,nextStage,nextProgress,patch.result===undefined?current.result_json:JSON.stringify(patch.result),patch.error===undefined?current.error:patch.error,patch.request===undefined?current.request_json:JSON.stringify(patch.request),patch.started&&!current.started_at?new Date().toISOString():current.started_at,patch.completed?new Date().toISOString():current.completed_at,id).run();if(nextStatus!==current.status||nextStage!==current.stage||nextProgress!==current.progress)await appendJobLog(db,id,{eventType:"job_progress",stage:nextStage,message:`${nextStatus} · ${nextStage} · ${nextProgress}%`,details:{status:nextStatus,progress:nextProgress}});}
export async function jobCancelled(db:D1Database,id:string){const r=await db.prepare("SELECT status,deleted_at FROM generation_jobs WHERE id=?").bind(id).first<{status:string;deleted_at:string|null}>();return !r||Boolean(r.deleted_at)||!(["queued","running"] as string[]).includes(r.status);}
export async function failJob(db:D1Database,id:string,error:unknown){const current=await getJob(db,id);if(current?.status==="failed"&&current.stage==="timed_out")return;await appendJobLog(db,id,{level:"error",eventType:"job_failed",stage:"failed",message:error instanceof Error?error.message:String(error||"Task failed"),details:jobErrorDetails(error)});const message=error instanceof Error?error.message:String(error||"Task failed");await setJob(db,id,{status:"failed",stage:"failed",error:message.slice(0,2000),progress:100,completed:true});const job=await db.prepare("SELECT entity_type,entity_id FROM generation_jobs WHERE id=?").bind(id).first<{entity_type:string|null;entity_id:string|null}>();if(job?.entity_type==="content"&&job.entity_id)await db.prepare("UPDATE content_items SET status='failed',generation_stage='failed',generation_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status!='published'").bind(message.slice(0,1800),job.entity_id).run().catch(()=>null);if(job?.entity_type==="writing_submission"&&job.entity_id)await db.prepare("UPDATE writing_submissions SET status='failed',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='evaluating'").bind(job.entity_id).run().catch(()=>null);if(job?.entity_type==="learning_summary"&&job.entity_id)await db.prepare("UPDATE learning_summary_attempts SET status='failed',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='evaluating'").bind(job.entity_id).run().catch(()=>null);if(job?.entity_type==="specialised_item"&&job.entity_id)await db.prepare("UPDATE specialised_session_items SET status='failed',feedback_json=? WHERE id=? AND status='evaluating'").bind(JSON.stringify({error:message.slice(0,1800)}),job.entity_id).run().catch(()=>null);if(job?.entity_type==="question_bank_question"&&job.entity_id){await db.prepare("UPDATE questions SET status='failed' WHERE id=? AND status!='published'").bind(job.entity_id).run().catch(()=>null);await db.prepare("UPDATE question_bank_items SET review_status='failed',generation_error=?,updated_at=CURRENT_TIMESTAMP WHERE question_id=?").bind(message.slice(0,1800),job.entity_id).run().catch(()=>null);const b=await db.prepare("SELECT batch_id FROM question_bank_items WHERE question_id=?").bind(job.entity_id).first<{batch_id:string|null}>().catch(()=>null);if(b?.batch_id)await refreshQuestionGenerationBatch(db,b.batch_id).catch(()=>undefined);}}

/** Delete an unpublished Question Bank item together with its generation job.
 * This is intentionally separate from Work Queue history deletion: Work Queue only
 * allows terminal succeeded/failed jobs to be hidden via deleteFinishedJob().
 */
export async function deleteQuestionBankItemJob(db:D1Database,id:string){
  const job=await getJob(db,id);if(!job||job.entity_type!=="question_bank_question"||!job.entity_id)return false;
  const q=await db.prepare("SELECT status FROM questions WHERE id=?").bind(job.entity_id).first<{status:string}>().catch(()=>null);
  if(!q||q.status==="published")return false;
  await db.prepare("UPDATE generation_jobs SET status='cancelled',stage='cancelled',deleted_at=CURRENT_TIMESTAMP,completed_at=COALESCE(completed_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
  await db.prepare("DELETE FROM question_skills WHERE question_id=?").bind(job.entity_id).run().catch(()=>null);
  await db.prepare("DELETE FROM question_bank_items WHERE question_id=?").bind(job.entity_id).run().catch(()=>null);
  await db.prepare("DELETE FROM questions WHERE id=? AND status!='published'").bind(job.entity_id).run().catch(()=>null);
  return true;
}

/** Remove only terminal queue history. Generated entities/assets are intentionally preserved. */
export async function deleteFinishedJob(db:D1Database,id:string){
  const job=await getJob(db,id);if(!job)return false;
  if(job.status!=="succeeded"&&job.status!=="failed")return false;
  await db.prepare("UPDATE generation_jobs SET deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status IN ('succeeded','failed') AND deleted_at IS NULL").bind(id).run();
  return true;
}

export async function retryJob(db:D1Database,id:string){
  const job=await getJob(db,id);if(!job||job.status!=="failed")return false;
  if(job.retry_count>=job.max_retries)return false;
  await db.prepare("UPDATE generation_jobs SET status='queued',stage='queued',progress=0,error=NULL,retry_count=retry_count+1,enqueued_at=strftime('%Y-%m-%d %H:%M:%f','now'),started_at=NULL,completed_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
  if(job.entity_type==="content"&&job.entity_id)await db.prepare("UPDATE content_items SET status='generating',generation_stage='queued',generation_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status!='published'").bind(job.entity_id).run().catch(()=>null);
  if(job.entity_type==="writing_submission"&&job.entity_id)await db.prepare("UPDATE writing_submissions SET status='evaluating',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(job.entity_id).run().catch(()=>null);if(job.entity_type==="learning_summary"&&job.entity_id)await db.prepare("UPDATE learning_summary_attempts SET status='evaluating',feedback_json=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(job.entity_id).run().catch(()=>null);if(job.entity_type==="specialised_item"&&job.entity_id)await db.prepare("UPDATE specialised_session_items SET status='evaluating',feedback_json=NULL WHERE id=?").bind(job.entity_id).run().catch(()=>null);if(job.entity_type==="question_bank_question"&&job.entity_id){await db.prepare("UPDATE questions SET status='generating' WHERE id=? AND status!='published'").bind(job.entity_id).run().catch(()=>null);await db.prepare("UPDATE question_bank_items SET review_status='generating',generation_error=NULL,duplicate_of_question_id=NULL,updated_at=CURRENT_TIMESTAMP WHERE question_id=?").bind(job.entity_id).run().catch(()=>null);}
  return true;
}


/** Create a fresh queue execution from a timed-out task while retaining the original audit record. */
export async function retriggerTimedOutJob(db:D1Database,id:string,createdBy?:string){
  const job=await getJob(db,id);if(!job||job.status!=="failed"||job.stage!=="timed_out")return null;
  const nextId=`job-${crypto.randomUUID()}`;
  await db.prepare("INSERT INTO generation_jobs (id,job_type,entity_type,entity_id,source_id,status,stage,progress,request_json,result_json,error,retry_count,max_retries,created_by,tenant_id,scope,enqueued_at) VALUES (?,?,?,?,?,'queued','queued',0,?,NULL,NULL,0,?,?,?,?,strftime('%Y-%m-%d %H:%M:%f','now'))").bind(nextId,job.job_type,job.entity_type,job.entity_id,job.source_id,job.request_json,job.max_retries,createdBy||"admin",job.tenant_id,job.scope).run();
  await appendJobLog(db,id,{eventType:"job_retriggered",stage:"timed_out",message:`Timed-out task retriggered as ${nextId}`,details:{newJobId:nextId}});
  await appendJobLog(db,nextId,{eventType:"job_retriggered_from",stage:"queued",message:`Created from timed-out task ${id}`,details:{sourceJobId:id}});
  if(job.entity_type==="content"&&job.entity_id)await db.prepare("UPDATE content_items SET status='generating',generation_job_id=?,generation_stage='queued',generation_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status!='published'").bind(nextId,job.entity_id).run().catch(()=>null);
  if(job.entity_type==="writing_submission"&&job.entity_id)await db.prepare("UPDATE writing_submissions SET status='evaluating',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(job.entity_id).run().catch(()=>null);
  if(job.entity_type==="learning_summary"&&job.entity_id)await db.prepare("UPDATE learning_summary_attempts SET status='evaluating',feedback_json=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(job.entity_id).run().catch(()=>null);
  if(job.entity_type==="specialised_item"&&job.entity_id)await db.prepare("UPDATE specialised_session_items SET status='evaluating',feedback_json=NULL WHERE id=?").bind(job.entity_id).run().catch(()=>null);
  return nextId;
}
