import { getEnv } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import { resolveIntegrations } from "@/lib/settings/runtime";
import { createJob, failJob } from "@/lib/jobs/store";
import { dispatchJob } from "@/lib/jobs/dispatch";
import { BANK_SUBCATEGORIES, type BankCategory } from "@/lib/question-bank/generate";
import { randomD1SampleKey } from "@/lib/d1/indexed-sample";

const categoryDomains: Record<BankCategory,string>={oral:"speaking",reading_comprehension:"reading",cloze:"reading",writing:"writing"};
function isCategory(v:unknown):v is BankCategory{return typeof v==="string"&&Object.prototype.hasOwnProperty.call(BANK_SUBCATEGORIES,v);}
function parseCategories(text:string){try{const x=JSON.parse(text);return Array.isArray(x)?x.filter((v):v is string=>typeof v==="string"):[]}catch{return[];}}
function placeholderType(category:BankCategory,subcategory:string){if(category==="oral")return subcategory==="reading_aloud"?"oral_reading_aloud":subcategory==="stimulus"?"oral_stimulus":"oral_conversation";if(category==="writing")return subcategory==="situational"?"writing_situational":"writing_continuous";if(category==="cloze")return subcategory==="vocabulary"?"vocabulary_cloze":subcategory==="comprehension_cloze"?"comprehension_cloze":"grammar_cloze";return subcategory==="visual_text"?"visual_text":"reading_mcq";}

export async function GET(request:Request){
 const denied=await requireAdmin(request);if(denied)return denied;const env=getEnv();
 const [sources,skills,batches,drafts]=await Promise.all([
  env.DB.prepare("SELECT id,name,url,provider,source_kind,categories_json,usage_mode,licence_note,priority FROM question_bank_sources WHERE enabled=1 ORDER BY priority DESC,name").all(),
  env.DB.prepare("SELECT id,name,domain,school_level,difficulty FROM skills ORDER BY domain,id").all(),
  env.DB.prepare(`SELECT b.*,s.name source_name,
    COUNT(i.question_id) item_count,
    SUM(CASE WHEN i.review_status='generating' THEN 1 ELSE 0 END) generating_count,
    SUM(CASE WHEN i.review_status='needs_review' THEN 1 ELSE 0 END) review_count,
    SUM(CASE WHEN i.review_status='approved' THEN 1 ELSE 0 END) approved_count,
    SUM(CASE WHEN i.review_status='duplicate' THEN 1 ELSE 0 END) duplicate_count,
    SUM(CASE WHEN i.review_status='failed' THEN 1 ELSE 0 END) failed_count,
    SUM(CASE WHEN i.review_status='rejected' THEN 1 ELSE 0 END) rejected_count
    FROM question_generation_batches b JOIN question_bank_sources s ON s.id=b.source_id LEFT JOIN question_bank_items i ON i.batch_id=b.id
    GROUP BY b.id ORDER BY b.created_at DESC LIMIT 30`).all(),
  env.DB.prepare(`SELECT q.id,q.question_type,q.school_level,q.difficulty,q.stem_json,q.answer_json,q.explanation_json,q.status,q.marks,q.created_at,
    b.source_id,b.category,b.subcategory,b.provenance,b.batch_id,b.generation_job_id,b.review_status,b.quality_score,b.quality_json,b.duplicate_of_question_id,b.generation_error,b.updated_at,
    s.name source_name,GROUP_CONCAT(qs.skill_id) skill_ids
    FROM question_bank_items b JOIN questions q ON q.id=b.question_id LEFT JOIN question_bank_sources s ON s.id=b.source_id LEFT JOIN question_skills qs ON qs.question_id=q.id
    GROUP BY q.id ORDER BY CASE b.review_status WHEN 'needs_review' THEN 0 WHEN 'failed' THEN 1 WHEN 'duplicate' THEN 2 WHEN 'generating' THEN 3 WHEN 'approved' THEN 4 ELSE 5 END,b.updated_at DESC LIMIT 500`).all()
 ]);
 return Response.json({sources:sources.results,skills:skills.results,batches:batches.results,drafts:drafts.results,subcategories:BANK_SUBCATEGORIES});
}

