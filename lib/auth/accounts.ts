import { hashSecret, verifySecret, isLocked, lockUntilAfterFailure } from "@/lib/auth/user";

export async function migrateGuestChild(db:D1Database,guestChild:string,targetChild:string){
  if(!guestChild.startsWith("guest-child-"))return;
  const already=await db.prepare("SELECT guest_child_id FROM guest_migrations WHERE guest_child_id=?").bind(guestChild).first();if(already)return;
  const tables=["learner_attempts","skill_mastery","learning_tasks","xp_ledger","learner_vocabulary","learner_content_progress","question_attempts","speaking_sessions","speaking_turns","intensive_listening_attempts","writing_submissions"];
  for(const t of tables)await db.prepare(`UPDATE OR IGNORE ${t} SET child_id=? WHERE child_id=?`).bind(targetChild,guestChild).run().catch(()=>null);
  await db.prepare("INSERT OR IGNORE INTO guest_migrations (guest_child_id,target_child_id) VALUES (?,?)").bind(guestChild,targetChild).run();
}

function validLogin(login:string){return /^[a-z0-9._-]{3,24}$/i.test(login);}
function validPin(pin:string){return /^\d{4,8}$/.test(pin);}

export async function createTenantStudent(db:D1Database,args:{tenantId:string;adminUserId:string;studentName:string;loginName:string;pin:string;schoolLevel:"P5"|"P6";targetAl:string}){
  const login=args.loginName.trim().toLowerCase(),name=args.studentName.trim();
  if(name.length<1)throw new Error("Student name is required");
  if(!validLogin(login))throw new Error("Student login must be 3-24 letters/numbers/._-");
  if(!validPin(args.pin))throw new Error("Student PIN must be 4-8 digits");
  const tenant=await db.prepare("SELECT id FROM tenants WHERE id=? AND status='active'").bind(args.tenantId).first();if(!tenant)throw new Error("Tenant is not active");
  const admin=await db.prepare("SELECT user_id FROM tenant_members WHERE tenant_id=? AND user_id=? AND role='admin' AND status='active'").bind(args.tenantId,args.adminUserId).first();if(!admin)throw new Error("Tenant Admin account is not active in this tenant");
  const studentUserId=`user-${crypto.randomUUID()}`,childId=`child-${crypto.randomUUID()}`,pinHash=await hashSecret(args.pin);
  await db.batch([
    db.prepare("INSERT INTO users (id,email,role,display_name) VALUES (?,?, 'student',?)").bind(studentUserId,`${login}@student.invalid`,name),
    db.prepare("INSERT INTO child_profiles (id,parent_user_id,learner_user_id,nickname,school_level,target_al,exam_year,tenant_id) VALUES (?,?,?,?,?,?,?,?)").bind(childId,args.adminUserId,studentUserId,name,args.schoolLevel,args.targetAl,new Date().getFullYear()+1,args.tenantId),
    db.prepare("INSERT INTO learner_accounts (child_id,login_name,pin_hash) VALUES (?,?,?)").bind(childId,login,pinHash),
    db.prepare("INSERT INTO tenant_members (tenant_id,user_id,role,status) VALUES (?,?,'student','active')").bind(args.tenantId,studentUserId)
  ]);
  return{studentUserId,childId,loginName:login,tenantId:args.tenantId};
}

