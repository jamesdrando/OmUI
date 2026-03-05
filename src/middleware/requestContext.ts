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
};

export const requestContextMiddleware: MiddlewareHandler = async (c, next) => {
  const auth = getAuthState();
  const roleHeader = c.req.header("x-user-role");
  const role = roleHeader === "admin" ? "admin" : auth.role;

  const context: RequestContext = {
    provider: c.req.header("x-provider") ?? auth.provider ?? DEFAULT_CONTEXT.provider,
    tenantId: c.req.header("x-tenant-id") ?? auth.tenantId ?? DEFAULT_CONTEXT.tenantId,
    userId: c.req.header("x-user-id") ?? auth.userId ?? DEFAULT_CONTEXT.userId,
    role,
    signedIn: auth.signedIn || Boolean(c.req.header("x-user-id")),
    userName: auth.userName ?? DEFAULT_CONTEXT.userName,
  };

  c.set("requestContext", context);
  await next();
};
