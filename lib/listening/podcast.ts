import { validatePublicUrl } from "@/lib/content/extract";
import type { ListeningDiscoveredItem } from "@/lib/listening/types";

function decode(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}
function strip(value: string) { return decode(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(); }
function tag(block: string, name: string) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? strip(m[1]) : "";
}
function attr(block: string, tagName: string, attrName: string) {
  const re = new RegExp(`<${tagName}\\b[^>]*${attrName}=["']([^"']+)["'][^>]*>`, "i");
  return decode(block.match(re)?.[1] || "");
}
function duration(value: string) {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return Number(value);
  const parts = value.split(":").map(Number);
  if (parts.some(Number.isNaN)) return undefined;
  return parts.reduce((sum, x) => sum * 60 + x, 0);
}

function podcastAllowedHosts(allowedHost: string) {
  const base = allowedHost.toLowerCase().replace(/^www\./, "");
  const hosts = new Set([base]);
  // NASA publishes official podcast feeds that may redirect to its AWS S3 audio host.
  // Keep this source-specific instead of allowing arbitrary third-party redirects.
  if (base === "nasa.gov") hosts.add("audio-podcast-files.s3.amazonaws.com");
  return hosts;
}

function validatePodcastUrl(raw: string, allowedHosts: Set<string>) {
  const url = validatePublicUrl(raw);
  const host = url.hostname.toLowerCase();
  const ok = [...allowedHosts].some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  if (!ok) throw new Error(`Podcast URL host ${host} is not allowed for this source (allowed: ${[...allowedHosts].join(", ")})`);
  return url;
}

async function fetchFeed(feedUrl: string, allowedHost: string) {
  const allowedHosts = podcastAllowedHosts(allowedHost);
  let url = validatePodcastUrl(feedUrl, allowedHosts);
  for (let redirect = 0; redirect <= 4; redirect++) {
    const response = await fetch(url, { redirect: "manual", headers: { "User-Agent": "EnglishMastery/0.3 listening-discovery", Accept: "application/rss+xml,application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.2" } });
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Podcast redirect has no Location header");
      url = validatePodcastUrl(new URL(location, url).toString(), allowedHosts);
      continue;
    }
    if (!response.ok) throw new Error(`Podcast feed returned HTTP ${response.status}`);
    const len = Number(response.headers.get("content-length") || 0);
    if (len > 3_000_000) throw new Error("Podcast feed is larger than 3 MB");
    const text = await response.text();
    if (text.length > 3_000_000) throw new Error("Podcast feed is larger than 3 MB");
    return text;
  }
  throw new Error("Too many podcast feed redirects");
}

export async function discoverPodcastFeed(feedUrl: string, allowedHost: string): Promise<ListeningDiscoveredItem[]> {
  const xml = await fetchFeed(feedUrl, allowedHost);
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  const items: ListeningDiscoveredItem[] = [];
  const seen = new Set<string>();
  for (const block of blocks.slice(0, 50)) {
    const title = tag(block, "title") || "Untitled podcast episode";
    let link = tag(block, "link") || attr(block, "link", "href");
    const mediaUrl = attr(block, "enclosure", "url") || attr(block, "media:content", "url") || attr(block, "media:audio", "url");
    if (!mediaUrl) continue;
    try { validatePublicUrl(mediaUrl); } catch { continue; }
    if (!link) link = mediaUrl;
    try { link = validatePublicUrl(link).toString(); } catch { link = mediaUrl; }
    if (seen.has(mediaUrl)) continue;
    seen.add(mediaUrl);
    const image = attr(block, "itunes:image", "href") || attr(block, "media:thumbnail", "url");
    const rawDesc = tag(block, "description") || tag(block, "summary") || tag(block, "content:encoded") || tag(block, "itunes:summary");
    const id = tag(block, "guid") || tag(block, "id") || mediaUrl;
    items.push({
      id: id.slice(0, 500),
      title,
      description: rawDesc.slice(0, 2400),
      publishedAt: tag(block, "pubDate") || tag(block, "published") || tag(block, "updated") || undefined,
      url: link,
      companionUrl: link,
      provider: "podcast",
      mediaUrl,
      thumbnailUrl: image || undefined,
      durationSeconds: duration(tag(block, "itunes:duration")),
    });
    if (items.length >= 20) break;
  }
  return items;
}
