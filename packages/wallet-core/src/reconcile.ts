export interface BalanceObservation {
  ok: boolean;
  balanceBaseUnits?: string;
  blockNumber?: number;
  error?: string;
}

export type BalanceVerification = "verified" | "unavailable" | "requires_reconciliation";

export interface ReconciledBalance {
  balanceBaseUnits: string | null;
  blockNumber: number | null;
  verification: BalanceVerification;
}

/**
 * Agreeing reads become one balance. Disagreement does not pick a winner.
 * Every failed read becomes unavailable, never a synthetic zero.
 */
export function reconcileBalanceReads(observations: BalanceObservation[]): ReconciledBalance {
  const good = observations.filter(
    (item) => item.ok && typeof item.balanceBaseUnits === "string" && /^\d+$/.test(item.balanceBaseUnits)
  );
  if (good.length === 0) {
    return { balanceBaseUnits: null, blockNumber: null, verification: "unavailable" };
  }
  const first = good[0]?.balanceBaseUnits;
  if (!first || good.some((item) => item.balanceBaseUnits !== first)) {
    return { balanceBaseUnits: null, blockNumber: null, verification: "requires_reconciliation" };
  }
  return {
    balanceBaseUnits: first,
    blockNumber: good[0]?.blockNumber ?? null,
    verification: "verified",
  };
}

export function cacheFreshness(observedAt: string, nowMs: number, maxAgeMs: number): "fresh" | "stale" {
  const observed = Date.parse(observedAt);
  if (Number.isNaN(observed)) return "stale";
  return nowMs - observed > maxAgeMs ? "stale" : "fresh";
}
