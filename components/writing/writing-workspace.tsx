"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SelectionVocabulary } from "@/components/vocabulary/selection-vocabulary";

type PromptRow={id:string;title:string;school_level:string;topic?:string|null;description?:string|null;body_json:string;reviewed_count?:number;passed_count?:number;last_reviewed_at?:string|null;completed?:boolean};
type PromptPayload={prompts?:PromptRow[];nextPromptId?:string|null;lockedPromptId?:string|null;allCompleted?:boolean;completedCount?:number;totalCount?:number;passMark?:number;writingMinimumWords?:number};
type Body={writingType?:string;prompt?:string;minimumWords?:number;planningPrompts?:string[];picturePrompts?:string[]};
type Feedback={scores?:Record<string,number>;strengths?:string[];improvements?:Array<{area:string;hint:string;example?:string}>;overall?:string;reviewScore?:number;passed?:boolean;passMark?:number};
type SubmissionDetail={id?:string;prompt_id?:string;submission_text?:string;plan_json?:string|null;status:string;feedback_json?:string|null;review_score?:number|null;passed?:number;passed_at?:string|null;prompt_title?:string;school_level?:string|null;topic?:string|null;prompt_body_json?:string|null};

function readBody(row?:PromptRow):Body{if(!row)return{};try{return JSON.parse(row.body_json) as Body}catch{return{}}}
function readPlan(text?:string|null){if(!text)return"";try{const x=JSON.parse(text) as {notes?:unknown};return typeof x.notes==="string"?x.notes:""}catch{return""}}

