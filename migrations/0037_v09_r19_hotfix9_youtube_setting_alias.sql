-- R19 Hotfix 9: normalize historical YouTube integration setting aliases.
-- Keep the canonical row if it already exists; otherwise copy the newest known alias.
INSERT OR IGNORE INTO integration_settings
(setting_key,setting_type,value_text,value_ciphertext,iv,display_hint,source,updated_at)
SELECT 'YOUTUBE_API_KEY',setting_type,value_text,value_ciphertext,iv,display_hint,source,updated_at
FROM integration_settings
WHERE setting_key IN ('YOUTUBE_DATA_API_KEY','youtubeApiKey','youtube_api_key','youtube_data_api_key')
ORDER BY updated_at DESC LIMIT 1;
