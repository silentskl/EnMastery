"use client";
import {notifyLibraryRefresh} from "@/lib/ui/library-refresh";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type ContentRow = {
  id: string;
  title: string;
  school_level: string;
  topic?: string;
  status: string;
  description?: string;
  source_url?: string;
  source_attribution?: string;
  question_count: number;
  published_at?: string;
  generation_job_id?: string | null;
  generation_stage?: string | null;
  generation_error?: string | null;
  generation_progress?: number | null;
};
type Source = { id: string; name: string; topic?: string };
type Skill = { id: string; name: string; domain: string; school_level: string };

export function AdminContentManager() {
  const params = useSearchParams();
  const [contents, setContents] = useState<ContentRow[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const initialUrl = params.get("url") || "";
  const initialSource = params.get("source") || "";
  const initialTitle = params.get("title") || "";
  const [importForm, setImportForm] = useState({
    sourceId: initialSource,
    url: initialUrl,
    sourceTitle: initialTitle,
    schoolLevel: "P6",
    topic: "Current Affairs",
    skillIds: ["R-LITERAL", "R-INFER", "R-VOCAB"] as string[],
  });
  const [manual, setManual] = useState({ title: "", description: "", topic: "General English", schoolLevel: "P6", text: "" });

  async function load() {
    const [a, b, c] = await Promise.all([
      fetch("/api/platform/content"),
      fetch("/api/platform/sources"),
      fetch("/api/curriculum/skills"),
    ]);
    if (a.status === 401) {
      setMessage("Administrator sign-in required.");
      return;
    }
    const ab = await a.json() as { contents?: ContentRow[] };
    const bb = await b.json() as { sources?: Source[] };
    const cb = await c.json() as { skills?: Skill[] };
    setContents(ab.contents || []);
    setSources(bb.sources || []);
    setSkills(cb.skills || []);
    setImportForm((form) => ({ ...form, sourceId: form.sourceId || bb.sources?.[0]?.id || "" }));
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => { void load(); }, 3500);
    return () => clearInterval(timer);
  }, []);

  const readingSkills = useMemo(
    () => skills.filter((skill) => skill.domain === "Reading & Language" || skill.domain === "reading" || skill.id.startsWith("R-")),
    [skills],
  );
  const statuses = useMemo(() => [...new Set(contents.map((row) => row.status))].sort(), [contents]);
  const filteredContents = useMemo(
    () => contents.filter((row) => statusFilter === "all" || row.status === statusFilter),
    [contents, statusFilter],
  );
  const selectedDraftCount = filteredContents.filter((row) => selectedRows.includes(row.id) && row.status === "draft").length;

  useEffect(() => {
    setSelectedRows([]);
  }, [statusFilter]);

  function toggleSkill(id: string) {
    setImportForm((form) => ({
      ...form,
      skillIds: form.skillIds.includes(id) ? form.skillIds.filter((value) => value !== id) : [...form.skillIds, id].slice(-6),
    }));
  }

  function toggleRow(id: string) {
    setSelectedRows((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function selectFiltered() {
    setSelectedRows(filteredContents.map((row) => row.id));
  }

  async function importLesson(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("Creating persistent generation task…");
    const response = await fetch("/api/platform/content/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(importForm),
    });
    const body = await response.json().catch(() => ({})) as { error?: string; contentId?: string; jobId?: string; status?:string };
    setBusy(false);
    if (!response.ok) {
      setMessage(body.error || "Import failed.");
      return;
    }
    setMessage(body.status==="skipped"?"Duplicate skipped. This lesson already exists in the library.":"Lesson added to library with status generating. You can navigate away safely.");
    await load();
  }

  async function createManual(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/platform/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(manual),
    });
    const body = await response.json().catch(() => ({})) as { error?: string; status?:string };
    setBusy(false);
    setMessage(response.ok ? (body.status==="skipped"?"Duplicate skipped. An equivalent manual lesson already exists.":"Manual draft created.") : body.error || "Could not create draft.");
    if (response.ok) {
      setManual({ title: "", description: "", topic: "General English", schoolLevel: "P6", text: "" });
      await load();
    }
  }

  async function publish(id: string, ask = true) {
    if (ask && !confirm("Publish this lesson and its questions to students?")) return false;
    const response = await fetch(`/api/platform/content/${id}/publish`, { method: "POST" });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      setMessage(body.error || "Publish failed.");
      return false;
    }
    notifyLibraryRefresh("reading");
    return true;
  }

  async function bulkPublish() {
    const ids = filteredContents.filter((row) => selectedRows.includes(row.id) && row.status === "draft").map((row) => row.id);
    if (!ids.length) return;
    if (!confirm(`Publish ${ids.length} selected draft lesson${ids.length === 1 ? "" : "s"}?`)) return;
    setBusy(true);
    let changed = 0;
    for (const id of ids) if (await publish(id, false)) changed++;
    setBusy(false);
    setSelectedRows([]);
    setMessage(`${changed}/${ids.length} selected draft lesson${ids.length === 1 ? "" : "s"} published.`);
    await load();
  }

  async function remove(row: ContentRow) {
    if (!row.generation_job_id || !confirm("Delete this finished/failed generation task record?")) return;
    const response = await fetch(`/api/platform/jobs/${row.generation_job_id}`, { method: "DELETE" });
    setMessage(response.ok ? "Task record deleted." : "Delete failed.");
    await load();
  }

  return (
    <>
      {message.includes("sign-in") && <div className="notice warnNotice">{message} <Link href="/platform/login">Sign in</Link></div>}
      <div className="adminSplit">
        <section className="card">
          <div className="cardHeader"><h2>Import from the internet</h2><span>Persistent task</span></div>
          <form className="stackForm" onSubmit={importLesson}>
            <label>Source<select value={importForm.sourceId} onChange={(event) => setImportForm({ ...importForm, sourceId: event.target.value })}>{sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select></label>
            <label>Article URL<input type="url" required value={importForm.url} onChange={(event) => setImportForm({ ...importForm, url: event.target.value })} /></label>
            <div className="formGrid">
              <label>Level<select value={importForm.schoolLevel} onChange={(event) => setImportForm({ ...importForm, schoolLevel: event.target.value })}><option>P5</option><option>P6</option></select></label>
              <label>Topic<input value={importForm.topic} onChange={(event) => setImportForm({ ...importForm, topic: event.target.value })} /></label>
            </div>
            <div><span className="fieldLabel">Skill mapping</span><div className="skillPicker">{readingSkills.slice(0, 16).map((skill) => <button type="button" className={importForm.skillIds.includes(skill.id) ? "skillPick active" : "skillPick"} key={skill.id} onClick={() => toggleSkill(skill.id)}>{skill.name}</button>)}</div></div>
            <button disabled={busy || !importForm.sourceId} className="button primary">{busy ? "Queueing…" : "Create & queue lesson"}</button>
            <div className="sourceHint">The lesson appears in Content Library immediately as <strong>generating</strong>. Source fetch and ModelBridge generation update the same row.</div>
          </form>
        </section>
        <section className="card">
          <div className="cardHeader"><h2>Create manually</h2><span>Teacher / editor</span></div>
          <form className="stackForm" onSubmit={createManual}>
            <label>Title<input required value={manual.title} onChange={(event) => setManual({ ...manual, title: event.target.value })} /></label>
            <div className="formGrid">
              <label>Level<select value={manual.schoolLevel} onChange={(event) => setManual({ ...manual, schoolLevel: event.target.value })}><option>P5</option><option>P6</option></select></label>
              <label>Topic<input value={manual.topic} onChange={(event) => setManual({ ...manual, topic: event.target.value })} /></label>
            </div>
            <label>Description<input value={manual.description} onChange={(event) => setManual({ ...manual, description: event.target.value })} /></label>
            <label>Passage<textarea required minLength={200} value={manual.text} onChange={(event) => setManual({ ...manual, text: event.target.value })} /></label>
            <button disabled={busy} className="button secondary">Create draft</button>
          </form>
        </section>
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="cardHeader">
          <div><h2>Content library</h2><div className="tableSub">Filter by status, then select the matching resources in one action.</div></div>
          <span>{filteredContents.length} / {contents.length} items</span>
        </div>
        <div className="rowActions" style={{ marginBottom: 12 }}>
          <label>Status <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{statuses.map((value) => <option value={value} key={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
          <button className="button ghost smallButton" disabled={!filteredContents.length} onClick={selectFiltered}>Select filtered</button>
          <button className="button ghost smallButton" onClick={() => setSelectedRows([])}>Clear</button>
          <button className="button primary smallButton" disabled={!selectedDraftCount || busy} onClick={bulkPublish}>Publish selected drafts ({selectedDraftCount})</button>
          <span>{selectedRows.length} selected</span>
        </div>
        <div className="contentTableWrap">
          <table className="monitorTable">
            <thead><tr><th></th><th>Lesson</th><th>Level</th><th>Status</th><th>Questions</th><th>Action</th></tr></thead>
            <tbody>
              {filteredContents.map((row) => (
                <tr key={row.id}>
                  <td><input aria-label={`Select ${row.title}`} type="checkbox" checked={selectedRows.includes(row.id)} onChange={() => toggleRow(row.id)} /></td>
                  <td><strong>{row.title}</strong><div className="tableSub">{row.topic || "General"}{row.generation_stage ? ` · ${row.generation_stage}` : ""}</div>{row.generation_error && <div className="tableSub">{row.generation_error}</div>}</td>
                  <td>{row.school_level}</td>
                  <td><span className={row.status === "published" ? "statusPill published" : "statusPill"}>{row.status}{row.status === "generating" && typeof row.generation_progress === "number" ? ` ${row.generation_progress}%` : ""}</span></td>
                  <td>{row.question_count}</td>
                  <td><div className="rowActions">
                    {(row.status === "draft" || row.status === "published") && <Link className="button ghost smallButton" href={`/platform/content/${row.id}`}>Review</Link>}
                    {row.status === "draft" && <button className="button primary smallButton" onClick={async () => { if (await publish(row.id)) { setMessage("Published."); await load(); } }}>Publish</button>}
                    {row.status === "published" && <Link className="button ghost smallButton" href={`/learn/read/${row.id}`}>Student view</Link>}
                    {row.generation_job_id && row.status !== "published" && <button className="button ghost smallButton" onClick={() => remove(row)}>Delete task</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {message && !message.includes("sign-in") && <div className="notice" style={{ marginTop: 12 }}>{message}</div>}
      </section>
    </>
  );
}
