import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FileKeyStore } from "./lib/keys.js";
import { generateKeyPair } from "@otv/crypto-signatures";
import { initKms, wrapPrivateKey, unwrapPrivateKey } from "./lib/kms.js";
import { setAwsKmsOps } from "./lib/aws-kms.js";

describe("FileKeyStore", () => {
  it("persists and reloads an active key", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "otv-keys-"));
    const a = new FileKeyStore(dir);
    await a.load();
    a.put(generateKeyPair("kid-1"));
    const raw = await readFile(path.join(dir, "kid-1.json"), "utf8");
    expect(JSON.parse(raw).kid).toBe("kid-1");
    const b = new FileKeyStore(dir);
    await b.load();
    expect(b.getActive().kid).toBe("kid-1");
  });
});

describe("local KMS wrap", () => {
  it("round-trips when master key is set", () => {
    const prev = process.env.OTV_KMS_MASTER_KEY;
    process.env.OTV_KMS_MASTER_KEY = "ab".repeat(32);
    try {
      const wrapped = wrapPrivateKey("deadbeef");
      expect(wrapped.startsWith("otv-kms-v1:")).toBe(true);
      expect(unwrapPrivateKey(wrapped)).toBe("deadbeef");
    } finally {
      if (prev === undefined) delete process.env.OTV_KMS_MASTER_KEY;
      else process.env.OTV_KMS_MASTER_KEY = prev;
    }
  });
});

describe("AWS KMS envelope", () => {
  it("wraps with a DEK from the injected AWS ops", async () => {
    const prevProvider = process.env.OTV_KMS_PROVIDER;
    const prevKey = process.env.AWS_KMS_KEY_ID;
    const prevMaster = process.env.OTV_KMS_MASTER_KEY;
    const dek = Buffer.from("cd".repeat(32), "hex");
    process.env.OTV_KMS_PROVIDER = "aws";
    process.env.AWS_KMS_KEY_ID = "test-key";
    delete process.env.OTV_KMS_MASTER_KEY;
    setAwsKmsOps({
      generateDataKey: async () => ({ plaintext: dek, ciphertext: Buffer.from("wrapped-dek") }),
      decrypt: async () => dek,
    });
    const dir = await mkdtemp(path.join(os.tmpdir(), "otv-kms-"));
    try {
      await initKms(dir);
      const wrapped = wrapPrivateKey("aabbcc");
      expect(wrapped.startsWith("otv-kms-v1:")).toBe(true);
      expect(unwrapPrivateKey(wrapped)).toBe("aabbcc");
    } finally {
      setAwsKmsOps(undefined);
      if (prevProvider === undefined) delete process.env.OTV_KMS_PROVIDER;
      else process.env.OTV_KMS_PROVIDER = prevProvider;
      if (prevKey === undefined) delete process.env.AWS_KMS_KEY_ID;
      else process.env.AWS_KMS_KEY_ID = prevKey;
      if (prevMaster === undefined) delete process.env.OTV_KMS_MASTER_KEY;
      else process.env.OTV_KMS_MASTER_KEY = prevMaster;
    }
  });
});
