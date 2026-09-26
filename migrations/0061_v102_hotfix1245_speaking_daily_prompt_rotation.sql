PRAGMA foreign_keys = ON;

-- Hotfix 12.4.5
-- Daily Speaking has three separate content slots (conversation, reading aloud,
-- stimulus).  Persist each slot independently so opening the Speaking page,
-- refreshing it, or deploying a new build cannot silently replace today's
-- three prompts.  The selection layer enforces the same hard >=7-day repeat
-- window as the outer Daily Mission.
CREATE TABLE IF NOT EXISTS speaking_daily_prompt_assignments (
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  task_date TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('conversation','reading_aloud','stimulus')),
  prompt_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(child_id,task_date,mode)
);
CREATE INDEX IF NOT EXISTS idx_speaking_daily_prompt_rotation
  ON speaking_daily_prompt_assignments(child_id,mode,task_date,prompt_id);

-- Preserve prompt evidence already captured by scored/attempted Speaking work.
INSERT OR IGNORE INTO speaking_daily_prompt_assignments(child_id,task_date,mode,prompt_id,created_at)
SELECT child_id,task_date,mode,prompt_id,COALESCE(updated_at,CURRENT_TIMESTAMP)
FROM speaking_daily_mode_progress
WHERE prompt_id IS NOT NULL AND TRIM(prompt_id)<>'';

-- The hard seven-day no-repeat rule needs at least eight distinct prompts in
-- each mode to allow one new prompt every day.  The released P5 pool had only
-- 5 conversation / 7 reading / 7 stimulus prompts, and P6 had only 7
-- conversation prompts.  Add original syllabus-aligned content so the default
-- P5/P6 installation can satisfy the rule without falling back to the old
-- single cached prompt.
INSERT OR IGNORE INTO content_items
(id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES
('hf1245-speak-p5-practice-time','oral_prompt','Making Time for Practice','P5','Learning',NULL,'owned','published',1,'Original oral conversation topic for explaining choices, reasons and habits.','English Mastery original · Hotfix 12.4.5',CURRENT_TIMESTAMP,'global'),
('hf1245-speak-p5-ask-help','oral_prompt','Asking for Help','P5','Learning',NULL,'owned','published',1,'Original oral conversation topic for developing ideas and responding to follow-up questions.','English Mastery original · Hotfix 12.4.5',CURRENT_TIMESTAMP,'global'),
('hf1245-speak-p5-promise','oral_prompt','Keeping a Promise','P5','Responsibility',NULL,'owned','published',1,'Original oral conversation topic for giving reasons, examples and reflection.','English Mastery original · Hotfix 12.4.5',CURRENT_TIMESTAMP,'global'),
('hf1245-speak-p5-class-visit','oral_prompt','Preparing for a Class Visit','P5','School',NULL,'owned','published',1,'Original Reading Aloud passage for pronunciation, phrasing, pace and expression.','English Mastery original · Hotfix 12.4.5',CURRENT_TIMESTAMP,'global'),
('hf1245-speak-p5-recycling','oral_prompt','At the Recycling Point','P5','Environment',NULL,'owned','published',1,'Original stimulus-based oral conversation practice using an everyday school scene.','English Mastery original · Hotfix 12.4.5',CURRENT_TIMESTAMP,'global'),
('hf1245-speak-p6-balance','oral_prompt','Balancing Study and Rest','P6','Well-being',NULL,'owned','published',1,'Original oral conversation topic for developing a position, examples and balanced reasoning.','English Mastery original · Hotfix 12.4.5',CURRENT_TIMESTAMP,'global');

INSERT OR IGNORE INTO content_versions
(id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES
('hf1245-speak-p5-practice-time-v1','hf1245-speak-p5-practice-time',1,
 '{"mode":"conversation","prompt":"Some activities improve only when we practise regularly. Tell the AI tutor about something you are trying to improve. Explain how you make time for practice, what sometimes gets in the way, and what helps you continue.","followUpGoals":["explain a routine","give a specific example","reflect on a difficulty","respond to a follow-up question"]}',
 'hf1245-original','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved'),
('hf1245-speak-p5-ask-help-v1','hf1245-speak-p5-ask-help',1,
 '{"mode":"conversation","prompt":"Think of a situation when asking for help was useful. Explain what the problem was, who you asked, what happened next, and why asking for help can sometimes be a sensible choice.","followUpGoals":["describe a situation clearly","give reasons","use a personal example","respond naturally to follow-up questions"]}',
 'hf1245-original','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved'),
('hf1245-speak-p5-promise-v1','hf1245-speak-p5-promise',1,
 '{"mode":"conversation","prompt":"Why is it important to keep a promise? Talk about a promise a student might make at school or at home, what could make it difficult to keep, and what the student should do if plans have to change.","followUpGoals":["state a clear view","support it with an example","consider a difficulty","explain a responsible response"]}',
 'hf1245-original','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved'),
('hf1245-speak-p5-class-visit-v1','hf1245-speak-p5-class-visit',1,
 '{"mode":"reading_aloud","prompt":"Read the passage aloud clearly. Use suitable pace, phrasing and expression.","referenceText":"Our class was preparing for a visit to a science centre, so everyone had a small job to do. Two pupils checked the list of materials, while another group reminded us about the meeting time. I helped to prepare labels for our notebooks so that we could record useful observations during the visit. Before leaving school, our teacher asked us to think of one question we hoped to answer. The preparation took only a short time, but it made the class feel organised and ready. I realised that a successful learning journey begins before the bus even leaves the school gate."}',
 'hf1245-original','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved'),
('hf1245-speak-p5-recycling-v1','hf1245-speak-p5-recycling',1,
 '{"mode":"stimulus","prompt":"Describe what is happening at the recycling point. Which actions are helpful, what could be improved, and what would you do if you saw someone putting rubbish into the wrong bin?","stimulusAlt":"A school recycling point during recess: one pupil is placing paper into a labelled bin, another is rinsing a drink bottle, a student is reading the recycling signs, and someone is about to place food waste into the paper bin.","followUpGoals":["describe relevant details","identify a problem","suggest an action","give a reason"]}',
 'hf1245-original','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved'),
('hf1245-speak-p6-balance-v1','hf1245-speak-p6-balance',1,
 '{"mode":"conversation","prompt":"Students often have schoolwork, activities and personal interests competing for their time. How should a student balance study and rest? Explain your view, give an example, and discuss what might happen if either one is ignored for too long.","followUpGoals":["state and develop a position","use a relevant example","consider consequences","respond to another perspective"]}',
 'hf1245-original','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
