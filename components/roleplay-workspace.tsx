"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ROLEPLAY_CATEGORIES, ROLEPLAY_SCENARIOS, type RoleplayLevel } from "@/lib/roleplay/scenarios";
import type { ConversationFeedback } from "@/lib/speaking/types";
import { useConversationVoice } from "@/lib/browser/use-conversation-voice";
import { OralSetupDialog } from "@/components/oral-setup-dialog";

type Line={speaker:"learner"|"assistant";text:string};
type Config={authenticated:boolean;serverStt:boolean;serverTts:boolean};
type Phase="first"|"rehearsal"|"ready_final"|"final"|"passed";
type ApiResult={error?:string;sessionId?:string;reply?:string;role?:string;turnCount?:number;phase?:Phase;cycle?:number;completed?:boolean;passed?:boolean;feedback?:ConversationFeedback;overallScore?:number;rehearsalLine?:string;rehearsalIndex?:number;rehearsalTotal?:number};
const defaultId="hawker-order";
function Score({label,amount}:{label:string;amount:number}){return <div className="speechScore"><span>{label}</span><strong>{Math.round(amount)}</strong></div>}

export function RoleplayWorkspace(){
  const [category,setCategory]=useState("all"),[query,setQuery]=useState(""),[showAll,setShowAll]=useState(false);
  const [scenarioId,setScenarioId]=useState(defaultId);
  const [level,setLevel]=useState<RoleplayLevel>("standard");
  const [config,setConfig]=useState<Config|null>(null);
  const [sessionId,setSessionId]=useState(""),[history,setHistory]=useState<Line[]>([]);
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const [feedback,setFeedback]=useState<ConversationFeedback|null>(null);
  const [turnCount,setTurnCount]=useState(0),[finished,setFinished]=useState(false);
  const [phase,setPhase]=useState<Phase>("first"),[cycle,setCycle]=useState(1);
  const [rehearsalLine,setRehearsalLine]=useState(""),[rehearsalIndex,setRehearsalIndex]=useState(0),[rehearsalTotal,setRehearsalTotal]=useState(0);
  const [lastScore,setLastScore]=useState<number|null>(null);
  const sendingRef=useRef(false),scrollRef=useRef<HTMLDivElement|null>(null);
  const voice=useConversationVoice({config,onAutoSubmit:async text=>{await submitMessage(text)}});
  const scene=ROLEPLAY_SCENARIOS.find(s=>s.id===scenarioId)||ROLEPLAY_SCENARIOS[0];
  const list=useMemo(()=>ROLEPLAY_SCENARIOS.filter(s=>(category==="all"||s.category===category)&&(!query.trim()||(s.title+" "+s.setting+" "+s.category).toLowerCase().includes(query.toLowerCase().trim()))),[category,query]);
  const visible=showAll?list:list.slice(0,18);
  const recording=voice.state==="listening";
  const audioBusy=voice.state==="speaking"||voice.state==="transcribing";
  useEffect(()=>{void fetch("/api/student/speaking/config",{cache:"no-store"}).then(r=>r.json()).then(v=>setConfig(v as Config)).catch(()=>setError("Could not load microphone settings."))},[]);
  useEffect(()=>{scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:"smooth"})},[history]);

  function reset(nextId?:string){
    if(busy||recording||audioBusy)return;
    voice.reset();
    if(nextId)setScenarioId(nextId);
    setSessionId("");setHistory([]);setFeedback(null);setFinished(false);setTurnCount(0);setError("");setPhase("first");setCycle(1);setRehearsalLine("");setRehearsalIndex(0);setRehearsalTotal(0);setLastScore(null);
  }
  async function send(body:Record<string,unknown>):Promise<ApiResult>{
    const response=await fetch("/api/student/roleplay",{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",body:JSON.stringify(body)});
    const data=await response.json() as ApiResult;
    if(!response.ok)throw new Error(data.error||"The role-play service could not respond.");
    return data;
  }
  async function begin(){
    if(busy||recording||audioBusy||!scene)return;
    setBusy(true);setError("");
    try{
      const data=await send({action:"start",scenarioId:scene.id,level});
      if(!data.sessionId||!data.reply)throw new Error("Role-play session could not be started.");
      setSessionId(data.sessionId);setHistory([{speaker:"assistant",text:data.reply}]);setFinished(false);setFeedback(null);setTurnCount(0);setPhase("first");setCycle(1);setRehearsalLine("");setLastScore(null);
      // Do not start listening before this entire line has finished playing.
      void voice.play(data.reply,true);
    }catch(err){setError(err instanceof Error?err.message:"Unable to start role-play")}
    finally{setBusy(false)}
  }
  async function submitMessage(message:string){
    const spoken=message.trim();
    if(!sessionId||!spoken||busy||sendingRef.current||finished||phase==="ready_final")return;
    sendingRef.current=true;setBusy(true);setError("");
    try{
      const data=await send({action:phase==="rehearsal"?"rehearse":"reply",sessionId,transcript:spoken});
      if(!data.reply)throw new Error("The role-play partner returned an empty reply.");
      setHistory(v=>[...v,{speaker:"learner",text:spoken},{speaker:"assistant",text:data.reply!}]);
      voice.clearTranscript();
      setPhase(data.phase||phase);
      setCycle(data.cycle||cycle);
      setTurnCount(data.turnCount??turnCount+1);
      setRehearsalLine(data.rehearsalLine||"");
      setRehearsalIndex(data.rehearsalIndex??rehearsalIndex);
      setRehearsalTotal(data.rehearsalTotal??rehearsalTotal);
      // Round two has a fixed character script; don't start recording when
      // the final character line has played and round three awaits a click.
      void voice.play(data.reply,data.phase!=="ready_final");
    }catch(err){setError(err instanceof Error?err.message:"Unable to continue conversation")}
    finally{sendingRef.current=false;setBusy(false)}
  }
  async function finish(){
    if(!sessionId||turnCount<1||busy||sendingRef.current||finished||(phase!=="first"&&phase!=="final"))return;
    voice.reset();setBusy(true);setError("");
    try{
      const data=await send({action:"finish",sessionId});
      if(!data.feedback)throw new Error("Final feedback was not returned.");
      setFeedback(data.feedback);setLastScore(data.overallScore??null);
      setPhase(data.phase||phase);setCycle(data.cycle||cycle);
      setFinished(Boolean(data.passed));
      if(data.phase==="rehearsal"){
        setHistory([{speaker:"assistant",text:data.reply||scene.openingLine}]);
        setTurnCount(0);
        setRehearsalLine(data.rehearsalLine||"");setRehearsalIndex(0);
        setRehearsalTotal(data.rehearsalTotal||0);
        if(data.reply)void voice.play(data.reply,true);
      }else if(data.phase==="first"){
        // A failed independent third round automatically begins a NEW
        // three-stage cycle. Keep feedback visible for reflection.
        setHistory([{speaker:"assistant",text:data.reply||scene.openingLine}]);
        setTurnCount(0);setRehearsalLine("");
      }
    }catch(err){setError(err instanceof Error?err.message:"Unable to finish practice")}
    finally{setBusy(false)}
  }

  async function beginFinal(){
    if(!sessionId||phase!=="ready_final"||busy||sendingRef.current)return;
    voice.reset();setBusy(true);setError("");
    try{
      const data=await send({action:"begin_final",sessionId});
      if(!data.reply||data.phase!=="final")throw new Error("Independent role-play could not start.");
      setPhase("final");setTurnCount(0);setHistory([{speaker:"assistant",text:data.reply}]);
      setRehearsalLine("");setFeedback(null);
      void voice.play(data.reply,true);
    }catch(err){setError(err instanceof Error?err.message:"Unable to begin round three")}
    finally{setBusy(false)}
  }

  return <div className="roleplayWorkspace">
    <OralSetupDialog issue={voice.micIssue} onClose={()=>voice.setMicIssue(null)} onRetry={()=>{const issue=voice.micIssue;voice.setMicIssue(null);if(issue==="speech")window.location.reload();else void voice.startRecording()}} />
    <div className="roleplayChooser card">
      <div className="cardHeader"><h2>Choose a real-life situation</h2><span>{ROLEPLAY_SCENARIOS.length} scenes · {ROLEPLAY_CATEGORIES.length} categories</span></div>
      <p className="muted">Three-stage mastery: 1) talk naturally, 2) read aloud an AI-polished version of your answers in a replay, 3) talk independently again. A final-round score of 90 or more passes; otherwise start another full three-stage cycle.</p>
      <div className="roleplayFilters">
        <input className="textInput" aria-label="Search real-life situations" placeholder="Search a situation, such as hotel or shopping…" value={query} onChange={e=>{setQuery(e.target.value);setShowAll(false)}}/>
        <select className="selectInput" aria-label="Scenario category" value={category} onChange={e=>{setCategory(e.target.value);setShowAll(false)}}>
          <option value="all">All situations</option>{ROLEPLAY_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
      </div>
      <div className="roleplayScenes">{visible.map(s=>{
        const c=ROLEPLAY_CATEGORIES.find(c=>c.id===s.category);
        return <button key={s.id} type="button" className={"roleplayScene"+(scenarioId===s.id?" selected":"")} disabled={busy||recording||audioBusy||Boolean(sessionId&&!finished)} onClick={()=>reset(s.id)}>
          <span>{c?.icon||"💬"} {c?.label}</span><strong>{s.title}</strong><small>{s.setting}</small>
        </button>;
      })}</div>
      {list.length===0&&<div className="emptyState">No matching situations. Try a different search.</div>}
      {!showAll&&list.length>visible.length&&<button className="button ghost" onClick={()=>setShowAll(true)}>Show all {list.length} matching situations</button>}
      {sessionId&&!finished&&<p className="sourceHint">Finish the current conversation before changing the situation.</p>}
    </div>

    <div className="roleplayRoom card">
      <div className="cardHeader"><h2>{scene.title}</h2><span>{scene.aiRole}</span></div>
      <p className="muted"><strong>Your role:</strong> {scene.studentRole} · <strong>Place:</strong> {scene.setting}</p>
      <div className="roleplayGoals"><strong>Ideas to try (optional)</strong><ul>{scene.goals.map(x=><li key={x}>{x}</li>)}</ul></div>
      {!sessionId&&<div className="roleplayStart">
        <label htmlFor="roleplay-level">Difficulty</label>
        <select id="roleplay-level" className="selectInput" value={level} onChange={e=>setLevel(e.target.value as RoleplayLevel)}>
          <option value="beginner">Beginner · gentle prompts</option>
          <option value="standard">Everyday conversation</option>
          <option value="challenge">Challenge · unexpected situations</option>
        </select>
        <button className="button primary" disabled={busy||config?.authenticated===false} onClick={()=>void begin()}>{busy?"Starting…":"Start role-play"}</button>
        {config?.authenticated===false&&<p className="notice warnNotice">Please sign in with a student account to start.</p>}
      </div>}
      {sessionId&&<div className="roleplayLive" aria-live="polite">
        <div className="roleplayStatus">{finished?"Passed · "+(lastScore??0)+"/100":"Cycle "+cycle+" · "+(phase==="first"?"Round 1: free conversation":phase==="rehearsal"?"Round 2: read improved dialogue":phase==="ready_final"?"Round 2 complete":"Round 3: independent conversation")}
          <span>{finished?"Mastery achieved":phase==="rehearsal"?(rehearsalIndex+1)+" / "+rehearsalTotal+" improved responses":phase==="ready_final"?"Ready for the independent round":"90/100 required in round three"}</span></div>
        <div className="roleplayMessages" ref={scrollRef} role="log" aria-label="Role-play conversation history">
          {history.map((line,i)=><div key={i} className={"roleplayMessage "+(line.speaker==="learner"?"learner":"partner")}>
            <strong>{line.speaker==="learner"?"You":scene.aiRole}</strong><p>{line.text}</p>
            {line.speaker==="assistant"&&<button className="roleplayListen" title="Listen to this line" aria-label={"Listen to "+scene.aiRole+" reply"} disabled={recording||busy} onClick={()=>void voice.play(line.text,false)}>🔊 Play</button>}
          </div>)}
        </div>
        {phase==="rehearsal"&&<div className="practiceBox" aria-live="polite">
          <strong>Read this improved reply aloud · {rehearsalIndex+1}/{rehearsalTotal}</strong>
          <p>{rehearsalLine}</p>
          <small>The partner will read the original dialogue. You read only the polished student lines shown here. Speech recognition checks that each line was read.</small>
        </div>}
        {phase==="ready_final"&&<div className="practiceBox"><strong>Guided replay complete.</strong>
          <p>Now complete a new conversation without the model answers. Score 90 or higher to pass.</p>
          <button className="button primary" disabled={busy||audioBusy} onClick={()=>void beginFinal()}>Start round 3 · independent conversation</button>
        </div>}
        {!finished&&phase!=="ready_final"&&<div className="roleplayReply">
          <div className="rowActions">
            <button type="button" className={"button "+(voice.handsFree?"primary":"ghost")} aria-pressed={voice.handsFree} onClick={()=>{
              const next=!voice.handsFree;voice.setHandsFree(next);
              if(next&&voice.state==="idle"&&!busy)void voice.startRecording();
            }}>{voice.handsFree?"🎙 Hands-free ON":"🎙 Hands-free OFF"}</button>
            <span className="sourceHint">AI finishes speaking → microphone starts → 3 seconds of silence sends your reply.</span>
          </div>
          <div className="recordControls">
            <button className={"recordBig"+(recording?" recording":"")} disabled={busy||audioBusy} onClick={()=>void(recording?voice.stopRecording(voice.handsFree):voice.startRecording())}>{recording?"■ Stop / send":"● Speak your reply"}</button>
            <span>{recording?voice.seconds+" sec · listening":voice.state==="speaking"?"AI is speaking…":voice.state==="transcribing"?"Transcribing speech…":busy?"AI is responding…":"Speak naturally, or type instead"}</span>
          </div>
          <label htmlFor="roleplay-transcript">{phase==="rehearsal"?"Read the displayed improved reply aloud":"Your reply · speak or type"}</label>
          <textarea id="roleplay-transcript" className="textInput" rows={3} value={voice.transcript} placeholder={phase==="rehearsal"?"Read the polished sentence above, then submit recognised words.":"What would you say next?"} onChange={e=>{if(phase!=="rehearsal")voice.setTranscript(e.target.value)}} readOnly={phase==="rehearsal"} disabled={busy||recording||audioBusy}/>
          {voice.interim&&<p className="muted">Recognising: {voice.interim}</p>}
          <div className="rowActions">
            <button className="button primary" disabled={!voice.transcript.trim()||busy||recording||audioBusy} onClick={()=>void submitMessage(voice.getTranscript())}>{phase==="rehearsal"?"Submit reading · next line":"Send reply"}</button>
            {phase!=="rehearsal"&&<button className="button ghost" disabled={busy||turnCount===0||voice.state==="transcribing"} onClick={()=>void finish()}>{phase==="final"?"Finish round 3 · check 90-point gate":"Finish round 1 · generate improved dialogue"}</button>}
          </div>
        </div>}
        {feedback&&<div className="roleplayFeedback">
          <h3>{finished?"Mastery achieved":phase==="rehearsal"?"First-round analysis and improved replies":"Third-round analysis · another full cycle required"}</h3>
          {lastScore!==null&&<p className="practiceBox"><strong>{lastScore}/100.</strong> {finished?"Passed.":phase==="rehearsal"?"Read the revised conversation before the independent score attempt.":"Not yet passed. Complete the next three rounds to try again."}</p>}
          <p>{feedback.reply}</p>
          <div className="speechScores"><Score label="Relevance" amount={feedback.relevance}/><Score label="Ideas" amount={feedback.development}/><Score label="Grammar" amount={feedback.grammar}/><Score label="Vocabulary" amount={feedback.vocabulary}/><Score label="Interaction" amount={feedback.interaction}/></div>
          <h4>You did well</h4><ul>{feedback.strengths.map((x,i)=><li key={i}>{x}</li>)}</ul>
          <h4>Try improving</h4><ul>{feedback.improvements.map((x,i)=><li key={i}>{x}</li>)}</ul>
          {feedback.betterExpression&&<p className="practiceBox"><strong>Useful expression:</strong> {feedback.betterExpression}</p>}
          {finished&&<button className="button primary" onClick={()=>reset()}>Practise another session</button>}
        </div>}
      </div>}
      {(error||voice.error)&&<div className="notice warnNotice" role="alert">{error||voice.error}</div>}
      <p className="sourceHint">Practice simulation only: no real bookings, orders or payments. Passing requires a score of at least 90 on the independent third round; scores are not official PSLE marks.</p>
    </div>
  </div>;
}
