"use client";
import { useEffect, useMemo, useState } from "react";
import type { LearnerVocabularyItem, VocabularyDetail } from "@/lib/vocabulary/types";
import { VocabularyDetailCard } from "@/components/vocabulary/vocabulary-detail-card";
import { PronounceButton } from "@/components/vocabulary/pronounce-button";
import type { LearningStage } from "@/lib/language/stages";

type Stats={total:number;due:number;phrases:number;mastered:number};
type Payload={items?:LearnerVocabularyItem[];stats?:Stats;error?:string};
const emptyStats:Stats={total:0,due:0,phrases:0,mastered:0};
function isDue(item:LearnerVocabularyItem){return !item.nextReviewAt||new Date(item.nextReviewAt).getTime()<=Date.now()}
function formatDue(value:string|null){if(!value)return "Now";const ms=new Date(value).getTime()-Date.now();if(ms<=0)return "Now";const d=Math.ceil(ms/86400000);if(d<=1)return "Tomorrow";return `in ${d} days`}

export function StudentVocabularyManager({schoolLevel="P6"}:{schoolLevel?:LearningStage}={}){
  const[items,setItems]=useState<LearnerVocabularyItem[]>([]);
  const[stats,setStats]=useState<Stats>(emptyStats);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState("");
  const[query,setQuery]=useState("");
  const[filter,setFilter]=useState<"all"|"due"|"word"|"phrase"|"mastered">("all");
  const[selected,setSelected]=useState<LearnerVocabularyItem|null>(null);
  const[reviewing,setReviewing]=useState(false);
  const[note,setNote]=useState("");
  const[manualOpen,setManualOpen]=useState(false);
  const[manualTerm,setManualTerm]=useState("");
  const[manualContext,setManualContext]=useState("");
  const[manualDetail,setManualDetail]=useState<VocabularyDetail|null>(null);
  const[manualBusy,setManualBusy]=useState(false);

  async function load(){
    setLoading(true);
    try{
      const r=await fetch("/api/student/vocabulary");
      const b=await r.json() as Payload;
      if(!r.ok)throw new Error(b.error||"Could not load vocabulary");
      setItems(b.items||[]);setStats(b.stats||emptyStats);
    }catch(e){setError(e instanceof Error?e.message:"Could not load vocabulary")}finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[]);

  const filtered=useMemo(()=>items.filter(item=>{
    const q=query.trim().toLowerCase();
    if(q&&!`${item.detail.term} ${item.detail.meanings.map(m=>m.definition).join(" ")} ${item.detail.collocations.join(" ")}`.toLowerCase().includes(q))return false;
    if(filter==="due"&&!isDue(item))return false;
    if(filter==="word"&&item.detail.entryType!=="word")return false;
    if(filter==="phrase"&&item.detail.entryType!=="phrase")return false;
    if(filter==="mastered"&&item.status!=="mastered"&&item.mastery<85)return false;
    return true;
  }),[items,query,filter]);
  const dueItems=items.filter(isDue);
  const reviewItem=dueItems[0]||null;

  async function rate(item:LearnerVocabularyItem,rating:"again"|"hard"|"good"|"easy"){
    const r=await fetch(`/api/student/vocabulary/${encodeURIComponent(item.id)}/review`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rating})});
    const b=await r.json() as {error?:string};
    if(!r.ok){setError(b.error||"Could not save review");return}
    await load();setSelected(null);
  }
  async function remove(item:LearnerVocabularyItem){
    if(!confirm(`Remove “${item.detail.term}” from your vocabulary?`))return;
    const r=await fetch(`/api/student/vocabulary/${encodeURIComponent(item.id)}`,{method:"DELETE"});
    if(r.ok){setSelected(null);await load()}
  }
  async function saveNote(item:LearnerVocabularyItem){
    const r=await fetch(`/api/student/vocabulary/${encodeURIComponent(item.id)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({note})});
    if(r.ok){await load();setSelected(v=>v?{...v,learnerNote:note}:v)}
  }
  async function explainManual(){
    const term=manualTerm.trim().replace(/\s+/g," ");
    if(!term){setError("Enter a word or phrase first.");return}
    setManualBusy(true);setError("");setManualDetail(null);
    try{
      const r=await fetch("/api/student/vocabulary/enrich",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({term,context:manualContext,schoolLevel})});
      const b=await r.json() as {detail?:VocabularyDetail;error?:string};
      if(!r.ok||!b.detail)throw new Error(b.error||"Could not explain vocabulary");
      setManualDetail(b.detail);
    }catch(e){setError(e instanceof Error?e.message:"Could not explain vocabulary")}finally{setManualBusy(false)}
  }


  async function saveManual(){
    if(!manualDetail)return;
    setManualBusy(true);setError("");
    try{
      const r=await fetch("/api/student/vocabulary",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({term:manualDetail.term,detail:manualDetail,sourceSentence:manualContext||null})});
      const b=await r.json() as {error?:string};
      if(!r.ok)throw new Error(b.error||"Could not save vocabulary");
      setManualOpen(false);setManualTerm("");setManualContext("");setManualDetail(null);await load();
    }catch(e){setError(e instanceof Error?e.message:"Could not save vocabulary")}finally{setManualBusy(false)}
  }

  if(loading)return <div className="emptyState">Loading your vocabulary…</div>;
  return <>
    <div className="vocabStats"><div><span>Total saved</span><strong>{stats.total}</strong></div><div><span>Due now</span><strong>{stats.due}</strong></div><div><span>Phrases</span><strong>{stats.phrases}</strong></div><div><span>Mastered</span><strong>{stats.mastered}</strong></div></div>
    {error&&<div className="notice warnNotice">{error}</div>}
    <section className="vocabToolbar card"><div className="vocabSearch"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search words, phrases, meanings or collocations…"/></div><div className="vocabFilters">{(["all","due","word","phrase","mastered"] as const).map(x=><button key={x} className={filter===x?"active":""} onClick={()=>setFilter(x)}>{x}</button>)}</div><div className="rowActions"><button className="button secondary" onClick={()=>setManualOpen(true)}>＋ Add word / phrase</button><button className="button primary" disabled={!dueItems.length} onClick={()=>setReviewing(true)}>Review due ({dueItems.length})</button></div></section>
    {!filtered.length?<div className="emptyState vocabEmpty"><h3>No vocabulary here yet</h3><p>Select a word or phrase in a reading/listening lesson and choose <b>Explain & save</b>, or add one manually. It will appear here with pronunciation, meanings, examples and review scheduling.</p></div>:<div className="vocabLibraryGrid">{filtered.map(item=><button className="vocabLibraryCard" key={item.id} onClick={()=>{setSelected(item);setNote(item.learnerNote||"")}}><div className="vocabCardTop"><span className="entryTypePill">{item.detail.entryType}</span><span className={`masteryBadge ${item.status}`}>{Math.round(item.mastery)}%</span></div><div className="vocabCardTerm"><strong>{item.detail.term}</strong><PronounceButton text={item.detail.term} compact/></div><div className="vocabCardMeta">{item.detail.phonetic||""}{item.detail.partOfSpeech?` · ${item.detail.partOfSpeech}`:""}</div><p>{item.detail.meanings[0]?.simple||item.detail.meanings[0]?.definition}</p>{item.sourceSentence&&<blockquote>{item.sourceSentence}</blockquote>}<div className="vocabCardFoot"><span>{item.status}</span><span>Review {formatDue(item.nextReviewAt)}</span></div></button>)}</div>}

    {selected?<div className="vocabDrawerBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div className="vocabDrawer wide"><button className="drawerClose" onClick={()=>setSelected(null)}>×</button><VocabularyDetailCard detail={selected.detail}/>{selected.contexts.length?<section className="vocabSection"><h4>Where you met it</h4>{selected.contexts.map((c,i)=><blockquote className="contextQuote" key={i}>{c.text}</blockquote>)}</section>:null}<section className="vocabSection"><h4>Your note</h4><textarea className="answerArea" value={note} onChange={e=>setNote(e.target.value)} placeholder="Write a memory hook, your own example, or anything you want to remember."/><button className="button secondary" onClick={()=>saveNote(selected)}>Save note</button></section><section className="reviewStrip"><div><span>Mastery</span><strong>{Math.round(selected.mastery)}%</strong><small>Next review: {formatDue(selected.nextReviewAt)}</small></div><div className="reviewRatings"><button onClick={()=>rate(selected,"again")}>Again<small>10 min</small></button><button onClick={()=>rate(selected,"hard")}>Hard<small>soon</small></button><button onClick={()=>rate(selected,"good")}>Good<small>space it</small></button><button onClick={()=>rate(selected,"easy")}>Easy<small>later</small></button></div></section><div className="drawerActions"><button className="button danger" onClick={()=>remove(selected)}>Remove from vocabulary</button><button className="button secondary" onClick={()=>setSelected(null)}>Close</button></div></div></div>:null}

    {reviewing&&reviewItem?<div className="vocabDrawerBackdrop"><div className="reviewModal"><button className="drawerClose" onClick={()=>setReviewing(false)}>×</button><div className="eyebrow">Spaced review · {dueItems.length} due</div><VocabularyDetailCard detail={reviewItem.detail}/>{reviewItem.sourceSentence&&<blockquote className="contextQuote">{reviewItem.sourceSentence}</blockquote>}<div className="reviewPrompt">How well did you remember it?</div><div className="reviewRatings large"><button onClick={()=>rate(reviewItem,"again")}>Again<small>forgot it</small></button><button onClick={()=>rate(reviewItem,"hard")}>Hard<small>needed effort</small></button><button onClick={()=>rate(reviewItem,"good")}>Good<small>remembered</small></button><button onClick={()=>rate(reviewItem,"easy")}>Easy<small>instant recall</small></button></div></div></div>:null}

    {manualOpen?<div className="vocabDrawerBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setManualOpen(false)}}><div className="vocabDrawer wide"><button className="drawerClose" onClick={()=>setManualOpen(false)}>×</button><div className="eyebrow">Add vocabulary</div><h2>Add a word or phrase</h2><p className="muted">You can save single words, phrasal verbs, idioms, collocations and short useful expressions.</p><div className="manualVocabForm"><label>Word or phrase<input value={manualTerm} onChange={e=>setManualTerm(e.target.value)} placeholder="e.g. reluctant / take responsibility / in the long run" maxLength={90}/></label><label>Optional context<textarea value={manualContext} onChange={e=>setManualContext(e.target.value)} placeholder="Paste the sentence where you saw or heard it. Context helps the explanation match the exact meaning." maxLength={700}/></label><button className="button primary" onClick={explainManual} disabled={manualBusy}>{manualBusy?"Building card…":"Explain"}</button></div>{manualDetail&&<><VocabularyDetailCard detail={manualDetail}/><div className="drawerActions"><button className="button primary" onClick={saveManual} disabled={manualBusy}>Save to my vocabulary</button></div></>}</div></div>:null}
  </>;
}
