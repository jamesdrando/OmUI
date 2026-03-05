# OmUI Component Guide

This guide is intentionally structured for both humans and AI agents.

## 1) File Map
- `css/theme.css`: Global dark/default tokens.
- `css/theme-light.css`: Light theme overrides.
- `css/dashboard-shell.css`: Shell + `ui-*` components.
- `css/vtg-styles.css`: VirtualGridTable styles.
- `js/VirtualGridTable.js`: Grid class + auto-init helper.
- `examples/index.html`: Example launcher.

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
- `examples/index.html`
- `examples/DashboardKPI.example.html`
- `examples/DashboardTable.example.html`
- `examples/DashboardReports.example.html`
- `examples/DashboardShell.example.html`
- `examples/VirtualGridTable.example.html`

## 6) VirtualGridTable Data Feeding (Non-Chunked)
Use `setData(...)` in either format.

Array of objects:
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

## 7) Items Role Rule
- Keep delete buttons in markup for all rows.
- Let CSS enforce visibility by role.
- Set role via SSR: `<div class="dash" data-user-role="admin">` or `member`.

## 8) Conventions
- Namespace:
  - Layout: `dash__*`
  - Shared components: `ui-*`
  - Grid-specific: `vgt__*`
- Prefer HTML/CSS first; add JS only for data and behavior that cannot be expressed declaratively.
