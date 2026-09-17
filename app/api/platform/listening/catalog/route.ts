import { getEnv } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import { integrationCredentialState, resolvePlatformIntegrations } from "@/lib/settings/runtime";
import { listCuratedStories } from "@/lib/listening/catalog";
import { queueCuratedStoryIds } from "@/lib/listening/catalog-queue";

export async function GET(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  const env = await resolvePlatformIntegrations(getEnv());
  const stories = await listCuratedStories(env.DB);
  const youtubeCredential = await integrationCredentialState(getEnv(), "YOUTUBE_API_KEY");
  const modelBridgeCredential = await integrationCredentialState(getEnv(), "MODELBRIDGE_API_KEY");
  return Response.json({ resolverVersion: "r19-hotfix10", stories, count: stories.length, youtubeEnabled: Boolean(env.YOUTUBE_API_KEY), youtubeCredential, modelBridgeCredential, modelBridgeEnabled: Boolean(env.MODELBRIDGE_API_KEY && env.MODELBRIDGE_CHAT_MODEL) });
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  const body = await request.json().catch(() => ({})) as { ids?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string") : [];
  if (!ids.length) return Response.json({ error: "Select at least one curated story" }, { status: 400 });
  const env = await resolvePlatformIntegrations(getEnv());
  try {
    const result = await queueCuratedStoryIds(env, ids);
    const failures = result.results.filter((row) => row.status === "failed");
    const error = result.accepted > 0 ? undefined : failures.slice(0, 3).map((row) => `${row.id || "story"}: ${row.error || "Could not queue"}`).join(" · ") || "Could not queue curated stories";
    return Response.json({ resolverVersion: "r19-hotfix10", ok: result.accepted > 0, ...result, ...(error ? { error } : {}) }, { status: result.accepted > 0 ? 202 : 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not queue curated stories" }, { status: 503 });
  }
}
