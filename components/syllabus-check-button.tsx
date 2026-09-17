"use client";
import { useState } from "react";

type SyllabusCheckResult = {
  ok?: boolean;
};

type SyllabusCheckResponse = {
  error?: string;
  results?: SyllabusCheckResult[];
};

export function SyllabusCheckButton(){
  const [state,setState]=useState<"idle"|"running"|"done"|"error">("idle");
  const [summary,setSummary]=useState("");
  async function run(){
    setState("running"); setSummary("");
    try{
      const response=await fetch("/api/syllabus/check",{method:"POST"});
      const body = (await response.json()) as SyllabusCheckResponse;
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      const results = Array.isArray(body.results) ? body.results : [];
      const ok = results.filter((item) => item.ok === true).length;
      const failed = results.length - ok;
      setSummary(`${ok} sources checked${failed?`, ${failed} failed`:""}. Scheduled Worker persists change events and sends alerts.`);
      setState("done");
    }catch(e){setSummary(e instanceof Error?e.message:"Check failed");setState("error");}
  }
  return <div style={{display:"grid",gap:6,justifyItems:"end"}}><button className="button primary" onClick={run} disabled={state==="running"}>{state==="running"?"Checking…":"Run check"}</button>{summary&&<small style={{maxWidth:340,color:state==="error"?"var(--danger)":"var(--muted)",textAlign:"right"}}>{summary}</small>}</div>;
}
