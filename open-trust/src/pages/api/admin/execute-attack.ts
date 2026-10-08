import type { NextApiRequest, NextApiResponse } from "next";
import {
  triggerLowGasPendingLure,
  triggerZeroValuePoisoning,
  triggerFakeTokenTransfer,
  type TriggerResult,
} from "../../../services/liveEngine";
import { NotAllowlistedError } from "../../../lib/allowlist";
import { verifySessionToken, parseCookie, COOKIE_NAME } from "../../../lib/auth";
import { insertExecutedRun } from "../../../lib/runs";

type Vector = "mempoolLure" | "addressPoisoning" | "fakeTokenTransfer";

interface Body {
  vector: Vector;
  targetAddress: string;
  amount?: string;
  fakeTokenContract?: string;
}

async function persistRun(result: TriggerResult) {
  try {
    return await insertExecutedRun({
      txHash: result.txHash,
      vector: result.vector,
      targetAddress: result.targetAddress,
      explorerUrl: result.explorerUrl,
      broadcastAt: result.broadcastAt,
    });
  } catch (err) {
    console.error("Failed to persist executed run:", err);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Every live-broadcasting route must check the session before doing
  // anything else — this is the only thing standing between this endpoint
  // and anyone who finds the URL.
  const session = verifySessionToken(parseCookie(req.headers.cookie, COOKIE_NAME));
  if (!session) {
    return res.status(401).json({ error: "Admin session required." });
  }

  // Legacy server-key path only. Production signs in-browser via clientTriggers → record-run.
  if (!process.env.ADMIN_SIGNER_PRIVATE_KEY || process.env.ADMIN_SIGNER_PRIVATE_KEY === "0xreplace_me") {
    return res.status(503).json({ error: "Use linked wallet to sign." });
  }

  const { vector, targetAddress, amount, fakeTokenContract } = req.body as Body;

  if (!vector || !targetAddress) {
    return res.status(400).json({ error: "vector and targetAddress are required" });
  }

  try {
    let result: TriggerResult;
    switch (vector) {
      case "mempoolLure": {
        result = await triggerLowGasPendingLure(targetAddress, amount ?? "0.001");
        break;
      }
      case "addressPoisoning": {
        if (!fakeTokenContract) {
          return res.status(400).json({ error: "fakeTokenContract is required for this vector" });
        }
        result = await triggerZeroValuePoisoning(targetAddress, fakeTokenContract);
        break;
      }
      case "fakeTokenTransfer": {
        if (!fakeTokenContract) {
          return res.status(400).json({ error: "fakeTokenContract is required for this vector" });
        }
        result = await triggerFakeTokenTransfer(
          targetAddress,
          fakeTokenContract,
          amount ?? "1000000000000000000"
        );
        break;
      }
      default:
        return res.status(400).json({ error: `Unknown vector: ${vector}` });
    }

    const run = await persistRun(result);
    return res.status(200).json({ ...result, run });
  } catch (err) {
    if (err instanceof NotAllowlistedError) {
      return res.status(403).json({ error: err.message });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
