export const SCIENCE_GRADES=["P3","P4","P5","P6"] as const;
export const SCIENCE_THEMES=["Diversity","Cycles","Systems","Interactions","Energy"] as const;
export type ScienceGrade=(typeof SCIENCE_GRADES)[number];
export type ScienceTheme=(typeof SCIENCE_THEMES)[number];
export function isScienceGrade(v:unknown):v is ScienceGrade{return typeof v==="string"&&(SCIENCE_GRADES as readonly string[]).includes(v)}
export function isScienceTheme(v:unknown):v is ScienceTheme{return typeof v==="string"&&(SCIENCE_THEMES as readonly string[]).includes(v)}
export function safeJson<T>(value:string|null,fallback:T):T{try{return value?JSON.parse(value) as T:fallback}catch{return fallback}}
export function normaliseScienceAnswer(value:string){return value.toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9\s'-]/g," ").replace(/\s+/g," ").trim()}
export function scoreScienceQuestion(question:{question_type:string;options_json:string|null;answer_json:string},response:{optionIndex?:unknown;text?:unknown}){
 const answer=safeJson<Record<string,unknown>>(question.answer_json,{});
 if(question.question_type==="mcq"){
  const selected=typeof response.optionIndex==="number"?response.optionIndex:-1,correctOption=typeof answer.correctOption==="number"?answer.correctOption:-2;
  return {correct:selected===correctOption,score:selected===correctOption?1:0,correctOption};
 }
 const text=normaliseScienceAnswer(typeof response.text==="string"?response.text:"");
 const accepted=Array.isArray(answer.acceptedAnswers)?answer.acceptedAnswers.filter((x):x is string=>typeof x==="string"):[];
 const keywords=Array.isArray(answer.keywords)?answer.keywords.filter((x):x is string=>typeof x==="string"):[];
 const correct=accepted.some(x=>normaliseScienceAnswer(x)===text)||(text.length>1&&keywords.some(k=>text.includes(normaliseScienceAnswer(k))));
 return {correct,score:correct?1:0,correctOption:-1};
}
export function updateScienceMastery(current:number,correct:boolean){const n=Number.isFinite(current)?current:0;return Math.max(0,Math.min(100,correct?n+(100-n)*0.24:n*0.82));}