export async function updateTenantStudent(db:D1Database,args:{tenantId:string;childId:string;studentName?:string;loginName?:string;pin?:string;schoolLevel?:"P5"|"P6";targetAl?:string;status?:"active"|"disabled"}){
  const row=await db.prepare("SELECT c.id,c.learner_user_id,c.nickname,a.login_name FROM child_profiles c LEFT JOIN learner_accounts a ON a.child_id=c.id WHERE c.id=? AND c.tenant_id=?").bind(args.childId,args.tenantId).first<{id:string;learner_user_id:string|null;nickname:string;login_name:string|null}>();
  if(!row)throw new Error("Student not found");
  const statements:D1PreparedStatement[]=[];let studentUserId=row.learner_user_id;
  const requestedLogin=args.loginName?.trim().toLowerCase();
  if(requestedLogin!==undefined&&!validLogin(requestedLogin))throw new Error("Student login must be 3-24 letters/numbers/._-");
  if(args.pin!==undefined&&!validPin(args.pin))throw new Error("Student PIN must be 4-8 digits");
  // V0.5/guest profiles may not have a formal Student identity. Tenant Admin can convert them in place
  // by setting a login and PIN; progress stays on the same child_profile id.
  if(!studentUserId&&(requestedLogin!==undefined||args.pin!==undefined)){
    if(!requestedLogin||!args.pin)throw new Error("Historical Student requires both a new login and PIN");
    studentUserId=`user-${crypto.randomUUID()}`;const name=(args.studentName?.trim()||row.nickname||"Student").slice(0,120),pinHash=await hashSecret(args.pin);
    statements.push(
      db.prepare("INSERT INTO users (id,email,role,display_name) VALUES (?,?, 'student',?)").bind(studentUserId,`student+${crypto.randomUUID()}@student.invalid`,name),
      db.prepare("UPDATE child_profiles SET learner_user_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND tenant_id=?").bind(studentUserId,args.childId,args.tenantId),
      db.prepare("INSERT INTO tenant_members (tenant_id,user_id,role,status) VALUES (?,?,'student',?)").bind(args.tenantId,studentUserId,args.status||"active"),
      db.prepare("INSERT INTO learner_accounts (child_id,login_name,pin_hash) VALUES (?,?,?)").bind(args.childId,requestedLogin,pinHash)
    );
  }
  if(args.studentName!==undefined){const name=args.studentName.trim();if(!name)throw new Error("Student name is required");statements.push(db.prepare("UPDATE child_profiles SET nickname=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND tenant_id=?").bind(name,args.childId,args.tenantId));if(studentUserId)statements.push(db.prepare("UPDATE users SET display_name=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(name,studentUserId));}
  if(args.schoolLevel)statements.push(db.prepare("UPDATE child_profiles SET school_level=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND tenant_id=?").bind(args.schoolLevel,args.childId,args.tenantId));
  if(args.targetAl!==undefined)statements.push(db.prepare("UPDATE child_profiles SET target_al=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND tenant_id=?").bind(args.targetAl,args.childId,args.tenantId));
  if(studentUserId&&row.login_name){if(requestedLogin!==undefined)statements.push(db.prepare("UPDATE learner_accounts SET login_name=?,updated_at=CURRENT_TIMESTAMP WHERE child_id=?").bind(requestedLogin,args.childId));if(args.pin!==undefined)statements.push(db.prepare("UPDATE learner_accounts SET pin_hash=?,failed_attempts=0,locked_until=NULL,updated_at=CURRENT_TIMESTAMP WHERE child_id=?").bind(await hashSecret(args.pin),args.childId));}
  else if(studentUserId&&!row.login_name&&studentUserId===row.learner_user_id&&(requestedLogin!==undefined||args.pin!==undefined)){if(!requestedLogin||!args.pin)throw new Error("Student requires both a login and PIN for first-time account setup");statements.push(db.prepare("INSERT INTO learner_accounts (child_id,login_name,pin_hash) VALUES (?,?,?)").bind(args.childId,requestedLogin,await hashSecret(args.pin)));}
  if(args.pin!==undefined)statements.push(db.prepare("DELETE FROM user_sessions WHERE child_id=? AND session_type='student'").bind(args.childId));
  if(args.status&&studentUserId){statements.push(db.prepare("UPDATE tenant_members SET status=?,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND user_id=? AND role='student'").bind(args.status,args.tenantId,studentUserId));if(args.status==='disabled')statements.push(db.prepare("DELETE FROM user_sessions WHERE child_id=? AND session_type='student'").bind(args.childId));}
  if(statements.length)await db.batch(statements);return{ok:true};
}

export async function verifyStudentLogin(db:D1Database,login:string,pin:string){
  const row=await db.prepare(`SELECT a.child_id,a.pin_hash,a.failed_attempts,a.locked_until,c.nickname,c.tenant_id,c.learner_user_id
    FROM learner_accounts a JOIN child_profiles c ON c.id=a.child_id JOIN tenants t ON t.id=c.tenant_id AND t.status='active'
    JOIN tenant_members tm ON tm.tenant_id=c.tenant_id AND tm.user_id=c.learner_user_id AND tm.role='student' AND tm.status='active'
    WHERE lower(a.login_name)=lower(?)`).bind(login.trim()).first<{child_id:string;pin_hash:string;failed_attempts:number;locked_until:string|null;nickname:string;tenant_id:string;learner_user_id:string|null}>();
  if(!row)return null;if(await isLocked(row.locked_until))throw new Error("Too many attempts. Try again in 15 minutes.");
  const ok=await verifySecret(pin,row.pin_hash);if(!ok){const lock=lockUntilAfterFailure(row.failed_attempts);await db.prepare("UPDATE learner_accounts SET failed_attempts=failed_attempts+1,locked_until=?,updated_at=CURRENT_TIMESTAMP WHERE child_id=?").bind(lock,row.child_id).run();return null;}
  await db.prepare("UPDATE learner_accounts SET failed_attempts=0,locked_until=NULL,last_login_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE child_id=?").bind(row.child_id).run();return row;
}
