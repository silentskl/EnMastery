const ITERATIONS = 100_000;
const MAX_PBKDF2_ITERATIONS = 100_000;
const STUDENT_COOKIE = "em_student_session";

export function parseCookie(header: string | null, name: string) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function bytesToHex(bytes: Uint8Array) { return Array.from(bytes).map(b=>b.toString(16).padStart(2,"0")).join(""); }
function hexToBytes(hex:string){const out=new Uint8Array(hex.length/2);for(let i=0;i<out.length;i++)out[i]=parseInt(hex.slice(i*2,i*2+2),16);return out;}
async function sha256(value:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return bytesToHex(new Uint8Array(d));}

export async function hashSecret(secret:string){
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:ITERATIONS},key,256);
  return `pbkdf2$${ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(new Uint8Array(bits))}`;
}

export async function verifySecret(secret:string,encoded:string){
  const [kind,it,saltHex,hashHex]=encoded.split("$"); if(kind!=="pbkdf2"||!it||!saltHex||!hashHex)return false;
  const iterations=Number(it);
  if(!Number.isInteger(iterations)||iterations<1||iterations>MAX_PBKDF2_ITERATIONS)return false;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:hexToBytes(saltHex),iterations},key,256);
  const actual=new Uint8Array(bits),expected=hexToBytes(hashHex);if(actual.length!==expected.length)return false;let diff=0;for(let i=0;i<actual.length;i++)diff|=actual[i]^expected[i];return diff===0;
}

export async function createUserSession(db:D1Database,args:{userId?:string;childId?:string;type:"student";days?:number}){
  const raw=crypto.randomUUID()+crypto.randomUUID().replace(/-/g,"");const tokenHash=await sha256(raw);const id=`session-${crypto.randomUUID()}`;const days=args.days??90;const expires=new Date(Date.now()+days*86400000).toISOString();
  await db.prepare("INSERT INTO user_sessions (id,user_id,child_id,session_type,token_hash,expires_at) VALUES (?,?,?,?,?,?)").bind(id,args.userId||null,args.childId||null,args.type,tokenHash,expires).run();return raw;
}

export async function getUserSession(request:Request,db:D1Database,type:"student"){
  const raw=parseCookie(request.headers.get("cookie"),STUDENT_COOKIE);if(!raw)return null;const tokenHash=await sha256(raw);
  const row=await db.prepare("SELECT id,user_id,child_id,session_type,expires_at FROM user_sessions WHERE token_hash=? AND session_type=? AND expires_at>CURRENT_TIMESTAMP").bind(tokenHash,type).first<{id:string;user_id:string|null;child_id:string|null;session_type:string;expires_at:string}>();
  if(!row)return null;await db.prepare("UPDATE user_sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.id).run().catch(()=>null);return row;
}

export async function deleteUserSession(request:Request,db:D1Database,type:"student"){
  const raw=parseCookie(request.headers.get("cookie"),STUDENT_COOKIE);if(!raw)return;const h=await sha256(raw);await db.prepare("DELETE FROM user_sessions WHERE token_hash=?").bind(h).run();
}

export function studentCookie(raw:string){return `${STUDENT_COOKIE}=${encodeURIComponent(raw)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=7776000`;}
export function clearCookie(name:string){return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;}
export const authCookieNames={student:STUDENT_COOKIE};

export async function isLocked(lockedUntil:string|null|undefined){return Boolean(lockedUntil&&Date.parse(lockedUntil)>Date.now());}
export function lockUntilAfterFailure(failed:number){return failed+1>=8?new Date(Date.now()+15*60_000).toISOString():null;}
