import pg from "pg";
import { config } from "../config.js";

const { Pool } = pg;

let _pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: config.postgresUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    _pool.on("error", (err) => {
      console.error("Unexpected PostgreSQL pool error:", err);
    });
  }
  return _pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  values?: unknown[]
): Promise<pg.QueryResult<T>> {
  const pool = getPool();
  return pool.query<T>(sql, values);
}

export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  values?: unknown[]
): Promise<T | null> {
  const result = await query<T>(sql, values);
  return result.rows[0] ?? null;
}

export async function queryMany<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  values?: unknown[]
): Promise<T[]> {
  const result = await query<T>(sql, values);
  return result.rows;
}

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

export async function ping(): Promise<boolean> {
  try {
    await query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
