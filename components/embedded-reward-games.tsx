"use client";
import {useMemo,useState} from "react";

function shuffle<T>(values:T[]){const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out;}

const MEMORY_THEMES:{[key:string]:string[]}={
  "memory-garden":["🌻","🍀","🍓","🦋","🌈","🐝"],
  "memory-space":["🚀","🪐","⭐","🌙","👾","🛰️"]
};
function MemoryGame({gameKey}:{gameKey:string}){
  const icons=MEMORY_THEMES[gameKey]||MEMORY_THEMES["memory-garden"];
  const [cards]=useState(()=>shuffle([...icons,...icons].map((icon,i)=>({id:i,icon}))));
  const [open,setOpen]=useState<number[]>([]),[matched,setMatched]=useState<number[]>([]),[moves,setMoves]=useState(0);
  const locked=open.length>=2;
  function pick(index:number){
    if(locked||open.includes(index)||matched.includes(index))return;
    const next=[...open,index];setOpen(next);
    if(next.length===2){setMoves(v=>v+1);const[a,b]=next;if(cards[a].icon===cards[b].icon){window.setTimeout(()=>{setMatched(v=>[...v,a,b]);setOpen([])},320)}else window.setTimeout(()=>setOpen([]),650)}
  }
  return <div className="embeddedMiniGame"><div className="miniGameScore"><strong>{matched.length===cards.length?"All pairs found!":"Find every matching pair"}</strong><span>{moves} moves</span></div><div className="memoryGrid">{cards.map((card,i)=>{const shown=open.includes(i)||matched.includes(i);return <button key={card.id} className={shown?"memoryCard shown":"memoryCard"} onClick={()=>pick(i)} aria-label={shown?`Card ${card.icon}`:"Hidden card"}>{shown?card.icon:"?"}</button>})}</div>{matched.length===cards.length&&<button className="button secondary" onClick={()=>window.location.reload()}>Play another board</button>}</div>;
}

type MathQuestion={prompt:string;answer:number;options:number[]};
function makeMath(hard:boolean):MathQuestion{
  const a=hard?5+Math.floor(Math.random()*46):1+Math.floor(Math.random()*20),b=hard?2+Math.floor(Math.random()*20):1+Math.floor(Math.random()*12),multiply=hard&&Math.random()>.55;
  const answer=multiply?a*b:a+b,prompt=multiply?`${a} × ${b}`:`${a} + ${b}`;
  const candidates=new Set<number>([answer]);while(candidates.size<4){const spread=hard?12:7,candidate=Math.max(0,answer+Math.floor(Math.random()*(spread*2+1))-spread);candidates.add(candidate)}
  return {prompt,answer,options:shuffle([...candidates])};
}
function MathGame({hard}:{hard:boolean}){
  const [q,setQ]=useState(()=>makeMath(hard)),[score,setScore]=useState(0),[streak,setStreak]=useState(0),[message,setMessage]=useState("Choose the correct answer.");
  function answer(value:number){if(value===q.answer){setScore(v=>v+10+Math.min(20,streak*2));setStreak(v=>v+1);setMessage("Correct! Keep going.");setQ(makeMath(hard))}else{setStreak(0);setMessage("Try again — you can do it.")}}
  return <div className="embeddedMiniGame mathMiniGame"><div className="miniGameScore"><strong>Score {score}</strong><span>Streak {streak}</span></div><div className="mathPrompt">{q.prompt}</div><div className="mathOptions">{q.options.map(v=><button key={v} onClick={()=>answer(v)}>{v}</button>)}</div><p className="miniGameMessage">{message}</p></div>;
}

const WORDS=["astute","fragile","jubilant","timid","profound","fierce","delicate","harmless","perceptive","exquisite","nervous","diminish"];
function scrambled(word:string){let out=word;for(let i=0;i<6&&out===word;i++)out=shuffle(word.split("")).join("");return out;}
function makeWordRound(){const target=WORDS[Math.floor(Math.random()*WORDS.length)];return {target,scramble:scrambled(target),options:shuffle([target,...shuffle(WORDS.filter(w=>w!==target)).slice(0,3)])};}
function WordGame({choiceMode}:{choiceMode:boolean}){
  const [round,setRound]=useState(makeWordRound),[score,setScore]=useState(0),[message,setMessage]=useState(choiceMode?"Pick the word that matches the letter pattern.":"Unscramble the word.");
  function choose(word:string){if(word===round.target){setScore(v=>v+10);setMessage("Correct!");setRound(makeWordRound())}else setMessage("Not quite. Try another option.")}
  const hint=useMemo(()=>choiceMode?`Starts with “${round.target[0]}” · ${round.target.length} letters`:`${round.target.length} letters`,[choiceMode,round]);
  return <div className="embeddedMiniGame wordMiniGame"><div className="miniGameScore"><strong>Score {score}</strong><span>{hint}</span></div><div className="wordScramble">{round.scramble.toUpperCase()}</div><div className="wordOptions">{round.options.map(w=><button key={w} onClick={()=>choose(w)}>{w}</button>)}</div><p className="miniGameMessage">{message}</p></div>;
}

function ReactionGame({fast}:{fast:boolean}){
  const cells=fast?20:16,[target,setTarget]=useState(()=>Math.floor(Math.random()*cells)),[score,setScore]=useState(0),[misses,setMisses]=useState(0);
  function tap(index:number){if(index===target){setScore(v=>v+1);let next=index;while(next===index)next=Math.floor(Math.random()*cells);setTarget(next)}else setMisses(v=>v+1)}
  return <div className="embeddedMiniGame"><div className="miniGameScore"><strong>Score {score}</strong><span>{misses} misses</span></div><p className="miniGameMessage">Tap the glowing target as quickly as you can.</p><div className={fast?"reactionGrid fast":"reactionGrid"}>{Array.from({length:cells},(_,i)=><button key={i} className={i===target?"target":""} onClick={()=>tap(i)} aria-label={i===target?"Target":"Empty cell"}>{i===target?"★":""}</button>)}</div></div>;
}

export function EmbeddedRewardGame({gameKey}:{gameKey:string}){
  if(gameKey.startsWith("memory-"))return <MemoryGame gameKey={gameKey}/>;
  if(gameKey==="quick-math"||gameKey==="number-sprint")return <MathGame hard={gameKey==="number-sprint"}/>;
  if(gameKey==="word-scramble"||gameKey==="word-choice")return <WordGame choiceMode={gameKey==="word-choice"}/>;
  if(gameKey==="reaction-grid"||gameKey==="reaction-sprint")return <ReactionGame fast={gameKey==="reaction-sprint"}/>;
  return <div className="emptyState">This reward game is unavailable.</div>;
}
