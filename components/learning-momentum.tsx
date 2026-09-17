"use client";
import {useEffect,useMemo,useState} from "react";
import {fetchStudentProgressCalendar,type StudentProgressCalendar} from "@/lib/client/progress-calendar";

type Dash={xp:number};
type Skills={domains:Array<{key:string;label:string;mastery:number;evidenceCount:number}>};
type Cal=StudentProgressCalendar;
type CoreData={cal:Cal};

function ProgressRing({value,label,sub,tone}:{value:number;label:string;sub:string;tone:"blue"|"green"}){
 const pct=Math.max(0,Math.min(100,Math.round(value))),radius=48,circumference=2*Math.PI*radius,offset=circumference*(1-pct/100);
 return <div className={`momentumRingSvg ${tone}`} aria-label={`${label}: ${pct}%`}>
  <svg viewBox="0 0 120 120" role="img" aria-hidden="true">
   <circle className="ringTrack" cx="60" cy="60" r={radius}/>
   <circle className="ringValue" cx="60" cy="60" r={radius} strokeDasharray={circumference} strokeDashoffset={offset}/>
  </svg>
  <div className="ringCenter"><strong>{pct}%</strong><span>{label}</span><small>{sub}</small></div>
 </div>
}

export function LearningMomentum(){
 const[core,setCore]=useState<CoreData|null>(null),[dash,setDash]=useState<Dash|null>(null),[skills,setSkills]=useState<Skills|null>(null),[coreError,setCoreError]=useState("");
 useEffect(()=>{let active=true;const month=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Singapore",year:"numeric",month:"2-digit"}).format(new Date());
  // Hotfix 11.5: do not call /api/student/plan here. StudentPlan owns mission
  // materialisation; momentum consumes the read-only calendar aggregate only.
  fetchStudentProgressCalendar(month).then(cal=>{if(active){setCore({cal});setCoreError("")}}).catch(e=>{if(active)setCoreError(e instanceof Error?e.message:"Unknown daily completion error")});
  fetch("/api/student/dashboard",{cache:"no-store"}).then(async r=>r.ok?r.json() as Promise<Dash>:null).then(v=>{if(active&&v)setDash(v)}).catch(()=>undefined);
  fetch("/api/student/skills/overview",{cache:"no-store"}).then(async r=>r.ok?r.json() as Promise<Skills>:null).then(v=>{if(active&&v)setSkills(v)}).catch(()=>undefined);
  return()=>{active=false}
 },[]);
 const summary=useMemo(()=>{if(!core)return null;const today=core.cal.days.find(d=>d.date===core.cal.today),done=today?.done||0,total=today?.total||0,assignedDays=core.cal.days.filter(d=>d.total>0),perfect=assignedDays.filter(d=>d.percent===100).length,monthRate=assignedDays.length?Math.round(assignedDays.reduce((n,d)=>n+d.percent,0)/assignedDays.length):0;return{done,total,perfect,assigned:assignedDays.length,monthRate}},[core]);
 if(coreError&&!core)return <section className="card momentumCard"><div className="emptyState"><strong>Daily completion is temporarily unavailable.</strong><div className="queueError">{coreError}</div></div></section>;
 if(!core||!summary)return <section className="card momentumCard"><div className="emptyState">Loading today&apos;s and monthly completion…</div></section>;
 const todayPct=summary.total?summary.done*100/summary.total:0;
 return <section className="card momentumCard">
  <div className="momentumHeader"><div><div className="activityKicker">Learning momentum</div><h2>Keep the streak moving.</h2><p>See today&apos;s completion and your monthly consistency at a glance.</p></div><div className="momentumBadges"><span className="rewardBadge fire">🔥 <b>{core.cal.streak||0}</b> day streak</span>{dash&&<span className="rewardBadge xpBadge">★ <b>{dash.xp}</b> XP</span>}</div></div>
  <div className={`momentumGrid ${skills?"":"ringsOnly"}`}>
   <div className="momentumRings" aria-label="Completion progress">
    <ProgressRing value={todayPct} label="Today's completion" sub={`${summary.done}/${summary.total||0} tasks passed`} tone="blue"/>
    <ProgressRing value={summary.monthRate} label="Monthly completion" sub={`${summary.perfect}/${summary.assigned} perfect days`} tone="green"/>
   </div>
   {skills&&<div className="skillMomentum"><div className="skillMomentumTitle"><strong>Skill mastery</strong><span>Based on assessed evidence</span></div>{skills.domains.map(d=><div className="skillMomentumRow" key={d.key}><div><strong>{d.label}</strong><small>{d.evidenceCount?`${d.evidenceCount} evidence points`:"Not assessed yet"}</small></div><div className="skillMomentumBar"><span className={`skillTone ${d.key}`} style={{width:`${Math.max(0,Math.min(100,d.mastery||0))}%`}}/></div><b>{d.evidenceCount?`${Math.round(d.mastery)}%`:"—"}</b></div>)}</div>}
  </div>
 </section>;
}
