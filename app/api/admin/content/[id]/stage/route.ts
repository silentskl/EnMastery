import {getEnv} from "@/lib/cloudflare";
import {requireTenantSession} from "@/lib/auth/tenant";
import {isLearningStage,type LearningStage} from "@/lib/language/stages";

const activityFor=(contentType:string)=>contentType==="audio"||contentType==="video_ref"?"listening":contentType==="oral_prompt"?"speaking":contentType==="writing_prompt"?"writing":"reading";
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireTenantSession(request);if(auth.response)return auth.response;const s=auth.session!,db=getEnv().DB,{id}=await params,body=await request.json().catch(()=>({}))as{schoolLevel?:unknown};
 if(!isLearningStage(body.schoolLevel))return Response.json({error:"Choose a valid learning stage"},{status:400});const schoolLevel=body.schoolLevel as LearningStage;
 const row=await db.prepare("SELECT id,content_type,school_level,status FROM content_items WHERE id=? AND scope='tenant' AND tenant_id=?").bind(id,s.tenant_id).first<{id:string;content_type:string;school_level:string;status:string}>();
 if(!row)return Response.json({error:"Tenant-owned lesson not found"},{status:404});if(row.status==="generating")return Response.json({error:"Wait for generation to finish before changing the lesson stage"},{status:409});
 if(row.school_level===schoolLevel)return Response.json({ok:true,id,schoolLevel,previousSchoolLevel:row.school_level,questionsUpdated:0});
 const count=await db.prepare("SELECT COUNT(*) n FROM questions WHERE source_content_id=?").bind(id).first<{n:number}>();
 await db.batch([db.prepare("UPDATE content_items SET school_level=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND tenant_id=? AND scope='tenant'").bind(schoolLevel,id,s.tenant_id),db.prepare("UPDATE questions SET school_level=? WHERE source_content_id=?").bind(schoolLevel,id)]);
 const activity=activityFor(row.content_type);await db.prepare(`DELETE FROM learning_tasks WHERE source='adaptive' AND status IN ('todo','skipped') AND task_date>=date('now','+8 hours') AND activity_type=? AND child_id IN (SELECT id FROM child_profiles WHERE tenant_id=? AND school_level IN (?,?))`).bind(activity,s.tenant_id,row.school_level,schoolLevel).run();
 return Response.json({ok:true,id,schoolLevel,previousSchoolLevel:row.school_level,questionsUpdated:Number(count?.n||0)});
}
