import { getEnv } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import { resolveIntegrations } from "@/lib/settings/runtime";
import { createJob, failJob, getJob, retryJob, deleteQuestionBankItemJob } from "@/lib/jobs/store";
import { dispatchJob } from "@/lib/jobs/dispatch";
import { getBatchGenerationRequest, refreshQuestionGenerationBatch } from "@/lib/question-bank/batch";

function idsFrom(v:unknown){return Array.isArray(v)?[...new Set(v.filter((x):x is string=>typeof x==="string"&&x.length>0))].slice(0,100):[];}
export async function POST(request:Request){
 const denied=await requireAdmin(request);if(denied)return denied;const env=await resolveIntegrations(getEnv()),body=await request.json().catch(()=>({}))as Record<string,unknown>,action=String(body.action||""),ids=idsFrom(body.questionIds);if(!ids.length)return Response.json({error:"Select at least one Question Bank item"},{status:400});if(!["publish","reject","delete","retry"].includes(action))return Response.json({error:"Unsupported bulk action"},{status:400});
 let changed=0,failed=0;const touchedBatches=new Set<string>();
 for(const questionId of ids){const row=await env.DB.prepare("SELECT b.review_status,b.batch_id,b.generation_job_id,q.status FROM question_bank_items b JOIN questions q ON q.id=b.question_id WHERE b.question_id=?").bind(questionId).first<{review_status:string;batch_id:string|null;generation_job_id:string|null;status:string}>();if(!row){failed++;continue;}if(row.batch_id)touchedBatches.add(row.batch_id);
  try{
   if(action==="publish"){
    if(row.review_status!=="needs_review"){failed++;continue;}await env.DB.batch([env.DB.prepare("UPDATE questions SET status='published' WHERE id=?").bind(questionId),env.DB.prepare("UPDATE question_bank_items SET review_status='approved',updated_at=CURRENT_TIMESTAMP WHERE question_id=?").bind(questionId)]);changed++;
   }else if(action==="reject"){
    if(row.generation_job_id){const j=await getJob(env.DB,row.generation_job_id);if(j&&(j.status==="queued"||j.status==="running"))await env.DB.prepare("UPDATE generation_jobs SET status='cancelled',stage='cancelled',completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.generation_job_id).run().catch(()=>undefined);}await env.DB.batch([env.DB.prepare("UPDATE questions SET status='rejected' WHERE id=? AND status!='published'").bind(questionId),env.DB.prepare("UPDATE question_bank_items SET review_status='rejected',updated_at=CURRENT_TIMESTAMP WHERE question_id=?").bind(questionId)]);changed++;
   }else if(action==="delete"){
    if(row.status==="published"){failed++;continue;}if(row.generation_job_id)await deleteQuestionBankItemJob(env.DB,row.generation_job_id).catch(()=>false);else{await env.DB.prepare("DELETE FROM question_skills WHERE question_id=?").bind(questionId).run();await env.DB.prepare("DELETE FROM question_bank_items WHERE question_id=?").bind(questionId).run();await env.DB.prepare("DELETE FROM questions WHERE id=?").bind(questionId).run();}changed++;
   }else{
    if(!row.batch_id){failed++;continue;}let jobId=row.generation_job_id||"";let queued=false;if(jobId){const j=await getJob(env.DB,jobId);if(j?.status==="failed")queued=await retryJob(env.DB,jobId);}if(!queued){const req=await getBatchGenerationRequest(env.DB,row.batch_id,questionId);if(!req){failed++;continue;}jobId=await createJob(env.DB,{jobType:"question_bank_generate",entityType:"question_bank_question",entityId:questionId,sourceId:req.sourceId,request:req,maxRetries:2});await env.DB.prepare("UPDATE question_bank_items SET generation_job_id=?,review_status='generating',generation_error=NULL,duplicate_of_question_id=NULL,updated_at=CURRENT_TIMESTAMP WHERE question_id=?").bind(jobId,questionId).run();await env.DB.prepare("UPDATE questions SET status='generating' WHERE id=?").bind(questionId).run();queued=true;}if(queued){try{await dispatchJob(jobId,env);changed++;}catch(e){await failJob(env.DB,jobId,e);failed++;}}else failed++;
   }
  }catch{failed++;}
 }
 for(const b of touchedBatches)await refreshQuestionGenerationBatch(env.DB,b).catch(()=>undefined);
 return Response.json({ok:failed===0,action,changed,failed});
}
