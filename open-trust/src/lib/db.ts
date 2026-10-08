/**
 * db.ts
 *
 * Postgres pool for Open Trust admin. Used by auth to look up admin_users.
 */

import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  pool = new Pool({ connectionString });
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return getPool().query<T>(text, params);
}

export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  role: string;
}

export async function findAdminByUsername(username: string): Promise<AdminUser | null> {
  const result = await query<AdminUser>(
    `SELECT id, username, password_hash, role
     FROM admin_users
     WHERE username = $1
     LIMIT 1`,
    [username]
  );
  return result.rows[0] ?? null;
}
