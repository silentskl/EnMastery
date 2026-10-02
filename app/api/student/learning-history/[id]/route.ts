import {getEnv} from "@/lib/cloudflare";
import {ensureLearnerSession,learnerCookie} from "@/lib/student/session";

function safeJson(text:unknown){if(typeof text!=="string"||!text)return null;try{return JSON.parse(text) as unknown}catch{return text}}
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const env=getEnv(),session=await ensureLearnerSession(request,env.DB),{id}=await params;
 const task=await env.DB.prepare(`SELECT id,task_date,activity_type,activity_id,title,target_minutes,xp_reward,status,metadata_json,completed_at,created_at FROM learning_tasks WHERE id=? AND child_id=?`).bind(id,session.childId).first<Record<string,unknown>>();
 if(!task)return Response.json({error:"Learning task not found"},{status:404});
 const date=String(task.task_date),type=String(task.activity_type),activityId=task.activity_id?String(task.activity_id):null;let evidence:Record<string,unknown>={};
 if((type==="reading"||type==="listening")&&activityId){
  const content=await env.DB.prepare(`SELECT c.id,c.title,c.school_level,c.topic,c.content_type,v.body_json,p.status progress_status,p.progress_percent,p.started_at,p.completed_at,p.updated_at
    FROM content_items c LEFT JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version LEFT JOIN learner_content_progress p ON p.child_id=? AND p.content_id=c.id WHERE c.id=? LIMIT 1`).bind(session.childId,activityId).first<Record<string,unknown>>();
  const attempts=await env.DB.prepare(`SELECT a.id,a.question_id,a.response_json,a.is_correct,a.score,a.max_score,a.feedback_json,a.created_at,q.question_type,q.stem_json,q.answer_json,q.explanation_json
    FROM question_attempts a LEFT JOIN questions q ON q.id=a.question_id WHERE a.child_id=? AND a.content_id=? ORDER BY a.created_at,a.id`).bind(session.childId,activityId).all<Record<string,unknown>>();
  const intensive=type==="listening"?(await env.DB.prepare(`SELECT a.id,a.attempt_type,a.response_text,a.score,a.feedback_json,a.created_at,s.segment_order,s.transcript FROM intensive_listening_attempts a LEFT JOIN listening_segments s ON s.id=a.segment_id WHERE a.child_id=? AND a.content_id=? ORDER BY a.created_at,a.id`).bind(session.childId,activityId).all<Record<string,unknown>>()).results:[];
  evidence={content:content?{...content,body:safeJson(content.body_json)}:null,attempts:attempts.results.map(x=>({...x,response:safeJson(x.response_json),feedback:safeJson(x.feedback_json),stem:safeJson(x.stem_json),answer:safeJson(x.answer_json),explanation:safeJson(x.explanation_json)})),intensive:intensive.map(x=>({...x,feedback:safeJson(x.feedback_json)}))};
 }else if(type==="writing"){
  const rows=await env.DB.prepare(`SELECT id,prompt_id,submission_text,plan_json,word_count,status,scores_json,feedback_json,review_score,passed,passed_at,revision_of_submission_id,created_at,updated_at,prompt_title_snapshot,prompt_body_snapshot
    FROM writing_submissions WHERE child_id=? AND (? IS NULL OR prompt_id=?) ORDER BY created_at,id`).bind(session.childId,activityId,activityId).all<Record<string,unknown>>();
  evidence={submissions:rows.results.map(x=>({...x,plan:safeJson(x.plan_json),scores:safeJson(x.scores_json),feedback:safeJson(x.feedback_json),promptBody:safeJson(x.prompt_body_snapshot)}))};
 }else if(type==="speaking"){
  const progress=await env.DB.prepare(`SELECT mode,prompt_id,score,pass_mark,passed,updated_at FROM speaking_daily_mode_progress WHERE child_id=? AND task_date=? ORDER BY mode`).bind(session.childId,date).all<Record<string,unknown>>();
  const sessions=await env.DB.prepare(`SELECT id,mode,prompt_title,prompt_text,reference_text,status,turn_count,overall_score,feedback_json,started_at,completed_at,updated_at FROM speaking_sessions WHERE child_id=? AND date(started_at,'+8 hours')=? ORDER BY started_at,id`).bind(session.childId,date).all<Record<string,unknown>>();
  const sessionIds=sessions.results.map(x=>String(x.id));let turns:Record<string,unknown>[]=[];for(const sid of sessionIds){const r=await env.DB.prepare(`SELECT id,session_id,speaker,transcript,reply_text,duration_ms,evaluation_json,pronunciation_json,created_at FROM speaking_turns WHERE child_id=? AND session_id=? ORDER BY created_at,id`).bind(session.childId,sid).all<Record<string,unknown>>();turns.push(...r.results.map(x=>({...x,evaluation:safeJson(x.evaluation_json),pronunciation:safeJson(x.pronunciation_json)})));}
  let readingAloud:Record<string,unknown>[]=[];try{readingAloud=(await env.DB.prepare(`SELECT id,prompt_id,reference_text,transcript,duration_ms,assessment_json,score,created_at FROM speaking_reading_aloud_history WHERE child_id=? AND task_date=? ORDER BY created_at,id`).bind(session.childId,date).all<Record<string,unknown>>()).results.map(x=>({...x,assessment:safeJson(x.assessment_json)}));}catch{}
  evidence={progress:progress.results,sessions:sessions.results.map(x=>({...x,feedback:safeJson(x.feedback_json)})),turns,readingAloud};
 }else if(type==="vocabulary"){
  const events=await env.DB.prepare(`SELECT e.id,e.mode,e.correct,e.response_text,e.created_at,v.lemma,v.part_of_speech FROM vocabulary_training_events e JOIN vocabulary_items v ON v.id=e.vocabulary_id WHERE e.child_id=? AND date(e.created_at,'+8 hours')=? ORDER BY e.created_at,e.id`).bind(session.childId,date).all<Record<string,unknown>>();evidence={events:events.results};
 }
 let metadata:Record<string,unknown>={};try{metadata=task.metadata_json?JSON.parse(String(task.metadata_json)) as Record<string,unknown>:{};}catch{}
 const{metadata_json,...taskRest}=task;const response=Response.json({task:{...taskRest,metadata},evidence});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}
