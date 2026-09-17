PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at)
VALUES ('speak-free-community','oral_prompt','Helping in the Community','P6','Community',NULL,'owned','published',1,'Build a clear opinion, support it with reasons and respond to follow-up questions.','English Mastery original',CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-free-community-v1','speak-free-community',1,'{"mode":"conversation","prompt":"Some people say every child should spend time helping the community. What do you think?","followUpGoals":["give a reason","add an example","consider another point of view"]}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-free-community','S-SBC-IDEA',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-free-community','S-INTERACT',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at)
VALUES ('speak-read-library','oral_prompt','Library Announcement','P6','School',NULL,'owned','published',1,'PSLE-style reading aloud practice with clear pronunciation, fluency and expression.','English Mastery original',CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-library-v1','speak-read-library',1,'{"mode":"reading_aloud","prompt":"Read the announcement aloud as if you are speaking to your schoolmates.","referenceText":"Good morning, everyone. Our school library will hold a reading festival next Friday. Students can exchange books, listen to short stories and recommend their favourite titles. Please bring one book that is still in good condition. We hope you will join us and discover something new to read."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-library','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-library','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-library','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-library','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at)
VALUES ('speak-stimulus-park','oral_prompt','A Busy Park','P6','Environment',NULL,'owned','published',1,'Stimulus-based conversation practice focused on observation, personal experience and opinions.','English Mastery original',CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-stimulus-park-v1','speak-stimulus-park',1,'{"mode":"stimulus","prompt":"Imagine a busy neighbourhood park. Some children are playing, a family is having a picnic, one person is picking up litter and another person is cycling too quickly near pedestrians. Describe what stands out to you and explain how people can share public spaces responsibly.","stimulusAlt":"A busy park with children playing, a picnic, someone picking up litter and a cyclist near pedestrians."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-stimulus-park','S-SBC-DESC',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-stimulus-park','S-SBC-EXP',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-stimulus-park','S-SBC-IDEA',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-stimulus-park','S-INTERACT',1);
