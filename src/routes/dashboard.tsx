import { Hono } from "hono";
import { analyticsAdapter } from "../adapters/analytics.adapter";
import { itemsAdapter } from "../adapters/items.adapter";
import { overviewAdapter } from "../adapters/overview.adapter";
import { shellAdapter } from "../adapters/shell.adapter";
import { tablesAdapter } from "../adapters/tables.adapter";
import { usersAdapter } from "../adapters/users.adapter";
import { runtimeConfig } from "../config/runtime";
import type { DashboardPageId } from "../types/nav";
import { AnalyticsPage } from "../ui/pages/AnalyticsPage";
import { ItemsPage } from "../ui/pages/ItemsPage";
import { OverviewPage } from "../ui/pages/OverviewPage";
import { ShellPage } from "../ui/pages/ShellPage";
import { TablesPage } from "../ui/pages/TablesPage";
import { UsersPage } from "../ui/pages/UsersPage";

const allowedPages: DashboardPageId[] = ["overview", "tables", "analytics", "items", "users", "shell"];

export const dashboardRoute = new Hono();

dashboardRoute.get("/:page", async (c) => {
  const page = c.req.param("page") as DashboardPageId;
  if (!allowedPages.includes(page)) {
    return c.notFound();
  }

  const ctx = c.get("requestContext");
  if (!ctx.signedIn) {
    if (!runtimeConfig.demoMode) {
      return c.text(
        "Unauthorized. Provide x-user-id (and optional x-user-name, x-user-role, x-provider, x-tenant-id) headers.",
        401,
      );
    }
    return c.redirect("/");
  }

  if (page === "overview") {
    const model = await overviewAdapter.load(ctx);
    return c.html(<OverviewPage model={model} />);
  }

  if (page === "tables") {
    const model = await tablesAdapter.load(ctx);
    return c.html(<TablesPage model={model} />);
  }

  if (page === "analytics") {
    const model = await analyticsAdapter.load(ctx);
    return c.html(<AnalyticsPage model={model} />);
  }

  if (page === "items") {
    const model = await itemsAdapter.load(ctx);
    return c.html(<ItemsPage model={model} />);
  }

  if (page === "users") {
    const model = await usersAdapter.load(ctx);
    return c.html(<UsersPage model={model} />);
  }

  const model = await shellAdapter.load(ctx);
  return c.html(<ShellPage model={model} />);
});
