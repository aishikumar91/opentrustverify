/**
 * Ensures the admin_users table exists and seeds the default admin.
 * Usage: DATABASE_URL=... node scripts/seed-admin.mjs
 */
import pg from "pg";
import bcrypt from "bcryptjs";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://open_trust:open_trust@127.0.0.1:5432/open_trust";
const username = process.env.DEFAULT_ADMIN_USERNAME ?? "admin";
const password =
  process.env.DEFAULT_ADMIN_PASSWORD ??
  process.env.DEMO_PASSWORD ??
  "otv-demo-change-me";

const pool = new pg.Pool({ connectionString });

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS executed_runs (
      id SERIAL PRIMARY KEY,
      tx_hash TEXT NOT NULL UNIQUE,
      vector TEXT NOT NULL,
      target_address TEXT NOT NULL,
      explorer_url TEXT,
      status TEXT,
      threat_score INTEGER,
      real_balance_impact TEXT,
      reasons JSONB,
      action_recommended TEXT,
      broadcast_at TIMESTAMPTZ,
      verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS executed_runs_broadcast_at_idx
      ON executed_runs (broadcast_at DESC NULLS LAST, created_at DESC);
  `);

  const passwordHash = bcrypt.hashSync(password, 10);
  await pool.query(
    `INSERT INTO admin_users (username, password_hash, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT (username) DO UPDATE
     SET password_hash = EXCLUDED.password_hash,
         updated_at = NOW()`,
    [username, passwordHash]
  );

  const { rows } = await pool.query(
    `SELECT id, username, role, created_at FROM admin_users WHERE username = $1`,
    [username]
  );
  console.log("Seeded admin user:", rows[0]);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
