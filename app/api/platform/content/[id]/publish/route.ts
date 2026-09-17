import { getEnv } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(request); if (denied) return denied;
  const { id } = await params;
  const env = getEnv();
  const exists = await env.DB.prepare("SELECT id,active_version FROM content_items WHERE id=?").bind(id).first<{ id:string; active_version:number }>();
  if (!exists) return Response.json({ error: "Content not found" }, { status: 404 });
  await env.DB.batch([
    env.DB.prepare("UPDATE content_items SET status='published', published_at=COALESCE(published_at,CURRENT_TIMESTAMP), updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id),
    env.DB.prepare("UPDATE content_versions SET review_status='approved' WHERE content_id=? AND version=?").bind(id, exists.active_version),
    env.DB.prepare("UPDATE questions SET status='published' WHERE source_content_id=?").bind(id),
  ]);
  return Response.json({ ok: true, id });
}
