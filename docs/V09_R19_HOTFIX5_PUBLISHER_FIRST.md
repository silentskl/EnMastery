# R19 Hotfix 5 — British Council publisher-first resolver

- British Council LearnEnglish Kids curated stories use their approved official story page directly when `companion_url` exists.
- They no longer require a YouTube match before queueing.
- BBC/TED-Ed/Oxford keep their existing YouTube-first resolver behavior.
- Updated canonical pages for story-r9-059, story-r9-061 and story-r9-065.
- Catalog APIs expose `resolverVersion: r19-hotfix5` so the UI can prove which main Worker is serving the request.
- Batch processing remains per-item: successful stories queue even when another selected story fails.
