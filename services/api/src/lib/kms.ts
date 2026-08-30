import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { resolveAwsKmsOps } from "./aws-kms.js";

const PREFIX = "otv-kms-v1";
const DEK_FILE = ".otv-kms-dek";

let dek: Buffer | null = null;
let providerName: "none" | "local" | "aws" = "none";

function localMasterKey(): Buffer | null {
  const hex = process.env.OTV_KMS_MASTER_KEY;
  if (!hex) return null;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("OTV_KMS_MASTER_KEY must be 32 bytes as 64 hex characters");
  }
  return Buffer.from(hex, "hex");
}

function chosenProvider(): "none" | "local" | "aws" {
  const raw = (process.env.OTV_KMS_PROVIDER ?? "").toLowerCase();
  if (raw === "aws" || process.env.AWS_KMS_KEY_ID) return "aws";
  if (raw === "local" || process.env.OTV_KMS_MASTER_KEY) return "local";
  return "none";
}

export function kmsConfigured(): boolean {
  return chosenProvider() !== "none";
}

export function kmsProvider(): "none" | "local" | "aws" {
  return providerName;
}

export async function initKms(keysDir: string): Promise<void> {
  providerName = chosenProvider();
  if (providerName === "none") {
    dek = null;
    return;
  }
  if (providerName === "local") {
    dek = localMasterKey();
    return;
  }
  mkdirSync(keysDir, { recursive: true });
  const ops = await resolveAwsKmsOps();
  const dekPath = path.join(keysDir, DEK_FILE);
  if (existsSync(dekPath)) {
    dek = await ops.decrypt(readFileSync(dekPath));
    return;
  }
  const generated = await ops.generateDataKey();
  writeFileSync(dekPath, generated.ciphertext, { encoding: undefined, mode: 0o600 });
  dek = generated.plaintext;
}

function activeKey(): Buffer | null {
  return dek ?? localMasterKey();
}

/** AES-256-GCM envelope wrap. Root key is local master or an AWS-generated DEK. */
export function wrapPrivateKey(plaintextHex: string): string {
  const key = activeKey();
  if (!key) return plaintextHex;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintextHex, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}:${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function unwrapPrivateKey(stored: string): string {
  if (!stored.startsWith(`${PREFIX}:`)) return stored;
  const key = activeKey();
  if (!key) {
    throw new Error("Encrypted signing key present but no KMS key is loaded");
  }
  const [, ivHex, tagHex, dataHex] = stored.split(":");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex!, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex!, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex!, "hex")), decipher.final()]).toString(
    "utf8"
  );
}
