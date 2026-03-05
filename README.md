# OmUI

Bun + Hono SSR dashboard UI shell with adapter-driven pages and backend-safe analytics contracts.

## Runtime
- Bun `1.3.10`
- Hono

## Commands
- `bun install`
- `bun run seed`
- `bun run dev`
- `bun run test`
- `bun run typecheck`

## Runtime Modes
- Demo mode (`OMUI_DEMO_MODE=1`, default):
  - Seeds SQLite demo data (`data/demo.sqlite`)
  - Enables sign-in UI (`/`, `/signin`, `/logout`)
  - Enables demo analytics examples routes
- Non-demo mode (`OMUI_DEMO_MODE=0`):
  - Disables demo sign-in routes
  - Uses request headers for auth context (`x-user-id`, `x-user-name`, `x-user-role`, `x-provider`, `x-tenant-id`)
  - Keeps dashboard shell/pages active for backend integration

## Backend Proxy (Non-Demo)
- Set `OMUI_ANALYTICS_PROXY_BASE_URL` (or `OMUI_BACKEND_BASE_URL`) to proxy analytics API traffic to an external backend.
- Optional overrides:
  - `OMUI_ANALYTICS_DATASETS_PATH` (default `/api/analytics/datasets`)
  - `OMUI_ANALYTICS_QUERY_PATH` (default `/api/analytics/query`)
- Forwarded headers: `authorization`, `cookie`, `x-user-*`, `x-provider`, `x-tenant-id`, `x-authenticated`.

## Routes
- `/`
- `/dashboard/overview`
- `/dashboard/tables`
- `/dashboard/analytics`
- `/dashboard/analytics/examples` (demo mode only)
- `/dashboard/items`
- `/dashboard/users`
- `/dashboard/shell`
- `/api/analytics/datasets`
- `/api/analytics/query`
- `/api/demo/analytics/datasets` (demo mode only)
- `/api/demo/analytics/query` (demo mode only)
- `/health`

## Contracts and Docs
- Component/shell contract: `docs/COMPONENTS.md`
- Backend integration handoff: `docs/BACKEND-INTEGRATION.md`
- Analytics type contract source: `src/lib/analytics/contracts.ts`

## Architecture Notes
- SSR routes are adapter-backed (`src/adapters/*`) and render view models (`src/types/view-models.ts`).
- Analytics/table client code is isolated under `src/client/*` and reads runtime config from embedded JSON script tags.
- Charts auto-infer usable fields from unknown datasets; they do not require fixed backend field names.
- Legacy static artifacts are preserved under `legacy/` for reference only.
