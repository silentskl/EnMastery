"use client";
import {useEffect,useRef,useState} from "react";
import {usePathname} from "next/navigation";

type Reward={id:string;reward_date:string;source_type:string;source_id:string;source_label:string;unlocked_at:string};
type RewardState={available:number;rewards:Reward[]};

export function DailyGameReward(){
  const pathname=usePathname(),[state,setState]=useState<RewardState>({available:0,rewards:[]}),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),initial=useRef(false),previous=useRef(0);
  async function refresh(autoOpen=false){
    if(pathname.startsWith("/admin")||pathname.startsWith("/platform"))return;
    try{const r=await fetch("/api/student/rewards",{cache:"no-store"});if(!r.ok)return;const b=await r.json() as RewardState;setState(b);if(initial.current&&(b.available>previous.current||autoOpen&&b.available>0))setOpen(true);previous.current=b.available;initial.current=true}catch{}
  }
  useEffect(()=>{void refresh();const onFocus=()=>void refresh();const onUnlocked=()=>void refresh(true);window.addEventListener("focus",onFocus);window.addEventListener("daily-game-reward-unlocked",onUnlocked);const id=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh()},12000);return()=>{window.removeEventListener("focus",onFocus);window.removeEventListener("daily-game-reward-unlocked",onUnlocked);window.clearInterval(id)}},[pathname]);
  async function play(rewardId:string){
    setBusy(true);setError("");
    const gameWindow=window.open("about:blank","_blank");
    try{const r=await fetch("/api/student/rewards/play",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rewardId})}),b=await r.json() as {error?:string;maxMinutes?:number;game?:{name:string;url:string}};if(!r.ok||!b.game)throw new Error(b.error||"Could not open reward game");if(gameWindow){gameWindow.opener=null;gameWindow.location.replace(b.game.url);const limit=Math.max(1,Number(b.maxMinutes||10));window.setTimeout(()=>{try{if(!gameWindow.closed)gameWindow.close()}catch{}},limit*60*1000)}else window.location.assign(b.game.url);await refresh();if(state.available<=1)setOpen(false)}catch(e){if(gameWindow)gameWindow.close();setError(e instanceof Error?e.message:"Could not open reward game")}finally{setBusy(false)}
  }
  if(pathname.startsWith("/admin")||pathname.startsWith("/platform"))return null;
  return <><button className={state.available?"rewardTopButton rewardReady":"rewardTopButton"} onClick={()=>setOpen(true)} aria-label={`${state.available} game rewards available`}><span>🎮</span><b>{state.available}</b></button>{open&&<div className="rewardModalBackdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)setOpen(false)}}><section className="rewardModal" role="dialog" aria-modal="true" aria-labelledby="reward-title"><button className="rewardClose" onClick={()=>setOpen(false)} aria-label="Close">×</button><span className="eyebrow">Daily reward</span><h2 id="reward-title">Nice work — game time unlocked!</h2><p>Complete all of today’s required Listening, Speaking, Reading, Writing (when scheduled) and Vocabulary learning to unlock game time. Your Tenant Admin controls the daily time limit.</p>{state.rewards.length?<div className="rewardList">{state.rewards.map((reward,index)=><article className="rewardItem" key={reward.id}><div><strong>Reward {index+1}</strong><span>{reward.source_label}</span></div><button className="button primary" disabled={busy} onClick={()=>void play(reward.id)}>{busy?"Opening…":"Play one game"}</button></article>)}</div>:<div className="emptyState">Finish all required Daily Learning tasks — Listening, Speaking, Reading, Writing when scheduled, and Vocabulary — to unlock game time.</div>}{error&&<div className="notice warnNotice">{error}</div>}<p className="rewardExternalNote">Games open on Poki in a new tab. Poki hosts the games and controls its own content, advertising and privacy experience. A reward is consumed when the game is launched. The game tab is automatically closed when the Tenant-configured time limit is reached.</p></section></div>}</>
}
