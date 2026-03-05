import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { getAuthState, listSignInUsers, signInByUserId, signOut } from "./db/repository";
import { ensureDemoDatabaseSeeded } from "./db/seed";
import { requestContextMiddleware } from "./middleware/requestContext";
import { apiRoute } from "./routes/api";
import { dashboardRoute } from "./routes/dashboard";
import type { RequestContext } from "./types/context";
import { SignInPage } from "./ui/pages/SignInPage";

declare module "hono" {
  interface ContextVariableMap {
    requestContext: RequestContext;
  }
}

export const app = new Hono();

ensureDemoDatabaseSeeded();

app.use("*", requestContextMiddleware);

app.get("/", (c) => {
  const auth = getAuthState();
  const users = listSignInUsers();
  return c.html(<SignInPage auth={auth} users={users} />);
});

app.post("/signin", async (c) => {
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
  signOut();
  return c.redirect("/");
});

app.route("/dashboard", dashboardRoute);
app.route("/api", apiRoute);

app.use("/css/*", serveStatic({ root: "./" }));
app.use("/js/*", serveStatic({ root: "./" }));
app.use("/public/*", serveStatic({ root: "./" }));
app.use("/examples/*", serveStatic({ root: "./" }));

app.get("/health", (c) => c.json({ ok: true }));
