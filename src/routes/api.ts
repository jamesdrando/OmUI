import { Hono } from "hono";
import { getDatasetPayload } from "../db/repository";

export const apiRoute = new Hono();

apiRoute.get("/datasets/:key", (c) => {
  const ctx = c.get("requestContext");
  if (!ctx.signedIn) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const key = c.req.param("key");
  const payload = getDatasetPayload(key);
  if (!payload) {
    return c.json({ error: "Dataset not found" }, 404);
  }

  return c.json(payload);
});
