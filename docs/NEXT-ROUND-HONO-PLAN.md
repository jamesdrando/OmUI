# Next Round Plan: Hono + JSX Migration

## Goal
Move the current static example system into a reusable Hono app using JSX templates while preserving the existing visual system (`theme.css`, `theme-light.css`, `dashboard-shell.css`, `vtg-styles.css`).

## Why This Direction
- We now have a clear shell/component contract (`dash__*`, `ui-*`).
- Hono JSX will reduce duplicated HTML across pages.
- Active nav state and role-aware UI should be server-rendered from route props.

## Scope for Next Session
- Build a minimal Hono app with JSX rendering.
- Convert linked dashboard examples into reusable JSX components.
- Keep CSS as-is; no design reset.
- Keep VirtualGridTable integration for table page (non-chunked data via `setData`).

## Reference Inputs
- `docs/COMPONENTS.md`
- `examples/index.html`
- `examples/DashboardKPI.example.html`
- `examples/DashboardTable.example.html`
- `examples/DashboardReports.example.html`
- `examples/DashboardShell.example.html`

## Proposed App Structure
```txt
src/
  server.ts
  renderer.tsx
  routes/
    index.ts
    dashboard.ts
  views/
    layout/
      AppLayout.tsx
      TopNav.tsx
      SideNav.tsx
      RightRail.tsx
    pages/
      DashboardKPIPage.tsx
      DashboardTablePage.tsx
      DashboardReportsPage.tsx
      DashboardShellPage.tsx
    components/
      Tabs.tsx
      Card.tsx
      ReportList.tsx
      TablePanel.tsx
public/
  css/ (existing files)
  js/VirtualGridTable.js
```

## Data/Props Contract
- Global page props:
  - `title: string`
  - `currentPage: 'overview' | 'tables' | 'reports' | 'shell'`
  - `userRole: 'member' | 'admin'`
  - `rightRail: 'on' | 'off'`
- Reports page props:
  - `reports: Array<{ id, title, meta, updatedAt, owner, scope }>`
- Tables page props:
  - `datasetOptions: Array<{ key, label }>`

## Server-Side Responsibilities
- Set active nav/tab state from `currentPage`.
- Set role visibility state via `data-user-role` on `.dash`.
- Provide report list data (mock/static initially).
- Provide page-level metadata (`title`, etc.).

## Client-Side Responsibilities (Minimal)
- Table page only:
  - instantiate `VirtualGridTable` on `#grid`
  - feed non-chunked datasets using `setData(...)`
  - update metadata text after dataset switch
- Reports role switcher can be demo-only in examples; production role should come from server.

## nav.js Decision
Default: do **not** rely on `nav.js` for active state in production.
- Active tab/sidebar should be server-rendered in JSX.
- Optional: keep tiny `nav.js` only for static demo fallback pages.

## Migration Steps (Ordered)
1. Boot Hono project with JSX renderer and static file serving.
2. Add shared `AppLayout.tsx` matching current shell markup and slot regions.
3. Implement reusable `TopNav`, `SideNav`, `Tabs`, and `RightRail` components.
4. Port KPI page to JSX route (`/dashboard/overview`).
5. Port Tables page (`/dashboard/tables`) with existing VirtualGridTable behavior.
6. Port Reports page (`/dashboard/reports`) with server-driven role and list data.
7. Port shell blueprint page (`/dashboard/shell`) for documentation/demo.
8. Keep `examples/` static pages until JSX pages are visually validated.
9. Once validated, update README to prioritize Hono routes and mark static examples as reference.

## Acceptance Criteria
- All 4 dashboard pages render from Hono JSX with shared layout.
- Active tabs/sidebar are correct without client nav logic.
- Admin sidebar labels are exactly: Users, Tenants, Settings.
- Reports page shows Open/Edit for all roles; Delete visible only for admin.
- Table page supports non-chunked dataset switching through `setData(...)`.
- Existing CSS files remain source of truth (no regressions in visual style).

## Risks / Watchouts
- Pathing for static assets when moving from flat HTML to Hono routes.
- Avoid duplicating layout markup between pages.
- Keep VirtualGridTable global bootstrapping predictable (`#grid` present only where needed).
- Ensure light theme still works with `setAppTheme('light')`.

## First Task Next Session
Create Hono skeleton + JSX renderer + one fully migrated route (`/dashboard/overview`) before touching other pages.
