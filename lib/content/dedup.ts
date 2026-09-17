export type ContentScope = "global" | "tenant";

export function canonicalUrl(raw:string){
  try{
    const u=new URL(raw.trim());
    u.hash="";
    for(const key of ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","fbclid","gclid"]){u.searchParams.delete(key);}
    u.hostname=u.hostname.toLowerCase();
    if((u.protocol==="https:"&&u.port==="443")||(u.protocol==="http:"&&u.port==="80"))u.port="";
    const entries=[...u.searchParams.entries()].sort(([a,av],[b,bv])=>a.localeCompare(b)||av.localeCompare(bv));
    u.search="";
    for(const [k,v] of entries)u.searchParams.append(k,v);
    u.pathname=u.pathname.replace(/\/{2,}/g,"/").replace(/\/$/,"")||"/";
    return u.toString();
  }catch{return raw.trim().replace(/#.*$/,"");}
}

export function canonicalTitle(raw:string){return raw.normalize("NFKC").toLowerCase().replace(/[\p{P}\p{S}]+/gu," ").replace(/\s+/g," ").trim();}

export async function findDuplicateContent(db:D1Database,args:{contentType:string;schoolLevel:string;scope:ContentScope;tenantId?:string|null;sourceUrl?:string|null;title?:string|null}){
  const tenantId=args.tenantId||null;
  if(args.sourceUrl?.trim()){
    const target=canonicalUrl(args.sourceUrl);
    const rows=await db.prepare(`SELECT id,title,source_url,status FROM content_items WHERE content_type=? AND school_level=? AND scope=? AND ${args.scope==="tenant"?"tenant_id=?":"tenant_id IS NULL"} AND source_url IS NOT NULL ORDER BY created_at DESC LIMIT 300`)
      .bind(...(args.scope==="tenant"?[args.contentType,args.schoolLevel,args.scope,tenantId]:[args.contentType,args.schoolLevel,args.scope])).all<{id:string;title:string;source_url:string;status:string}>();
    const hit=rows.results.find(r=>canonicalUrl(r.source_url)===target);if(hit)return hit;
  }
  const title=canonicalTitle(args.title||"");
  if(title){
    const rows=await db.prepare(`SELECT id,title,source_url,status FROM content_items WHERE content_type=? AND school_level=? AND scope=? AND ${args.scope==="tenant"?"tenant_id=?":"tenant_id IS NULL"} ORDER BY created_at DESC LIMIT 300`)
      .bind(...(args.scope==="tenant"?[args.contentType,args.schoolLevel,args.scope,tenantId]:[args.contentType,args.schoolLevel,args.scope])).all<{id:string;title:string;source_url:string|null;status:string}>();
    const hit=rows.results.find(r=>canonicalTitle(r.title)===title);if(hit)return hit;
  }
  return null;
}

export async function duplicateSkip(db:D1Database,args:{contentType:string;schoolLevel:string;scope:ContentScope;tenantId?:string|null;sourceUrl?:string|null;title?:string|null}){
  const existing=await findDuplicateContent(db,args);
  return existing?{skipped:true as const,existingId:existing.id,existingTitle:existing.title,existingStatus:existing.status}:{skipped:false as const};
}

export async function duplicateSourceJob(db:D1Database,args:{url:string;domain:string;schoolLevel:string;scope:ContentScope;tenantId?:string|null;configKey?:string|null}){
  const rows=await db.prepare(`SELECT id,request_json,status FROM generation_jobs WHERE job_type='source_lesson_import' AND scope=? AND ${args.scope==="tenant"?"tenant_id=?":"tenant_id IS NULL"} ORDER BY created_at DESC LIMIT 500`)
    .bind(...(args.scope==="tenant"?[args.scope,args.tenantId||null]:[args.scope])).all<{id:string;request_json:string;status:string}>();
  const target=canonicalUrl(args.url);
  for(const row of rows.results){
    try{const req=JSON.parse(row.request_json||"{}") as Record<string,unknown>;if(req.domain===args.domain&&req.schoolLevel===args.schoolLevel&&typeof req.url==="string"&&canonicalUrl(req.url)===target&&(!args.configKey||req.clozeConfigKey===args.configKey))return {skipped:true as const,existingId:row.id,existingStatus:row.status}}catch{}
  }
  return {skipped:false as const};
}
