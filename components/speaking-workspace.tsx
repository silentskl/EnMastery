"use client";
import { useEffect, useRef, useState } from "react";
import type { ConversationFeedback, PronunciationAssessment, SpeakingMode, SpeakingPrompt } from "@/lib/speaking/types";
import { getSpeechRecognitionCtor, type SpeechRecognitionLike } from "@/lib/browser/speech-recognition";

type Focus = "stimulus" | "reading_aloud";
type Config = {authenticated:boolean;serverStt:boolean;serverTts:boolean;azurePronunciation:boolean};
type HistoryItem = {role:"user"|"assistant";content:string};
type Progress = {passMark:number;passedModes:SpeakingMode[];scores:Partial<Record<SpeakingMode,number>>};

function encodeWav(parts:Float32Array[],sourceRate:number):Blob {
  const total=parts.reduce((n,p)=>n+p.length,0);
  const source=new Float32Array(total);
  let offset=0;for(const part of parts){source.set(part,offset);offset+=part.length}
  const targetRate=16000, ratio=sourceRate/targetRate, length=Math.ceil(source.length/ratio);
  const buffer=new ArrayBuffer(44+length*2),view=new DataView(buffer);
  const label=(at:number,s:string)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i))};
  label(0,"RIFF");view.setUint32(4,36+length*2,true);label(8,"WAVE");label(12,"fmt ");
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,targetRate,true);view.setUint32(28,targetRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
  label(36,"data");view.setUint32(40,length*2,true);
  for(let i=0;i<length;i++){const from=Math.floor(i*ratio),to=Math.min(source.length,Math.floor((i+1)*ratio));let sum=0;for(let j=from;j<to;j++)sum+=source[j];const sample=Math.max(-1,Math.min(1,sum/Math.max(1,to-from)));view.setInt16(44+i*2,sample<0?sample*32768:sample*32767,true)}
  return new Blob([buffer],{type:"audio/wav"});
}
function browserSpeak(text:string){
  if(typeof window==="undefined"||!window.speechSynthesis)return;
  window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);
  utterance.lang="en-SG";utterance.rate=.93;
  utterance.voice=window.speechSynthesis.getVoices().find(v=>v.lang.toLowerCase()==="en-sg")||window.speechSynthesis.getVoices().find(v=>v.lang.startsWith("en"))||null;
  window.speechSynthesis.speak(utterance);
}
function Score({label,value}:{label:string;value:number|null|undefined}) {
  return <div className="speechScore"><span>{label}</span><strong>{typeof value==="number"?Math.round(value):"—"}</strong></div>;
}
export function SpeakingWorkspace({focus}:{focus:Focus}) {
  const [prompts,setPrompts]=useState<SpeakingPrompt[]>([]);
  const [config,setConfig]=useState<Config|null>(null);
  const [promptId,setPromptId]=useState("");
  const [progress,setProgress]=useState<Progress|null>(null);
  const [transcript,setTranscript]=useState("");
  const [interim,setInterim]=useState("");
  const [history,setHistory]=useState<HistoryItem[]>([]);
  const [phase,setPhase]=useState<"description"|"questions"|"completed">("description");
  const [questionNumber,setQuestionNumber]=useState(0);
  const [questionTotal,setQuestionTotal]=useState(4);
  const [examinerQuestion,setExaminerQuestion]=useState("");
  const [imageReady,setImageReady]=useState(false);
  const [imageFailed,setImageFailed]=useState(false);
  const [sessionId,setSessionId]=useState("");
  const [feedback,setFeedback]=useState<ConversationFeedback|null>(null);
  const [assessment,setAssessment]=useState<PronunciationAssessment|null>(null);
  const [recording,setRecording]=useState(false);
  const [busy,setBusy]=useState(false);
  const [seconds,setSeconds]=useState(0);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const streamRef=useRef<MediaStream|null>(null);
  const audioRef=useRef<AudioContext|null>(null);
  const processorRef=useRef<ScriptProcessorNode|null>(null);
  const sourceRef=useRef<MediaStreamAudioSourceNode|null>(null);
  const recRef=useRef<SpeechRecognitionLike|null>(null);
  const chunksRef=useRef<Float32Array[]>([]);
  const wavRef=useRef<Blob|null>(null);
  const timerRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const startedRef=useRef(0);
  const sampleRateRef=useRef(48000);
  const startingRef=useRef(false);
  const committedRef=useRef<Set<number>>(new Set());

  useEffect(()=>{void fetch("/api/student/speaking/config",{cache:"no-store"}).then(r=>r.json()).then(x=>setConfig(x as Config)).catch(()=>setError("Could not load speech settings."))},[]);
  useEffect(()=>{
    let live=true;setLoading(true);setError("");setTranscript("");setFeedback(null);setAssessment(null);setHistory([]);setSessionId("");setPhase("description");setQuestionNumber(0);setExaminerQuestion("");setImageReady(false);setImageFailed(false);
    void fetch("/api/student/speaking/prompts",{cache:"no-store"}).then(async r=>{
      const body=await r.json() as {prompts?:SpeakingPrompt[];dailyProgress?:Progress;error?:string};
      if(!r.ok)throw new Error(body.error||"Could not load oral tasks");
      if(!live)return;
      const matching=(body.prompts||[]).filter(p=>p.mode===focus);
      setPrompts(matching);setPromptId(matching[0]?.id||"");setProgress(body.dailyProgress||null);
      if(matching.length===0)setError("No "+(focus==="stimulus"?"conversation":"Reading Aloud")+" task is published for this learner today. Ask your teacher to publish more P5/P6 material.");
    }).catch(e=>{if(live)setError(e instanceof Error?e.message:"Could not load oral tasks")}).finally(()=>{if(live)setLoading(false)});
    return()=>{live=false};
  },[focus]);
  useEffect(()=>()=>{if(timerRef.current)clearInterval(timerRef.current);try{recRef.current?.stop()}catch{}streamRef.current?.getTracks().forEach(t=>t.stop());processorRef.current?.disconnect();sourceRef.current?.disconnect();void audioRef.current?.close().catch(()=>{})},[]);
  const active=prompts.find(p=>p.id===promptId)||prompts[0]||null;
  function selectPrompt(id:string){if(recording||busy)return;setPromptId(id);setTranscript("");setFeedback(null);setAssessment(null);setSessionId("");setHistory([]);setPhase("description");setQuestionNumber(0);setExaminerQuestion("");setImageReady(false);setImageFailed(false);wavRef.current=null;}
  async function start(){
    if(recording||busy||startingRef.current||phase==="completed")return;
    if(focus==="stimulus"&&(!active?.stimulusImageUrl||!imageReady||imageFailed)){setError("The picture is not available. Ask your teacher to add a working image before starting.");return}
    if(config&&!config.authenticated){setError("Sign in with a student account to record and receive feedback.");return}
    startingRef.current=true;
    try{
      setError("");setFeedback(null);setAssessment(null);setTranscript("");setInterim("");setSeconds(0);
      wavRef.current=null;chunksRef.current=[];
      const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});
      streamRef.current=stream;
      const ctx=new AudioContext();audioRef.current=ctx;sampleRateRef.current=ctx.sampleRate;
      const src=ctx.createMediaStreamSource(stream),proc=ctx.createScriptProcessor(4096,1,1);
      sourceRef.current=src;processorRef.current=proc;
      proc.onaudioprocess=e=>chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      src.connect(proc);proc.connect(ctx.destination);
      const Ctor=getSpeechRecognitionCtor();
      if(Ctor){
        try{
          const recognition=new Ctor();committedRef.current=new Set();recognition.lang="en-SG";recognition.continuous=true;recognition.interimResults=true;
          recognition.onresult=e=>{let added="",draft="";for(let i=0;i<e.results.length;i++){const line=(e.results[i][0]?.transcript||"").trim();if(!line)continue;if(e.results[i].isFinal){if(!committedRef.current.has(i)){committedRef.current.add(i);added+=" "+line}}else draft+=" "+line}if(added)setTranscript(v=>(v+added).trim());setInterim(draft.trim())};
          recognition.onerror=()=>{};recognition.start();recRef.current=recognition;
        }catch{}
      }
      startedRef.current=Date.now();timerRef.current=setInterval(()=>setSeconds(Math.round((Date.now()-startedRef.current)/1000)),500);setRecording(true);
    }catch(e){streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setError(e instanceof Error?e.message:"Microphone permission is required.")}
    finally{startingRef.current=false}
  }
  async function stop(){
    if(!recording)return;setRecording(false);if(timerRef.current)clearInterval(timerRef.current);
    try{recRef.current?.stop()}catch{}recRef.current=null;
    processorRef.current?.disconnect();sourceRef.current?.disconnect();
    wavRef.current=encodeWav(chunksRef.current,sampleRateRef.current);
    streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;
    await audioRef.current?.close().catch(()=>{});audioRef.current=null;processorRef.current=null;sourceRef.current=null;
    if(!transcript.trim()&&config?.serverStt&&wavRef.current){
      setBusy(true);
      try{const form=new FormData();form.append("audio",wavRef.current,"psle-speech.wav");const response=await fetch("/api/student/speaking/transcribe",{method:"POST",body:form});const body=await response.json() as {text?:string;error?:string};if(!response.ok)throw new Error(body.error||"Speech recognition failed");if(body.text)setTranscript(body.text)}
      catch(e){setError(e instanceof Error?e.message:"Speech recognition failed")}
      finally{setBusy(false)}
    }
  }
  async function speak(text:string){
    if(config?.serverTts){try{const r=await fetch("/api/student/speaking/tts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text})});if(r.ok){const url=URL.createObjectURL(await r.blob());const audio=new Audio(url);audio.onended=()=>URL.revokeObjectURL(url);await audio.play();return}}catch{}}
    browserSpeak(text);
  }
  async function submitConversation(){
    if(!active||!transcript.trim()||phase==="completed")return;
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/student/speaking/respond",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({promptId:active.id,mode:"stimulus",transcript,history,sessionId:sessionId||undefined})});
      const body=await response.json() as {sessionId?:string;feedback?:ConversationFeedback;dailySpeaking?:Progress;error?:string;phase?:"questions"|"completed";questionNumber?:number;questionTotal?:number;completed?:boolean;overallScore?:number};
      if(!response.ok||!body.feedback)throw new Error(body.error||"Conversation could not be assessed");
      setSessionId(body.sessionId||"");
      setPhase(body.completed?"completed":"questions");
      setQuestionNumber(body.questionNumber||1);
      setQuestionTotal(body.questionTotal||4);
      setExaminerQuestion(body.completed?"":body.feedback.followUpQuestion||body.feedback.reply);
      setFeedback(body.completed?body.feedback:null);
      if(body.dailySpeaking)setProgress(body.dailySpeaking);
      setHistory(v=>[...v,{role:"user",content:transcript},{role:"assistant",content:body.feedback!.reply}]);
      setTranscript("");setInterim("");
      void speak(body.feedback.reply);
    }catch(e){setError(e instanceof Error?e.message:"Conversation failed")}finally{setBusy(false)}
  }
  async function assessReading(){
    if(!active?.referenceText||!wavRef.current)return;
    setBusy(true);setError("");
    try{
      const form=new FormData();form.append("audio",wavRef.current,"reading.wav");
      form.append("promptId",active.id);form.append("referenceText",active.referenceText);
      form.append("browserTranscript",transcript);form.append("durationMs",String(Math.max(1000,Date.now()-startedRef.current)));
      const response=await fetch("/api/student/speaking/assess",{method:"POST",body:form});
      const body=await response.json() as {assessment?:PronunciationAssessment;dailySpeaking?:Progress;error?:string};
      if(!response.ok||!body.assessment)throw new Error(body.error||"Reading assessment failed");
      setAssessment(body.assessment);if(body.dailySpeaking)setProgress(body.dailySpeaking);
    }catch(e){setError(e instanceof Error?e.message:"Reading assessment failed")}finally{setBusy(false)}
  }
  const passed=Boolean(progress?.passedModes?.includes(focus));
  const description=phase==="description";
  const photoMissing=focus==="stimulus"&&(!active?.stimulusImageUrl||imageFailed);
  function restartConversation(){
    if(recording||busy)return;
    setSessionId("");setPhase("description");setQuestionNumber(0);setExaminerQuestion("");setHistory([]);setFeedback(null);setTranscript("");setInterim("");setError("");wavRef.current=null;
  }
  return <div className="speakingWorkspace">
    <div className="speakingDailyGate"><strong>{focus==="reading_aloud"?"Reading Aloud":"Stimulus-Based Conversation"} · {focus==="stimulus"?(phase==="completed"?"Conversation finished":description?"Step 1 · Describe the picture":"Step 2 · Question "+questionNumber+" of "+questionTotal):(passed?"Practised successfully":"Ready to practise")}</strong><span>{progress?"Today's practice target: "+progress.passMark+"%":"Scores are for practice, not official PSLE marks"}</span></div>
    <div className="speakingGrid"><section className="card">
      <div className="cardHeader"><h2>{active?.title||"PSLE oral practice"}</h2><span>{active?.topic||"Primary 5–6"}</span></div>
      {loading&&<div className="emptyState">Preparing your oral task…</div>}
      {prompts.length>1&&<select className="selectInput" value={active?.id||""} onChange={e=>selectPrompt(e.target.value)} disabled={recording||busy}>{prompts.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select>}
      {active&&<div className="oralPrompt"><div className="eyebrow">{focus==="reading_aloud"?"Read for the audience and purpose":description?"First, describe the picture":"Now, talk with your AI examiner"}</div>{focus==="reading_aloud"?<p>{active.prompt}</p>:<p>{description?"Look closely at the picture. Say who and what you see, what people are doing and what you think is happening. After your description the AI examiner will ask four questions, one by one.":active.prompt}</p>}
        {focus==="reading_aloud"&&active.referenceText&&<div className="readingAloudText">{active.referenceText}</div>}
        {focus==="stimulus"&&<div className="stimulusCard">{active.stimulusImageUrl&&<div className="stimulusImageWrap"><img className="stimulusImage" src={active.stimulusImageUrl} alt={active.stimulusImageAlt||"PSLE conversation photograph"} /></div>}{!active.stimulusImageUrl&&active.stimulusAlt&&<p>{active.stimulusAlt}</p>}</div>}
      </div>}
      {config&&!config.authenticated&&<div className="notice warnNotice">A student login is required to record and receive AI feedback.</div>}
      <div className="recordControls"><button className={"recordBig"+(recording?" recording":"")} disabled={!active||busy||Boolean(config&&!config.authenticated)} onClick={()=>void(recording?stop():start())}>{recording?"■ Stop":"● Record answer"}</button><span>{recording?seconds+" seconds · recording":busy?"Evaluating…":"Use your microphone to practise"}</span></div>
      {(transcript||interim)&&<div className="transcriptBox"><div className="eyebrow">Recognised speech · edit only obvious transcription errors</div><textarea aria-label="Recognised speech" value={transcript} onChange={e=>setTranscript(e.target.value)} /><p className="muted">{interim}</p></div>}
      {!recording&&focus==="stimulus"&&phase!=="completed"&&transcript.trim()&&<button className="button primary" disabled={busy||photoMissing} onClick={()=>void submitConversation()}>{description?"Submit picture description · start questions":"Submit answer · next examiner turn"}</button>}
      {focus==="stimulus"&&phase==="completed"&&<button className="button primary" disabled={busy||recording} onClick={restartConversation}>Practise this picture again</button>
      {!recording&&focus==="reading_aloud"&&wavRef.current&&<button className="button primary" disabled={busy} onClick={()=>void assessReading()}>Assess reading aloud</button>}
      {history.length>0&&<div className="conversationHistory">{history.map((item,i)=><div className={"historyBubble "+(item.role==="user"?"learner":"tutor")} key={i}><span>{item.role==="user"?"You":"Examiner"}</span><p>{item.content}</p></div>)}</div>}
      {error&&<div className="notice warnNotice" role="alert">{error}</div>}
    </section>
    <aside className="card speakingCoach"><div className="cardHeader"><h2>Practice feedback</h2><span>{focus==="reading_aloud"?(config?.azurePronunciation?"Acoustic assessment":"Approximate assessment"):"Ideas and interaction"}</span></div>
      {feedback?<><div className="speechScores"><Score label="Relevance" value={feedback.relevance}/><Score label="Ideas" value={feedback.development}/><Score label="Grammar" value={feedback.grammar}/><Score label="Vocabulary" value={feedback.vocabulary}/><Score label="Interaction" value={feedback.interaction}/></div>
        <div className="feedbackSection"><strong>Examiner's follow-up</strong><p>{feedback.reply}</p></div>
        <div className="feedbackSection"><strong>What you did well</strong><ul>{feedback.strengths.map((v,i)=><li key={i}>{v}</li>)}</ul></div>
        <div className="feedbackSection"><strong>Improve next time</strong><ul>{feedback.improvements.map((v,i)=><li key={i}>{v}</li>)}</ul></div>
        {feedback.betterExpression&&<div className="practiceBox"><strong>A clearer way to say it</strong><p>{feedback.betterExpression}</p></div>}
        <button className="button ghost" onClick={()=>void speak(feedback.reply)}>🔊 Hear examiner</button>
      </>:assessment?<><div className="speechScores"><Score label="Pronunciation" value={assessment.pronunciation}/><Score label="Accuracy" value={assessment.accuracy}/><Score label="Fluency" value={assessment.fluency}/><Score label="Completeness" value={assessment.completeness}/><Score label="Expression" value={assessment.prosody}/></div>
        {assessment.note&&<div className="notice">{assessment.note}</div>}
        {assessment.wordsPerMinute&&<p>Speaking pace: {assessment.wordsPerMinute} words/minute</p>}
        {assessment.words?.length&&<div className="wordAccuracyList">{assessment.words.filter(w=>(typeof w.accuracy==="number"&&w.accuracy<75)||(w.errorType&&w.errorType!=="None")).slice(0,12).map((w,i)=><span key={i}>{w.word}{typeof w.accuracy==="number"?" · "+Math.round(w.accuracy):""}</span>)}</div>}
      </>:<div className="emptyState">{focus==="stimulus"?"Describe the picture first. Then the AI examiner will ask four questions in separate rounds. Speak, listen, respond, and continue until the conversation is complete.":"Make sense of the passage, pause naturally and read with expression."}</div>}
      <small className="sourceHint">AI practice scores are not official SEAB assessment results.</small>
    </aside></div>
  </div>;
}
