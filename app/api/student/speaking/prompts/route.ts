import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
import { ensureDailySpeakingPromptAssignments } from "@/lib/speaking/daily-prompt-assignment";
import { getDailySpeakingProgress } from "@/lib/student/speaking-daily";

export async function GET(request:Request){
 const env=getEnv(),session=await ensureLearnerSession(request,env.DB),{tenantId,schoolLevel}=await learnerTenantContext(env.DB,session.childId);
 try{
  const assignment=await ensureDailySpeakingPromptAssignments(env.DB,session.childId,tenantId,schoolLevel);
  const dailyProgress=await getDailySpeakingProgress(env.DB,session.childId);
  const response=Response.json({
   prompts:assignment.prompts,
   dailyProgress,
   rotation:{taskDate:assignment.taskDate,cooldownDays:assignment.cooldownDays,assignedModes:assignment.prompts.map(p=>p.mode)},
  });
  // Daily Speaking is a persisted day-specific bundle. Do not let a browser/CDN
  // reuse yesterday's three prompts after the Singapore date changes.
  response.headers.set("Cache-Control","private, no-store");
  if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));
  return response;
 }catch(error){
  console.error("[speaking-prompts] daily rotation failed",{childId:session.childId,error:error instanceof Error?error.message:String(error)});
  const response=Response.json({error:"Daily Speaking prompts are temporarily unavailable. Please try again."},{status:503});
  response.headers.set("Cache-Control","private, no-store");
  if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));
  return response;
 }
}
