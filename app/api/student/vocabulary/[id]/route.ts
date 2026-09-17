import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession } from "@/lib/student/session";

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  const env=getEnv();const session=await ensureLearnerSession(request,env.DB);const {id}=await params;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM vocabulary_contexts WHERE child_id=? AND vocabulary_id=?").bind(session.childId,id),
    env.DB.prepare("DELETE FROM learner_vocabulary WHERE child_id=? AND vocabulary_id=?").bind(session.childId,id),
  ]);
  return Response.json({ok:true});
}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const env=getEnv();const session=await ensureLearnerSession(request,env.DB);const {id}=await params;
  const body=await request.json() as {note?:unknown};
  const note=typeof body.note==="string"?body.note.trim().slice(0,500):"";
  await env.DB.prepare("UPDATE learner_vocabulary SET learner_note=?,updated_at=CURRENT_TIMESTAMP WHERE child_id=? AND vocabulary_id=?").bind(note||null,session.childId,id).run();
  return Response.json({ok:true});
}
