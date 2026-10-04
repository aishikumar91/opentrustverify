import { describe, expect, it } from "vitest";
import { isEvmAddress } from "./address.js";
import { evaluatePayment, runDemo } from "./demo.js";
import { cacheFreshness, reconcileBalanceReads } from "./reconcile.js";
import { formatBaseUnits } from "./units.js";

const matched = {
  eventDetected: true,
  transactionExists: true,
  receiptOk: true,
  recipientMatches: true,
  tokenContractMatches: true,
  amountMatches: true,
  confirmations: 32,
  requiredConfirmations: 12,
  balanceBefore: "500000000",
  balanceAfter: "600000000",
  expectedDelta: "100000000",
};

describe("balance reconciliation", () => {
  it("returns a verified zero when the chain says zero", () => {
    const result = reconcileBalanceReads([{ ok: true, balanceBaseUnits: "0", blockNumber: 10 }]);
    expect(result.verification).toBe("verified");
    expect(result.balanceBaseUnits).toBe("0");
  });

  it("does not turn an RPC outage into a zero balance", () => {
    const result = reconcileBalanceReads([{ ok: false, error: "timeout" }]);
    expect(result.verification).toBe("unavailable");
    expect(result.balanceBaseUnits).toBeNull();
  });

  it("does not pick a side when providers disagree", () => {
    const result = reconcileBalanceReads([
      { ok: true, balanceBaseUnits: "10", blockNumber: 1 },
      { ok: true, balanceBaseUnits: "11", blockNumber: 1 },
    ]);
    expect(result.verification).toBe("requires_reconciliation");
    expect(result.balanceBaseUnits).toBeNull();
  });

  it("accepts agreeing providers, including a very large balance", () => {
    const huge = "9".repeat(78);
    const result = reconcileBalanceReads([
      { ok: true, balanceBaseUnits: huge, blockNumber: 4 },
      { ok: true, balanceBaseUnits: huge, blockNumber: 4 },
    ]);
    expect(result.verification).toBe("verified");
    expect(result.balanceBaseUnits).toBe(huge);
  });

  it("marks an old observation stale", () => {
    expect(cacheFreshness("2020-01-01T00:00:00.000Z", Date.parse("2026-01-01T00:00:00.000Z"), 60_000)).toBe("stale");
    expect(cacheFreshness("2026-01-01T00:00:00.000Z", Date.parse("2026-01-01T00:00:30.000Z"), 60_000)).toBe("fresh");
  });
});

describe("base units", () => {
  it("formats USDT base units without floating point", () => {
    expect(formatBaseUnits("100000000", 6)).toBe("100");
    expect(formatBaseUnits("1000000", 6)).toBe("1");
    expect(formatBaseUnits("1", 6)).toBe("0.000001");
  });

  it("formats a balance larger than Number.MAX_SAFE_INTEGER", () => {
    expect(formatBaseUnits("100000000000000000000000000000", 18)).toBe("100000000000");
  });
});

describe("addresses", () => {
  it("rejects malformed EVM addresses", () => {
    expect(isEvmAddress("0x1234")).toBe(false);
    expect(isEvmAddress("USDT")).toBe(false);
    expect(isEvmAddress("0xdac17f958d2ee523a2206206994597c13d831ec7")).toBe(true);
  });
});

describe("payment evaluation", () => {
  it("rejects a phantom event even though the event arrived", () => {
    const run = runDemo("phantom_event");
    expect(run.evaluation.result).toBe("rejected");
    expect(run.evaluation.eventOnlyWouldAccept).toBe(true);
    expect(run.evaluation.balanceUnchanged).toBe(true);
    expect(run.evaluation.steps.find((item) => item.step === "transaction_lookup")?.state).toBe("failed");
  });

  it("does not verify an event whose balance does not match", () => {
    const run = runDemo("balance_mismatch");
    expect(run.evaluation.result).toBe("mismatch");
    expect(run.evaluation.result).not.toBe("verified");
  });

  it("verifies a payment only when transaction, amount, confirmations, and balance agree", () => {
    const run = runDemo("valid_payment");
    expect(run.evaluation.result).toBe("verified");
  });

  it("keeps a shallow transaction pending", () => {
    const run = runDemo("pending_payment");
    expect(run.evaluation.result).toBe("pending");
  });

  it("verifies from chain state when the event is missing and the balance exists", () => {
    const result = evaluatePayment({ ...matched, eventDetected: false });
    expect(result.result).toBe("verified");
    expect(result.eventOnlyWouldAccept).toBe(false);
  });

  it("rejects the wrong token contract", () => {
    expect(evaluatePayment({ ...matched, tokenContractMatches: false }).result).toBe("rejected");
  });

  it("rejects the wrong recipient and the wrong amount", () => {
    expect(evaluatePayment({ ...matched, recipientMatches: false }).result).toBe("rejected");
    expect(evaluatePayment({ ...matched, amountMatches: false }).result).toBe("rejected");
  });

  it("does not treat a failed balance read as zero or as verified", () => {
    const result = evaluatePayment({ ...matched, balanceAfter: null });
    expect(result.result).toBe("unavailable");
    expect(result.decision).toContain("not a zero balance");
  });

  it("rejects a failed transaction receipt", () => {
    expect(evaluatePayment({ ...matched, receiptOk: false }).result).toBe("rejected");
  });
});
