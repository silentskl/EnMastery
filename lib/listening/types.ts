import type { LearningQuestion, VocabularyEntry } from "@/lib/content/types";

export type ListeningSourceType = "youtube_channel" | "podcast_rss";
export type ListeningProvider = "youtube" | "podcast" | "publisher";
export type QuestionBasis = "metadata_only" | "companion_text" | "teacher_transcript" | "owned_transcript";

export type ListeningSource = {
  id: string;
  name: string;
  source_type: ListeningSourceType;
  base_url: string;
  provider_ref: string | null;
  allowed_host: string | null;
  topic: string | null;
  default_level: "P5" | "P6";
  usage_mode: string;
  enabled: number;
  last_discovered_at: string | null;
};

export type ListeningDiscoveredItem = {
  id: string;
  title: string;
  url: string;
  provider: ListeningProvider;
  description?: string;
  publishedAt?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  madeForKids?: boolean | null;
  embeddable?: boolean;
  companionUrl?: string;
  companionAllowedHost?: string;
};

export type ListeningBody = {
  mode: "authentic" | "guided";
  learningGoal: string;
  instructions: string[];
  passes: Array<{ title: string; instruction: string }>;
  topicVocabulary?: VocabularyEntry[];
  studyNotes?: string[];
  sourceNote?: string;
};

export type ListeningMaterial = {
  title: string;
  description: string;
  topic: string;
  body: ListeningBody;
  questions: LearningQuestion[];
};

export type StoredMedia = {
  media_kind: "youtube" | "podcast" | "owned_audio" | "external_video";
  provider: string;
  external_id: string | null;
  media_url: string | null;
  embed_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  made_for_kids: number | null;
  source_title: string | null;
  source_item_url: string | null;
  question_basis: QuestionBasis;
  transcript_policy: "not_stored" | "owned" | "licensed";
};
