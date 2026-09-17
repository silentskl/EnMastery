"use client";

import { useEffect, useMemo, useState } from "react";

type Story = {
  id: string;
  source_id: string;
  source_name: string;
  title: string;
  reference_url: string;
  school_level: "P5" | "P6";
  difficulty_band: "foundation" | "standard" | "advanced";
  difficulty_score: number;
  topic: string;
  content_flags_json: string;
  grading_reason: string;
  resolved_video_id?: string | null;
  resolved_video_url?: string | null;
  queue_count: number;
  import_count: number;
};

type Props = { scope: "platform" | "tenant"; onQueued?: () => void };
type StoryState = "curated" | "resolved";
const PAGE = 30;
const MAX_BATCH = 20;

function stateOf(story: Story): StoryState {
  return story.resolved_video_id || story.resolved_video_url ? "resolved" : "curated";
}

export function CuratedStoryBank({ scope, onQueued }: Props) {
  const endpoint = scope === "platform" ? "/api/platform/listening/catalog" : "/api/admin/listening/catalog";
  const [stories, setStories] = useState<Story[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [source, setSource] = useState("all");
  const [level, setLevel] = useState("all");
  const [band, setBand] = useState("all");
  const [state, setState] = useState("all");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [youtube, setYoutube] = useState(false);
  const [modelBridge, setModelBridge] = useState(false);
  const [resolverVersion, setResolverVersion] = useState("");
  const [youtubeCredential, setYoutubeCredential] = useState<{managed?:boolean;decryptable?:boolean;inherited?:boolean;settingKey?:string}|null>(null);
  const [modelBridgeCredential, setModelBridgeCredential] = useState<{configured?:boolean;source?:string;hint?:string}|null>(null);

  async function load() {
    const response = await fetch(endpoint);
    const body = await response.json().catch(() => ({})) as {
      stories?: Story[];
      youtubeEnabled?: boolean;
      modelBridgeEnabled?: boolean;
      resolverVersion?: string;
      youtubeCredential?: {managed?:boolean;decryptable?:boolean;inherited?:boolean;settingKey?:string};
      modelBridgeCredential?: {configured?:boolean;source?:string;hint?:string};
      error?: string;
    };
    if (!response.ok) {
      setMsg(body.error || "Could not load curated stories");
      return;
    }
    setStories(body.stories || []);
    setYoutube(Boolean(body.youtubeEnabled));
    setModelBridge(Boolean(body.modelBridgeEnabled));
    setResolverVersion(body.resolverVersion || "");
    setYoutubeCredential(body.youtubeCredential || null);
    setModelBridgeCredential(body.modelBridgeCredential || null);
  }

  useEffect(() => { void load(); }, [endpoint]);

  const sources = useMemo(
    () => [...new Map(stories.map((story) => [story.source_id, story.source_name])).entries()],
    [stories],
  );
  const filtered = useMemo(
    () => stories.filter((story) =>
      (source === "all" || story.source_id === source) &&
      (level === "all" || story.school_level === level) &&
      (band === "all" || story.difficulty_band === band) &&
      (state === "all" || stateOf(story) === state)
    ),
    [stories, source, level, band, state],
  );

  useEffect(() => {
    setPage(0);
    setSelected([]);
  }, [source, level, band, state]);

  const pageRows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const p5 = stories.filter((story) => story.school_level === "P5").length;
  const p6 = stories.filter((story) => story.school_level === "P6").length;
  const curated = stories.filter((story) => stateOf(story) === "curated").length;
  const resolved = stories.length - curated;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length >= MAX_BATCH
          ? current
          : [...current, id],
    );
  }

  function selectFiltered() {
    setSelected(filtered.slice(0, MAX_BATCH).map((story) => story.id));
  }

  function selectPage() {
    setSelected(pageRows.slice(0, MAX_BATCH).map((story) => story.id));
  }

  async function queue() {
    if (!selected.length) return;
    setBusy(true);
    setMsg(`Resolving and queueing ${selected.length} curated stor${selected.length === 1 ? "y" : "ies"}…`);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected }),
    });
    const body = await response.json().catch(() => ({})) as { accepted?: number; failed?: number; error?: string; results?: Array<{ id?: string; title?: string; status?: string; error?: string }> };
    setBusy(false);
    if (!response.ok) {
      const reasons = (body.results || []).filter((row) => row.status === "failed" && row.error).slice(0, 4).map((row) => `${row.title || row.id || "Story"}: ${row.error}`);
      setMsg(body.error || reasons.join(" · ") || "Could not queue curated stories");
      return;
    }
    setMsg(`${body.accepted || 0} lesson${body.accepted === 1 ? "" : "s"} queued${body.failed ? `; ${body.failed} could not be resolved` : ""}.`);
    setSelected([]);
    await load();
    onQueued?.();
  }

  return (
    <section className="card" style={{ marginTop: 20 }}>
      <div className="cardHeader">
        <div>
          <h2>Curated P5/P6 Story Bank</h2>
          <div className="tableSub">
            120 publisher-hosted stories · P5 {p5} · P6 {p6} · {curated} curated · {resolved} resolved
          </div>
        </div>
        <span>{filtered.length} shown{resolverVersion ? ` · resolver ${resolverVersion}` : ""}</span>
      </div>

      <div className="notice">
        <strong>Safe import workflow:</strong> this bank stores source metadata and grading only. Selecting a story prefers the approved publisher&apos;s YouTube video and safely falls back to the official publisher-hosted story page when no embeddable YouTube copy exists, then creates a {scope === "tenant" ? "tenant-private" : "global draft"} listening lesson. Publisher media and transcripts are not copied into English Mastery.
      </div>

      <div className="formGrid">
        <label>
          Source
          <select value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="all">All 4 curated sources</option>
            {sources.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
          </select>
        </label>
        <label>
          Level
          <select value={level} onChange={(event) => setLevel(event.target.value)}>
            <option value="all">P5 + P6</option>
            <option>P5</option>
            <option>P6</option>
          </select>
        </label>
        <label>
          Difficulty
          <select value={band} onChange={(event) => setBand(event.target.value)}>
            <option value="all">All bands</option>
            <option value="foundation">Foundation</option>
            <option value="standard">Standard</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <label>
          Status
          <select value={state} onChange={(event) => setState(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="curated">Curated only</option>
            <option value="resolved">Resolved only</option>
          </select>
        </label>
      </div>

      {!youtube && <div className="notice warnNotice">{youtubeCredential?.managed && youtubeCredential.decryptable===false ? <>Platform <code>YOUTUBE_API_KEY</code> exists but cannot be decrypted by this Worker. Verify <code>SETTINGS_MASTER_KEY</code> is the same value used when the key was saved.</> : <>YouTube resolution is unavailable because the Platform <code>YOUTUBE_API_KEY</code> is not configured.</>} {scope==="tenant"&&youtubeCredential?.inherited?"Tenant workspaces inherit this credential from Platform Admin. ":""}Stories with an official publisher-hosted page can still be queued through the safe publisher fallback.</div>}
      {!modelBridge && <div className="notice warnNotice">{scope === "platform" && modelBridgeCredential?.source === "platform" && modelBridgeCredential.configured === false ? <>Platform <code>MODELBRIDGE_API_KEY</code> exists in the managed settings vault but cannot be decrypted by this Worker. Verify <code>SETTINGS_MASTER_KEY</code> is the same value used when the key was saved.</> : <>ModelBridge must be configured before selected stories can be turned into lessons.</>}</div>}

      <div className="rowActions">
        <button className="button ghost smallButton" disabled={!filtered.length} onClick={selectFiltered}>Select up to 20 filtered</button>
        <button className="button ghost smallButton" disabled={!pageRows.length} onClick={selectPage}>Select page</button>
        <button className="button ghost smallButton" onClick={() => setSelected([])}>Clear</button>
        <button className="button primary smallButton" disabled={!selected.length || busy || !modelBridge} onClick={queue}>
          {busy ? "Working…" : `Resolve & queue ${selected.length}`}
        </button>
        <span>{selected.length}/{MAX_BATCH} selected</span>
      </div>

      {msg && <div className="notice">{msg}</div>}

      <div className="contentTableWrap">
        <table className="monitorTable">
          <thead><tr><th></th><th>Story</th><th>Grade</th><th>Topic</th><th>Source</th><th>State</th></tr></thead>
          <tbody>
            {pageRows.map((story) => {
              let flags: string[] = [];
              try {
                const parsed = JSON.parse(story.content_flags_json) as unknown;
                if (Array.isArray(parsed)) flags = parsed.filter((value): value is string => typeof value === "string");
              } catch {}
              const storyState = stateOf(story);
              return (
                <tr key={story.id}>
                  <td><input aria-label={`Select ${story.title}`} type="checkbox" checked={selected.includes(story.id)} onChange={() => toggle(story.id)} /></td>
                  <td>
                    <strong>{story.title}</strong>
                    <div className="tableSub">{story.grading_reason}</div>
                    {flags.length > 0 && <div className="tableSub">Content note: {flags.map((value) => value.replaceAll("_", " ")).join(", ")}</div>}
                  </td>
                  <td><strong>{story.school_level}</strong><div className="tableSub">{story.difficulty_band} · {Number(story.difficulty_score).toFixed(1)}/10</div></td>
                  <td>{story.topic}</td>
                  <td><a href={story.reference_url} target="_blank" rel="noreferrer">{story.source_name}</a></td>
                  <td>
                    <span className={storyState === "resolved" ? "statusPill published" : "statusPill"}>{storyState}</span>
                    <div className="tableSub">queued {story.queue_count} · imported {story.import_count}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rowActions">
        <button className="button ghost smallButton" disabled={page <= 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button>
        <span>Page {page + 1} / {pageCount}</span>
        <button className="button ghost smallButton" disabled={page >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>Next</button>
      </div>
    </section>
  );
}