export async function POST(request:Request){
 const denied=await requireAdmin(request);if(denied)return denied;const env=await resolveIntegrations(getEnv());
 if(!env.MODELBRIDGE_API_KEY||!env.MODELBRIDGE_CHAT_MODEL)return Response.json({error:"ModelBridge is not configured"},{status:503});
 const body=await request.json().catch(()=>({})) as Record<string,unknown>;
 const sourceId=String(body.sourceId||""),schoolLevel=body.schoolLevel==="P5"?"P5":"P6",category=body.category,subcategory=String(body.subcategory||""),skillId=String(body.skillId||""),topic=String(body.topic||"General English").trim().slice(0,160)||"General English",difficulty=Math.max(1,Math.min(5,Number(body.difficulty)||3)),count=Math.max(1,Math.min(50,Number(body.count)||10));
 if(!isCategory(category))return Response.json({error:"Unsupported Question Bank category"},{status:400});
 if(!(BANK_SUBCATEGORIES[category] as readonly string[]).includes(subcategory))return Response.json({error:"Unsupported subcategory"},{status:400});
 const source=await env.DB.prepare("SELECT id,categories_json FROM question_bank_sources WHERE id=? AND enabled=1").bind(sourceId).first<{id:string;categories_json:string}>();
 if(!source)return Response.json({error:"Question Bank source not found or disabled"},{status:404});
 if(!parseCategories(source.categories_json).includes(category))return Response.json({error:"Selected source does not support this category"},{status:400});
 const skill=await env.DB.prepare("SELECT id,domain FROM skills WHERE id=?").bind(skillId).first<{id:string;domain:string}>();
 if(!skill)return Response.json({error:"Skill not found"},{status:400});
 if(skill.domain!==categoryDomains[category])return Response.json({error:`Selected skill must belong to ${categoryDomains[category]}`},{status:400});
 const batchId=`qbatch-${crypto.randomUUID()}`;
 await env.DB.prepare("INSERT INTO question_generation_batches (id,source_id,school_level,category,subcategory,skill_id,topic,difficulty,requested_count,status,generation_model) VALUES (?,?,?,?,?,?,?,?,?,'queued',?)").bind(batchId,sourceId,schoolLevel,category,subcategory,skillId,topic,difficulty,count,env.MODELBRIDGE_CHAT_MODEL).run();
 const sourceJobId=await createJob(env.DB,{jobType:"question_bank_source_brief",entityType:"question_bank_batch",entityId:batchId,sourceId,request:{batchId,sourceId},maxRetries:1});
 const created:{questionId:string;jobId:string}[]=[];const dispatchFailed:string[]=[];
 for(let i=1;i<=count;i++){
  const questionId=`qbank-${crypto.randomUUID()}`,sampleKey=randomD1SampleKey(),questionType=placeholderType(category,subcategory),marks=category==="writing"?(subcategory==="situational"?14:20):category==="oral"?4:1;
  const requestBody={questionId,batchId,sourceId,schoolLevel,category,subcategory,skillId,topic,difficulty,batchPosition:i,batchSize:count};
  await env.DB.batch([
   env.DB.prepare("INSERT INTO questions (id,question_type,school_level,difficulty,stem_json,answer_json,explanation_json,status,curriculum_version_id,generation_model,marks) VALUES (?,?,?,?,?,?,?,'generating','SG-PRIMARY-ENGLISH-2020-PSLE-2026',?,?)").bind(questionId,questionType,schoolLevel,difficulty,JSON.stringify({prompt:`Generating ${category.replaceAll('_',' ')} item ${i}/${count}…`,topic}),"{}",JSON.stringify({text:"Generation in progress."}),env.MODELBRIDGE_CHAT_MODEL,marks),
   env.DB.prepare("INSERT INTO question_bank_items (question_id,sample_key,source_id,category,subcategory,provenance,source_reference,tags_json,batch_id,review_status,updated_at) VALUES (?,?,?,?,?,?,?,?,?, 'generating',CURRENT_TIMESTAMP)").bind(questionId,sampleKey,sourceId,category,subcategory,"ai_pending",`Generation batch ${batchId}`,JSON.stringify([schoolLevel,category,subcategory,topic,skillId]),batchId),
   env.DB.prepare("INSERT INTO question_skills (question_id,skill_id,weight) VALUES (?,?,1)").bind(questionId,skillId)
  ]);
  const jobId=await createJob(env.DB,{jobType:"question_bank_generate",entityType:"question_bank_question",entityId:questionId,sourceId,request:requestBody,maxRetries:2});
  await env.DB.prepare("UPDATE question_bank_items SET generation_job_id=?,updated_at=CURRENT_TIMESTAMP WHERE question_id=?").bind(jobId,questionId).run();
  created.push({questionId,jobId});
 }
 // All placeholder questions and jobs are now durable. Only now publish wake-up messages.
 try{await dispatchJob(sourceJobId,env);}catch(e){dispatchFailed.push(sourceJobId);await failJob(env.DB,sourceJobId,e);await env.DB.prepare("UPDATE question_generation_batches SET source_stage='profile_only',source_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(e instanceof Error?e.message:"Could not queue source brief",batchId).run().catch(()=>undefined);}
 for(const item of created){try{await dispatchJob(item.jobId,env);}catch(e){dispatchFailed.push(item.jobId);await failJob(env.DB,item.jobId,e);}}
 const itemDispatchFailures=dispatchFailed.filter(x=>x!==sourceJobId).length;
 if(itemDispatchFailures===created.length)await env.DB.prepare("UPDATE question_generation_batches SET status='failed',updated_at=CURRENT_TIMESTAMP,completed_at=CURRENT_TIMESTAMP WHERE id=?").bind(batchId).run();
 else await env.DB.prepare("UPDATE question_generation_batches SET status='queued',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(batchId).run();
 return Response.json({ok:itemDispatchFailures===0,batchId,sourceJobId,created:created.length,dispatched:created.length-itemDispatchFailures,dispatchFailed},{status:itemDispatchFailures===created.length?503:202});
}
