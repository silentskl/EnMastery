import { getEnv } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import { setTenantAdmin } from "@/lib/auth/tenant";
import { resolveIntegrations } from "@/lib/settings/runtime";
import { sendTenantWelcomeEmail } from "@/lib/notifications/account-emails";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const denied=await requireAdmin(request);if(denied)return denied;const {id}=await params,env=getEnv();
  const tenant=await env.DB.prepare("SELECT id,slug,name,status FROM tenants WHERE id=? LIMIT 1").bind(id).first<{id:string;slug:string;name:string;status:string}>();
  if(!tenant)return Response.json({error:"Tenant not found"},{status:404});
  const body=await request.json().catch(()=>({})) as Record<string,unknown>,email=String(body.email||"").trim(),displayName=String(body.displayName||"Admin").trim()||"Admin",password=String(body.password||"");
  const existingAdmin=await env.DB.prepare("SELECT user_id FROM tenant_members WHERE tenant_id=? AND role='admin' AND status='active' LIMIT 1").bind(id).first<{user_id:string}>();
  try{
    const userId=await setTenantAdmin(env.DB,{tenantId:id,email,displayName,password});
    let welcomeEmailSent=false;
    if(!existingAdmin){try{const runtime=await resolveIntegrations(env),mail=await sendTenantWelcomeEmail(runtime,{to:email,tenantName:tenant.name,tenantSlug:tenant.slug,adminEmail:email,origin:new URL(request.url).origin});welcomeEmailSent=mail.sent;}catch{/* admin creation remains successful if SMTP delivery fails */}}
    await env.DB.prepare("INSERT INTO audit_logs (id,action,entity_type,entity_id,detail_json) VALUES (?, 'tenant.admin.set','tenant',?,?)").bind(`audit-${crypto.randomUUID()}`,id,JSON.stringify({tenantSlug:tenant.slug,userId,email,welcomeEmailSent})).run().catch(()=>null);
    return Response.json({ok:true,userId,email,tenantSlug:tenant.slug,welcomeEmail:{sent:welcomeEmailSent}});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Could not set Tenant Admin"},{status:400});}
}
