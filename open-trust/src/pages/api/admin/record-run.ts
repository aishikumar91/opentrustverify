import type { NextApiRequest, NextApiResponse } from "next";
import { isAddress, getAddress } from "viem";
import { verifySessionToken, parseCookie, COOKIE_NAME } from "../../../lib/auth";
import { assertAllowlisted, NotAllowlistedError } from "../../../lib/allowlist";
import { insertExecutedRun } from "../../../lib/runs";
import { activeChain } from "../../../lib/chain";

type VectorName = "MEMPOOL_SPOOF_LURE" | "ADDRESS_POISONING" | "FAKE_TOKEN_TRANSFER";

interface Body {
  txHash: string;
  vector: VectorName;
  targetAddress: string;
  fromAddress?: string;
  broadcastAt?: string;
}

function explorerLink(txHash: string): string {
  const base = process.env.BLOCK_EXPLORER_BASE ?? activeChain.blockExplorers.default.url;
  return `${base}/tx/${txHash}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = verifySessionToken(parseCookie(req.headers.cookie, COOKIE_NAME));
  if (!session) {
    return res.status(401).json({ error: "Admin session required." });
  }

  const { txHash, vector, targetAddress, fromAddress, broadcastAt } = req.body as Body;

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
    const explorerUrl = explorerLink(txHash);
    const at = broadcastAt || new Date().toISOString();

    const run = await insertExecutedRun({
      txHash,
      vector,
      targetAddress: normalizedTarget,
      explorerUrl,
      broadcastAt: at,
    });

    return res.status(200).json({
      txHash,
      explorerUrl,
      vector,
      targetAddress: normalizedTarget,
      fromAddress: fromAddress && isAddress(fromAddress) ? getAddress(fromAddress) : null,
      broadcastAt: at,
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
