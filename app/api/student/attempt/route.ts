import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { scoreQuestion, safeJson } from "@/lib/content/store";
import { updateMastery } from "@/lib/student/mastery";
import { completeMatchingTasks } from "@/lib/student/tasks";
import { learnerTenantContext } from "@/lib/tenant/learner-context";

export async function POST(request: Request) {
  const env = getEnv();
  const session = await ensureLearnerSession(request, env.DB);
  const { tenantId } = await learnerTenantContext(env.DB, session.childId);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const questionId = typeof body.questionId === "string" ? body.questionId : "";
  const contentId = typeof body.contentId === "string" ? body.contentId : "";
  if (!questionId || !contentId) return Response.json({ error: "questionId and contentId are required" }, { status: 400 });
  const content = await env.DB.prepare("SELECT id,content_type FROM content_items WHERE id=? AND status='published' AND (scope='global' OR (scope='tenant' AND tenant_id=?))").bind(contentId,tenantId).first<{id:string;content_type:string}>();
  if(!content)return Response.json({error:"Learning content not found"},{status:404});
  const question = await env.DB.prepare("SELECT id,question_type,answer_json,explanation_json,marks,created_at FROM questions WHERE id=? AND source_content_id=? AND status='published' AND (scope='global' OR (scope='tenant' AND tenant_id=?))").bind(questionId, contentId,tenantId).first<{ id:string; question_type:string; answer_json:string; explanation_json:string|null; marks:number; created_at:string }>();
  if (!question) return Response.json({ error: "Question not found" }, { status: 404 });
  if(content.content_type === "article" || content.content_type === "lesson") {
    const blocked = await env.DB.prepare(`SELECT COUNT(*) blocked FROM questions earlier
      WHERE earlier.source_content_id=? AND earlier.status='published'
        AND (earlier.created_at < ? OR (earlier.created_at = ? AND earlier.id < ?))
        AND NOT EXISTS (SELECT 1 FROM question_attempts a WHERE a.child_id=? AND a.content_id=? AND a.question_id=earlier.id AND a.is_correct=1)`)
      .bind(contentId,question.created_at,question.created_at,question.id,session.childId,contentId).first<{blocked:number}>();
    if(Number(blocked?.blocked||0)>0)return Response.json({error:"Answer the previous Reading question correctly before continuing"},{status:409});
  }
  const scored = scoreQuestion(question.question_type, question.answer_json, body.response);
  const score = Math.round(scored.ratio * question.marks * 10) / 10;
  const attemptId = `qa-${crypto.randomUUID()}`;
  const explanation = safeJson<{ text?: string }>(question.explanation_json, {});
  await env.DB.prepare("INSERT INTO question_attempts (id,child_id,content_id,question_id,response_json,is_correct,score,max_score,feedback_json) VALUES (?,?,?,?,?,?,?,?,?)")
    .bind(attemptId, session.childId, contentId, questionId, JSON.stringify(body.response ?? {}), scored.correct ? 1 : 0, score, question.marks, JSON.stringify({ text: scored.feedback, explanation: explanation.text || "" })).run();
  await updateMastery(env.DB, session.childId, questionId, scored.correct);
  await env.DB.prepare("INSERT INTO xp_ledger (id,child_id,event_type,points,reference_id) VALUES (?,?,?,?,?)").bind(`xp-${crypto.randomUUID()}`, session.childId, scored.correct ? "answer_correct" : "answer_attempt", scored.correct ? 5 : 2, attemptId).run();
  const total = await env.DB.prepare("SELECT COUNT(*) AS total FROM questions WHERE source_content_id=? AND status='published' AND (scope='global' OR (scope='tenant' AND tenant_id=?))").bind(contentId,tenantId).first<{ total:number }>();
  const done = await env.DB.prepare("SELECT COUNT(DISTINCT question_id) AS done FROM question_attempts WHERE child_id=? AND content_id=? AND is_correct=1").bind(session.childId, contentId).first<{ done:number }>();
  const summary = await env.DB.prepare("SELECT passed FROM learning_summary_attempts WHERE child_id=? AND content_id=? AND status='reviewed' ORDER BY created_at DESC LIMIT 1").bind(session.childId,contentId).first<{passed:number}>();
  const questionsPassed=Number(done?.done||0)>=Number(total?.total||0),summaryPassed=Boolean(summary?.passed);
  const questionProgress=Math.min(80,Math.round(((done?.done||0)/Math.max(total?.total||1,1))*80));
  const progress=questionsPassed&&summaryPassed?100:Math.min(99,questionProgress+(summaryPassed?20:0));
  await env.DB.prepare("INSERT INTO learner_content_progress (child_id,content_id,status,progress_percent,completed_at) VALUES (?,?,?,?,?) ON CONFLICT(child_id,content_id) DO UPDATE SET status=excluded.status,progress_percent=excluded.progress_percent,completed_at=excluded.completed_at,updated_at=CURRENT_TIMESTAMP")
    .bind(session.childId, contentId, progress >= 100 ? "completed" : "started", progress, progress >= 100 ? new Date().toISOString() : null).run();
  if (progress >= 100) await completeMatchingTasks(env.DB, session.childId, content.content_type === "article" || content.content_type === "lesson" ? "reading" : "listening", contentId);
  const response = Response.json({ correct: scored.correct, score, maxScore: question.marks, feedback: scored.feedback, explanation: explanation.text || "", progress });
  if (session.isNew) response.headers.set("Set-Cookie", learnerCookie(session.sessionId));
  return response;
}
