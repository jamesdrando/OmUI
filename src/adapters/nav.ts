import type { RequestContext } from "../types/context";
import type { DashboardPageSpec } from "../types/page-spec";
import type { DashboardPageId } from "../types/nav";

export function makePageSpec(currentPage: DashboardPageId, ctx: RequestContext): DashboardPageSpec {
  const navItems = [
    { key: "overview", label: "Overview", href: "/dashboard/overview" },
    { key: "tables", label: "Data tables", href: "/dashboard/tables" },
    { key: "analytics", label: "Analytics", href: "/dashboard/analytics" },
    { key: "items", label: "Items", href: "/dashboard/items" },
    { key: "shell", label: "Layout shell", href: "/dashboard/shell" },
  ] as const;

  const titleMap: Record<DashboardPageId, string> = {
    overview: "KPI Overview",
    tables: "Data Tables",
    analytics: "Analytics Studio",
    items: "Items",
    users: "Users",
    shell: "Shell Layout Blueprint",
  };

  const subtitleMap: Record<DashboardPageId, string> = {
    overview: "Executive snapshot with reusable cards, meters, and feed widgets.",
    tables: "Switch datasets and use setServerPaging(...) when backend pagination is needed.",
    analytics: "Client-side SVG analytics widgets with shared filter/query contracts.",
    items: "Scrollable generic item list with Open/Edit actions and admin-only Delete actions.",
    users: "User directory list with role-aware actions for administration demos.",
    shell: "Use this page as the base container template for SSR pages and app sections.",
  };

  return {
    pageId: currentPage,
    title: titleMap[currentPage],
    subtitle: subtitleMap[currentPage],
    userName: ctx.userName,
    rightRail: "on",
    role: ctx.role,
    demoMode: ctx.demoMode,
    topTabs: navItems
      .filter((item) => item.key !== "shell")
      .map((item) => ({
        key: item.key,
        label: item.label === "Data tables" ? "Tables" : item.label,
        href: item.href,
      })),
    sideNav: [
      {
        title: "Navigation",
        items: navItems.map((item) => ({
          key: item.key,
          label: item.label,
          href: item.href,
          current: item.key === currentPage,
          active: item.key === currentPage,
        })),
      },
      {
        title: "Admin",
        items: [
          { key: "users", label: "Users", href: "/dashboard/users", current: currentPage === "users", active: currentPage === "users" },
          { key: "tenants", label: "Tenants", href: "#" },
          { key: "settings", label: "Settings", href: "#" },
        ],
      },
    ],
    rightRailSections: makeRightRail(currentPage, ctx),
    actions: makePageActions(currentPage),
  };
}

function makePageActions(currentPage: DashboardPageId) {
  if (currentPage === "overview") return [{ label: "Generate snapshot" }];
  if (currentPage === "tables") return [{ label: "Export CSV" }];
  if (currentPage === "analytics") return [{ label: "Refresh analytics", actionId: "refresh-analytics" }];
  if (currentPage === "users") return [{ label: "Invite user" }];
  if (currentPage === "shell") return [{ label: "Open table page", href: "/dashboard/tables" }];
  return [];
}

function makeRightRail(currentPage: DashboardPageId, ctx: RequestContext): DashboardPageSpec["rightRailSections"] {
  if (currentPage === "overview") {
    return [
      {
        title: "Today",
        alerts: [{ tone: "success" as const, text: "No critical alerts." }],
      },
      {
        title: "Targets",
        links: [
          { label: "ARR: 71% of goal", href: "#" },
          { label: "NPS: 52 / target 55", href: "#" },
          { label: "SLA: 99.95% / target 99.9%", href: "#" },
        ],
      },
    ];
  }

  if (currentPage === "tables") {
    return [
      {
        title: "Table hints",
        alerts: [{ tone: "info" as const, text: "Use drag on row and column bumpers to select ranges quickly." }],
      },
      {
        title: "Loaded columns",
        links: [
          { label: "Search and sort enabled", href: "#" },
          { label: "Column filters enabled", href: "#" },
          { label: "Clipboard copy enabled", href: "#" },
        ],
      },
    ];
  }

  if (currentPage === "items") {
    return [
      {
        title: "Current role",
        badgeText: ctx.role,
      },
      {
        title: "Actions",
        links: [
          { label: "Create new item", href: "#" },
          { label: "Manage shared views", href: "#" },
          { label: "Archive old items", href: "#" },
        ],
      },
    ];
  }

  if (currentPage === "analytics") {
    return [
      {
        title: "Analytics hints",
        alerts: [{ tone: "info" as const, text: "Filters and chart rendering run client-side with backend query adapters." }],
      },
      {
        title: "Chart modes",
        links: [
          { label: "Time series + trendline", href: "#" },
          { label: "Pie and donut breakdown", href: "#" },
          { label: "Horizontal/vertical histogram", href: "#" },
        ],
      },
    ];
  }

  if (currentPage === "users") {
    return [
      {
        title: "Access policy",
        alerts: [{ tone: "info" as const, text: "Delete action is visible only when role is admin." }],
      },
      {
        title: "Team operations",
        links: [
          { label: "Provision branch users", href: "#" },
          { label: "Audit role assignments", href: "#" },
          { label: "Review inactive accounts", href: "#" },
        ],
      },
    ];
  }

  return [
    {
      title: "Status",
      alerts: [{ tone: "success" as const, text: "All core services healthy." }],
    },
    {
      title: "Quick links",
      links: [
        { label: "Overview page", href: "/dashboard/overview" },
        { label: "Table page", href: "/dashboard/tables" },
        { label: "Analytics page", href: "/dashboard/analytics" },
        { label: "Items page", href: "/dashboard/items" },
        { label: "Users page", href: "/dashboard/users" },
      ],
    },
  ];
}
