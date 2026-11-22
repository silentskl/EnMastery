"use client";
import { useEffect, useRef } from "react";

export type OralSetupIssue = "permission" | "device" | "unsupported" | "speech";
export function microphoneIssue(error:unknown):OralSetupIssue {
  const name=error instanceof Error?error.name:"";
  if(["NotAllowedError","PermissionDeniedError","SecurityError"].includes(name))return "permission";
  if(["NotFoundError","DevicesNotFoundError","NotReadableError","TrackStartError","OverconstrainedError"].includes(name))return "device";
  return "unsupported";
}
export function OralSetupDialog({issue,onClose,onRetry}:{issue:OralSetupIssue|null;onClose:()=>void;onRetry:()=>void}){
  const dismissRef=useRef<HTMLButtonElement|null>(null);
  useEffect(()=>{if(issue)dismissRef.current?.focus()},[issue]);
  if(!issue)return null;
  const details={
    permission:{
      title:"Microphone permission required",
      message:"Your browser or Android system has blocked microphone access. EnMastery cannot change device settings for you.",
      help:"Android: Settings → Apps → Chrome (or your current browser) → Permissions → Microphone → Allow. Also open this site's browser settings and allow Microphone for study.wisewavesg.com. Return and tap Retry. If opened inside another app, try opening this page directly in Chrome.",
    },
    device:{
      title:"Microphone is not available",
      message:"The browser could not find or access a working microphone.",
      help:"Check that your microphone is connected, another app is not using it, and Android's microphone access is enabled. Return and tap Retry.",
    },
    unsupported:{
      title:"This browser cannot start audio recording",
      message:"A secure browser with microphone recording support is required.",
      help:"Open study.wisewavesg.com directly in an up-to-date Chrome browser and check the site's microphone permission. If recording still fails, contact the administrator.",
    },
    speech:{
      title:"Speech recognition / assessment is unavailable",
      message:"Microphone access and speech transcription are different things. A recording alone cannot produce a reliable Reading Aloud score.",
      help:"Open the page directly in Chrome and try again. If browser speech recognition is unavailable, an administrator must configure ModelBridge server STT or Azure Speech pronunciation assessment for this organisation. Changing microphone permissions alone will not fix missing speech services.",
    },
  }[issue];
  return <div className="oralSetupBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <section role="dialog" aria-modal="true" aria-labelledby="oral-setup-title" aria-describedby="oral-setup-description" className="oralSetupDialog">
      <h2 id="oral-setup-title">{details.title}</h2>
      <p id="oral-setup-description">{details.message}</p>
      <p>{details.help}</p>
      <div className="rowActions">
        <button type="button" className="button primary" onClick={onRetry}>{issue==="speech"?"Reload and check again":"Retry microphone"}</button>
        <button type="button" ref={dismissRef} className="button ghost" onClick={onClose}>Close</button>
      </div>
    </section>
  </div>;
}
