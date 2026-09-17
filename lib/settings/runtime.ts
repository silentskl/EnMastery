import { decryptManagedSecret, encryptManagedSecret, secretHint } from "./crypto";

export const INTEGRATION_KEYS = {
  MODELBRIDGE_BASE_URL: "MODELBRIDGE_BASE_URL",
  MODELBRIDGE_API_KEY: "MODELBRIDGE_API_KEY",
  MODELBRIDGE_CHAT_MODEL: "MODELBRIDGE_CHAT_MODEL",
  MODELBRIDGE_STT_MODEL: "MODELBRIDGE_STT_MODEL",
  STT_PROVIDER: "STT_PROVIDER",
  MODELBRIDGE_TTS_MODEL: "MODELBRIDGE_TTS_MODEL",
  TTS_PROVIDER: "TTS_PROVIDER",
  MODELBRIDGE_TTS_VOICE: "MODELBRIDGE_TTS_VOICE",
  YOUTUBE_API_KEY: "YOUTUBE_API_KEY",
  AZURE_SPEECH_REGION: "AZURE_SPEECH_REGION",
  PRONUNCIATION_PROVIDER: "PRONUNCIATION_PROVIDER",
  AZURE_SPEECH_KEY: "AZURE_SPEECH_KEY",
  SMTP_ENABLED: "SMTP_ENABLED",
  SMTP_HOST: "SMTP_HOST",
  SMTP_PORT: "SMTP_PORT",
  SMTP_SECURITY: "SMTP_SECURITY",
  SMTP_AUTH: "SMTP_AUTH",
  SMTP_USERNAME: "SMTP_USERNAME",
  SMTP_PASSWORD: "SMTP_PASSWORD",
  SMTP_FROM_EMAIL: "SMTP_FROM_EMAIL",
  SMTP_FROM_NAME: "SMTP_FROM_NAME",
  SMTP_NOTIFY_TO: "SMTP_NOTIFY_TO",
} as const;
export type IntegrationKey = keyof typeof INTEGRATION_KEYS;
const SECRET_KEYS = new Set<IntegrationKey>(["MODELBRIDGE_API_KEY", "YOUTUBE_API_KEY", "AZURE_SPEECH_KEY", "SMTP_PASSWORD"]);
const TEXT_KEYS = new Set<IntegrationKey>(["MODELBRIDGE_BASE_URL", "MODELBRIDGE_CHAT_MODEL", "MODELBRIDGE_STT_MODEL", "STT_PROVIDER", "MODELBRIDGE_TTS_MODEL", "TTS_PROVIDER", "MODELBRIDGE_TTS_VOICE", "AZURE_SPEECH_REGION", "PRONUNCIATION_PROVIDER", "SMTP_ENABLED", "SMTP_HOST", "SMTP_PORT", "SMTP_SECURITY", "SMTP_AUTH", "SMTP_USERNAME", "SMTP_FROM_EMAIL", "SMTP_FROM_NAME", "SMTP_NOTIFY_TO"]);

type SettingsEnv = Pick<CloudflareEnv, "DB"> & Partial<Pick<CloudflareEnv,
  "SETTINGS_MASTER_KEY" | "MODELBRIDGE_BASE_URL" | "MODELBRIDGE_API_KEY" | "MODELBRIDGE_CHAT_MODEL" |
  "MODELBRIDGE_STT_MODEL" | "STT_PROVIDER" | "MODELBRIDGE_TTS_MODEL" | "TTS_PROVIDER" | "MODELBRIDGE_TTS_VOICE" | "YOUTUBE_API_KEY" |
  "AZURE_SPEECH_REGION" | "PRONUNCIATION_PROVIDER" | "AZURE_SPEECH_KEY" |
  "SMTP_ENABLED" | "SMTP_HOST" | "SMTP_PORT" | "SMTP_SECURITY" | "SMTP_AUTH" | "SMTP_USERNAME" | "SMTP_PASSWORD" | "SMTP_FROM_EMAIL" | "SMTP_FROM_NAME" | "SMTP_NOTIFY_TO"
