import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { AnalyticsPanel } from "../src/ui/components/AnalyticsPanel";
import { ItemList } from "../src/ui/components/ItemList";
import { KpiCard } from "../src/ui/components/KpiCard";
import { MeterRow } from "../src/ui/components/MeterRow";
import { DashboardLayout } from "../src/ui/layout/DashboardLayout";
import type { DashboardPageSpec } from "../src/types/page-spec";

const basePage: DashboardPageSpec = {
  pageId: "overview",
  title: "Overview",
  subtitle: "Sub",
  userName: "Maya Ortiz",
  rightRail: "on",
  role: "member",
  demoMode: true,
  topTabs: [{ key: "overview", label: "Overview", href: "/dashboard/overview" }],
  sideNav: [{ title: "Navigation", items: [{ key: "overview", label: "Overview", href: "/dashboard/overview", current: true, active: true }] }],
  rightRailSections: [{ title: "Today", alerts: [{ tone: "success", text: "Good" }] }],
};

describe("component render", () => {
  test("dashboard layout emits shell state attributes", async () => {
    const app = new Hono();
    app.get("/", (c) =>
      c.html(
        <DashboardLayout page={basePage} footerText="Footer" leftToggleId="left-toggle" rightToggleId="right-toggle">
          <div>Body</div>
        </DashboardLayout>,
      ),
    );

    const html = await (await app.request("/")).text();
    expect(html.includes('class="dash"')).toBeTrue();
    expect(html.includes('data-right-rail="on"')).toBeTrue();
    expect(html.includes('data-user-role="member"')).toBeTrue();
  });

  test("kpi and meter components render expected class contract", async () => {
    const app = new Hono();
    app.get("/", (c) =>
      c.html(
        <section>
          <KpiCard item={{ label: "Revenue", value: "$1", trend: "+1%", tone: "success" }} />
          <MeterRow item={{ label: "Pipeline", valueLabel: "50%", percent: 50 }} />
        </section>,
      ),
    );

    const html = await (await app.request("/")).text();
    expect(html.includes("ui-kpi__trend")).toBeTrue();
    expect(html.includes("ui-meter__bar")).toBeTrue();
  });

  test("item list renders generic class names and danger action", async () => {
    const app = new Hono();
    app.get("/", (c) =>
      c.html(
        <ItemList
          items={[
            {
              id: "1",
              title: "Item 1",
              meta: "Meta",
              actions: ["open", "edit", "delete"],
            },
          ]}
        />,
      ),
    );

    const html = await (await app.request("/")).text();
    expect(html.includes("ui-itemList")).toBeTrue();
    expect(html.includes("ui-itemBtn--danger")).toBeTrue();
  });

  test("analytics panel renders widget hosts and config payload", async () => {
    const app = new Hono();
    app.get("/", (c) =>
      c.html(<AnalyticsPanel datasetOptions={[{ key: "orders", label: "Orders" }]} defaultDataset="orders" />),
    );
    const html = await (await app.request("/")).text();
    expect(html.includes("analyticsConfig")).toBeTrue();
    expect(html.includes("analyticsTimeSeries")).toBeTrue();
    expect(html.includes("analyticsHistogramHorizontal")).toBeTrue();
  });
});
