import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
import type { SpeakingPrompt } from "@/lib/speaking/types";

type Row={id:string;title:string;school_level:string;topic:string|null;description:string|null;body_json:string};
function str(body:Record<string,unknown>,key:string){const v=body[key];return typeof v==="string"&&v.trim()?v.trim():undefined}
function arr(body:Record<string,unknown>,key:string){const v=body[key];return Array.isArray(v)?v.filter((x):x is string=>typeof x==="string"&&Boolean(x.trim())).map(x=>x.trim()):undefined}
function toPrompt(row:Row):SpeakingPrompt{
 let body:Record<string,unknown>={};try{body=JSON.parse(row.body_json)as Record<string,unknown>}catch{}
 return {id:row.id,title:row.title,schoolLevel:row.school_level,topic:row.topic,description:row.description,mode:"stimulus",prompt:str(body,"prompt")||"Please tell us what you can see in the photograph.",stimulusAlt:str(body,"stimulusAlt"),stimulusImageUrl:str(body,"stimulusImageUrl"),stimulusImageAlt:str(body,"stimulusImageAlt"),examTrack:"PET",targetSeconds:typeof body.targetSeconds==="number"?body.targetSeconds:60,sceneFocus:arr(body,"sceneFocus"),examinerPrompts:arr(body,"examinerPrompts")};
}
export async function GET(request:Request){
 const env=getEnv(),session=await ensureLearnerSession(request,env.DB),{tenantId}=await learnerTenantContext(env.DB,session.childId);
 const rows=await env.DB.prepare(`SELECT c.id,c.title,c.school_level,c.topic,c.description,v.body_json
 FROM content_items c JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version
 WHERE c.status='published' AND c.content_type='oral_prompt'
 AND (c.scope='global' OR (c.scope='tenant' AND c.tenant_id=?))
 AND json_extract(v.body_json,'$.examTrack')='PET'
 ORDER BY c.topic,c.title LIMIT 40`).bind(tenantId).all<Row>();
 const response=Response.json({prompts:rows.results.map(toPrompt),exam:{name:"B1 Preliminary (PET)",part:2,targetSeconds:60}});
 response.headers.set("Cache-Control","private, no-store");
 if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));
 return response;
}
