import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";

export async function GET(request: Request, { params }: { params: Promise<{ id:string }> }) {
  const env = getEnv();
  const s = await ensureLearnerSession(request, env.DB);
  const { id } = await params;
  const row = await env.DB.prepare(`SELECT w.id,w.prompt_id,w.submission_text,w.plan_json,w.word_count,w.status,w.scores_json,w.feedback_json,w.review_score,w.passed,w.passed_at,w.generation_job_id,w.revision_of_submission_id,w.created_at,w.updated_at,
    COALESCE(w.prompt_title_snapshot,c.title,'Writing task') prompt_title,c.school_level,c.topic,
    COALESCE(w.prompt_body_snapshot,v.body_json) prompt_body_json
    FROM writing_submissions w LEFT JOIN content_items c ON c.id=w.prompt_id LEFT JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version
    WHERE w.id=? AND w.child_id=?`).bind(id, s.childId).first();
  if (!row) return Response.json({ error: "Submission not found" }, { status: 404 });
  const r = Response.json({ submission: row });
  if (s.isNew) r.headers.set("Set-Cookie", learnerCookie(s.sessionId));
  return r;
}
