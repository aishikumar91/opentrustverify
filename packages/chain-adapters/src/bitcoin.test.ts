import { describe, expect, it } from "vitest";
import { BitcoinAdapter, BITCOIN_DEMO, btcAddressesMatch } from "./bitcoin.js";
import { createAdapter } from "./ethereum.js";

describe("BitcoinAdapter", () => {
  it("normalizes the mock demo payment", async () => {
    const adapter = new BitcoinAdapter("mock");
    expect(adapter.isLive).toBe(false);
    const evidence = await adapter.normalizeEvidence(BITCOIN_DEMO.hash, BITCOIN_DEMO.recipient);
    expect(evidence.receipt?.status).toBe("success");
    expect(evidence.transfers[0]?.amount).toBe(BITCOIN_DEMO.amount);
    expect(evidence.asset?.symbol).toBe("BTC");
    expect(evidence.finality.state).toBe("FINAL");
  });

  it("matches bech32 without caring about case", () => {
    expect(btcAddressesMatch("tb1qdemo000000000000000000000000000000000", "TB1QDEMO000000000000000000000000000000000")).toBe(
      true
    );
  });

  it("is created from createAdapter", () => {
    const adapter = createAdapter("bitcoin", "mock");
    expect(adapter.chainId).toBe("bitcoin");
    expect(adapter.isLive).toBe(false);
  });
});
