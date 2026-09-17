import { getEnv } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import { integrationStatus, migrateWorkerFallbacks, saveIntegrationSettings } from "@/lib/settings/runtime";

export async function GET(request:Request){
  const denied=await requireAdmin(request); if(denied)return denied;
  const env=getEnv();
  const fields=await integrationStatus(env);
  return Response.json({fields,bootstrap:{settingsMasterKey:Boolean(env.SETTINGS_MASTER_KEY),adminAccessToken:Boolean(env.ADMIN_ACCESS_TOKEN),adminMonitorToken:Boolean(env.ADMIN_MONITOR_TOKEN),queue:Boolean(env.TASK_QUEUE),d1:Boolean(env.DB),r2:Boolean(env.MEDIA)}});
}
export async function POST(request:Request){
  const denied=await requireAdmin(request); if(denied)return denied;
  const env=getEnv(); if(!env.SETTINGS_MASTER_KEY)return Response.json({error:"SETTINGS_MASTER_KEY bootstrap secret is missing. Run scripts/deploy.sh update once."},{status:503});
  const body=await request.json().catch(()=>({})) as {values?:Record<string,string>;secrets?:Record<string,string>;clear?:string[];migrateWorkerFallbacks?:boolean};
  if(body.migrateWorkerFallbacks){const result=await migrateWorkerFallbacks(env);return Response.json({ok:true,...result,fields:await integrationStatus(env)});}
  await saveIntegrationSettings(env,{values:body.values,secrets:body.secrets,clear:body.clear});
  await env.DB.prepare("INSERT INTO audit_logs (id,action,entity_type,entity_id,detail_json) VALUES (?,?,?,?,?)").bind(`audit-${crypto.randomUUID()}`,"integration_settings.update","integration_settings","runtime",JSON.stringify({keys:[...Object.keys(body.values||{}),...Object.keys(body.secrets||{})],cleared:body.clear||[]})).run().catch(()=>null);
  return Response.json({ok:true,fields:await integrationStatus(env)});
}
