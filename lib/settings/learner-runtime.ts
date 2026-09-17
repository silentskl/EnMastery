import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession } from "@/lib/student/session";
import { tenantIdForChild } from "@/lib/auth/tenant";
import { resolveIntegrations } from "@/lib/settings/runtime";
import { resolveTenantIntegrations } from "@/lib/settings/tenant-runtime";
import { tenantAiQuotaStatus } from "@/lib/tenant/usage";

export async function resolveLearnerIntegrations(request:Request){
  const base=await resolveIntegrations(getEnv());
  const session=await ensureLearnerSession(request,base.DB);
  if(!session.authenticated){
    // Guests may read global platform content, but must never receive tenant
    // integrations. Keep the platform runtime only for non-AI public pages.
    return{env:base,session,tenantId:"",authenticated:false as const};
  }
  const tenantId=await tenantIdForChild(base.DB,session.childId);
  const env=await resolveTenantIntegrations(base,tenantId);
  return{env,session,tenantId,authenticated:true as const};
}

export async function resolveLearnerAiIntegrations(request:Request){
  const resolved=await resolveLearnerIntegrations(request);
  if(!resolved.authenticated){
    return{...resolved,quota:{quota:null,used:0,remaining:null,allowed:false} as const};
  }
  const quota=await tenantAiQuotaStatus(resolved.env.DB,resolved.tenantId);
  return{...resolved,quota};
}

export function requireAuthenticatedLearner(session:{authenticated?:boolean}){
  return session.authenticated===true?null:Response.json({error:"Please sign in as a student to use AI features."},{status:401});
}
