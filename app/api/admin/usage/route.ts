import { getEnv } from "@/lib/cloudflare";
import { requireTenantSession } from "@/lib/auth/tenant";
import { tenantAiQuotaStatus } from "@/lib/tenant/usage";
export async function GET(request:Request){
  const auth=await requireTenantSession(request);if(auth.response)return auth.response;const session=auth.session!,db=getEnv().DB;
  const [summary,daily,recent,quota]=await Promise.all([
    db.prepare("SELECT COALESCE(SUM(request_count),0) requests,COALESCE(SUM(input_tokens),0) input_tokens,COALESCE(SUM(output_tokens),0) output_tokens,COALESCE(SUM(event_count),0) events FROM tenant_ai_daily_rollups WHERE tenant_id=? AND usage_date>=date('now','-30 days')").bind(session.tenant_id).first(),
    db.prepare("SELECT usage_date day,request_count requests,failed_count failed FROM tenant_ai_daily_rollups WHERE tenant_id=? AND usage_date>=date('now','-30 days') ORDER BY usage_date DESC").bind(session.tenant_id).all(),
    db.prepare("SELECT purpose,model,status,request_count,created_at FROM tenant_ai_usage WHERE tenant_id=? ORDER BY created_at DESC LIMIT 80").bind(session.tenant_id).all(),
    tenantAiQuotaStatus(db,session.tenant_id),
  ]);
  return Response.json({summary,daily:daily.results,recent:recent.results,quota});
}
