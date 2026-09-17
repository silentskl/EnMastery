PRAGMA foreign_keys = ON;

-- V1.0.2 hotfix3: add the PSLE Prelim source identified from the supplied
-- MindPath Education / 领思教育 material. Keep it reference-only because the
-- provenance/licensing of individual prelim-paper images can vary by post.
-- English Mastery uses the source as inspiration for ORIGINAL learning material.
INSERT OR IGNORE INTO content_sources
(id,name,source_type,base_url,allowed_host,topic,usage_mode,enabled,domains_json)
VALUES
(
  'src-mindpath-psle-prelim',
  'MindPath Education / 领思教育 · PSLE Prelim',
  'webpage',
  'https://www.mindpathedu.com/',
  'mindpathedu.com',
  '2026 PSLE Prelim English · Composition & Exam Questions',
  'reference_only',
  1,
  '["writing"]'
);

-- Also expose the same publisher as a Question Bank reference for Writing.
-- The URL is the verified official publisher site; no social-platform URL is
-- guessed from the screenshot. Generated questions must remain original.
INSERT OR IGNORE INTO question_bank_sources
(id,name,url,provider,source_kind,categories_json,usage_mode,licence_note,enabled,priority)
VALUES
(
  'qsrc-mindpath-psle-prelim',
  'MindPath Education / 领思教育 · PSLE Prelim',
  'https://www.mindpathedu.com/',
  'MindPath Education / 领思教育',
  'psle_prelim_reference',
  '["writing"]',
  'reference_only',
  'Use only as a PSLE Prelim composition/theme/question-pattern reference. Generate original prompts and do not reproduce third-party prelim-paper images or question text.',
  1,
  85
);
