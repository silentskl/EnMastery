import {connect as netConnect, type Socket as NetSocket} from "node:net";
import {connect as tlsConnect, type TLSSocket} from "node:tls";

export type SmtpSecurity="none"|"starttls"|"tls";
export type SmtpAuth="none"|"login"|"plain";
export type SmtpConfig={host:string;port:number;security:SmtpSecurity;auth:SmtpAuth;username?:string;password?:string;fromEmail:string;fromName?:string};
export type SmtpMessage={to:string[];subject:string;text:string;html?:string};

type SmtpSocket=NetSocket|TLSSocket;
type SmtpResponse={code:number;message:string};

const enc=new TextEncoder();
function cleanHeader(v:string){return v.replace(/[\r\n]+/g," ").trim()}
function b64(v:string){const bytes=enc.encode(v);let out="";for(const b of bytes)out+=String.fromCharCode(b);return btoa(out)}
function subject(v:string){const clean=cleanHeader(v);return /[^\x20-\x7E]/.test(clean)?`=?UTF-8?B?${b64(clean)}?=`:clean}
function mailbox(email:string,name?:string){const e=cleanHeader(email);const n=cleanHeader(name||"");return n?`"${n.replace(/(["\\])/g,"\\$1")}" <${e}>`:`<${e}>`}
function dotStuff(v:string){return v.replace(/\r?\n/g,"\r\n").replace(/(^|\r\n)\./g,"$1..");}
function expect(code:number,actual:number,message:string){if(actual!==code)throw new Error(`SMTP ${actual}: ${message.slice(0,240)}`)}

function waitForSocket(socket:SmtpSocket,event:"connect"|"secureConnect"){
 return new Promise<void>((resolve,reject)=>{
  const onReady=()=>{cleanup();resolve()};
  const onError=(error:Error)=>{cleanup();reject(error)};
  const cleanup=()=>{socket.off(event,onReady);socket.off("error",onError)};
  socket.once(event,onReady);socket.once("error",onError);
 });
}

async function openPlain(host:string,port:number){
 const socket=netConnect({host,port,allowHalfOpen:false});
 await waitForSocket(socket,"connect");
 return socket;
}

async function openTls(host:string,port:number){
 const socket=tlsConnect({host,port,servername:host});
 await waitForSocket(socket,"secureConnect");
 return socket;
}

async function upgradeStartTls(socket:NetSocket,host:string){
 const secure=tlsConnect({socket,servername:host});
 await waitForSocket(secure,"secureConnect");
 return secure;
}

function channel(socket:SmtpSocket){
 let buffer="";
 let pending:{resolve:(value:SmtpResponse)=>void;reject:(reason:Error)=>void}|null=null;
 let terminal:Error|null=null;

 function extract():SmtpResponse|null{
  const match=/(?:^|\r\n)(\d{3}) [^\r\n]*\r\n/.exec(buffer);
  if(!match)return null;
  const end=match.index+match[0].length;
  const message=buffer.slice(0,end).replace(/\r\n$/," ").trimEnd();
  buffer=buffer.slice(end);
  return {code:Number(match[1]),message};
 }
 function pump(){
  if(!pending)return;
  const response=extract();
  if(response){const waiter=pending;pending=null;waiter.resolve(response);return}
  if(terminal){const waiter=pending;pending=null;waiter.reject(terminal)}
 }
 const onData=(chunk:Uint8Array|string)=>{buffer+=typeof chunk==="string"?chunk:new TextDecoder().decode(chunk);pump()};
 const onError=(error:Error)=>{terminal=error;buffer="";pump()};
 const onEnd=()=>{terminal=terminal||new Error("SMTP connection closed unexpectedly");pump()};
 socket.on("data",onData);socket.on("error",onError);socket.on("end",onEnd);

 function readResponse(){
  if(pending)return Promise.reject(new Error("SMTP response read already pending"));
  if(terminal)return Promise.reject(terminal);
  const immediate=extract();if(immediate)return Promise.resolve(immediate);
  return new Promise<SmtpResponse>((resolve,reject)=>{pending={resolve,reject};pump()});
 }
 function write(data:string){
  return new Promise<void>((resolve,reject)=>{
   socket.write(data,(error?:Error|null)=>error?reject(error):resolve());
  });
 }
 async function send(line:string){await write(line+"\r\n");return readResponse()}
 function release(){socket.off("data",onData);socket.off("error",onError);socket.off("end",onEnd);if(pending){pending.reject(new Error("SMTP channel released"));pending=null}}
 return {readResponse,send,release};
}

