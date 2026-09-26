"use client";
import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {EmbeddedRewardGame} from "@/components/embedded-reward-games";

type GameSession={ok:boolean;rewardId:string;sourceLabel:string;maxMinutes:number;startedAt:string;expiresAt:string;game:{id:string;key:string;name:string;category:string|null}};
function safeReturn(value:string){return value.startsWith("/")&&!value.startsWith("//")&&!value.startsWith("/rewards/game")?value:"/learn";}
function clock(ms:number){const total=Math.max(0,Math.ceil(ms/1000)),m=Math.floor(total/60),s=total%60;return `${m}:${String(s).padStart(2,"0")}`;}

export function RewardGameWorkspace({rewardId,returnTo}:{rewardId:string;returnTo:string}){
  const router=useRouter(),target=useMemo(()=>safeReturn(returnTo),[returnTo]);
  const [session,setSession]=useState<GameSession|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[remaining,setRemaining]=useState(0),[expired,setExpired]=useState(false);
  useEffect(()=>{
    let cancelled=false;
    if(!rewardId){setError("This game reward link is missing its reward ID.");setLoading(false);return;}
    void fetch("/api/student/rewards/play",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rewardId}),cache:"no-store"}).then(async r=>{const b=await r.json() as GameSession&{error?:string};if(!r.ok||!b.game)throw new Error(b.error||"Could not start reward game");if(cancelled)return;setSession(b);const left=Date.parse(b.expiresAt)-Date.now();setRemaining(Math.max(0,left));setExpired(left<=0)}).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:"Could not start reward game")}).finally(()=>{if(!cancelled)setLoading(false)});
    return()=>{cancelled=true};
  },[rewardId]);
  useEffect(()=>{
    if(!session||expired)return;
    const update=()=>{const left=Date.parse(session.expiresAt)-Date.now();setRemaining(Math.max(0,left));if(left<=0)setExpired(true)};update();const id=window.setInterval(update,500);return()=>window.clearInterval(id);
  },[session,expired]);
  function closeGame(){router.replace(target);}
  if(loading)return <section className="rewardGameLoading card"><span className="eyebrow">Daily reward</span><h1>Preparing your game…</h1><p>Your game will stay inside English Mastery.</p></section>;
  if(error||!session)return <section className="rewardGameLoading card"><span className="eyebrow">Daily reward</span><h1>Game unavailable</h1><p>{error||"Could not load this reward game."}</p><button className="button primary" onClick={closeGame}>Return to learning</button></section>;
  return <><section className="rewardGameWorkspace"><header className="rewardGameHeader"><div><span className="eyebrow">Daily reward · {session.game.category||"Game"}</span><h1>{session.game.name}</h1><p>{session.sourceLabel}</p></div><div className="rewardGameControls"><span className={remaining<=60000?"rewardGameTimer urgent":"rewardGameTimer"}>⏱ {clock(remaining)}</span><button className="button ghost" onClick={closeGame}>End game</button></div></header><div className="rewardGameStage">{!expired&&<EmbeddedRewardGame gameKey={session.game.key}/>}</div><p className="rewardGameFootnote">This reward runs inside English Mastery. The session ends automatically when the Tenant-configured game time is used up.</p></section>{expired&&<div className="rewardTimeBackdrop" role="presentation"><section className="rewardTimeDialog" role="alertdialog" aria-modal="true" aria-labelledby="reward-time-title"><div className="rewardTimeIcon">⏰</div><span className="eyebrow">Game time complete</span><h2 id="reward-time-title">Time&apos;s up!</h2><p>Your reward game time for this session has ended. Click Confirm to close the game and return to learning.</p><button className="button primary" autoFocus onClick={closeGame}>Confirm</button></section></div>}</>;
}
