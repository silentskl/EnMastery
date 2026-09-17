# V0.5.0 R9 Operations

R9 combines the R8 Question Bank auto-expansion workflow with stricter Admin access control.

## Admin login

Open:

```text
https://study.wisewavesg.com/platform/login
```

Enter the value configured in Cloudflare as `ADMIN_ACCESS_TOKEN`. The UI calls it **Admin password**. Do not give this value to students.

Direct access to `/admin`, `/platform/question-bank`, `/platform/jobs`, `/platform/settings/integrations` or any other Admin page is server-side gated and redirects to `/platform/login` unless the signed HttpOnly Admin session cookie is valid.

The Student sidebar does not contain an Admin link.

## Sign out

Use **Sign out** in the Admin sidebar. This clears the HttpOnly Admin session and returns to `/platform/login`.

## Question Bank expansion

Open `/platform/question-bank` and choose source, level, category, subcategory, skill, topic, difficulty and batch size (1–50). All draft placeholders/jobs are persisted before Queue dispatch. The Task Runner remains strictly serial (`max_batch_size=1`, `max_concurrency=1`). Generated items require review and never auto-publish.

## Upgrade

Copy `.deploy.env` from the previous release and run:

```bash
./scripts/deploy.sh update
```

R9 has no new database migration beyond R8 migration `0016_v05_question_bank_expansion.sql`.

## Multi-tenant proposal

See `docs/MULTI_TENANT_V06.md`. R9 does not yet enable tenant admins; it only locks down the current platform-operator Admin area.
