import {sendSmtpMail,type SmtpAuth,type SmtpSecurity} from "./smtp";

type MailEnv={SMTP_ENABLED?:string;SMTP_HOST?:string;SMTP_PORT?:string;SMTP_SECURITY?:string;SMTP_AUTH?:string;SMTP_USERNAME?:string;SMTP_PASSWORD?:string;SMTP_FROM_EMAIL?:string;SMTP_FROM_NAME?:string;SMTP_NOTIFY_TO?:string};
function list(v:string|undefined){return (v||"").split(/[;,]/).map(x=>x.trim()).filter(Boolean)}
export async function sendNotificationEmail(env:MailEnv,args:{to?:string|string[];subject:string;text:string;html?:string}){
 if((env.SMTP_ENABLED||"false").toLowerCase()!=="true")return {sent:false as const,reason:"smtp_disabled"};
 const to=Array.isArray(args.to)?args.to:args.to?list(args.to):list(env.SMTP_NOTIFY_TO);
 const port=Number(env.SMTP_PORT||((env.SMTP_SECURITY||"")==="tls"?465:587));
 const security=(['none','starttls','tls'].includes(env.SMTP_SECURITY||'')?env.SMTP_SECURITY:'starttls') as SmtpSecurity;
 const auth=(['none','login','plain'].includes(env.SMTP_AUTH||'')?env.SMTP_AUTH:'login') as SmtpAuth;
 const result=await sendSmtpMail({host:env.SMTP_HOST||"",port,security,auth,username:env.SMTP_USERNAME,password:env.SMTP_PASSWORD,fromEmail:env.SMTP_FROM_EMAIL||"",fromName:env.SMTP_FROM_NAME||"English Mastery"},{to,subject:args.subject,text:args.text,html:args.html});
 return {sent:true as const,...result};
}
