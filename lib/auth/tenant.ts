import { getEnv } from "@/lib/cloudflare";
import { hashSecret, isLocked, lockUntilAfterFailure, parseCookie, verifySecret } from "@/lib/auth/user";
import { LEARNING_STAGES } from "@/lib/language/stages";
import { ensureTenantPracticeDefaults } from "@/lib/settings/practice-policy";
import { ensureVocabularySpecialistDefaults } from "@/lib/vocabulary-specialist/policy";

export const TENANT_COOKIE = "em_tenant_session";

export type TenantAdminSessionRow = {
  id:string; user_id:string; tenant_id:string; role:"admin"; expires_at:string;
  display_name:string|null; email:string; tenant_name:string; tenant_slug:string;
};

async function sha256(value:string){
  const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

export async function verifyTenantAdminLogin(db:D1Database,email:string,password:string,tenantSlug:string){
  const slug=tenantSlug.trim().toLowerCase();
  if(!slug)throw new Error("Tenant slug is required");
  const row=await db.prepare(`SELECT u.id,u.email,u.display_name,c.password_hash,c.failed_attempts,c.locked_until,
    tm.tenant_id,tm.role,t.name tenant_name,t.slug tenant_slug
    FROM users u JOIN staff_credentials c ON c.user_id=u.id
    JOIN tenant_members tm ON tm.user_id=u.id AND tm.status='active' AND tm.role='admin'
    JOIN tenants t ON t.id=tm.tenant_id AND t.status='active'
    WHERE lower(u.email)=lower(?) AND lower(t.slug)=lower(?) LIMIT 1`)
    .bind(email.trim(),slug).first<{id:string;email:string;display_name:string|null;password_hash:string;failed_attempts:number;locked_until:string|null;tenant_id:string;role:"admin";tenant_name:string;tenant_slug:string}>();
  if(!row)return null;
  if(await isLocked(row.locked_until))throw new Error("Too many attempts. Try again in 15 minutes.");
  const ok=await verifySecret(password,row.password_hash);
  if(!ok){
    const lock=lockUntilAfterFailure(row.failed_attempts);
    await db.prepare("UPDATE staff_credentials SET failed_attempts=failed_attempts+1,locked_until=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?").bind(lock,row.id).run();
    return null;
  }
  await db.prepare("UPDATE staff_credentials SET failed_attempts=0,locked_until=NULL,last_login_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE user_id=?").bind(row.id).run();
  return row;
}

export async function createTenantAdminSession(db:D1Database,args:{userId:string;tenantId:string;days?:number}){
  const raw=crypto.randomUUID()+crypto.randomUUID().replace(/-/g,"");
  const tokenHash=await sha256(raw),id=`staff-session-${crypto.randomUUID()}`;
  const expires=new Date(Date.now()+(args.days??30)*86400000).toISOString();
  await db.prepare("INSERT INTO staff_sessions (id,user_id,tenant_id,role,token_hash,expires_at) VALUES (?,?,?,'admin',?,?)").bind(id,args.userId,args.tenantId,tokenHash,expires).run();
  return raw;
}

export async function getTenantSessionFromRaw(db:D1Database,raw:string|null|undefined){
  if(!raw)return null;
  const tokenHash=await sha256(raw);
  const row=await db.prepare(`SELECT s.id,s.user_id,s.tenant_id,s.role,s.expires_at,s.last_seen_at,u.display_name,u.email,t.name tenant_name,t.slug tenant_slug
    FROM staff_sessions s JOIN users u ON u.id=s.user_id JOIN tenants t ON t.id=s.tenant_id
    JOIN tenant_members tm ON tm.tenant_id=s.tenant_id AND tm.user_id=s.user_id AND tm.status='active' AND tm.role='admin'
    WHERE s.token_hash=? AND s.expires_at>CURRENT_TIMESTAMP AND t.status='active'`)
    .bind(tokenHash).first<TenantAdminSessionRow & {last_seen_at:string}>();
  if(!row)return null;
  // Do not write D1 on every Admin page/API request. A ten-minute heartbeat keeps
  // activity timestamps useful while avoiding a write-amplification burst when a
  // page loads several authenticated resources in parallel.
  const lastSeen=Date.parse(row.last_seen_at||"");
  if(!Number.isFinite(lastSeen)||Date.now()-lastSeen>=10*60*1000){
    await db.prepare("UPDATE staff_sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE id=? AND last_seen_at<datetime('now','-10 minutes')").bind(row.id).run().catch(()=>null);
  }
  return row;
}

export async function getTenantSession(request:Request,db:D1Database){return getTenantSessionFromRaw(db,parseCookie(request.headers.get("cookie"),TENANT_COOKIE));}
export async function requireTenantSession(request:Request){
  const env=getEnv(),session=await getTenantSession(request,env.DB);
  if(!session)return {session:null,response:Response.json({error:"Tenant Admin authentication required"},{status:401})};
  return {session,response:null};
}
export async function deleteTenantAdminSession(request:Request,db:D1Database){
  const raw=parseCookie(request.headers.get("cookie"),TENANT_COOKIE);if(!raw)return;
  const tokenHash=await sha256(raw);await db.prepare("DELETE FROM staff_sessions WHERE token_hash=?").bind(tokenHash).run();
}
export function tenantCookie(raw:string){return `${TENANT_COOKIE}=${encodeURIComponent(raw)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;}
export function clearTenantCookie(){return `${TENANT_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;}


async function sha256Hex(value:string){
  const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

function publicTenantSlug(v:string){
  const slug=v.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48);
  if(slug.length<3)return "";
  return slug;
}

export async function registerPublicTenant(db:D1Database,args:{name:string;slug:string;email:string;displayName:string;password:string;ip:string}){
  const name=args.name.trim(),slug=publicTenantSlug(args.slug||args.name),email=args.email.trim().toLowerCase(),displayName=args.displayName.trim()||email;
  if(name.length<2||name.length>120)throw new Error("Organisation name must be 2–120 characters");
  if(!slug)throw new Error("Organisation slug must contain at least 3 letters or numbers");
  if(!/^\S+@\S+\.\S+$/.test(email))throw new Error("Valid admin email is required");
  if(args.password.length<10)throw new Error("Password must be at least 10 characters");
  const emailHash=await sha256Hex(email),ipHash=await sha256Hex(args.ip||"unknown");
  const recentIp=await db.prepare("SELECT COUNT(*) count FROM tenant_registration_attempts WHERE ip_hash=? AND created_at>=datetime('now','-1 hour')").bind(ipHash).first<{count:number}>();
  if(Number(recentIp?.count||0)>=5)throw new Error("Too many registration attempts. Please try again later.");
  const recentEmail=await db.prepare("SELECT COUNT(*) count FROM tenant_registration_attempts WHERE email_hash=? AND created_at>=datetime('now','-24 hours')").bind(emailHash).first<{count:number}>();
  if(Number(recentEmail?.count||0)>=3)throw new Error("This email has reached the registration limit. Please try again later.");
  const existing=await db.prepare("SELECT id FROM users WHERE lower(email)=lower(?)").bind(email).first<{id:string}>();
  if(existing)throw new Error("An account already exists for this email. Please sign in instead.");
  const taken=await db.prepare("SELECT id FROM tenants WHERE lower(slug)=lower(?)").bind(slug).first<{id:string}>();
  if(taken)throw new Error("That organisation slug is already in use. Choose another one.");
  const tenantId=`tenant-${crypto.randomUUID()}`,userId=`user-${crypto.randomUUID()}`,passwordHash=await hashSecret(args.password);
  await db.batch([
    db.prepare("INSERT INTO tenant_registration_attempts(id,ip_hash,email_hash) VALUES(?,?,?)").bind(`reg-${crypto.randomUUID()}`,ipHash,emailHash),
    db.prepare("INSERT INTO tenants (id,slug,name,status,plan,ai_request_quota_monthly) VALUES (?,?,?,'active','standard',5000)").bind(tenantId,slug,name),
    db.prepare("INSERT INTO users (id,email,role,display_name) VALUES (?,?,'admin',?)").bind(userId,email,displayName),
    db.prepare("INSERT INTO tenant_members (tenant_id,user_id,role,status) VALUES (?,?,'admin','active')").bind(tenantId,userId),
    db.prepare("INSERT INTO staff_credentials (user_id,password_hash) VALUES (?,?)").bind(userId,passwordHash),
    ...LEARNING_STAGES.flatMap(level=>[['listen',10],['speak',10],['read',10],['write',10]].map(([domain,limit])=>db.prepare("INSERT INTO tenant_learn_availability(tenant_id,school_level,domain,lesson_limit) VALUES(?,?,?,?)").bind(tenantId,level,domain,limit))),
    ...LEARNING_STAGES.map(level=>db.prepare("INSERT INTO tenant_daily_task_policy(tenant_id,school_level,listen_video_max_seconds,read_max_words) VALUES(?,?,0,0)").bind(tenantId,level))
  ]);
  await ensureTenantPracticeDefaults(db,tenantId);
  await ensureVocabularySpecialistDefaults(db,tenantId);
  return {tenantId,slug,userId,email,name};
}

export async function setTenantAdmin(db:D1Database,args:{tenantId:string;email:string;displayName:string;password:string}){
  const email=args.email.trim().toLowerCase();
  if(!/^\S+@\S+\.\S+$/.test(email))throw new Error("Valid Admin email is required");
  if(args.password.length<8)throw new Error("Password must be at least 8 characters");
  const tenant=await db.prepare("SELECT id FROM tenants WHERE id=?").bind(args.tenantId).first<{id:string}>();
  if(!tenant)throw new Error("Tenant not found");
  const existing=await db.prepare("SELECT id,role FROM users WHERE lower(email)=lower(?)").bind(email).first<{id:string;role:string}>();
  const userId=existing?.id||`user-${crypto.randomUUID()}`,passwordHash=await hashSecret(args.password);
  if(existing?.role==="student")throw new Error("This email already belongs to a Student account");
  const statements:D1PreparedStatement[]=[];
  if(!existing)statements.push(db.prepare("INSERT INTO users (id,email,role,display_name) VALUES (?,?,'admin',?)").bind(userId,email,args.displayName||email));
  else statements.push(db.prepare("UPDATE users SET role='admin',display_name=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(args.displayName||email,userId));
  statements.push(
    db.prepare("UPDATE tenant_members SET status='disabled',updated_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND role='admin' AND user_id<>?").bind(args.tenantId,userId),
    db.prepare("INSERT INTO tenant_members (tenant_id,user_id,role,status) VALUES (?,?,'admin','active') ON CONFLICT(tenant_id,user_id) DO UPDATE SET role='admin',status='active',updated_at=CURRENT_TIMESTAMP").bind(args.tenantId,userId),
    db.prepare("INSERT INTO staff_credentials (user_id,password_hash) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET password_hash=excluded.password_hash,failed_attempts=0,locked_until=NULL,updated_at=CURRENT_TIMESTAMP").bind(userId,passwordHash),
    db.prepare("DELETE FROM staff_sessions WHERE tenant_id=?").bind(args.tenantId)
  );
  await db.batch(statements);
  return userId;
}

export async function tenantIdForChild(db:D1Database,childId:string){
  if(childId.startsWith("guest-child-")) return "";
  const row=await db.prepare("SELECT tenant_id FROM child_profiles WHERE id=?").bind(childId).first<{tenant_id:string|null}>();
  return row?.tenant_id||"tenant-default";
}
