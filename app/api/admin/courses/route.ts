import { getEnv } from "@/lib/cloudflare";
import { requireTenantSession } from "@/lib/auth/tenant";

export async function GET(request: Request) {
  const auth = await requireTenantSession(request);
  if (auth.response) return auth.response;
  const session = auth.session!;
  const rows = await getEnv().DB.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM course_items i WHERE i.course_id=c.id) item_count,
      (SELECT COUNT(*) FROM assignments a WHERE a.course_id=c.id AND a.status!='archived') assignment_count
    FROM courses c
    WHERE c.tenant_id=?
    ORDER BY c.updated_at DESC
  `).bind(session.tenant_id).all();
  return Response.json({ courses: rows.results });
}

export async function POST(request: Request) {
  const auth = await requireTenantSession(request);
  if (auth.response) return auth.response;
  const session = auth.session!;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const title = String(body.title || "").trim();
  if (title.length < 2) return Response.json({ error: "Course title is required" }, { status: 400 });
  const id = `course-${crypto.randomUUID()}`;
  const level = body.schoolLevel === "P5" ? "P5" : "P6";
  await getEnv().DB.prepare("INSERT INTO courses (id,tenant_id,title,description,school_level,status,created_by) VALUES (?,?,?,?,?,'draft',?)")
    .bind(id, session.tenant_id, title, String(body.description || ""), level, session.user_id).run();
  return Response.json({ ok: true, id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireTenantSession(request);
  if (auth.response) return auth.response;
  const session = auth.session!;
  const body = await request.json().catch(() => ({})) as { ids?: unknown; status?: unknown };
  const ids = Array.isArray(body.ids)
    ? [...new Set(body.ids.filter((value): value is string => typeof value === "string" && value.length > 0))].slice(0, 100)
    : [];
  const nextStatus = body.status === "archived" ? "archived" : body.status === "draft" ? "draft" : null;
  if (!ids.length) return Response.json({ error: "Select at least one course" }, { status: 400 });
  if (!nextStatus) return Response.json({ error: "Bulk course status must be draft or archived" }, { status: 400 });

  const placeholders = ids.map(() => "?").join(",");
  const transitionGuard = nextStatus === "draft" ? "AND status='archived'" : "AND status!='archived'";
  const result = await getEnv().DB.prepare(`UPDATE courses SET status=?,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND id IN (${placeholders}) ${transitionGuard}`)
    .bind(nextStatus, session.tenant_id, ...ids).run();
  return Response.json({ ok: true, changed: result.meta.changes || 0, status: nextStatus });
}
