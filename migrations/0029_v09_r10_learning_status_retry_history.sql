PRAGMA foreign_keys = ON;

-- V0.9.0 R10 · explicit writing revision lineage and faster Reading history queries.
ALTER TABLE writing_submissions ADD COLUMN revision_of_submission_id TEXT;
CREATE INDEX IF NOT EXISTS idx_writing_submissions_revision_of
  ON writing_submissions(revision_of_submission_id, created_at);
CREATE INDEX IF NOT EXISTS idx_question_attempts_child_content_created
  ON question_attempts(child_id, content_id, created_at);
