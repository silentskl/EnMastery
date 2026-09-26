"use client";
import { useEffect, useMemo, useState } from "react";

type Domain = "listen" | "speak" | "read" | "write";
type Level = "P1-P4" | "P5" | "P6" | "S1" | "S2" | "S3" | "S4";
type Row = { schoolLevel: Level; domain: Domain; published: number; lessonLimit: number };
type WordBook={id:string;name:string;code:string|null;stage:string|null;cefrLevel:string|null;itemCount:number};
type DailyTaskPolicy = { schoolLevel: Level; listenVideoMaxSeconds: number; readMaxWords: number; vocabularyDailyWords:number; vocabularyNewWords:number; vocabularyReviewWords:number; vocabularySpellingRepetitions:number; vocabularyCollectionId:string|null; writingWeekdays:number[]; writingMinWords:number };
const levels: Level[] = ["P1-P4", "P5", "P6", "S1", "S2", "S3", "S4"];
const meta: Record<Domain, { label: string; detail: string }> = {
  listen: { label: "Listening", detail: "Audio, video and intensive listening lessons" },
  speak: { label: "Speaking", detail: "Reading Aloud, AI conversation and stimulus communication" },
  read: { label: "Reading", detail: "Guided reading and comprehension lessons" },
  write: { label: "Writing", detail: "Situational and Continuous Writing tasks" },
};
const weekdays=[{n:1,l:"Mon"},{n:2,l:"Tue"},{n:3,l:"Wed"},{n:4,l:"Thu"},{n:5,l:"Fri"},{n:6,l:"Sat"},{n:7,l:"Sun"}];
const displayLevel=(value:Level)=>value==="P1-P4"?"P1–P4":value;

