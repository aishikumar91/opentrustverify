import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  generateKeyPair,
  InMemoryKeyStore,
  type KeyPairRecord,
  type SigningKeyStore,
} from "@otv/crypto-signatures";
import { initKms, kmsConfigured, unwrapPrivateKey, wrapPrivateKey } from "./kms.js";
import type { OtvStore } from "./store.js";

export class FileKeyStore extends InMemoryKeyStore implements SigningKeyStore {
  constructor(private readonly dir: string) {
    super();
  }

  async load(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const files = readdirSync(this.dir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const raw = JSON.parse(readFileSync(path.join(this.dir, file), "utf8")) as KeyPairRecord;
      super.put({
        ...raw,
        privateKeyHex: unwrapPrivateKey(raw.privateKeyHex),
      });
    }
  }

  override put(record: KeyPairRecord): void {
    super.put(record);
    this.persist(record);
  }

  override rotate(newKid: string): KeyPairRecord {
    const next = super.rotate(newKid);
    this.flush();
    return next;
  }

  override revoke(kid: string): void {
    super.revoke(kid);
    this.flush();
  }

  private persist(record: KeyPairRecord): void {
    mkdirSync(this.dir, { recursive: true });
    const stored: KeyPairRecord = {
      ...record,
      privateKeyHex: wrapPrivateKey(record.privateKeyHex),
    };
    writeFileSync(path.join(this.dir, `${record.kid}.json`), JSON.stringify(stored, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    });
  }

  private flush(): void {
    for (const key of this.keys.values()) {
      this.persist(key);
    }
  }
}

export async function createKeyStore(store?: OtvStore): Promise<SigningKeyStore> {
  const kid = process.env.OTV_KID ?? "otv-dev-1";
  const dir = process.env.OTV_KEYS_DIR ?? path.resolve(process.cwd(), "keys");
  const fileStore = new FileKeyStore(dir);
  await initKms(dir);
  await fileStore.load();
  try {
    fileStore.getActive();
  } catch {
    fileStore.put(generateKeyPair(kid));
  }
  const active = fileStore.getActive();
  if (store) {
    await store.persistSigningKey(
      active.kid,
      active.publicKeyHex,
      kmsConfigured() ? wrapPrivateKey(active.privateKeyHex) : undefined,
      active.status
    );
  }
  return fileStore;
}
