import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
import type { SpeakingMode, SpeakingPrompt } from "@/lib/speaking/types";
import{getVisibleLessonIds}from"@/lib/tenant/lesson-availability";
import {ensureSpeakingModeCache} from "@/lib/speaking/prompt-cache";
import {getDailySpeakingProgress} from "@/lib/student/speaking-daily";

export async function GET(request:Request){
 const env=getEnv(),session=await ensureLearnerSession(request,env.DB),{tenantId,schoolLevel}=await learnerTenantContext(env.DB,session.childId);
 let live:SpeakingPrompt[]=[];
 try{
  const allowed=await getVisibleLessonIds(env.DB,tenantId,schoolLevel,"speak");
  const rows=await env.DB.prepare(`SELECT c.id,c.title,c.school_level,c.topic,c.description,v.body_json FROM content_items c JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version WHERE c.content_type='oral_prompt' AND c.status='published' AND c.school_level=? AND (c.scope='global' OR (c.scope='tenant' AND c.tenant_id=?)) ORDER BY c.created_at,c.id`).bind(schoolLevel,tenantId).all<{id:string;title:string;school_level:string;topic:string|null;description:string|null;body_json:string}>();
  live=rows.results.filter(r=>allowed.has(r.id)).map(r=>{let body:Record<string,unknown>={};try{body=JSON.parse(r.body_json)as Record<string,unknown>}catch{}const mode=(body.mode==="reading_aloud"||body.mode==="stimulus"?body.mode:"conversation")as SpeakingMode;return{id:r.id,title:r.title,schoolLevel:r.school_level,topic:r.topic,description:r.description,mode,prompt:typeof body.prompt==="string"?body.prompt:"Speak about this topic.",referenceText:typeof body.referenceText==="string"?body.referenceText:undefined,stimulusAlt:typeof body.stimulusAlt==="string"?body.stimulusAlt:undefined};});
 }catch{}
 const conversation=await ensureSpeakingModeCache(env.DB,tenantId,schoolLevel,"conversation",live),reading=await ensureSpeakingModeCache(env.DB,tenantId,schoolLevel,"reading_aloud",live),stimulus=await ensureSpeakingModeCache(env.DB,tenantId,schoolLevel,"stimulus",live);
 const prompts=[...conversation,...reading,...stimulus],dailyProgress=await getDailySpeakingProgress(env.DB,session.childId);
 const response=Response.json({prompts,dailyProgress,cache:{modes:{conversation:conversation.length,readingAloud:reading.length,stimulus:stimulus.length},fallbackUsed:prompts.some(p=>p.id.startsWith("cached-"))}});response.headers.set("Cache-Control","private, max-age=300, stale-while-revalidate=3600");if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}
