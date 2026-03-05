import { getDbPath } from "../src/db/client";
import { seedDemoDatabase } from "../src/db/seed";

const reset = Bun.argv.includes("--reset");

seedDemoDatabase({ reset });

console.log(`Seeded demo database at: ${getDbPath()}`);
