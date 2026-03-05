import { beforeEach, describe, expect, test } from "bun:test";
import { app } from "../src/app";
import { closeDb } from "../src/db/client";
import { seedDemoDatabase } from "../src/db/seed";

describe("route smoke tests", () => {
  beforeEach(() => {
    closeDb();
    seedDemoDatabase({ reset: true });
  });

  test("root renders sign in screen", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.includes("OmUI Sign In")).toBeTrue();
    expect(html.includes('action="/signin"')).toBeTrue();
  });

  test("overview route returns 200 and active markers", async () => {
    const res = await app.request("/dashboard/overview");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.includes('data-current="page"')).toBeTrue();
    expect(html.includes('data-active="true"')).toBeTrue();
  });

  test("tables route includes explicit island scripts", async () => {
    const res = await app.request("/dashboard/tables");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.includes("/public/js/table/VirtualGridTable.js")).toBeTrue();
    expect(html.includes("/public/js/table/virtual-grid-table.page.js")).toBeTrue();
    expect(html.includes("tableDatasetConfig")).toBeTrue();
  });

  test("analytics route includes analytics page script and config", async () => {
    const res = await app.request("/dashboard/analytics");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.includes("/public/js/analytics/analytics.page.js")).toBeTrue();
    expect(html.includes("analyticsConfig")).toBeTrue();
  });

  test("analytics examples demo route renders with demo endpoints", async () => {
    const res = await app.request("/dashboard/analytics/examples");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.includes("Analytics Examples (Demo)")).toBeTrue();
    expect(html.includes("/api/demo/analytics/datasets")).toBeTrue();
    expect(html.includes("/api/demo/analytics/query")).toBeTrue();
  });

  test("items route honors admin role", async () => {
    const res = await app.request("/dashboard/items", {
      headers: {
        "x-user-role": "admin",
      },
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.includes('data-user-role="admin"')).toBeTrue();
    expect(html.includes("ui-itemBtn--danger")).toBeTrue();
  });

  test("users route renders user directory", async () => {
    const res = await app.request("/dashboard/users", {
      headers: {
        "x-user-role": "admin",
      },
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.includes("User Directory")).toBeTrue();
    expect(html.includes('data-user-role="admin"')).toBeTrue();
  });

  test("shell route returns 200", async () => {
    const res = await app.request("/dashboard/shell");
    expect(res.status).toBe(200);
  });

  test("analytics dataset catalog endpoint returns capabilities", async () => {
    const res = await app.request("/api/analytics/datasets");
    expect(res.status).toBe(200);
    const payload = (await res.json()) as { datasets: Array<{ key: string; fields: unknown[] }> };
    expect(payload.datasets.length).toBeGreaterThan(0);
    expect((payload.datasets[0]?.fields.length ?? 0) > 0).toBeTrue();
  });

  test("analytics query endpoint returns paged rows", async () => {
    const res = await app.request("/api/analytics/query", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        dataset: "orders",
        page: { offset: 0, limit: 20 },
        sort: [{ field: "ordered_at", dir: "desc" }],
      }),
    });
    expect(res.status).toBe(200);
    const payload = (await res.json()) as { rows: unknown[]; totalRows: number };
    expect(payload.rows.length).toBeGreaterThan(0);
    expect(payload.totalRows).toBeGreaterThan(0);
  });

  test("analytics query rejects invalid operators", async () => {
    const res = await app.request("/api/analytics/query", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        dataset: "orders",
        filters: [{ field: "order_no", op: "invalid-op", value: "x" }],
      }),
    });
    expect(res.status).toBe(400);
  });

  test("demo analytics dataset endpoint returns seeded mock sets", async () => {
    const res = await app.request("/api/demo/analytics/datasets");
    expect(res.status).toBe(200);
    const payload = (await res.json()) as { datasets: Array<{ key: string }> };
    expect(payload.datasets.length).toBeGreaterThan(0);
    expect(payload.datasets.some((dataset) => dataset.key === "monthly_revenue")).toBeTrue();
  });

  test("logout signs out and dashboard redirects to sign in", async () => {
    const logout = await app.request("/logout", { method: "POST" });
    expect(logout.status).toBe(302);

    const res = await app.request("/dashboard/overview");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/");
  });

  test("signin restores dashboard access", async () => {
    await app.request("/logout", { method: "POST" });
    const form = new URLSearchParams();
    form.set("userId", "u-1001");
    form.set("provider", "bi");
    form.set("tenantId", "tenant-demo");

    const signin = await app.request("/signin", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    expect(signin.status).toBe(302);
    expect(signin.headers.get("location")).toBe("/dashboard/overview");

    const res = await app.request("/dashboard/overview");
    expect(res.status).toBe(200);
  });
});
