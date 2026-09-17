export type TenantQuotaStatus={quota:number|null;used:number;remaining:number|null;allowed:boolean};
export async function tenantAiQuotaStatus(db:D1Database,tenantId:string):Promise<TenantQuotaStatus>{
  const tenant=await db.prepare("SELECT id,plan,ai_request_quota_monthly FROM tenants WHERE id=? AND status='active'").bind(tenantId).first<{id:string;plan:string;ai_request_quota_monthly:number|null}>();
  if(!tenant)throw new Error("Tenant is not active");
  const row=await db.prepare("SELECT COALESCE(SUM(request_count),0) used FROM tenant_ai_daily_rollups WHERE tenant_id=? AND usage_date>=strftime('%Y-%m-01','now') AND usage_date<date(strftime('%Y-%m-01','now'),'+1 month')").bind(tenantId).first<{used:number}>();
  const used=Number(row?.used||0),platformOwned=tenant.id==="tenant-default"||tenant.plan==="platform",quota=platformOwned?null:tenant.ai_request_quota_monthly;
  return{quota,used,remaining:quota===null?null:Math.max(0,quota-used),allowed:quota===null||used<quota};
}
export async function assertTenantAiQuota(db:D1Database,tenantId:string){const status=await tenantAiQuotaStatus(db,tenantId);if(!status.allowed)throw new Error("This organisation has reached its monthly AI request quota");return status;}
export async function recordTenantAiUsage(db:D1Database,args:{tenantId:string;purpose:string;model?:string|null;childId?:string|null;userId?:string|null;status?:"succeeded"|"failed";inputTokens?:number|null;outputTokens?:number|null}){await db.prepare("INSERT INTO tenant_ai_usage (id,tenant_id,user_id,child_id,purpose,model,request_count,input_tokens,output_tokens,status) VALUES (?,?,?,?,?,?,1,?,?,?)").bind(`usage-${crypto.randomUUID()}`,args.tenantId,args.userId||null,args.childId||null,args.purpose,args.model||null,args.inputTokens??null,args.outputTokens??null,args.status||"succeeded").run();}
