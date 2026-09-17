PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, role TEXT NOT NULL CHECK(role IN ('parent','student','admin','teacher')),
  display_name TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS child_profiles (
  id TEXT PRIMARY KEY, parent_user_id TEXT NOT NULL REFERENCES users(id), learner_user_id TEXT REFERENCES users(id), nickname TEXT NOT NULL,
  school_level TEXT NOT NULL CHECK(school_level IN ('P5','P6')), target_al TEXT NOT NULL DEFAULT 'AL2', exam_year INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS curriculum_versions (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, jurisdiction TEXT NOT NULL DEFAULT 'SG', level_range TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft','active','archived')), effective_from TEXT, effective_to TEXT, source_url TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY, curriculum_version_id TEXT NOT NULL REFERENCES curriculum_versions(id), domain TEXT NOT NULL,
  name TEXT NOT NULL, school_level TEXT NOT NULL, paper TEXT, difficulty INTEGER NOT NULL DEFAULT 2 CHECK(difficulty BETWEEN 1 AND 5), weight REAL, parent_skill_id TEXT REFERENCES skills(id)
);
CREATE INDEX IF NOT EXISTS idx_skills_domain ON skills(curriculum_version_id,domain);
CREATE TABLE IF NOT EXISTS syllabus_sources (
  id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, source_kind TEXT NOT NULL,
  discovery_url TEXT, link_match TEXT, resolved_url TEXT,
  enabled INTEGER NOT NULL DEFAULT 1, last_checked_at TEXT, last_success_at TEXT, last_hash TEXT, check_status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS syllabus_snapshots (
  id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES syllabus_sources(id), sha256 TEXT NOT NULL, http_status INTEGER NOT NULL,
  content_type TEXT, byte_length INTEGER, r2_key TEXT, captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_id,sha256)
);
CREATE TABLE IF NOT EXISTS syllabus_change_events (
  id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES syllabus_sources(id), old_hash TEXT, new_hash TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'review' CHECK(severity IN ('info','review','high','critical')), summary TEXT,
  impact_json TEXT, status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewing','accepted','dismissed','resolved')), detected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, reviewed_at TEXT
);
CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY, content_type TEXT NOT NULL CHECK(content_type IN ('article','audio','video_ref','lesson','writing_prompt','oral_prompt')),
  title TEXT NOT NULL, school_level TEXT NOT NULL, topic TEXT, source_url TEXT, licence TEXT, status TEXT NOT NULL DEFAULT 'draft', active_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS content_versions (
  id TEXT PRIMARY KEY, content_id TEXT NOT NULL REFERENCES content_items(id), version INTEGER NOT NULL, body_json TEXT NOT NULL,
  generation_model TEXT, curriculum_version_id TEXT REFERENCES curriculum_versions(id), review_status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(content_id,version)
);
CREATE TABLE IF NOT EXISTS content_skills (
  content_id TEXT NOT NULL REFERENCES content_items(id), skill_id TEXT NOT NULL REFERENCES skills(id), coverage REAL NOT NULL DEFAULT 1,
  PRIMARY KEY(content_id,skill_id)
);
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY, question_type TEXT NOT NULL, school_level TEXT NOT NULL, difficulty INTEGER NOT NULL CHECK(difficulty BETWEEN 1 AND 5),
  stem_json TEXT NOT NULL, answer_json TEXT NOT NULL, explanation_json TEXT, status TEXT NOT NULL DEFAULT 'draft', source_content_id TEXT REFERENCES content_items(id),
  curriculum_version_id TEXT NOT NULL REFERENCES curriculum_versions(id), generation_model TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS question_skills (
  question_id TEXT NOT NULL REFERENCES questions(id), skill_id TEXT NOT NULL REFERENCES skills(id), weight REAL NOT NULL DEFAULT 1,
  PRIMARY KEY(question_id,skill_id)
);
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, assessment_type TEXT NOT NULL CHECK(assessment_type IN ('diagnostic','weekly','monthly','mock','practice')),
  school_level TEXT NOT NULL, curriculum_version_id TEXT NOT NULL REFERENCES curriculum_versions(id), duration_minutes INTEGER, total_marks REAL, status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS assessment_items (
  assessment_id TEXT NOT NULL REFERENCES assessments(id), question_id TEXT NOT NULL REFERENCES questions(id), item_order INTEGER NOT NULL, marks REAL NOT NULL DEFAULT 1,
  PRIMARY KEY(assessment_id,question_id)
);
CREATE TABLE IF NOT EXISTS learner_attempts (
  id TEXT PRIMARY KEY, child_id TEXT NOT NULL REFERENCES child_profiles(id), activity_type TEXT NOT NULL, activity_id TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, completed_at TEXT, score REAL, max_score REAL, response_json TEXT, feedback_json TEXT, assisted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_attempts_child ON learner_attempts(child_id,completed_at);
CREATE TABLE IF NOT EXISTS skill_mastery (
  child_id TEXT NOT NULL REFERENCES child_profiles(id), skill_id TEXT NOT NULL REFERENCES skills(id), mastery REAL NOT NULL DEFAULT 0 CHECK(mastery BETWEEN 0 AND 100),
  evidence_count INTEGER NOT NULL DEFAULT 0, confidence REAL NOT NULL DEFAULT 0, last_evidence_at TEXT, next_review_at TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(child_id,skill_id)
);
CREATE TABLE IF NOT EXISTS learning_tasks (
  id TEXT PRIMARY KEY, child_id TEXT NOT NULL REFERENCES child_profiles(id), task_date TEXT NOT NULL, cadence TEXT NOT NULL DEFAULT 'daily',
  activity_type TEXT NOT NULL, activity_id TEXT, title TEXT NOT NULL, target_minutes INTEGER NOT NULL DEFAULT 10, xp_reward INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','done','skipped')), source TEXT NOT NULL DEFAULT 'ai_plan', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tasks_child_date ON learning_tasks(child_id,task_date,status);
CREATE TABLE IF NOT EXISTS xp_ledger (
  id TEXT PRIMARY KEY, child_id TEXT NOT NULL REFERENCES child_profiles(id), event_type TEXT NOT NULL, points INTEGER NOT NULL, reference_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS vocabulary_items (
  id TEXT PRIMARY KEY, lemma TEXT NOT NULL, part_of_speech TEXT, definition_json TEXT NOT NULL, pronunciation TEXT, UNIQUE(lemma,part_of_speech)
);
CREATE TABLE IF NOT EXISTS learner_vocabulary (
  child_id TEXT NOT NULL REFERENCES child_profiles(id), vocabulary_id TEXT NOT NULL REFERENCES vocabulary_items(id), mastery REAL NOT NULL DEFAULT 0,
  next_review_at TEXT, last_seen_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(child_id,vocabulary_id)
);
CREATE TABLE IF NOT EXISTS ai_runs (
  id TEXT PRIMARY KEY, purpose TEXT NOT NULL, model TEXT NOT NULL, provider TEXT, prompt_version TEXT, input_tokens INTEGER, output_tokens INTEGER,
  latency_ms INTEGER, status TEXT NOT NULL, reference_type TEXT, reference_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS notification_settings (
  id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), channel TEXT NOT NULL, destination TEXT NOT NULL, event_type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS content_update_jobs (
  id TEXT PRIMARY KEY, change_event_id TEXT NOT NULL REFERENCES syllabus_change_events(id), content_id TEXT REFERENCES content_items(id), skill_id TEXT REFERENCES skills(id),
  reason TEXT NOT NULL, proposed_changes_json TEXT, status TEXT NOT NULL DEFAULT 'needs_review' CHECK(status IN ('needs_review','drafted','approved','published','dismissed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY, actor_user_id TEXT REFERENCES users(id), action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, detail_json TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
