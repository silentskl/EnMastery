"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type Row={id:string;title:string;school_level:string;topic?:string;description?:string;media_kind:string;provider:string;thumbnail_url?:string|null;duration_seconds?:number|null;progress_percent:number;progress_status:string;question_count:number};
const levels=["P5","P6"] as const;
export function StudentListeningLibrary(){
  const [level,setLevel]=useState<"P5"|"P6">("P6");
  const [rows,setRows]=useState<Row[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(true);
  useEffect(()=>{
    let live=true;setError("");setLoading(true);
    void fetch("/api/student/listening?level="+level,{cache:"no-store"}).then(async r=>{
      const body=await r.json() as {contents?:Row[];error?:string};
      if(!r.ok)throw new Error(body.error||"Listening lessons could not be loaded");
      if(live)setRows((body.contents||[]).filter(row=>row.question_count>0));
    }).catch(e=>{if(live)setError(e instanceof Error?e.message:"Listening lessons could not be loaded")}).finally(()=>{if(live)setLoading(false)});
    return()=>{live=false};
  },[level]);
  return <><div className="libraryToolbar"><div className="tabs">{levels.map(stage=><button key={stage} className={level===stage?"active":""} onClick={()=>setLevel(stage)}>{stage}</button>)}</div><span>{rows.length} PSLE listening activities</span></div>
    {error&&<div className="notice warnNotice">{error}</div>}
    {loading?<div className="emptyState">Loading listening activities…</div>:!rows.length?<div className="emptyState"><strong>No published {level} listening comprehension activities yet.</strong><p>Your administrator can publish audio lessons with well-grounded multiple-choice questions.</p></div>
    :<div className="listeningLibraryGrid">{rows.map(row=><Link className="listeningLessonCard" href={"/learn/listen/"+encodeURIComponent(row.id)} key={row.id}>
      <div className="listenThumb">{row.thumbnail_url?<img src={row.thumbnail_url} alt=""/>:<span>♫</span>}<b>{row.media_kind==="owned_audio"?"Audio":"Listening media"}</b></div>
      <div className="listenCardBody"><div className="activityKicker">{row.school_level} · {row.provider}</div><h3>{row.title}</h3><p>{row.description||"Practise listening for meaning and detail."}</p>
        <div className="listenMeta"><span>{row.question_count} questions</span>{row.duration_seconds&&<span>{Math.ceil(row.duration_seconds/60)} min</span>}<span>{row.progress_percent||0}% complete</span></div>
        <div className="bar"><span style={{width:String(row.progress_percent||0)+"%"}}/></div>
        {row.progress_status==="completed"&&<div className="learningStatus pass" style={{marginTop:10}}>Completed · practise again</div>}
      </div>
    </Link>)}</div>}
  </>;
}
