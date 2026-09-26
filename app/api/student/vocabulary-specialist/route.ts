import { resolveLearnerIntegrations, requireAuthenticatedLearner } from "@/lib/settings/learner-runtime";
import { learnerCookie } from "@/lib/student/session";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
import { tenantAiQuotaStatus, recordTenantAiUsage } from "@/lib/tenant/usage";
import { sgDate } from "@/lib/student/tasks";
import { getVocabularySpecialistPolicy, MIN_VOCABULARY_SPECIALIST_DAILY_WORDS } from "@/lib/vocabulary-specialist/policy";
import { generateSpecialistCloze, generateSpecialistQuestion, normalizeSpecialistTerm } from "@/lib/vocabulary-specialist/generate";

type SessionRow={id:string;child_id:string;tenant_id:string;task_date:string;school_level:string;daily_target:number;status:"collecting"|"cloze_ready"|"passed";words_completed:number;cloze_title:string|null;cloze_passage:string|null;cloze_blanks_json:string|null;cloze_generated_at:string|null;started_at:string;updated_at:string;passed_at:string|null};
type QuestionRow={id:string;item_order:number;term:string;stem:string;options_json:string;answer_index:number;selected_index:number|null;correct:number|null;explanation:string;answered_at:string|null};
type ClozeAttemptRow={id:string;answers_json:string;correctness_json:string;correct_count:number;total_count:number;passed:number;created_at:string};
type StoredClozeItem={index:number;kind:"synonym_choice"|"fill";targetWord:string;answer:string;options:string[];explanation?:string};

function jsonArray<T>(value:string|null,fallback:T[]=[]):T[]{try{const x=value?JSON.parse(value):fallback;return Array.isArray(x)?x as T[]:fallback}catch{return fallback}}
function withCookie(response:Response,session:{isNew:boolean;sessionId:string}){if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response}
function errorResponse(message:string,status=400){return Response.json({error:message},{status})}

function clozeItems(value:string|null):StoredClozeItem[]{
 const raw=jsonArray<Record<string,unknown>>(value);
 return raw.map<StoredClozeItem>((item,position)=>{
  const index=Math.round(Number(item.index||position+1));
  const legacyWord=typeof item.word==="string"?item.word:"";
  const targetWord=normalizeSpecialistTerm(item.targetWord||legacyWord||item.answer);
  const kind: StoredClozeItem["kind"] = item.kind==="synonym_choice"?"synonym_choice":"fill";
  const answer=normalizeSpecialistTerm(item.answer||targetWord);
  const options=Array.isArray(item.options)?item.options.map(normalizeSpecialistTerm).filter(Boolean):[];
  const explanation=typeof item.explanation==="string"?item.explanation:"";
  return {index,kind,targetWord,answer,options,explanation};
 }).filter(item=>item.index>0&&item.targetWord&&item.answer);
}

