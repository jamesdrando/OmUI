import { runtimeConfig } from "../config/runtime";
import type { MiddlewareHandler } from "hono";
import { getAuthState } from "../db/repository";
import type { RequestContext } from "../types/context";

const DEFAULT_CONTEXT: RequestContext = {
  provider: "bi",
  tenantId: "tenant-demo",
  userId: "guest",
  role: "member",
  signedIn: false,
  userName: "Guest",
  demoMode: runtimeConfig.demoMode,
};

export const requestContextMiddleware: MiddlewareHandler = async (c, next) => {
  let context: RequestContext;

  if (runtimeConfig.demoMode) {
    const auth = getAuthState();
    const roleHeader = c.req.header("x-user-role");
    const role = roleHeader === "admin" ? "admin" : auth.role;

    context = {
      provider: c.req.header("x-provider") ?? auth.provider ?? DEFAULT_CONTEXT.provider,
      tenantId: c.req.header("x-tenant-id") ?? auth.tenantId ?? DEFAULT_CONTEXT.tenantId,
      userId: c.req.header("x-user-id") ?? auth.userId ?? DEFAULT_CONTEXT.userId,
      role,
      signedIn: auth.signedIn || Boolean(c.req.header("x-user-id")),
      userName: auth.userName ?? DEFAULT_CONTEXT.userName,
      demoMode: runtimeConfig.demoMode,
    };
  } else {
    const headerUserId = c.req.header("x-user-id")?.trim() ?? "";
    const authenticatedHeader = c.req.header("x-authenticated")?.trim().toLowerCase();
    const signedInByHeader =
      authenticatedHeader === "1" || authenticatedHeader === "true" || authenticatedHeader === "yes";
    const signedIn = Boolean(headerUserId) || signedInByHeader;
    const role = c.req.header("x-user-role") === "admin" ? "admin" : "member";
    const fallbackUser = signedIn ? headerUserId || "external-user" : DEFAULT_CONTEXT.userName;

    context = {
      provider: c.req.header("x-provider") ?? "external",
      tenantId: c.req.header("x-tenant-id") ?? "tenant-external",
      userId: headerUserId || "guest",
      role,
      signedIn,
      userName: c.req.header("x-user-name") ?? fallbackUser,
      demoMode: runtimeConfig.demoMode,
    };
  }

  c.set("requestContext", context);
  await next();
};
