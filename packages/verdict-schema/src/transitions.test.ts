import { describe, expect, it } from "vitest";
import { canTransition, VerdictSchema, VERDICT_SCHEMA_ID } from "./index.js";

describe("verdict transitions", () => {
  it("allows happy path steps", () => {
    expect(canTransition("OBSERVED", "PENDING")).toBe(true);
    expect(canTransition("PENDING", "EXECUTED")).toBe(true);
    expect(canTransition("FINAL", "SPENDABLE")).toBe(true);
  });

  it("allows failure paths", () => {
    expect(canTransition("PENDING", "REJECTED")).toBe(true);
    expect(canTransition("EXECUTED", "UNVERIFIED")).toBe(true);
    expect(canTransition("ASSET_CONFIRMED", "SUSPICIOUS")).toBe(true);
  });

  it("blocks illegal jumps", () => {
    expect(canTransition("OBSERVED", "SPENDABLE")).toBe(false);
    expect(canTransition("SPENDABLE", "PENDING")).toBe(false);
  });

  it("validates a minimal verdict", () => {
    const v = VerdictSchema.parse({
      schema: VERDICT_SCHEMA_ID,
      verdictId: "vr_test",
      status: "SPENDABLE",
      confidence: 0.99,
      chain: "ethereum",
      network: "sepolia",
      transactionHash: "0xabc",
      recipient: "0xdef",
      asset: { type: "erc20", symbol: "USDC", decimals: 6 },
      amount: "1000000",
      balanceDelta: "1000000",
      finality: { state: "FINAL", confirmations: 12, required: 12 },
      risk: { level: "LOW", signals: [] },
      evidence: [{ type: "TRANSACTION_INCLUDED", result: true }],
      policyVersion: "otv-policy-1",
      checkedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
      verifier: "otv",
      kid: "otv-dev-1",
      signature: "sig",
    });
    expect(v.status).toBe("SPENDABLE");
  });
});
