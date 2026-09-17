import { getEnv } from "@/lib/cloudflare";
import { clearTenantCookie, createTenantAdminSession, deleteTenantAdminSession, getTenantSession, tenantCookie, verifyTenantAdminLogin } from "@/lib/auth/tenant";

export async function GET(request:Request){
  const s=await getTenantSession(request,getEnv().DB);
  return Response.json({authenticated:Boolean(s),session:s?{userId:s.user_id,tenantId:s.tenant_id,role:"admin",displayName:s.display_name,email:s.email,tenantName:s.tenant_name,tenantSlug:s.tenant_slug}:null});
}
export async function POST(request:Request){
  const env=getEnv(),b=await request.json().catch(()=>({})) as Record<string,unknown>;
  try{
    const admin=await verifyTenantAdminLogin(env.DB,String(b.email||""),String(b.password||""),String(b.tenantSlug||""));
    if(!admin)return Response.json({error:"Invalid email or password"},{status:401});
    const raw=await createTenantAdminSession(env.DB,{userId:admin.id,tenantId:admin.tenant_id});
    const r=Response.json({ok:true,tenant:{id:admin.tenant_id,name:admin.tenant_name,slug:admin.tenant_slug},role:"admin"});
    r.headers.set("Set-Cookie",tenantCookie(raw));return r;
  }catch(e){const m=e instanceof Error?e.message:"Sign-in failed";return Response.json({error:m},{status:m.includes("Too many")?429:400});}
}
export async function DELETE(request:Request){
  const env=getEnv();await deleteTenantAdminSession(request,env.DB);const r=Response.json({ok:true});r.headers.set("Set-Cookie",clearTenantCookie());return r;
}