async function findOrCreateTodaySession(db:D1Database,args:{childId:string;tenantId:string;schoolLevel:any}){
 const taskDate=sgDate();let row=await db.prepare("SELECT * FROM vocabulary_specialist_sessions WHERE child_id=? AND task_date=?").bind(args.childId,taskDate).first<SessionRow>();
 if(row){
  // Hotfix 12.4.1 requires ten distinct words for the 5+5 mixed final cloze.
  // Upgrade an unfinished same-day legacy session rather than stranding the learner.
  if(!row.cloze_passage&&row.status==="collecting"&&Number(row.daily_target)<MIN_VOCABULARY_SPECIALIST_DAILY_WORDS){
   await db.prepare("UPDATE vocabulary_specialist_sessions SET daily_target=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(MIN_VOCABULARY_SPECIALIST_DAILY_WORDS,row.id).run();
   row={...row,daily_target:MIN_VOCABULARY_SPECIALIST_DAILY_WORDS};
  }
  return row;
 }
 const policy=await getVocabularySpecialistPolicy(db,args.tenantId,args.schoolLevel),id=`vss-${crypto.randomUUID()}`;
 await db.prepare("INSERT OR IGNORE INTO vocabulary_specialist_sessions(id,child_id,tenant_id,task_date,school_level,daily_target) VALUES(?,?,?,?,?,?)").bind(id,args.childId,args.tenantId,taskDate,args.schoolLevel,policy.dailyWords).run();
 row=await db.prepare("SELECT * FROM vocabulary_specialist_sessions WHERE child_id=? AND task_date=?").bind(args.childId,taskDate).first<SessionRow>();if(!row)throw new Error("Could not start today's vocabulary specialist practice.");return row;
}

async function sessionState(db:D1Database,row:SessionRow){
 const questions=(await db.prepare("SELECT id,item_order,term,stem,options_json,answer_index,selected_index,correct,explanation,answered_at FROM vocabulary_specialist_question_attempts WHERE session_id=? ORDER BY item_order").bind(row.id).all<QuestionRow>()).results;
 const attempts=(await db.prepare("SELECT id,answers_json,correctness_json,correct_count,total_count,passed,created_at FROM vocabulary_specialist_cloze_attempts WHERE session_id=? ORDER BY created_at DESC LIMIT 20").bind(row.id).all<ClozeAttemptRow>()).results;
 const items=clozeItems(row.cloze_blanks_json);
 return {
  session:{id:row.id,taskDate:row.task_date,schoolLevel:row.school_level,dailyTarget:Number(row.daily_target),status:row.status,wordsCompleted:Number(row.words_completed),clozeTitle:row.cloze_title,clozePassage:row.cloze_passage,clozeGeneratedAt:row.cloze_generated_at,passedAt:row.passed_at},
  questions:questions.map(q=>({id:q.id,itemOrder:Number(q.item_order),term:q.term,stem:q.stem,options:jsonArray<string>(q.options_json),selectedIndex:q.selected_index===null?null:Number(q.selected_index),correct:q.correct===null?null:Boolean(q.correct),answerIndex:q.answered_at?Number(q.answer_index):null,explanation:q.answered_at?q.explanation:"",answeredAt:q.answered_at})),
  clozeItems:row.cloze_passage?items.map(item=>({index:item.index,kind:item.kind,targetWord:item.targetWord,options:item.kind==="synonym_choice"?item.options:[]})):[],
  wordBank:row.cloze_passage?items.filter(item=>item.kind==="fill").map(item=>item.targetWord).sort((a,b)=>a.localeCompare(b)):[],
  clozeAttempts:attempts.map(a=>({id:a.id,answers:jsonArray<string>(a.answers_json),correctness:jsonArray<boolean>(a.correctness_json),correctCount:Number(a.correct_count),totalCount:Number(a.total_count),passed:Boolean(a.passed),createdAt:a.created_at}))
 };
}

async function loadOwnedSession(db:D1Database,id:string,childId:string){return db.prepare("SELECT * FROM vocabulary_specialist_sessions WHERE id=? AND child_id=?").bind(id,childId).first<SessionRow>()}

export async function GET(request:Request){
 const resolved=await resolveLearnerIntegrations(request),denied=requireAuthenticatedLearner(resolved.session);if(denied)return denied;
 const ctx=await learnerTenantContext(resolved.env.DB,resolved.session.childId),row=await findOrCreateTodaySession(resolved.env.DB,{childId:resolved.session.childId,tenantId:ctx.tenantId,schoolLevel:ctx.schoolLevel});
 const state=await sessionState(resolved.env.DB,row);return withCookie(Response.json(state),resolved.session);
}

export async function POST(request:Request){
 const resolved=await resolveLearnerIntegrations(request),denied=requireAuthenticatedLearner(resolved.session);if(denied)return denied;
 const {env,session}=resolved,ctx=await learnerTenantContext(env.DB,session.childId),body=await request.json().catch(()=>({})) as Record<string,unknown>,action=String(body.action||"");
 let current=await findOrCreateTodaySession(env.DB,{childId:session.childId,tenantId:ctx.tenantId,schoolLevel:ctx.schoolLevel});
 try{
  if(action==="add_word"){
   if(current.status!=="collecting")return errorResponse("Today's vocabulary collection is already complete.",409);
   const existingCount=await env.DB.prepare("SELECT COUNT(*) count FROM vocabulary_specialist_question_attempts WHERE session_id=?").bind(current.id).first<{count:number}>();
   if(Number(existingCount?.count||0)>=Number(current.daily_target))return errorResponse("Today's vocabulary target has already been reached.",409);
   const term=normalizeSpecialistTerm(body.term);if(!term)return errorResponse("Enter one English word or phrase. Use up to 12 words / 90 characters; letters, spaces, apostrophes and hyphens are supported.");
   const duplicate=await env.DB.prepare("SELECT id FROM vocabulary_specialist_question_attempts WHERE session_id=? AND lower(term)=lower(?) LIMIT 1").bind(current.id,term).first<{id:string}>();if(duplicate)return errorResponse("This word or phrase is already in today's specialist practice.",409);
   if(!env.MODELBRIDGE_API_KEY||!env.MODELBRIDGE_CHAT_MODEL)return errorResponse("Your organisation has not configured ModelBridge for vocabulary specialist practice.",503);
   const quota=await tenantAiQuotaStatus(env.DB,ctx.tenantId);if(!quota.allowed)return errorResponse("This organisation has reached its monthly AI request quota.",429);
   let generated;
   try{generated=await generateSpecialistQuestion({baseUrl:env.MODELBRIDGE_BASE_URL,apiKey:env.MODELBRIDGE_API_KEY,model:env.MODELBRIDGE_CHAT_MODEL},{term,schoolLevel:ctx.schoolLevel});await recordTenantAiUsage(env.DB,{tenantId:ctx.tenantId,childId:session.childId,purpose:"vocabulary_specialist_question",model:env.MODELBRIDGE_CHAT_MODEL});}
   catch(error){await recordTenantAiUsage(env.DB,{tenantId:ctx.tenantId,childId:session.childId,purpose:"vocabulary_specialist_question",model:env.MODELBRIDGE_CHAT_MODEL,status:"failed"}).catch(()=>undefined);throw error;}
   let word=await env.DB.prepare("SELECT id FROM vocabulary_specialist_wordbook WHERE child_id=? AND normalized_term=?").bind(session.childId,generated.normalizedTerm).first<{id:string}>();
   if(word){await env.DB.prepare("UPDATE vocabulary_specialist_wordbook SET term=?,part_of_speech=?,definition=?,chinese_meaning=?,last_practised_at=CURRENT_TIMESTAMP,times_practised=times_practised+1 WHERE id=?").bind(generated.term,generated.partOfSpeech,generated.definition,generated.chineseMeaning,word.id).run();}
   else{word={id:`vsw-${crypto.randomUUID()}`};await env.DB.prepare("INSERT INTO vocabulary_specialist_wordbook(id,child_id,tenant_id,term,normalized_term,part_of_speech,definition,chinese_meaning) VALUES(?,?,?,?,?,?,?,?)").bind(word.id,session.childId,ctx.tenantId,generated.term,generated.normalizedTerm,generated.partOfSpeech,generated.definition,generated.chineseMeaning).run();}
   const itemOrder=Number(existingCount?.count||0)+1;
   await env.DB.prepare("INSERT INTO vocabulary_specialist_question_attempts(id,session_id,child_id,wordbook_word_id,item_order,term,stem,options_json,answer_index,explanation) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(`vsq-${crypto.randomUUID()}`,current.id,session.childId,word.id,itemOrder,generated.term,generated.stem,JSON.stringify(generated.options),generated.answerIndex,generated.explanation).run();
  }else if(action==="answer_question"){
   const questionId=String(body.questionId||""),selectedIndex=Math.round(Number(body.selectedIndex));if(!questionId||!Number.isInteger(selectedIndex)||selectedIndex<0||selectedIndex>3)return errorResponse("Choose one of the four options.");
   const q=await env.DB.prepare("SELECT q.id,q.answer_index,q.answered_at FROM vocabulary_specialist_question_attempts q JOIN vocabulary_specialist_sessions s ON s.id=q.session_id WHERE q.id=? AND q.session_id=? AND s.child_id=?").bind(questionId,current.id,session.childId).first<{id:string;answer_index:number;answered_at:string|null}>();if(!q)return errorResponse("Question not found.",404);
   if(!q.answered_at)await env.DB.prepare("UPDATE vocabulary_specialist_question_attempts SET selected_index=?,correct=?,answered_at=CURRENT_TIMESTAMP WHERE id=? AND answered_at IS NULL").bind(selectedIndex,selectedIndex===Number(q.answer_index)?1:0,q.id).run();
   const answered=await env.DB.prepare("SELECT COUNT(*) count FROM vocabulary_specialist_question_attempts WHERE session_id=? AND answered_at IS NOT NULL").bind(current.id).first<{count:number}>();
   await env.DB.prepare("UPDATE vocabulary_specialist_sessions SET words_completed=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(Number(answered?.count||0),current.id).run();
  }else if(action==="generate_cloze"){
   if(current.cloze_passage){return withCookie(Response.json(await sessionState(env.DB,current)),session)}
   const questions=(await env.DB.prepare("SELECT term,answered_at FROM vocabulary_specialist_question_attempts WHERE session_id=? ORDER BY item_order").bind(current.id).all<{term:string;answered_at:string|null}>()).results;
   if(questions.length!==Number(current.daily_target)||questions.some(q=>!q.answered_at))return errorResponse("Answer all daily vocabulary questions before generating the final cloze.",409);
   if(questions.length<10)return errorResponse("The mixed final cloze requires at least 10 completed vocabulary terms.",409);
   if(!env.MODELBRIDGE_API_KEY||!env.MODELBRIDGE_CHAT_MODEL)return errorResponse("Your organisation has not configured ModelBridge for the final cloze.",503);
   const quota=await tenantAiQuotaStatus(env.DB,ctx.tenantId);if(!quota.allowed)return errorResponse("This organisation has reached its monthly AI request quota.",429);
   const words=questions.map(q=>q.term);let cloze:null|Awaited<ReturnType<typeof generateSpecialistCloze>>=null,lastError:unknown=null;
   for(let attempt=0;attempt<2&&!cloze;attempt++)try{cloze=await generateSpecialistCloze({baseUrl:env.MODELBRIDGE_BASE_URL,apiKey:env.MODELBRIDGE_API_KEY,model:env.MODELBRIDGE_CHAT_MODEL},{words,schoolLevel:ctx.schoolLevel});await recordTenantAiUsage(env.DB,{tenantId:ctx.tenantId,childId:session.childId,purpose:"vocabulary_specialist_cloze",model:env.MODELBRIDGE_CHAT_MODEL});}catch(error){lastError=error;await recordTenantAiUsage(env.DB,{tenantId:ctx.tenantId,childId:session.childId,purpose:"vocabulary_specialist_cloze",model:env.MODELBRIDGE_CHAT_MODEL,status:"failed"}).catch(()=>undefined);}
   if(!cloze)throw lastError instanceof Error?lastError:new Error("Could not generate a valid 400–500 word mixed cloze.");
   await env.DB.prepare("UPDATE vocabulary_specialist_sessions SET status='cloze_ready',cloze_title=?,cloze_passage=?,cloze_blanks_json=?,cloze_generated_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(cloze.title,cloze.passage,JSON.stringify(cloze.items),current.id).run();
  }else if(action==="submit_cloze"){
   if(!current.cloze_passage||!current.cloze_blanks_json)return errorResponse("Generate the final cloze before submitting answers.",409);
   const items=clozeItems(current.cloze_blanks_json),answers=Array.isArray(body.answers)?body.answers.map(x=>typeof x==="string"?x.trim():""):[];
   if(!items.length||answers.length!==items.length)return errorResponse("Complete every cloze blank before submitting.");
   const correctness=items.map((item,index)=>normalizeSpecialistTerm(answers[index])===normalizeSpecialistTerm(item.answer)),correctCount=correctness.filter(Boolean).length,passed=correctCount===items.length;
   await env.DB.prepare("INSERT INTO vocabulary_specialist_cloze_attempts(id,session_id,child_id,answers_json,correctness_json,correct_count,total_count,passed) VALUES(?,?,?,?,?,?,?,?)").bind(`vsc-${crypto.randomUUID()}`,current.id,session.childId,JSON.stringify(answers),JSON.stringify(correctness),correctCount,items.length,passed?1:0).run();
   if(passed)await env.DB.prepare("UPDATE vocabulary_specialist_sessions SET status='passed',passed_at=COALESCE(passed_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(current.id).run();
   else await env.DB.prepare("UPDATE vocabulary_specialist_sessions SET status='cloze_ready',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(current.id).run();
  }else return errorResponse("Unknown vocabulary specialist action.",400);
  current=await loadOwnedSession(env.DB,current.id,session.childId) as SessionRow;return withCookie(Response.json(await sessionState(env.DB,current)),session);
 }catch(error){return withCookie(Response.json({error:error instanceof Error?error.message:"Vocabulary specialist practice failed."},{status:500}),session)}
}
