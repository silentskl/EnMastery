# English Mastery v1.0.2 Hotfix 12.4.7.1

## TypeScript build fix

Hotfix 12.4.7 introduced Tenant Admin session-display reuse in `CurrentUserBadge`, but the two exported constants from `tenant-auth-gate.tsx` were referenced without importing them. This caused `tsc --noEmit` to fail with TS2304.

### Fix
- Import `tenantSessionDisplayCacheKey` and `tenantSessionDisplayEvent` from `@/components/tenant-auth-gate` in `components/current-user-badge.tsx`.
- Keep the Hotfix 12.4.7 resource-optimisation behavior unchanged.
- No database migration.
