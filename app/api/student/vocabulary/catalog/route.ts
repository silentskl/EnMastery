import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { getLanguagePreferences } from "@/lib/language/preferences";
import { isLearningStage } from "@/lib/language/stages";
import { searchVocabularyCatalog } from "@/lib/vocabulary/catalog";
import { searchVocabularyCollection } from "@/lib/vocabulary/collections";

export async function GET(request:Request){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB),url=new URL(request.url),prefs=await getLanguagePreferences(env.DB,session.childId);
  const requested=url.searchParams.get("stage"),stage=isLearningStage(requested)?requested:prefs.vocabularyStage;
  const q=url.searchParams.get("q")||"",rawType=url.searchParams.get("type"),entryType=rawType==="word"||rawType==="phrase"?rawType:"all",collectionId=url.searchParams.get("collection");
  try{const items=collectionId?await searchVocabularyCollection(env.DB,{childId:session.childId,collectionId,query:q,entryType}):await searchVocabularyCatalog(env.DB,{childId:session.childId,stage,query:q,entryType});
    const response=Response.json({stage,query:q,collectionId,items});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
  }catch(e){return Response.json({error:e instanceof Error?e.message:"Could not load vocabulary"},{status:400});}
}
