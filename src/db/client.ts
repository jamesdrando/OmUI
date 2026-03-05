import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Database } from "bun:sqlite";

const configuredPath = process.env.DEMO_DB_PATH ?? "data/demo.sqlite";
const defaultDbPath = configuredPath === ":memory:" ? configuredPath : resolve(process.cwd(), configuredPath);

let db: Database | null = null;

export function getDb() {
  if (db) return db;

  if (defaultDbPath !== ":memory:") {
    mkdirSync(dirname(defaultDbPath), { recursive: true });
  }
  db = new Database(defaultDbPath, { create: true });
  db.run("PRAGMA foreign_keys = ON;");
  db.run("PRAGMA journal_mode = WAL;");
  return db;
}

export function closeDb() {
  if (!db) return;
  db.close();
  db = null;
}
