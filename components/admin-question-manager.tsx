"use client";

import { useEffect, useMemo, useState } from "react";

type Skill = { id: string; name: string };
type Q = {
  id: string;
  question_type: string;
  school_level: string;
  difficulty: number;
  stem_json: string;
  answer_json: string;
  explanation_json: string | null;
  status: string;
  skill_ids?: string;
};

const types = [
  "grammar_mcq", "vocabulary_mcq", "vocabulary_cloze", "visual_text", "grammar_cloze",
  "editing_spelling", "editing_grammar", "comprehension_cloze", "synthesis", "open_comprehension",
];

export function AdminQuestionManager() {
  const [questions, setQuestions] = useState<Q[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({ schoolLevel: "P6", questionType: "grammar_mcq", skillId: "R-GRAMMAR", topic: "School and daily life", difficulty: 3 });

  async function load() {
    const [a, b] = await Promise.all([fetch("/api/platform/questions"), fetch("/api/curriculum/skills")]);
    const qa = await a.json().catch(() => ({})) as { questions?: Q[] };
    const sb = await b.json().catch(() => ({})) as { skills?: Skill[] };
    setQuestions(qa.questions || []);
    setSkills((sb.skills || []).filter((s) => s.id.startsWith("R-")));
  }

  useEffect(() => { void load(); const timer = setInterval(() => void load(), 4000); return () => clearInterval(timer); }, []);
  useEffect(() => setSelected([]), [statusFilter]);

  const selectedSkill = useMemo(() => skills.find((s) => s.id === form.skillId), [skills, form.skillId]);
  const statuses = useMemo(() => [...new Set(questions.map((q) => q.status))].sort(), [questions]);
  const filteredQuestions = useMemo(
    () => questions.filter((q) => statusFilter === "all" || q.status === statusFilter),
    [questions, statusFilter],
  );
  const selectedDrafts = filteredQuestions.filter((q) => selected.includes(q.id) && q.status !== "published");

  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }

  async function generate(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    const response = await fetch("/api/platform/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const body = await response.json().catch(() => ({})) as { jobId?: string; error?: string };
    setBusy(false); setMsg(response.ok ? `Generation task queued: ${body.jobId}` : body.error || "Generation failed");
  }

  async function publish(id: string, reload = true) {
    const response = await fetch(`/api/platform/questions/${id}/publish`, { method: "POST" });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) setMsg(body.error || "Publish failed");
    if (reload) { if (response.ok) setMsg("Question published."); await load(); }
    return response.ok;
  }

  async function remove(id: string, ask = true, reload = true) {
    if (ask && !confirm("Delete this draft question?")) return false;
    const response = await fetch(`/api/platform/questions/${id}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) setMsg(body.error || "Delete failed");
    if (reload) await load();
    return response.ok;
  }

  async function publishSelected() {
    const ids = selectedDrafts.map((q) => q.id);
    if (!ids.length || !confirm(`Publish ${ids.length} selected question${ids.length === 1 ? "" : "s"}?`)) return;
    setBusy(true); let changed = 0;
    for (const id of ids) if (await publish(id, false)) changed += 1;
    setBusy(false); setSelected([]); setMsg(`${changed}/${ids.length} selected questions published.`); await load();
  }

  async function deleteSelected() {
    const ids = selectedDrafts.map((q) => q.id);
    if (!ids.length || !confirm(`Delete ${ids.length} selected unpublished question${ids.length === 1 ? "" : "s"}?`)) return;
    setBusy(true); let changed = 0;
    for (const id of ids) if (await remove(id, false, false)) changed += 1;
    setBusy(false); setSelected([]); setMsg(`${changed}/${ids.length} selected unpublished questions deleted.`); await load();
  }

  return <>
    <div className="adminSplit">
      <section className="card">
        <div className="cardHeader"><h2>AI question generation</h2><span>Draft-first</span></div>
        <form className="stackForm" onSubmit={generate}>
          <div className="formGrid">
            <label>Level<select value={form.schoolLevel} onChange={(e) => setForm({ ...form, schoolLevel: e.target.value })}><option>P5</option><option>P6</option></select></label>
            <label>Type<select value={form.questionType} onChange={(e) => setForm({ ...form, questionType: e.target.value })}>{types.map((type) => <option key={type}>{type}</option>)}</select></label>
          </div>
          <label>Skill<select value={form.skillId} onChange={(e) => setForm({ ...form, skillId: e.target.value })}>{skills.map((skill) => <option value={skill.id} key={skill.id}>{skill.id} · {skill.name}</option>)}</select></label>
          <label>Topic/context<input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></label>
          <label>Difficulty<input type="range" min="1" max="5" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: Number(e.target.value) })} /><span>{form.difficulty}/5 · {selectedSkill?.name}</span></label>
          <button className="button primary" disabled={busy}>{busy ? "Queueing…" : "Generate draft"}</button>
          <div className="notice"><strong>Validation:</strong> generated questions must include a non-empty answer and explanation. MCQ/cloze types must contain exactly four options and the answer must match one option.</div>
        </form>
      </section>
      <section className="card"><div className="cardHeader"><h2>Coverage</h2><span>10 Paper 2 families</span></div><div className="chips">{types.map((type) => <span className="chip" key={type}>{type.replaceAll("_", " ")}</span>)}</div><p>{msg}</p></section>
    </div>

    <section className="card" style={{ marginTop: 20 }}>
      <div className="cardHeader"><div><h2>Question bank</h2><div className="tableSub">Filter by status, then bulk-select only the questions in that state.</div></div><span>{filteredQuestions.length} / {questions.length} latest</span></div>
      <div className="rowActions" style={{ marginBottom: 12 }}>
        <label>Status <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All statuses</option>{statuses.map((status) => <option value={status} key={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
        <button className="button ghost smallButton" disabled={!filteredQuestions.length} onClick={() => setSelected(filteredQuestions.map((q) => q.id))}>Select filtered</button>
        <button className="button ghost smallButton" onClick={() => setSelected([])}>Clear</button>
        <button className="button primary smallButton" disabled={!selectedDrafts.length || busy} onClick={publishSelected}>Publish selected ({selectedDrafts.length})</button>
        <button className="button danger smallButton" disabled={!selectedDrafts.length || busy} onClick={deleteSelected}>Delete selected unpublished</button>
        <span>{selected.length} selected</span>
      </div>
      <div className="contentTableWrap"><table className="monitorTable"><thead><tr><th></th><th>Question</th><th>Answer & explanation</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {filteredQuestions.map((q) => {
          const stem = JSON.parse(q.stem_json) as Record<string, unknown>;
          const answer = JSON.parse(q.answer_json) as Record<string, unknown>;
          const exp = q.explanation_json ? JSON.parse(q.explanation_json) as Record<string, unknown> : {};
          return <tr key={q.id}><td><input aria-label={`Select question ${q.id}`} type="checkbox" checked={selected.includes(q.id)} onChange={() => toggle(q.id)} /></td><td><strong>{q.question_type.replaceAll("_", " ")}</strong><div className="tableSub">{q.school_level} · {q.skill_ids || "unmapped"}</div><div>{String(stem.prompt || "")}</div></td><td><strong>{String(answer.answer ?? answer.modelAnswer ?? (`option ${Number(answer.correctOption) + 1}`))}</strong><div className="tableSub">{String(exp.explanation ?? exp.text ?? "")}</div></td><td><span className={q.status === "published" ? "statusPill published" : "statusPill"}>{q.status}</span></td><td><div className="rowActions">{q.status !== "published" && <><button className="button primary smallButton" onClick={() => publish(q.id)}>Publish</button><button className="button ghost smallButton" onClick={() => remove(q.id)}>Delete</button></>}</div></td></tr>;
        })}
      </tbody></table></div>
    </section>
  </>;
}
