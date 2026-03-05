import { serve } from "bun";
import { app } from "./app";

const port = Number(process.env.PORT ?? 8000);

serve({
  fetch: app.fetch,
  port,
});

console.log(`OmUI server listening on http://localhost:${port}`);
