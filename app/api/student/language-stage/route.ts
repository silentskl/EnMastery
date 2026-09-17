import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { getLanguagePreferences, setLanguagePreference } from "@/lib/language/preferences";
import { isLearningStage } from "@/lib/language/stages";

export async function GET(request:Request){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB),preferences=await getLanguagePreferences(env.DB,session.childId);
  const response=Response.json(preferences);if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}

export async function PUT(request:Request){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB),body=await request.json().catch(()=>({})) as Record<string,unknown>;
  const module=body.module==="grammar"?"grammar":body.module==="vocabulary"?"vocabulary":null;
  if(!module||!isLearningStage(body.stage))return Response.json({error:"module and a valid learning stage are required"},{status:400});
  const preferences=await setLanguagePreference(env.DB,session.childId,module,body.stage);
  const response=Response.json({ok:true,...preferences});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}
