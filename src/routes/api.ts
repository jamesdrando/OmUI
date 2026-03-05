import { type Context, Hono } from "hono";
import { runtimeConfig } from "../config/runtime";
import { listDemoAnalyticsDatasets, queryDemoAnalyticsDataset } from "../demo/analytics-demo";
import { listAnalyticsDatasets, queryAnalyticsDataset } from "../db/repository";
import type { AnalyticsQueryRequest } from "../lib/analytics/contracts";

export const apiRoute = new Hono();
const hopByHopHeaders = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailers", "transfer-encoding", "upgrade", "content-length"]);

function ensureSignedIn(c: Context) {
  const ctx = c.get("requestContext");
  if (ctx.signedIn) return null;
  return c.json({ error: "Unauthorized" }, 401);
}

function ensureDemoMode(c: Context) {
  if (runtimeConfig.demoMode) return null;
  return c.notFound();
}

function buildUpstreamHeaders(c: Context, includeContentType = false) {
  const headers = new Headers();
  const forwarded = [
    "accept",
    "authorization",
    "cookie",
    "x-user-id",
    "x-user-name",
    "x-user-role",
    "x-provider",
    "x-tenant-id",
    "x-authenticated",
  ];

  for (const name of forwarded) {
    const value = c.req.header(name);
    if (value) headers.set(name, value);
  }

  if (!headers.has("accept")) headers.set("accept", "application/json");
  if (includeContentType) {
    const contentType = c.req.header("content-type") ?? "application/json";
    headers.set("content-type", contentType);
  }
  return headers;
}

async function proxyRequest(c: Context, input: string, init: RequestInit) {
  try {
    const upstream = await fetch(input, init);
    const text = await upstream.text();
    for (const [name, value] of upstream.headers.entries()) {
      if (hopByHopHeaders.has(name.toLowerCase())) continue;
      c.header(name, value);
    }
    c.status(upstream.status as any);
    return c.body(text);
  } catch {
    return c.json({ error: "Upstream analytics service unavailable" }, 502);
  }
}

apiRoute.get("/demo/analytics/datasets", (c) => {
  const demoUnavailable = ensureDemoMode(c);
  if (demoUnavailable) return demoUnavailable;
  const unauthorized = ensureSignedIn(c);
  if (unauthorized) return unauthorized;
  return c.json({ datasets: listDemoAnalyticsDatasets() });
});

apiRoute.post("/demo/analytics/query", async (c) => {
  const demoUnavailable = ensureDemoMode(c);
  if (demoUnavailable) return demoUnavailable;
  const unauthorized = ensureSignedIn(c);
  if (unauthorized) return unauthorized;

  let payload: AnalyticsQueryRequest;
  try {
    payload = (await c.req.json()) as AnalyticsQueryRequest;
  } catch {
    return c.json({ error: "Invalid JSON payload" }, 400);
  }

  if (!payload || typeof payload.dataset !== "string" || !payload.dataset.trim()) {
    return c.json({ error: "dataset is required" }, 400);
  }

  const result = queryDemoAnalyticsDataset(payload);
  if (!result) return c.json({ error: "Dataset not found" }, 404);
  return c.json(result);
});

apiRoute.get("/analytics/datasets", (c) => {
  const unauthorized = ensureSignedIn(c);
  if (unauthorized) return unauthorized;

  if (runtimeConfig.analyticsProxy) {
    return proxyRequest(c, runtimeConfig.analyticsProxy.datasetsUrl, {
      method: "GET",
      headers: buildUpstreamHeaders(c),
    });
  }

  return c.json({ datasets: listAnalyticsDatasets() });
});

apiRoute.post("/analytics/query", async (c) => {
  const unauthorized = ensureSignedIn(c);
  if (unauthorized) return unauthorized;

  if (runtimeConfig.analyticsProxy) {
    const body = await c.req.text();
    return proxyRequest(c, runtimeConfig.analyticsProxy.queryUrl, {
      method: "POST",
      headers: buildUpstreamHeaders(c, true),
      body,
    });
  }

  let payload: AnalyticsQueryRequest;
  try {
    payload = (await c.req.json()) as AnalyticsQueryRequest;
  } catch {
    return c.json({ error: "Invalid JSON payload" }, 400);
  }

  if (!payload || typeof payload.dataset !== "string" || !payload.dataset.trim()) {
    return c.json({ error: "dataset is required" }, 400);
  }

  const allowedOps = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "between", "in"]);
  for (const filter of payload.filters ?? []) {
    if (!filter || typeof filter.field !== "string" || !allowedOps.has(filter.op)) {
      return c.json({ error: "Invalid filter payload" }, 400);
    }
  }
  for (const sort of payload.sort ?? []) {
    if (!sort || typeof sort.field !== "string" || (sort.dir !== "asc" && sort.dir !== "desc")) {
      return c.json({ error: "Invalid sort payload" }, 400);
    }
  }

  const result = queryAnalyticsDataset(payload);
  if (!result) return c.json({ error: "Dataset not found" }, 404);
  return c.json(result);
});
