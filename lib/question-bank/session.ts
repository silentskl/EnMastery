import { safeJson } from "@/lib/content/store";

export const BANK_CATEGORIES = ["oral","reading_comprehension","cloze","writing"] as const;
export type BankCategory = (typeof BANK_CATEGORIES)[number];
export type SessionMode = "practice"|"exam";

export function isBankCategory(value: unknown): value is BankCategory {return typeof value === "string" && (BANK_CATEGORIES as readonly string[]).includes(value);}
export function scoreBankQuestion(answerJson:string,response:unknown,stemJson?:string){
 const answer=safeJson<Record<string,unknown>>(answerJson,{}),stem=safeJson<Record<string,unknown>>(stemJson,{});const optionIndex=typeof (response as {optionIndex?:unknown})?.optionIndex==="number"?(response as {optionIndex:number}).optionIndex:-1;const options=Array.isArray(stem.options)?stem.options.filter((x):x is string=>typeof x==="string"):[];
 if(typeof answer.correctOption==="number"){const correct=optionIndex===answer.correctOption;return{correct,ratio:correct?1:0,feedback:correct?"Correct.":"Review the options and the exact wording of the question."};}
 if(options.length&&typeof answer.answer==="string"){const selected=optionIndex>=0?options[optionIndex]||"":"",correct=selected.trim().toLowerCase()===answer.answer.trim().toLowerCase();return{correct,ratio:correct?1:0,feedback:correct?"Correct.":"Review the choices and select the answer that best fits the complete context."};}
 const text=typeof (response as {text?:unknown})?.text==="string"?(response as {text:string}).text.trim().toLowerCase():"";const accepted=Array.isArray(answer.acceptedAnswers)?answer.acceptedAnswers.filter((x):x is string=>typeof x==="string"):(typeof answer.answer==="string"?[answer.answer]:[]);const norm=(x:string)=>x.toLowerCase().replace(/[^a-z0-9\s]/g,"").replace(/\s+/g," ").trim();const t=norm(text);const correct=accepted.some(x=>{const a=norm(x);return t===a||(a.length>8&&t.includes(a));});return{correct,ratio:correct?1:0,feedback:correct?"Correct.":"Review the evidence, grammar or transformation required by the item."};
}

export async function finaliseSpecialisedSession(db:D1Database,sessionId:string){
 const session=await db.prepare("SELECT mode,category FROM specialised_sessions WHERE id=?").bind(sessionId).first<{mode:SessionMode;category:BankCategory}>();if(!session)return false;
 const counts=await db.prepare("SELECT COUNT(*) total,SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) completed,SUM(COALESCE(score,0)) score,SUM(COALESCE(max_score,marks)) max_score FROM specialised_session_items WHERE session_id=?").bind(sessionId).first<{total:number;completed:number;score:number;max_score:number}>();
 if(!counts||counts.total===0||Number(counts.completed||0)<counts.total)return false;
 if(session.mode==="practice"&&session.category==="cloze"){
  const summaries=await db.prepare(`SELECT COUNT(*) passed FROM specialised_session_items i WHERE i.session_id=? AND EXISTS(SELECT 1 FROM cloze_summary_attempts s WHERE s.session_item_id=i.id AND s.child_id=(SELECT child_id FROM specialised_sessions WHERE id=?) AND s.status='reviewed' AND s.passed=1)`).bind(sessionId,sessionId).first<{passed:number}>().catch(()=>({passed:0}));
  if(Number(summaries?.passed||0)<counts.total)return false;
 }
 await db.prepare("UPDATE specialised_sessions SET status='completed',score=?,max_score=?,completed_at=CURRENT_TIMESTAMP WHERE id=?").bind(counts.score||0,counts.max_score||0,sessionId).run();return true;
}
