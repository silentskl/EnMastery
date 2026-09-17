# English Mastery V1.0.1

This release completes the source/content workflow and fixes learner navigation/session behaviour.

## Content sources for all learning domains
- Reading, Speaking, Writing and Cloze now use a domain-aware `content_sources` catalogue.
- Platform Admin can add RSS/webpage content sources per domain, discover source items, multi-select them and queue original lesson generation.
- Tenant Admin can use Platform-approved content sources to discover items and create tenant-private lessons.
- Speaking/Writing curriculum & assessment references stay separate from discoverable content sources.
- Listening keeps its media-native YouTube/Podcast content-source workflow and is labelled explicitly as Listening content sources.
- Added migration `0040_v101_content_source_domains.sql` with domain assignments and additional trusted reference-only discovery sources.
- Source-generated Speaking/Writing lessons remain draft-first for review. Source-generated Cloze produces draft Question Bank items for the Cloze library.

## Learner fixes
- Daily Reading tasks no longer route to Practice; Learn → Reading always opens a reading lesson or Reading library.
- Existing uncompleted legacy Reading tasks pointing to `/practice/...` are repaired to `/learn/read`.
- Daily missions are materialised in `learning_tasks` with planner version `daily-cache-v2`; once generated for a date, task choices are cached and not dynamically re-picked on page refresh.

## Session identity
- Platform Admin session cookie: 30 days.
- Tenant Admin session and database expiry: 30 days.
- Student session cookie/database expiry: 90 days.
- Top-right account identity now shows the signed-in student nickname or tenant admin display name/email. Platform shows `Platform Admin`.
