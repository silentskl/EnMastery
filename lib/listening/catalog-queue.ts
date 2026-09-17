import type { JobEnv } from "@/lib/jobs/dispatch";
import { createListeningImportJob } from "@/lib/jobs/lesson-create";
import { getCuratedStory, resolveCuratedStory } from "@/lib/listening/catalog";
import type { ListeningSource } from "@/lib/listening/types";

export async function queueCuratedStoryIds(env: JobEnv, ids: string[], options?: { tenantId?: string; createdBy?: string }) {
  if (!env.MODELBRIDGE_API_KEY || !env.MODELBRIDGE_CHAT_MODEL) throw new Error(options?.tenantId ? "This tenant ModelBridge is not configured" : "ModelBridge is not configured");
  const unique = [...new Set(ids.filter((x) => /^story-r9-\d{3}$/.test(x)))].slice(0, 20);
  if (!unique.length) throw new Error("Select at least one curated story");
  const results: Array<Record<string, unknown>> = [];
  let accepted = 0;
  for (const id of unique) {
    let storyTitle = "";
    try {
      const story = await getCuratedStory(env.DB, id);
      storyTitle = story?.title || "";
      if (!story) throw new Error("Curated story not found");
      const source = await env.DB.prepare("SELECT * FROM listening_sources WHERE id=? AND enabled=1").bind(story.source_id).first<ListeningSource>();
      if (!source || source.source_type !== "youtube_channel") throw new Error("Approved YouTube source is unavailable");
      // British Council LearnEnglish Kids curated stories are publisher-hosted first.
      // Their official story pages are the canonical media experience and many do not
      // have a stable/embeddable copy on the approved YouTube channel. Do not make
      // successful queueing depend on a YouTube match when an approved publisher page exists.
      const resolved = story.source_id === "listen-yt-british-council-kids" && story.companion_url
        ? {
            id: `publisher:${story.id}`,
            title: story.title,
            url: story.companion_url,
            provider: "publisher" as const,
            description: story.grading_reason,
            companionUrl: story.companion_url,
            companionAllowedHost: story.companion_allowed_host || "learnenglishkids.britishcouncil.org",
          }
        : await resolveCuratedStory(env.DB, story, source, env.YOUTUBE_API_KEY || "");
      if (resolved.provider === "publisher") {
        await env.DB.prepare(`UPDATE listening_story_catalog SET resolved_video_id=NULL,resolved_video_url=?,resolved_thumbnail_url=NULL,resolved_duration_seconds=NULL,resolved_made_for_kids=NULL,last_resolved_at=CURRENT_TIMESTAMP,last_resolve_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
          .bind(resolved.url, story.id).run();
      }
      const item = { ...resolved, title: story.title };
      const created = await createListeningImportJob(env, {
        source,
        item,
        schoolLevel: story.school_level,
        topic: story.topic,
        skillIds: ["L-MAIN", "L-DETAIL", "L-INFER"],
        useCompanion: Boolean(item.companionUrl),
        catalogItemId: story.id,
        tenantId: options?.tenantId,
        createdBy: options?.createdBy,
      });
      if (created.status !== "queued") throw new Error(created.error || "Could not queue story lesson");
      accepted++;
      await env.DB.prepare("UPDATE listening_story_catalog SET queue_count=queue_count+1,last_queued_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(story.id).run();
      results.push({ id: story.id, title: story.title, status: "queued", contentId: created.contentId, jobId: created.jobId });
    } catch (error) {
      results.push({ id, ...(storyTitle ? { title: storyTitle } : {}), status: "failed", error: error instanceof Error ? error.message : "Could not queue story" });
    }
  }
  return { accepted, failed: results.length - accepted, results };
}
