# OmUI

Bun + Hono SSR component system for dashboard-style apps.

## Runtime
- Bun `1.3.10`
- Hono

## Commands
- `bun install`
- `bun run seed`
- `bun run dev`
- `bun run test`
- `bun run typecheck`

## Routes
- `/`
- `/dashboard/overview`
- `/dashboard/tables`
- `/dashboard/items`
- `/dashboard/users`
- `/dashboard/shell`
- `/api/datasets/:key`

## Layout and Components
- Layout API: `DashboardLayout` + `DashboardPageSpec`
- Reusable components: KPI, meter rows, data table panel, item list
- Existing visual system remains source of truth: `css/theme.css`, `css/theme-light.css`, `css/dashboard-shell.css`, `css/vtg-styles.css`

## Notes
- Demo data is seeded into SQLite (`data/demo.sqlite`) via `scripts/seed.ts`
- Sign-in and logout state are persisted in SQLite (`auth_state`) via `/signin` and `/logout`
- Table page uses explicit island init script: `public/js/virtual-grid-table.page.js` and fetches datasets from `/api/datasets/:key`
- Provider/user context is resolved server-side via request context middleware
