# R23 ModelBridge task-runner credential fix

Platform and tenant ModelBridge API keys are encrypted in D1. The web Worker and `english-mastery-task-runner` must therefore have the **same** `SETTINGS_MASTER_KEY`. A key that is present only on the web Worker, or a different key on the task runner, makes the UI look configured while queue jobs cannot decrypt `MODELBRIDGE_API_KEY`.

R23 adds a queue-runtime diagnostic log (`integration_runtime`) and replaces the misleading generic error with an explicit task-runner/master-key error.

## Recovery when the original SETTINGS_MASTER_KEY is known

Set the same value on every Worker, then redeploy:

```bash
export SETTINGS_MASTER_KEY='YOUR_EXISTING_SHARED_VALUE'
printf '%s' "$SETTINGS_MASTER_KEY" | npx wrangler secret put SETTINGS_MASTER_KEY
printf '%s' "$SETTINGS_MASTER_KEY" | npx wrangler secret put SETTINGS_MASTER_KEY --config workers/task-runner/wrangler.jsonc
printf '%s' "$SETTINGS_MASTER_KEY" | npx wrangler secret put SETTINGS_MASTER_KEY --config workers/syllabus-monitor/wrangler.jsonc
npm run cf:update
```

## Recovery when the old SETTINGS_MASTER_KEY is unknown

Choose a new strong value and set that same value on all Workers. Because existing managed ciphertext was encrypted with the old value, open Platform Settings and re-enter all managed secrets (ModelBridge, YouTube, Azure) after deployment. Tenant admins must likewise re-enter their tenant ModelBridge API keys. Do not expect old ciphertext to become decryptable after a key rotation.
