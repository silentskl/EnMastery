import { decryptManagedSecret, encryptManagedSecret, secretHint } from "@/lib/settings/crypto";
import { resolveIntegrations } from "@/lib/settings/runtime";

const TEXT_KEYS=new Set(["MODELBRIDGE_BASE_URL","MODELBRIDGE_CHAT_MODEL","MODELBRIDGE_STT_MODEL","MODELBRIDGE_TTS_MODEL","MODELBRIDGE_TTS_VOICE"]);
const SECRET_KEYS=new Set(["MODELBRIDGE_API_KEY"]);
const SHARED_PLATFORM_KEYS=["YOUTUBE_API_KEY","AZURE_SPEECH_KEY","AZURE_SPEECH_REGION","STT_PROVIDER","TTS_PROVIDER","PRONUNCIATION_PROVIDER"] as const;
type TenantRuntimeEnv=Pick<CloudflareEnv,"DB">&Partial<Pick<CloudflareEnv,"SETTINGS_MASTER_KEY"|"MODELBRIDGE_BASE_URL"|"MODELBRIDGE_API_KEY"|"MODELBRIDGE_CHAT_MODEL"|"MODELBRIDGE_STT_MODEL"|"MODELBRIDGE_TTS_MODEL"|"MODELBRIDGE_TTS_VOICE"|"YOUTUBE_API_KEY"|"AZURE_SPEECH_KEY"|"AZURE_SPEECH_REGION"|"STT_PROVIDER"|"TTS_PROVIDER"|"PRONUNCIATION_PROVIDER">>;
type Row={setting_key:string;setting_type:"text"|"secret";value_text:string|null;value_ciphertext:string|null;iv:string|null;display_hint:string|null};

async function tenantRows(db:D1Database,tenantId:string){return (await db.prepare("SELECT setting_key,setting_type,value_text,value_ciphertext,iv,display_hint FROM tenant_integrations WHERE tenant_id=?").bind(tenantId).all<Row>()).results;}

export async function resolveTenantIntegrations<T extends TenantRuntimeEnv>(env:T,tenantId:string):Promise<T>{
  const tenant=await env.DB.prepare("SELECT id FROM tenants WHERE id=? AND status='active'").bind(tenantId).first<{id:string}>();
  if(!tenant)throw new Error("Tenant is not active");

  // Platform-managed integrations (YouTube, Azure Speech, provider selectors, etc.)
  // are shared infrastructure. Resolve them from the same integration_settings table
  // used by Platform Admin before applying the tenant-owned ModelBridge overlay.
  // Every tenant, including tenant-default, is an isolated partner workspace.
  const platform=await resolveIntegrations(env);
  const map=new Map((await tenantRows(platform.DB,tenantId)).map(r=>[r.setting_key,r]));
  const out:Record<string,unknown>={...platform};

  // ModelBridge remains tenant-owned: never fall back to the platform ModelBridge key/models.
  out.MODELBRIDGE_CHAT_MODEL="";
  out.MODELBRIDGE_STT_MODEL="";
  out.MODELBRIDGE_TTS_MODEL="";
  out.MODELBRIDGE_TTS_VOICE="";
  out.MODELBRIDGE_API_KEY="";
  for(const key of TEXT_KEYS){const row=map.get(key);if(row?.setting_type==="text"&&row.value_text!==null)out[key]=row.value_text;}
  const api=map.get("MODELBRIDGE_API_KEY");
  if(api?.value_ciphertext&&api.iv&&platform.SETTINGS_MASTER_KEY){
    try{out.MODELBRIDGE_API_KEY=await decryptManagedSecret(api.value_ciphertext,api.iv,platform.SETTINGS_MASTER_KEY);}catch{out.MODELBRIDGE_API_KEY="";}
  }
  return out as T;
}

export async function tenantIntegrationStatus(env:TenantRuntimeEnv,tenantId:string){
  const map=new Map((await tenantRows(env.DB,tenantId)).map(r=>[r.setting_key,r]));
  const effective=await resolveTenantIntegrations(env,tenantId);
  const fields:Record<string,{configured:boolean;value?:string;hint?:string;source?:"tenant"|"platform"|"none"}>={};
  for(const key of [...TEXT_KEYS,...SECRET_KEYS]){
    const row=map.get(key);
    const value=effective[key as keyof TenantRuntimeEnv];
    if(SECRET_KEYS.has(key))fields[key]={configured:typeof value==="string"&&value.length>0,hint:row?.display_hint||"",source:typeof value==="string"&&value.length>0?"tenant":"none"};
    else fields[key]={configured:typeof value==="string"&&value.length>0,value:typeof value==="string"?value:"",source:typeof value==="string"&&value.length>0?"tenant":"none"};
  }
  for(const key of SHARED_PLATFORM_KEYS){
    const value=effective[key as keyof TenantRuntimeEnv];
    fields[key]={configured:typeof value==="string"&&value.length>0,source:typeof value==="string"&&value.length>0?"platform":"none"};
  }
  return fields;
}

export async function saveTenantIntegrationSettings(env:TenantRuntimeEnv,tenantId:string,userId:string,args:{values?:Record<string,string>;secrets?:Record<string,string>;clear?:string[]}){const now=new Date().toISOString();for(const [key,value0] of Object.entries(args.values||{})){if(!TEXT_KEYS.has(key))continue;const value=String(value0||"").trim();await env.DB.prepare("INSERT INTO tenant_integrations (tenant_id,setting_key,setting_type,value_text,updated_by,updated_at) VALUES (?,?,'text',?,?,?) ON CONFLICT(tenant_id,setting_key) DO UPDATE SET setting_type='text',value_text=excluded.value_text,value_ciphertext=NULL,iv=NULL,display_hint=NULL,updated_by=excluded.updated_by,updated_at=excluded.updated_at").bind(tenantId,key,value,userId,now).run();}for(const [key,value0] of Object.entries(args.secrets||{})){if(!SECRET_KEYS.has(key))continue;const value=String(value0||"").trim();if(!value)continue;const enc=await encryptManagedSecret(value,env.SETTINGS_MASTER_KEY||"");await env.DB.prepare("INSERT INTO tenant_integrations (tenant_id,setting_key,setting_type,value_ciphertext,iv,display_hint,updated_by,updated_at) VALUES (?,?,'secret',?,?,?,?,?) ON CONFLICT(tenant_id,setting_key) DO UPDATE SET setting_type='secret',value_text=NULL,value_ciphertext=excluded.value_ciphertext,iv=excluded.iv,display_hint=excluded.display_hint,updated_by=excluded.updated_by,updated_at=excluded.updated_at").bind(tenantId,key,enc.ciphertext,enc.iv,secretHint(value),userId,now).run();}for(const key of args.clear||[]){if(!TEXT_KEYS.has(key)&&!SECRET_KEYS.has(key))continue;await env.DB.prepare("DELETE FROM tenant_integrations WHERE tenant_id=? AND setting_key=?").bind(tenantId,key).run();}}
