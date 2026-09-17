"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Source = {
  id: string;
  name: string;
  source_type: "youtube_channel" | "podcast_rss";
  topic?: string | null;
  default_level: "P5" | "P6";
};
type Item = {
  id: string;
  title: string;
  url: string;
  provider: "youtube" | "podcast";
  description?: string;
  publishedAt?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  madeForKids?: boolean | null;
  companionUrl?: string;
};
type Skill = { id: string; name: string };
type Row = {
  id: string;
  title: string;
  school_level: string;
  topic?: string;
  status: string;
  media_kind: string;
  provider: string;
  question_basis: string;
  question_count: number;
  generation_job_id?: string | null;
  generation_stage?: string | null;
  generation_error?: string | null;
  generation_progress?: number | null;
  scope?: string;
};
const learningStages=["P1-P4","P5","P6","S1","S2","S3","S4"] as const;

async function wait(jobId: string) {
  for (let i = 0; i < 45; i++) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const body = await fetch(`/api/admin/jobs/${jobId}`).then((response) => response.json()) as {
      job?: { status: string; result?: { items?: Item[] }; error?: string };
    };
    if (body.job?.status === "succeeded") return body.job.result?.items || [];
    if (body.job?.status === "failed" || body.job?.status === "cancelled") throw new Error(body.job.error || "Task failed");
  }
  throw new Error("Discovery is still running. Check Work Queue later.");
}