export async function sendSmtpMail(config:SmtpConfig,message:SmtpMessage){
 if(!config.host.trim())throw new Error("SMTP host is required");
 if(config.port===25)throw new Error("Cloudflare Workers cannot send SMTP through port 25. Use 465 or 587.");
 if(!Number.isInteger(config.port)||config.port<1||config.port>65535)throw new Error("SMTP port is invalid");
 if(!config.fromEmail.includes("@"))throw new Error("SMTP From email is invalid");
 const recipients=[...new Set(message.to.map(x=>x.trim()).filter(x=>x.includes("@")))];if(!recipients.length)throw new Error("At least one recipient is required");
 const host=config.host.trim();
 let socket:SmtpSocket=config.security==="tls"?await openTls(host,config.port):await openPlain(host,config.port);
 let io=channel(socket);let r=await io.readResponse();expect(220,r.code,r.message);
 const ehloHost="english-mastery.local";
 r=await io.send(`EHLO ${ehloHost}`);expect(250,r.code,r.message);
 if(config.security==="starttls"){
  r=await io.send("STARTTLS");expect(220,r.code,r.message);io.release();
  socket=await upgradeStartTls(socket as NetSocket,host);io=channel(socket);
  r=await io.send(`EHLO ${ehloHost}`);expect(250,r.code,r.message);
 }
 if(config.auth!=="none"){
  if(!config.username||!config.password)throw new Error("SMTP username and password are required for authentication");
  if(config.auth==="plain"){r=await io.send(`AUTH PLAIN ${b64(`\0${config.username}\0${config.password}`)}`);expect(235,r.code,r.message)}
  else {r=await io.send("AUTH LOGIN");expect(334,r.code,r.message);r=await io.send(b64(config.username));expect(334,r.code,r.message);r=await io.send(b64(config.password));expect(235,r.code,r.message)}
 }
 r=await io.send(`MAIL FROM:<${cleanHeader(config.fromEmail)}>`);expect(250,r.code,r.message);
 for(const to of recipients){r=await io.send(`RCPT TO:<${cleanHeader(to)}>`);if(r.code!==250&&r.code!==251)throw new Error(`SMTP ${r.code}: ${r.message.slice(0,240)}`)}
 r=await io.send("DATA");expect(354,r.code,r.message);
 const boundary=`em_${crypto.randomUUID().replace(/-/g,"")}`;
 const headers=[`Date: ${new Date().toUTCString()}`,`From: ${mailbox(config.fromEmail,config.fromName)}`,`To: ${recipients.map(x=>`<${cleanHeader(x)}>`).join(", ")}`,`Subject: ${subject(message.subject)}`,"MIME-Version: 1.0"];
 let body:string;
 if(message.html){headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);body=[`--${boundary}`,"Content-Type: text/plain; charset=UTF-8","Content-Transfer-Encoding: 8bit","",message.text,`--${boundary}`,"Content-Type: text/html; charset=UTF-8","Content-Transfer-Encoding: 8bit","",message.html,`--${boundary}--`,""].join("\r\n")}
 else {headers.push("Content-Type: text/plain; charset=UTF-8","Content-Transfer-Encoding: 8bit");body=message.text}
 const payload=dotStuff(headers.join("\r\n")+"\r\n\r\n"+body)+"\r\n.";
 r=await io.send(payload);expect(250,r.code,r.message);
 try{await io.send("QUIT")}catch{}finally{io.release();socket.destroy()}
 return {accepted:recipients.length};
}
