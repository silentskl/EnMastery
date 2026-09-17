import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";

type Row={id:string;prompt_id:string;word_count:number;status:string;scores_json:string|null;review_score:number|null;passed:number;passed_at:string|null;revision_of_submission_id:string|null;created_at:string;updated_at:string;title:string|null;school_level:string|null;topic:string|null};
function safeJson(text:string){try{return JSON.parse(text) as Record<string,unknown>}catch{return null}}

export async function GET(request: Request) {
  const env = getEnv();
  const s = await ensureLearnerSession(request, env.DB);
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") || 50) || 50));
  const rows = await env.DB.prepare(`SELECT w.id,w.prompt_id,w.word_count,w.status,w.scores_json,w.review_score,w.passed,w.passed_at,w.revision_of_submission_id,w.created_at,w.updated_at,
    COALESCE(w.prompt_title_snapshot,c.title,'Writing task') title,c.school_level,c.topic
    FROM writing_submissions w LEFT JOIN content_items c ON c.id=w.prompt_id
    WHERE w.child_id=? ORDER BY w.created_at DESC,w.id DESC LIMIT ?`).bind(s.childId, limit).all<Row>();
  const ordered = [...rows.results].reverse(), versions = new Map<string,number>(), versionById = new Map<string,number>();
  for (const row of ordered) { const n = (versions.get(row.prompt_id) || 0) + 1; versions.set(row.prompt_id, n); versionById.set(row.id, n); }
  const submissions = rows.results.map(row => ({ ...row, versionNumber: versionById.get(row.id) || 1, scores: row.scores_json ? safeJson(row.scores_json) : null }));
  const r = Response.json({ submissions });
  if (s.isNew) r.headers.set("Set-Cookie", learnerCookie(s.sessionId));
  return r;
}
