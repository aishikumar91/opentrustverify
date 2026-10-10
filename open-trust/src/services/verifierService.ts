/**
 * verifierService.ts
 *
 * Read-only deep-scan module. Takes a txHash, pulls its real on-chain state
 * via RPC, cross-checks it against block-explorer contract verification,
 * and hands the structured findings to the Gemini/Vertex AI agent for
 * threat categorization. This module never signs or sends anything.
 */

import { createPublicClient, http, type Hash } from "viem";
import { activeChain } from "../lib/chain";

const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(process.env.RPC_URL ?? activeChain.rpcUrls.default.http[0]),
});

export interface VerifyChain {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerTxBase: string;
  explorerApiBase: string | null;
  explorerApiKey?: string;
}

/** Chain-aware read config. Base default; Polygon via POLYGON_RPC_URL. */
export function getVerifyChain(chainId?: number): VerifyChain {
  if (chainId === 137) {
    return {
      chainId: 137,
      name: "Polygon",
      rpcUrl: process.env.POLYGON_RPC_URL ?? "https://polygon.publicnode.com",
      explorerTxBase: "https://polygonscan.com",
      explorerApiBase: "https://api.polygonscan.org",
      explorerApiKey: process.env.POLYGONSCAN_API_KEY,
    };
  }
  return {
    chainId: 8453,
    name: "Base",
    rpcUrl: process.env.RPC_URL ?? activeChain.rpcUrls.default.http[0],
    explorerTxBase: process.env.BLOCK_EXPLORER_BASE ?? activeChain.blockExplorers.default.url,
    explorerApiBase: process.env.EXPLORER_API_BASE ?? "https://api.basescan.org",
    explorerApiKey: process.env.BASESCAN_API_KEY,
  };
}

export function explorerTxUrl(chainId: number | undefined, txHash: string): string {
  return `${getVerifyChain(chainId).explorerTxBase}/tx/${txHash}`;
}

export interface VerificationFindings {
  txHash: string;
  confirmations: number;
  status: "success" | "reverted" | "pending";
  maxFeePerGas: string | null;
  networkBaseFee: string;
  gasDeficitRatio: number | null;
  contractVerified: boolean | null;
  transferLogged: boolean;
  nativeOrTokenBalanceDelta: string;
}

async function isContractVerified(address: string, chain: VerifyChain): Promise<boolean | null> {
  const apiKey = chain.explorerApiKey;
  const apiBase = chain.explorerApiBase;
  if (!apiKey || !apiBase) return null;
  try {
    const res = await fetch(
      `${apiBase}/api?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`
    );
    const data = await res.json();
    const sourceCode = data?.result?.[0]?.SourceCode ?? "";
    return sourceCode.length > 0;
  } catch {
    return null;
  }
}

export async function gatherFindings(txHash: string, chainId?: number): Promise<VerificationFindings> {
  const chain = getVerifyChain(chainId);
  const client =
    chain.chainId === 8453
      ? publicClient
      : createPublicClient({ chain: activeChain, transport: http(chain.rpcUrl) });
  const tx = await client.getTransaction({ hash: txHash as Hash });
  const latestBlock = await client.getBlock();
  const baseFee = latestBlock.baseFeePerGas ?? 0n;

  let receipt;
  let status: VerificationFindings["status"] = "pending";
  let confirmations = 0;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash as Hash });
    status = receipt.status === "success" ? "success" : "reverted";
    confirmations = Number(latestBlock.number - receipt.blockNumber);
  } catch {
    // no receipt yet → still pending in mempool
  }

  const maxFeePerGas = tx.maxFeePerGas ?? null;
  const gasDeficitRatio =
    maxFeePerGas !== null && baseFee > 0n ? Number(maxFeePerGas) / Number(baseFee) : null;

  const transferLogged = (receipt?.logs?.length ?? 0) > 0;

  // Real balance delta check: compare value field vs actual logs. A full
  // implementation diffs pre/post state via trace_transaction; this uses
  // the tx's native value as the baseline signal.
  const nativeOrTokenBalanceDelta = tx.value?.toString() ?? "0";

  const contractVerified = tx.to ? await isContractVerified(tx.to, chain) : null;

  return {
    txHash,
    confirmations,
    status,
    maxFeePerGas: maxFeePerGas?.toString() ?? null,
    networkBaseFee: baseFee.toString(),
    gasDeficitRatio,
    contractVerified,
    transferLogged,
    nativeOrTokenBalanceDelta,
  };
}

export interface ThreatAssessment {
  txHash: string;
  chainId: number;
  status: "FRAUD_INTERCEPTED" | "VERIFIED_LEGITIMATE";
  threatScore: number;
  vector: "MEMPOOL_SPOOF_LURE" | "ADDRESS_POISONING" | "FAKE_TOKEN" | "NONE";
  realBalanceImpact: string;
  reasons: string[];
  actionRecommended: "BLOCK_INTERCEPT" | "PASS";
}

/**
 * Sends gathered findings to the Vertex AI Agent Builder / ADK endpoint if
 * configured, otherwise falls back to a direct Gemini call using the system
 * prompt in src/agent/system-prompt.md. Either path returns the same
 * strict JSON schema.
 */
export async function assessThreat(findings: VerificationFindings, chainId?: number): Promise<ThreatAssessment> {
  const endpoint = process.env.VERTEX_AGENT_ENDPOINT;

  if (endpoint) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ findings }),
    });
    if (!res.ok) throw new Error(`Vertex agent endpoint returned ${res.status}`);
    return (await res.json()) as ThreatAssessment;
  }

  // Deterministic local fallback — mirrors the agent's analysis workflow
  // so the dashboard still works before the Vertex endpoint is wired up.
  const reasons: string[] = [];
  let vector: ThreatAssessment["vector"] = "NONE";
  let threatScore = 5;

  if (findings.status === "pending" && findings.confirmations < 12) {
    reasons.push("Transaction unconfirmed: fewer than 12 confirmations.");
    threatScore += 15;
  }
  if (findings.gasDeficitRatio !== null && findings.gasDeficitRatio < 0.5) {
    reasons.push("maxFeePerGas is significantly below current network base fee.");
    vector = "MEMPOOL_SPOOF_LURE";
    threatScore += 40;
  }
  if (findings.transferLogged && findings.nativeOrTokenBalanceDelta === "0") {
    reasons.push("Transfer event emitted but no real balance delta detected.");
    vector = "ADDRESS_POISONING";
    threatScore += 45;
  }
  if (findings.contractVerified === false) {
    reasons.push("Target contract is unverified on the block explorer.");
    if (vector === "NONE") vector = "FAKE_TOKEN";
    threatScore += 25;
  }

  threatScore = Math.min(threatScore, 100);
  const flagged = threatScore >= 50;

  return {
    txHash: findings.txHash,
    chainId: chainId ?? 8453,
    status: flagged ? "FRAUD_INTERCEPTED" : "VERIFIED_LEGITIMATE",
    threatScore,
    vector: flagged ? vector : "NONE",
    realBalanceImpact: findings.nativeOrTokenBalanceDelta,
    reasons: reasons.length ? reasons : ["No deception indicators found."],
    actionRecommended: flagged ? "BLOCK_INTERCEPT" : "PASS",
  };
}

export async function verifyTransaction(txHash: string, chainId?: number): Promise<ThreatAssessment> {
  const cid = chainId === 137 ? 137 : 8453;
  const findings = await gatherFindings(txHash, cid);
  const assessment = await assessThreat(findings, cid);
  assessment.chainId = cid;
  return assessment;
}
