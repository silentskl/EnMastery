# English Mastery V0.6.0 R5 Operations


## R5 Tenant ModelBridge fix

All Tenants, including `tenant-default`, resolve ModelBridge credentials from their own `tenant_integrations`. Tenant runtime never falls back to the Platform API key. After upgrade, use Admin → ModelBridge → Test connection before retrying generation that previously returned `This tenant ModelBridge is not configured`.

## Upgrade goal

R4 restores the V0.5 single-tenant Admin's historical resources to the retained `tenant-default` Tenant Admin without re-generating or deleting content.

## What migration 0020 changes

It reassigns qualifying pre-V0.6 Admin-owned rows to:

```text
tenant_id = tenant-default
scope     = tenant
```

Qualifying ownership is derived from the V0.6 boundary timestamp plus durable legacy evidence such as generation jobs, content/job links, Question Bank batches and dynamic Admin-created resource identifiers.

It does **not** move post-V0.6 Platform global resources, and it does not duplicate content.

## Tenant Admin visibility after R4

The Tenant Admin Content, Listening, Writing, Questions and Practice/Exam libraries show:

- published `global` resources; and
- all `tenant` resources owned by the current tenant.

Unpublished Platform global drafts remain hidden from Tenant Admin.

Legacy V0.5 Queue jobs are restored to `tenant-default`, so `/admin/jobs` again contains those historical tasks.

## Existing courses

Courses, course items and assignments introduced in V0.6 already carry `tenant_id`. R4 leaves them unchanged. If a course references a legacy V0.5 resource, migration 0020 restores that resource to the same tenant without changing the course item reference.

## Deploy

```bash
unzip english-mastery-v0.6.0-r5-cloudflare-free.zip
cd english-mastery-v0.6.0-r5
./scripts/deploy.sh update
```

Production D1 migrations are applied only after the deploy helper's release/build gates.
