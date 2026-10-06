PRAGMA foreign_keys = ON;
-- Fifty original P5/P6 PSLE-style Reading Aloud passages.
-- 25 per stage. Idempotent migration; existing learner attempts are untouched.
-- Each text is deliberately varied in punctuation, sentence rhythm and tone.

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-01','oral_prompt','The Lost Lunchbox','P5','School',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-01-v1','speak-read-extra-01',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"When the lunch bell rang, Daniel reached into his bag and froze. His blue lunchbox was missing. He checked his desk, the reading corner and even the shelf beside the door. Nothing. Just as he was about to give up, his classmate Mei called from the corridor. She had spotted the lunchbox beside the art room, where Daniel had stopped earlier to admire a colourful poster. Daniel thanked her with a relieved smile. At recess, he shared his extra apple slices with Mei. Losing something important had been worrying, but it had also reminded him how helpful a thoughtful friend could be."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-01','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-01','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-01','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-01','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-02','oral_prompt','A Rainy Morning','P5','Weather',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-02-v1','speak-read-extra-02',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"The sky was bright when Priya left home, so she decided not to take an umbrella. Ten minutes later, dark clouds gathered above the bus stop. A sudden shower sent people hurrying under the shelter. Priya stood at the edge, trying to protect her schoolbag from the rain. An elderly man moved aside and made room for her. She thanked him and wiped the water from her glasses. By the time the bus arrived, the rain had become a gentle drizzle. Priya promised herself that she would check the weather forecast before leaving home again."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-02','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-02','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-02','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-02','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-03','oral_prompt','The Class Garden','P5','Environment',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-03-v1','speak-read-extra-03',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"Every Wednesday, our class visits the little garden behind the school hall. We pull out weeds, water the vegetables and look for new leaves. Last month, we planted tomato seeds in six small pots. At first, the soil looked exactly the same every day. Then one morning, tiny green shoots appeared. Everyone crowded around the pots to see them. Our teacher reminded us that plants need sunlight, water and patience. We have not picked any tomatoes yet, but we are proud of the progress. The garden has taught us that small efforts can lead to wonderful results."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-03','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-03','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-03','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-03','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-04','oral_prompt','A Surprise Visitor','P5','Family',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-04-v1','speak-read-extra-04',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"On Saturday afternoon, Amir heard a familiar knock at the front door. To his surprise, his grandfather was standing outside with a small suitcase. He had travelled across town to spend the weekend with the family. Amir helped him carry the bag into the guest room. After lunch, they sat by the window and looked through an old photo album. Grandfather pointed to a picture of himself as a schoolboy and laughed at his own hairstyle. Amir had heard many of these stories before, yet they always made him smile. The unexpected visit turned an ordinary afternoon into a special memory."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-04','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-04','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-04','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-04','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-05','oral_prompt','The Library Challenge','P5','Reading',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-05-v1','speak-read-extra-05',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"Our school library launched a reading challenge at the start of the term. Students could earn a colourful bookmark for every three books they completed. Hannah chose a mystery, a book about whales and a collection of funny stories. She expected the whale book to be boring, but it soon became her favourite. She learnt how whales communicate using sounds that travel through the sea. During the next library session, Hannah recommended the book to her friends. By the end of the month, she had earned two bookmarks. More importantly, she had discovered how exciting an unfamiliar subject could be."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-05','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-05','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-05','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-05','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-06','oral_prompt','The New Student','P5','Friendship',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-06-v1','speak-read-extra-06',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"A new student named Lucas joined our class on Monday. He stood quietly at the door while the teacher introduced him. During group work, some classmates chatted quickly and forgot to include him. Sara noticed that Lucas was holding his worksheet without writing anything. She invited him to join her group and explained the instructions again. Soon, Lucas suggested an excellent idea for their poster. At the end of the lesson, the group thanked him for helping. Sara realised that a friendly invitation can make a big difference, especially to someone who is still trying to feel at home."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-06','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-06','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-06','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-06','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-07','oral_prompt','The Weekend Market','P5','Community',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-07-v1','speak-read-extra-07',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"Every Sunday, a small market opens near my grandmother''s flat. The stalls are crowded with fresh vegetables, bright flowers and warm bread. Last weekend, Grandma gave me a short shopping list and asked me to help. I compared the prices of tomatoes, chose a bunch of bananas and carried the lighter bags. At one stall, the fruit seller offered us a sample of a sweet orange. Grandma greeted several neighbours as we walked home. She told me that the market was more than a place to buy food. It was also a place where people met, talked and looked after one another."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-07','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-07','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-07','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-07','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-08','oral_prompt','A Helpful Bus Driver','P5','Transport',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-08-v1','speak-read-extra-08',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"The afternoon bus was almost full when an elderly woman climbed aboard with two heavy bags. She looked around for a seat, but nobody moved at first. The bus driver waited patiently and reminded passengers to offer seats to those who needed them. A student near the front stood up immediately. The woman thanked him and sat down carefully. When the bus reached her stop, the driver allowed her extra time to get off safely. Watching this, I realised that kindness does not always require a grand action. Sometimes, a little patience and consideration are enough."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-08','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-08','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-08','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-08','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-09','oral_prompt','The Missing Kitten','P5','Animals',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-09-v1','speak-read-extra-09',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"Mia was walking home when she heard a faint meowing behind a row of bicycles. A tiny grey kitten was hiding beside a wheel. It looked frightened and hungry. Mia did not try to grab it. Instead, she called her mother, who came with a small box and a towel. They checked the kitten for injuries and asked neighbours whether anyone had lost a pet. Later that evening, a worried owner recognised the kitten from a photograph. He was delighted to have it back. Mia felt happy knowing that she had helped a lost animal return home safely."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-09','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-09','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-09','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-09','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-10','oral_prompt','Sports Day Practice','P5','Sports',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-10-v1','speak-read-extra-10',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"Our class had only two weeks to prepare for Sports Day. Every afternoon, the relay team practised passing the baton smoothly. During the first session, we dropped it three times and finished far behind the other group. Rather than blaming anyone, our captain asked us to slow down and focus on teamwork. We tried again, making sure each runner called out before the handover. Gradually, our timing improved. On the final practice day, we completed the race without dropping the baton. We still did not know whether we would win, but we had learnt to trust one another."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-10','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-10','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-10','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-10','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-11','oral_prompt','A Visit to the Aquarium','P5','Science',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-11-v1','speak-read-extra-11',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"Last Friday, our class visited an aquarium beside the harbour. The first tank was filled with silver fish that moved together like a single shining ribbon. We also saw seahorses holding onto pieces of sea grass with their curly tails. A guide explained why plastic waste is dangerous to marine animals. She showed us pictures of turtles that had mistaken plastic bags for food. On the bus ride home, we discussed simple ways to protect the sea. I decided to carry a reusable water bottle and avoid unnecessary plastic whenever possible."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-11','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-11','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-11','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-11','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-12','oral_prompt','The Broken Umbrella','P5','Problem Solving',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-12-v1','speak-read-extra-12',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"A strong wind turned Olivia''s umbrella inside out as she walked towards the community centre. One metal spoke bent sharply, and the fabric flapped around her head. She hurried under a nearby shelter and wondered what to do. The rain was too heavy for her to continue walking. A volunteer at the centre noticed her trouble and offered to lend her a spare umbrella. Olivia arrived only a few minutes late for her art class. She returned the umbrella afterwards and thanked the volunteer. The experience reminded her that asking politely for help is sometimes the wisest choice."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-12','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-12','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-12','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-12','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-13','oral_prompt','An Evening of Music','P5','Music',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-13-v1','speak-read-extra-13',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"The school choir gathered in the hall for its first evening performance. Behind the curtain, several singers whispered nervously and checked the words of the opening song. Their conductor smiled and raised both hands. As the piano began, the students took a deep breath and sang together. Their voices filled the hall with a gentle melody. Halfway through the programme, the audience began clapping along to a lively tune. When the final note faded, the room burst into applause. The singers bowed and exchanged proud smiles. Weeks of careful practice had been worth the effort."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-13','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-13','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-13','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-13','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-14','oral_prompt','The Recycling Competition','P5','Environment',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-14-v1','speak-read-extra-14',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"Our school organised a recycling competition between classes. Each team had to collect clean paper, plastic bottles and aluminium cans over four weeks. At first, our box filled slowly. Then we made posters to remind everyone where to place recyclable items. During recess, volunteers checked that food waste had not been mixed with the clean materials. By the final week, our collection box was overflowing. We did not win first prize, but the amount of rubbish in our classroom had clearly decreased. Our teacher said that changing daily habits mattered much more than winning a trophy."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-14','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-14','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-14','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-14','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-15','oral_prompt','A Simple Breakfast','P5','Health',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-15-v1','speak-read-extra-15',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"Before leaving for school, Joel used to rush out with only a glass of water. By the second lesson, his stomach would growl loudly and he found it difficult to concentrate. His older sister suggested preparing breakfast the night before. Together, they washed fruit, packed oats and placed two bowls on the kitchen table. The next morning, Joel enjoyed a bowl of oats with banana slices. He felt more alert during class and had enough energy for physical education. Breakfast did not have to be complicated. He learnt that a little planning could make mornings much easier."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-15','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-15','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-15','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-15','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-16','oral_prompt','The Secret Note','P5','Friendship',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-16-v1','speak-read-extra-16',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"When Aisha opened her pencil case, she found a folded piece of paper inside. The note said, ''Good luck with your presentation. You can do it!'' She recognised her best friend''s neat handwriting immediately. Aisha had been nervous about speaking in front of the class. She read the message once more before walking to the front of the room. Her voice shook at first, but she remembered to breathe slowly and look at her classmates. After finishing, she received warm applause. The kind note had not removed every worry, but it had given her the courage to begin."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-16','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-16','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-16','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-16','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-17','oral_prompt','The Community Clean-Up','P5','Community',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-17-v1','speak-read-extra-17',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"Residents gathered outside the community club early on Saturday morning. They wore gloves and carried rubbish bags, brooms and long-handled litter pickers. Our family joined a group cleaning the footpaths around the playground. We found bottle caps, snack wrappers and a broken plastic toy. The volunteers separated recyclable items from ordinary waste. After two hours, the paths looked much cleaner. Someone offered the tired helpers cold water and slices of watermelon. Although my arms ached, I felt proud to have contributed. A clean neighbourhood is something everyone can help to create."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-17','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-17','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-17','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-17','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-18','oral_prompt','The School Canteen','P5','Food',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-18-v1','speak-read-extra-18',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"The school canteen was especially busy on the first day of term. Some students queued for noodles while others looked for a table with their friends. Ben realised that he had forgotten his wallet just as the stall owner prepared his meal. He stepped aside, embarrassed, so the next student could order. His friend Ravi offered to lend him enough money for lunch. Ben thanked him and promised to return it the following day. Before leaving, both boys cleared their trays and placed them on the return rack. It had been a small but memorable lesson in responsibility."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-18','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-18','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-18','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-18','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-19','oral_prompt','A Trip to the Museum','P5','History',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-19-v1','speak-read-extra-19',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"Inside the history museum, our guide led us past old maps, photographs and household objects. One display showed how people travelled through Singapore many years ago. There were pictures of crowded buses and bicycles carrying large baskets. We stopped beside a small wooden suitcase that belonged to a traveller. Our guide asked us to imagine packing everything we needed into such a tiny space. Back in class, we compared the objects with the things we use today. I realised that learning about the past can help us appreciate changes in everyday life."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-19','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-19','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-19','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-19','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-20','oral_prompt','The Power Cut','P5','Home',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-20-v1','speak-read-extra-20',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"During a family dinner, the lights suddenly went out. The fan slowed to a stop, and the room became unusually quiet. Dad checked that everyone was safe while Mum found a torch in the drawer. Instead of staring at our phones, we moved to the living room and played a word game by torchlight. My younger brother invented such funny answers that we could hardly stop laughing. After half an hour, the electricity returned. We cheered, but no one rushed to turn on the television. The unexpected power cut had given us a chance to enjoy time together."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-20','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-20','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-20','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-20','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-21','oral_prompt','The Lost Water Bottle','P5','Responsibility',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-21-v1','speak-read-extra-21',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"At the end of football training, Theo noticed that his green water bottle was gone. He remembered leaving it near the goalpost and hurried back to search. The field was empty except for a coach collecting cones. Theo explained what had happened and asked whether the bottle had been found. The coach pointed to a bench beside the changing room. There it was, waiting beside a pair of forgotten shoes. Theo thanked the coach and wrote his name on the bottle when he reached home. From then on, he checked his belongings before leaving the field."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-21','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-21','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-21','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-21','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-22','oral_prompt','The School Science Fair','P5','Technology',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-22-v1','speak-read-extra-22',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"Our science fair began with a colourful display of student projects. One team had built a tiny bridge using drinking straws, while another demonstrated how a simple water filter worked. My partner and I presented a model of a house powered by sunlight. We explained that the small solar panel could turn light into electricity. Some visitors asked difficult questions, and we admitted when we did not know the answers. Our teacher praised us for being honest and curious. By the end of the day, we had learnt as much from other teams as they had learnt from us."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-22','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-22','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-22','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-22','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-23','oral_prompt','A Walk in the Nature Reserve','P5','Nature',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-23-v1','speak-read-extra-23',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"We entered the nature reserve just after sunrise. The air was cool, and sunlight filtered through the tall trees. Our guide reminded us to stay on the marked path and speak softly. Soon, we heard a woodpecker tapping against a trunk. A bright butterfly settled briefly on a leaf before flying away. Near a small stream, we spotted tiny fish moving between the rocks. I wanted to take a perfect photograph, but the guide encouraged us to observe quietly first. The peaceful walk taught me that some of nature''s best moments are easy to miss when we hurry."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-23','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-23','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-23','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-23','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-24','oral_prompt','The Thank-You Card','P5','Gratitude',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-24-v1','speak-read-extra-24',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"Mrs Tan stayed behind after school to help several pupils prepare for a difficult spelling test. She explained tricky words patiently, even though the afternoon was getting late. The following week, her class decided to make a surprise thank-you card. Each pupil wrote a short message describing something they had learnt from her. When the card was presented, Mrs Tan looked genuinely touched. She told the class that their effort and kindness meant more than any expensive gift. The pupils smiled, pleased that a simple card could express so much appreciation."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-24','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-24','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-24','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-24','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-25','oral_prompt','The Bicycle Lesson','P5','Perseverance',NULL,'owned','published',1,'Original P5 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-25-v1','speak-read-extra-25',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"For weeks, Ethan had been trying to ride his bicycle without training wheels. Each attempt ended with him wobbling and putting his feet on the ground. One Sunday, his aunt took him to a quiet park and showed him how to look ahead instead of down. She ran beside the bicycle while he pedalled slowly. Suddenly, Ethan realised that she was no longer holding the seat. He was riding on his own! He stopped carefully and gave a joyful shout. A few minutes later, he tried again. The skill had seemed impossible at first, but patient practice had made it achievable."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-25','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-25','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-25','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-25','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-26','oral_prompt','The Debate Club Challenge','P6','Communication',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-26-v1','speak-read-extra-26',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"The debate club faced an unusual challenge when two speakers were absent on the morning of a competition. Their teammates had prepared strong arguments, but they had little time to rearrange their roles. The captain quickly divided the notes and encouraged everyone to concentrate on clear explanations rather than impressive words. During the debate, one speaker forgot a point and paused. Instead of panicking, she calmly summarised the argument and continued. Their team did not take the top prize, yet the teacher praised their flexibility. They had shown that preparation matters, but the ability to adapt matters too."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-26','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-26','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-26','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-26','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-27','oral_prompt','An Unexpected Act of Courage','P6','Character',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-27-v1','speak-read-extra-27',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"As the train doors opened, a small child dropped a toy onto the platform and began to cry. The crowd moved around him while his mother searched anxiously for the missing object. Marcus noticed the toy near a bench. He picked it up and brought it to the mother, taking care to stay clear of the platform edge. The child stopped crying at once. Marcus felt shy when the mother thanked him, because the action had seemed so ordinary. Later, he reflected that courage does not always involve danger. Sometimes it means noticing a problem and choosing to help."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-27','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-27','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-27','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-27','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-28','oral_prompt','The Storm Warning','P6','Weather',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-28-v1','speak-read-extra-28',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"The weather forecast warned of heavy thunderstorms during the afternoon. Nevertheless, a group of hikers planned to continue their walk along a coastal trail. Their leader studied the darkening sky and decided to shorten the route. Some hikers were disappointed, but she explained that safety had to come first. Within an hour, strong winds shook the trees and rain poured across the path. The group waited under proper shelter until the storm passed. Looking at the flooded track afterwards, the hikers understood why the plan had changed. A good adventure includes knowing when to turn back."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-28','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-28','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-28','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-28','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-29','oral_prompt','The Last Seat on the Bus','P6','Empathy',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-29-v1','speak-read-extra-29',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"The bus was crowded after a long school day. A student named Farah had finally found a seat and was looking forward to resting her tired legs. At the next stop, a man using a walking stick climbed aboard. Farah noticed him gripping the handrail as the bus moved away. She stood up immediately and invited him to sit. He thanked her warmly and asked which school she attended. They chatted briefly about the neighbourhood before Farah reached her stop. Her legs were still tired, but she felt strangely refreshed. Considering another person''s needs had changed her mood."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-29','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-29','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-29','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-29','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-30','oral_prompt','Saving the Mangroves','P6','Environment',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-30-v1','speak-read-extra-30',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"During a coastal learning trip, our guide explained why mangrove forests are important. Their tangled roots provide shelter for young fish and help protect shorelines from erosion. We walked carefully along a raised boardwalk, watching small crabs disappear into the mud. Near the entrance, a volunteer group was collecting rubbish left behind by visitors. Our class helped sort the waste and recorded the types of plastic we found. Back at school, we designed posters about protecting coastal habitats. We realised that conservation begins with understanding how living things depend on one another."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-30','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-30','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-30','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-30','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-31','oral_prompt','The Robotics Competition','P6','Technology',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-31-v1','speak-read-extra-31',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"Our robotics team spent three months designing a machine that could move small blocks across a table. The robot worked perfectly during practice, but its wheels slipped on the competition surface. With only ten minutes remaining, the team examined the problem and adjusted the speed. They could not rebuild the entire machine, so they chose a simple solution and tested it twice. During the final round, the robot moved slowly but accurately. We finished third, much to our surprise. Our mentor reminded us that engineering is not about avoiding every mistake. It is about learning to solve problems when they appear."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-31','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-31','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-31','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-31','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-32','oral_prompt','A Promise to Grandfather','P6','Family',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-32-v1','speak-read-extra-32',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"Before his grandfather moved into a new flat, Noah promised to visit every weekend. At first, he kept his word easily. Then school projects, sports training and social activities filled his calendar. One Saturday, he almost cancelled their visit. However, he remembered how eagerly Grandfather waited to hear about his week. Noah finished his homework earlier and travelled across town with his mother. They spent the afternoon repairing an old radio and sharing stories. On the journey home, Noah understood that keeping a promise often requires planning. Good intentions mean little unless they become actions."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-32','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-32','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-32','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-32','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-33','oral_prompt','The Quiet Hero of the Library','P6','Community',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-33-v1','speak-read-extra-33',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"Every morning, Mr Lim arrived at the public library before the doors opened. He arranged returned books, checked the reading corners and helped visitors find useful information. Most people barely noticed him. One afternoon, a young girl approached the counter looking upset. She had misplaced a book borrowed under her mother''s account. Mr Lim listened carefully, checked the return trolley and found the book tucked inside another volume. The girl''s face brightened with relief. He simply smiled and continued working. His kindness rarely made headlines, but it made the library feel welcoming to everyone."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-33','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-33','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-33','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-33','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-34','oral_prompt','Crossing the Finish Line','P6','Resilience',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-34-v1','speak-read-extra-34',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"During the final stretch of the school cross-country race, Isabella felt her legs grow heavy. Several runners passed her, and the finish line still looked impossibly far away. She remembered her coach''s advice to focus on one steady step at a time. Breathing deeply, she slowed her pace instead of stopping. Students along the route called out encouragement as she rounded the last corner. Isabella crossed the line well after the winners, but a broad smile spread across her face. She had achieved a personal goal by finishing a race that once seemed beyond her abilities."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-34','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-34','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-34','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-34','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-35','oral_prompt','The Science of Sleep','P6','Health',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-35-v1','speak-read-extra-35',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"Many students try to complete homework late at night while keeping their phones beside their pillows. However, sleep is not wasted time. During sleep, the brain processes information and the body recovers from the day''s activities. A regular bedtime can improve concentration, mood and memory. Bright screens and noisy surroundings may make it harder to fall asleep quickly. Experts therefore recommend developing a calm evening routine. This might include putting devices away, preparing a schoolbag and reading a short book. Healthy habits do not promise perfect days, but they can help students feel more prepared for everyday challenges."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-35','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-35','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-35','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-35','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-36','oral_prompt','A Difficult Apology','P6','Relationships',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-36-v1','speak-read-extra-36',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"During group work, Nathan interrupted his partner repeatedly and dismissed her suggestions. The project was completed, but the atmosphere remained uncomfortable. Later, he noticed that she had become unusually quiet. Nathan wanted to pretend nothing had happened, yet he knew his behaviour had been unfair. The next morning, he approached her and apologised without making excuses. He also asked how they could share decisions more equally. His partner accepted the apology and agreed to try again. Nathan learnt that saying sorry is an important beginning, but changing one''s behaviour is what makes an apology meaningful."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-36','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-36','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-36','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-36','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-37','oral_prompt','When the Lift Stopped','P6','Safety',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-37-v1','speak-read-extra-37',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"A lift in the community centre stopped unexpectedly between two floors. Inside were three adults and a teenage volunteer carrying supplies for an event. Someone reached for the doors, but the volunteer reminded everyone to remain calm and use the emergency intercom. The building''s maintenance team answered and explained that help was on the way. The passengers waited patiently, keeping the space clear and speaking reassuringly to one another. Soon, trained staff opened the doors safely. The incident reminded them that staying calm and following proper safety procedures is far more useful than acting in panic."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-37','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-37','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-37','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-37','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-38','oral_prompt','The Second-Hand Book Sale','P6','Sustainability',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-38-v1','speak-read-extra-38',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"To raise funds for a local charity, our school organised a second-hand book sale. Students donated novels, reference books and picture books that were still in good condition. Volunteers sorted the donations by age group and placed clear labels on the tables. On the first day, hundreds of visitors browsed the stalls. Some chose books they had never considered reading before. At the end of the event, the organisers announced that the money raised would support a neighbourhood learning programme. The sale showed how reusing something we no longer need can benefit both the environment and other people."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-38','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-38','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-38','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-38','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-39','oral_prompt','An Important Choice','P6','Integrity',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-39-v1','speak-read-extra-39',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"While preparing for a test, Evelyn discovered that a classmate had accidentally left an answer sheet on a library table. For a moment, she was tempted to look at the solutions. The assessment would be difficult, and she wanted a high score. Then she imagined how disappointed she would feel if her success came from something she had not earned. Evelyn closed the paper without reading it and handed it to the librarian. Later, she studied using her own notes. She did not know how well she would perform, but she felt confident about the choice she had made."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-39','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-39','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-39','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-39','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-40','oral_prompt','The Hidden History of a Street','P6','Heritage',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-40-v1','speak-read-extra-40',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"During a heritage walk, our guide stopped beside an ordinary row of shops. He explained that the street had once been home to workshops where craftsmen repaired bicycles and made wooden furniture. Although most businesses had changed, several buildings still carried decorative tiles from an earlier period. We compared old photographs with the busy street before us. It was surprising to see how familiar places had once looked so different. The guide encouraged us to talk to older relatives about their memories. History, he said, is not found only in museums. It also lives in the places we pass every day."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-40','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-40','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-40','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-40','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-41','oral_prompt','Learning to Lead','P6','Leadership',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-41-v1','speak-read-extra-41',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"When her class selected her as group leader, Jasmine assumed she would need to make every decision. She distributed tasks quickly and expected everyone to follow her instructions. Unfortunately, several classmates became frustrated because their ideas were ignored. The teacher suggested holding a short discussion before continuing. Jasmine asked each person to explain a concern and listened without interrupting. Together, they agreed on a more balanced plan. The project improved almost immediately. Jasmine discovered that leadership is not the ability to speak the loudest. It is the willingness to listen, organise and help others contribute."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-41','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-41','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-41','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-41','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-42','oral_prompt','The Island Without Plastic','P6','Environment',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-42-v1','speak-read-extra-42',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"A small island community began a campaign to reduce single-use plastic. Shopkeepers offered paper bags, families carried reusable bottles and volunteers installed refill stations near the beach. At first, some residents complained that the changes were inconvenient. The organisers listened and explained how discarded plastic could harm birds and marine animals. Over time, the amount of rubbish collected after busy weekends began to fall. The campaign did not remove every piece of waste, but it encouraged people to think more carefully about daily choices. Lasting change often begins with ordinary habits repeated by many people."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-42','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-42','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-42','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-42','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-43','oral_prompt','A Lesson from the Orchestra','P6','Music',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-43-v1','speak-read-extra-43',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"During rehearsal, the school orchestra struggled to play a lively piece together. The violin section moved ahead of the beat while the percussion players entered too late. Frustration grew, and several students began blaming one another. Their conductor stopped the music and asked everyone to listen to a recording of the opening bars. Next, they practised at a slower tempo and paid close attention to one another''s parts. Gradually, the melody became clear and balanced. On performance night, the group played with confidence. Every instrument had a different sound, but the success of the music depended on cooperation."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-43','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-43','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-43','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-43','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-44','oral_prompt','The Young Inventor','P6','Innovation',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-44-v1','speak-read-extra-44',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"At a school exhibition, a student named Chloe presented a simple device that reminded people to water their plants. She had designed it after noticing that her grandmother often forgot about the small pots on her balcony. The device used a sensor to detect dry soil and turn on a tiny light. Although it was not perfect, visitors were impressed by the idea. Chloe explained that she had rebuilt the circuit several times before it worked. She hoped to improve the design so it could save water as well. Her project showed that useful inventions often begin with observing an everyday problem."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-44','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-44','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-44','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-44','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-45','oral_prompt','The River Rescue Drill','P6','Safety',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-45-v1','speak-read-extra-45',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"The community rescue team held a safety demonstration beside the river on Sunday morning. Volunteers explained why strong currents can be dangerous even when the water looks calm. A trained instructor demonstrated how to throw a rescue ring towards a person in difficulty without entering the water. Children watched from behind a safety barrier while parents asked questions. The instructor reminded everyone to call emergency services and seek trained help in a real incident. The demonstration was exciting, but its message was serious. Knowing safe procedures can prevent a difficult situation from becoming much worse."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-45','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-45','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-45','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-45','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-46','oral_prompt','The Long Walk Home','P6','Mindfulness',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-46-v1','speak-read-extra-46',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"After a stressful week of tests, Aaron chose to walk home through the park instead of taking his usual shortcut beside the main road. He noticed small details that he normally missed: sunlight on a pond, a bird calling from a tree and the smell of wet grass after rain. As he walked, his thoughts became less hurried. He still had homework to finish and challenges to face, but they no longer seemed quite so overwhelming. When he reached home, Aaron felt ready to organise his tasks. The quiet walk had reminded him that a short pause can sometimes improve concentration."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-46','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-46','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-46','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-46','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-47','oral_prompt','A Community Food Project','P6','Service',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-47-v1','speak-read-extra-47',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"A neighbourhood group started collecting extra food from participating shops at the end of each day. Volunteers checked that the items were safe, recorded the collection dates and delivered them to families who needed support. When Leena joined the project, she expected to spend most of her time packing bags. Instead, she learnt about careful planning, food hygiene and the importance of treating recipients with respect. One volunteer explained that helping others should never make them feel embarrassed. Leena returned home with a new understanding of service. Practical kindness requires both a generous heart and thoughtful action."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-47','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-47','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-47','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-47','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-48','oral_prompt','The Mystery of the Silent Clock','P6','Story',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-48-v1','speak-read-extra-48',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"The large clock in the school hall had stopped at exactly twenty past eight. No one noticed at first, because students were busy preparing for assembly. Then the music teacher arrived late, insisting that the clock had misled her. Curious, a group of pupils asked the caretaker what had happened. He explained that the clock''s old battery had finally run out. The mystery was less dramatic than they had imagined, yet it inspired the class to investigate how different clocks keep time. Their teacher smiled and said that good questions can turn even an ordinary problem into a learning opportunity."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-48','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-48','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-48','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-48','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-49','oral_prompt','The Value of Listening','P6','Communication',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-49-v1','speak-read-extra-49',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"At a student council meeting, several representatives proposed ways to improve the school playground. Some wanted more benches, while others suggested additional sports equipment. The discussion became noisy because everyone tried to speak at once. Their chairperson paused the meeting and introduced a simple rule: one speaker at a time, with a short summary before responding. The atmosphere soon improved. Students began finding connections between different suggestions and agreed on a plan that included seating and active play areas. The meeting demonstrated that listening carefully is not a passive skill. It is essential for making fair decisions together."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-49','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-49','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-49','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-49','S-PURPOSE',1);

INSERT OR IGNORE INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,scope)
VALUES ('speak-read-extra-50','oral_prompt','A Festival of Cultures','P6','Community',NULL,'owned','published',1,'Original P6 Reading Aloud passage.','English Mastery original',CURRENT_TIMESTAMP,'global');
INSERT OR IGNORE INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status)
VALUES ('speak-read-extra-50-v1','speak-read-extra-50',1,'{"mode":"reading_aloud","prompt":"Read the passage aloud with clear pronunciation, natural pauses and expression.","referenceText":"Our community centre organised a festival celebrating the traditions of different families in the neighbourhood. Visitors explored stalls offering crafts, music and familiar foods prepared in new ways. A volunteer explained the meaning of a decorative pattern, while another taught children a simple traditional dance. I enjoyed meeting people whose customs were different from my own. The most memorable moment came when performers from several groups joined together for the final song. Their languages and instruments varied, but their shared enthusiasm filled the hall. The festival reminded us that learning about differences can bring people closer together."}','seed','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved');
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-50','S-PRON',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-50','S-FLUENCY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-50','S-PROSODY',1);
INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES ('speak-read-extra-50','S-PURPOSE',1);
