import { resolveLearnerAiIntegrations } from "@/lib/settings/learner-runtime";
import { requireAuthenticatedLearner } from "@/lib/settings/learner-runtime";
import { learnerCookie } from "@/lib/student/session";
import { enqueueJob } from "@/lib/jobs/dispatch";
import { getVisibleLessonIds } from "@/lib/tenant/lesson-availability";
import { getTenantPassScore } from "@/lib/settings/learning-policy";
import { getTenantDailyTaskPolicy } from "@/lib/settings/daily-task-policy";
import { normalizeLearningStage } from "@/lib/language/stages";

export async function POST(request: Request) {
  const { env, session: s, tenantId, quota } = await resolveLearnerAiIntegrations(request);const denied=requireAuthenticatedLearner(s);if(denied)return denied;
  if (!quota.allowed) return Response.json({ error: "This organisation has reached its monthly AI request quota" }, { status: 429 });

  const b = await request.json().catch(() => ({})) as Record<string, unknown>;
  const promptId = String(b.promptId || "");
  const text = String(b.text || "").trim();
  const plan = b.plan;
  const sourceSubmissionId = typeof b.sourceSubmissionId === "string" && b.sourceSubmissionId ? b.sourceSubmissionId : null;

  const ownedRevision = sourceSubmissionId ? await env.DB.prepare(`SELECT w.id,COALESCE(w.prompt_title_snapshot,c.title,'Writing task') title,COALESCE(w.prompt_body_snapshot,v.body_json,'{}') body_json,COALESCE(c.school_level,'P6') school_level
      FROM writing_submissions w LEFT JOIN content_items c ON c.id=w.prompt_id LEFT JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version
      WHERE w.id=? AND w.child_id=? AND w.prompt_id=?`)
      .bind(sourceSubmissionId, s.childId, promptId).first<{ id:string; title:string; body_json:string; school_level:string }>() : null;
  if (sourceSubmissionId && !ownedRevision) return Response.json({ error: "Revision source was not found" }, { status: 404 });

  let p = await env.DB.prepare(`SELECT c.id,c.title,c.school_level,v.body_json
    FROM content_items c JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version
    WHERE c.id=? AND c.content_type='writing_prompt' AND c.status='published'
      AND (c.scope='global' OR (c.scope='tenant' AND c.tenant_id=?))`)
    .bind(promptId, tenantId).first<{ id:string; title:string; school_level:string; body_json:string }>();
  if (!p && ownedRevision) p={id:promptId,title:ownedRevision.title,school_level:ownedRevision.school_level,body_json:ownedRevision.body_json};
  if (!p) return Response.json({ error: "Writing prompt not found" }, { status: 404 });

  const allowed = await getVisibleLessonIds(env.DB, tenantId, p.school_level === "P5" ? "P5" : "P6", "write");
  const failedRevision = await env.DB.prepare(`SELECT 1 ok FROM writing_submissions w
    WHERE w.child_id=? AND w.prompt_id=? AND w.status='reviewed' AND w.passed=0
      AND NOT EXISTS(SELECT 1 FROM writing_submissions x WHERE x.child_id=w.child_id AND x.prompt_id=w.prompt_id AND x.passed=1)
    LIMIT 1`).bind(s.childId, promptId).first();
  if (!allowed.has(promptId) && !failedRevision && !ownedRevision) {
    return Response.json({ error: "This writing task is not currently open for this learner" }, { status: 403 });
  }

  const locked = await env.DB.prepare(`SELECT w.prompt_id FROM writing_submissions w
    WHERE w.child_id=? AND w.status='reviewed' AND w.passed=0
      AND NOT EXISTS (SELECT 1 FROM writing_submissions p WHERE p.child_id=w.child_id AND p.prompt_id=w.prompt_id AND p.passed=1)
    ORDER BY w.updated_at DESC,w.created_at DESC LIMIT 1`).bind(s.childId).first<{ prompt_id:string }>();
  if (locked?.prompt_id && locked.prompt_id !== promptId && !ownedRevision) {
    return Response.json({ error: "Revise and pass your current writing before starting another writing task", lockedPromptId: locked.prompt_id }, { status: 409 });
  }

  const writingPolicy=await getTenantDailyTaskPolicy(env.DB,tenantId,normalizeLearningStage(p.school_level,"P6"));
  const minimumWords=writingPolicy.writingMinWords;
  if (text.split(/\s+/).filter(Boolean).length < minimumWords) return Response.json({ error: `Write at least ${minimumWords} words before requesting feedback`, minimumWords }, { status: 400 });
  if (!env.MODELBRIDGE_API_KEY || !env.MODELBRIDGE_CHAT_MODEL) return Response.json({ error: "Your organisation has not configured ModelBridge" }, { status: 503 });

  const body = JSON.parse(p.body_json) as Record<string, unknown>;
  const passMark=await getTenantPassScore(env.DB,tenantId);
  const submissionId = `writing-${crypto.randomUUID()}`;
  const wc = text.split(/\s+/).filter(Boolean).length;
  await env.DB.prepare(`INSERT INTO writing_submissions
    (id,child_id,prompt_id,submission_text,plan_json,word_count,status,prompt_title_snapshot,prompt_body_snapshot,revision_of_submission_id)
    VALUES (?,?,?,?,?,?,'evaluating',?,?,?)`)
    .bind(submissionId, s.childId, promptId, text, JSON.stringify(plan || {}), wc, p.title, p.body_json, sourceSubmissionId).run();

  const jobId = await enqueueJob(env.DB, env, {
    jobType: "writing_feedback", entityType: "writing_submission", entityId: submissionId, tenantId, createdBy: s.childId,
    request: { submissionId, childId: s.childId, promptId, schoolLevel: normalizeLearningStage(p.school_level,"P6"), writingType: String(body.writingType || "continuous"), prompt: String(body.prompt || ""), text, plan, passMark, minimumWords }
  });
  await env.DB.prepare("UPDATE writing_submissions SET generation_job_id=? WHERE id=?").bind(jobId, submissionId).run();
  const r = Response.json({ ok: true, submissionId, jobId, status: "evaluating" }, { status: 202 });
  if (s.isNew) r.headers.set("Set-Cookie", learnerCookie(s.sessionId));
  return r;
}
