/**
 * Persist admin runtime settings in Postgres (admin_settings key/value).
 * Used for WalletConnect project id so admins can set it without rebuilding.
 */

import { query } from "./db";

export const WC_PROJECT_ID_KEY = "walletconnect_project_id";

export type SettingSource = "database" | "env" | "none";

function envWalletConnectProjectId(): string {
  return (
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
    process.env.WALLETCONNECT_PROJECT_ID ||
    process.env.VITE_WALLETCONNECT_PROJECT_ID ||
    ""
  ).trim();
}

/** Normalize / validate a WalletConnect Cloud project id (do not invent one). */
export function normalizeWalletConnectProjectId(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const id = raw.trim();
  if (!id) return "";
  // WalletConnect Cloud ids are hex-like; allow common lengths without inventing.
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(id)) {
    throw new Error(
      "Invalid WalletConnect project id. Paste the Project ID from https://cloud.walletconnect.com"
    );
  }
  return id;
}

async function readSetting(key: string): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const result = await query<{ value: string }>(
      `SELECT value FROM admin_settings WHERE key = $1 LIMIT 1`,
      [key]
    );
    const value = result.rows[0]?.value;
    return typeof value === "string" ? value : null;
  } catch {
    // Table may not exist yet before seed; treat as unset.
    return null;
  }
}

export async function getWalletConnectProjectIdFromDb(): Promise<string> {
  const value = await readSetting(WC_PROJECT_ID_KEY);
  return (value ?? "").trim();
}

/**
 * Effective project id: database first, then env.
 * Clients must init WalletConnect from this runtime value (not build-time NEXT_PUBLIC_*).
 */
export async function resolveWalletConnectProjectId(): Promise<{
  projectId: string;
  source: SettingSource;
  configured: boolean;
}> {
  const fromDb = await getWalletConnectProjectIdFromDb();
  if (fromDb) {
    return { projectId: fromDb, source: "database", configured: true };
  }
  const fromEnv = envWalletConnectProjectId();
  if (fromEnv) {
    return { projectId: fromEnv, source: "env", configured: true };
  }
  return { projectId: "", source: "none", configured: false };
}

export async function setWalletConnectProjectId(raw: string): Promise<{
  projectId: string;
  source: SettingSource;
  configured: boolean;
}> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured; cannot persist admin settings.");
  }

  const projectId = normalizeWalletConnectProjectId(raw);

  await query(
    `INSERT INTO admin_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_at = NOW()`,
    [WC_PROJECT_ID_KEY, projectId]
  );

  // Empty string clears DB override → fall back to env on next resolve.
  return resolveWalletConnectProjectId();
}
