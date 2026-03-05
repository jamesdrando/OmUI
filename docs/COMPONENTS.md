# OmUI Component Guide

This guide is intentionally structured for both humans and AI agents.

## 1) File Map
- `css/theme.css`: Global dark/default tokens.
- `css/theme-light.css`: Light theme overrides.
- `css/dashboard-shell.css`: Shell + `ui-*` components.
- `css/vtg-styles.css`: VirtualGridTable styles.
- `src/ui/layout/DashboardLayout.tsx`: Shell composition and slot wiring.
- `src/ui/components/DataTablePanel.tsx`: Table host + runtime config payload.
- `src/ui/components/AnalyticsPanel.tsx`: Analytics hosts + runtime config payload.
- `legacy/virtual-grid-table/VirtualGridTable.legacy.js`: Archived legacy grid implementation.
- `legacy/examples/index.html`: Archived example launcher.

## 2) Machine-Readable Index
```yaml
components:
  dash:
    root: ".dash"
    slots:
      - top-nav
      - left-nav
      - right-rail
      - main-content
      - main-footer
    states:
      data-right-rail: ["on", "off"]
      data-collapsed: ["true", "false"]
      data-user-role: ["member", "admin"]

  ui_sidenav:
    selector: ".ui-sidenav"
    item_selector: ".ui-sidenav__item"
    states:
      data-current: ["page"]
      data-active: ["true", "false"]

  ui_tabs:
    selector: ".ui-tabs"
    tab_selector: ".ui-tab"
    states:
      data-active: ["true", "false"]

  ui_card:
    selector: ".ui-card"
    custom_props:
      - "--ui-card-pad"

  ui_table_panel:
    selectors:
      - ".ui-tablePanel"
      - ".ui-tablePanel__head"
      - ".ui-tablePanel__body"
      - ".ui-tablePanel__select"

  ui_item_list:
    selectors:
      - ".ui-itemList"
      - ".ui-itemRow"
      - ".ui-itemActions"
      - ".ui-itemBtn"
      - ".ui-itemBtn--danger"
    role_rule:
      hide_delete_when_not_admin: '.dash:not([data-user-role="admin"]) .ui-itemBtn--danger'

  virtual_grid_table:
    constructor: "new VirtualGridTable(containerId, options)"
    primary_api:
      - "setData(arrayOfObjects | { columns, rows })"
      - "setServerPaging({ columns, pageSize, totalRows, fetchPage })"
      - "setLoading(boolean)"
      - "setSearch(string)"
      - "sortBy(index, dir)"
```

## 3) Theme Tokens
Core tokens to change first:
- Spacing: `--theme-space-1..6`
- Shell sizing: `--shell-top-h`, `--shell-left-w`, `--shell-right-w`, `--shell-content-max-w`
- Component sizing: `--ui-card-pad`, `--ui-control-h`, `--ui-gap`
- Color tokens: `--theme-bg-canvas`, `--theme-surface-*`, `--theme-border`, `--theme-text`, `--theme-accent`

## 4) Shell Template (Copy/Paste)
```html
<div class="dash" data-right-rail="on" data-user-role="member">
  <header class="dash__topbar" data-slot="top-nav"></header>
  <aside class="dash__left" data-slot="left-nav"></aside>
  <section class="dash__mainWrap">
    <main class="dash__main" data-slot="main-content"></main>
    <footer class="dash__footer" data-slot="main-footer"></footer>
  </section>
  <aside class="dash__right" data-slot="right-rail"></aside>
</div>
```

## 5) Linked Example Pages
- `legacy/examples/index.html`
- `legacy/examples/DashboardKPI.example.html`
- `legacy/examples/DashboardTable.example.html`
- `legacy/examples/DashboardReports.example.html`
- `legacy/examples/DashboardShell.example.html`
- `legacy/examples/VirtualGridTable.example.html`

## 6) VirtualGridTable Data Feeding
Production flow uses `setServerPaging(...)` with `/api/analytics/query`.
Local/static flow can still use `setData(...)`.

Server-paged example:
```js
grid.setServerPaging({
  columns: [{ key: "ordered_at", label: "ordered_at" }, { key: "total_usd", label: "total_usd" }],
  pageSize: 250,
  totalRows: warmup.totalRows,
  async fetchPage(request) {
    const payload = await fetch("/api/analytics/query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        dataset: "orders",
        page: { offset: request.start, limit: request.size }
      })
    }).then((res) => res.json());

    return { start: request.start, totalRows: payload.totalRows, rows: payload.rows };
  }
});
```

Local example (`setData`) for isolated component work:

```js
grid.setData([
  { id: 1, name: "Acme", region: "US" },
  { id: 2, name: "Globex", region: "EU" }
]);
```

Explicit columns + rows:
```js
grid.setData({
  columns: [
    { key: "id", label: "id" },
    { key: "name", label: "name" },
    { key: "region", label: "region" }
  ],
  rows: [
    [1, "Acme", "US"],
    [2, "Globex", "EU"]
  ]
});
```

## 7) Analytics/Unknown Fields Rule
- Never hard-code dataset column names in SSR page components.
- Read dataset descriptors from `/api/analytics/datasets`.
- Let client runtime choose usable chart fields heuristically.
- Prefer backend-provided field `type` metadata (`string`, `number`, `currency_usd`, `percent`, `date`, `datetime`, `time`).

## 8) Items Role Rule
- Keep delete buttons in markup for all rows.
- Let CSS enforce visibility by role.
- Set role via SSR: `<div class="dash" data-user-role="admin">` or `member`.

## 9) Conventions
- Namespace:
  - Layout: `dash__*`
  - Shared components: `ui-*`
  - Grid-specific: `vgt__*`
- Prefer HTML/CSS first; add JS only for data and behavior that cannot be expressed declaratively.
