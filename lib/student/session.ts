import { getUserSession, parseCookie } from "@/lib/auth/user";

const LEARNER_COOKIE = "em_learner";
export type LearnerSession = { sessionId: string; childId: string; isNew: boolean; authenticated?: boolean };

export async function ensureLearnerSession(request: Request, db: D1Database): Promise<LearnerSession> {
  const student=await getUserSession(request,db,"student");
  if(student?.child_id)return {sessionId:student.id,childId:student.child_id,isNew:false,authenticated:true};
  let sessionId=parseCookie(request.headers.get("cookie"),LEARNER_COOKIE),isNew=false;if(!sessionId||!/^[a-f0-9-]{20,64}$/i.test(sessionId)){sessionId=crypto.randomUUID();isNew=true;}
  const learnerId=`guest-user-${sessionId}`,childId=`guest-child-${sessionId}`;
  const admin=await db.prepare("SELECT user_id FROM tenant_members WHERE tenant_id='tenant-default' AND role='admin' AND status='active' LIMIT 1").first<{user_id:string}>();
  const ownerId=admin?.user_id||"user-tenant-default-system-owner";
  if(!admin){
    await db.prepare("INSERT OR IGNORE INTO users (id,email,role,display_name) VALUES (?,?,?,?)").bind(ownerId,"tenant-default@system.invalid","admin","English Mastery Default").run();
  }
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO users (id,email,role,display_name) VALUES (?,?,?,?)").bind(learnerId,`student+${sessionId}@guest.invalid`,"student","Student"),
    db.prepare("INSERT OR IGNORE INTO child_profiles (id,parent_user_id,learner_user_id,nickname,school_level,target_al,exam_year,tenant_id) VALUES (?,?,?,?,?,?,?,NULL)").bind(childId,ownerId,learnerId,"Student","P6","AL2",new Date().getUTCFullYear()+1),
  ]);return {sessionId,childId,isNew};
}
export function learnerCookie(sessionId:string){return `${LEARNER_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`;}
