PRAGMA foreign_keys = OFF;

CREATE TABLE listening_imports_new (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES listening_sources(id),
  source_item_url TEXT NOT NULL,
  source_title TEXT,
  external_media_id TEXT,
  media_kind TEXT NOT NULL CHECK(media_kind IN ('youtube','podcast','owned_audio','external_video')),
  school_level TEXT NOT NULL CHECK(school_level IN ('P5','P6')),
  target_topic TEXT,
  question_basis TEXT NOT NULL DEFAULT 'metadata_only' CHECK(question_basis IN ('metadata_only','companion_text','teacher_transcript')),
  status TEXT NOT NULL DEFAULT 'discovered' CHECK(status IN ('discovered','adapted','failed')),
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO listening_imports_new (
  id,source_id,source_item_url,source_title,external_media_id,media_kind,
  school_level,target_topic,question_basis,status,error,created_at
)
SELECT
  id,source_id,source_item_url,source_title,external_media_id,media_kind,
  school_level,target_topic,question_basis,status,error,created_at
FROM listening_imports;

DROP TABLE listening_imports;
ALTER TABLE listening_imports_new RENAME TO listening_imports;
CREATE INDEX IF NOT EXISTS idx_listening_imports_source ON listening_imports(source_id, created_at);

CREATE TABLE content_media_new (
  content_id TEXT PRIMARY KEY REFERENCES content_items(id) ON DELETE CASCADE,
  media_kind TEXT NOT NULL CHECK(media_kind IN ('youtube','podcast','owned_audio','external_video')),
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

INSERT INTO content_media_new (
  content_id,media_kind,provider,external_id,media_url,embed_url,thumbnail_url,
  duration_seconds,made_for_kids,source_title,source_item_url,question_basis,
  transcript_policy,created_at,updated_at
)
SELECT
  content_id,media_kind,provider,external_id,media_url,embed_url,thumbnail_url,
  duration_seconds,made_for_kids,source_title,source_item_url,question_basis,
  transcript_policy,created_at,updated_at
FROM content_media;

DROP TABLE content_media;
ALTER TABLE content_media_new RENAME TO content_media;
CREATE INDEX IF NOT EXISTS idx_content_media_kind ON content_media(media_kind, provider);

PRAGMA foreign_keys = ON;
