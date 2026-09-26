"use client";
import { useEffect, useState } from "react";

type Mode = "conversation" | "reading_aloud" | "stimulus";
type Row = {
  id: string;
  title: string;
  school_level: string;
  topic: string;
  status: string;
  scope?: string;
  mode: Mode;
  stimulusImageUrl?: string | null;
};

const learningStages = ["P1-P4", "P5", "P6", "S1", "S2", "S3", "S4"] as const;

export function SpeakingTaskManager({ endpoint, tenant = false }: { endpoint: string; tenant?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    schoolLevel: "P6",
    mode: "stimulus" as Mode,
    topic: "Everyday Life",
    description: "",
    prompt: "",
    referenceText: "",
    stimulusAlt: "",
    stimulusImageUrl: "",
    stimulusImageAlt: "",
    followUpGoals: "give a clear response\nexplain with a reason\nadd a relevant personal example",
  });

  async function load() {
    const r = await fetch(endpoint, { cache: "no-store" });
    const b = await r.json().catch(() => ({})) as { prompts?: Row[] };
    setRows(b.prompts || []);
  }

  useEffect(() => { void load(); }, [endpoint]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const b = await r.json().catch(() => ({})) as { error?: string; status?: string };
    setBusy(false);
    setMsg(r.ok ? (b.status === "skipped" ? "Duplicate skipped. This speaking task already exists." : "Speaking task published.") : b.error || "Could not create speaking task");
    if (r.ok) {
      setForm(v => ({ ...v, title: "", description: "", prompt: "", referenceText: "", stimulusAlt: "", stimulusImageUrl: "", stimulusImageAlt: "" }));
      await load();
    }
  }

  async function changeStage(row: Row, schoolLevel: string) {
    if (!tenant || row.scope !== "tenant" || row.school_level === schoolLevel) return;
    setBusy(true);
    const r = await fetch(`/api/admin/content/${row.id}/stage`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolLevel }),
    });
    const b = await r.json().catch(() => ({})) as { error?: string };
    setBusy(false);
    setMsg(r.ok ? `Speaking task moved to ${schoolLevel}.` : b.error || "Could not change stage");
    if (r.ok) await load();
  }

  const modeName = (m: Mode) => m === "reading_aloud" ? "Reading Aloud" : m === "stimulus" ? "Stimulus Conversation" : "AI Conversation";

  return <>
    <div className="adminSplit speakingAdminSplit">
      <section className="card">
        <div className="cardHeader">
          <h2>Create speaking task</h2>
          <span>{tenant ? "Tenant private · published immediately" : "Global · published immediately"}</span>
        </div>
        <form className="stackForm" onSubmit={add}>
          <label>Title<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
          <div className="formGrid">
            <label>Level<select value={form.schoolLevel} onChange={e => setForm({ ...form, schoolLevel: e.target.value })}><option>P5</option><option>P6</option></select></label>
            <label>Type<select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value as Mode })}><option value="reading_aloud">Reading Aloud</option><option value="stimulus">Stimulus Conversation</option><option value="conversation">AI Conversation</option></select></label>
          </div>
          <label>Topic<input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} /></label>
          <label>Task instruction<textarea required value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })} placeholder="What should the student do or discuss?" /></label>
          {form.mode === "reading_aloud" && <label>Reference passage<textarea required value={form.referenceText} onChange={e => setForm({ ...form, referenceText: e.target.value })} placeholder="Original passage for Reading Aloud assessment." /></label>}
          {form.mode === "stimulus" && <>
            <label>Stimulus image URL (optional)<input value={form.stimulusImageUrl} onChange={e => setForm({ ...form, stimulusImageUrl: e.target.value })} placeholder="https://.../oral-scene.jpg" /></label>
            <label>Image alt / short caption (optional)<input value={form.stimulusImageAlt} onChange={e => setForm({ ...form, stimulusImageAlt: e.target.value })} placeholder="Short label for the picture, if needed." /></label>
            <label>Visual / scene description<textarea value={form.stimulusAlt} onChange={e => setForm({ ...form, stimulusAlt: e.target.value })} placeholder="Describe the photo-like scene the student should respond to. Keep this even when an image URL is provided so there is a fallback if the image cannot load." /></label>
          </>}
          {form.mode !== "reading_aloud" && <label>Follow-up goals<textarea value={form.followUpGoals} onChange={e => setForm({ ...form, followUpGoals: e.target.value })} placeholder="One goal per line" /></label>}
          <button className="button primary" disabled={busy}>{busy ? "Publishing…" : "Create speaking task"}</button>
        </form>
      </section>
      <section className="card">
        <div className="cardHeader"><h2>Speaking library</h2><span>{rows.length}</span></div>
        <div className="speakingAdminList">
          {rows.map(x => <div className="sourceRow speakingAdminRow" key={x.id}>
            <div>
              <strong>{x.title}</strong>
              <small>{modeName(x.mode)} · {x.topic}{x.scope ? ` · ${x.scope}` : ""}{x.mode === "stimulus" && x.stimulusImageUrl ? " · image" : ""}</small>
            </div>
            <div className="rowActions">
              {tenant && x.scope === "tenant"
                ? <select aria-label={`Stage for ${x.title}`} value={x.school_level} disabled={busy} onChange={e => void changeStage(x, e.target.value)}>{learningStages.map(stage => <option key={stage}>{stage}</option>)}</select>
                : <span>{x.school_level}</span>}
              <span className={x.status === "published" ? "statusPill published" : "statusPill"}>{x.status}</span>
            </div>
          </div>)}
        </div>
      </section>
    </div>
    {msg && <div className="notice" style={{ marginTop: 18 }}>{msg}</div>}
  </>;
}
