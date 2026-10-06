/**
 * Postgres persistence for admin passkeys (WebAuthn credentials).
 * Stores credential id + public key + optional linked EVM address.
 * Never stores private keys or authenticator secrets.
 */

import { getAddress, isAddress } from "viem";
import { query } from "./db";
import { WEBAUTHN_CHALLENGE_TTL_MS } from "./webauthn";

export type PasskeyPurpose = "registration" | "authentication";

export type StoredPasskey = {
  id: number;
  admin_username: string;
  credential_id: string;
  public_key: string;
  counter: string | number;
  transports: string[] | null;
  device_name: string | null;
  linked_address: string | null;
  credential_device_type: string | null;
  backed_up: boolean;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
};

export type PasskeyPublic = {
  id: number;
  credentialId: string;
  deviceName: string | null;
  linkedAddress: string | null;
  transports: string[];
  createdAt: string;
  lastUsedAt: string | null;
  backedUp: boolean;
};

export function toPasskeyPublic(row: StoredPasskey): PasskeyPublic {
  return {
    id: row.id,
    credentialId: row.credential_id,
    deviceName: row.device_name,
    linkedAddress: row.linked_address,
    transports: Array.isArray(row.transports) ? row.transports : [],
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    backedUp: Boolean(row.backed_up),
  };
}

/** Normalize optional EVM address for association. Empty → null. */
export function normalizeLinkedAddress(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string") {
    throw new Error("linkedAddress must be a string.");
  }
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!isAddress(trimmed)) {
    throw new Error("linkedAddress must be a valid EVM address.");
  }
  return getAddress(trimmed);
}

export async function ensurePasskeyTables(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_passkeys (
      id SERIAL PRIMARY KEY,
      admin_username TEXT NOT NULL,
      credential_id TEXT NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      counter BIGINT NOT NULL DEFAULT 0,
      transports TEXT[] NOT NULL DEFAULT '{}',
      device_name TEXT,
      linked_address TEXT,
      credential_device_type TEXT,
      backed_up BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ
    );
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS admin_passkeys_username_idx
      ON admin_passkeys (admin_username);
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS admin_webauthn_challenges (
      id SERIAL PRIMARY KEY,
      admin_username TEXT NOT NULL,
      challenge TEXT NOT NULL,
      purpose TEXT NOT NULL CHECK (purpose IN ('registration', 'authentication')),
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS admin_webauthn_challenges_lookup_idx
      ON admin_webauthn_challenges (admin_username, purpose, expires_at DESC);
  `);
}

export async function listPasskeysForAdmin(username: string): Promise<StoredPasskey[]> {
  await ensurePasskeyTables();
  const result = await query<StoredPasskey>(
    `SELECT id, admin_username, credential_id, public_key, counter, transports,
            device_name, linked_address, credential_device_type, backed_up,
            created_at::text, updated_at::text, last_used_at::text
     FROM admin_passkeys
     WHERE admin_username = $1
     ORDER BY created_at DESC`,
    [username]
  );
  return result.rows;
}

export async function findPasskeyByCredentialId(
  credentialId: string
): Promise<StoredPasskey | null> {
  await ensurePasskeyTables();
  const result = await query<StoredPasskey>(
    `SELECT id, admin_username, credential_id, public_key, counter, transports,
            device_name, linked_address, credential_device_type, backed_up,
            created_at::text, updated_at::text, last_used_at::text
     FROM admin_passkeys
     WHERE credential_id = $1
     LIMIT 1`,
    [credentialId]
  );
  return result.rows[0] ?? null;
}

export async function insertPasskey(input: {
  username: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports: string[];
  deviceName?: string | null;
  linkedAddress?: string | null;
  credentialDeviceType?: string | null;
  backedUp?: boolean;
}): Promise<StoredPasskey> {
  await ensurePasskeyTables();
  const result = await query<StoredPasskey>(
    `INSERT INTO admin_passkeys (
       admin_username, credential_id, public_key, counter, transports,
       device_name, linked_address, credential_device_type, backed_up
     ) VALUES ($1, $2, $3, $4, $5::text[], $6, $7, $8, $9)
     RETURNING id, admin_username, credential_id, public_key, counter, transports,
               device_name, linked_address, credential_device_type, backed_up,
               created_at::text, updated_at::text, last_used_at::text`,
    [
      input.username,
      input.credentialId,
      input.publicKey,
      input.counter,
      input.transports,
      input.deviceName ?? null,
      input.linkedAddress ?? null,
      input.credentialDeviceType ?? null,
      Boolean(input.backedUp),
    ]
  );
  return result.rows[0];
}

export async function updatePasskeyCounter(
  credentialId: string,
  newCounter: number
): Promise<void> {
  await query(
    `UPDATE admin_passkeys
     SET counter = $2, last_used_at = NOW(), updated_at = NOW()
     WHERE credential_id = $1`,
    [credentialId, newCounter]
  );
}

export async function setPasskeyLinkedAddress(
  id: number,
  username: string,
  linkedAddress: string | null
): Promise<StoredPasskey | null> {
  await ensurePasskeyTables();
  const result = await query<StoredPasskey>(
    `UPDATE admin_passkeys
     SET linked_address = $3, updated_at = NOW()
     WHERE id = $1 AND admin_username = $2
     RETURNING id, admin_username, credential_id, public_key, counter, transports,
               device_name, linked_address, credential_device_type, backed_up,
               created_at::text, updated_at::text, last_used_at::text`,
    [id, username, linkedAddress]
  );
  return result.rows[0] ?? null;
}

export async function deletePasskey(id: number, username: string): Promise<boolean> {
  await ensurePasskeyTables();
  const result = await query(
    `DELETE FROM admin_passkeys WHERE id = $1 AND admin_username = $2`,
    [id, username]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function storeChallenge(
  username: string,
  challenge: string,
  purpose: PasskeyPurpose
): Promise<void> {
  await ensurePasskeyTables();
  // Drop expired + prior challenges for this user/purpose (single in-flight nonce).
  await query(
    `DELETE FROM admin_webauthn_challenges
     WHERE admin_username = $1 AND (purpose = $2 OR expires_at < NOW())`,
    [username, purpose]
  );
  const expires = new Date(Date.now() + WEBAUTHN_CHALLENGE_TTL_MS);
  await query(
    `INSERT INTO admin_webauthn_challenges (admin_username, challenge, purpose, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [username, challenge, purpose, expires.toISOString()]
  );
}

export async function consumeChallenge(
  username: string,
  purpose: PasskeyPurpose
): Promise<string | null> {
  await ensurePasskeyTables();
  const result = await query<{ id: number; challenge: string }>(
    `SELECT id, challenge FROM admin_webauthn_challenges
     WHERE admin_username = $1 AND purpose = $2 AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [username, purpose]
  );
  const row = result.rows[0];
  if (!row) return null;
  await query(`DELETE FROM admin_webauthn_challenges WHERE id = $1`, [row.id]);
  return row.challenge;
}
