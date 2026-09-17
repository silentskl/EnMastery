import { hashSecret } from "@/lib/auth/user";

const RESET_TTL_MS=30*60_000;
const MAX_IP_REQUESTS_PER_HOUR=8;
const MAX_ACCOUNT_REQUESTS_PER_HOUR=5;

function bytesToHex(bytes:Uint8Array){return Array.from(bytes).map(b=>b.toString(16).padStart(2,"0")).join("");}
async function sha256(value:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return bytesToHex(new Uint8Array(d));}
function randomToken(){return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));}
function normaliseSlug(v:string){return v.trim().toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,48);}
function normaliseEmail(v:string){return v.trim().toLowerCase().slice(0,254);}

export async function requestTenantPasswordReset(db:D1Database,args:{tenantSlug:string;email:string;ip:string}){
  const tenantSlug=normaliseSlug(args.tenantSlug),email=normaliseEmail(args.email);
  if(!tenantSlug||tenantSlug.length<3||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {matched:false as const};
  const accountHash=await sha256(`${tenantSlug}\0${email}`),ipHash=await sha256(args.ip||"unknown");
  const [ipRecent,accountRecent]=await Promise.all([
    db.prepare("SELECT COUNT(*) count FROM tenant_password_reset_attempts WHERE ip_hash=? AND created_at>=datetime('now','-1 hour')").bind(ipHash).first<{count:number}>(),
    db.prepare("SELECT COUNT(*) count FROM tenant_password_reset_attempts WHERE account_hash=? AND created_at>=datetime('now','-1 hour')").bind(accountHash).first<{count:number}>(),
  ]);
  if(Number(ipRecent?.count||0)>=MAX_IP_REQUESTS_PER_HOUR||Number(accountRecent?.count||0)>=MAX_ACCOUNT_REQUESTS_PER_HOUR)throw new Error("Too many password reset requests. Please try again later.");
  await db.prepare("INSERT INTO tenant_password_reset_attempts(id,account_hash,ip_hash) VALUES(?,?,?)").bind(`pwreset-attempt-${crypto.randomUUID()}`,accountHash,ipHash).run();
  await db.prepare("DELETE FROM tenant_password_reset_attempts WHERE created_at<datetime('now','-2 days')").run().catch(()=>null);
  await db.prepare("DELETE FROM tenant_password_reset_tokens WHERE created_at<datetime('now','-7 days')").run().catch(()=>null);

  const admin=await db.prepare(`SELECT u.id user_id,u.email,t.id tenant_id,t.name tenant_name,t.slug tenant_slug
    FROM users u JOIN tenant_members tm ON tm.user_id=u.id AND tm.role='admin' AND tm.status='active'
    JOIN tenants t ON t.id=tm.tenant_id AND t.status='active'
    JOIN staff_credentials c ON c.user_id=u.id
    WHERE lower(u.email)=lower(?) AND lower(t.slug)=lower(?) LIMIT 1`)
    .bind(email,tenantSlug).first<{user_id:string;email:string;tenant_id:string;tenant_name:string;tenant_slug:string}>();
  if(!admin)return {matched:false as const};

  const rawToken=randomToken(),tokenHash=await sha256(rawToken),id=`pwreset-${crypto.randomUUID()}`;
  const expiresAt=new Date(Date.now()+RESET_TTL_MS).toISOString();
  await db.batch([
    db.prepare("UPDATE tenant_password_reset_tokens SET consumed_at=CURRENT_TIMESTAMP WHERE user_id=? AND tenant_id=? AND consumed_at IS NULL").bind(admin.user_id,admin.tenant_id),
    db.prepare("INSERT INTO tenant_password_reset_tokens(id,user_id,tenant_id,token_hash,expires_at,requested_ip_hash) VALUES(?,?,?,?,?,?)").bind(id,admin.user_id,admin.tenant_id,tokenHash,expiresAt,ipHash),
  ]);
  return {matched:true as const,id,rawToken,expiresAt,...admin};
}

export async function invalidateTenantPasswordReset(db:D1Database,id:string){
  await db.prepare("UPDATE tenant_password_reset_tokens SET consumed_at=COALESCE(consumed_at,CURRENT_TIMESTAMP) WHERE id=?").bind(id).run();
}

export async function resetTenantAdminPassword(db:D1Database,args:{token:string;password:string}){
  const token=args.token.trim().toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(token))throw new Error("This password reset link is invalid or has expired.");
  if(args.password.length<10)throw new Error("Password must be at least 10 characters");
  if(args.password.length>256)throw new Error("Password is too long");
  const tokenHash=await sha256(token);
  const row=await db.prepare(`SELECT r.id,r.user_id,r.tenant_id,u.email,t.name tenant_name,t.slug tenant_slug
    FROM tenant_password_reset_tokens r
    JOIN users u ON u.id=r.user_id
    JOIN tenants t ON t.id=r.tenant_id AND t.status='active'
    JOIN tenant_members tm ON tm.tenant_id=r.tenant_id AND tm.user_id=r.user_id AND tm.role='admin' AND tm.status='active'
    WHERE r.token_hash=? AND r.consumed_at IS NULL AND datetime(r.expires_at)>CURRENT_TIMESTAMP LIMIT 1`)
    .bind(tokenHash).first<{id:string;user_id:string;tenant_id:string;email:string;tenant_name:string;tenant_slug:string}>();
  if(!row)throw new Error("This password reset link is invalid or has expired.");
  const passwordHash=await hashSecret(args.password);
  await db.batch([
    db.prepare("UPDATE staff_credentials SET password_hash=?,failed_attempts=0,locked_until=NULL,updated_at=CURRENT_TIMESTAMP WHERE user_id=?").bind(passwordHash,row.user_id),
    db.prepare("UPDATE tenant_password_reset_tokens SET consumed_at=CURRENT_TIMESTAMP WHERE user_id=? AND tenant_id=? AND consumed_at IS NULL").bind(row.user_id,row.tenant_id),
    db.prepare("DELETE FROM staff_sessions WHERE user_id=? AND tenant_id=?").bind(row.user_id,row.tenant_id),
    db.prepare("INSERT INTO audit_logs (id,actor_user_id,action,entity_type,entity_id,detail_json) VALUES (?,?, 'tenant.password_reset','tenant',?,?)").bind(`audit-${crypto.randomUUID()}`,row.user_id,row.tenant_id,JSON.stringify({email:row.email,tenantSlug:row.tenant_slug})),
  ]);
  return row;
}
