# V0.6 R4 tenant architecture — Platform Admin / Tenant Admin / Student

## Roles

### Platform Admin
Owns the platform control plane: tenants, global source catalogues, global Question Bank/reference sources, syllabus monitoring, provider configuration, platform generation jobs and global resources.

### Tenant Admin
Exactly one active Admin account per tenant. It is managed only by Platform Admin. Tenant Admin has the former single-tenant Admin capabilities, but every data write is constrained to its authenticated tenant.

### Student
Learning-only identity with login name + PIN. Student can access public/global resources plus resources published to its own tenant.

There is no Family, Parent, Teacher or Learner product role.

## Authorization invariant

Tenant Admin authorization comes only from the HttpOnly tenant session. Student authorization comes from the Student session. Request body/query `tenant_id` is never trusted for authorization.

## Resource model

- `global`: Platform-owned/shared.
- `tenant`: private to one tenant.

Tenant Admin can reference global resources and generate/create tenant-private resources. Historical assignments keep stable resource references.

## Tenant Admin lifecycle

Platform Admin creates or resets the single Tenant Admin account through `/platform/tenants`. R3 database constraints prevent more than one active Admin membership per tenant.

For `tenant-default`, R3 migration preferentially preserves `xiaoganglau@gmail.com` when present. Historical operator memberships/sessions are removed from the runtime tenant-role model and Students are reassigned to the retained Admin ownership record.

## AI cost boundary

Platform jobs use Platform ModelBridge credentials. Tenant-owned AI jobs resolve the tenant integration by server tenant context. No customer tenant silently falls back to a Platform billable key.

## R4 legacy ownership compatibility

V0.5 was single-tenant. R4 migration `0020_v06_r4_legacy_admin_ownership.sql` reattaches V0.5 Admin-created resources and Queue history to `tenant-default`. Published platform seed/global resources remain global but are visible in Tenant Admin resource libraries. New Platform global drafts remain Platform-only. Existing R1-R3 Courses and Assignments are already tenant-owned and are not rewritten.
