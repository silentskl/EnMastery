import { getEnv } from "@/lib/cloudflare";
import { requestTenantPasswordReset, invalidateTenantPasswordReset } from "@/lib/auth/password-reset";
import { resolveIntegrations } from "@/lib/settings/runtime";
import { sendTenantPasswordResetEmail } from "@/lib/notifications/account-emails";
const GENERIC_MESSAGE="If the Tenant Admin account exists, a password reset link will be sent to its email address.";

export async function POST(request:Request){
  const env=getEnv(),body=await request.json().catch(()=>({})) as Record<string,unknown>;
  const tenantSlug=String(body.tenantSlug||""),email=String(body.email||"");
  const ip=request.headers.get("CF-Connecting-IP")||request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
  const runtime=await resolveIntegrations(env);
  if((runtime.SMTP_ENABLED||"false").toLowerCase()!=="true"||!runtime.SMTP_HOST||!runtime.SMTP_FROM_EMAIL){
    return Response.json({error:"Password reset email is currently unavailable. Please contact the platform administrator."},{status:503});
  }
  try{
    const reset=await requestTenantPasswordReset(env.DB,{tenantSlug,email,ip});
    if(!reset.matched)return Response.json({ok:true,message:GENERIC_MESSAGE});
    const origin=new URL(request.url).origin;
    const resetUrl=`${origin}/admin/reset-password?token=${encodeURIComponent(reset.rawToken)}`;
    try{
      const result=await sendTenantPasswordResetEmail(runtime,{to:reset.email,tenantName:reset.tenant_name,tenantSlug:reset.tenant_slug,resetUrl});
      if(!result.sent)await invalidateTenantPasswordReset(env.DB,reset.id);
      await env.DB.prepare("INSERT INTO audit_logs (id,actor_user_id,action,entity_type,entity_id,detail_json) VALUES (?,NULL, 'tenant.password_reset_requested','tenant',?,?)")
        .bind(`audit-${crypto.randomUUID()}`,reset.tenant_id,JSON.stringify({email:reset.email,emailSent:result.sent})).run().catch(()=>null);
    }catch(error){
      await invalidateTenantPasswordReset(env.DB,reset.id).catch(()=>null);
      await env.DB.prepare("INSERT INTO audit_logs (id,actor_user_id,action,entity_type,entity_id,detail_json) VALUES (?,NULL, 'tenant.password_reset_email_failed','tenant',?,?)")
        .bind(`audit-${crypto.randomUUID()}`,reset.tenant_id,JSON.stringify({email:reset.email,error:error instanceof Error?error.message:"SMTP failed"})).run().catch(()=>null);
    }
    return Response.json({ok:true,message:GENERIC_MESSAGE});
  }catch(error){
    const message=error instanceof Error?error.message:"Password reset request failed";
    if(message.includes("Too many"))return Response.json({error:message},{status:429});
    return Response.json({ok:true,message:GENERIC_MESSAGE});
  }
}
