import type { ChainAdapter } from "@otv/chain-adapters";
import {
  type IncomingClaim,
  type Verdict,
  type EvidenceItem,
  type VerificationStatus,
  VERDICT_SCHEMA_ID,
  assertTransition,
} from "@otv/verdict-schema";
import { type SigningKeyStore, signPayload } from "@otv/crypto-signatures";

function addressesMatch(left: string, right: string): boolean {
  if (left.startsWith("0x") || right.startsWith("0x")) return left.toLowerCase() === right.toLowerCase();
  if (/^(bc1|tb1|bcrt1)/i.test(left) || /^(bc1|tb1|bcrt1)/i.test(right)) {
    return left.toLowerCase() === right.toLowerCase();
  }
  return left === right;
}

function id(): string {
  return `vr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function pushStatus(
  current: VerificationStatus,
  next: VerificationStatus,
  trail: VerificationStatus[]
): VerificationStatus {
  assertTransition(current, next);
  trail.push(next);
  return next;
}

export interface VerifyOptions {
  adapter: ChainAdapter;
  keyStore: SigningKeyStore;
  policyVersion?: string;
  ttlMs?: number;
  /** When using mock/offline adapters, confidence is capped. */
  maxConfidence?: number;
}

export async function verifyIncomingTransfer(
  claim: IncomingClaim,
  opts: VerifyOptions
): Promise<Verdict> {
  const policyVersion = opts.policyVersion ?? "otv-policy-1";
  const ttlMs = opts.ttlMs ?? 15 * 60 * 1000;
  const maxConfidence = opts.maxConfidence ?? 0.99;
  const evidence: EvidenceItem[] = [];
  const trail: VerificationStatus[] = ["OBSERVED"];
  let status: VerificationStatus = "OBSERVED";
  let confidence = 0.2;

  status = pushStatus(status, "PENDING", trail);

  const assetHint =
    claim.asset?.type === "native" ? "native" : claim.asset?.contract;
  const normalized = await opts.adapter.normalizeEvidence(
    claim.transactionHash,
    claim.recipient,
    assetHint
  );

  const included = normalized.transaction.status === "included";
  evidence.push({
    type: "TRANSACTION_INCLUDED",
    result: included,
    detail: included ? `block ${normalized.transaction.blockNumber}` : "not found",
  });
  if (!included) {
    status = pushStatus(status, "REJECTED", trail);
    return finalize(claim, status, evidence, normalized, opts, policyVersion, ttlMs, 0.95, trail);
  }

  const executed = normalized.receipt?.status === "success";
  evidence.push({
    type: "EXECUTION_SUCCESS",
    result: Boolean(executed),
    detail: normalized.receipt?.status ?? "no receipt",
  });
  if (!executed) {
    status = pushStatus(status, "REJECTED", trail);
    return finalize(claim, status, evidence, normalized, opts, policyVersion, ttlMs, 0.95, trail);
  }
  status = pushStatus(status, "EXECUTED", trail);
  confidence = 0.55;

  const transfer = normalized.transfers.find((t) => {
    if (!addressesMatch(t.to, claim.recipient)) return false;
    if (claim.asset?.tokenId && t.tokenId && t.tokenId !== claim.asset.tokenId) return false;
    if (claim.asset?.type === "native") return t.asset === "native";
    if (claim.asset?.contract) {
      return t.asset.toLowerCase() === claim.asset.contract.toLowerCase();
    }
    return true;
  });
  const typeOk =
    !claim.asset?.type ||
    claim.asset.type === "other" ||
    normalized.asset?.type === claim.asset.type ||
    (claim.asset.type === "native" && (!normalized.asset || normalized.asset.type === "native"));
  const assetOk =
    Boolean(normalized.asset) &&
    typeOk &&
    (!claim.asset?.contract ||
      normalized.asset?.contract?.toLowerCase() === claim.asset.contract.toLowerCase()) &&
    (!claim.asset?.symbol ||
      normalized.asset?.symbol?.toUpperCase() === claim.asset.symbol.toUpperCase());

  evidence.push({
    type: "ASSET_MATCH",
    result: assetOk,
    detail: normalized.asset?.symbol ?? "unknown",
  });
  if (!assetOk) {
    status = pushStatus(status, "UNVERIFIED", trail);
    return finalize(claim, status, evidence, normalized, opts, policyVersion, ttlMs, 0.7, trail);
  }
  status = pushStatus(status, "ASSET_CONFIRMED", trail);
  confidence = 0.7;

  const recipientOk = Boolean(transfer);
  evidence.push({
    type: "RECIPIENT_MATCH",
    result: recipientOk,
    detail: recipientOk ? claim.recipient : "no matching transfer",
  });

  const amountOk =
    !claim.expectedAmount ||
    (transfer &&
      (transfer.amount === claim.expectedAmount || transfer.tokenId === claim.expectedAmount));
  evidence.push({
    type: "AMOUNT_MATCH",
    result: Boolean(amountOk),
    detail: transfer?.amount ?? "n/a",
  });

  if (!recipientOk || !amountOk) {
    status = pushStatus(status, "UNVERIFIED", trail);
    return finalize(claim, status, evidence, normalized, opts, policyVersion, ttlMs, 0.75, trail);
  }

  const before = BigInt(normalized.balanceBefore?.balance ?? "0");
  const after = BigInt(normalized.balanceAfter?.balance ?? "0");
  const delta = after - before;
  const expected = BigInt(transfer!.amount);
  const balanceOk = delta === expected;
  evidence.push({
    type: "BALANCE_DELTA",
    result: balanceOk,
    detail: delta.toString(),
  });
  if (!balanceOk) {
    status = pushStatus(status, "SUSPICIOUS", trail);
    return finalize(
      claim,
      status,
      evidence,
      normalized,
      opts,
      policyVersion,
      ttlMs,
      0.8,
      trail,
      delta.toString()
    );
  }
  status = pushStatus(status, "BALANCE_CONFIRMED", trail);
  confidence = 0.85;

  const finalOk = normalized.finality.state === "FINAL" || normalized.finality.state === "SAFE";
  evidence.push({
    type: "FINALITY",
    result: finalOk,
    detail: `${normalized.finality.confirmations}/${normalized.finality.required}`,
  });
  if (!finalOk) {
    // stay at BALANCE_CONFIRMED conceptually; map to PENDING-like terminal UNVERIFIED for MVP clarity
    status = pushStatus(status, "UNVERIFIED", trail);
    return finalize(
      claim,
      status,
      evidence,
      normalized,
      opts,
      policyVersion,
      ttlMs,
      0.85,
      trail,
      delta.toString()
    );
  }
  status = pushStatus(status, "FINAL", trail);

  const spendable = finalOk && balanceOk && executed;
  evidence.push({
    type: "SPENDABILITY",
    result: spendable,
    detail: spendable ? "policy otv-policy-1" : "not spendable",
  });
  status = pushStatus(status, "SPENDABLE", trail);
  confidence = Math.min(maxConfidence, 0.99);

  return finalize(
    claim,
    status,
    evidence,
    normalized,
    opts,
    policyVersion,
    ttlMs,
    confidence,
    trail,
    delta.toString()
  );
}

function finalize(
  claim: IncomingClaim,
  status: VerificationStatus,
  evidence: EvidenceItem[],
  normalized: Awaited<ReturnType<ChainAdapter["normalizeEvidence"]>>,
  opts: VerifyOptions,
  policyVersion: string,
  ttlMs: number,
  confidence: number,
  _trail: VerificationStatus[],
  balanceDelta?: string
): Verdict {
  const key = opts.keyStore.getActive();
  const now = new Date();
  const verdict: Verdict = {
    schema: VERDICT_SCHEMA_ID,
    verdictId: id(),
    status,
    confidence,
    chain: claim.chain,
    network: claim.network,
    transactionHash: claim.transactionHash,
    recipient: claim.recipient,
    asset: {
      type: normalized.asset?.type ?? claim.asset?.type ?? "other",
      contract: normalized.asset?.contract ?? claim.asset?.contract,
      symbol: normalized.asset?.symbol ?? claim.asset?.symbol,
      decimals: normalized.asset?.decimals ?? claim.asset?.decimals,
      tokenId: claim.asset?.tokenId ?? normalized.transfers.find((t) => t.tokenId)?.tokenId,
    },
    amount: claim.expectedAmount ?? normalized.transfers[0]?.amount,
    balanceDelta,
    finality: {
      state: normalized.finality.state,
      confirmations: normalized.finality.confirmations,
      required: normalized.finality.required,
    },
    risk: {
      level: status === "SUSPICIOUS" ? "HIGH" : status === "REJECTED" ? "MEDIUM" : "LOW",
      signals:
        status === "SUSPICIOUS"
          ? [
              {
                code: "BALANCE_MISMATCH",
                severity: "HIGH",
                message: "Observed balance delta does not match transfer amount",
              },
            ]
          : [],
    },
    evidence,
    policyVersion,
    checkedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    verifier: "otv",
    kid: key.kid,
  };
  verdict.signature = signPayload(verdict, key.privateKeyHex);
  return verdict;
}

export { id as createVerdictId };
