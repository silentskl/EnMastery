PRAGMA foreign_keys = ON;

-- Preserve the exact writing task shown at submission time so Past work remains
-- historically correct even if an administrator later edits the published prompt.
ALTER TABLE writing_submissions ADD COLUMN prompt_title_snapshot TEXT;
ALTER TABLE writing_submissions ADD COLUMN prompt_body_snapshot TEXT;

-- Best-effort snapshot backfill for submissions created before R4. Future saves
-- always persist the snapshot at submit time, so later prompt edits cannot alter history.
UPDATE writing_submissions
SET prompt_title_snapshot = COALESCE(
      prompt_title_snapshot,
      (SELECT c.title FROM content_items c WHERE c.id = writing_submissions.prompt_id)
    ),
    prompt_body_snapshot = COALESCE(
      prompt_body_snapshot,
      (SELECT v.body_json FROM content_items c
       JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version
       WHERE c.id = writing_submissions.prompt_id)
    );

CREATE INDEX IF NOT EXISTS idx_writing_submissions_child_prompt_status
  ON writing_submissions(child_id, prompt_id, status, updated_at);
