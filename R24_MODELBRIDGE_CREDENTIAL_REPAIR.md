# R24 — ModelBridge managed credential repair

R24 fixes a misleading state where Platform Integrations could show an Admin-managed
ModelBridge key as configured even though that ciphertext no longer decrypted with
the current SETTINGS_MASTER_KEY. If the main Worker also had a legacy
MODELBRIDGE_API_KEY Worker secret, the web UI and Test Chat could still work from
that fallback, while the task-runner (without that fallback) failed with
"ModelBridge is not configured".

Changes:
- integration status now distinguishes successful managed decryption from Worker fallback.
- decrypt failure is surfaced in Platform > Integrations instead of being masked.
- "Migrate existing Worker values" also repairs an undecryptable managed secret by
  re-encrypting a known-good main-Worker fallback with the current master key.
- task-runner R24 logs managed/decrypt/fallback state without logging secret values.
- task-runner emits an actionable error when the D1 managed row exists but cannot decrypt.
- scripts/sync-settings-master-key.sh is included in the release.
