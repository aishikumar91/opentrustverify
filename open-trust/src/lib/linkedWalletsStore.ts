/**
 * Persist admin-linked real wallets (MetaMask / WalletConnect / Passkey-associated).
 * These addresses feed the allowlist so triggers can target wallets the admin controls.
 * No private keys or seed phrases are stored.
 */

import { getAddress, isAddress } from "viem";
import { query } from "./db";

export type LinkedWalletSource = "injected" | "walletconnect" | "passkey" | "manual";

export type LinkedWalletRow = {
  id: number;
  admin_username: string;
  address: string;
  source: LinkedWalletSource;
  label: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
};

let schemaReady: Promise<void> | null = null;

export async function ensureLinkedWalletsSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS admin_linked_wallets (
          id SERIAL PRIMARY KEY,
          admin_username TEXT NOT NULL,
          address TEXT NOT NULL,
          source TEXT NOT NULL,
          label TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_used_at TIMESTAMPTZ,
          UNIQUE (admin_username, address)
        );
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS admin_linked_wallets_username_idx
          ON admin_linked_wallets (admin_username);
      `);
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}

export function normalizeEvmAddress(raw: string): string {
  const trimmed = raw.trim();
  if (!isAddress(trimmed)) {
    throw new Error("Provide a valid EVM address (0x…).");
  }
  return getAddress(trimmed);
}

export async function listLinkedWallets(adminUsername: string): Promise<LinkedWalletRow[]> {
  await ensureLinkedWalletsSchema();
  const result = await query<LinkedWalletRow>(
    `SELECT id, admin_username, address, source, label, created_at, updated_at, last_used_at
     FROM admin_linked_wallets
     WHERE admin_username = $1
     ORDER BY updated_at DESC, id DESC`,
    [adminUsername]
  );
  return result.rows;
}

/** All linked addresses across admins (lowercase) — used for allowlist merge. */
export async function listAllLinkedAddresses(): Promise<string[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    await ensureLinkedWalletsSchema();
    const result = await query<{ address: string }>(
      `SELECT DISTINCT lower(address) AS address FROM admin_linked_wallets`
    );
    return result.rows.map((r) => r.address);
  } catch {
    return [];
  }
}

export async function upsertLinkedWallet(input: {
  adminUsername: string;
  address: string;
  source: LinkedWalletSource;
  label?: string | null;
}): Promise<LinkedWalletRow> {
  await ensureLinkedWalletsSchema();
  const address = normalizeEvmAddress(input.address);
  const result = await query<LinkedWalletRow>(
    `INSERT INTO admin_linked_wallets (admin_username, address, source, label, last_used_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (admin_username, address) DO UPDATE
     SET source = EXCLUDED.source,
         label = COALESCE(EXCLUDED.label, admin_linked_wallets.label),
         updated_at = NOW(),
         last_used_at = NOW()
     RETURNING id, admin_username, address, source, label, created_at, updated_at, last_used_at`,
    [input.adminUsername, address, input.source, input.label ?? null]
  );
  return result.rows[0];
}

export async function removeLinkedWallet(adminUsername: string, address: string): Promise<boolean> {
  await ensureLinkedWalletsSchema();
  const normalized = normalizeEvmAddress(address);
  const result = await query(
    `DELETE FROM admin_linked_wallets
     WHERE admin_username = $1 AND lower(address) = lower($2)`,
    [adminUsername, normalized]
  );
  return (result.rowCount ?? 0) > 0;
}

export function toLinkedWalletPublic(row: LinkedWalletRow) {
  return {
    id: row.id,
    address: row.address,
    source: row.source,
    label: row.label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at,
  };
}
