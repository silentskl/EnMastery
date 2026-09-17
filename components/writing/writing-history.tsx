"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SelectionVocabulary } from "@/components/vocabulary/selection-vocabulary";

type Summary={id:string;prompt_id:string;word_count:number;status:string;review_score:number|null;passed:number;passed_at:string|null;revision_of_submission_id:string|null;created_at:string;updated_at:string;title:string;school_level:string|null;topic:string|null;versionNumber:number;scores?:Record<string,number>|null};
type Detail={id:string;prompt_id:string;submission_text:string;plan_json:string|null;word_count:number;status:string;scores_json:string|null;feedback_json:string|null;review_score:number|null;passed:number;passed_at:string|null;revision_of_submission_id:string|null;created_at:string;updated_at:string;prompt_title:string;school_level:string|null;topic:string|null;prompt_body_json:string|null};
type Feedback={scores?:Record<string,number>;strengths?:string[];improvements?:Array<{area:string;hint:string;example?:string}>;overall?:string};

function json<T>(text:string|null):T|null{if(!text)return null;try{return JSON.parse(text) as T}catch{return null}}
function when(value:string){const iso=value.includes("T")?value:`${value.replace(" ","T")}Z`;return new Date(iso).toLocaleString("en-SG",{timeZone:"Asia/Singapore",dateStyle:"medium",timeStyle:"short"})}
function statusOf(row:{status:string;passed:number;review_score:number|null}){
  if(row.status==="evaluating")return{label:"REVIEWING",className:"learningStatus reviewing"};
  if(row.status==="failed")return{label:"REVIEW ERROR",className:"learningStatus error"};
  if(row.status==="reviewed"&&row.passed)return{label:"PASS",className:"learningStatus pass"};
  if(row.status==="reviewed")return{label:"FAIL",className:"learningStatus fail"};
  return{label:row.status.toUpperCase(),className:"learningStatus"};
}

