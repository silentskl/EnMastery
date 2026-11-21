"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { DailyActivityType, DailyGoalProgress } from "@/lib/student/daily-goal";

const items: Array<{key:DailyActivityType;label:string;href:string}> = [
  {key:"conversation",label:"Conversation",href:"/oral/conversation"},
  {key:"roleplay",label:"Role Play",href:"/oral/roleplay"},
  {key:"reading_aloud",label:"Reading Aloud",href:"/oral/reading-aloud"},
  {key:"listening",label:"Listening",href:"/learn/listen"},
];
function clock(seconds:number) {
  const n=Math.max(0,Math.floor(seconds));
  return Math.floor(n/60)+":"+String(n%60).padStart(2,"0");
}

export function DailyGoalPanel(){
  const pathname=usePathname();
  const [progress,setProgress]=useState<DailyGoalProgress|null>(null);
  const [pending,setPending]=useState<{date:string;seconds:number}|null>(null);
  const [signedOut,setSignedOut]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    let alive=true;
    async function refresh(){
      try{
        const response=await fetch("/api/student/daily-goal",{cache:"no-store"});
        if(!alive)return;
        if(response.status===401||response.status===403){setSignedOut(true);setProgress(null);return}
        if(!response.ok)throw new Error("Daily learning progress is temporarily unavailable");
        const data=await response.json() as DailyGoalProgress;
        if(alive){setProgress(data);setSignedOut(false);setError("")}
      }catch(e){if(alive)setError(e instanceof Error?e.message:"Could not load daily goal")}
    }
    void refresh();
    const interval=setInterval(()=>void refresh(),15_000);
    const onVisible=()=>{if(document.visibilityState==="visible")void refresh()};
    const onUpdated=(event:Event)=>{
      const updated=(event as CustomEvent<DailyGoalProgress>).detail;
      if(updated?.date)setProgress(previous=>previous?.date===updated.date&&previous.activeSeconds>updated.activeSeconds?previous:updated);
      else void refresh();
    };
    const onTick=(event:Event)=>{
      const next=(event as CustomEvent<{date:string;pendingSeconds:number}>).detail;
      if(next?.date)setPending({date:next.date,seconds:next.pendingSeconds||0});
    };
    document.addEventListener("visibilitychange",onVisible);
    window.addEventListener("em:daily-goal-updated",onUpdated);
    window.addEventListener("em:study-tick",onTick);
    return()=>{alive=false;clearInterval(interval);
      document.removeEventListener("visibilitychange",onVisible);
      window.removeEventListener("em:daily-goal-updated",onUpdated);
      window.removeEventListener("em:study-tick",onTick)};
  },[pathname]);
  if(signedOut) return <div className="dailyGoalBar" role="status">
    <strong>Daily English goal · 30 minutes</strong>
    <span>Sign in as a student to save your study time and completed activities.</span>
    <Link href="/account">Student sign-in</Link>
  </div>;
  if(!progress) return error?<div className="dailyGoalBar" role="status">{error}</div>:null;
  const visibleSeconds=progress.activeSeconds+(pending?.date===progress.date?pending.seconds:0);
  const pct=Math.min(100,Math.round(visibleSeconds/progress.targetSeconds*100));
  const remaining=Math.max(0,progress.targetSeconds-visibleSeconds);
  return <section className={"dailyGoalPanel"+(progress.completed?" achieved":"")} aria-label="Today's learning goal">
    <div className="dailyGoalHeading">
      <div><strong>Today's English goal</strong> <span className="sourceHint">Singapore time · {progress.date}</span></div>
      <strong className={progress.completed?"dailyGoalDone":""}>{progress.completed?"✓ Daily goal complete":progress.tasksCompleted+"/"+progress.tasksRequired+" activities · "+clock(visibleSeconds)+" / 30:00"}</strong>
    </div>
    <div className="dailyGoalTrack" role="progressbar" aria-label="Active study time" aria-valuemin={0} aria-valuemax={1800} aria-valuenow={Math.min(1800,visibleSeconds)}>
      <span style={{width:pct+"%"}}/>
    </div>
    <div className="dailyGoalDetails">
      <span className={progress.timeCompleted?"met":""}>{progress.timeCompleted?"✓ 30 minutes complete":"⏱ "+clock(remaining)+" study time left"}</span>
      {items.map(({key,label,href})=>{
        const count=progress.counts[key],target=progress.targets[key],done=count>=target;
        return <Link key={key} href={href} className={"dailyGoalStep"+(done?" met":"")}>
          {done?"✓":"○"} {label} {Math.min(count,target)}/{target}
        </Link>;
      })}
    </div>
  </section>;
}
