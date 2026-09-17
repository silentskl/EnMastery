import { getEnv } from "@/lib/cloudflare";import{requireTenantSession}from"@/lib/auth/tenant";import{tenantAiQuotaStatus}from"@/lib/tenant/usage";
export async function GET(request:Request){const a=await requireTenantSession(request);if(a.response)return a.response;const s=a.session!,db=getEnv().DB;const row=await db.prepare(`SELECT
 (SELECT COUNT(*) FROM tenant_members WHERE tenant_id=? AND role='student' AND status='active') students,
 (SELECT COUNT(*) FROM content_items WHERE (scope='global' AND status='published') OR (scope='tenant' AND tenant_id=?)) tenant_content,
 (SELECT COUNT(*) FROM questions WHERE (scope='global' AND status='published') OR (scope='tenant' AND tenant_id=?)) tenant_questions,
 (SELECT COUNT(*) FROM courses WHERE tenant_id=? AND status!='archived') courses,
 (SELECT COUNT(*) FROM assignments WHERE tenant_id=? AND status='published') assignments,
 (SELECT COALESCE(SUM(request_count),0) FROM tenant_ai_daily_rollups WHERE tenant_id=? AND usage_date>=date('now','-30 days')) ai_requests_30d`).bind(s.tenant_id,s.tenant_id,s.tenant_id,s.tenant_id,s.tenant_id,s.tenant_id).first();const quota=await tenantAiQuotaStatus(db,s.tenant_id);return Response.json({tenant:{id:s.tenant_id,name:s.tenant_name,slug:s.tenant_slug},role:'admin',metrics:row,quota});}
