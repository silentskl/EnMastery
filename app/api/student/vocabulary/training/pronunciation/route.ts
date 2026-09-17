import { resolveLearnerAiIntegrations } from "@/lib/settings/learner-runtime";
import { requireAuthenticatedLearner } from "@/lib/settings/learner-runtime";
import { learnerCookie } from "@/lib/student/session";
import { azurePronunciationAssessment } from "@/lib/speaking/azure";
import { heuristicPronunciation } from "@/lib/speaking/evaluate";
import { modelBridgeTranscribe } from "@/lib/ai/audio";
import { recordTenantAiUsage } from "@/lib/tenant/usage";
import { transcriptSimilarity } from "@/lib/listening/intensive";
import { ensureCollectionAccess,recordTrainingAttempt } from "@/lib/vocabulary/collections";

function compact(text:string){return text.toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9']/g,"");}
function matchScore(reference:string,transcript:string){
 const compactRef=compact(reference),compactHeard=compact(transcript);if(compactRef&&compactRef===compactHeard)return 100;
 return transcriptSimilarity(reference,transcript);
}

export async function POST(request:Request){
 const{env,session,tenantId,quota}=await resolveLearnerAiIntegrations(request);const denied=requireAuthenticatedLearner(session);if(denied)return denied;const form=await request.formData();
 const browserTranscript=String(form.get("browserTranscript")||"").trim().slice(0,500),collectionId=String(form.get("collectionId")||""),vocabularyId=String(form.get("vocabularyId")||""),durationMs=Math.max(1000,Math.min(30000,Number(form.get("durationMs")||0)||1000)),file=form.get("audio");
 if(!collectionId||!vocabularyId)return Response.json({error:"collectionId and vocabularyId are required"},{status:400});
 if(!(file instanceof File)||file.size<=44)return Response.json({error:"A real microphone recording is required"},{status:400});
 if(file.size>8*1024*1024)return Response.json({error:"Audio is too large"},{status:413});
 try{
  await ensureCollectionAccess(env.DB,session.childId,collectionId);
  const member=await env.DB.prepare("SELECT v.lemma FROM vocabulary_collection_items ci JOIN vocabulary_items v ON v.id=ci.vocabulary_id WHERE ci.collection_id=? AND ci.vocabulary_id=?").bind(collectionId,vocabularyId).first<{lemma:string}>();if(!member)return Response.json({error:"Vocabulary item is not in this word book"},{status:404});const referenceText=member.lemma.trim().slice(0,180);
  const pronProvider=(env.PRONUNCIATION_PROVIDER||"auto").toLowerCase();let transcript=browserTranscript,assessment;
  if(pronProvider!=="heuristic"&&env.AZURE_SPEECH_KEY&&env.AZURE_SPEECH_REGION){
   assessment=await azurePronunciationAssessment({region:env.AZURE_SPEECH_REGION,key:env.AZURE_SPEECH_KEY,audio:await file.arrayBuffer(),referenceText,language:"en-SG"});transcript=assessment.transcript||transcript;
  }else{
   if(!transcript&&env.MODELBRIDGE_STT_MODEL&&env.MODELBRIDGE_API_KEY&&(env.STT_PROVIDER||"auto").toLowerCase()!=="browser"){
    if(!quota.allowed)return Response.json({error:"This organisation has reached its monthly AI request quota and no browser transcript is available"},{status:429});
    try{transcript=await modelBridgeTranscribe({baseUrl:env.MODELBRIDGE_BASE_URL,apiKey:env.MODELBRIDGE_API_KEY,model:env.MODELBRIDGE_STT_MODEL,audio:file,filename:file.name||"vocabulary-pronunciation.wav",language:"en"});await recordTenantAiUsage(env.DB,{tenantId,childId:session.childId,purpose:"vocabulary_pronunciation_stt",model:env.MODELBRIDGE_STT_MODEL});}
    catch(e){await recordTenantAiUsage(env.DB,{tenantId,childId:session.childId,purpose:"vocabulary_pronunciation_stt",model:env.MODELBRIDGE_STT_MODEL,status:"failed"}).catch(()=>undefined);throw e;}
   }
   if(!transcript)return Response.json({error:"Speech could not be recognised. Allow browser speech recognition or configure ModelBridge STT/Azure Speech."},{status:503});
   assessment=heuristicPronunciation(referenceText,transcript,durationMs);
  }
  const score=matchScore(referenceText,transcript),passed=score>=85&&(assessment.provider!=="azure"||(assessment.accuracy>=65&&assessment.completeness>=80&&assessment.pronunciation>=65));
  const responseSummary=`heard=${transcript};match=${score};pron=${Math.round(assessment.pronunciation)};provider=${assessment.provider}`;
  const progress=await recordTrainingAttempt(env.DB,{childId:session.childId,collectionId,vocabularyId,mode:"pronounce",correct:passed,response:responseSummary});
  const response=Response.json({passed,matchScore:score,transcript,assessment,progress,threshold:{match:85,azureAccuracy:65,azureCompleteness:80,azurePronunciation:65}});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
 }catch(e){return Response.json({error:e instanceof Error?e.message:"Pronunciation match failed"},{status:502});}
}
