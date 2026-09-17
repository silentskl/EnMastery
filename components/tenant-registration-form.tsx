"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function TenantRegistrationForm(){
  const router=useRouter();
  const [form,setForm]=useState({name:"",slug:"",displayName:"",email:"",password:"",confirm:""});
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault(); setStatus("");
    if(form.password!==form.confirm){setStatus("Passwords do not match.");return;}
    setBusy(true);
    const res=await fetch("/api/auth/tenant/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
    const body=await res.json().catch(()=>({})) as {error?:string;next?:string};
    setBusy(false);
    if(!res.ok){setStatus(body.error||"Registration failed");return;}
    router.replace(body.next||"/admin/settings/integrations"); router.refresh();
  }
  return <form className="adminLoginCard" onSubmit={submit}>
    <div className="eyebrow">Create your learning space</div>
    <h1>Start English Mastery</h1>
    <p>Create your own organisation, configure your ModelBridge account, then add student accounts. Platform learning content is available to your students automatically.</p>
    <label>Organisation name<input required minLength={2} maxLength={120} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Bright Stars Learning"/></label>
    <label>Organisation slug<input required minLength={3} maxLength={48} pattern="[A-Za-z0-9-]+" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} placeholder="bright-stars"/></label>
    <label>Your name<input value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} placeholder="Admin name"/></label>
    <label>Admin email<input required type="email" autoComplete="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    <label>Password<input required minLength={10} type="password" autoComplete="new-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="At least 10 characters"/></label>
    <label>Confirm password<input required minLength={10} type="password" autoComplete="new-password" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})}/></label>
    <button className="button primary" disabled={busy}>{busy?"Creating…":"Create organisation"}</button>
    {status&&<div className="formStatus">{status}</div>}
    <div className="sourceHint">A welcome email will be sent to the Admin email using the platform SMTP configuration. Your ModelBridge API key is not requested here; after registration, enter it under Admin → Settings → Integrations. It is stored as a tenant secret.</div>
  </form>;
}
