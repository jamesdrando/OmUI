import { beforeEach, describe, expect, test } from "bun:test";
import { analyticsAdapter } from "../src/adapters/analytics.adapter";
import { itemsAdapter } from "../src/adapters/items.adapter";
import { overviewAdapter } from "../src/adapters/overview.adapter";
import { tablesAdapter } from "../src/adapters/tables.adapter";
import { usersAdapter } from "../src/adapters/users.adapter";
import { closeDb } from "../src/db/client";
import { seedDemoDatabase } from "../src/db/seed";

const baseContext = {
  provider: "bi",
  tenantId: "tenant-a",
  userId: "user-a",
  role: "member" as const,
  signedIn: true,
  userName: "Demo User",
  demoMode: true,
};

describe("adapters", () => {
  beforeEach(() => {
    closeDb();
    seedDemoDatabase({ reset: true });
  });

  test("overview adapter returns KPI and pipeline payload", async () => {
    const model = await overviewAdapter.load(baseContext);
    expect(model.kpis.length).toBeGreaterThan(0);
    expect(model.pipeline.length).toBeGreaterThan(0);
    expect(model.page.pageId).toBe("overview");
  });

  test("items adapter removes delete for non-admin role", async () => {
    const model = await itemsAdapter.load(baseContext);
    expect(model.items.length).toBeGreaterThan(0);
    for (const entry of model.items) {
      expect(entry.actions.includes("delete")).toBeFalse();
    }
  });

  test("items adapter keeps delete for admin role", async () => {
    const model = await itemsAdapter.load({ ...baseContext, role: "admin" });
    expect(model.items.length).toBeGreaterThan(0);
    for (const entry of model.items) {
      expect(entry.actions.includes("delete")).toBeTrue();
    }
  });

  test("users adapter removes delete for non-admin role", async () => {
    const model = await usersAdapter.load(baseContext);
    expect(model.users.length).toBeGreaterThan(0);
    for (const entry of model.users) {
      expect(entry.actions.includes("delete")).toBeFalse();
    }
  });

  test("tables adapter reads dataset options from sqlite catalog", async () => {
    const model = await tablesAdapter.load(baseContext);
    expect(model.datasetOptions.length).toBeGreaterThan(0);
    expect(model.datasetOptions[0]?.key.length).toBeGreaterThan(0);
  });

  test("analytics adapter reads dataset options from sqlite catalog", async () => {
    const model = await analyticsAdapter.load(baseContext);
    expect(model.datasetOptions.length).toBeGreaterThan(0);
    expect(model.defaultDataset.length).toBeGreaterThan(0);
  });
});
