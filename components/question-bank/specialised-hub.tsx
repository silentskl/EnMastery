"use client";
import{useEffect,useState}from"react";import Link from"next/link";
type Counts=Record<"oral"|"reading_comprehension"|"cloze"|"writing",number>;
const cards=[
 {id:"oral",title:"Oral",desc:"Reading aloud, stimulus-based and developed-response prompts.",icon:"SP"},
 {id:"reading_comprehension",title:"Reading comprehension",desc:"Standalone passages with comprehension questions.",icon:"RE"},
 {id:"cloze",title:"Cloze",desc:"Vocabulary and grammar cloze with PSLE-level distractors.",icon:"CL"},
 {id:"writing",title:"Writing",desc:"Situational and continuous writing prompts from the writing bank.",icon:"WR"},
] as const;
export function SpecialisedHub({mode}:{mode:"practice"|"exam"}){const[counts,setCounts]=useState<Counts>({oral:0,reading_comprehension:0,cloze:0,writing:0});useEffect(()=>{fetch("/api/student/question-bank/sessions").then(r=>r.json() as Promise<{categories?:Partial<Counts>}>).then(b=>setCounts(v=>({...v,...b.categories}))).catch(()=>{})},[]);return <div className="activityGrid specialisedGrid">{cards.map(c=><Link className="activityCard" href={`/${mode}/specialised/${c.id}`} key={c.id}><div className="skillIcon">{c.icon}</div><div className="specialisedCardBody"><div className="activityKicker">Question bank · {mode}</div><h3>{c.title}</h3><p>{c.desc}</p><span className="activityMeta">{counts[c.id]} published items</span></div></Link>)}</div>}
