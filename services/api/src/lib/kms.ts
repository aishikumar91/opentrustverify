import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIX = "otv-kms-v1";

function masterKey(): Buffer | null {
  const hex = process.env.OTV_KMS_MASTER_KEY;
  if (!hex) return null;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("OTV_KMS_MASTER_KEY must be 32 bytes as 64 hex characters");
  }
  return Buffer.from(hex, "hex");
}

export function kmsConfigured(): boolean {
  return Boolean(process.env.OTV_KMS_MASTER_KEY);
}

/** AES-256-GCM envelope wrap. Production should swap this for a cloud KMS. */
export function wrapPrivateKey(plaintextHex: string): string {
  const key = masterKey();
  if (!key) return plaintextHex;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintextHex, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}:${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function unwrapPrivateKey(stored: string): string {
  if (!stored.startsWith(`${PREFIX}:`)) return stored;
  const key = masterKey();
  if (!key) {
    throw new Error("Encrypted signing key present but OTV_KMS_MASTER_KEY is not set");
  }
  const [, ivHex, tagHex, dataHex] = stored.split(":");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex!, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex!, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex!, "hex")), decipher.final()]).toString(
    "utf8"
  );
}
