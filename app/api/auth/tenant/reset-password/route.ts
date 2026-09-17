import { getEnv } from "@/lib/cloudflare";
import { resetTenantAdminPassword } from "@/lib/auth/password-reset";

export async function POST(request:Request){
  const body=await request.json().catch(()=>({})) as Record<string,unknown>;
  try{
    const result=await resetTenantAdminPassword(getEnv().DB,{token:String(body.token||""),password:String(body.password||"")});
    return Response.json({ok:true,tenantSlug:result.tenant_slug,message:"Password updated. Sign in with your new password."});
  }catch(error){
    const message=error instanceof Error?error.message:"Password reset failed";
    return Response.json({error:message},{status:message.includes("invalid or has expired")?400:400});
  }
}
