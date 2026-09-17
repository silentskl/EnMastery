import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
import { getVisibleLessonIds } from "@/lib/tenant/lesson-availability";
import { isLearningStage } from "@/lib/language/stages";
import { difficultyRange, getTenantPracticePolicy } from "@/lib/settings/practice-policy";

export async function GET(request: Request) {
  const env = getEnv();
  const session = await ensureLearnerSession(request, env.DB);
  const { tenantId, schoolLevel } = await learnerTenantContext(env.DB, session.childId);
  const url = new URL(request.url);
  const practice = url.searchParams.get("practice") === "1";
  const practicePolicy = practice ? await getTenantPracticePolicy(env.DB, tenantId, schoolLevel, "listening") : null;
  const requestedLevel = url.searchParams.get("level");
  const level = practicePolicy?.contentStage || (isLearningStage(requestedLevel) ? requestedLevel : schoolLevel);
  const range = practicePolicy ? difficultyRange(practicePolicy.difficulty) : null;
  const difficultyFlag = range ? 1 : 0;
  const low = range?.[0] || 1;
  const high = range?.[1] || 5;
  const allowed = await getVisibleLessonIds(env.DB, tenantId, level, "listen");
  const rows = await env.DB.prepare(`SELECT c.id,c.title,c.school_level,c.topic,c.description,c.source_attribution,c.published_at,
      m.media_kind,m.provider,m.thumbnail_url,m.duration_seconds,m.made_for_kids,m.question_basis,
      COALESCE(p.progress_percent,0) AS progress_percent,COALESCE(p.status,'not_started') AS progress_status,COUNT(q.id) AS question_count
    FROM content_items c JOIN content_media m ON m.content_id=c.id
    LEFT JOIN learner_content_progress p ON p.content_id=c.id AND p.child_id=?
    LEFT JOIN questions q ON q.source_content_id=c.id AND q.status='published' AND (q.scope='global' OR (q.scope='tenant' AND q.tenant_id=?))
      AND (?=0 OR q.difficulty BETWEEN ? AND ?)
    WHERE c.status='published' AND c.content_type IN ('audio','video_ref') AND c.school_level=?
      AND (c.scope='global' OR (c.scope='tenant' AND c.tenant_id=?))
    GROUP BY c.id ORDER BY c.published_at DESC,c.created_at DESC LIMIT 200`)
    .bind(session.childId, tenantId, difficultyFlag, low, high, level, tenantId).all<Record<string, unknown>>();
  const contents = rows.results.filter((x) => allowed.has(String(x.id))).filter((x) => !practice || String(x.media_kind) === "owned_audio" || Number(x.question_count || 0) > 0);
  const response = Response.json({ contents, level, practicePolicy });
  if (session.isNew) response.headers.set("Set-Cookie", learnerCookie(session.sessionId));
  return response;
}
