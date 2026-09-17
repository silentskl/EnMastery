# Listening Source Studio · R19 Hotfix 11

## Change
Listening no longer relies on a hard-coded curated story list in the main workflow.

### Platform Admin
- Add any YouTube channel by `@handle`, channel URL, or channel ID.
- Add any podcast RSS/Atom feed.
- Enable/disable configured sources without deleting historical imports.
- Select a source and discover its actual media.
- For YouTube channels, optionally search by keyword **inside that channel**.
- Sort by newest, relevance, or view count.
- Discover up to 50 eligible videos per run.
- Select the exact videos to turn into lessons.

### Tenant Admin
Tenant Admins use the Platform-approved source catalogue and can perform the same channel-scoped media discovery and selection. They do not need their own YouTube API key.

## YouTube behavior
- No publisher/channel is hard-coded into the resolver.
- With no keyword, the worker reads the configured channel's uploads playlist (low quota cost).
- With a keyword, the worker uses YouTube Data API search constrained by the configured channel ID.
- Only public, embeddable videos that pass the existing duration/content checks are returned.

## Compatibility
The existing `listening_sources` table is reused. No database migration is required.
Existing seeded sources remain usable as initial examples, but the resolver does not depend on them.

## Removed from main UX
The fixed Curated P5/P6 Story Bank is no longer displayed in Listening Source Studio. The workflow is now:

`Configure source → Discover channel/feed → Review media → Select media → Create lesson → Review → Publish`
