"use client";
import {useEffect,useRef,useState} from "react";
import {usePathname,useRouter} from "next/navigation";

type Reward={id:string;reward_date:string;source_type:string;source_id:string;source_label:string;unlocked_at:string};
type RewardState={available:number;rewards:Reward[]};

export function DailyGameReward(){
  const pathname=usePathname(),router=useRouter(),[state,setState]=useState<RewardState>({available:0,rewards:[]}),[open,setOpen]=useState(false),[error,setError]=useState(""),initial=useRef(false),previous=useRef(0);
  async function refresh(autoOpen=false){
    if(pathname.startsWith("/admin")||pathname.startsWith("/platform")||pathname.startsWith("/rewards/game"))return;
    try{const r=await fetch("/api/student/rewards",{cache:"no-store"});if(!r.ok)return;const b=await r.json() as RewardState;setState(b);if(initial.current&&(b.available>previous.current||autoOpen&&b.available>0))setOpen(true);previous.current=b.available;initial.current=true}catch{}
  }
  useEffect(()=>{void refresh();const onFocus=()=>void refresh();const onUnlocked=()=>void refresh(true);window.addEventListener("focus",onFocus);window.addEventListener("daily-game-reward-unlocked",onUnlocked);const id=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh()},12000);return()=>{window.removeEventListener("focus",onFocus);window.removeEventListener("daily-game-reward-unlocked",onUnlocked);window.clearInterval(id)}},[pathname]);
  function play(rewardId:string){setError("");setOpen(false);const returnTo=pathname.startsWith("/")?pathname:"/learn";router.push(`/rewards/game?rewardId=${encodeURIComponent(rewardId)}&returnTo=${encodeURIComponent(returnTo)}`);}
  if(pathname.startsWith("/admin")||pathname.startsWith("/platform")||pathname.startsWith("/rewards/game"))return null;
  return <><button className={state.available?"rewardTopButton rewardReady":"rewardTopButton"} onClick={()=>setOpen(true)} aria-label={`${state.available} game rewards available`}><span>🎮</span><b>{state.available}</b></button>{open&&<div className="rewardModalBackdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)setOpen(false)}}><section className="rewardModal" role="dialog" aria-modal="true" aria-labelledby="reward-title"><button className="rewardClose" onClick={()=>setOpen(false)} aria-label="Close">×</button><span className="eyebrow">Daily reward</span><h2 id="reward-title">Nice work — game time unlocked!</h2><p>Complete all of today’s required Listening, Speaking, Reading, Writing (when scheduled) and Vocabulary learning to unlock game time. Your Tenant Admin controls the daily time limit.</p>{state.rewards.length?<div className="rewardList">{state.rewards.map((reward,index)=><article className="rewardItem" key={reward.id}><div><strong>Reward {index+1}</strong><span>{reward.source_label}</span></div><button className="button primary" onClick={()=>play(reward.id)}>Play one game</button></article>)}</div>:<div className="emptyState">Finish all required Daily Learning tasks — Listening, Speaking, Reading, Writing when scheduled, and Vocabulary — to unlock game time.</div>}{error&&<div className="notice warnNotice">{error}</div>}<p className="rewardExternalNote">Games run inside the English Mastery website in the current tab. When the Tenant-configured time limit is reached, the game stops and a confirmation closes the game page.</p></section></div>}</>;
}