export function WritingHistory(){
  const[rows,setRows]=useState<Summary[]>([]),[selected,setSelected]=useState(""),[detail,setDetail]=useState<Detail|null>(null),[loading,setLoading]=useState(true),[reviewing,setReviewing]=useState(false),[message,setMessage]=useState("");
  const loadRows=useCallback(async(preferred?:string)=>{const r=await fetch("/api/student/writing/submissions?limit=100",{cache:"no-store"});const b=await r.json().catch(()=>({})) as {submissions?:Summary[]};const list=b.submissions||[];setRows(list);setSelected(current=>preferred||current||list[0]?.id||"");setLoading(false);return list;},[]);
  useEffect(()=>{void loadRows()},[loadRows]);
  useEffect(()=>{if(!selected){setDetail(null);return}void fetch(`/api/student/writing/submissions/${selected}`,{cache:"no-store"}).then(async r=>r.ok?await r.json() as {submission?:Detail}:{}).then(b=>setDetail(b.submission||null))},[selected]);
  const feedback=useMemo(()=>json<Feedback>(detail?.feedback_json||null),[detail]);
  const body=useMemo(()=>json<{prompt?:string;writingType?:string}>(detail?.prompt_body_json||null),[detail]);

  async function reviewAgain(){
    if(!detail||reviewing)return;setReviewing(true);setMessage("Starting a new AI review version…");
    const r=await fetch(`/api/student/writing/submissions/${detail.id}/review`,{method:"POST"});
    const b=await r.json().catch(()=>({})) as {submissionId?:string;error?:string};
    if(!r.ok||!b.submissionId){setMessage(b.error||"Could not start review");setReviewing(false);return;}
    const nextId=b.submissionId;setSelected(nextId);await loadRows(nextId);
    for(let i=0;i<50;i++){
      await new Promise(resolve=>setTimeout(resolve,900));
      const q=await fetch(`/api/student/writing/submissions/${nextId}`,{cache:"no-store"});
      const d=await q.json().catch(()=>({})) as {submission?:Detail};
      if(d.submission){setDetail(d.submission);if(d.submission.status==="reviewed"||d.submission.status==="failed"){await loadRows(nextId);setMessage(d.submission.status==="reviewed"?(d.submission.passed?`Review complete: PASS ${d.submission.review_score??""}%`:`Review complete: FAIL ${d.submission.review_score??""}%. Edit and try again.`):"AI review failed. Your writing is preserved; you can review again.");setReviewing(false);return;}}
    }
    setMessage("Review is still running. This version is saved in Past work.");setReviewing(false);
  }

  if(loading)return <div className="emptyState">Loading your writing history…</div>;
  return <><div className="sectionHeading writingHistoryHeading"><div><span>Write · Past work</span><h1>Your writing history</h1><p>Every review is a version. Only a version that reaches the pass mark is PASS and can complete today&apos;s Writing task.</p></div><Link className="button primary" href="/learn/write">Start next writing</Link></div>
  {!rows.length?<div className="emptyState">No writing submissions yet. Complete your first writing task and it will appear here.</div>:<div className="writingHistoryLayout"><aside className="card writingHistoryList"><div className="cardHeader"><h2>Submissions</h2><span>{rows.length} saved</span></div>{rows.map(x=>{const st=statusOf(x);return <button key={x.id} className={selected===x.id?"writingHistoryItem active":"writingHistoryItem"} onClick={()=>{setSelected(x.id);setMessage("")}}><span><strong>{x.title}</strong><small>{x.school_level||""} · Version {x.versionNumber} · {x.word_count} words</small></span><span><b className={st.className}>{st.label}</b><small>{x.review_score!==null?`${x.review_score}% · `:""}{when(x.updated_at)}</small></span></button>})}</aside>
  <section className="readingPaper writingHistoryDetail">{detail?(()=>{const st=statusOf(detail);return <><div className="writingHistoryMeta"><div><span className="eyebrow">{body?.writingType||detail.school_level||"Writing"}</span><h2>{detail.prompt_title}</h2><p>{when(detail.created_at)} · {detail.word_count} words · <b className={st.className}>{st.label}</b>{detail.review_score!==null?` · ${detail.review_score}%`:""}</p></div></div>{body?.prompt&&<div className="notice writingPrompt">{body.prompt}</div>}
  <section className="writingHistorySection"><h3>Your submission</h3><div className="writingSubmissionText">{detail.submission_text}</div><div className="rowActions submissionActions"><Link className="button secondary" href={`/learn/write?submission=${encodeURIComponent(detail.id)}`}>Edit</Link><button className="button primary" disabled={reviewing||detail.status==="evaluating"} onClick={()=>void reviewAgain()}>{reviewing?"Reviewing…":detail.status==="evaluating"?"Review in progress":"Review"}</button></div>{message&&<div className="notice">{message}</div>}</section>
  {feedback&&<SelectionVocabulary contentId={detail.prompt_id} schoolLevel={detail.school_level||"P6"} className="selectableReview"><section className="writingHistorySection"><div className="sectionInlineHeading"><h3>AI review</h3><span className="muted">Select any word or phrase to add it to Vocabulary.</span></div><div className="writingScoreList">{Object.entries(feedback.scores||{}).map(([k,v])=><div className="masteryRow" key={k}><span>{k}</span><strong>{Math.round(v)}%</strong></div>)}</div>{feedback.strengths?.length?<><h3>Strengths</h3><ul>{feedback.strengths.map(x=><li key={x}>{x}</li>)}</ul></>:null}{feedback.improvements?.length?<><h3>Improve next</h3>{feedback.improvements.map((x,i)=><div className="practiceBox" key={`${x.area}-${i}`}><strong>{x.area}</strong><p>{x.hint}</p>{x.example&&<small>Example: {x.example}</small>}</div>)}</>:null}{feedback.overall&&<div className="notice">{feedback.overall}</div>}</section></SelectionVocabulary>}</>} )():<div className="emptyState">Select a saved submission.</div>}</section></div>}</>;
}
