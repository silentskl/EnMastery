"use client";
import Link from "next/link";
import { useState } from "react";

export function TenantForgotPasswordForm(){
  const [tenantSlug,setTenantSlug]=useState("");
  const [email,setEmail]=useState("");
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setStatus("Sending reset instructions…");
    const res=await fetch("/api/auth/tenant/forgot-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tenantSlug,email})});
    const body=await res.json().catch(()=>({})) as {message?:string;error?:string};
    setBusy(false);setStatus(res.ok?(body.message||"Check your email for reset instructions."):(body.error||"Could not request a password reset."));
  }
  return <form className="adminLoginCard" onSubmit={submit}>
    <div className="eyebrow">Tenant administration</div><h1>Reset Admin password</h1>
    <p>Enter the organisation slug and Tenant Admin email. If the account exists, we will email a one-time password reset link.</p>
    <label>Tenant slug<input required value={tenantSlug} onChange={e=>setTenantSlug(e.target.value)} autoComplete="organization" placeholder="e.g. bright-stars"/></label>
    <label>Admin email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
    <button className="button primary" type="submit" disabled={busy}>{busy?"Sending…":"Send reset email"}</button>
    {status&&<div className="formStatus">{status}</div>}
    <div className="sourceHint"><Link href="/admin/login">Back to Tenant Admin sign in</Link></div>
  </form>;
}
