import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";

export async function GET(request: Request) {
  const env = getEnv();
  const session = await ensureLearnerSession(request, env.DB);
  const profile = await env.DB.prepare("SELECT id,nickname,school_level,target_al,exam_year FROM child_profiles WHERE id=?").bind(session.childId).first();
  const response = Response.json({ profile });
  if (session.isNew) response.headers.set("Set-Cookie", learnerCookie(session.sessionId));
  return response;
}
