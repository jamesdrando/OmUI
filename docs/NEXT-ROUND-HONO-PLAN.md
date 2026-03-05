# Next Round Plan: Backend Wiring

## Goal
Connect OmUI to a real backend with minimal churn, preserving the current UI shell/component contracts.

## Current Baseline
- Hono + JSX migration is complete.
- Demo and non-demo modes are now split by `OMUI_DEMO_MODE`.
- Analytics APIs can proxy to upstream via `OMUI_ANALYTICS_PROXY_BASE_URL`.
- Non-demo adapters intentionally return empty non-analytics data until backend adapters are implemented.

## What To Read First
- `README.md`
- `docs/BACKEND-INTEGRATION.md`
- `docs/COMPONENTS.md`
- `src/lib/analytics/contracts.ts`

## Execution Plan (Ordered)
1. Configure non-demo mode + analytics proxy and verify live data on `/dashboard/tables` and `/dashboard/analytics`.
2. Confirm gateway/session layer forwards required headers (`x-user-id`, role/name/tenant/provider as needed).
3. Decide whether overview/items/users should be served by:
   - dedicated backend view-model endpoints, or
   - a backend adapter layer that maps domain APIs into OmUI view models.
4. Implement adapter replacements in:
   - `src/adapters/overview.adapter.ts`
   - `src/adapters/items.adapter.ts`
   - `src/adapters/users.adapter.ts`
5. Add route tests for non-demo behaviors and any new adapter logic.
6. Validate with `bun run test` and `bun run typecheck`.

## Suggested Adapter Strategy
- Keep `RouteAdapter<TViewModel>` as the boundary.
- Put backend fetch/mapping logic under `src/adapters/*` (or shared helper modules).
- Normalize backend fields at adapter boundaries; do not leak backend-specific shapes into UI components.

## Acceptance Criteria
- Dashboard and API behavior are correct in non-demo mode.
- Analytics/table pages load from real backend datasets without hard-coded field names.
- Overview/items/users display live backend data (or explicit empty state by design).
- No dependency on demo SQLite data in production path.