export function TenantListeningManager() {
  const [sources, setSources] = useState<Source[]>([]);
  const [youtubeEnabled, setYoutube] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [sourceId, setSourceId] = useState("");
  const sourceRef = useRef("");
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState("date");
  const [limit, setLimit] = useState(25);
  const [filters, setFilters] = useState({ publishedAfter: "", publishedBefore: "", minMinutes: "", maxMinutes: "", madeForKids: "all" });
  const [selected, setSelected] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [libraryStatus, setLibraryStatus] = useState("all");
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [form, setForm] = useState({
    schoolLevel: "P6",
    topic: "Listening Practice",
    skillIds: ["L-MAIN", "L-DETAIL", "L-INFER"] as string[],
    useCompanion: false,
    teacherTranscript: "",
  });

  async function load() {
    const [a, b, c] = await Promise.all([
      fetch("/api/admin/listening/sources"),
      fetch("/api/curriculum/skills"),
      fetch("/api/admin/listening/content"),
    ]);
    const x = await a.json() as { sources?: Source[]; youtubeEnabled?: boolean };
    const y = await b.json() as { skills?: Skill[] };
    const z = await c.json() as { contents?: Row[] };
    setSources(x.sources || []);
    setYoutube(Boolean(x.youtubeEnabled));
    setSkills((y.skills || []).filter((skill) => skill.id.startsWith("L-")));
    setRows(z.contents || []);
    if (!sourceRef.current && x.sources?.[0]) {
      const first = x.sources[0];
      setSourceId(first.id);
      sourceRef.current = first.id;
      setForm((value) => ({ ...value, schoolLevel: first.default_level || "P6", topic: first.topic || value.topic }));
    }
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => { void load(); }, 4000);
    return () => clearInterval(timer);
  }, []);

  const src = sources.find((source) => source.id === sourceId);
  const key = (item: Item) => `${item.provider}:${item.id}`;
  const chosen = useMemo(() => items.filter((item) => selected.includes(key(item))), [items, selected]);
  const libraryStatuses = useMemo(() => [...new Set(rows.map((row) => row.status))].sort(), [rows]);
  const filteredRows = useMemo(
    () => rows.filter((row) => libraryStatus === "all" || row.status === libraryStatus),
    [rows, libraryStatus],
  );
  const selectedDrafts = filteredRows.filter((row) => selectedLessons.includes(row.id) && row.status === "draft").length;

  useEffect(() => {
    setSelectedLessons([]);
  }, [libraryStatus]);

  async function discover() {
    if (!sourceId) return;
    const id = sourceId;
    setBusy(true);
    setSelected([]);
    setItems([]);
    const response = await fetch(`/api/admin/listening/sources/${id}/discover`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, maxResults: limit, order, publishedAfter: filters.publishedAfter, publishedBefore: filters.publishedBefore, minDurationSeconds: filters.minMinutes === "" ? undefined : Math.max(0, Math.round(Number(filters.minMinutes) * 60)), maxDurationSeconds: filters.maxMinutes === "" ? undefined : Math.max(0, Math.round(Number(filters.maxMinutes) * 60)), madeForKids: filters.madeForKids }) });
    const body = await response.json() as { jobId?: string; error?: string };
    if (!response.ok || !body.jobId) {
      setBusy(false);
      setMsg(body.error || "Discovery failed");
      return;
    }
    try {
      const found = await wait(body.jobId);
      if (sourceRef.current === id) setItems(found);
      setMsg(`${found.length} eligible items discovered.`);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Discovery failed");
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (!chosen.length) return;
    setBusy(true);
    const multi = chosen.length > 1;
    const response = await fetch(multi ? "/api/admin/listening/import/batch" : "/api/admin/listening/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(multi
        ? {
            sourceId,
            items: chosen,
            schoolLevel: form.schoolLevel,
            topic: form.topic,
            skillIds: form.skillIds,
            useCompanion: form.useCompanion,
          }
        : { sourceId, item: chosen[0], ...form }),
    });
    const body = await response.json() as { accepted?: number; skipped?:number; failed?:number; status?:string; error?: string };
    setBusy(false);
    setMsg(response.ok
      ? (multi ? `${body.accepted??0} private listening lesson(s) queued${body.skipped?`; ${body.skipped} duplicate(s) skipped`:""}${body.failed?`; ${body.failed} failed`:""}.` : body.status==="skipped" ? "Duplicate skipped. This listening lesson already exists." : "1 private listening lesson queued.")
      : body.error || "Could not create lesson");
    if (response.ok) {
      setSelected([]);
      await load();
    }
  }

  async function publish(id: string) {
    const response = await fetch(`/api/admin/content/${id}/publish`, { method: "POST" });
    setMsg(response.ok ? "Published." : "Publish failed.");
    await load();
    return response.ok;
  }

  async function publishSelected() {
    const ids = filteredRows.filter((row) => selectedLessons.includes(row.id) && row.status === "draft").map((row) => row.id);
    if (!ids.length || !confirm(`Publish ${ids.length} selected draft listening lesson${ids.length === 1 ? "" : "s"}?`)) return;
    setBusy(true);
    let changed = 0;
    for (const id of ids) {
      const response = await fetch(`/api/admin/content/${id}/publish`, { method: "POST" });
      if (response.ok) changed++;
    }
    setBusy(false);
    setSelectedLessons([]);
    setMsg(`${changed}/${ids.length} selected draft listening lesson${ids.length === 1 ? "" : "s"} published.`);
    await load();
  }

  async function remove(jobId?: string | null) {
    if (!jobId || !confirm("Delete this finished/failed task record?")) return;
    const response = await fetch(`/api/admin/jobs/${jobId}`, { method: "DELETE" });
    setMsg(response.ok ? "Task record deleted." : "Delete failed.");
    await load();
  }

  async function changeStage(row:Row,schoolLevel:string){
    if(row.scope==="global"||row.school_level===schoolLevel)return;setBusy(true);setMsg("");
    const response=await fetch(`/api/admin/content/${row.id}/stage`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({schoolLevel})});
    const body=await response.json().catch(()=>({})) as {error?:string;questionsUpdated?:number};setBusy(false);
    setMsg(response.ok?`Listening lesson moved to ${schoolLevel}. ${body.questionsUpdated||0} linked question(s) moved with it.`:body.error||"Could not change lesson stage");if(response.ok)await load();
  }

  async function deleteSelectedLessons() {
    const ids = filteredRows.filter((row) => selectedLessons.includes(row.id) && row.scope !== "global").map((row) => row.id);
    if (!ids.length) { setMsg("Only tenant-owned listening lessons can be deleted here."); return; }
    if (!confirm(`Delete ${ids.length} selected tenant listening lesson${ids.length === 1 ? "" : "s"}? Queued/running generation jobs will be cancelled.`)) return;
    setBusy(true);
    const response = await fetch("/api/admin/listening/content", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    const body = await response.json().catch(() => ({})) as { deleted?: number; error?: string };
    setBusy(false);
    if (!response.ok) { setMsg(body.error || "Could not delete selected lessons"); return; }
    setSelectedLessons([]);
    setMsg(`${body.deleted || 0}/${ids.length} selected tenant listening lessons deleted.`);
    await load();
  }

  function toggleLesson(id: string) {
    setSelectedLessons((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  return (
    <>
      <div className="sectionHeading">
        <div>
          <span>Listening studio</span>
          <h1>Listening</h1>
          <p>Platform Admin controls the listening source catalogue. Tenant Admin discovers approved media and creates tenant-private listening lessons.</p>
        </div>
        <Link className="button secondary" href="/admin/sources?tab=listening#owned-audio">Owned audio</Link>
      </div>

      <div className="adminSplit">
        <section className="card">
          <div className="cardHeader"><h2>Approved sources</h2><span>{sources.length}</span></div>
          <label>
            Source
            <select value={sourceId} onChange={(event) => {
              const id = event.target.value;
              const source = sources.find((value) => value.id === id);
              setSourceId(id);
              sourceRef.current = id;
              setItems([]);
              setSelected([]);
              setQuery("");
              setFilters({ publishedAfter: "", publishedBefore: "", minMinutes: "", maxMinutes: "", madeForKids: "all" });
              setForm((value) => ({ ...value, schoolLevel: source?.default_level || "P6", topic: source?.topic || value.topic }));
            }}>
              {sources.map((source) => <option key={source.id} value={source.id}>{source.name} · {source.source_type === "youtube_channel" ? "YouTube" : "Podcast"}</option>)}
            </select>
          </label>
          {src?.source_type === "youtube_channel" && !youtubeEnabled && <div className="notice warnNotice">Platform YouTube discovery is not configured.</div>}
          {src?.source_type === "youtube_channel" && <>
            <div className="formGrid"><label>Search inside channel<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Optional keyword" /></label><label>Sort<select value={order} onChange={(event) => setOrder(event.target.value)}><option value="date">Newest first</option><option value="relevance">Relevance</option><option value="viewCount">Most viewed</option></select></label></div>
            <div className="formGrid"><label>Published from<input type="date" value={filters.publishedAfter} onChange={(event) => setFilters((v) => ({ ...v, publishedAfter: event.target.value }))} /></label><label>Published to<input type="date" value={filters.publishedBefore} onChange={(event) => setFilters((v) => ({ ...v, publishedBefore: event.target.value }))} /></label></div>
            <div className="formGrid"><label>Min duration (min)<input type="number" min="0" max="120" value={filters.minMinutes} onChange={(event) => setFilters((v) => ({ ...v, minMinutes: event.target.value }))} placeholder="e.g. 2" /></label><label>Max duration (min)<input type="number" min="0" max="120" value={filters.maxMinutes} onChange={(event) => setFilters((v) => ({ ...v, maxMinutes: event.target.value }))} placeholder="e.g. 15" /></label></div>
            <div className="formGrid"><label>Made for Kids<select value={filters.madeForKids} onChange={(event) => setFilters((v) => ({ ...v, madeForKids: event.target.value }))}><option value="all">All</option><option value="yes">Yes only</option><option value="no">No / not marked</option></select></label><label>Results<select value={limit} onChange={(event) => setLimit(Number(event.target.value))}><option value={20}>20</option><option value={30}>30</option><option value={40}>40</option><option value={50}>50</option></select></label></div>
            <div className="rowActions"><button type="button" className="button ghost smallButton" onClick={() => setFilters({ publishedAfter: "", publishedBefore: "", minMinutes: "", maxMinutes: "", madeForKids: "all" })}>Clear filters</button><span className="tableSub">All conditions are sent to the discovery worker, so the results list contains only matching videos from this configured channel.</span></div>
          </>}
          {src?.source_type !== "youtube_channel" && <label>Results<select value={limit} onChange={(event) => setLimit(Number(event.target.value))}><option value={20}>20</option><option value={30}>30</option><option value={40}>40</option><option value={50}>50</option></select></label>}
          <button className="button primary" disabled={!sourceId || busy || (src?.source_type === "youtube_channel" && !youtubeEnabled)} onClick={discover}>{busy ? "Working…" : query ? `Search “${query}” in channel` : "Discover latest items"}</button>
        </section>

        <section className="card">
          <div className="cardHeader"><h2>Lesson settings</h2><span>Tenant private</span></div>
          <div className="formGrid">
            <label>Level<select value={form.schoolLevel} onChange={(event) => setForm({ ...form, schoolLevel: event.target.value })}><option>P5</option><option>P6</option></select></label>
            <label>Topic<input value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} /></label>
          </div>
          <div className="skillPicker">{skills.map((skill) => <button type="button" className={form.skillIds.includes(skill.id) ? "skillPick active" : "skillPick"} key={skill.id} onClick={() => setForm((value) => ({ ...value, skillIds: value.skillIds.includes(skill.id) ? value.skillIds.filter((id) => id !== skill.id) : [...value.skillIds, skill.id].slice(-6) }))}>{skill.name}</button>)}</div>
          {msg && <div className="notice">{msg}</div>}
        </section>
      </div>

      {items.length > 0 && (
        <section className="card" style={{ marginTop: 20 }}>
          <div className="cardHeader"><h2>Discovered media</h2><span>{selected.length}/{items.length} selected</span></div>
          <div className="mediaDiscoveryGrid">
            {items.map((item) => (
              <article className={selected.includes(key(item)) ? "mediaDiscoverCard selectedMedia" : "mediaDiscoverCard"} key={key(item)}>
                <label className="checkRow"><input type="checkbox" checked={selected.includes(key(item))} onChange={() => setSelected((current) => current.includes(key(item)) ? current.filter((value) => value !== key(item)) : [...current, key(item)])} />Select</label>
                <div><strong>{item.title}</strong><p>{item.description?.slice(0, 160) || "No description."}</p><small>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : ""}</small></div>
              </article>
            ))}
          </div>
          <div className="rowActions">
            <button className="button ghost" onClick={() => setSelected(items.map(key))}>Select all</button>
            <button className="button ghost" onClick={() => setSelected([])}>Clear</button>
            <button className="button primary" disabled={!chosen.length || busy} onClick={create}>Create & queue {chosen.length}</button>
          </div>
        </section>
      )}

      <section className="card" style={{ marginTop: 20 }}>
        <div className="cardHeader">
          <div><h2>Listening library</h2><div className="tableSub">Filter by status, then select the matching lessons in one action.</div></div>
          <span>{filteredRows.length} / {rows.length}</span>
        </div>
        <div className="rowActions" style={{ marginBottom: 12 }}>
          <label>Status <select value={libraryStatus} onChange={(event) => setLibraryStatus(event.target.value)}><option value="all">All statuses</option>{libraryStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
          <button className="button ghost smallButton" disabled={!filteredRows.length} onClick={() => setSelectedLessons(filteredRows.map((row) => row.id))}>Select filtered</button>
          <button className="button ghost smallButton" onClick={() => setSelectedLessons([])}>Clear</button>
          <button className="button primary smallButton" disabled={!selectedDrafts || busy} onClick={publishSelected}>Publish selected drafts ({selectedDrafts})</button>
          <button className="button ghost smallButton" disabled={!selectedLessons.length || busy} onClick={deleteSelectedLessons}>Delete selected ({selectedLessons.length})</button>
          <span>{selectedLessons.length} selected</span>
        </div>
        <div className="contentTableWrap">
          <table className="monitorTable">
            <thead><tr><th></th><th>Lesson</th><th>Media</th><th>Status</th><th>Questions</th><th>Action</th></tr></thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td><input aria-label={`Select ${row.title}`} type="checkbox" checked={selectedLessons.includes(row.id)} onChange={() => toggleLesson(row.id)} /></td>
                  <td><strong>{row.title}</strong><div className="tableSub">{row.school_level} · {row.topic || "Listening"}{row.generation_stage ? ` · ${row.generation_stage}` : ""}</div>{row.generation_error && <div className="tableSub">{row.generation_error}</div>}</td>
                  <td>{row.media_kind} · {row.provider}</td>
                  <td><span className={row.status === "published" ? "statusPill published" : "statusPill"}>{row.status}{row.status === "generating" && typeof row.generation_progress === "number" ? ` ${row.generation_progress}%` : ""}</span></td>
                  <td>{row.question_count}</td>
                  <td><div className="rowActions">
                    {row.scope!=="global"&&row.status!=="generating"&&<select aria-label={`Stage for ${row.title}`} value={row.school_level} disabled={busy} onChange={e=>void changeStage(row,e.target.value)}>{learningStages.map(stage=><option key={stage} value={stage}>{stage}</option>)}</select>}
                    {(row.status === "draft" || row.status === "published") && <Link className="button ghost smallButton" href={`/admin/listening/${row.id}`}>Review</Link>}
                    {row.status === "draft" && <button className="button primary smallButton" onClick={() => publish(row.id)}>Publish</button>}
                    {row.generation_job_id && row.status !== "published" && <button className="button ghost smallButton" onClick={() => remove(row.generation_job_id)}>Delete task</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
