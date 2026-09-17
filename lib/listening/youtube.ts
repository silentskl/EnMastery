import type { ListeningDiscoveredItem } from "@/lib/listening/types";

function durationToSeconds(value: string | undefined) {
  if (!value) return undefined;
  const m = value.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return undefined;
  return Number(m[1] || 0) * 86400 + Number(m[2] || 0) * 3600 + Number(m[3] || 0) * 60 + Number(m[4] || 0);
}

async function youtubeJson<T>(path: string, params: Record<string, string>, apiKey: string): Promise<T> {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  Object.entries({ ...params, key: apiKey }).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`YouTube Data API returned HTTP ${response.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`);
  }
  return response.json() as Promise<T>;
}

function channelFilter(providerRef: string): Record<string, string> {
  const value = providerRef.trim();
  if (/^UC[A-Za-z0-9_-]{20,}$/.test(value)) return { id: value };
  if (value.startsWith("@")) return { forHandle: value };
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const handle = parts.find((x) => x.startsWith("@"));
    if (handle) return { forHandle: handle };
    const channelIndex = parts.indexOf("channel");
    if (channelIndex >= 0) {
      const id = parts[channelIndex + 1];
      if (id) return { id };
    }
  } catch { /* providerRef can be a simple handle */ }
  return { forHandle: value.startsWith("@") ? value : `@${value}` };
}

export async function resolveYouTubeChannelId(providerRef: string, apiKey: string) {
  const channel = await youtubeJson<{ items?: Array<{ id: string }> }>("channels", { part: "id", ...channelFilter(providerRef) }, apiKey);
  const id = channel.items?.[0]?.id;
  if (!id) throw new Error("YouTube channel could not be resolved");
  return id;
}

type VideoDetail = {
  id: string;
  snippet?: { title?: string; description?: string; publishedAt?: string; thumbnails?: Record<string, { url?: string }> };
  contentDetails?: { duration?: string };
  status?: { embeddable?: boolean; madeForKids?: boolean; privacyStatus?: string };
};

