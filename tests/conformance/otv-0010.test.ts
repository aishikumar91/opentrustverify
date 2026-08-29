import { describe, expect, it } from "vitest";
import { IncomingClaimSchema, VerdictSchema, assertTransition } from "@otv/verdict-schema";
import { generateKeyPair, InMemoryKeyStore, verifyPayload } from "@otv/crypto-signatures";
import { createAdapter } from "@otv/chain-adapters";
import { verifyIncomingTransfer } from "@otv/verification-engine";

/**
 * OTV-0010 conformance suite — gates "OTV Compatible" claims for the mock path.
 */
describe("OTV-0010 conformance", () => {
  it("parses otv.verdict.v1 and rejects unknown status", () => {
    const sample = {
      schema: "otv.verdict.v1",
      verdictId: "vr_x",
      status: "SPENDABLE",
      confidence: 0.9,
      chain: "ethereum",
      network: "sepolia",
      transactionHash: "0x1",
      recipient: "0x2",
      asset: { type: "erc20" },
      finality: { state: "FINAL" },
      risk: { level: "LOW", signals: [] },
      evidence: [{ type: "TRANSACTION_INCLUDED", result: true }],
      policyVersion: "otv-policy-1",
      checkedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      verifier: "otv",
      kid: "k",
    };
    expect(VerdictSchema.parse(sample).schema).toBe("otv.verdict.v1");
    expect(() => VerdictSchema.parse({ ...sample, status: "PAID" })).toThrow();
  });

  it("allows happy-path transitions only", () => {
    expect(() => assertTransition("OBSERVED", "PENDING")).not.toThrow();
    expect(() => assertTransition("FINAL", "SPENDABLE")).not.toThrow();
    expect(() => assertTransition("SPENDABLE", "PENDING")).toThrow();
  });

  it("sign/verify round-trip and tamper detection", async () => {
    const store = new InMemoryKeyStore();
    store.put(generateKeyPair("otv-c"));
    const adapter = createAdapter("mock", "local");
    const claim = IncomingClaimSchema.parse({
      chain: "ethereum",
      network: "sepolia",
      transactionHash: "0xdemo000000000000000000000000000000000000000000000000000000000001",
      recipient: "0x2222222222222222222222222222222222222222",
      asset: {
        type: "erc20",
        contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        symbol: "USDC",
      },
      expectedAmount: "1000000",
    });
    const verdict = await verifyIncomingTransfer(claim, { adapter, keyStore: store, maxConfidence: 0.95 });
    expect(verdict.status).toBe("SPENDABLE");
    const required = [
      "TRANSACTION_INCLUDED",
      "EXECUTION_SUCCESS",
      "ASSET_MATCH",
      "RECIPIENT_MATCH",
      "AMOUNT_MATCH",
      "BALANCE_DELTA",
      "FINALITY",
      "SPENDABILITY",
    ];
    for (const type of required) {
      expect(verdict.evidence.some((e) => e.type === type && e.result)).toBe(true);
    }
    expect(verifyPayload(verdict, verdict.signature!, store.getPublic(verdict.kid)!)).toBe(true);
    const tampered = { ...verdict, amount: "0" };
    expect(verifyPayload(tampered, verdict.signature!, store.getPublic(verdict.kid)!)).toBe(false);
  });
});
