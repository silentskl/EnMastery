import{getEnv}from"@/lib/cloudflare";import{ensureLearnerSession,learnerCookie}from"@/lib/student/session";
export async function GET(request:Request){const env=getEnv(),s=await ensureLearnerSession(request,env.DB);const rows=await env.DB.prepare(`SELECT a.id,a.title,a.instructions,a.course_id,a.available_from,a.due_at,a.status,c.title course_title,c.school_level,t.status target_status,t.completed_at,
 (SELECT COUNT(*) FROM course_items ci WHERE ci.course_id=a.course_id) item_count
 FROM assignment_targets t JOIN assignments a ON a.id=t.assignment_id JOIN courses c ON c.id=a.course_id
 JOIN child_profiles cp ON cp.id=t.child_id
 WHERE t.child_id=? AND a.tenant_id=cp.tenant_id AND a.status='published' AND (a.available_from IS NULL OR a.available_from<=CURRENT_TIMESTAMP)
 ORDER BY CASE WHEN t.status='completed' THEN 1 ELSE 0 END,COALESCE(a.due_at,'9999-12-31'),a.created_at DESC`).bind(s.childId).all();const r=Response.json({assignments:rows.results});if(s.isNew)r.headers.set("Set-Cookie",learnerCookie(s.sessionId));return r;}
