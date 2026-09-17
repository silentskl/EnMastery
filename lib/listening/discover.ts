import type { ListeningDiscoveredItem, ListeningSource } from "@/lib/listening/types";
import { discoverYouTubeChannel, type YouTubeDiscoveryOptions } from "@/lib/listening/youtube";
import { discoverPodcastFeed } from "@/lib/listening/podcast";

export async function discoverListeningSource(source: ListeningSource, youtubeApiKey?: string, youtubeOptions: YouTubeDiscoveryOptions = {}): Promise<ListeningDiscoveredItem[]> {
  if (source.source_type === "youtube_channel") {
    if (!youtubeApiKey) throw new Error("YOUTUBE_API_KEY is not configured. Podcast sources can still be used without it.");
    return discoverYouTubeChannel(source.provider_ref || source.base_url, youtubeApiKey, youtubeOptions);
  }
  if (!source.allowed_host) throw new Error("Podcast source is missing allowed_host");
  return discoverPodcastFeed(source.base_url, source.allowed_host);
}
