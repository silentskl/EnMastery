"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

type Question = {
  id: string;
  itemOrder: number;
  term: string;
  stem: string;
  options: string[];
  selectedIndex: number | null;
  correct: boolean | null;
  answerIndex: number | null;
  explanation: string;
  answeredAt: string | null;
};

type ClozeItem = {
  index: number;
  kind: "synonym_choice" | "fill";
  targetWord: string;
  options: string[];
};

type Attempt = {
  id: string;
  answers: string[];
  correctness: boolean[];
  correctCount: number;
  totalCount: number;
  passed: boolean;
  createdAt: string;
};

type State = {
  session: {
    id: string;
    taskDate: string;
    schoolLevel: string;
    dailyTarget: number;
    status: "collecting" | "cloze_ready" | "passed";
    wordsCompleted: number;
    clozeTitle: string | null;
    clozePassage: string | null;
    clozeGeneratedAt: string | null;
    passedAt: string | null;
  };
  questions: Question[];
  clozeItems: ClozeItem[];
  wordBank: string[];
  clozeAttempts: Attempt[];
};

async function readState(response: Response) {
  const body = await response.json().catch(() => ({})) as State & { error?: string };
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
}

export function VocabularySpecialistWorkspace() {
  const [data, setData] = useState<State | null>(null);
  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const autoRef = useRef(false);

  async function load() {
    setError("");
    try {
      const next = await readState(await fetch("/api/student/vocabulary-specialist", { cache: "no-store" }));
      setData(next);
      if (next.session.clozePassage) {
        setAnswers(old => Array.from({ length: next.clozeItems.length }, (_, i) => old[i] || ""));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load practice");
    }
  }

  useEffect(() => { void load(); }, []);

  const unanswered = data?.questions.find(q => !q.answeredAt) || null;
  const feedback = feedbackId ? data?.questions.find(q => q.id === feedbackId) || null : null;
  const activeQuestion = unanswered || feedback;
  const answered = data?.questions.filter(q => q.answeredAt).length || 0;
  const total = data?.session.dailyTarget || 0;

  async function action(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const next = await readState(await fetch("/api/student/vocabulary-specialist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }));
      setData(next);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Practice request failed");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function addWord() {
    const value = term.trim();
    if (!value) return;
    const next = await action({ action: "add_word", term: value });
    if (next) {
      setTerm("");
      setSelected(null);
      setFeedbackId(null);
    }
  }

  async function answerQuestion(q: Question, index: number) {
    if (q.answeredAt || busy) return;
    setSelected(index);
    const next = await action({ action: "answer_question", questionId: q.id, selectedIndex: index });
    if (next) setFeedbackId(q.id);
  }

  async function generateCloze() {
    autoRef.current = true;
    const next = await action({ action: "generate_cloze" });
    if (!next) autoRef.current = false;
    else setAnswers(Array.from({ length: next.clozeItems.length }, () => ""));
  }

  useEffect(() => {
    if (!data || busy || autoRef.current || data.session.clozePassage || data.session.status !== "collecting") return;
    if (data.questions.length === data.session.dailyTarget && data.questions.every(q => q.answeredAt)) void generateCloze();
  }, [data, busy]);

  async function submitCloze() {
    if (!data) return;
    await action({ action: "submit_cloze", answers });
  }

  const latestAttempt = data?.clozeAttempts[0] || null;
  const passageParts = useMemo(() => data?.session.clozePassage?.split(/(\{\{\d+\}\})/g) || [], [data?.session.clozePassage]);
  const clozeByIndex = useMemo(() => new Map((data?.clozeItems || []).map(item => [item.index, item])), [data?.clozeItems]);

  if (!data) {
    return <section className="card vocabSpecialLoading">
      <h2>Vocabulary Specialist</h2>
      <p>{error || "Loading today's specialist practice…"}</p>
      {error && <button className="button secondary" onClick={() => void load()}>Retry</button>}
    </section>;
  }

  const percent = Math.round((Math.min(answered, total) / Math.max(total, 1)) * 100);
  const clozeCount = data.clozeItems.length;

  return <div className="vocabSpecialLayout">
    <section className="card vocabSpecialMain">
      <div className="vocabSpecialTop">
        <div>
          <div className="eyebrow">{data.session.schoolLevel} · {data.session.taskDate}</div>
          <h2>{data.session.status === "passed" ? "Today's specialist practice is complete" : "Build today's vocabulary set"}</h2>
          <p>Enter one English word or multi-word phrase at a time. Each term creates one original PSLE-style four-option question. The term you enter may be the correct answer or a distractor. After all {total} terms, the final 400–500 word passage uses 10 selected terms: 5 synonym/near-synonym choices and 5 direct fill-ins.</p>
        </div>
        <div className="vocabSpecialCounter"><strong>{answered}/{total}</strong><span>MCQs answered</span></div>
      </div>
      <div className="progressBar"><span style={{ width: `${percent}%` }} /></div>
      {error && <div className="notice warnNotice">{error}</div>}

      {data.session.status === "passed" ? <div className="vocabSpecialPassed">
        <div className="vocabSpecialPassIcon">✓</div>
        <h2>PASS</h2>
        <p>You answered all 10 mixed cloze items correctly. Today's vocabulary set and all attempts are saved.</p>
        <div className="rowActions">
          <Link className="button primary" href="/practice/vocabulary-specialist/history">View learning record</Link>
          <Link className="button secondary" href="/practice/vocabulary-specialist/wordbook">Open specialist word book</Link>
        </div>
      </div> : activeQuestion ? <div className="vocabSpecialQuestion">
        <div className="questionLabel">Term {activeQuestion.itemOrder} of {total} · {activeQuestion.term}</div>
        <h3>{activeQuestion.stem}</h3>
        <div className="vocabSpecialOptions">
          {activeQuestion.options.map((option, index) => {
            const answeredNow = Boolean(activeQuestion.answeredAt);
            const isAnswer = activeQuestion.answerIndex === index;
            const isChosen = activeQuestion.selectedIndex === index || (!answeredNow && selected === index);
            return <button type="button" key={`${option}-${index}`} disabled={busy || answeredNow} className={`${isChosen ? "selected " : ""}${answeredNow && isAnswer ? "correct " : ""}${answeredNow && isChosen && !isAnswer ? "wrong" : ""}`} onClick={() => void answerQuestion(activeQuestion, index)}>
              <span>{String.fromCharCode(65 + index)}</span><strong>{option}</strong>
            </button>;
          })}
        </div>
        {activeQuestion.answeredAt && <div className={activeQuestion.correct ? "answerFeedback correct" : "answerFeedback"}>
          <strong>{activeQuestion.correct ? "Correct" : "Incorrect"}</strong>
          <p>{activeQuestion.explanation}</p>
          <button className="button primary" onClick={() => { setFeedbackId(null); setSelected(null); }}>{answered >= total ? "Continue to final cloze" : "Enter next term →"}</button>
        </div>}
      </div> : !data.session.clozePassage && answered < total ? <div className="vocabSpecialEntry">
        <label htmlFor="specialist-word"><span>Term {data.questions.length + 1} of {total}</span><strong>Enter one English word or phrase</strong></label>
        <div className="vocabSpecialEntryRow">
          <input id="specialist-word" autoComplete="off" autoCapitalize="none" spellCheck value={term} maxLength={90} onChange={e => setTerm(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void addWord(); } }} placeholder="e.g. perceptive / take part in" />
          <button className="button primary" disabled={busy || !term.trim()} onClick={() => void addWord()}>{busy ? "Generating…" : "Generate question"}</button>
        </div>
        <small>The generated four-option question may use your target word or phrase as either the correct answer or an incorrect distractor. A phrase is kept as one vocabulary item.</small>
      </div> : !data.session.clozePassage ? <div className="vocabSpecialGenerating">
        <div className="eyebrow">Final stage</div>
        <h3>{busy ? "Generating your 400–500 word mixed cloze…" : "Ready for the final mixed cloze"}</h3>
        <p>The system selects 10 vocabulary terms from today's completed set: 5 become synonym/near-synonym multiple-choice blanks and 5 become direct fill-in blanks. Multi-word phrases remain intact as one term. All 10 must be correct to pass.</p>
        <button className="button primary" disabled={busy} onClick={() => void generateCloze()}>{busy ? "Generating…" : "Generate final mixed cloze"}</button>
      </div> : <div className="vocabSpecialCloze">
        <div className="eyebrow">Final mixed cloze · 5 choice + 5 fill-in · 100% required</div>
        <h2>{data.session.clozeTitle}</h2>
        <div className="vocabSpecialClozeGuide">
          <span><strong>Blanks 1–5:</strong> choose the synonym/near-synonym that fits the passage.</span>
          <span><strong>Blanks 6–10:</strong> type the exact word from the word bank.</span>
        </div>
        <div className="vocabSpecialWordBank" aria-label="Fill-in word bank"><strong>Fill-in word / phrase bank</strong>{data.wordBank.map(word => <span key={word}>{word}</span>)}</div>
        <div className="vocabSpecialPassage">
          {passageParts.map((part, i) => {
            const match = part.match(/^\{\{(\d+)\}\}$/);
            if (!match) return <Fragment key={i}>{part}</Fragment>;
            const index = Number(match[1]);
            const answerIndex = index - 1;
            const item = clozeByIndex.get(index);
            if (!item) return <Fragment key={i}>{part}</Fragment>;
            const bad = Boolean(latestAttempt && !latestAttempt.passed && latestAttempt.correctness[answerIndex] === false);
            if (item.kind === "synonym_choice") {
              return <span className="vocabSpecialChoiceWrap" key={i}>
                <span className="vocabSpecialBlankNo">{index}</span>
                <span className="vocabSpecialTargetHint">{item.targetWord} ≈</span>
                <select aria-label={`Synonym blank ${index} for ${item.targetWord}`} className={bad ? "vocabSpecialChoice bad" : "vocabSpecialChoice"} value={answers[answerIndex] || ""} onChange={e => setAnswers(old => { const next = [...old]; next[answerIndex] = e.target.value; return next; })}>
                  <option value="">Choose…</option>
                  {item.options.map(option => <option value={option} key={option}>{option}</option>)}
                </select>
              </span>;
            }
            return <span className="vocabSpecialBlankWrap" key={i}>
              <span className="vocabSpecialBlankNo">{index}</span>
              <input aria-label={`Fill-in blank ${index}`} className={bad ? "vocabSpecialBlank bad" : "vocabSpecialBlank"} value={answers[answerIndex] || ""} onChange={e => setAnswers(old => { const next = [...old]; next[answerIndex] = e.target.value; return next; })} />
            </span>;
          })}
        </div>
        {latestAttempt && !latestAttempt.passed && <div className="notice warnNotice"><strong>{latestAttempt.correctCount}/{latestAttempt.totalCount} correct.</strong> All 10 items must be correct to pass. Incorrect choice/fill positions are highlighted; revise them and submit again.</div>}
        <div className="rowActions">
          <button className="button primary" disabled={busy || answers.length !== clozeCount || answers.some(x => !x.trim())} onClick={() => void submitCloze()}>{busy ? "Checking…" : "Check all 10 answers"}</button>
          <span className="vocabSpecialRule">PASS only at {clozeCount}/{clozeCount}</span>
        </div>
      </div>}
    </section>

    <aside className="vocabSpecialSide">
      <section className="card"><h3>Specialist vocabulary book</h3><p>Every word or phrase you enter is de-duplicated as one personal vocabulary item with meaning and practice count.</p><Link className="button secondary" href="/practice/vocabulary-specialist/wordbook">Open word book</Link></section>
      <section className="card"><h3>Learning history</h3><p>Review previous MCQs, selected answers, explanations and every mixed-cloze attempt.</p><Link className="button secondary" href="/practice/vocabulary-specialist/history">View history</Link></section>
      <section className="card vocabSpecialRuleCard"><strong>Pass rule</strong><span>MCQs record accuracy but do not block progress.</span><span>The final passage contains 5 synonym/near-synonym choices + 5 direct fill-ins.</span><span>All 10 final items must be correct.</span></section>
    </aside>
  </div>;
}
