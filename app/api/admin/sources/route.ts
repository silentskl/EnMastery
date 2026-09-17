import { getEnv } from "@/lib/cloudflare";
import { requireTenantSession } from "@/lib/auth/tenant";
const DOMAINS=["reading","speaking","writing","cloze"] as const;
function domainFrom(v:unknown){return DOMAINS.includes(v as (typeof DOMAINS)[number])?String(v):"";}
export async function GET(request:Request){const a=await requireTenantSession(request);if(a.response)return a.response;const url=new URL(request.url),domain=domainFrom(url.searchParams.get("domain"));const rows=domain?await getEnv().DB.prepare("SELECT * FROM content_sources WHERE enabled=1 AND domains_json LIKE ? ORDER BY name").bind(`%\"${domain}\"%`).all():await getEnv().DB.prepare("SELECT * FROM content_sources WHERE enabled=1 ORDER BY name").all();return Response.json({sources:rows.results,readOnly:true});}
