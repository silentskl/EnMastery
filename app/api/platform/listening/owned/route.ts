import {getEnv} from "@/lib/cloudflare";
import {resolveIntegrations} from "@/lib/settings/runtime";
import {requireAdmin} from "@/lib/auth/admin";
import {parseTimestampedTranscript} from "@/lib/listening/intensive";
import {dispatchJob} from "@/lib/jobs/dispatch";
import {createJob,setJob} from "@/lib/jobs/store";
import {duplicateSkip} from "@/lib/content/dedup";

export async function POST(request:Request){
 const denied=await requireAdmin(request);if(denied)return denied;const env=await resolveIntegrations(getEnv());if(!env.MODELBRIDGE_API_KEY||!env.MODELBRIDGE_CHAT_MODEL)return Response.json({error:"ModelBridge is not configured"},{status:503});
 const form=await request.formData();const audio=form.get("audio");if(!(audio instanceof File))return Response.json({error:"audio file is required"},{status:400});if(audio.size>20*1024*1024)return Response.json({error:"Owned audio is limited to 20 MB"},{status:413});
 const title=String(form.get("title")||"").trim().slice(0,180),description=String(form.get("description")||"").trim().slice(0,600),topic=String(form.get("topic")||"Intensive Listening").trim().slice(0,120),schoolLevel=form.get("schoolLevel")==="P5"?"P5":"P6",transcript=String(form.get("transcript")||"").trim();if(!title||!transcript)return Response.json({error:"title and timestamped transcript are required"},{status:400});
 let segments;try{segments=parseTimestampedTranscript(transcript);}catch(e){return Response.json({error:e instanceof Error?e.message:"Invalid transcript"},{status:400});}
 const dup=await duplicateSkip(env.DB,{contentType:"audio",schoolLevel,scope:"global",title});if(dup.skipped)return Response.json({ok:true,status:"skipped",existingId:dup.existingId,existingStatus:dup.existingStatus});
 const contentId=`listen-owned-${crypto.randomUUID()}`,ext=(audio.name.split(".").pop()||"bin").replace(/[^a-z0-9]/gi,"").slice(0,8)||"bin",r2Key=`owned-audio/${contentId}/source.${ext}`;let skillIds=["L-MAIN","L-DETAIL","L-INFER"];try{const parsed=JSON.parse(String(form.get("skillIds")||"[]")) as unknown;if(Array.isArray(parsed))skillIds=parsed.filter((x):x is string=>typeof x==="string"&&x.startsWith("L-")).slice(0,6);}catch{}
 await env.DB.prepare("INSERT INTO content_items (id,content_type,title,school_level,topic,licence,status,active_version,description,source_attribution,generation_stage) VALUES (?,'audio',?,?,?,'owned','generating',1,?,?,?)").bind(contentId,title,schoolLevel,topic,"Task created. Uploading owned audio…","English Mastery owned/authorised audio","uploading_audio").run();
 const jobId=await createJob(env.DB,{jobType:"owned_listening",entityType:"content",entityId:contentId,request:{contentId,title,description,topic,schoolLevel,r2Key,skillIds,segments}});await env.DB.prepare("UPDATE content_items SET generation_job_id=? WHERE id=?").bind(jobId,contentId).run();
 let uploaded=false;
 try{await env.MEDIA.put(r2Key,await audio.arrayBuffer(),{httpMetadata:{contentType:audio.type||"audio/mpeg"},customMetadata:{contentId,title}});uploaded=true;await env.DB.prepare("INSERT OR REPLACE INTO content_audio_assets (content_id,r2_key,mime_type,byte_length,transcript_json) VALUES (?,?,?,?,?)").bind(contentId,r2Key,audio.type||"audio/mpeg",audio.size,JSON.stringify({segments:segments.map(s=>({order:s.order,startMs:s.startMs,endMs:s.endMs,text:s.text}))})).run();await setJob(env.DB,jobId,{stage:"audio_uploaded",progress:25});await dispatchJob(jobId,env);return Response.json({ok:true,contentId,jobId,status:"queued"},{status:202});}catch(e){const message=e instanceof Error?e.message:"Owned listening task failed",stage=uploaded?"dispatch_failed":"upload_failed";await setJob(env.DB,jobId,{status:"failed",stage,progress:100,error:message,completed:true});await env.DB.prepare("UPDATE content_items SET status='failed',generation_stage=?,generation_error=? WHERE id=?").bind(stage,message,contentId).run();return Response.json({error:message,contentId,jobId,status:"failed"},{status:502});}
}
