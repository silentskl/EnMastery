import { getEnv } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import { softDeleteListeningLessons } from "@/lib/listening/delete";
export async function GET(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  const env = getEnv();
  const rows = await env.DB.prepare("SELECT c.id,c.title,c.school_level,c.topic,c.status,c.description,c.source_attribution,c.published_at,c.generation_job_id,c.generation_stage,c.generation_error,j.progress AS generation_progress,m.media_kind,m.provider,m.question_basis,COUNT(q.id) AS question_count FROM content_items c JOIN content_media m ON m.content_id=c.id LEFT JOIN generation_jobs j ON j.id=c.generation_job_id LEFT JOIN questions q ON q.source_content_id=c.id WHERE c.content_type IN ('audio','video_ref') AND c.status<>'deleted' GROUP BY c.id ORDER BY c.created_at DESC LIMIT 100").all();
  return Response.json({ contents: rows.results });
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  const body = await request.json().catch(() => ({})) as { ids?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.filter((v): v is string => typeof v === "string") : [];
  if (!ids.length) return Response.json({ error: "Select at least one listening lesson" }, { status: 400 });
  const result = await softDeleteListeningLessons(getEnv().DB, ids);
  return Response.json({ ok: true, ...result, requested: ids.length });
}
