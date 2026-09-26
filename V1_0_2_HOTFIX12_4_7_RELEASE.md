# English Mastery v1.0.2 Hotfix 12.4.7

## Admin Cloudflare Worker resource optimisation

This patch targets Cloudflare `Error 1102 / Worker exceeded resource limits` seen frequently under the Tenant Admin workspace (`/admin`).

### Root cause addressed
- The protected Admin layout was `force-dynamic` and performed a D1 session lookup during server rendering for every Admin navigation. On a Cloudflare Free-first deployment this made lightweight Admin pages pay the full Next.js/OpenNext SSR CPU cost before any page data loaded.
- The global user badge then performed a second `/api/admin/session` request.
- Every authenticated API request updated `staff_sessions.last_seen_at`, causing write amplification when an Admin page loaded several resources in parallel.
- The Admin dashboard used one statement containing multiple scalar subqueries and then performed a separate quota lookup.

### Changes
- `/admin/(protected)` is statically renderable again. A client-side `TenantAuthGate` validates the HttpOnly session through `/api/admin/session` before showing protected UI.
- API security is unchanged: every `/api/admin/*` data/action endpoint still validates the Tenant Admin session server-side.
- Tenant session `last_seen_at` writes are throttled to at most once per 10 minutes per session.
- The top-bar Tenant identity reuses the auth-gate result instead of issuing another session request.
- `/api/admin/dashboard` now uses one D1 batch of index-bounded queries and computes quota from the same batch, removing the duplicate quota query and scalar-subquery statement.
- The auth gate does not retry-loop on a transient failure, preventing a bad Worker interval from creating more load.

### Expected effect
- Opening `/admin` no longer requires authenticated Next.js SSR + D1 work for the HTML route.
- One fewer session API request per Admin page load.
- Large reductions in D1 session writes during pages that fan out to several Admin APIs.
- Dashboard work is predictable and index-bounded.

No database migration is added. Schema remains 61 migrations / 114 application tables.
