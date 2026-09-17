# Cloudflare Free deployment

## First deployment

Prerequisites:

- Cloudflare Workers Free account
- Node.js 22+
- Wrangler authenticated once with `npx wrangler login`
- a working ModelBridge chat model ID
- optional: Cloudflare Email Service sender domain + verified administrator destination

Run:

```bash
./scripts/deploy.sh
```

or:

```bash
npm run cf:deploy
```

The helper is idempotent. It creates D1/R2 only if they do not already exist, writes the discovered D1 database ID into both Wrangler files, applies all pending migrations, validates/builds, deploys both Workers, and then sets Worker secrets.

## Updates

After replacing source files with a newer release:

```bash
./scripts/deploy.sh update
```

or:

```bash
npm run cf:update
```

The update path does **not** create a new D1 or R2 resource. Existing data remains in place; only pending D1 migration files are applied before the Workers are redeployed.

## Status

```bash
./scripts/deploy.sh status
```

This displays Cloudflare identity, D1/R2 resources, migration status and the local binding configuration.

## Email on Workers Free

Email alerting is optional. The default release has no `send_email` binding so an account that has not configured Email Service can still deploy successfully.

When email is enabled through the deploy script, the generated binding is restricted to the administrator destination address. On Workers Free that address must already be verified in the Cloudflare account, and the sender must belong to a domain onboarded to Cloudflare Email Service.

## Secrets

The deployment helper never writes `MODELBRIDGE_API_KEY` or `ADMIN_MONITOR_TOKEN` into `.deploy.env` or Wrangler config. Secrets are uploaded with `wrangler secret put` after Worker deployment.

`.deploy.env` stores only non-secret deployment state (D1 ID, model ID, email settings) and is ignored by Git.
