import { getEnv } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import { setTenantAdmin } from "@/lib/auth/tenant";
import { resolveIntegrations } from "@/lib/settings/runtime";
import { sendTenantWelcomeEmail } from "@/lib/notifications/account-emails";
import { LEARNING_STAGES } from "@/lib/language/stages";
import { ensureTenantPracticeDefaults } from "@/lib/settings/practice-policy";
function slugify(v:string){return v.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48);}
export async function GET(request:Request){
  const denied=await requireAdmin(request);if(denied)return denied;const env=getEnv();
  const rows=await env.DB.prepare(`SELECT t.id,t.slug,t.name,t.status,t.plan,t.ai_request_quota_monthly,t.created_at,t.updated_at,
   (SELECT COUNT(*) FROM child_profiles c WHERE c.tenant_id=t.id) student_count,
   (SELECT COUNT(*) FROM courses c WHERE c.tenant_id=t.id AND c.status!='archived') course_count,
   (SELECT COUNT(*) FROM assignments a WHERE a.tenant_id=t.id AND a.status IN ('draft','published')) assignment_count,
   (SELECT u.email FROM tenant_members m JOIN users u ON u.id=m.user_id WHERE m.tenant_id=t.id AND m.role='admin' AND m.status='active' LIMIT 1) admin_email,
   (SELECT u.display_name FROM tenant_members m JOIN users u ON u.id=m.user_id WHERE m.tenant_id=t.id AND m.role='admin' AND m.status='active' LIMIT 1) admin_name,
   (SELECT COUNT(*) FROM tenant_members m JOIN staff_credentials c ON c.user_id=m.user_id WHERE m.tenant_id=t.id AND m.role='admin' AND m.status='active') admin_login_ready
   FROM tenants t ORDER BY CASE t.id WHEN 'tenant-default' THEN 0 ELSE 1 END,t.created_at DESC`).all();
  return Response.json({tenants:rows.results});
}
export async function POST(request:Request){
  const denied=await requireAdmin(request);if(denied)return denied;const env=getEnv(),b=await request.json().catch(()=>({})) as Record<string,unknown>;
  const name=String(b.name||"").trim(),slug=slugify(String(b.slug||name));if(name.length<2||slug.length<2)return Response.json({error:"Tenant name and slug are required"},{status:400});
  const id=`tenant-${crypto.randomUUID()}`,quota=Math.max(0,Math.min(1000000,Number(b.aiRequestQuota)||5000));
  try{
    await env.DB.prepare("INSERT INTO tenants (id,slug,name,status,plan,ai_request_quota_monthly) VALUES (?,?,?,'active',?,?)").bind(id,slug,name,String(b.plan||"standard"),quota).run();
    await env.DB.batch([
      ...LEARNING_STAGES.flatMap(level=>[['listen',10],['speak',3],['read',4],['write',2]].map(([domain,limit])=>env.DB.prepare("INSERT INTO tenant_learn_availability(tenant_id,school_level,domain,lesson_limit) VALUES(?,?,?,?)").bind(id,level,domain,limit))),
      ...LEARNING_STAGES.map(level=>env.DB.prepare("INSERT INTO tenant_daily_task_policy(tenant_id,school_level,listen_video_max_seconds,read_max_words) VALUES(?,?,0,0)").bind(id,level))
    ]);
    await ensureTenantPracticeDefaults(env.DB,id);
    let adminUserId:string|null=null,welcomeEmailSent=false;
    const adminEmail=String(b.adminEmail||"").trim();
    if(adminEmail){
      adminUserId=await setTenantAdmin(env.DB,{tenantId:id,email:adminEmail,displayName:String(b.adminName||"Admin"),password:String(b.adminPassword||"")});
      try{const runtime=await resolveIntegrations(env),mail=await sendTenantWelcomeEmail(runtime,{to:adminEmail,tenantName:name,tenantSlug:slug,adminEmail,origin:new URL(request.url).origin});welcomeEmailSent=mail.sent;}catch{/* tenant creation must not roll back after SMTP delivery failure */}
    }
    await env.DB.prepare("INSERT INTO audit_logs (id,action,entity_type,entity_id,detail_json) VALUES (?, 'tenant.create','tenant',?,?)").bind(`audit-${crypto.randomUUID()}`,id,JSON.stringify({name,slug,adminUserId,welcomeEmailSent})).run().catch(()=>null);
    return Response.json({ok:true,id,slug,adminUserId,welcomeEmail:{sent:welcomeEmailSent}},{status:201});
  }catch(e){
    await env.DB.prepare("DELETE FROM tenants WHERE id=? AND id!='tenant-default'").bind(id).run().catch(()=>null);
    const m=e instanceof Error?e.message:"Could not create tenant";return Response.json({error:m},{status:m.includes("UNIQUE")?409:400});
  }
}
