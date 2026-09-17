"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function TenantLoginForm(){
  const router=useRouter();
  const [tenantSlug,setTenantSlug]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [status,setStatus]=useState("");
  async function submit(e:React.FormEvent){
    e.preventDefault();setStatus("Signing in…");
    const res=await fetch("/api/admin/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tenantSlug,email,password})});
    const body=await res.json().catch(()=>({})) as {error?:string};
    if(!res.ok){setStatus(body.error||"Sign-in failed");return;}
    router.replace("/admin");router.refresh();
  }
  return <form className="adminLoginCard" onSubmit={submit}>
    <div className="eyebrow">Tenant administration</div><h1>English Mastery Admin</h1>
    <p>This Tenant Admin account manages students, private learning resources, courses, practice and assignments.</p>
    <label>Tenant slug<input required value={tenantSlug} onChange={e=>setTenantSlug(e.target.value)} autoComplete="organization" placeholder="e.g. bright-stars"/></label>
    <label>Admin email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username"/></label>
    <label>Password<input required type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></label>
    <div className="sourceHint"><Link href="/admin/forgot-password">Forgot password? Reset it by email</Link></div>
    <button className="button primary" type="submit">Sign in as Admin</button>{status&&<div className="formStatus">{status}</div>}
  </form>;
}
