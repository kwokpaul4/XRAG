#!/usr/bin/env tsx
/**
 * Runs all SQL migration files against POSTGRES_URL in order.
 * Safe to re-run (uses IF NOT EXISTS throughout).
 */
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "migrations");

const client = new pg.Client({ connectionString: process.env.POSTGRES_URL });
await client.connect();

const files = (await readdir(migrationsDir))
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  const sql = await readFile(join(migrationsDir, file), "utf8");
  console.log(`Running ${file}…`);
  await client.query(sql);
}

await client.end();
console.log("Migrations complete.");
