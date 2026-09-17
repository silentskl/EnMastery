import{getEnv}from"@/lib/cloudflare";import{requireAdmin}from"@/lib/auth/admin";export async function GET(request:Request){const denied=await requireAdmin(request);if(denied)return denied;const env=getEnv();const rows=await env.DB.prepare("SELECT s.*,COUNT(b.question_id) question_count FROM question_bank_sources s LEFT JOIN question_bank_items b ON b.source_id=s.id GROUP BY s.id ORDER BY s.priority DESC,s.name").all();const coverage=await env.DB.prepare("SELECT b.category,b.subcategory,q.school_level,COUNT(*) count FROM question_bank_items b JOIN questions q ON q.id=b.question_id WHERE q.status='published' GROUP BY b.category,b.subcategory,q.school_level ORDER BY b.category,b.subcategory,q.school_level").all();return Response.json({sources:rows.results,coverage:coverage.results});}


export async function POST(request:Request){
 const denied=await requireAdmin(request);if(denied)return denied;
 const body=await request.json().catch(()=>({})) as Record<string,unknown>;
 const name=typeof body.name==='string'?body.name.trim():'';
 const url=typeof body.url==='string'?body.url.trim():'';
 const provider=typeof body.provider==='string'?body.provider.trim():'';
 const sourceKind=typeof body.sourceKind==='string'?body.sourceKind.trim():'speaking_reference';
 const usageMode=typeof body.usageMode==='string'?body.usageMode.trim():'reference_only';
 const licenceNote=typeof body.licenceNote==='string'?body.licenceNote.trim().slice(0,1000):'';
 const priority=Math.max(1,Math.min(100,Number(body.priority)||60));
 const categories=Array.isArray(body.categories)?body.categories.filter((x):x is string=>typeof x==='string'&&['oral','reading_comprehension','cloze','writing'].includes(x)).slice(0,4):['oral'];
 if(!name||!url||!provider)return Response.json({error:'name, url and provider are required'},{status:400});
 let parsed:URL;try{parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol))throw new Error();}catch{return Response.json({error:'A valid http(s) source URL is required'},{status:400});}
 const id=`qsrc-${crypto.randomUUID()}`;const db=getEnv().DB;
 await db.prepare("INSERT INTO question_bank_sources(id,name,url,provider,source_kind,categories_json,usage_mode,licence_note,priority,enabled) VALUES(?,?,?,?,?,?,?,?,?,1)").bind(id,name,parsed.toString(),provider,sourceKind,JSON.stringify(categories),usageMode,licenceNote||null,priority).run();
 return Response.json({ok:true,id},{status:201});
}
