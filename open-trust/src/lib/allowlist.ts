/**
 * Admin allowlist enforcement.
 *
 * Sources (merged):
 * 1. ADMIN_ALLOWLIST env (comma-separated)
 * 2. admin_linked_wallets rows (real MetaMask / WalletConnect / Passkey-linked)
 *
 * Every broadcast path must call assertAllowlisted() before signing or recording.
 */

import { listAllLinkedAddresses } from "./linkedWalletsStore";

function parseEnvAllowlistEntries(): string[] {
  const raw = process.env.ADMIN_ALLOWLIST ?? "";
  return raw
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
}

/** Soft check for settings UI — env or DB-linked wallets. */
export function hasAllowlistEntriesSync(): boolean {
  return parseEnvAllowlistEntries().length > 0;
}

export async function hasAllowlistEntries(): Promise<boolean> {
  if (parseEnvAllowlistEntries().length > 0) return true;
  const linked = await listAllLinkedAddresses();
  return linked.length > 0;
}

export async function getAllowlist(): Promise<Set<string>> {
  const entries = new Set(parseEnvAllowlistEntries());
  const linked = await listAllLinkedAddresses();
  for (const addr of linked) {
    entries.add(addr.toLowerCase());
  }
  return entries;
}

export class NotAllowlistedError extends Error {
  constructor(address: string) {
    super(
      `Refusing to target ${address}: not allowlisted. ` +
        `Link the wallet on the admin dashboard (MetaMask / WalletConnect) or add it to ADMIN_ALLOWLIST.`
    );
    this.name = "NotAllowlistedError";
  }
}

export async function assertAllowlisted(address: string): Promise<void> {
  const normalized = address.trim().toLowerCase();
  const allowlist = await getAllowlist();
  if (allowlist.size === 0) {
    throw new Error(
      "Allowlist is empty. Connect MetaMask or WalletConnect on the admin dashboard " +
        "to link a real wallet, or set ADMIN_ALLOWLIST."
    );
  }
  if (!allowlist.has(normalized)) {
    throw new NotAllowlistedError(address);
  }
}

export async function isAllowlisted(address: string): Promise<boolean> {
  const allowlist = await getAllowlist();
  return allowlist.has(address.trim().toLowerCase());
}
