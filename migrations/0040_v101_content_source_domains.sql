PRAGMA foreign_keys = ON;

-- V1.0.1: one discoverable content-source catalogue can feed multiple lesson domains.
ALTER TABLE content_sources ADD COLUMN domains_json TEXT NOT NULL DEFAULT '["reading"]';

-- Existing trusted factual sources remain Reading sources and are also useful as
-- factual/background inputs for original Speaking, Writing and Cloze lessons.
UPDATE content_sources
SET domains_json='["reading","speaking","writing","cloze"]'
WHERE id IN (
  'src-nasa-jpl','src-sg-nea','src-sg-sfa','src-nasa-kids','src-nasa-eokids',
  'src-noaa-ocean-facts','src-sg-nparks','src-sg-pub','src-sg-lta','src-sg-roots',
  'src-sg-schoolbag','src-noaa-rss'
);

-- Additional high-quality, reference-only content discovery sources.
INSERT OR IGNORE INTO content_sources
(id,name,source_type,base_url,allowed_host,topic,usage_mode,enabled,domains_json)
VALUES
('src-smithsonian-mag','Smithsonian Magazine','webpage','https://www.smithsonianmag.com/','smithsonianmag.com','Science, History & Culture','reference_only',1,'["reading","speaking","writing","cloze"]'),
('src-national-geographic-kids','National Geographic Kids','webpage','https://kids.nationalgeographic.com/','kids.nationalgeographic.com','Animals, Science & Geography','reference_only',1,'["reading","speaking","writing","cloze"]'),
('src-sg-nlb-biblioasia','NLB BiblioAsia','webpage','https://biblioasia.nlb.gov.sg/','biblioasia.nlb.gov.sg','Singapore History & Culture','reference_only',1,'["reading","speaking","writing","cloze"]'),
('src-sg-science-centre','Science Centre Singapore','webpage','https://www.science.edu.sg/','science.edu.sg','Science, Technology & Everyday Life','reference_only',1,'["reading","speaking","writing","cloze"]');
