import { getEnv } from "@/lib/cloudflare";
import { OFFICIAL_SYLLABUS_SOURCES } from "@/lib/syllabus/sources";
import { normalizeHtml, sha256Hex } from "@/lib/syllabus/fingerprint";

async function resolveUrl(source: (typeof OFFICIAL_SYLLABUS_SOURCES)[number]) {
  if (!("discoveryUrl" in source) || !source.discoveryUrl) return source.url;
  try {
    const html = await fetch(source.discoveryUrl).then((r) => r.text());
    const links = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
    const match = links.find((href) => href.toLowerCase().includes(String(source.linkMatch).toLowerCase()) && /\.pdf(?:$|\?)/i.test(href));
    return match ? new URL(match, source.discoveryUrl).toString() : source.url;
  } catch { return source.url; }
}

export async function POST(request: Request){
  const env=getEnv();
  const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  if(env.ADMIN_MONITOR_TOKEN && token!==env.ADMIN_MONITOR_TOKEN) return Response.json({error:"Unauthorized"},{status:401});
  const results: Array<Record<string, unknown>> = [];
  for(const source of OFFICIAL_SYLLABUS_SOURCES){
    const url=await resolveUrl(source);
    const response=await fetch(url,{headers:{"User-Agent":"EnglishMastery-SyllabusMonitor/0.2"}});
    if(!response.ok){results.push({code:source.code,ok:false,status:response.status,url});continue;}
    const raw=await response.arrayBuffer();
    const hash=await sha256Hex(source.kind==="html"?normalizeHtml(new TextDecoder().decode(raw)):raw);
    results.push({code:source.code,ok:true,status:response.status,sha256:hash,bytes:raw.byteLength,url});
  }
  return Response.json({checkedAt:new Date().toISOString(),results,note:"Manual endpoint fingerprints sources. Scheduled Worker persists snapshots and raises change events; email is optional and Free-plan compatible when sent to a verified destination address."});
}
