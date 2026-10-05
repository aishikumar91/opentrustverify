/**
 * Admin allowlist enforcement.
 *
 * Every function in liveEngine.ts that broadcasts a transaction MUST call
 * assertAllowlisted() on its target address before signing anything.
 * This is the single chokepoint that keeps the trigger console scoped to
 * wallets the admin controls — it must never be bypassed, soft-disabled,
 * or short-circuited in test/demo flags.
 */

function parseAllowlistEntries(): string[] {
  const raw = process.env.ADMIN_ALLOWLIST ?? "";
  return raw
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
}

function loadAllowlist(): Set<string> {
  const entries = parseAllowlistEntries();

  if (entries.length === 0) {
    throw new Error(
      "ADMIN_ALLOWLIST is empty. Refusing to start the trigger engine " +
        "without at least one admin-controlled target address."
    );
  }
  return new Set(entries);
}

/** Soft check for settings UI — does not throw when empty. */
export function hasAllowlistEntries(): boolean {
  return parseAllowlistEntries().length > 0;
}

let cached: Set<string> | null = null;

export function getAllowlist(): Set<string> {
  if (!cached) cached = loadAllowlist();
  return cached;
}

export class NotAllowlistedError extends Error {
  constructor(address: string) {
    super(
      `Refusing to target ${address}: not present in ADMIN_ALLOWLIST. ` +
        `Trigger targets must be wallets the admin controls.`
    );
    this.name = "NotAllowlistedError";
  }
}

export function assertAllowlisted(address: string): void {
  const normalized = address.trim().toLowerCase();
  if (!getAllowlist().has(normalized)) {
    throw new NotAllowlistedError(address);
  }
}

export function isAllowlisted(address: string): boolean {
  return getAllowlist().has(address.trim().toLowerCase());
}
