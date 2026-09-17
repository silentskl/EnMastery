PRAGMA foreign_keys = ON;

-- Additional high-trust reading/reference sources. All are reference-only by default:
-- source facts/background are transformed into original P5/P6 learning material before publication.
INSERT OR IGNORE INTO content_sources (id,name,source_type,base_url,allowed_host,topic,usage_mode,enabled) VALUES
('src-nasa-kids','NASA Kids Science','webpage','https://science.nasa.gov/kids/articles/','science.nasa.gov','Science, Earth & Space','reference_only',1),
('src-nasa-eokids','NASA Earth Observatory for Kids','webpage','https://science.nasa.gov/kids/earth/eo-kids/','science.nasa.gov','Earth Science & Environment','reference_only',1),
('src-noaa-ocean-facts','NOAA Ocean Facts','webpage','https://oceanservice.noaa.gov/facts/','oceanservice.noaa.gov','Ocean, Nature & Environment','reference_only',1),
('src-sg-nparks','Singapore NParks News','webpage','https://www.nparks.gov.sg/news','nparks.gov.sg','Singapore Nature & Biodiversity','reference_only',1),
('src-sg-pub','Singapore PUB Media Releases','webpage','https://www.pub.gov.sg/Resources/News-Room/PressReleases','pub.gov.sg','Singapore Water, Climate & Sustainability','reference_only',1),
('src-sg-lta','Singapore LTA Newsroom','webpage','https://www.lta.gov.sg/content/ltagov/en/newsroom.html','lta.gov.sg','Singapore Transport & Technology','reference_only',1),
('src-sg-roots','Roots.sg Stories','webpage','https://www.roots.gov.sg/stories','roots.gov.sg','Singapore History & Culture','reference_only',1),
('src-sg-schoolbag','MOE Schoolbag','webpage','https://www.schoolbag.edu.sg/','schoolbag.edu.sg','Singapore School & Community','reference_only',1),
('src-noaa-rss','NOAA Ocean Service News','rss','https://oceanservice.noaa.gov/rss/nosnews.xml','oceanservice.noaa.gov','Ocean Science & Current Affairs','reference_only',1);

-- Curated listening sources. YouTube uses public Data API metadata + privacy-enhanced embeds.
-- Podcast RSS uses the publisher-hosted audio URL; third-party audio is never copied to R2.
INSERT OR IGNORE INTO listening_sources (id,name,source_type,base_url,provider_ref,allowed_host,topic,default_level,usage_mode,enabled) VALUES
('listen-yt-voa','VOA Learning English','youtube_channel','https://www.youtube.com/@voalearningenglish','@voalearningenglish','youtube.com','English Learning, News & Vocabulary','P5','reference_only',1),
('listen-yt-teded','TED-Ed','youtube_channel','https://www.youtube.com/@TEDEd','@TEDEd','youtube.com','Science, Ideas & General Knowledge','P6','reference_only',1),
('listen-yt-bbc','BBC Learning English','youtube_channel','https://www.youtube.com/@bbclearningenglish','@bbclearningenglish','youtube.com','English Learning & Vocabulary','P6','reference_only',1),
('listen-podcast-voa-anna','VOA Let''s Learn English with Anna','podcast_rss','https://learningenglish.voanews.com/api/zyygqpl-vomx-tpetrbqm',NULL,'learningenglish.voanews.com','Children''s English (ages 8-12)','P5','reference_only',1),
('listen-podcast-voa','VOA Learning English Podcast','podcast_rss','https://learningenglish.voanews.com/api/ziiy_l-vomx-tpemgtv',NULL,'learningenglish.voanews.com','News, Science & Everyday English','P6','reference_only',1),
('listen-podcast-noaa','NOAA Ocean Podcast','podcast_rss','https://oceanservice.noaa.gov/rss/noaa-ocean-podcast.xml',NULL,'oceanservice.noaa.gov','Ocean Science & Environment','P6','reference_only',1),
('listen-podcast-nasa','NASA Curious Universe','podcast_rss','https://www.nasa.gov/feeds/podcasts/curious-universe',NULL,'nasa.gov','Space, Science & Technology','P6','reference_only',1);
