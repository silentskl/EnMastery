"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { IntensiveListeningPlayer } from "@/components/intensive-listening-player";
type Segment={id:string;segment_order:number;start_ms:number;end_ms:number;transcript:string};
type Question={id:string;questionType:"multiple_choice"|"short_answer";stem:{prompt?:string;options?:string[]};marks:number};
type Result={correct:boolean;score:number;maxScore:number;feedback:string;explanation?:string;progress:number};
type Content={id:string;title:string;school_level:string;topic?:string|null;description?:string|null;
  media:{media_kind:string;provider:string;embed_url?:string|null;media_url?:string|null;source_item_url?:string|null};
  body:{mode:"authentic"|"guided";learningGoal:string;instructions:string[];passes:Array<{title:string;instruction:string}>};
  questions:Question[];segments?:Segment[]};
export function StudentListeningPlayer({id}:{id:string}){
  const [content,setContent]=useState<Content|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true);
  const [round,setRound]=useState(0),[answer,setAnswer]=useState<Record<string,number|string>>({});
  const [results,setResults]=useState<Record<string,Result>>({}),[index,setIndex]=useState(0),[busy,setBusy]=useState(false);
  useEffect(()=>{
    let live=true;setLoading(true);setError("");setRound(0);setResults({});setAnswer({});setIndex(0);
    void fetch("/api/student/listening/"+encodeURIComponent(id),{cache:"no-store"}).then(async r=>{
      const body=await r.json() as {content?:Content;error?:string};
      if(!r.ok)throw new Error(body.error||"Listening lesson could not be loaded");
      if(live)setContent(body.content||null);
    }).catch(e=>{if(live)setError(e instanceof Error?e.message:"Listening lesson could not be loaded")}).finally(()=>{if(live)setLoading(false)});
    return()=>{live=false};
  },[id]);
  async function submit(question:Question){
    setBusy(true);setError("");
    try{
      const value=answer[question.id];
      const response=question.questionType==="multiple_choice"?{optionIndex:value}:{text:value};
      const r=await fetch("/api/student/attempt",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contentId:id,questionId:question.id,response})});
      const body=await r.json() as Result&{error?:string};
      if(!r.ok)throw new Error(body.error||"Unable to check the answer");
      setResults(old=>({...old,[question.id]:body}));
    }catch(e){setError(e instanceof Error?e.message:"Unable to check the answer")}finally{setBusy(false)}
  }
  if(loading)return <div className="emptyState">Preparing PSLE listening practice…</div>;
  if(!content)return <div className="notice warnNotice">{error||"Lesson unavailable."} <Link href="/learn/listen">Back to listening</Link></div>;
  const question=content.questions[index],result=question?results[question.id]:undefined;
  const correctCount=content.questions.filter(q=>results[q.id]?.correct).length;
  const complete=content.questions.length>0&&correctCount===content.questions.length;
  const canCheck=question&&(question.questionType==="multiple_choice"?typeof answer[question.id]==="number":typeof answer[question.id]==="string"&&Boolean(String(answer[question.id]).trim()));
  const media=content.media;
  return <><div className="readerTop"><Link href="/learn/listen">← Listening library</Link><span>{content.school_level} · PSLE English</span></div>
    <section className="card listeningPlayer"><div className="readingMeta">{content.topic||"Listening Comprehension"}</div><h1>{content.title}</h1>
      <p>{content.description}</p><p className="sourceHint">PSLE-style practice · {content.questions.length} question{content.questions.length===1?"":"s"} · Listen twice before answering. The official paper has 20 multiple-choice questions.</p>
      {media.media_kind==="owned_audio"?<IntensiveListeningPlayer content={content}/>
      :media.media_kind==="youtube"&&media.embed_url?<div className="mediaFrame studentMedia"><iframe src={media.embed_url} title={content.title} allow="encrypted-media; picture-in-picture" allowFullScreen/></div>
      :media.media_url?<audio controls src={media.media_url} preload="metadata"/>
      :media.source_item_url?<a className="button secondary" href={media.source_item_url} target="_blank" rel="noreferrer">Open publisher listening media</a>
      :<div className="notice warnNotice">Audio media is not available.</div>}
      <div className="passCoach"><div><div className="eyebrow">Listening {round+1} of 2</div><h2>{round===0?"First listen · overall meaning":round===1?"Second listen · details and inference":"Ready"}</h2><p>{round===0?"What is the main purpose? Who is speaking, to whom, and why?":"Listen carefully for key details, order of events and implied meaning."}</p></div>
      {round===0?<button className="button primary" onClick={()=>setRound(1)}>I have listened once →</button>:<span className="statusPill">Ready for questions</span>}</div>
    </section>
    {round>=1&&<section className="card" style={{marginTop:20}}>
      <div className="cardHeader"><h2>Check your understanding</h2><span>{correctCount}/{content.questions.length} correct</span></div>
      {!content.questions.length?<div className="notice warnNotice">This lesson has no published comprehension questions. Ask your teacher to add questions before using it for PSLE practice.</div>
      :complete?<><div className="learningStatus pass">All questions answered correctly.</div><p>Review any mistakes you made along the way, then choose a new listening activity.</p><Link className="button primary" href="/learn/listen">Next listening activity →</Link></>
      :question?<div className="learningQuestion" key={question.id}><div className="questionLabel">Question {index+1} of {content.questions.length} · {question.marks} mark{question.marks===1?"":"s"}</div>
        <strong>{question.stem.prompt}</strong>
        {question.questionType==="multiple_choice"?<div className="optionList">{(question.stem.options||[]).map((option,i)=><label key={i} className={"optionRow"+(answer[question.id]===i?" selected":"")}>
          <input type="radio" name={question.id} checked={answer[question.id]===i} disabled={Boolean(result?.correct)} onChange={()=>setAnswer(v=>({...v,[question.id]:i}))}/><span>{option}</span>
        </label>)}</div>:<textarea className="answerArea" value={typeof answer[question.id]==="string"?String(answer[question.id]):""} disabled={Boolean(result?.correct)} onChange={e=>setAnswer(v=>({...v,[question.id]:e.target.value}))}/>}
        <div className="rowActions"><button className="button primary" disabled={!canCheck||busy||Boolean(result?.correct)} onClick={()=>void submit(question)}>{busy?"Checking…":"Check answer"}</button>
        {result?.correct&&index<content.questions.length-1&&<button className="button secondary" onClick={()=>setIndex(n=>n+1)}>Next question →</button>}</div>
        {result&&<div className={result.correct?"answerFeedback correct":"answerFeedback"}><strong>{result.correct?"Correct":"Try again"} · {result.score}/{result.maxScore}</strong><p>{result.feedback}</p>{result.explanation&&<p>{result.explanation}</p>}</div>}
      </div>:null}
      {error&&<div className="notice warnNotice">{error}</div>}
    </section>}
  </>;
}
