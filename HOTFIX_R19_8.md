# R19 Hotfix 8 — Platform integration inheritance

- Fixes Listening reading raw Worker env while Platform Admin integrations are stored in `integration_settings`.
- Platform Listening explicitly resolves platform-managed integrations.
- Tenant runtime inherits non-ModelBridge platform integrations (YouTube/Azure/provider selectors).
- Tenant ModelBridge remains isolated and tenant-owned; it never falls back to the platform ModelBridge credential.
- Curated Story Bank distinguishes a missing platform YouTube key from a managed key that cannot be decrypted because of `SETTINGS_MASTER_KEY` mismatch.
- Task runner marker: `0.9.0-r19-hotfix8`.