>>;

type SettingRow = { setting_key:string; setting_type:"text"|"secret"; value_text:string|null; value_ciphertext:string|null; iv:string|null; display_hint:string|null; source:string };

// Historical releases used a few different labels for the YouTube credential.
// Treat them as aliases of the canonical key so upgraded installations do not
// require administrators to re-enter an already-saved secret.
const INTEGRATION_KEY_ALIASES:Partial<Record<IntegrationKey,string[]>>={
  YOUTUBE_API_KEY:["YOUTUBE_API_KEY","YOUTUBE_DATA_API_KEY","youtubeApiKey","youtube_api_key","youtube_data_api_key"],
};
function aliasesFor(key:IntegrationKey){return INTEGRATION_KEY_ALIASES[key]||[key];}
function findRow(map:Map<string,SettingRow>,key:IntegrationKey){for(const candidate of aliasesFor(key)){const row=map.get(candidate);if(row)return row;}return undefined;}

async function rows(db:D1Database){
  try { return (await db.prepare("SELECT setting_key,setting_type,value_text,value_ciphertext,iv,display_hint,source FROM integration_settings").all<SettingRow>()).results; }
  catch { return []; }
}

function fallback(env:SettingsEnv, key:IntegrationKey) {
  const value = env[key as keyof SettingsEnv];
  return typeof value === "string" ? value : "";
}

export async function resolveIntegrations<T extends SettingsEnv>(env:T):Promise<T>{
  const map = new Map((await rows(env.DB)).map(r=>[r.setting_key,r]));
  const out:Record<string,unknown> = { ...env };
  for (const key of Object.keys(INTEGRATION_KEYS) as IntegrationKey[]) {
    const row = findRow(map,key);
    let value = fallback(env,key);
    if (row?.setting_type === "text" && row.value_text !== null && row.value_text.trim()) value = row.value_text.trim();
    if (row?.setting_type === "secret" && row.value_ciphertext && row.iv && env.SETTINGS_MASTER_KEY) {
      try { value = await decryptManagedSecret(row.value_ciphertext,row.iv,env.SETTINGS_MASTER_KEY); } catch { /* keep Worker fallback */ }
    }
    out[key] = value;
  }
  return out as unknown as T;
}

export const resolvePlatformIntegrations = resolveIntegrations;


export async function integrationCredentialState(env:SettingsEnv,key:IntegrationKey){
  const map=new Map((await rows(env.DB)).map(r=>[r.setting_key,r]));
  const row=findRow(map,key);
  const workerValue=fallback(env,key);
  let managedValue="";
  let decryptError=false;
  if(row?.setting_type==="secret"&&row.value_ciphertext&&row.iv){
    if(!env.SETTINGS_MASTER_KEY) decryptError=true;
    else {
      try{managedValue=await decryptManagedSecret(row.value_ciphertext,row.iv,env.SETTINGS_MASTER_KEY)}
      catch{decryptError=true}
    }
  }
  const effective=managedValue||workerValue;
  return {
    configured:Boolean(effective),
    managed:Boolean(row),
    managedDecryptable:Boolean(!row||row.setting_type!=="secret"||managedValue),
    decryptError,
    workerFallback:Boolean(workerValue),
    source:managedValue?"admin":workerValue?"worker":"none",
    settingKey:row?.setting_key||key,
    hint:row?.display_hint||secretHint(effective),
  } as const;
}

