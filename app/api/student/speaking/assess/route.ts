import { getEnv } from "@/lib/cloudflare";
import { resolveIntegrations } from "@/lib/settings/runtime";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { requireAuthenticatedLearner } from "@/lib/settings/learner-runtime";
import { azurePronunciationAssessment } from "@/lib/speaking/azure";
import { heuristicPronunciation } from "@/lib/speaking/evaluate";
import { updateSkillEvidence } from "@/lib/student/mastery";
import { recordDailySpeakingModeScore } from "@/lib/student/speaking-daily";
import { sgDate } from "@/lib/student/tasks";
import { recordDailyGoalEvent } from "@/lib/student/daily-goal";

export async function POST(request:Request){
 const env=await resolveIntegrations(getEnv());const session=await ensureLearnerSession(request,env.DB);const denied=requireAuthenticatedLearner(session);if(denied)return denied;const form=await request.formData();const promptId=String(form.get("promptId")||"").trim().slice(0,200);const ref=String(form.get("referenceText")||"").trim().slice(0,5000);const browserTranscript=String(form.get("browserTranscript")||"").trim().slice(0,5000);const durationMs=Math.max(1000,Math.min(180000,Number(form.get("durationMs")||0)||1000));const file=form.get("audio");if(!ref)return Response.json({error:"referenceText is required"},{status:400});const allowed=await env.DB.prepare(`SELECT json_extract(v.body_json,'$.referenceText') reference_text FROM speaking_daily_prompt_assignments a JOIN content_items c ON c.id=a.prompt_id JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version WHERE a.child_id=? AND a.task_date=? AND a.mode='reading_aloud' AND a.prompt_id=? AND c.status='published' AND c.content_type='oral_prompt' AND json_extract(v.body_json,'$.mode')='reading_aloud' LIMIT 1`).bind(session.childId,sgDate(),promptId).first<{reference_text:string}>();if(!allowed||allowed.reference_text?.trim()!==ref)return Response.json({error:"Reading passage must match today's published PSLE task"},{status:403});
 try{let assessment;
  if((env.PRONUNCIATION_PROVIDER||"auto").toLowerCase()!=="heuristic"&&env.AZURE_SPEECH_KEY&&env.AZURE_SPEECH_REGION&&file instanceof File&&file.size>44){if(file.size>8*1024*1024)return Response.json({error:"Audio is too large"},{status:413});assessment=await azurePronunciationAssessment({region:env.AZURE_SPEECH_REGION,key:env.AZURE_SPEECH_KEY,audio:await file.arrayBuffer(),referenceText:ref,language:"en-SG"});}
  else{if(!browserTranscript)return Response.json({error:"No pronunciation provider is configured and browser transcript is unavailable"},{status:503});assessment=heuristicPronunciation(ref,browserTranscript,durationMs);}
  await updateSkillEvidence(env.DB,session.childId,"S-PRON",assessment.pronunciation);await updateSkillEvidence(env.DB,session.childId,"S-FLUENCY",assessment.fluency);if(assessment.prosody!==null)await updateSkillEvidence(env.DB,session.childId,"S-PROSODY",assessment.prosody);await env.DB.prepare("INSERT INTO xp_ledger (id,child_id,event_type,points,reference_id) VALUES (?,?, 'reading_aloud', ?, ?)").bind(`xp-${crypto.randomUUID()}`,session.childId,assessment.pronunciation>=70?12:8,`oral-${crypto.randomUUID()}`).run();
  const dailySpeaking=await recordDailySpeakingModeScore(env.DB,{childId:session.childId,mode:"reading_aloud",promptId,score:assessment.pronunciation});
  const practiceId=`sra-${crypto.randomUUID()}`;
  await env.DB.prepare("INSERT INTO speaking_reading_aloud_history (id,child_id,task_date,prompt_id,reference_text,transcript,duration_ms,assessment_json,score) VALUES (?,?,?,?,?,?,?,?,?)")
    .bind(practiceId,session.childId,dailySpeaking.taskDate,promptId||null,ref,browserTranscript||null,durationMs,JSON.stringify(assessment),assessment.pronunciation).run();
  await recordDailyGoalEvent(env.DB,session.childId,"reading_aloud",practiceId);
  const response=Response.json({assessment,dailySpeaking});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
 }catch(e){return Response.json({error:e instanceof Error?e.message:"Pronunciation assessment failed"},{status:502});}
}
