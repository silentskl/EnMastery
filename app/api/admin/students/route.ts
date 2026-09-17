import { getEnv } from "@/lib/cloudflare";
import { createTenantStudent, updateTenantStudent } from "@/lib/auth/accounts";
import { requireTenantSession } from "@/lib/auth/tenant";

export async function GET(request:Request){
  const a=await requireTenantSession(request);if(a.response)return a.response;const s=a.session!,db=getEnv().DB;
  const rows=await db.prepare(`SELECT c.id,c.nickname,c.school_level,c.target_al,c.exam_year,c.created_at,la.login_name,
    COALESCE(tm.status,'active') account_status,
    (SELECT COUNT(*) FROM assignment_targets at JOIN assignments x ON x.id=at.assignment_id WHERE at.child_id=c.id AND x.tenant_id=?) assignment_count
    FROM child_profiles c LEFT JOIN learner_accounts la ON la.child_id=c.id LEFT JOIN tenant_members tm ON tm.tenant_id=c.tenant_id AND tm.user_id=c.learner_user_id AND tm.role='student'
    WHERE c.tenant_id=? ORDER BY c.nickname`).bind(s.tenant_id,s.tenant_id).all();
  return Response.json({students:rows.results});
}
export async function POST(request:Request){
  const a=await requireTenantSession(request);if(a.response)return a.response;const s=a.session!,b=await request.json().catch(()=>({})) as Record<string,unknown>;
  try{
    const student=await createTenantStudent(getEnv().DB,{tenantId:s.tenant_id,adminUserId:s.user_id,studentName:String(b.studentName||"Student"),loginName:String(b.loginName||""),pin:String(b.pin||""),schoolLevel:b.schoolLevel==="P5"?"P5":"P6",targetAl:String(b.targetAl||"AL2")});
    await getEnv().DB.prepare("INSERT INTO audit_logs (id,actor_user_id,action,entity_type,entity_id,detail_json) VALUES (?,?, 'student.create','student',?,?)").bind(`audit-${crypto.randomUUID()}`,s.user_id,student.childId,JSON.stringify({tenantId:s.tenant_id,loginName:student.loginName})).run().catch(()=>null);
    return Response.json({ok:true,...student},{status:201});
  }catch(e){const m=e instanceof Error?e.message:"Could not create Student";return Response.json({error:m},{status:m.includes("UNIQUE")?409:400});}
}
export async function PATCH(request:Request){
  const a=await requireTenantSession(request);if(a.response)return a.response;const s=a.session!,b=await request.json().catch(()=>({})) as Record<string,unknown>,childId=String(b.childId||"");if(!childId)return Response.json({error:"childId is required"},{status:400});
  try{
    await updateTenantStudent(getEnv().DB,{tenantId:s.tenant_id,childId,studentName:typeof b.studentName==="string"?b.studentName:undefined,loginName:typeof b.loginName==="string"?b.loginName:undefined,pin:typeof b.pin==="string"&&b.pin?b.pin:undefined,schoolLevel:b.schoolLevel==="P5"||b.schoolLevel==="P6"?b.schoolLevel:undefined,targetAl:typeof b.targetAl==="string"?b.targetAl:undefined,status:b.status==="active"||b.status==="disabled"?b.status:undefined});
    await getEnv().DB.prepare("INSERT INTO audit_logs (id,actor_user_id,action,entity_type,entity_id,detail_json) VALUES (?,?, 'student.update','student',?,?)").bind(`audit-${crypto.randomUUID()}`,s.user_id,childId,JSON.stringify({tenantId:s.tenant_id,loginChanged:typeof b.loginName==='string',pinReset:Boolean(b.pin),status:b.status||null})).run().catch(()=>null);
    return Response.json({ok:true});
  }catch(e){const m=e instanceof Error?e.message:"Could not update Student";return Response.json({error:m},{status:m.includes("UNIQUE")?409:400});}
}


export async function DELETE(request:Request){
  const a=await requireTenantSession(request);if(a.response)return a.response;const s=a.session!,db=getEnv().DB,b=await request.json().catch(()=>({})) as Record<string,unknown>,childId=String(b.childId||"");if(!childId)return Response.json({error:"childId is required"},{status:400});
  const child=await db.prepare("SELECT id,learner_user_id,nickname FROM child_profiles WHERE id=? AND tenant_id=?").bind(childId,s.tenant_id).first<{id:string;learner_user_id:string|null;nickname:string}>();
  if(!child)return Response.json({error:"Student not found in this tenant"},{status:404});
  try{
    // Explicitly remove legacy NO ACTION references before deleting child_profiles.
    const tables=["speaking_turns","speaking_sessions","intensive_listening_attempts","question_attempts","learner_attempts","skill_mastery","learning_tasks","xp_ledger","learner_vocabulary","learner_content_progress","vocabulary_contexts","vocabulary_review_events","writing_submissions","diagnostic_results","guest_migrations"];
    await db.prepare("UPDATE writing_submissions SET revision_of_submission_id=NULL WHERE child_id=?").bind(childId).run().catch(()=>undefined);
    for(const table of tables){const column=table==="guest_migrations"?"target_child_id":"child_id";await db.prepare(`DELETE FROM ${table} WHERE ${column}=?`).bind(childId).run().catch(()=>undefined);}
    await db.prepare("DELETE FROM child_profiles WHERE id=? AND tenant_id=?").bind(childId,s.tenant_id).run();
    if(child.learner_user_id)await db.prepare("DELETE FROM users WHERE id=? AND NOT EXISTS(SELECT 1 FROM child_profiles WHERE learner_user_id=?)").bind(child.learner_user_id,child.learner_user_id).run();
    await db.prepare("INSERT INTO audit_logs (id,actor_user_id,action,entity_type,entity_id,detail_json) VALUES (?,?, 'student.delete','student',?,?)").bind(`audit-${crypto.randomUUID()}`,s.user_id,childId,JSON.stringify({tenantId:s.tenant_id,nickname:child.nickname})).run().catch(()=>null);
    return Response.json({ok:true});
  }catch(e){return Response.json({error:e instanceof Error?e.message:"Could not delete Student"},{status:400});}
}
