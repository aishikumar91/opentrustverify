/**
 * WebAuthn (passkey) relying-party config for Open Trust Admin.
 * Origin-bound; never stores private keys — only credential id + public key.
 */

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** RP ID = registrable domain (no scheme/path). */
export function getWebAuthnRpId(): string {
  const fromEnv = (process.env.WEBAUTHN_RP_ID || "").trim();
  if (fromEnv) return fromEnv;

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (site) {
    try {
      return new URL(site).hostname;
    } catch {
      /* fall through */
    }
  }

  if (process.env.NODE_ENV !== "production") return "localhost";
  return "otv.poptrust.me";
}

/**
 * Expected browser Origin(s). Path (e.g. /trigger) is not part of Origin.
 * Includes localhost variants for local Next dev.
 */
export function getWebAuthnOrigins(): string[] {
  const fromEnv = (process.env.WEBAUTHN_ORIGIN || "").trim();
  const origins = new Set<string>();

  if (fromEnv) {
    for (const part of fromEnv.split(",")) {
      const o = stripTrailingSlash(part.trim());
      if (o) origins.add(o);
    }
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (site) {
    try {
      origins.add(stripTrailingSlash(new URL(site).origin));
    } catch {
      /* ignore */
    }
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
    origins.add("http://localhost:4091");
    origins.add("http://127.0.0.1:4091");
  }

  if (origins.size === 0) {
    origins.add("https://otv.poptrust.me");
  }

  return [...origins];
}

export function getWebAuthnRpName(): string {
  return (process.env.WEBAUTHN_RP_NAME || "3GGA Admin").trim() || "3GGA Admin";
}

export const WEBAUTHN_CHALLENGE_TTL_MS = 1000 * 60 * 5; // 5 minutes

export function publicKeyToBase64Url(publicKey: Uint8Array): string {
  return Buffer.from(publicKey).toString("base64url");
}

export function publicKeyFromBase64Url(encoded: string): Uint8Array {
  return new Uint8Array(Buffer.from(encoded, "base64url"));
}
