import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { getListeningContent } from "@/lib/listening/store";
import { questionForStudent } from "@/lib/content/store";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
import { isLessonVisible } from "@/lib/tenant/lesson-availability";
import { normalizeLearningStage } from "@/lib/language/stages";
import { difficultyRange, getTenantPracticePolicy } from "@/lib/settings/practice-policy";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const env = getEnv();
  const session = await ensureLearnerSession(request, env.DB);
  const { tenantId, schoolLevel } = await learnerTenantContext(env.DB, session.childId);
  const practice = new URL(request.url).searchParams.get("practice") === "1";
  const policy = practice ? await getTenantPracticePolicy(env.DB, tenantId, schoolLevel, "listening") : null;
  const range = policy ? difficultyRange(policy.difficulty) : null;
  const { id } = await params;
  const visible = await env.DB.prepare("SELECT id,school_level FROM content_items WHERE id=? AND status='published' AND content_type IN ('audio','video_ref') AND (scope='global' OR (scope='tenant' AND tenant_id=?))")
    .bind(id, tenantId).first<{id:string;school_level:string}>();
  if (!visible) return Response.json({ error: "Listening lesson not found" }, { status: 404 });
  const level = normalizeLearningStage(visible.school_level, schoolLevel);
  if (policy && level !== policy.contentStage) return Response.json({error:"This lesson is outside the Tenant Listening practice stage"},{status:403});
  if (!await isLessonVisible(env.DB,tenantId,level,"listen",id,session.childId)) return Response.json({error:"This listening lesson is not currently open for this learner"},{status:403});
  const content = await getListeningContent(env.DB, id, true);
  if (!content) return Response.json({ error: "Listening lesson not found" }, { status: 404 });
  const visibleQuestions = [] as typeof content.questions;
  for (const question of content.questions) {
    const qid = String((question as unknown as { id?: unknown }).id || "");
    if (!qid) continue;
    const q = await env.DB.prepare("SELECT id,difficulty FROM questions WHERE id=? AND status='published' AND (scope='global' OR (scope='tenant' AND tenant_id=?))").bind(qid, tenantId).first<{id:string;difficulty:number}>();
    if (q && (!range || (Number(q.difficulty)>=range[0] && Number(q.difficulty)<=range[1]))) visibleQuestions.push(question);
  }
  const selectedQuestions = policy ? visibleQuestions.slice(0, policy.questionCount) : visibleQuestions;
  await env.DB.prepare("INSERT INTO learner_content_progress (child_id,content_id,status,progress_percent) VALUES (?,?,'started',10) ON CONFLICT(child_id,content_id) DO UPDATE SET progress_percent=MAX(progress_percent,10),updated_at=CURRENT_TIMESTAMP").bind(session.childId, id).run();
  const attempts = await env.DB.prepare("SELECT COUNT(*) attempt_count FROM question_attempts WHERE child_id=? AND content_id=?").bind(session.childId,id).first<{attempt_count:number}>();
  const correctIds = new Set<string>();
  for (const question of selectedQuestions) {
    const qid = String((question as unknown as { id?: unknown }).id || "");
    const correct = qid ? await env.DB.prepare("SELECT 1 ok FROM question_attempts WHERE child_id=? AND content_id=? AND question_id=? AND is_correct=1 LIMIT 1").bind(session.childId,id,qid).first<{ok:number}>() : null;
    if (correct) correctIds.add(qid);
  }
  const summary=await env.DB.prepare("SELECT passed,score,status FROM learning_summary_attempts WHERE child_id=? AND content_id=? ORDER BY created_at DESC LIMIT 1").bind(session.childId,id).first<{passed:number;score:number|null;status:string}>();
  const totalQuestions=selectedQuestions.length,questionsPassed=totalQuestions===0||correctIds.size>=totalQuestions,summaryPassed=Boolean(summary?.passed);
  const publicContent = { ...content, questions: selectedQuestions.map((q) => questionForStudent(q as unknown as Record<string, unknown>)), learningRecord:{correctQuestions:correctIds.size,totalQuestions,attemptCount:Number(attempts?.attempt_count||0),questionsPassed,summaryPassed,pass:questionsPassed&&summaryPassed} };
  const response = Response.json({ content: publicContent, practicePolicy: policy });
  if (session.isNew) response.headers.set("Set-Cookie", learnerCookie(session.sessionId));
  return response;
}
