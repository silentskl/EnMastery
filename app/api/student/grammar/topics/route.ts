import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { getLanguagePreferences } from "@/lib/language/preferences";
import { isLearningStage } from "@/lib/language/stages";
import { listGrammarTopics } from "@/lib/language/grammar";

export async function GET(request:Request){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB),url=new URL(request.url),prefs=await getLanguagePreferences(env.DB,session.childId),requested=url.searchParams.get("stage"),stage=isLearningStage(requested)?requested:prefs.grammarStage;
  const topics=await listGrammarTopics(env.DB,session.childId,stage),response=Response.json({stage,topics});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}
