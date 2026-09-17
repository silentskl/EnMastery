# V0.9.0 R9 — Curated P5/P6 Story Bank

R9 adds a curated upper-primary listening bank with 120 publisher-hosted stories.

## Sources and grading

- BBC Learning English — 20 stories
- British Council LearnEnglish Kids — 37 stories
- Oxford Owl – Learning at Home — 13 stories
- TED-Ed — 50 stories
- P5: 56 stories
- P6: 64 stories
- Every row has Foundation / Standard / Advanced, a 1–10 difficulty score, topic, grading rationale, and optional content notes.

## Copyright-safe workflow

The migration stores catalogue metadata and approved publisher references only. It does not copy YouTube media or third-party transcripts to R2/D1. Admins select up to 20 stories at a time. The runtime resolves an embeddable video on the approved publisher channel using `YOUTUBE_API_KEY`, creates a draft listening lesson, and uses ModelBridge for original learning material. British Council companion pages are used when available. TED-Ed lesson URLs are also detected from official YouTube descriptions when present. A changed/unavailable companion page automatically falls back to metadata-only generation instead of failing the entire lesson.

## Visibility and cost control

The 120 catalogue entries are not 120 student-visible lessons. They remain in the admin-only Curated Story Bank until selected. Generated lessons remain drafts until reviewed/published, preserving tenant availability controls and avoiding an automatic 120-job AI burst during migration. Tenant Admin generation remains tenant-private; Platform Admin generation remains global draft content.

## Runtime resolution

Known verified BBC video IDs are seeded where available. Other catalogue items are title-resolved only inside the approved channel and filtered for embeddable, public, 45-second to 45-minute videos. Resolved IDs are cached in `listening_story_catalog` to reduce repeated YouTube search quota.
