# R19 Hotfix 7

Fixes D1 CHECK constraints for publisher-hosted listening media.

- Adds `external_video` to `content_media.media_kind`.
- Adds `external_video` (and preserves `owned_audio`) in `listening_imports.media_kind`.
- Preserves existing rows and recreates indexes.
- Required for British Council publisher-first curated story imports.
