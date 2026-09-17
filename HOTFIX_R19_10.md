# R19 Hotfix 10 — Listening integration resolver diagnostics

## Root-cause fixes

1. Platform managed text settings no longer overwrite a valid Worker fallback with an empty managed row.
2. Platform Listening now exposes ModelBridge credential state, so a managed key that cannot be decrypted is reported explicitly instead of as a generic “not configured” message.
3. Curated-story resolution now distinguishes a missing Platform `YOUTUBE_API_KEY` from a genuine “no eligible YouTube match” case.
4. The resolver error for `story-r9-018` now identifies whether the API credential was unavailable or YouTube returned no eligible embeddable match.

No database migration is required.
