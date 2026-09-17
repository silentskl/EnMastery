import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession } from "@/lib/student/session";
import { completeMatchingTasks } from "@/lib/student/tasks";
export async function POST(request:Request){const env=getEnv(),session=await ensureLearnerSession(request,env.DB);await request.json().catch(()=>({}));const xp=await completeMatchingTasks(env.DB,session.childId,"vocabulary",undefined,true);return Response.json({ok:true,xp});}