function toDiscovered(v: VideoDetail): ListeningDiscoveredItem | null {
  if (v.status?.embeddable !== true || v.status?.privacyStatus === "private") return null;
  const duration = durationToSeconds(v.contentDetails?.duration);
  if (duration !== undefined && (duration < 45 || duration > 2700)) return null;
  const thumbnails = v.snippet?.thumbnails || {};
  const thumbnailUrl = thumbnails.maxres?.url || thumbnails.standard?.url || thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url;
  return {
    id: v.id,
    title: v.snippet?.title || "Untitled YouTube video",
    description: (v.snippet?.description || "").slice(0, 1800),
    publishedAt: v.snippet?.publishedAt,
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`,
    provider: "youtube",
    thumbnailUrl,
    durationSeconds: duration,
    madeForKids: typeof v.status?.madeForKids === "boolean" ? v.status.madeForKids : null,
    embeddable: true,
  };
}

async function videoDetails(ids: string[], apiKey: string) {
  if (!ids.length) return [] as VideoDetail[];
  const details = await youtubeJson<{ items?: VideoDetail[] }>("videos", { part: "snippet,contentDetails,status", id: ids.join(",") }, apiKey);
  return details.items || [];
}

export async function getYouTubeVideoById(videoId: string, apiKey: string): Promise<ListeningDiscoveredItem | null> {
  const rows = await videoDetails([videoId], apiKey);
  return rows[0] ? toDiscovered(rows[0]) : null;
}

function normaliseTitle(value: string) {
  return value.toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9]+/g, " ").trim();
}
function titleScore(target: string, candidate: string) {
  const a = normaliseTitle(target), b = normaliseTitle(candidate);
  if (a === b) return 1000;
  let score = 0;
  if (b.includes(a) || a.includes(b)) score += 300;
  const aa = new Set(a.split(/\s+/).filter((x) => x.length > 1));
  const bb = new Set(b.split(/\s+/).filter((x) => x.length > 1));
  let overlap = 0;
  for (const token of aa) if (bb.has(token)) overlap++;
  score += aa.size ? Math.round((overlap / aa.size) * 200) : 0;
  score -= Math.abs(a.length - b.length) / 10;
  return score;
}

export async function resolveYouTubeVideoByTitle(providerRef: string, title: string, apiKey: string): Promise<ListeningDiscoveredItem | null> {
  const channelId = await resolveYouTubeChannelId(providerRef, apiKey);
  const search = await youtubeJson<{ items?: Array<{ id?: { videoId?: string } }> }>("search", {
    part: "id",
    channelId,
    q: title,
    type: "video",
    maxResults: "8",
    videoEmbeddable: "true",
    safeSearch: "moderate",
  }, apiKey);
  const ids = (search.items || []).map((x) => x.id?.videoId).filter((x): x is string => Boolean(x));
  const details = await videoDetails(ids, apiKey);
  const candidates = details.map(toDiscovered).filter((x): x is ListeningDiscoveredItem => Boolean(x));
  candidates.sort((a, b) => titleScore(title, b.title) - titleScore(title, a.title));
  return candidates[0] || null;
}

export type YouTubeDiscoveryOptions = {
  query?: string;
  maxResults?: number;
  order?: "date" | "relevance" | "viewCount";
  publishedAfter?: string;
  publishedBefore?: string;
  minDurationSeconds?: number;
  maxDurationSeconds?: number;
  madeForKids?: "all" | "yes" | "no";
};

function matchesDiscoveryFilters(item: ListeningDiscoveredItem, options: YouTubeDiscoveryOptions) {
  const published = item.publishedAt ? Date.parse(item.publishedAt) : NaN;
  if (options.publishedAfter) {
    const after = Date.parse(options.publishedAfter);
    if (Number.isFinite(after) && (!Number.isFinite(published) || published < after)) return false;
  }
  if (options.publishedBefore) {
    const before = Date.parse(options.publishedBefore.length === 10 ? `${options.publishedBefore}T23:59:59.999Z` : options.publishedBefore);
    if (Number.isFinite(before) && (!Number.isFinite(published) || published > before)) return false;
  }
  if (typeof options.minDurationSeconds === "number" && (item.durationSeconds ?? 0) < options.minDurationSeconds) return false;
  if (typeof options.maxDurationSeconds === "number" && (item.durationSeconds ?? Number.MAX_SAFE_INTEGER) > options.maxDurationSeconds) return false;
  if (options.madeForKids === "yes" && item.madeForKids !== true) return false;
  if (options.madeForKids === "no" && item.madeForKids === true) return false;
  return true;
}

export async function discoverYouTubeChannel(
  providerRef: string,
  apiKey: string,
  options: YouTubeDiscoveryOptions = {},
): Promise<ListeningDiscoveredItem[]> {
  const maxResults = Math.min(50, Math.max(1, Math.floor(options.maxResults || 25)));
  const query = (options.query || "").trim();
  const order = options.order || (query ? "relevance" : "date");
  const channelId = await resolveYouTubeChannelId(providerRef, apiKey);

  // Search is intentionally optional. Listing the uploads playlist is much cheaper
  // in YouTube quota terms and is the default; search is used only when the admin
  // explicitly asks for a keyword inside the configured channel.
  if (query) {
    const searchParams: Record<string, string> = {
      part: "id",
      channelId,
      q: query,
      type: "video",
      maxResults: String(maxResults),
      videoEmbeddable: "true",
      safeSearch: "moderate",
      order,
    };
    if (options.publishedAfter) searchParams.publishedAfter = options.publishedAfter;
    if (options.publishedBefore) searchParams.publishedBefore = options.publishedBefore;
    const search = await youtubeJson<{
      items?: Array<{ id?: { videoId?: string } }>;
    }>("search", searchParams, apiKey);
    const ids = (search.items || [])
      .map((x) => x.id?.videoId)
      .filter((x): x is string => Boolean(x));
    const details = await videoDetails(ids, apiKey);
    const byId = new Map(details.map((v) => [v.id, v]));
    const out: ListeningDiscoveredItem[] = [];
    for (const id of ids) {
      const item = byId.get(id);
      if (!item) continue;
      const discovered = toDiscovered(item);
      if (discovered && matchesDiscoveryFilters(discovered, options)) out.push(discovered);
      if (out.length >= maxResults) break;
    }
    return out;
  }

  const channel = await youtubeJson<{
    items?: Array<{ id: string; contentDetails?: { relatedPlaylists?: { uploads?: string } } }>;
  }>("channels", { part: "contentDetails", id: channelId }, apiKey);
  const uploads = channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error("YouTube channel could not be resolved or has no public uploads playlist");

  const out: ListeningDiscoveredItem[] = [];
  let pageToken = "";
  while (out.length < maxResults) {
    const params: Record<string, string> = {
      part: "snippet",
      playlistId: uploads,
      maxResults: String(Math.min(50, maxResults - out.length)),
    };
    if (pageToken) params.pageToken = pageToken;
    const playlist = await youtubeJson<{
      items?: Array<{ snippet?: { resourceId?: { videoId?: string } } }>;
      nextPageToken?: string;
    }>("playlistItems", params, apiKey);
    const videoIds = (playlist.items || [])
      .map((x) => x.snippet?.resourceId?.videoId)
      .filter((x): x is string => Boolean(x));
    if (videoIds.length) {
      const details = await videoDetails(videoIds, apiKey);
      const byId = new Map(details.map((v) => [v.id, v]));
      for (const id of videoIds) {
        const item = byId.get(id);
        if (!item) continue;
        const discovered = toDiscovered(item);
        if (discovered && matchesDiscoveryFilters(discovered, options)) out.push(discovered);
        if (out.length >= maxResults) break;
      }
    }
    pageToken = playlist.nextPageToken || "";
    if (!pageToken || !videoIds.length) break;
  }
  return out.slice(0, maxResults);
}
