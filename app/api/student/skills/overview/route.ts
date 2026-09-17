import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
import { getVisibleLessonIds } from "@/lib/tenant/lesson-availability";

type DomainKey = "listen" | "speak" | "read" | "write";
type DomainRow = { domain: string; mastery: number; evidence_count: number; skill_count: number };

const domainMap: Record<string, DomainKey> = { listening: "listen", speaking: "speak", reading: "read", writing: "write" };

export async function GET(request: Request) {
  const env = getEnv();
  const session = await ensureLearnerSession(request, env.DB);
  const profile = await env.DB.prepare("SELECT school_level FROM child_profiles WHERE id=?").bind(session.childId).first<{ school_level: string }>();
  const level = profile?.school_level === "P5" ? "P5" : "P6";
  const { tenantId } = await learnerTenantContext(env.DB, session.childId);

  const masteryRows = await env.DB.prepare(`
    SELECT s.domain,
           ROUND(AVG(CASE WHEN COALESCE(m.evidence_count,0)>0 THEN m.mastery END),1) AS mastery,
           SUM(CASE WHEN COALESCE(m.evidence_count,0)>0 THEN 1 ELSE 0 END) AS evidence_count,
           COUNT(*) AS skill_count
    FROM skills s
    LEFT JOIN skill_mastery m ON m.skill_id=s.id AND m.child_id=?
    WHERE s.school_level='P5' OR (?='P6' AND s.school_level='P6')
    GROUP BY s.domain
  `).bind(session.childId, level).all<DomainRow>();

  const [listenIds,speakIds,readIds,writeIds]=await Promise.all([
    getVisibleLessonIds(env.DB,tenantId,level,"listen"),getVisibleLessonIds(env.DB,tenantId,level,"speak"),
    getVisibleLessonIds(env.DB,tenantId,level,"read"),getVisibleLessonIds(env.DB,tenantId,level,"write")
  ]);
  const counts = await env.DB.batch([
    env.DB.prepare("SELECT COUNT(DISTINCT c.id) n FROM content_items c JOIN questions q ON q.source_content_id=c.id AND q.status='published' AND (q.scope='global' OR (q.scope='tenant' AND q.tenant_id=?)) WHERE c.status='published' AND c.school_level=? AND c.content_type IN ('audio','video_ref') AND (c.scope='global' OR (c.scope='tenant' AND c.tenant_id=?))").bind(tenantId,level,tenantId),
    env.DB.prepare("SELECT COUNT(*) n FROM content_items WHERE status='published' AND school_level=? AND content_type='oral_prompt' AND (scope='global' OR (scope='tenant' AND tenant_id=?))").bind(level,tenantId),
    env.DB.prepare("SELECT COUNT(*) n FROM practice_sets WHERE status='published' AND school_level=? AND (scope='global' OR (scope='tenant' AND tenant_id=?))").bind(level,tenantId),
    env.DB.prepare("SELECT COUNT(*) n FROM content_items WHERE status='published' AND school_level=? AND content_type='writing_prompt' AND (scope='global' OR (scope='tenant' AND tenant_id=?))").bind(level,tenantId),
  ]);
  const n = (index: number) => Number((counts[index].results?.[0] as { n?: number } | undefined)?.n || 0);
  const masteryByKey = new Map<DomainKey, DomainRow>();for (const row of masteryRows.results) { const key = domainMap[row.domain]; if (key) masteryByKey.set(key, row); }
  const config = [
    { key:"listen" as const, label:"Listen", icon:"LI", learnDetail:"Authentic audio, guided listening and intensive listening", practiceDetail:"Main idea, detail, inference, dictation and shadowing", learnHref:"/learn/listen", practiceHref:"/practice/listen", learnCount:listenIds.size, practiceCount:n(0), practiceUnit:"guided lessons" },
    { key:"speak" as const, label:"Speak", icon:"SP", learnDetail:"Reading aloud, stimulus conversation and AI speaking coach", practiceDetail:"Oral response, fluency, pronunciation and interaction practice", learnHref:"/learn/speak", practiceHref:"/practice/speak", learnCount:speakIds.size, practiceCount:n(1), practiceUnit:"oral prompts" },
    { key:"read" as const, label:"Read", icon:"RE", learnDetail:"Guided reading, vocabulary, grammar and comprehension", practiceDetail:"Paper 2 grammar, vocabulary, cloze, synthesis and comprehension", learnHref:"/learn/read", practiceHref:"/practice/read", learnCount:readIds.size, practiceCount:n(2), practiceUnit:"practice sets" },
    { key:"write" as const, label:"Write", icon:"WR", learnDetail:"Situational and continuous writing with guided revision", practiceDetail:"Planning, drafting and hint-first revision practice", learnHref:"/learn/write", practiceHref:"/practice/write", learnCount:writeIds.size, practiceCount:n(3), practiceUnit:"writing prompts" },
  ];
  const domains = config.map(item => { const mastery = masteryByKey.get(item.key); return { ...item, mastery:Number(mastery?.mastery||0), evidenceCount:Number(mastery?.evidence_count||0), skillCount:Number(mastery?.skill_count||0) }; });
  const response = Response.json({ level, domains }); if (session.isNew) response.headers.set("Set-Cookie", learnerCookie(session.sessionId)); return response;
}
