import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

// noble ed25519 needs sha512 sync hasher in some environments
ed.etc.sha512Sync = (...m: Uint8Array[]) => sha512(ed.etc.concatBytes(...m));

export interface KeyPairRecord {
  kid: string;
  publicKeyHex: string;
  privateKeyHex: string;
  status: "active" | "rotated" | "revoked";
  createdAt: string;
}

function sortedCanonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedCanonical);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      if (key === "signature") continue;
      out[key] = sortedCanonical(obj[key]);
    }
    return out;
  }
  return value;
}

export function canonicalSerialize(payload: unknown): string {
  return JSON.stringify(sortedCanonical(payload));
}

export function hashPayload(payload: unknown): Uint8Array {
  return sha256(new TextEncoder().encode(canonicalSerialize(payload)));
}

export function generateKeyPair(kid: string): KeyPairRecord {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = ed.getPublicKey(privateKey);
  return {
    kid,
    privateKeyHex: bytesToHex(privateKey),
    publicKeyHex: bytesToHex(publicKey),
    status: "active",
    createdAt: new Date().toISOString(),
  };
}

export function signPayload(payload: unknown, privateKeyHex: string): string {
  const digest = hashPayload(payload);
  const sig = ed.sign(digest, hexToBytes(privateKeyHex));
  return bytesToHex(sig);
}

export function verifyPayload(
  payload: unknown,
  signatureHex: string,
  publicKeyHex: string
): boolean {
  try {
    const digest = hashPayload(payload);
    return ed.verify(hexToBytes(signatureHex), digest, hexToBytes(publicKeyHex));
  } catch {
    return false;
  }
}

export class InMemoryKeyStore {
  private keys = new Map<string, KeyPairRecord>();
  private activeKid: string | null = null;

  put(record: KeyPairRecord): void {
    this.keys.set(record.kid, record);
    if (record.status === "active") this.activeKid = record.kid;
  }

  getActive(): KeyPairRecord {
    if (!this.activeKid) throw new Error("No active signing key");
    const key = this.keys.get(this.activeKid);
    if (!key || key.status !== "active") throw new Error("Active key unavailable");
    return key;
  }

  getPublic(kid: string): string | undefined {
    return this.keys.get(kid)?.publicKeyHex;
  }

  rotate(newKid: string): KeyPairRecord {
    if (this.activeKid) {
      const old = this.keys.get(this.activeKid);
      if (old) this.keys.set(old.kid, { ...old, status: "rotated" });
    }
    const next = generateKeyPair(newKid);
    this.put(next);
    return next;
  }

  revoke(kid: string): void {
    const key = this.keys.get(kid);
    if (key) this.keys.set(kid, { ...key, status: "revoked" });
  }
}
