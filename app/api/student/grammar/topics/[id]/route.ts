import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { getGrammarTopic } from "@/lib/language/grammar";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const env=getEnv(),session=await ensureLearnerSession(request,env.DB),{id}=await params,topic=await getGrammarTopic(env.DB,session.childId,id);if(!topic)return Response.json({error:"Grammar topic not found"},{status:404});const response=Response.json({topic});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;}
