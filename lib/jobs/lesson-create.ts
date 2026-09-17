import { validatePublicUrl } from "@/lib/content/extract";
import { enqueueJob, type JobEnv } from "@/lib/jobs/dispatch";
import type { ListeningDiscoveredItem, ListeningSource } from "@/lib/listening/types";
import { duplicateSkip } from "@/lib/content/dedup";

type ReadingSource = { id:string; name:string; usage_mode:string; enabled:number };

export async function createReadingImportJob(env: JobEnv, args:{source:ReadingSource; url:string; sourceTitle?:string; schoolLevel:"P5"|"P6"; topic:string; skillIds:string[];tenantId?:string;createdBy?:string}){
  validatePublicUrl(args.url);
  const title=(args.sourceTitle?.trim()||"Generating lesson…").slice(0,180),tenantId=args.tenantId||null,scope=tenantId?"tenant":"global";
  const dup=await duplicateSkip(env.DB,{contentType:"article",schoolLevel:args.schoolLevel,scope,tenantId,sourceUrl:args.url,title});
  if(dup.skipped)return {contentId:dup.existingId,jobId:null,status:"skipped" as const,existingId:dup.existingId,existingStatus:dup.existingStatus};
  const contentId=`content-${crypto.randomUUID()}`;
  await env.DB.prepare("INSERT INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,generation_stage,tenant_id,scope) VALUES (?,?,?,?,?,?,?,'generating',1,?,?,?,?,?)")
    .bind(contentId,"article",title,args.schoolLevel,args.topic,args.url,args.source.usage_mode||"reference_only","Task created. Waiting to fetch source…",`${args.source.name} · generation in progress`,`queued`,tenantId,scope).run();
  try{
    const jobId=await enqueueJob(env.DB,env,{jobType:"reading_import",entityType:"content",entityId:contentId,sourceId:args.source.id,request:{sourceId:args.source.id,url:args.url,schoolLevel:args.schoolLevel,topic:args.topic,skillIds:args.skillIds,contentId},tenantId,createdBy:args.createdBy});
    return {contentId,jobId,status:"queued" as const};
  }catch(error){return {contentId,jobId:null,status:"failed" as const,error:error instanceof Error?error.message:"Could not enqueue task"};}
}

export async function createListeningImportJob(env: JobEnv, args:{source:ListeningSource; item:ListeningDiscoveredItem; schoolLevel:"P5"|"P6"; topic:string; skillIds:string[]; useCompanion:boolean; teacherTranscript?:string;catalogItemId?:string;tenantId?:string;createdBy?:string}){
  const item=args.item;validatePublicUrl(item.url);if(item.mediaUrl)validatePublicUrl(item.mediaUrl);
  const mediaKind=item.provider==="youtube"?"youtube":item.provider==="publisher"?"external_video":"podcast",tenantId=args.tenantId||null,scope=tenantId?"tenant":"global",contentType=mediaKind==="podcast"?"audio":"video_ref";
  const dup=await duplicateSkip(env.DB,{contentType,schoolLevel:args.schoolLevel,scope,tenantId,sourceUrl:item.url,title:item.title});
  if(dup.skipped)return {contentId:dup.existingId,jobId:null,status:"skipped" as const,existingId:dup.existingId,existingStatus:dup.existingStatus};
  const contentId=`listen-${crypto.randomUUID()}`;
  await env.DB.batch([
    env.DB.prepare("INSERT INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,generation_stage,tenant_id,scope) VALUES (?,?,?,?,?,?,?,'generating',1,?,?,?,?,?)").bind(contentId,contentType,item.title,args.schoolLevel,args.topic,item.url,"reference_only","Task created. Listening lesson is generating…",`${args.source.name} · media hosted by original publisher`,`queued`,tenantId,scope),
    env.DB.prepare("INSERT INTO content_media (content_id,media_kind,provider,external_id,media_url,embed_url,thumbnail_url,duration_seconds,made_for_kids,source_title,source_item_url,question_basis,transcript_policy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(contentId,mediaKind,item.provider==="youtube"?"YouTube":args.source.name,item.provider==="youtube"?item.id:null,item.mediaUrl||null,item.provider==="youtube"?`https://www.youtube-nocookie.com/embed/${encodeURIComponent(item.id)}?rel=0`:null,item.thumbnailUrl||null,item.durationSeconds||null,typeof item.madeForKids==="boolean"?(item.madeForKids?1:0):null,item.title,item.url,"metadata_only","not_stored")
  ]);
  try{
    const jobId=await enqueueJob(env.DB,env,{jobType:"listening_import",entityType:"content",entityId:contentId,sourceId:args.source.id,request:{sourceId:args.source.id,item,schoolLevel:args.schoolLevel,topic:args.topic,teacherTranscript:args.teacherTranscript||"",useCompanion:args.useCompanion,skillIds:args.skillIds,contentId,catalogItemId:args.catalogItemId||""},tenantId,createdBy:args.createdBy});
    return {contentId,jobId,status:"queued" as const};
  }catch(error){return {contentId,jobId:null,status:"failed" as const,error:error instanceof Error?error.message:"Could not enqueue task"};}
}
