"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ProgressBar } from "@/components/ui";

type Domain = {
  key:"listen"|"speak"|"read"|"write";
  label:string;
  icon:string;
  learnDetail:string;
  practiceDetail:string;
  learnHref:string;
  practiceHref:string;
  learnCount:number;
  practiceCount:number;
  practiceUnit:string;
  mastery:number;
  evidenceCount:number;
  skillCount:number;
};
type Overview = { level:string; domains:Domain[] };

export function FourSkillHub({ mode }:{ mode:"learn"|"practice" }) {
  const [data,setData]=useState<Overview|null>(null);
  useEffect(()=>{let active=true;void fetch("/api/student/skills/overview").then(async r=>r.ok?await r.json() as Overview:null).then(v=>{if(active)setData(v)}).catch(()=>{if(active)setData(null)});return()=>{active=false};},[]);
  if(!data)return <div className="emptyState">Loading your four-skill profile…</div>;
  return <div className="domainGrid">{data.domains.map(d=>{
    const href=mode==="learn"?d.learnHref:d.practiceHref;
    const detail=mode==="learn"?d.learnDetail:d.practiceDetail;
    const count=mode==="learn"?`${d.learnCount} lessons`:`${d.practiceCount} ${d.practiceUnit}`;
    return <Link className="domainCard fourSkillCard" href={href} key={d.key}>
      <div className="domainIcon">{d.icon}</div>
      <div>
        <div className="skillCardTitle"><h2>{d.label}</h2><span>{count}</span></div>
        <p>{detail}</p>
        <div style={{marginTop:12}}><ProgressBar value={Math.round(d.mastery)}/></div>
      </div>
      <div className="domainMastery"><strong>{d.evidenceCount?`${Math.round(d.mastery)}%`:"—"}</strong><span>{d.evidenceCount?"mastery":"not assessed"}</span></div>
    </Link>;
  })}</div>;
}
