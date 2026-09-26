import { getEnv } from "@/lib/cloudflare";
import { requireTenantSession } from "@/lib/auth/tenant";

export async function GET(request: Request) {
  const auth = await requireTenantSession(request);
  if (auth.response) return auth.response;

  const session = auth.session!;
  const db = getEnv().DB;
  const tenantId = session.tenant_id;

  // Keep every dashboard query index-bounded and send them to D1 in one batch.
  // This replaces the previous scalar-subquery statement + a second quota lookup.
  const [students, globalContent, tenantContent, globalQuestions, tenantQuestions, courses, assignments, ai30, monthAi, tenant] = await db.batch([
    db.prepare("SELECT COUNT(*) n FROM tenant_members WHERE tenant_id=? AND role='student' AND status='active'").bind(tenantId),
    db.prepare("SELECT COUNT(*) n FROM content_items WHERE scope='global' AND status='published'"),
    db.prepare("SELECT COUNT(*) n FROM content_items WHERE scope='tenant' AND tenant_id=?").bind(tenantId),
    db.prepare("SELECT COUNT(*) n FROM questions WHERE scope='global' AND status='published'"),
    db.prepare("SELECT COUNT(*) n FROM questions WHERE scope='tenant' AND tenant_id=?").bind(tenantId),
    db.prepare("SELECT COUNT(*) n FROM courses WHERE tenant_id=? AND status!='archived'").bind(tenantId),
    db.prepare("SELECT COUNT(*) n FROM assignments WHERE tenant_id=? AND status='published'").bind(tenantId),
    db.prepare("SELECT COALESCE(SUM(request_count),0) n FROM tenant_ai_daily_rollups WHERE tenant_id=? AND usage_date>=date('now','-30 days')").bind(tenantId),
    db.prepare("SELECT COALESCE(SUM(request_count),0) n FROM tenant_ai_daily_rollups WHERE tenant_id=? AND usage_date>=strftime('%Y-%m-01','now') AND usage_date<date(strftime('%Y-%m-01','now'),'+1 month')").bind(tenantId),
    db.prepare("SELECT id,plan,ai_request_quota_monthly FROM tenants WHERE id=? AND status='active'").bind(tenantId),
  ]);

  const count = (result: D1Result<unknown>) => Number((result.results?.[0] as { n?: number } | undefined)?.n || 0);
  const tenantRow = tenant.results?.[0] as { id?: string; plan?: string; ai_request_quota_monthly?: number | null } | undefined;
  const used = count(monthAi);
  const platformOwned = tenantId === "tenant-default" || tenantRow?.plan === "platform";
  const quotaValue = platformOwned ? null : (tenantRow?.ai_request_quota_monthly ?? null);

  return Response.json({
    tenant: { id: tenantId, name: session.tenant_name, slug: session.tenant_slug },
    role: "admin",
    metrics: {
      students: count(students),
      tenant_content: count(globalContent) + count(tenantContent),
      tenant_questions: count(globalQuestions) + count(tenantQuestions),
      courses: count(courses),
      assignments: count(assignments),
      ai_requests_30d: count(ai30),
    },
    quota: {
      quota: quotaValue,
      used,
      remaining: quotaValue === null ? null : Math.max(0, quotaValue - used),
      allowed: quotaValue === null || used < quotaValue,
    },
  });
}
