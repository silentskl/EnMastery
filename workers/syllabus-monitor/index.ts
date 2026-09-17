import { resolveIntegrations } from "../../lib/settings/runtime";
import { sendNotificationEmail } from "../../lib/notifications/email";
interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  MODELBRIDGE_BASE_URL?: string;
  MODELBRIDGE_API_KEY?: string;
  MODELBRIDGE_CHAT_MODEL?: string;
  ADMIN_MONITOR_TOKEN?: string;
  SETTINGS_MASTER_KEY?: string;
  SMTP_ENABLED?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_SECURITY?: string;
  SMTP_AUTH?: string;
  SMTP_USERNAME?: string;
  SMTP_PASSWORD?: string;
  SMTP_FROM_EMAIL?: string;
  SMTP_FROM_NAME?: string;
  SMTP_NOTIFY_TO?: string;
}
type SourceRow={id:string;code:string;title:string;url:string;source_kind:'html'|'pdf';last_hash:string|null;discovery_url:string|null;link_match:string|null};
const id=(prefix:string)=>`${prefix}_${crypto.randomUUID()}`;

async function hash(input:ArrayBuffer|string){
  const bytes=typeof input==='string'?new TextEncoder().encode(input):new Uint8Array(input);
  const out=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(out)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

function normalizeHtml(s:string){
  return s.replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

async function resolveSourceUrl(source:SourceRow){
  if(!source.discovery_url||!source.link_match)return source.url;
  try{
    const r=await fetch(source.discovery_url,{headers:{'User-Agent':'EnglishMastery-SyllabusMonitor/0.4'}});
    if(!r.ok) return source.url;
    const html=await r.text();
    const links=[...html.matchAll(/href=[\"']([^\"']+)[\"']/gi)].map(m=>m[1]);
    const match=links.find(h=>h.toLowerCase().includes(source.link_match!.toLowerCase())&&/\.pdf(?:$|\?)/i.test(h));
    return match?new URL(match,source.discovery_url).toString():source.url;
  }catch{return source.url;}
}

async function analyseImpact(env:Env,source:SourceRow,oldHash:string|null,newHash:string){
  if(!env.MODELBRIDGE_API_KEY||!env.MODELBRIDGE_BASE_URL||!env.MODELBRIDGE_CHAT_MODEL){
    return {severity:'review',summary:'Official source fingerprint changed. Human review required.',affectedSkills:[]};
  }
  try{
    const r=await fetch(`${env.MODELBRIDGE_BASE_URL.replace(/\/$/,'')}/v1/chat/completions`,{
      method:'POST',
      headers:{Authorization:`Bearer ${env.MODELBRIDGE_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:env.MODELBRIDGE_CHAT_MODEL,
        temperature:0,
        messages:[
          {role:'system',content:'You classify official Singapore English syllabus source changes. Return compact JSON only with severity (info|review|high|critical), summary, affectedSkills (skill IDs if known). Never recommend auto-publishing.'},
          {role:'user',content:`Source ${source.code} changed fingerprint from ${oldHash||'none'} to ${newHash}. Classify this change based only on the fact that official source bytes changed; state that content inspection is required if details are unavailable.`}
        ]
      })
    });
    if(!r.ok) throw new Error(`ModelBridge HTTP ${r.status}`);
    const b:any=await r.json();
    const t=b?.choices?.[0]?.message?.content;
    return t?JSON.parse(t):{severity:'review',summary:'Source changed.',affectedSkills:[]};
  }catch{
    return {severity:'review',summary:'Official source changed; automated semantic classification unavailable.',affectedSkills:[]};
  }
}

async function createUpdateJobs(env:Env,eventId:string,source:SourceRow,impact:any){
  const skills=Array.isArray(impact?.affectedSkills)?impact.affectedSkills.filter((x:unknown)=>typeof x==='string'&&x):[];
  let created=0;
  for(const skillId of skills){
    const linked=await env.DB.prepare("SELECT content_id FROM content_skills WHERE skill_id=?").bind(skillId).all<{content_id:string}>();
    if(!linked.results.length){
      await env.DB.prepare("INSERT INTO content_update_jobs (id,change_event_id,skill_id,reason,proposed_changes_json,status) VALUES (?,?,?,?,?,'needs_review')")
        .bind(id('upd'),eventId,skillId,`Review ${skillId} for official change ${source.code}`,JSON.stringify({source:source.code,impact})).run();
      created++;
    }
    for(const row of linked.results){
      await env.DB.prepare("INSERT INTO content_update_jobs (id,change_event_id,content_id,skill_id,reason,proposed_changes_json,status) VALUES (?,?,?,?,?,?,'needs_review')")
        .bind(id('upd'),eventId,row.content_id,skillId,`Update mapped material after ${source.code} change`,JSON.stringify({source:source.code,impact})).run();
      created++;
    }
  }
  if(!created){
    await env.DB.prepare("INSERT INTO content_update_jobs (id,change_event_id,reason,proposed_changes_json,status) VALUES (?,?,?,?, 'needs_review')")
      .bind(id('upd'),eventId,`Review all materials mapped to source change ${source.code}`,JSON.stringify({source:source.code,impact})).run();
  }
}

async function sendAlert(env:Env, source:SourceRow, eventId:string, impact:any){
  try{
    return await sendNotificationEmail(env,{
      subject:`[English Mastery] Syllabus change detected: ${source.code}`,
      text:`A monitored official source changed. ${impact.summary} Event: ${eventId}. Review in Admin > Syllabus Monitor.`,
      html:`<h2>Official syllabus source changed</h2><p><strong>${source.title}</strong></p><p>${impact.summary}</p><p>Severity: <strong>${impact.severity}</strong></p><p>Event: ${eventId}</p><p>Review the change in Admin → Syllabus Monitor. Live learning materials have not been modified.</p>`
    });
  }catch(error){
    console.error('Syllabus alert SMTP failed',error);
    return {sent:false,reason:error instanceof Error?error.message:String(error)};
  }
}

async function run(env:Env){
  env=await resolveIntegrations(env);
  const rows=await env.DB.prepare("SELECT id,code,title,url,source_kind,last_hash,discovery_url,link_match FROM syllabus_sources WHERE enabled=1").all<SourceRow>();
  const results:any[]=[];
  for(const source of rows.results){
    try{
      const resolvedUrl=await resolveSourceUrl(source);
      const response=await fetch(resolvedUrl,{headers:{'User-Agent':'EnglishMastery-SyllabusMonitor/0.4'}});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const raw=await response.arrayBuffer();
      const material=source.source_kind==='html'?normalizeHtml(new TextDecoder().decode(raw)):raw;
      const newHash=await hash(material);
      const changed=!!source.last_hash&&source.last_hash!==newHash;
      const r2Key=`syllabus/${source.code}/${newHash}.${source.source_kind==='pdf'?'pdf':'html'}`;

      // R2 is used for immutable official-source snapshots. The deploy script provisions one Standard bucket,
      // whose free tier is ample for this V0.2 use case.
      await env.MEDIA.put(r2Key,raw,{httpMetadata:{contentType:response.headers.get('content-type')||undefined}});
      await env.DB.prepare("INSERT OR IGNORE INTO syllabus_snapshots (id,source_id,sha256,http_status,content_type,byte_length,r2_key) VALUES (?,?,?,?,?,?,?)")
        .bind(id('snap'),source.id,newHash,response.status,response.headers.get('content-type'),raw.byteLength,r2Key).run();
      await env.DB.prepare("UPDATE syllabus_sources SET last_checked_at=CURRENT_TIMESTAMP,last_success_at=CURRENT_TIMESTAMP,last_hash=?,check_status='ok',resolved_url=? WHERE id=?")
        .bind(newHash,resolvedUrl,source.id).run();

      let email:any={sent:false,reason:'no_change'};
      if(changed){
        const impact=await analyseImpact(env,source,source.last_hash,newHash);
        const eventId=id('chg');
        await env.DB.prepare("INSERT INTO syllabus_change_events (id,source_id,old_hash,new_hash,severity,summary,impact_json) VALUES (?,?,?,?,?,?,?)")
          .bind(eventId,source.id,source.last_hash,newHash,impact.severity||'review',impact.summary||'Official source changed.',JSON.stringify(impact)).run();
        await createUpdateJobs(env,eventId,source,impact);
        email=await sendAlert(env,source,eventId,impact);
      }
      results.push({source:source.code,ok:true,changed,sha256:newHash,email});
    }catch(e){
      await env.DB.prepare("UPDATE syllabus_sources SET last_checked_at=CURRENT_TIMESTAMP,check_status='error' WHERE id=?").bind(source.id).run();
      results.push({source:source.code,ok:false,error:e instanceof Error?e.message:String(e)});
    }
  }
  return results;
}

export default {
  async scheduled(_controller:ScheduledController,env:Env,ctx:ExecutionContext){ctx.waitUntil(run(env));},
  async fetch(request:Request,env:Env){
    const u=new URL(request.url);
    if(u.pathname!='/run')return Response.json({service:'english-mastery-syllabus-monitor',version:'1.0.2',emailTransport:'smtp'});
    if(env.ADMIN_MONITOR_TOKEN&&request.headers.get('authorization')!==`Bearer ${env.ADMIN_MONITOR_TOKEN}`)return new Response('Unauthorized',{status:401});
    return Response.json({checkedAt:new Date().toISOString(),results:await run(env)});
  }
};
