import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { getLanguagePreferences } from "@/lib/language/preferences";
import { isLearningStage } from "@/lib/language/stages";
import { getVocabularyChoiceSet, listVocabularyPassages, scoreVocabularyChoice, scoreVocabularyReading } from "@/lib/vocabulary/catalog";

export async function GET(request:Request){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB),url=new URL(request.url),prefs=await getLanguagePreferences(env.DB,session.childId);
  const requested=url.searchParams.get("stage"),stage=isLearningStage(requested)?requested:prefs.vocabularyStage,mode=url.searchParams.get("mode")==="reading"?"reading":"choice";
  const payload=mode==="reading"?{stage,mode,passages:await listVocabularyPassages(env.DB,stage)}:{stage,mode,questions:await getVocabularyChoiceSet(env.DB,stage,Number(url.searchParams.get("count"))||10)};
  const response=Response.json(payload);if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}

export async function POST(request:Request){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB),body=await request.json().catch(()=>({})) as Record<string,unknown>,prefs=await getLanguagePreferences(env.DB,session.childId);
  const stage=isLearningStage(body.stage)?body.stage:prefs.vocabularyStage;
  try{
    let result;
    if(body.mode==="reading")result=await scoreVocabularyReading(env.DB,session.childId,stage,String(body.passageId||""),Number(body.questionIndex),Number(body.optionIndex));
    else result=await scoreVocabularyChoice(env.DB,session.childId,stage,String(body.vocabularyId||""),String(body.selected||""));
    const response=Response.json(result);if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
  }catch(e){return Response.json({error:e instanceof Error?e.message:"Could not score this activity"},{status:400});}
}
