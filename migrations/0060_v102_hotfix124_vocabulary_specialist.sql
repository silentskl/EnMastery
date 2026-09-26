PRAGMA foreign_keys = ON;

-- V1.0.2 Hotfix 12.4: learner-entered Vocabulary Specialist practice.
-- Tenant Admin configures a daily word target by learner stage. Each entered word
-- produces one PSLE-style four-option question, then all words are reused in a
-- 400-500 word final cloze. The cloze requires 100% exact word matching to PASS.
CREATE TABLE IF NOT EXISTS tenant_vocabulary_specialist_policy (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  learner_stage TEXT NOT NULL CHECK(learner_stage IN ('P1-P4','P5','P6','S1','S2','S3','S4')),
  daily_words INTEGER NOT NULL DEFAULT 10 CHECK(daily_words BETWEEN 1 AND 30),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(tenant_id,learner_stage)
);

WITH stages(level) AS (
  VALUES ('P1-P4'),('P5'),('P6'),('S1'),('S2'),('S3'),('S4')
)
INSERT OR IGNORE INTO tenant_vocabulary_specialist_policy(tenant_id,learner_stage,daily_words)
SELECT t.id,s.level,10 FROM tenants t CROSS JOIN stages s;

CREATE TABLE IF NOT EXISTS vocabulary_specialist_sessions (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_date TEXT NOT NULL,
  school_level TEXT NOT NULL CHECK(school_level IN ('P1-P4','P5','P6','S1','S2','S3','S4')),
  daily_target INTEGER NOT NULL CHECK(daily_target BETWEEN 1 AND 30),
  status TEXT NOT NULL DEFAULT 'collecting' CHECK(status IN ('collecting','cloze_ready','passed')),
  words_completed INTEGER NOT NULL DEFAULT 0,
  cloze_title TEXT,
  cloze_passage TEXT,
  cloze_blanks_json TEXT,
  cloze_generated_at TEXT,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  passed_at TEXT,
  UNIQUE(child_id,task_date)
);
CREATE INDEX IF NOT EXISTS idx_vocab_special_sessions_child_date ON vocabulary_specialist_sessions(child_id,task_date DESC);
CREATE INDEX IF NOT EXISTS idx_vocab_special_sessions_tenant_date ON vocabulary_specialist_sessions(tenant_id,task_date DESC,child_id);

CREATE TABLE IF NOT EXISTS vocabulary_specialist_wordbook (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  part_of_speech TEXT,
  definition TEXT NOT NULL DEFAULT '',
  chinese_meaning TEXT,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_practised_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  times_practised INTEGER NOT NULL DEFAULT 1,
  UNIQUE(child_id,normalized_term)
);
CREATE INDEX IF NOT EXISTS idx_vocab_special_wordbook_child ON vocabulary_specialist_wordbook(child_id,last_practised_at DESC);
CREATE INDEX IF NOT EXISTS idx_vocab_special_wordbook_tenant ON vocabulary_specialist_wordbook(tenant_id,child_id,normalized_term);

CREATE TABLE IF NOT EXISTS vocabulary_specialist_question_attempts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES vocabulary_specialist_sessions(id) ON DELETE CASCADE,
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  wordbook_word_id TEXT NOT NULL REFERENCES vocabulary_specialist_wordbook(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL,
  term TEXT NOT NULL,
  stem TEXT NOT NULL,
  options_json TEXT NOT NULL,
  answer_index INTEGER NOT NULL CHECK(answer_index BETWEEN 0 AND 3),
  selected_index INTEGER CHECK(selected_index BETWEEN 0 AND 3),
  correct INTEGER,
  explanation TEXT NOT NULL DEFAULT '',
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  answered_at TEXT,
  UNIQUE(session_id,item_order),
  UNIQUE(session_id,wordbook_word_id)
);
CREATE INDEX IF NOT EXISTS idx_vocab_special_questions_session ON vocabulary_specialist_question_attempts(session_id,item_order);
CREATE INDEX IF NOT EXISTS idx_vocab_special_questions_child ON vocabulary_specialist_question_attempts(child_id,generated_at DESC);

CREATE TABLE IF NOT EXISTS vocabulary_specialist_cloze_attempts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES vocabulary_specialist_sessions(id) ON DELETE CASCADE,
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  answers_json TEXT NOT NULL,
  correctness_json TEXT NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  passed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vocab_special_cloze_session ON vocabulary_specialist_cloze_attempts(session_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vocab_special_cloze_child ON vocabulary_specialist_cloze_attempts(child_id,created_at DESC);
