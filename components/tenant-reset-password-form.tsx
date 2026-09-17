"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export function TenantResetPasswordForm(){
  const [token,setToken]=useState("");
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [status,setStatus]=useState("");
  const [done,setDone]=useState(false);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{const value=new URLSearchParams(window.location.search).get("token")||"";setToken(value);if(!value)setStatus("This password reset link is invalid or incomplete.");},[]);
  async function submit(e:React.FormEvent){
    e.preventDefault();setStatus("");
    if(!token){setStatus("This password reset link is invalid or incomplete.");return;}
    if(password!==confirm){setStatus("Passwords do not match.");return;}
    setBusy(true);
    const res=await fetch("/api/auth/tenant/reset-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,password})});
    const body=await res.json().catch(()=>({})) as {message?:string;error?:string};
    setBusy(false);
    if(!res.ok){setStatus(body.error||"Password reset failed.");return;}
    setDone(true);setStatus(body.message||"Password updated.");setPassword("");setConfirm("");
  }
  return <form className="adminLoginCard" onSubmit={submit}>
    <div className="eyebrow">Tenant administration</div><h1>Choose a new password</h1>
    <p>The reset link expires after 30 minutes and can be used only once. Completing the reset signs out existing Tenant Admin sessions.</p>
    {!done&&<><label>New password<input required minLength={10} maxLength={256} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 10 characters"/></label>
    <label>Confirm new password<input required minLength={10} maxLength={256} type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
    <button className="button primary" type="submit" disabled={busy||!token}>{busy?"Updating…":"Update password"}</button></>}
    {status&&<div className="formStatus">{status}</div>}
    <div className="sourceHint"><Link href="/admin/login">{done?"Sign in with the new password":"Back to Tenant Admin sign in"}</Link></div>
  </form>;
}
