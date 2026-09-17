# V0.9.0 R19 Hotfix 3

## NASA podcast redirect compatibility
Podcast discovery still enforces public-network URL validation. For sources whose configured host is `nasa.gov`, the official NASA podcast S3 host `audio-podcast-files.s3.amazonaws.com` is additionally allowlisted for feed redirects. Arbitrary third-party redirect hosts remain blocked.

## Curated Story Bank queue diagnostics
Curated queue APIs now return concrete per-story failure reasons when no selected story can be queued. The UI surfaces the returned failures instead of collapsing them into the generic `Could not queue curated stories` message.

No database migration is required. Existing R19 job-event logging remains unchanged.
