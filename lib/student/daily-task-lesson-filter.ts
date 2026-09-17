export type ListeningLessonMedia = {
  contentType: string;
  mediaKind: string | null;
  durationSeconds: number | null;
};

/** Count the learner-facing passage text only; title/summary/questions are not part of the Reading cap. */
export function readingWordCount(bodyJson: string | null | undefined): number {
  if (!bodyJson) return 0;
  try {
    const body = JSON.parse(bodyJson) as { paragraphs?: unknown; text?: unknown } | null;
    if (!body || typeof body !== "object") return 0;
    const paragraphs = Array.isArray(body.paragraphs)
      ? body.paragraphs.filter((x): x is string => typeof x === "string")
      : [];
    const text = paragraphs.length ? paragraphs.join(" ") : typeof body.text === "string" ? body.text : "";
    return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  } catch {
    return 0;
  }
}

export function readingMeetsDailyLimit(bodyJson: string | null | undefined, maxWords: number): boolean {
  if (maxWords <= 0) return true;
  const words = readingWordCount(bodyJson);
  // Strict when configured: unknown/empty length is not allowed into the Daily Task pool.
  return words > 0 && words <= maxWords;
}

export function listeningMeetsDailyLimit(media: ListeningLessonMedia, maxVideoSeconds: number): boolean {
  if (maxVideoSeconds <= 0) return true;
  const isVideo = media.contentType === "video_ref" || media.mediaKind === "youtube" || media.mediaKind === "external_video";
  // The setting is intentionally a video-duration cap; audio/podcast lessons are unaffected.
  if (!isVideo) return true;
  const seconds = Number(media.durationSeconds || 0);
  // Strict when configured: a video without a verified duration is skipped.
  return seconds > 0 && seconds <= maxVideoSeconds;
}
