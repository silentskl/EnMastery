import{getEnv}from"@/lib/cloudflare";import{requireTenantSession}from"@/lib/auth/tenant";
export async function GET(request:Request){const a=await requireTenantSession(request);if(a.response)return a.response;const s=a.session!,db=getEnv().DB;const [content,questions,sets,assessments]=await Promise.all([
 db.prepare("SELECT id,title,content_type type,school_level,scope,status FROM content_items WHERE status='published' AND (scope='global' OR (scope='tenant' AND tenant_id=?)) ORDER BY updated_at DESC LIMIT 120").bind(s.tenant_id).all(),
 db.prepare("SELECT id,question_type type,school_level,difficulty,scope,status FROM questions WHERE status='published' AND (scope='global' OR (scope='tenant' AND tenant_id=?)) ORDER BY created_at DESC LIMIT 120").bind(s.tenant_id).all(),
 db.prepare("SELECT id,name title,set_type type,school_level,scope,status FROM practice_sets WHERE status='published' AND (scope='global' OR (scope='tenant' AND tenant_id=?)) ORDER BY updated_at DESC LIMIT 80").bind(s.tenant_id).all(),
 db.prepare("SELECT id,name title,assessment_type type,school_level,scope,status FROM assessments WHERE status='published' AND (scope='global' OR (scope='tenant' AND tenant_id=?)) ORDER BY created_at DESC LIMIT 80").bind(s.tenant_id).all()
 ]);return Response.json({content:content.results,questions:questions.results,practiceSets:sets.results,assessments:assessments.results});}
