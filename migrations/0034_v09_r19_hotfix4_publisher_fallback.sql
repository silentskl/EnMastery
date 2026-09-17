-- R19 Hotfix 4: allow curated publisher-hosted fallback for items without eligible YouTube copies.
UPDATE listening_story_catalog
SET reference_url='https://learnenglishkids.britishcouncil.org/listen-watch/short-stories/animal-shelter',
    companion_url='https://learnenglishkids.britishcouncil.org/listen-watch/short-stories/animal-shelter',
    last_resolve_error=NULL,
    updated_at=CURRENT_TIMESTAMP
WHERE id='story-r9-059';
