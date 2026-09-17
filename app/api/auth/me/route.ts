import{getEnv}from"@/lib/cloudflare";import{getUserSession}from"@/lib/auth/user";import{getTenantSession}from"@/lib/auth/tenant";
export async function GET(request:Request){
 const env=getEnv(),student=await getUserSession(request,env.DB,"student");
 if(student?.child_id){
  const c=await env.DB.prepare("SELECT c.id,c.nickname,c.school_level,c.target_al,c.exam_year,c.tenant_id,t.name AS tenant_name,t.slug AS tenant_slug,a.login_name,a.last_login_at FROM child_profiles c LEFT JOIN tenants t ON t.id=c.tenant_id LEFT JOIN learner_accounts a ON a.child_id=c.id WHERE c.id=?").bind(student.child_id).first<{id:string;nickname:string;school_level:string;target_al:string;exam_year:number|null;tenant_id:string|null;tenant_name:string|null;tenant_slug:string|null;login_name:string|null;last_login_at:string|null}>();
  return Response.json({role:"student",child:c?{id:c.id,nickname:c.nickname,school_level:c.school_level,target_al:c.target_al,exam_year:c.exam_year}:null,account:c?{login_name:c.login_name,last_login_at:c.last_login_at}:null,tenant:c?.tenant_id?{id:c.tenant_id,name:c.tenant_name,slug:c.tenant_slug}:null});
 }
 const admin=await getTenantSession(request,env.DB);if(admin)return Response.json({role:"admin",user:{id:admin.user_id,email:admin.email,display_name:admin.display_name},tenant:{id:admin.tenant_id,name:admin.tenant_name,slug:admin.tenant_slug}});return Response.json({role:"guest"});
}
