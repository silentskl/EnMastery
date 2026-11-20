"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ROLEPLAY_CATEGORIES, ROLEPLAY_SCENARIOS, type RoleplayLevel } from "@/lib/roleplay/scenarios";
import type { ConversationFeedback } from "@/lib/speaking/types";
import { getSpeechRecognitionCtor, type SpeechRecognitionLike } from "@/lib/browser/speech-recognition";

type Line={speaker:"learner"|"assistant";text:string};
type Config={authenticated:boolean;serverStt:boolean;serverTts:boolean};
type ApiResult={error?:string;sessionId?:string;reply?:string;role?:string;turnCount?:number;completed?:boolean;feedback?:ConversationFeedback;overallScore?:number};
const defaultId="hawker-order";
function wav(parts:Float32Array[],sampleRate:number):Blob{
  const count=parts.reduce((n,a)=>n+a.length,0),src=new Float32Array(count);
  let at=0;for(const part of parts){src.set(part,at);at+=part.length}
  const ratio=sampleRate/16000,n=Math.ceil(count/ratio),view=new DataView(new ArrayBuffer(44+n*2));
  const label=(offset:number,string:string)=>{for(let i=0;i<string.length;i++)view.setUint8(offset+i,string.charCodeAt(i))};
  label(0,"RIFF");view.setUint32(4,36+n*2,true);label(8,"WAVE");label(12,"fmt ");
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
  label(36,"data");view.setUint32(40,n*2,true);
  for(let i=0;i<n;i++){const a=Math.floor(i*ratio),b=Math.min(count,Math.floor((i+1)*ratio));let sum=0;for(let j=a;j<b;j++)sum+=src[j];const v=Math.max(-1,Math.min(1,sum/Math.max(1,b-a)));view.setInt16(44+i*2,v<0?v*32768:v*32767,true)}
  return new Blob([view.buffer],{type:"audio/wav"});
}
function browserSpeak(text:string){
  if(!window.speechSynthesis)return;
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang="en-SG";utterance.rate=.93;
  utterance.voice=window.speechSynthesis.getVoices().find(x=>x.lang.toLowerCase()==="en-sg")||window.speechSynthesis.getVoices().find(x=>x.lang.toLowerCase().startsWith("en"))||null;
  window.speechSynthesis.speak(utterance);
}
function Score({label,amount}:{label:string;amount:number}){return <div className="speechScore"><span>{label}</span><strong>{Math.round(amount)}</strong></div>}
export function RoleplayWorkspace(){
  const [category,setCategory]=useState("all"),[query,setQuery]=useState(""),[showAll,setShowAll]=useState(false);
  const [scenarioId,setScenarioId]=useState(defaultId);
  const [level,setLevel]=useState<RoleplayLevel>("standard");
  const [config,setConfig]=useState<Config|null>(null);
  const [sessionId,setSessionId]=useState(""),[history,setHistory]=useState<Line[]>([]);
  const [transcript,setTranscript]=useState(""),[interim,setInterim]=useState("");
  const [busy,setBusy]=useState(false),[recording,setRecording]=useState(false);
  const [error,setError]=useState(""),[feedback,setFeedback]=useState<ConversationFeedback|null>(null);
  const [turnCount,setTurnCount]=useState(0),[finished,setFinished]=useState(false);
  const [seconds,setSeconds]=useState(0);
  const scene=ROLEPLAY_SCENARIOS.find(s=>s.id===scenarioId)||ROLEPLAY_SCENARIOS[0];
  const list=useMemo(()=>ROLEPLAY_SCENARIOS.filter(s=>(category==="all"||s.category===category)&&(!query.trim()||(s.title+" "+s.setting+" "+s.category).toLowerCase().includes(query.toLowerCase().trim()))),[category,query]);
  const visible=showAll?list:list.slice(0,18);
  const lastAi=[...history].reverse().find(h=>h.speaker==="assistant")?.text||"";
  const recRef=useRef<SpeechRecognitionLike|null>(null),mediaRef=useRef<MediaStream|null>(null);
  const audioRef=useRef<AudioContext|null>(null),sourceRef=useRef<MediaStreamAudioSourceNode|null>(null),nodeRef=useRef<ScriptProcessorNode|null>(null);
  const samplesRef=useRef<Float32Array[]>([]),rateRef=useRef(48000),transcriptRef=useRef("");
  const committedRef=useRef<Set<number>>(new Set()),timerRef=useRef<ReturnType<typeof setInterval>|null>(null),startedRef=useRef(0);
  const scrollRef=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{void fetch("/api/student/speaking/config",{cache:"no-store"}).then(r=>r.json()).then(v=>setConfig(v as Config)).catch(()=>setError("Could not load microphone settings."))},[]);
  useEffect(()=>{scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:"smooth"})},[history]);
  useEffect(()=>()=>{window.speechSynthesis?.cancel();try{recRef.current?.stop()}catch{};mediaRef.current?.getTracks().forEach(x=>x.stop());nodeRef.current?.disconnect();sourceRef.current?.disconnect();void audioRef.current?.close().catch(()=>{});if(timerRef.current)clearInterval(timerRef.current)},[]);

  function reset(nextId?:string){
    if(busy||recording)return;
    window.speechSynthesis?.cancel();
    if(nextId)setScenarioId(nextId);
    setSessionId("");setHistory([]);setFeedback(null);setFinished(false);setTurnCount(0);setError("");setTranscript("");setInterim("");transcriptRef.current="";
  }
  async function send(body:Record<string,unknown>):Promise<ApiResult>{
    const response=await fetch("/api/student/roleplay",{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",body:JSON.stringify(body)});
    const data=await response.json() as ApiResult;
    if(!response.ok)throw new Error(data.error||"The role-play service could not respond.");
    return data;
  }
  async function speak(text:string){
    if(!text)return;
    if(config?.serverTts){try{
      const response=await fetch("/api/student/speaking/tts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text})});
      if(response.ok){const url=URL.createObjectURL(await response.blob());const audio=new Audio(url);audio.onended=()=>URL.revokeObjectURL(url);audio.onerror=()=>URL.revokeObjectURL(url);await audio.play();return}
    }catch{}}
    browserSpeak(text);
  }
  async function begin(){
    if(busy||recording||!scene)return;
    setBusy(true);setError("");
    try{
      const data=await send({action:"start",scenarioId:scene.id,level});
      if(!data.sessionId||!data.reply)throw new Error("Role-play session could not be started.");
      setSessionId(data.sessionId);setHistory([{speaker:"assistant",text:data.reply}]);setFinished(false);setFeedback(null);setTurnCount(0);
      void speak(data.reply);
    }catch(err){setError(err instanceof Error?err.message:"Unable to start role-play")}
    finally{setBusy(false)}
  }
  async function submit(){
    const message=transcript.trim();
    if(!sessionId||!message||busy||recording||finished)return;
    setBusy(true);setError("");
    try{
      const data=await send({action:"reply",sessionId,transcript:message});
      if(!data.reply)throw new Error("The role-play partner returned an empty reply.");
      setHistory(v=>[...v,{speaker:"learner",text:message},{speaker:"assistant",text:data.reply!}]);
      setTranscript("");transcriptRef.current="";setInterim("");setTurnCount(data.turnCount||turnCount+1);
      void speak(data.reply);
    }catch(err){setError(err instanceof Error?err.message:"Unable to continue conversation")}
    finally{setBusy(false)}
  }
  async function finish(){
    if(!sessionId||turnCount<1||busy||recording||finished)return;
    setBusy(true);setError("");window.speechSynthesis?.cancel();
    try{
      const data=await send({action:"finish",sessionId});
      if(!data.feedback)throw new Error("Final feedback was not returned.");
      setFeedback(data.feedback);setFinished(true);
    }catch(err){setError(err instanceof Error?err.message:"Unable to finish practice")}
    finally{setBusy(false)}
  }
  async function startRecording(){
    if(busy||recording||!sessionId||finished)return;
    if(config&&!config.authenticated){setError("Sign in with a student account to practise speaking.");return}
    try{
      setError("");setTranscript("");setInterim("");transcriptRef.current="";setSeconds(0);
      samplesRef.current=[];committedRef.current=new Set();
      const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});
      mediaRef.current=stream;
      const ctx=new AudioContext();audioRef.current=ctx;rateRef.current=ctx.sampleRate;
      const src=ctx.createMediaStreamSource(stream),node=ctx.createScriptProcessor(4096,1,1);
      sourceRef.current=src;nodeRef.current=node;
      node.onaudioprocess=e=>samplesRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      src.connect(node);node.connect(ctx.destination);
      const Ctor=getSpeechRecognitionCtor();
      if(Ctor){try{
        const rec=new Ctor();rec.lang="en-SG";rec.continuous=true;rec.interimResults=true;
        rec.onresult=e=>{let additions="",temporary="";for(let i=0;i<e.results.length;i++){
          const word=(e.results[i][0]?.transcript||"").trim();if(!word)continue;
          if(e.results[i].isFinal){if(!committedRef.current.has(i)){committedRef.current.add(i);additions+=" "+word}}else temporary+=" "+word;
        }
          if(additions){transcriptRef.current=(transcriptRef.current+" "+additions).trim();setTranscript(transcriptRef.current)}
          setInterim(temporary.trim());
        };rec.onerror=()=>{};rec.start();recRef.current=rec;
      }catch{}}
      startedRef.current=Date.now();timerRef.current=setInterval(()=>setSeconds(Math.floor((Date.now()-startedRef.current)/1000)),500);setRecording(true);
    }catch(err){
      mediaRef.current?.getTracks().forEach(x=>x.stop());mediaRef.current=null;
      setError(err instanceof Error?err.message:"Microphone access is required.");
    }
  }
  async function stopRecording(){
    if(!recording)return;
    setRecording(false);
    if(timerRef.current)clearInterval(timerRef.current);
    const rec=recRef.current;
    if(rec){try{rec.stop()}catch{}recRef.current=null}
    nodeRef.current?.disconnect();sourceRef.current?.disconnect();
    const audio=wav(samplesRef.current,rateRef.current);
    mediaRef.current?.getTracks().forEach(x=>x.stop());mediaRef.current=null;
    await audioRef.current?.close().catch(()=>{});audioRef.current=null;nodeRef.current=null;sourceRef.current=null;
    if(config?.serverStt&&audio.size>44){
      setBusy(true);
      try{
        const form=new FormData();form.append("audio",audio,"roleplay.wav");
        const response=await fetch("/api/student/speaking/transcribe",{method:"POST",body:form});
        const data=await response.json() as {text?:string;error?:string};
        if(response.ok&&data.text?.trim()){setTranscript(data.text.trim());transcriptRef.current=data.text.trim()}
        else if(!transcriptRef.current.trim())throw new Error(data.error||"Speech recognition failed. You can type your reply instead.");
      }catch(err){if(!transcriptRef.current.trim())setError(err instanceof Error?err.message:"Speech recognition failed. Type your reply instead.")}
      finally{setBusy(false)}
    }else{
      // Give browser speech recognition a chance to deliver its final results.
      await new Promise<void>(resolve=>setTimeout(resolve,350));
      if(transcriptRef.current)setTranscript(transcriptRef.current);
    }
    setInterim("");
  }
  return <div className="roleplayWorkspace">
    <div className="roleplayChooser card">
      <div className="cardHeader"><h2>Choose a real-life situation</h2><span>{ROLEPLAY_SCENARIOS.length} scenes · {ROLEPLAY_CATEGORIES.length} categories</span></div>
      <p className="muted">Talk freely with an AI character. There is no fixed set of questions. Choose how the conversation develops.</p>
      <div className="roleplayFilters">
        <input className="textInput" aria-label="Search real-life situations" placeholder="Search a situation, such as hotel or shopping…" value={query} onChange={e=>{setQuery(e.target.value);setShowAll(false)}}/>
        <select className="selectInput" aria-label="Scenario category" value={category} onChange={e=>{setCategory(e.target.value);setShowAll(false)}}>
          <option value="all">All situations</option>{ROLEPLAY_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
      </div>
      <div className="roleplayScenes">{visible.map(s=>{
        const c=ROLEPLAY_CATEGORIES.find(c=>c.id===s.category);
        return <button key={s.id} type="button" className={"roleplayScene"+(scenarioId===s.id?" selected":"")} disabled={busy||recording||Boolean(sessionId&&!finished)} onClick={()=>reset(s.id)}>
          <span>{c?.icon||"💬"} {c?.label}</span><strong>{s.title}</strong><small>{s.setting}</small>
        </button>;
      })}</div>
      {list.length===0&&<div className="emptyState">No matching situations. Try a different search.</div>}
      {!showAll&&list.length>visible.length&&<button className="button ghost" onClick={()=>setShowAll(true)}>Show all {list.length} matching situations</button>}
      {sessionId&&!finished&&<p className="sourceHint">Finish or restart the current conversation to change the situation.</p>}
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
        <div className="roleplayStatus">{finished?"Practice completed":"Live conversation · "+turnCount+" student turns"} <span>{finished?"":"You decide when to finish"}</span></div>
        <div className="roleplayMessages" ref={scrollRef} role="log" aria-label="Role-play conversation history">
          {history.map((line,i)=><div key={i} className={"roleplayMessage "+(line.speaker==="learner"?"learner":"partner")}><strong>{line.speaker==="learner"?"You":scene.aiRole}</strong><p>{line.text}</p>{line.speaker==="assistant"&&<button className="roleplayListen" title="Listen to this line" aria-label={"Listen to "+scene.aiRole+" reply"} onClick={()=>void speak(line.text)}>🔊 Play</button>}</div>)}
        </div>
        {!finished&&<div className="roleplayReply">
          <div className="recordControls">
            <button className={"recordBig"+(recording?" recording":"")} disabled={busy} onClick={()=>void(recording?stopRecording():startRecording())}>{recording?"■ Stop recording":"● Speak your reply"}</button>
            <span>{recording?seconds+" sec · recording":busy?"AI is responding…":"Answer naturally in English"}</span>
          </div>
          <label htmlFor="roleplay-transcript">Your reply · speak or type</label>
          <textarea id="roleplay-transcript" className="textInput" rows={3} value={transcript} placeholder="What would you say next?" onChange={e=>{setTranscript(e.target.value);transcriptRef.current=e.target.value}} disabled={busy||recording}/>
          {interim&&<p className="muted">Recognising: {interim}</p>}
          <div className="rowActions">
            <button className="button primary" disabled={!transcript.trim()||busy||recording} onClick={()=>void submit()}>Send reply</button>
            <button className="button ghost" disabled={busy||recording||turnCount===0} onClick={()=>void finish()}>End conversation · get feedback</button>
          </div>
        </div>}
        {finished&&feedback&&<div className="roleplayFeedback">
          <h3>Practical English feedback</h3>
          <p>{feedback.reply}</p>
          <div className="speechScores"><Score label="Relevance" amount={feedback.relevance}/><Score label="Ideas" amount={feedback.development}/><Score label="Grammar" amount={feedback.grammar}/><Score label="Vocabulary" amount={feedback.vocabulary}/><Score label="Interaction" amount={feedback.interaction}/></div>
          <h4>You did well</h4><ul>{feedback.strengths.map((x,i)=><li key={i}>{x}</li>)}</ul>
          <h4>Try improving</h4><ul>{feedback.improvements.map((x,i)=><li key={i}>{x}</li>)}</ul>
          {feedback.betterExpression&&<p className="practiceBox"><strong>Useful expression:</strong> {feedback.betterExpression}</p>}
          <button className="button primary" onClick={()=>reset()}>Try the same situation again</button>
        </div>}
      </div>}
      {error&&<div className="notice warnNotice" role="alert">{error}</div>}
      <p className="sourceHint">Practice simulation only: no real bookings, orders or payments. Scores are learning feedback, not official PSLE marks.</p>
    </div>
  </div>;
}
