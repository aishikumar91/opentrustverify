/**
 * Staff users (email + OTP) + SMTP settings, backed by Postgres admin_settings
 * and dedicated tables. No passwords are stored for staff — only bcrypt OTP
 * hashes with short expiry, single-use, attempt-limited.
 */

import bcrypt from "bcryptjs";
import { query } from "./db";

export type StaffRow = {
  id: number;
  email: string;
  name: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
};

let schemaReady: Promise<void> | null = null;

export async function ensureStaffSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS staff_users (
          id SERIAL PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          name TEXT,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_by TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS staff_otps (
          id SERIAL PRIMARY KEY,
          staff_id INTEGER NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
          code_hash TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          consumed_at TIMESTAMPTZ,
          attempts INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS staff_otps_staff_idx ON staff_otps (staff_id, expires_at DESC);
      `);
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}

export function normalizeStaffEmail(raw: unknown): string {
  if (typeof raw !== "string") throw new Error("Provide a valid email address.");
  const email = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Provide a valid email address.");
  return email;
}

export async function listStaff(): Promise<StaffRow[]> {
  await ensureStaffSchema();
  const result = await query<StaffRow>(
    `SELECT id, email, name, active, created_by, created_at FROM staff_users ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function addStaff(email: string, name: string | null, createdBy: string): Promise<StaffRow> {
  await ensureStaffSchema();
  const result = await query<StaffRow>(
    `INSERT INTO staff_users (email, name, active, created_by)
     VALUES ($1, $2, TRUE, $3)
     ON CONFLICT (email) DO UPDATE SET name = COALESCE(EXCLUDED.name, staff_users.name), active = TRUE
     RETURNING id, email, name, active, created_by, created_at`,
    [normalizeStaffEmail(email), name?.trim() || null, createdBy]
  );
  return result.rows[0];
}

export async function setStaffActive(id: number, active: boolean): Promise<boolean> {
  await ensureStaffSchema();
  const result = await query(`UPDATE staff_users SET active = $2 WHERE id = $1`, [id, active]);
  return (result.rowCount ?? 0) > 0;
}

export async function findActiveStaffByEmail(email: string): Promise<StaffRow | null> {
  await ensureStaffSchema();
  const result = await query<StaffRow>(
    `SELECT id, email, name, active, created_by, created_at FROM staff_users WHERE email = $1 AND active = TRUE LIMIT 1`,
    [normalizeStaffEmail(email)]
  );
  return result.rows[0] ?? null;
}

const OTP_TTL_MS = 1000 * 60 * 10; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;

export async function issueStaffOtp(staffId: number): Promise<{ code: string; expiresAt: Date }> {
  await ensureStaffSchema();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await query(`UPDATE staff_otps SET consumed_at = NOW() WHERE staff_id = $1 AND consumed_at IS NULL`, [staffId]);
  await query(`INSERT INTO staff_otps (staff_id, code_hash, expires_at) VALUES ($1, $2, $3)`, [
    staffId,
    codeHash,
    expiresAt.toISOString(),
  ]);
  return { code, expiresAt };
}

export async function verifyStaffOtp(staffId: number, code: string): Promise<boolean> {
  await ensureStaffSchema();
  const result = await query<{ id: number; code_hash: string; attempts: number }>(
    `SELECT id, code_hash, attempts FROM staff_otps
     WHERE staff_id = $1 AND consumed_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [staffId]
  );
  const row = result.rows[0];
  if (!row) return false;
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await query(`UPDATE staff_otps SET consumed_at = NOW() WHERE id = $1`, [row.id]);
    return false;
  }
  const ok = await bcrypt.compare(String(code).trim(), row.code_hash);
  await query(`UPDATE staff_otps SET attempts = attempts + 1${ok ? ", consumed_at = NOW()" : ""} WHERE id = $1`, [row.id]);
  return ok;
}

export type SmtpSettings = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

const SMTP_KEYS = ["smtp_host", "smtp_port", "smtp_secure", "smtp_user", "smtp_pass", "smtp_from"] as const;

export async function getSmtpSettings(): Promise<SmtpSettings> {
  await ensureStaffSchema();
  const result = await query<{ key: string; value: string }>(
    `SELECT key, value FROM admin_settings WHERE key = ANY($1)`,
    [Array.from(SMTP_KEYS)]
  );
  const map = new Map(result.rows.map((r) => [r.key, r.value]));
  const ENV_FOR: Record<string, string> = {
    smtp_host: "SMTP_HOST",
    smtp_port: "SMTP_PORT",
    smtp_secure: "SMTP_SECURE",
    smtp_user: "SMTP_USER",
    smtp_pass: "SMTP_PASS",
    smtp_from: "SMTP_FROM",
  };
  const env = (k: string) => (process.env[k] ?? "").trim();
  // Empty DB values must fall through to env (so compose SMTP_* still works).
  const pick = (k: string, fb: string) => {
    const db = (map.get(k) ?? "").trim();
    if (db) return db;
    return env(ENV_FOR[k] ?? "") || fb;
  };
  const portRaw = pick("smtp_port", "587");
  let from = pick("smtp_from", "");
  if (from.startsWith("(") && from.endsWith(")")) from = from.slice(1, -1).trim();
  return {
    host: pick("smtp_host", ""),
    port: Number(portRaw) || 587,
    secure: pick("smtp_secure", "false").toLowerCase() === "true",
    user: pick("smtp_user", ""),
    pass: pick("smtp_pass", ""),
    from,
  };
}

export async function saveSmtpSettings(input: Partial<SmtpSettings>): Promise<SmtpSettings> {
  await ensureStaffSchema();
  const entries: [string, string][] = [];
  if (input.host !== undefined) entries.push(["smtp_host", String(input.host).trim()]);
  if (input.port !== undefined) entries.push(["smtp_port", String(Number(input.port) || 587)]);
  if (input.secure !== undefined) entries.push(["smtp_secure", input.secure ? "true" : "false"]);
  if (input.user !== undefined) entries.push(["smtp_user", String(input.user).trim()]);
  if (input.pass !== undefined) entries.push(["smtp_pass", String(input.pass)]);
  if (input.from !== undefined) entries.push(["smtp_from", String(input.from).trim()]);
  for (const [key, value] of entries) {
    await query(
      `INSERT INTO admin_settings (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, value]
    );
  }
  return getSmtpSettings();
}