export async function integrationStatus(env:SettingsEnv){
  const map = new Map((await rows(env.DB)).map(r=>[r.setting_key,r]));
  const effective = await resolveIntegrations(env);
  const fields:Record<string,{configured:boolean;source:"admin"|"worker"|"none";value?:string;hint?:string;managed?:boolean;decryptError?:boolean;warning?:string}> = {};
  for(const key of Object.keys(INTEGRATION_KEYS) as IntegrationKey[]){
    const row=findRow(map,key);
    if(SECRET_KEYS.has(key)){
      const state=await integrationCredentialState(env,key);
      let warning: string|undefined;
      if(state.decryptError&&state.workerFallback) warning="Managed secret cannot be decrypted with the current SETTINGS_MASTER_KEY; the web Worker fallback is active. Repair/re-save this credential before background jobs can use it.";
      else if(state.decryptError) warning="Managed secret cannot be decrypted with the current SETTINGS_MASTER_KEY. Re-enter and save this credential.";
      fields[key]={configured:state.configured,source:state.source,hint:state.hint,managed:state.managed,decryptError:state.decryptError,warning};
    } else {
      const value=fallback(effective,key);
      const source=row?.setting_type==="text"&&row.value_text?.trim()?"admin":value?"worker":"none";
      fields[key]={configured:Boolean(value),source,value,managed:Boolean(row)};
    }
  }
  return fields;
}

export async function saveIntegrationSettings(env:SettingsEnv,args:{values?:Record<string,string>;secrets?:Record<string,string>;clear?:string[]}){
  const master=env.SETTINGS_MASTER_KEY||"";
  const now=new Date().toISOString();
  for(const [rawKey,rawValue] of Object.entries(args.values||{})){
    const key=rawKey as IntegrationKey; if(!TEXT_KEYS.has(key)) continue;
    const value=String(rawValue??"").trim();
    await env.DB.prepare("INSERT INTO integration_settings (setting_key,setting_type,value_text,value_ciphertext,iv,display_hint,source,updated_at) VALUES (?,'text',?,NULL,NULL,NULL,'admin',?) ON CONFLICT(setting_key) DO UPDATE SET setting_type='text',value_text=excluded.value_text,value_ciphertext=NULL,iv=NULL,display_hint=NULL,source='admin',updated_at=excluded.updated_at").bind(key,value,now).run();
  }
  for(const [rawKey,rawValue] of Object.entries(args.secrets||{})){
    const key=rawKey as IntegrationKey; if(!SECRET_KEYS.has(key)) continue;
    const value=String(rawValue??"").trim(); if(!value) continue;
    const enc=await encryptManagedSecret(value,master);
    await env.DB.prepare("INSERT INTO integration_settings (setting_key,setting_type,value_text,value_ciphertext,iv,display_hint,source,updated_at) VALUES (?,'secret',NULL,?,?,?,'admin',?) ON CONFLICT(setting_key) DO UPDATE SET setting_type='secret',value_text=NULL,value_ciphertext=excluded.value_ciphertext,iv=excluded.iv,display_hint=excluded.display_hint,source='admin',updated_at=excluded.updated_at").bind(key,enc.ciphertext,enc.iv,secretHint(value),now).run();
  }
  for(const rawKey of args.clear||[]){
    const key=rawKey as IntegrationKey; if(!SECRET_KEYS.has(key)&&!TEXT_KEYS.has(key)) continue;
    await env.DB.prepare("DELETE FROM integration_settings WHERE setting_key=?").bind(key).run();
  }
}

export async function migrateWorkerFallbacks(env:SettingsEnv){
  const status=await integrationStatus(env); const secrets:Record<string,string>={}; const values:Record<string,string>={};
  for(const key of Object.keys(INTEGRATION_KEYS) as IntegrationKey[]){
    // source=worker also covers the important repair case where a managed
    // ciphertext exists but no longer decrypts with the current master key.
    // Re-encrypt the known-good Worker fallback under the current master key.
    if(status[key]?.source!=="worker") continue;
    const value=fallback(env,key); if(!value) continue;
    if(SECRET_KEYS.has(key)) secrets[key]=value; else values[key]=value;
  }
  await saveIntegrationSettings(env,{values,secrets});
  return {migrated:[...Object.keys(values),...Object.keys(secrets)]};
}