export function WritingWorkspace(){
  const[prompts,setPrompts]=useState<PromptRow[]>([]),[selected,setSelected]=useState(""),[nextPromptId,setNextPromptId]=useState<string|null>(null),[lockedPromptId,setLockedPromptId]=useState<string|null>(null),[allCompleted,setAllCompleted]=useState(false),[completedCount,setCompletedCount]=useState(0),[passMark,setPassMark]=useState(60),[tenantMinimumWords,setTenantMinimumWords]=useState(120);
  const[text,setText]=useState(""),[plan,setPlan]=useState(""),[msg,setMsg]=useState(""),[feedback,setFeedback]=useState<Feedback|null>(null),[reviewScore,setReviewScore]=useState<number|null>(null),[passed,setPassed]=useState(false),[busy,setBusy]=useState(false),[sourceSubmissionId,setSourceSubmissionId]=useState<string|null>(null);

  const loadPrompts=useCallback(async(initial=false)=>{
    const r=await fetch("/api/student/writing/prompts",{cache:"no-store"});
    const b=await r.json().catch(()=>({})) as PromptPayload,items=b.prompts||[];
    setPrompts(items);setNextPromptId(b.nextPromptId||null);setLockedPromptId(b.lockedPromptId||null);setAllCompleted(Boolean(b.allCompleted));setCompletedCount(Number(b.completedCount||0));setPassMark(Number(b.passMark||60));setTenantMinimumWords(Math.max(40,Number(b.writingMinimumWords||120)));
    if(initial){const requested=typeof window!=="undefined"?new URLSearchParams(window.location.search).get("prompt"):null,requestedRow=requested?items.find(x=>x.id===requested):undefined,forced=b.lockedPromptId||null,canUseRequested=Boolean(requestedRow)&&(!requestedRow?.completed||Boolean(b.allCompleted))&&!forced;setSelected(forced||(canUseRequested?requested!:b.nextPromptId||items[0]?.id||""));}
    return b;
  },[]);

  useEffect(()=>{void(async()=>{await loadPrompts(true);if(typeof window==="undefined")return;const submissionId=new URLSearchParams(window.location.search).get("submission");if(!submissionId)return;const r=await fetch(`/api/student/writing/submissions/${encodeURIComponent(submissionId)}`,{cache:"no-store"});const b=await r.json().catch(()=>({})) as {submission?:SubmissionDetail};const d=b.submission;if(!r.ok||!d?.prompt_id)return;if(!prompts.some(x=>x.id===d.prompt_id)&&d.prompt_body_json){setPrompts(current=>current.some(x=>x.id===d.prompt_id)?current:[...current,{id:d.prompt_id!,title:d.prompt_title||"Writing task",school_level:d.school_level||"P6",topic:d.topic||null,body_json:d.prompt_body_json!,completed:Boolean(d.passed)}])}setSelected(d.prompt_id);setText(d.submission_text||"");setPlan(readPlan(d.plan_json));setSourceSubmissionId(submissionId);setFeedback(null);setReviewScore(null);setPassed(false);setMsg("Loaded from Past work. Edit your writing, then Save & review to create a new version.");})()},[loadPrompts]);

  const p=prompts.find(x=>x.id===selected),body=readBody(p);
  const activePrompts=useMemo(()=>lockedPromptId?prompts.filter(x=>x.id===lockedPromptId):allCompleted?prompts:prompts.filter(x=>!x.completed||x.id===selected),[allCompleted,lockedPromptId,prompts,selected]);
  const hasNext=Boolean(nextPromptId&&nextPromptId!==selected);
  function choosePrompt(id:string){if(lockedPromptId&&id!==lockedPromptId)return;setSelected(id);setText("");setPlan("");setFeedback(null);setReviewScore(null);setPassed(false);setSourceSubmissionId(null);setMsg("");}

  async function submit(){
    if(!p)return;setBusy(true);setFeedback(null);setReviewScore(null);setPassed(false);setMsg("Saving submission and starting AI review…");
    const r=await fetch("/api/student/writing/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({promptId:p.id,text,plan:{notes:plan},sourceSubmissionId})});
    const b=await r.json().catch(()=>({})) as {submissionId?:string;error?:string;lockedPromptId?:string};
    if(!r.ok||!b.submissionId){setBusy(false);setMsg(b.error||"Could not submit");if(b.lockedPromptId)setLockedPromptId(b.lockedPromptId);return;}
    setSourceSubmissionId(b.submissionId);
    for(let i=0;i<50;i++){
      await new Promise(x=>setTimeout(x,900));
      const q=await fetch(`/api/student/writing/submissions/${b.submissionId}`,{cache:"no-store"});
      const d=await q.json().catch(()=>({})) as {submission?:SubmissionDetail};
      if(d.submission?.status==="reviewed"){
        const fb=d.submission.feedback_json?JSON.parse(d.submission.feedback_json) as Feedback:{};
        const score=Number(d.submission.review_score??fb.reviewScore??0),ok=Boolean(d.submission.passed)&&score>=passMark;
        setFeedback(fb);setReviewScore(score);setPassed(ok);const refreshed=await loadPrompts(false);
        if(ok){setMsg(`PASS ${score}%. Today’s Writing task is complete.${refreshed.nextPromptId&&refreshed.nextPromptId!==p.id?" Start the next writing when you are ready.":""}`);if(typeof window!=="undefined")window.dispatchEvent(new Event("daily-game-reward-unlocked"));}
        else setMsg(`FAIL ${score}%. You need ${passMark}% or above. Edit this composition using the review, then submit a new version.`);
        setBusy(false);return;
      }
      if(d.submission?.status==="failed"){setMsg("AI review failed. Your submission is saved in Past work; use Review there to retry without losing your writing.");setBusy(false);return;}
    }
    setMsg("Review is still running. Your submission is saved in Past work.");setBusy(false);
  }

  const wordCount=text.trim()?text.trim().split(/\s+/).length:0;
  return <>
    <div className="sectionHeading writingPageHeading"><div><span>Write</span><h1>Plan. Write. Revise.</h1><p>AI review must reach {passMark}% before the writing is PASS. A lower score is FAIL and does not count toward today&apos;s mission.</p></div><div className="rowActions writingHeaderActions"><Link className="button secondary" href="/learn/write/history">Past work</Link></div></div>
    {prompts.length>0&&<div className="writingProgressNotice"><strong>{completedCount}/{prompts.length} writing tasks passed</strong><span>{lockedPromptId?`Revision required: pass the current writing at ${passMark}%+ before another prompt unlocks.`:allCompleted?"All current tasks are passed. You may revisit earlier writing.":"A new prompt unlocks only after the current writing reaches the pass mark."}</span></div>}
    <div className="readingGrid writingLayout"><section className="readingPaper writingPaper">
      <label className="fieldLabel writingTaskField"><span>{sourceSubmissionId?"Editing a Past work version":lockedPromptId?"Revision required":allCompleted?"Review or practise again":"Current writing task"}</span><select value={selected} disabled={Boolean(lockedPromptId)||Boolean(sourceSubmissionId)} onChange={e=>choosePrompt(e.target.value)}>{activePrompts.map(x=><option value={x.id} key={x.id}>{x.school_level} · {x.title}{x.completed?" · passed":""}</option>)}</select></label>
      <div className="eyebrow">{body.writingType||"writing"}</div><h2>{p?.title}</h2><div className="notice writingPrompt">{body.prompt}</div>{body.picturePrompts&&body.picturePrompts.length>0&&<div className="writingPicturePrompts"><div className="writingPictureHeading"><strong>Picture prompts</strong><span>Use at least one idea. You may interpret it creatively.</span></div><div className="writingPictureGrid">{body.picturePrompts.map((x,i)=><div className="writingPictureCard" key={`${i}-${x}`}><span>Picture {i+1}</span><p>{x}</p></div>)}</div></div>}
      <div className="writingEditorGrid"><label className="fieldLabel"><span>Plan</span><textarea className="writingPlanInput" value={plan} onChange={e=>setPlan(e.target.value)} placeholder={(body.planningPrompts||[]).join("\n")}/></label><label className="fieldLabel"><span>Your writing</span><textarea className="writingDraftInput" value={text} onChange={e=>setText(e.target.value)} placeholder="Write your composition here…"/></label></div>
      <div className="rowActions writingActions"><span className="writingWordCount">{wordCount} words · target {tenantMinimumWords}+</span><div className="rowActions"><button className="button primary" disabled={busy||wordCount<tenantMinimumWords} onClick={()=>void submit()}>{busy?"Reviewing…":sourceSubmissionId?"Save revised version & review":feedback&&!passed?"Submit revised version":"Save & review"}</button>{sourceSubmissionId&&<Link className="button ghost" href="/learn/write/history">Cancel edit</Link>}{!allCompleted&&<button className="button secondary" disabled={!passed||!hasNext} onClick={()=>passed&&hasNext&&choosePrompt(nextPromptId!)}>Start next writing →</button>}</div></div>
    </section>
    <aside className="coachPanel writingCoach"><div className="panelTabs"><b>Writing coach</b><span>{msg}</span></div>{feedback?<SelectionVocabulary contentId={p?.id} schoolLevel={p?.school_level||"P6"} className="selectableReview"><div className="wordCard">{reviewScore!==null&&<div className={passed?"writingPassBanner passed":"writingPassBanner revise"}><strong>{reviewScore}%</strong><span>{passed?`PASS · ${passMark}%+ required`:`FAIL · revise until ${passMark}%+`}</span></div>}<div className="reviewSelectionHint">Select any word or phrase in the AI review to add it to Vocabulary.</div><h3>Scores</h3><div className="writingScoreList">{Object.entries(feedback.scores||{}).map(([k,v])=><div className="masteryRow" key={k}><span>{k}</span><strong>{Math.round(v)}%</strong></div>)}</div><h3>Strengths</h3><ul>{feedback.strengths?.map(x=><li key={x}>{x}</li>)}</ul><h3>{passed?"Keep improving":"Revise these before resubmitting"}</h3>{feedback.improvements?.map((x,i)=><div className="practiceBox" key={`${x.area}-${i}`}><strong>{x.area}</strong><p>{x.hint}</p>{x.example&&<small>Example: {x.example}</small>}</div>)}{feedback.overall&&<div className="notice">{feedback.overall}</div>}</div></SelectionVocabulary>:<div className="wordCard"><p>Write your own response. A Writing task is completed only when AI review reaches {passMark}% or above. Lower scores remain FAIL and must be revised.</p></div>}</aside></div>
  </>;
}
