import { safeJson } from "@/lib/content/store";
import type { LearningStage } from "@/lib/language/stages";

export type GrammarTopicSummary={id:string;stage:LearningStage;order:number;category:string;title:string;summary:string;mastery:number;attempts:number};
export type GrammarExercise={id:string;modality:"reading"|"writing"|"listening"|"speaking";exerciseType:string;prompt:Record<string,unknown>;marks:number};

export async function listGrammarTopics(db:D1Database,childId:string,stage:LearningStage):Promise<GrammarTopicSummary[]>{
  const rows=await db.prepare(`SELECT t.id,t.stage,t.topic_order,t.category,t.title,t.summary,COALESCE(p.mastery,0) mastery,COALESCE(p.attempts,0) attempts
    FROM grammar_topics t LEFT JOIN grammar_topic_progress p ON p.topic_id=t.id AND p.child_id=?
    WHERE t.stage=? AND t.status='published' ORDER BY t.topic_order,t.title`).bind(childId,stage).all<{id:string;stage:LearningStage;topic_order:number;category:string;title:string;summary:string;mastery:number;attempts:number}>();
  return rows.results.map(r=>({id:r.id,stage:r.stage,order:r.topic_order,category:r.category,title:r.title,summary:r.summary,mastery:r.mastery||0,attempts:r.attempts||0}));
}

export async function getGrammarTopic(db:D1Database,childId:string,id:string){
  const row=await db.prepare(`SELECT t.id,t.stage,t.topic_order,t.category,t.title,t.summary,t.explanation_json,t.objectives_json,t.examples_json,t.common_mistakes_json,
      COALESCE(p.mastery,0) mastery,COALESCE(p.attempts,0) attempts,COALESCE(p.correct_attempts,0) correct_attempts
    FROM grammar_topics t LEFT JOIN grammar_topic_progress p ON p.topic_id=t.id AND p.child_id=? WHERE t.id=? AND t.status='published'`).bind(childId,id)
    .first<{id:string;stage:LearningStage;topic_order:number;category:string;title:string;summary:string;explanation_json:string;objectives_json:string;examples_json:string;common_mistakes_json:string;mastery:number;attempts:number;correct_attempts:number}>();
  if(!row)return null;
  const exercises=await db.prepare("SELECT id,modality,exercise_type,prompt_json,marks FROM grammar_exercises WHERE topic_id=? AND status='published' ORDER BY id").bind(id).all<{id:string;modality:GrammarExercise['modality'];exercise_type:string;prompt_json:string;marks:number}>();
  return {id:row.id,stage:row.stage,order:row.topic_order,category:row.category,title:row.title,summary:row.summary,
    explanation:safeJson<Record<string,unknown>>(row.explanation_json,{}),objectives:safeJson<string[]>(row.objectives_json,[]),examples:safeJson<Array<{label:string;sentence:string}>>(row.examples_json,[]),commonMistakes:safeJson<string[]>(row.common_mistakes_json,[]),mastery:row.mastery||0,attempts:row.attempts||0,correctAttempts:row.correct_attempts||0,
    exercises:exercises.results.map(e=>({id:e.id,modality:e.modality,exerciseType:e.exercise_type,prompt:safeJson<Record<string,unknown>>(e.prompt_json,{}),marks:e.marks}))};
}

function norm(text:string){return text.toLowerCase().replace(/[“”‘’]/g,"'").replace(/[^a-z0-9'\s]/g," ").replace(/\s+/g," ").trim();}
export async function scoreGrammarExercise(db:D1Database,childId:string,topicId:string,exerciseId:string,response:{optionIndex?:number;text?:string}){
  const row=await db.prepare("SELECT topic_id,answer_json,explanation_json,marks FROM grammar_exercises WHERE id=? AND topic_id=? AND status='published'").bind(exerciseId,topicId).first<{topic_id:string;answer_json:string;explanation_json:string;marks:number}>();
  if(!row)throw new Error("Grammar exercise not found");
  const answer=safeJson<{correctOption?:number;acceptedAnswers?:string[];modelAnswer?:string}>(row.answer_json,{}),explanation=safeJson<{text?:string}>(row.explanation_json,{});
  let correct=false;
  if(typeof answer.correctOption==="number"&&typeof response.optionIndex==="number")correct=response.optionIndex===answer.correctOption;
  else if(typeof response.text==="string"&&Array.isArray(answer.acceptedAnswers)){const v=norm(response.text);correct=answer.acceptedAnswers.some(x=>{const a=norm(x);return v===a||(a.length>18&&v.includes(a));});}
  const score=correct?row.marks:0;
  await db.batch([
    db.prepare("INSERT INTO grammar_attempts (id,child_id,exercise_id,response_json,score,max_score,feedback_json) VALUES (?,?,?,?,?,?,?)").bind(`gat-${crypto.randomUUID()}`,childId,exerciseId,JSON.stringify(response),score,row.marks,JSON.stringify({correct,explanation:explanation.text||"Review the grammar rule and the corrected example."})),
    db.prepare(`INSERT INTO grammar_topic_progress (child_id,topic_id,mastery,attempts,correct_attempts,last_practiced_at,updated_at) VALUES (?,?,?,1,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      ON CONFLICT(child_id,topic_id) DO UPDATE SET mastery=MIN(100,MAX(0,grammar_topic_progress.mastery+?)),attempts=grammar_topic_progress.attempts+1,correct_attempts=grammar_topic_progress.correct_attempts+?,last_practiced_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`)
      .bind(childId,topicId,correct?15:0,correct?1:0,correct?12:-6,correct?1:0)
  ]);
  const p=await db.prepare("SELECT mastery,attempts,correct_attempts FROM grammar_topic_progress WHERE child_id=? AND topic_id=?").bind(childId,topicId).first<{mastery:number;attempts:number;correct_attempts:number}>();
  return {correct,score,maxScore:row.marks,modelAnswer:answer.modelAnswer||answer.acceptedAnswers?.[0]||null,correctOption:answer.correctOption,explanation:explanation.text||"Review the grammar rule and try again.",mastery:p?.mastery||0,attempts:p?.attempts||0,correctAttempts:p?.correct_attempts||0};
}
