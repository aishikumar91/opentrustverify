import { generateKeyPair, InMemoryKeyStore } from "@otv/crypto-signatures";

export const keyStore = new InMemoryKeyStore();
keyStore.put(generateKeyPair(process.env.OTV_KID ?? "otv-dev-1"));
