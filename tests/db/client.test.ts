import { describe, it, expect, afterAll } from "vitest";
import { ping, query, queryOne, queryMany, closePool } from "../../src/db/client.js";

/**
 * Integration tests — requires a running PostgreSQL instance.
 * docker compose up -d postgres
 */
describe("db/client", () => {
  afterAll(async () => {
    await closePool();
  });

  it("ping returns true when DB is reachable", async () => {
    const ok = await ping();
    expect(ok).toBe(true);
  });

  it("query executes SELECT 1", async () => {
    const result = await query("SELECT 1 AS val");
    expect(result.rows[0]).toEqual({ val: 1 });
  });

  it("queryOne returns a single row", async () => {
    const row = await queryOne<{ val: number }>("SELECT 42 AS val");
    expect(row).toEqual({ val: 42 });
  });

  it("queryOne returns null when no rows", async () => {
    const row = await queryOne(
      "SELECT 1 WHERE false"
    );
    expect(row).toBeNull();
  });

  it("queryMany returns multiple rows", async () => {
    const rows = await queryMany<{ n: number }>(
      "SELECT generate_series(1, 3) AS n"
    );
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.n)).toEqual([1, 2, 3]);
  });

  it("sources table exists (migration ran)", async () => {
    const row = await queryOne<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'sources'
      ) AS exists`
    );
    expect(row?.exists).toBe(true);
  });
});
