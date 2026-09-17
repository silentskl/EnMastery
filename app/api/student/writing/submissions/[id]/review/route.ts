import { resolveLearnerAiIntegrations } from "@/lib/settings/learner-runtime";
import { requireAuthenticatedLearner } from "@/lib/settings/learner-runtime";
import { learnerCookie } from "@/lib/student/session";
import { enqueueJob } from "@/lib/jobs/dispatch";

function safeJson<T>(text: string | null, fallback: T): T { try { return text ? JSON.parse(text) as T : fallback; } catch { return fallback; } }

export async function POST(request: Request, { params }: { params: Promise<{ id:string }> }) {
  const { env, session, tenantId, quota } = await resolveLearnerAiIntegrations(request);
  const denied=requireAuthenticatedLearner(session); if (denied) return denied;
  if (!quota.allowed) return Response.json({ error: "This organisation has reached its monthly AI request quota" }, { status: 429 });
  const { id } = await params;
  const row = await env.DB.prepare(`SELECT w.id,w.prompt_id,w.submission_text,w.plan_json,w.word_count,w.status,
      COALESCE(w.prompt_title_snapshot,c.title,'Writing task') prompt_title,
      COALESCE(w.prompt_body_snapshot,v.body_json,'{}') prompt_body_json,
      COALESCE(c.school_level,'P6') school_level
    FROM writing_submissions w
    LEFT JOIN content_items c ON c.id=w.prompt_id
    LEFT JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version
    WHERE w.id=? AND w.child_id=?`)
    .bind(id, session.childId).first<{ id:string; prompt_id:string; submission_text:string; plan_json:string|null; word_count:number; status:string; prompt_title:string; prompt_body_json:string; school_level:string }>();
  if (!row) return Response.json({ error: "Submission not found" }, { status: 404 });
  if (row.status === "evaluating") return Response.json({ error: "This submission is already being reviewed" }, { status: 409 });
  if (row.word_count < 40) return Response.json({ error: "Write at least 40 words before requesting feedback" }, { status: 400 });
  if (!env.MODELBRIDGE_API_KEY || !env.MODELBRIDGE_CHAT_MODEL) return Response.json({ error: "Your organisation has not configured ModelBridge" }, { status: 503 });

  const body = safeJson<Record<string, unknown>>(row.prompt_body_json, {});
  const plan = safeJson<Record<string, unknown>>(row.plan_json, {});
  const submissionId = `writing-${crypto.randomUUID()}`;
  await env.DB.prepare(`INSERT INTO writing_submissions
    (id,child_id,prompt_id,submission_text,plan_json,word_count,status,prompt_title_snapshot,prompt_body_snapshot,revision_of_submission_id)
    VALUES (?,?,?,?,?,?,'evaluating',?,?,?)`)
    .bind(submissionId, session.childId, row.prompt_id, row.submission_text, row.plan_json || "{}", row.word_count, row.prompt_title, row.prompt_body_json, row.id).run();

  const jobId = await enqueueJob(env.DB, env, {
    jobType: "writing_feedback", entityType: "writing_submission", entityId: submissionId, tenantId, createdBy: session.childId,
    request: { submissionId, childId: session.childId, promptId: row.prompt_id, schoolLevel: row.school_level === "P5" ? "P5" : "P6", writingType: String(body.writingType || "continuous"), prompt: String(body.prompt || ""), text: row.submission_text, plan }
  });
  const response = Response.json({ ok: true, submissionId, jobId, status: "evaluating" }, { status: 202 });
  if (session.isNew) response.headers.set("Set-Cookie", learnerCookie(session.sessionId));
  return response;
}
