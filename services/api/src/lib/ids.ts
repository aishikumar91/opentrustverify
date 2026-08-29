import { createHash, randomBytes } from "node:crypto";

export function hexId(prefix: string, bytes = 6): string {
  return `${prefix}_${randomBytes(bytes).toString("hex")}`;
}

export function hashSha256(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
