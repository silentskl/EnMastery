-- R19 Hotfix 5: British Council curated stories use approved publisher pages first.
-- Refresh current canonical URLs for the three observed failures and clear stale YouTube errors.
UPDATE listening_story_catalog SET
  reference_url='https://learnenglishkids.britishcouncil.org/listen-watch/short-stories/animal-shelter',
  companion_url='https://learnenglishkids.britishcouncil.org/listen-watch/short-stories/animal-shelter',
  companion_allowed_host='learnenglishkids.britishcouncil.org',
  last_resolve_error=NULL, updated_at=CURRENT_TIMESTAMP
WHERE id='story-r9-059';

UPDATE listening_story_catalog SET
  reference_url='https://learnenglishkids.britishcouncil.org/listen-watch/short-stories/clever-monkey',
  companion_url='https://learnenglishkids.britishcouncil.org/listen-watch/short-stories/clever-monkey',
  companion_allowed_host='learnenglishkids.britishcouncil.org',
  last_resolve_error=NULL, updated_at=CURRENT_TIMESTAMP
WHERE id='story-r9-061';

UPDATE listening_story_catalog SET
  reference_url='https://learnenglishkids.britishcouncil.org/listen-watch/short-stories/lucky-seed',
  companion_url='https://learnenglishkids.britishcouncil.org/listen-watch/short-stories/lucky-seed',
  companion_allowed_host='learnenglishkids.britishcouncil.org',
  last_resolve_error=NULL, updated_at=CURRENT_TIMESTAMP
WHERE id='story-r9-065';

-- Clear stale YouTube-only errors for all British Council curated rows that already
-- have an approved publisher page; publisher-first queueing no longer needs YouTube.
UPDATE listening_story_catalog SET last_resolve_error=NULL, updated_at=CURRENT_TIMESTAMP
WHERE source_id='listen-yt-british-council-kids' AND companion_url IS NOT NULL;
