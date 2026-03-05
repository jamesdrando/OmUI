import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { runtimeConfig } from "./config/runtime";
import { listDemoDatasetOptions } from "./demo/analytics-demo";
import { getAuthState, listSignInUsers, signInByUserId, signOut } from "./db/repository";
import { ensureDemoDatabaseSeeded } from "./db/seed";
import { requestContextMiddleware } from "./middleware/requestContext";
import { makePageSpec } from "./adapters/nav";
import { apiRoute } from "./routes/api";
import { dashboardRoute } from "./routes/dashboard";
import type { RequestContext } from "./types/context";
import { AnalyticsExamplesPage } from "./ui/pages/AnalyticsExamplesPage";
import { SignInPage } from "./ui/pages/SignInPage";

declare module "hono" {
  interface ContextVariableMap {
    requestContext: RequestContext;
  }
}

export const app = new Hono();

if (runtimeConfig.demoMode) {
  ensureDemoDatabaseSeeded();
}

app.use("*", requestContextMiddleware);

app.get("/", (c) => {
  if (!runtimeConfig.demoMode) {
    return c.redirect("/dashboard/overview");
  }
  const auth = getAuthState();
  const users = listSignInUsers();
  return c.html(<SignInPage auth={auth} users={users} />);
});

app.post("/signin", async (c) => {
  if (!runtimeConfig.demoMode) return c.notFound();
  const body = await c.req.parseBody();
  const value = body.userId;
  const userId = typeof value === "string" ? value : Array.isArray(value) ? String(value[0] ?? "") : "";
  const providerValue = body.provider;
  const provider = typeof providerValue === "string" ? providerValue : "bi";
  const tenantValue = body.tenantId;
  const tenantId = typeof tenantValue === "string" && tenantValue.trim() ? tenantValue.trim() : "tenant-demo";

  const ok = signInByUserId(userId, provider, tenantId);
  if (!ok) {
    return c.redirect("/");
  }

  return c.redirect("/dashboard/overview");
});

app.post("/logout", (c) => {
  if (!runtimeConfig.demoMode) return c.notFound();
  signOut();
  return c.redirect("/");
});

app.route("/dashboard", dashboardRoute);
app.route("/api", apiRoute);

app.get("/dashboard/analytics/examples", (c) => {
  if (!runtimeConfig.demoMode) return c.notFound();
  const ctx = c.get("requestContext");
  if (!ctx.signedIn) return c.redirect("/");
  const options = listDemoDatasetOptions();
  return c.html(
    <AnalyticsExamplesPage
      page={makePageSpec("analytics", ctx)}
      datasetOptions={options}
      defaultDataset={options[0]?.key ?? "monthly_revenue"}
    />,
  );
});

app.use("/css/*", serveStatic({ root: "./" }));
app.use("/public/*", serveStatic({ root: "./" }));
app.use("/legacy/*", serveStatic({ root: "./" }));

app.get("/health", (c) => c.json({ ok: true, demoMode: runtimeConfig.demoMode }));
