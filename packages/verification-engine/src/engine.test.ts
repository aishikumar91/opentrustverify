import { describe, expect, it } from "vitest";
import { MockChainAdapter } from "@otv/chain-adapters";
import { InMemoryKeyStore, generateKeyPair, verifyPayload } from "@otv/crypto-signatures";
import { verifyIncomingTransfer } from "./index.js";

describe("verification engine", () => {
  it("returns signed SPENDABLE for demo transfer", async () => {
    const adapter = new MockChainAdapter();
    const store = new InMemoryKeyStore();
    store.put(generateKeyPair("otv-dev-1"));
    const hash = "0xdemo000000000000000000000000000000000000000000000000000000000001";
    const recipient = "0x2222222222222222222222222222222222222222";
    const verdict = await verifyIncomingTransfer(
      {
        chain: "ethereum",
        network: "sepolia",
        transactionHash: hash,
        recipient,
        asset: { type: "erc20", contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC" },
        expectedAmount: "1000000",
      },
      { adapter, keyStore: store, maxConfidence: 0.95 }
    );
    expect(verdict.status).toBe("SPENDABLE");
    expect(verdict.evidence.length).toBeGreaterThanOrEqual(6);
    const pub = store.getPublic(verdict.kid)!;
    expect(verifyPayload(verdict, verdict.signature!, pub)).toBe(true);
  });

  it("rejects unknown hash", async () => {
    const adapter = new MockChainAdapter();
    const store = new InMemoryKeyStore();
    store.put(generateKeyPair("otv-dev-1"));
    const verdict = await verifyIncomingTransfer(
      {
        chain: "ethereum",
        network: "sepolia",
        transactionHash: "0xdead",
        recipient: "0x2222222222222222222222222222222222222222",
      },
      { adapter, keyStore: store }
    );
    expect(verdict.status).toBe("REJECTED");
  });
});
