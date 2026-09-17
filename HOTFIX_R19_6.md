# R19 Hotfix 6

Fixes TypeScript TS2322 introduced by publisher-hosted listening media support.

`external_video` is now accepted consistently by `populateListeningMaterial()` alongside `youtube`, `podcast`, and `owned_audio`.

No database migration is required. Existing migration baseline remains 35 migrations.
