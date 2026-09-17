import { getEnv } from "@/lib/cloudflare";
import { createTenantAdminSession, registerPublicTenant, tenantCookie } from "@/lib/auth/tenant";
import { resolveIntegrations } from "@/lib/settings/runtime";
import { sendTenantWelcomeEmail } from "@/lib/notifications/account-emails";

export async function POST(request:Request){
  const env=getEnv();
  const body=await request.json().catch(()=>({})) as Record<string,unknown>;
  const name=String(body.name||"").trim();
  const slug=String(body.slug||name).trim();
  const email=String(body.email||"").trim();
  const displayName=String(body.displayName||"").trim();
  const password=String(body.password||"");
  const ip=request.headers.get("CF-Connecting-IP")||request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
  try{
    const created=await registerPublicTenant(env.DB,{name,slug,email,displayName,password,ip});
    const raw=await createTenantAdminSession(env.DB,{userId:created.userId,tenantId:created.tenantId});
    let welcomeEmailSent=false,welcomeEmailStatus="not_attempted";
    try{
      const runtime=await resolveIntegrations(env),origin=new URL(request.url).origin;
      const mail=await sendTenantWelcomeEmail(runtime,{to:created.email,tenantName:created.name,tenantSlug:created.slug,adminEmail:created.email,origin});
      welcomeEmailSent=mail.sent;welcomeEmailStatus=mail.sent?"sent":mail.reason;
    }catch(error){welcomeEmailStatus=error instanceof Error?`failed: ${error.message.slice(0,200)}`:"failed";}
    await env.DB.prepare("INSERT INTO audit_logs (id,actor_user_id,action,entity_type,entity_id,detail_json) VALUES (?,?, 'tenant.self_register','tenant',?,?)").bind(`audit-${crypto.randomUUID()}`,created.userId,created.tenantId,JSON.stringify({slug:created.slug,email:created.email,welcomeEmailSent,welcomeEmailStatus})).run().catch(()=>null);
    const response=Response.json({ok:true,tenant:{id:created.tenantId,name:created.name,slug:created.slug},next:"/admin/settings/integrations",welcomeEmail:{sent:welcomeEmailSent}},{status:201});
    response.headers.set("Set-Cookie",tenantCookie(raw));
    return response;
  }catch(e){
    const message=e instanceof Error?e.message:"Could not create organisation";
    const status=message.includes("already")||message.includes("exists")?409:message.includes("Too many")||message.includes("limit")?429:400;
    return Response.json({error:message},{status});
  }
}
