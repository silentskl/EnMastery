import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession } from "@/lib/student/session";
import { requireAuthenticatedLearner } from "@/lib/settings/learner-runtime";
import { getDailyGoalProgress, recordDailyStudyHeartbeat } from "@/lib/student/daily-goal";

export async function GET(request: Request) {
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB);
  const denied=requireAuthenticatedLearner(session);
  if(denied)return denied;
  const progress=await getDailyGoalProgress(env.DB,session.childId);
  return Response.json(progress,{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(request: Request) {
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB);
  const denied=requireAuthenticatedLearner(session);
  if(denied)return denied;
  const body=await request.json().catch(()=>({})) as Record<string,unknown>;
  const sessionId=typeof body.sessionId==="string"?body.sessionId:"";
  const seconds=Number(body.activeSeconds);
  const path=typeof body.path==="string"?body.path:"";
  if(!Number.isSafeInteger(seconds)||seconds<0||seconds>86400)
    return Response.json({error:"Invalid active study time"},{status:400});
  try {
    await recordDailyStudyHeartbeat(env.DB,session.childId,sessionId,seconds,path);
    const progress=await getDailyGoalProgress(env.DB,session.childId);
    return Response.json(progress,{headers:{"Cache-Control":"private, no-store"}});
  } catch (err) {
    return Response.json({error:err instanceof Error?err.message:"Invalid study heartbeat"},{status:400});
  }
}
