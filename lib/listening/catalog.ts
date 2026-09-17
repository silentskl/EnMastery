import type { ListeningDiscoveredItem, ListeningSource } from "@/lib/listening/types";
import { getYouTubeVideoById, resolveYouTubeVideoByTitle } from "@/lib/listening/youtube";

export type CuratedStory = {
  id: string;
  source_id: string;
  source_name: string;
  title: string;
  youtube_search_title: string;
  reference_url: string;
  youtube_video_id: string | null;
  companion_url: string | null;
  companion_allowed_host: string | null;
  school_level: "P5" | "P6";
  difficulty_band: "foundation" | "standard" | "advanced";
  difficulty_score: number;
  topic: string;
  content_flags_json: string;
  grading_reason: string;
  resolved_video_id: string | null;
  resolved_video_url: string | null;
  resolved_thumbnail_url: string | null;
  resolved_duration_seconds: number | null;
  resolved_made_for_kids: number | null;
  queue_count: number;
  import_count: number;
};

export async function listCuratedStories(db: D1Database) {
  const rows = await db.prepare(`SELECT c.*,s.name AS source_name
    FROM listening_story_catalog c JOIN listening_sources s ON s.id=c.source_id
    WHERE c.enabled=1 AND s.enabled=1
    ORDER BY CASE c.school_level WHEN 'P5' THEN 0 ELSE 1 END,c.difficulty_score,c.source_id,c.title`).all<CuratedStory>();
  return rows.results;
}

export async function getCuratedStory(db: D1Database, id: string) {
  return db.prepare(`SELECT c.*,s.name AS source_name
    FROM listening_story_catalog c JOIN listening_sources s ON s.id=c.source_id
    WHERE c.id=? AND c.enabled=1 AND s.enabled=1`).bind(id).first<CuratedStory>();
}

function tedLessonFromDescription(sourceId: string, description?: string) {
  if (sourceId !== "listen-yt-teded" || !description) return undefined;
  const urls = description.match(/https?:\/\/[^\s<>]+/g) || [];
  for (const raw of urls) {
    try {
      const cleaned = raw.replace(/[),.;!?]+$/, "");
      const url = new URL(cleaned);
      if ((url.hostname === "ed.ted.com" || url.hostname.endsWith(".ed.ted.com")) && url.pathname.startsWith("/lessons/")) return url.toString();
    } catch { /* ignore malformed description URL */ }
  }
  return undefined;
}

export async function resolveCuratedStory(db: D1Database, story: CuratedStory, source: ListeningSource, apiKey: string): Promise<ListeningDiscoveredItem> {
  const preferred = story.resolved_video_id || story.youtube_video_id;
  let item = apiKey && preferred ? await getYouTubeVideoById(preferred, apiKey) : null;
  if (!item && apiKey) item = await resolveYouTubeVideoByTitle(source.provider_ref || source.base_url, story.youtube_search_title, apiKey);
  if (!item && story.companion_url) {
    const publisherItem: ListeningDiscoveredItem = {
      id: `publisher:${story.id}`,
      title: story.title,
      url: story.companion_url,
      provider: "publisher",
      description: story.grading_reason,
      companionUrl: story.companion_url,
      companionAllowedHost: story.companion_allowed_host || undefined,
    };
    await db.prepare(`UPDATE listening_story_catalog SET resolved_video_id=NULL,resolved_video_url=?,resolved_thumbnail_url=NULL,resolved_duration_seconds=NULL,resolved_made_for_kids=NULL,last_resolved_at=CURRENT_TIMESTAMP,last_resolve_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(story.companion_url, story.id).run();
    return publisherItem;
  }
  if (!item) {
    const error = !apiKey
      ? `No eligible publisher media was found: Platform YOUTUBE_API_KEY is unavailable to the listening resolver for ${source.name}; this story has no publisher-hosted fallback page`
      : `No eligible publisher media was found: YouTube returned no eligible embeddable match on the approved publisher channel for \"${story.youtube_search_title}\" and no publisher-hosted story page is configured`;
    await db.prepare("UPDATE listening_story_catalog SET last_resolve_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(error, story.id).run();
    throw new Error(error);
  }
  const tedCompanion = tedLessonFromDescription(story.source_id, item.description);
  const enriched: ListeningDiscoveredItem = {
    ...item,
    companionUrl: story.companion_url || tedCompanion || undefined,
    companionAllowedHost: story.companion_allowed_host || (tedCompanion ? "ed.ted.com" : undefined),
  };
  await db.prepare(`UPDATE listening_story_catalog SET resolved_video_id=?,resolved_video_url=?,resolved_thumbnail_url=?,resolved_duration_seconds=?,resolved_made_for_kids=?,last_resolved_at=CURRENT_TIMESTAMP,last_resolve_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(item.id,item.url,item.thumbnailUrl||null,item.durationSeconds||null,typeof item.madeForKids==="boolean"?(item.madeForKids?1:0):null,story.id).run();
  return enriched;
}
