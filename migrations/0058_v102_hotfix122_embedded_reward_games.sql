-- V1.0.2 Hotfix 12.2
-- Reward games now run inside the English Mastery application shell.
-- Existing external catalogue rows are retained for audit/history but disabled.
-- game_minutes freezes the allowed session duration when a reward is first launched.

ALTER TABLE daily_game_rewards ADD COLUMN game_minutes INTEGER;

UPDATE reward_game_catalog
SET enabled=0, updated_at=CURRENT_TIMESTAMP
WHERE url NOT LIKE '/rewards/game?game=%';

INSERT OR IGNORE INTO reward_game_catalog (id,name,url,category,enabled,sort_order) VALUES
 ('em-memory-garden','Memory Garden','/rewards/game?game=memory-garden','Memory',1,10),
 ('em-memory-space','Space Pairs','/rewards/game?game=memory-space','Memory',1,20),
 ('em-quick-math','Quick Math','/rewards/game?game=quick-math','Numbers',1,30),
 ('em-number-sprint','Number Sprint','/rewards/game?game=number-sprint','Numbers',1,40),
 ('em-word-scramble','Word Scramble','/rewards/game?game=word-scramble','Words',1,50),
 ('em-word-choice','Word Choice','/rewards/game?game=word-choice','Words',1,60),
 ('em-reaction-grid','Reaction Grid','/rewards/game?game=reaction-grid','Reflex',1,70),
 ('em-reaction-sprint','Reaction Sprint','/rewards/game?game=reaction-sprint','Reflex',1,80);
