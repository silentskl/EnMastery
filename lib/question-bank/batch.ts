import type { BankCategory } from "@/lib/question-bank/generate";

export async function refreshQuestionGenerationBatch(db:D1Database,batchId:string){
  const counts=await db.prepare(`SELECT COUNT(*) total,
    SUM(CASE WHEN review_status='generating' THEN 1 ELSE 0 END) generating,
    SUM(CASE WHEN review_status='needs_review' THEN 1 ELSE 0 END) needs_review,
    SUM(CASE WHEN review_status='approved' THEN 1 ELSE 0 END) approved,
    SUM(CASE WHEN review_status='rejected' THEN 1 ELSE 0 END) rejected,
    SUM(CASE WHEN review_status='duplicate' THEN 1 ELSE 0 END) duplicate,
    SUM(CASE WHEN review_status='failed' THEN 1 ELSE 0 END) failed
    FROM question_bank_items WHERE batch_id=?`).bind(batchId).first<{total:number;generating:number;needs_review:number;approved:number;rejected:number;duplicate:number;failed:number}>();
  if(!counts||!counts.total)return;
  let status="running";
  let completed=false;
  if(counts.generating>0)status="running";
  else if(counts.failed===counts.total) {status="failed";completed=true;}
  else if(counts.needs_review>0||counts.failed>0||counts.duplicate>0) {status="ready";completed=true;}
  else if(counts.approved+counts.rejected===counts.total) {status="completed";completed=true;}
  else {status="partial";completed=true;}
  await db.prepare("UPDATE question_generation_batches SET status=?,updated_at=CURRENT_TIMESTAMP,completed_at=CASE WHEN ? THEN COALESCE(completed_at,CURRENT_TIMESTAMP) ELSE NULL END WHERE id=?")
    .bind(status,completed?1:0,batchId).run();
}

export async function getBatchGenerationRequest(db:D1Database,batchId:string,questionId:string){
  const batch=await db.prepare("SELECT id,source_id,school_level,category,subcategory,skill_id,topic,difficulty,requested_count FROM question_generation_batches WHERE id=?")
    .bind(batchId).first<{id:string;source_id:string;school_level:"P5"|"P6";category:BankCategory;subcategory:string;skill_id:string;topic:string;difficulty:number;requested_count:number}>();
  if(!batch)return null;
  const pos=await db.prepare("SELECT COUNT(*) n FROM question_bank_items WHERE batch_id=? AND rowid <= (SELECT rowid FROM question_bank_items WHERE question_id=?)")
    .bind(batchId,questionId).first<{n:number}>();
  return{questionId,batchId,sourceId:batch.source_id,schoolLevel:batch.school_level,category:batch.category,subcategory:batch.subcategory,skillId:batch.skill_id,topic:batch.topic,difficulty:batch.difficulty,batchPosition:Math.max(1,pos?.n||1),batchSize:batch.requested_count};
}