export function TenantLearnSettings() {
  const [level, setLevel] = useState<Level>("P6");
  const [rows, setRows] = useState<Row[]>([]);
  const [policies, setPolicies] = useState<DailyTaskPolicy[]>([]);
  const [wordBooks,setWordBooks]=useState<WordBook[]>([]);
  const [draft, setDraft] = useState<Record<Domain, number>>({ listen: 0, speak: 0, read: 0, write: 0 });
  const [listenVideoMaxMinutes, setListenVideoMaxMinutes] = useState(0);
  const [readMaxWords, setReadMaxWords] = useState(0);
  const [vocabularyNewWords,setVocabularyNewWords]=useState(10);
  const [vocabularyReviewWords,setVocabularyReviewWords]=useState(10);
  const [vocabularySpellingRepetitions,setVocabularySpellingRepetitions]=useState(3);
  const [vocabularyCollectionId,setVocabularyCollectionId]=useState("");
  const [writingWeekdays,setWritingWeekdays]=useState<number[]>([1,3,5]);
  const [writingMinWords,setWritingMinWords]=useState(120);
  const [passScore, setPassScore] = useState(60);
  const [dailyGameMinutes,setDailyGameMinutes]=useState(10);
  const [lessonRepeatCooldownDays,setLessonRepeatCooldownDays]=useState(7);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/admin/learn-settings", { cache: "no-store" });
    const b = await r.json().catch(() => ({})) as { settings?: Row[]; dailyTaskPolicies?: DailyTaskPolicy[]; vocabularyCollections?:WordBook[]; passScore?: number; dailyGameMinutes?:number; lessonRepeatCooldownDays?:number };
    setRows(b.settings || []);setPolicies(b.dailyTaskPolicies || []);setWordBooks(b.vocabularyCollections||[]);
    setPassScore(Math.max(1, Math.min(100, Number(b.passScore) || 60)));setDailyGameMinutes(Math.max(0,Math.min(60,Number(b.dailyGameMinutes)??10)));setLessonRepeatCooldownDays(Math.max(7,Math.min(90,Number(b.lessonRepeatCooldownDays)??7)));
  }
  useEffect(() => { void load(); }, []);
  const current = useMemo(() => rows.filter((x) => x.schoolLevel === level), [rows, level]);
  const currentPolicy = useMemo(() => policies.find((x) => x.schoolLevel === level), [policies, level]);
  useEffect(() => {
    if (current.length) { const next: Record<Domain, number> = { listen: 0, speak: 0, read: 0, write: 0 }; for (const row of current) next[row.domain] = row.lessonLimit; setDraft(next); }
    setListenVideoMaxMinutes(Math.round(Number(currentPolicy?.listenVideoMaxSeconds || 0) / 60));
    setReadMaxWords(Number(currentPolicy?.readMaxWords || 0));setVocabularyNewWords(Number(currentPolicy?.vocabularyNewWords ?? currentPolicy?.vocabularyDailyWords ?? 10));setVocabularyReviewWords(Number(currentPolicy?.vocabularyReviewWords ?? 10));setVocabularySpellingRepetitions(Number(currentPolicy?.vocabularySpellingRepetitions ?? 3));
    setVocabularyCollectionId(currentPolicy?.vocabularyCollectionId||wordBooks.find(b=>b.stage===level)?.id||wordBooks[0]?.id||"");
    setWritingWeekdays(Array.isArray(currentPolicy?.writingWeekdays)&&currentPolicy.writingWeekdays.length?currentPolicy.writingWeekdays:[1,3,5]);
    setWritingMinWords(Number(currentPolicy?.writingMinWords||120));
  }, [current, currentPolicy,level,wordBooks]);

  function toggleWeekday(n:number){setWritingWeekdays(v=>v.includes(n)?(v.length>1?v.filter(x=>x!==n):v):[...v,n].sort((a,b)=>a-b));}
  async function save() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/learn-settings", {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      schoolLevel:level,limits:draft,passScore,dailyGameMinutes,lessonRepeatCooldownDays,dailyTaskPolicy:{listenVideoMaxSeconds:Math.max(0,Math.min(120,listenVideoMaxMinutes))*60,readMaxWords:Math.max(0,Math.min(10000,readMaxWords)),vocabularyDailyWords:vocabularyNewWords,vocabularyNewWords,vocabularyReviewWords,vocabularySpellingRepetitions,vocabularyCollectionId,writingWeekdays,writingMinWords}
    })});
    const b = await r.json().catch(() => ({})) as { error?: string }; setBusy(false);
    setMsg(r.ok ? `${displayLevel(level)} learning settings saved. Future unstarted Daily Tasks will use the new policy.` : b.error || "Could not save settings");if (r.ok) await load();
  }

  return <>
    <section className="card compactPolicyCard"><div className="cardHeader"><div><h2>Tenant learning rules</h2><p>Global mastery and reward rules for this organisation.</p></div><div className="globalPolicyFields"><label className="compactScoreField"><span>Passing score (%)</span><div className="settingsNumberWithUnit"><input aria-label="Mastery passing score" type="number" min={1} max={100} value={passScore} onChange={(e)=>setPassScore(Math.max(1,Math.min(100,Number(e.target.value)||60)))}/><span>%</span></div></label><label className="compactScoreField"><span>Daily game limit</span><div className="settingsNumberWithUnit"><input aria-label="Daily game time limit" type="number" min={0} max={60} value={dailyGameMinutes} onChange={e=>setDailyGameMinutes(Math.max(0,Math.min(60,Number(e.target.value)||0)))}/><span>min</span></div></label><label className="compactScoreField"><span>Lesson repeat cooldown</span><div className="settingsNumberWithUnit"><input aria-label="Lesson repeat cooldown days" type="number" min={7} max={90} value={lessonRepeatCooldownDays} onChange={e=>setLessonRepeatCooldownDays(Math.max(7,Math.min(90,Number(e.target.value)||7)))}/><span>days</span></div></label></div></div><p className="sourceHint">Game time unlocks only after today’s required Listening, Speaking, Reading, Writing (when scheduled) and Vocabulary tasks are all completed. 0 disables game rewards. Daily Learning will not select a lesson assigned within the configured cooldown. The minimum and default is 7 days; higher values extend the no-repeat window.</p></section>
    <div className="tabs settingsStageTabs">{levels.map((x)=><button type="button" key={x} className={level===x?"active":""} onClick={()=>setLevel(x)}>{displayLevel(x)}</button>)}</div>
    <section className="card settingsTableCard">
      <div className="cardHeader"><div><h2>{displayLevel(level)} learning policy</h2><p>Student access, Daily Learning targets and eligibility filters in one table. A filter value of 0 means no maximum.</p></div></div>
      <div className="settingsTableWrap"><table className="dataTable settingsTable learnSettingsTable"><thead><tr><th>Learning area</th><th>Published</th><th>Student access / daily target</th><th>Daily Learning rule</th><th>Notes</th></tr></thead><tbody>
        {(["listen","speak","read","write"] as Domain[]).map((domain)=>{const row=current.find((x)=>x.domain===domain),m=meta[domain];return <tr key={domain}><td><strong>{m.label}</strong><small>{m.detail}</small></td><td>{row?.published||0}</td><td><div className="settingsNumberWithUnit"><input aria-label={`${m.label} lessons visible`} type="number" min={0} max={200} value={draft[domain]} onChange={(e)=>setDraft((v)=>({...v,[domain]:Math.max(0,Math.min(200,Number(e.target.value)||0))}))}/><span>lessons</span></div></td><td>{domain==="listen"?<div className="settingsNumberWithUnit"><input aria-label="Listening maximum video duration" type="number" min={0} max={120} value={listenVideoMaxMinutes} onChange={(e)=>setListenVideoMaxMinutes(Math.max(0,Math.min(120,Number(e.target.value)||0)))}/><span>min video max</span></div>:domain==="read"?<div className="settingsNumberWithUnit"><input aria-label="Reading maximum words" type="number" min={0} max={10000} value={readMaxWords} onChange={(e)=>setReadMaxWords(Math.max(0,Math.min(10000,Number(e.target.value)||0)))}/><span>words max</span></div>:domain==="write"?<div className="writingPolicyCell"><div className="weekdayChecks">{weekdays.map(d=><label key={d.n} className={writingWeekdays.includes(d.n)?"weekdayChip active":"weekdayChip"}><input type="checkbox" checked={writingWeekdays.includes(d.n)} onChange={()=>toggleWeekday(d.n)}/><span>{d.l}</span></label>)}</div><div className="settingsNumberWithUnit"><input aria-label="Writing minimum words" type="number" min={40} max={1000} value={writingMinWords} onChange={e=>setWritingMinWords(Math.max(40,Math.min(1000,Number(e.target.value)||120)))}/><span>min words</span></div></div>:<span className="settingsDash">—</span>}</td><td><span className="settingsRuleText">Students see up to {Math.min(draft[domain],row?.published||0)} published lesson{Math.min(draft[domain],row?.published||0)===1?"":"s"}.{domain==="listen"?" Video lessons above the maximum are excluded from Daily Learning.":domain==="read"?" Longer readings are excluded from Daily Learning.":domain==="write"?` Writing appears on ${writingWeekdays.length} selected day${writingWeekdays.length===1?"":"s"} per week and submissions must reach ${writingMinWords} words.`:""}</span></td></tr>})}
        <tr><td><strong>Vocabulary</strong><small>Daily new learning + scheduled review</small></td><td><span className="settingsDash">—</span></td><td><div className="writingPolicyCell"><div className="settingsNumberWithUnit"><input aria-label="Vocabulary new words per day" type="number" min={1} max={50} value={vocabularyNewWords} onChange={(e)=>setVocabularyNewWords(Math.max(1,Math.min(50,Number(e.target.value)||10)))}/><span>new/day</span></div><div className="settingsNumberWithUnit"><input aria-label="Vocabulary review words per day" type="number" min={0} max={100} value={vocabularyReviewWords} onChange={(e)=>setVocabularyReviewWords(Math.max(0,Math.min(100,Number(e.target.value)||0)))}/><span>review/day</span></div><div className="settingsNumberWithUnit"><input aria-label="Vocabulary spelling repetitions" type="number" min={1} max={10} value={vocabularySpellingRepetitions} onChange={(e)=>setVocabularySpellingRepetitions(Math.max(1,Math.min(10,Number(e.target.value)||3)))}/><span>dictations/word</span></div></div></td><td><label><span className="fieldLabel">Use for daily learning</span><select aria-label="Vocabulary learning word book" value={vocabularyCollectionId} onChange={e=>setVocabularyCollectionId(e.target.value)}>{wordBooks.map(b=><option key={b.id} value={b.id}>{b.name} · {b.itemCount} terms</option>)}</select></label></td><td><span className="settingsRuleText">New Learning takes unseen terms. Review takes due learned terms. Both use Chinese meaning + listen/read aloud → repeated dictation → English-definition choice → cloze.</span></td></tr>
      </tbody></table></div>
      <div className="sourceHint settingsTableHint">When a Listening video duration or Reading word count is unknown, that lesson is skipped whenever the corresponding maximum is configured. Audio-only Listening lessons are not restricted by the video-duration limit.</div>
    </section>
    <div className="rowActions settingsSaveRow"><button className="button primary" disabled={busy||!vocabularyCollectionId} onClick={()=>void save()}>{busy?"Saving…":`Save ${displayLevel(level)} learning settings`}</button>{msg&&<span className="formStatus">{msg}</span>}</div>
  </>;
}

// Daily Vocabulary policy: Students cannot change the word book or daily vocabulary targets.
