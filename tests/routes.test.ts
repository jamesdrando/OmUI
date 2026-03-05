import { beforeEach, describe, expect, test } from "bun:test";
import { app } from "../src/app";
import { seedDemoDatabase } from "../src/db/seed";

describe("route smoke tests", () => {
  beforeEach(() => {
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
    expect(html.includes("/js/VirtualGridTable.js")).toBeTrue();
    expect(html.includes("/public/js/virtual-grid-table.page.js")).toBeTrue();
    expect(html.includes("tableDatasetConfig")).toBeTrue();
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

  test("dataset api returns payload for configured table", async () => {
    const res = await app.request("/api/datasets/orders");
    expect(res.status).toBe(200);
    const payload = (await res.json()) as { columns: Array<{ key: string }>; rows: unknown[] };
    expect(payload.columns.length).toBeGreaterThan(0);
    expect(payload.rows.length).toBeGreaterThan(0);
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
