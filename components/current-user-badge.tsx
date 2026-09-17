"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
export function CurrentUserBadge({mode}:{mode:"platform"|"tenant"|"student"}){
 const[name,setName]=useState(mode==="platform"?"Platform Admin":"Account");
 useEffect(()=>{let cancelled=false;(async()=>{try{if(mode==="platform"){const r=await fetch("/api/platform/session",{cache:"no-store"});const x=await r.json() as {authenticated?:boolean};if(!cancelled&&x.authenticated)setName("Platform Admin");return;}if(mode==="tenant"){const r=await fetch("/api/admin/session",{cache:"no-store"});const x=await r.json() as {session?:{displayName?:string|null;email?:string|null}|null};if(!cancelled)setName(x.session?.displayName||x.session?.email||"Tenant Admin");return;}const r=await fetch("/api/auth/me",{cache:"no-store"});const x=await r.json() as {child?:{nickname?:string|null}|null};if(!cancelled)setName(x.child?.nickname||"Student");}catch{}})();return()=>{cancelled=true}},[mode]);
 const href=mode==="platform"?"/platform":mode==="tenant"?"/admin":"/account",initial=(name.trim()[0]||"A").toUpperCase();
 return <Link className="userIdentity" href={href} aria-label={name} title={name}><span className="avatar">{initial}</span><span className="userIdentityName">{name}</span></Link>;
}
