PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS question_generation_batches (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES question_bank_sources(id),
  school_level TEXT NOT NULL CHECK(school_level IN ('P5','P6')),
  category TEXT NOT NULL CHECK(category IN ('oral','reading_comprehension','cloze','writing')),
  subcategory TEXT NOT NULL,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  topic TEXT NOT NULL,
  difficulty INTEGER NOT NULL CHECK(difficulty BETWEEN 1 AND 5),
  requested_count INTEGER NOT NULL CHECK(requested_count BETWEEN 1 AND 50),
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','ready','partial','completed','failed','cancelled')),
  generation_model TEXT,
  source_brief TEXT,
  source_stage TEXT NOT NULL DEFAULT 'pending',
  source_error TEXT,
  created_by TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_qgen_batch_status ON question_generation_batches(status,created_at);
CREATE INDEX IF NOT EXISTS idx_qgen_batch_source ON question_generation_batches(source_id,created_at);

ALTER TABLE question_bank_items ADD COLUMN batch_id TEXT REFERENCES question_generation_batches(id);
ALTER TABLE question_bank_items ADD COLUMN generation_job_id TEXT;
ALTER TABLE question_bank_items ADD COLUMN review_status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE question_bank_items ADD COLUMN quality_score REAL;
ALTER TABLE question_bank_items ADD COLUMN quality_json TEXT;
ALTER TABLE question_bank_items ADD COLUMN fingerprint TEXT;
ALTER TABLE question_bank_items ADD COLUMN duplicate_of_question_id TEXT;
ALTER TABLE question_bank_items ADD COLUMN generation_error TEXT;
ALTER TABLE question_bank_items ADD COLUMN updated_at TEXT;
UPDATE question_bank_items SET updated_at=COALESCE(updated_at,CURRENT_TIMESTAMP);
UPDATE question_bank_items SET review_status=CASE (SELECT status FROM questions q WHERE q.id=question_bank_items.question_id) WHEN 'published' THEN 'approved' WHEN 'draft' THEN 'needs_review' WHEN 'failed' THEN 'failed' WHEN 'rejected' THEN 'rejected' ELSE review_status END;
CREATE INDEX IF NOT EXISTS idx_qbank_review_status ON question_bank_items(review_status,created_at);
CREATE INDEX IF NOT EXISTS idx_qbank_batch ON question_bank_items(batch_id,created_at);
CREATE INDEX IF NOT EXISTS idx_qbank_fingerprint ON question_bank_items(fingerprint);

-- Additional reference-only sources. These are never copied verbatim by the generator.
INSERT OR IGNORE INTO question_bank_sources (id,name,url,provider,source_kind,categories_json,usage_mode,licence_note,priority) VALUES
('qsrc-ereading','Ereading Worksheets','https://www.ereadingworksheets.com/','Ereading Worksheets','free_worksheet_reference','["reading_comprehension","cloze"]','reference_only','Reference skill coverage and worksheet patterns only; generate original passages/questions.','52'),
('qsrc-snexplores','Science News Explores','https://www.snexplores.org/','Society for Science','free_reading_reference','["reading_comprehension","writing","oral"]','reference_only','Use age-appropriate topic ideas/facts only; do not copy article text.','58'),
('qsrc-bbclearningenglish','BBC Learning English','https://www.bbc.co.uk/learningenglish/','BBC Learning English','free_learning_reference','["oral","reading_comprehension","cloze","writing"]','reference_only','Reference language-learning themes and task forms only; generate original PSLE-aligned items.','60');
