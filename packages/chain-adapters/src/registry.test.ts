import { describe, expect, it } from "vitest";
import { catalogAssets } from "./tokens.js";
import { catalogChains, createAdapter } from "./index.js";
import { BITCOIN_DEMO } from "./bitcoin.js";
import { SOLANA_DEMO } from "./solana.js";
import { TRON_DEMO } from "./tron.js";

describe("chain catalog", () => {
  it("lists evm families plus bitcoin solana and tron", () => {
    const ids = catalogChains().map((c) => c.id);
    expect(ids).toContain("ethereum");
    expect(ids).toContain("polygon");
    expect(ids).toContain("base");
    expect(ids).toContain("bitcoin");
    expect(ids).toContain("solana");
    expect(ids).toContain("tron");
  });

  it("lists known assets without requiring them for verify", () => {
    const eth = catalogAssets("ethereum", "mainnet");
    expect(eth.some((a) => a.symbol === "USDC")).toBe(true);
    expect(eth.some((a) => a.type === "native")).toBe(true);
  });

  it("creates mock adapters without a dedicated RPC", async () => {
    const btc = createAdapter("bitcoin", "mock");
    const sol = createAdapter("solana", "mock");
    const trx = createAdapter("tron", "mock");
    expect(btc.isLive).toBe(false);
    expect(sol.isLive).toBe(false);
    expect(trx.isLive).toBe(false);
    const b = await btc.normalizeEvidence(BITCOIN_DEMO.hash, BITCOIN_DEMO.recipient);
    const s = await sol.normalizeEvidence(SOLANA_DEMO.hash, SOLANA_DEMO.recipient);
    const t = await trx.normalizeEvidence(TRON_DEMO.hash, TRON_DEMO.recipient);
    expect(b.asset?.symbol).toBe("BTC");
    expect(s.asset?.symbol).toBe("SOL");
    expect(t.asset?.symbol).toBe("TRX");
  });
});
