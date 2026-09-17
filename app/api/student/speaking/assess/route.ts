import { getEnv } from "@/lib/cloudflare";
import { resolveIntegrations } from "@/lib/settings/runtime";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { requireAuthenticatedLearner } from "@/lib/settings/learner-runtime";
import { azurePronunciationAssessment } from "@/lib/speaking/azure";
import { heuristicPronunciation } from "@/lib/speaking/evaluate";
import { updateSkillEvidence } from "@/lib/student/mastery";
import { recordDailySpeakingModeScore } from "@/lib/student/speaking-daily";

export async function POST(request:Request){
 const env=await resolveIntegrations(getEnv());const session=await ensureLearnerSession(request,env.DB);const denied=requireAuthenticatedLearner(session);if(denied)return denied;const form=await request.formData();const promptId=String(form.get("promptId")||"").trim().slice(0,200);const ref=String(form.get("referenceText")||"").trim().slice(0,5000);const browserTranscript=String(form.get("browserTranscript")||"").trim().slice(0,5000);const durationMs=Math.max(1000,Math.min(180000,Number(form.get("durationMs")||0)||1000));const file=form.get("audio");if(!ref)return Response.json({error:"referenceText is required"},{status:400});
 try{let assessment;
  if((env.PRONUNCIATION_PROVIDER||"auto").toLowerCase()!=="heuristic"&&env.AZURE_SPEECH_KEY&&env.AZURE_SPEECH_REGION&&file instanceof File&&file.size>44){if(file.size>8*1024*1024)return Response.json({error:"Audio is too large"},{status:413});assessment=await azurePronunciationAssessment({region:env.AZURE_SPEECH_REGION,key:env.AZURE_SPEECH_KEY,audio:await file.arrayBuffer(),referenceText:ref,language:"en-SG"});}
  else{if(!browserTranscript)return Response.json({error:"No pronunciation provider is configured and browser transcript is unavailable"},{status:503});assessment=heuristicPronunciation(ref,browserTranscript,durationMs);}
  await updateSkillEvidence(env.DB,session.childId,"S-PRON",assessment.pronunciation);await updateSkillEvidence(env.DB,session.childId,"S-FLUENCY",assessment.fluency);if(assessment.prosody!==null)await updateSkillEvidence(env.DB,session.childId,"S-PROSODY",assessment.prosody);await env.DB.prepare("INSERT INTO xp_ledger (id,child_id,event_type,points,reference_id) VALUES (?,?, 'reading_aloud', ?, ?)").bind(`xp-${crypto.randomUUID()}`,session.childId,assessment.pronunciation>=70?12:8,`oral-${crypto.randomUUID()}`).run();
  const dailySpeaking=await recordDailySpeakingModeScore(env.DB,{childId:session.childId,mode:"reading_aloud",promptId,score:assessment.pronunciation});
  const response=Response.json({assessment,dailySpeaking});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
 }catch(e){return Response.json({error:e instanceof Error?e.message:"Pronunciation assessment failed"},{status:502});}
}
