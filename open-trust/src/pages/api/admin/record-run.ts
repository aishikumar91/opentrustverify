import type { NextApiRequest, NextApiResponse } from "next";
import { isAddress, getAddress } from "viem";
import { getRequester } from "../../../lib/auth";
import { assertAllowlisted, NotAllowlistedError } from "../../../lib/allowlist";
import { insertExecutedRun } from "../../../lib/runs";
import { getVerifyChain } from "../../../services/verifierService";

type VectorName = "MEMPOOL_SPOOF_LURE" | "ADDRESS_POISONING" | "FAKE_TOKEN_TRANSFER";

interface Body {
  txHash: string;
  vector: VectorName;
  targetAddress: string;
  fromAddress?: string;
  broadcastAt?: string;
  chainId?: number;
}

function explorerLink(chainId: number, txHash: string): string {
  return `${getVerifyChain(chainId).explorerTxBase}/tx/${txHash}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const requester = getRequester(req);
  if (!requester || requester.role !== "admin") {
    return res.status(401).json({ error: "Admin session required." });
  }
  const session = { username: requester.id };

  const { txHash, vector, targetAddress, fromAddress, broadcastAt, chainId: chainIdRaw } = req.body as Body;
  if (chainIdRaw !== undefined && chainIdRaw !== 8453 && chainIdRaw !== 137) {
    return res.status(400).json({ error: "Unsupported chainId (use 8453 or 137)" });
  }
  const cid = chainIdRaw === 137 ? 137 : 8453;

  if (!txHash || !vector || !targetAddress) {
    return res.status(400).json({ error: "txHash, vector, and targetAddress are required" });
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return res.status(400).json({ error: "Invalid txHash" });
  }
  if (!isAddress(targetAddress)) {
    return res.status(400).json({ error: "Invalid targetAddress" });
  }

  const allowedVectors: VectorName[] = [
    "MEMPOOL_SPOOF_LURE",
    "ADDRESS_POISONING",
    "FAKE_TOKEN_TRANSFER",
  ];
  if (!allowedVectors.includes(vector)) {
    return res.status(400).json({ error: `Unknown vector: ${vector}` });
  }

  try {
    await assertAllowlisted(targetAddress);
    if (fromAddress && isAddress(fromAddress)) {
      // Signer must also be a linked / allowlisted admin wallet.
      await assertAllowlisted(fromAddress);
    }

    const normalizedTarget = getAddress(targetAddress);
    const explorerUrl = explorerLink(cid, txHash);
    const at = broadcastAt || new Date().toISOString();

    const run = await insertExecutedRun({
      txHash,
      vector,
      targetAddress: normalizedTarget,
      explorerUrl,
      broadcastAt: at,
      chainId: cid,
    });

    return res.status(200).json({
      txHash,
      explorerUrl,
      vector,
      targetAddress: normalizedTarget,
      fromAddress: fromAddress && isAddress(fromAddress) ? getAddress(fromAddress) : null,
      broadcastAt: at,
      chainId: cid,
      run,
    });
  } catch (err) {
    if (err instanceof NotAllowlistedError) {
      return res.status(403).json({ error: err.message });
    }
    const message = err instanceof Error ? err.message : "Failed to record run";
    return res.status(500).json({ error: message });
  }
}
