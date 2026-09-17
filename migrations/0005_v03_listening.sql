PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS listening_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK(source_type IN ('youtube_channel','podcast_rss')),
  base_url TEXT NOT NULL,
  provider_ref TEXT,
  allowed_host TEXT,
  topic TEXT,
  default_level TEXT NOT NULL DEFAULT 'P6' CHECK(default_level IN ('P5','P6')),
  usage_mode TEXT NOT NULL DEFAULT 'reference_only' CHECK(usage_mode IN ('reference_only','public_domain','licensed','owned')),
  enabled INTEGER NOT NULL DEFAULT 1,
  last_discovered_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_listening_sources_enabled ON listening_sources(enabled, source_type);

CREATE TABLE IF NOT EXISTS listening_imports (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES listening_sources(id),
  source_item_url TEXT NOT NULL,
  source_title TEXT,
  external_media_id TEXT,
  media_kind TEXT NOT NULL CHECK(media_kind IN ('youtube','podcast')),
  school_level TEXT NOT NULL CHECK(school_level IN ('P5','P6')),
  target_topic TEXT,
  question_basis TEXT NOT NULL DEFAULT 'metadata_only' CHECK(question_basis IN ('metadata_only','companion_text','teacher_transcript')),
  status TEXT NOT NULL DEFAULT 'discovered' CHECK(status IN ('discovered','adapted','failed')),
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_listening_imports_source ON listening_imports(source_id, created_at);

CREATE TABLE IF NOT EXISTS content_media (
  content_id TEXT PRIMARY KEY REFERENCES content_items(id) ON DELETE CASCADE,
  media_kind TEXT NOT NULL CHECK(media_kind IN ('youtube','podcast','owned_audio')),
  provider TEXT NOT NULL,
  external_id TEXT,
  media_url TEXT,
  embed_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  made_for_kids INTEGER,
  source_title TEXT,
  source_item_url TEXT,
  question_basis TEXT NOT NULL DEFAULT 'metadata_only' CHECK(question_basis IN ('metadata_only','companion_text','teacher_transcript','owned_transcript')),
  transcript_policy TEXT NOT NULL DEFAULT 'not_stored' CHECK(transcript_policy IN ('not_stored','owned','licensed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_content_media_kind ON content_media(media_kind, provider);
