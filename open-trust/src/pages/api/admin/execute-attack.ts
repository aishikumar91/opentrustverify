import type { NextApiRequest, NextApiResponse } from "next";
import {
  triggerLowGasPendingLure,
  triggerZeroValuePoisoning,
  triggerFakeTokenTransfer,
} from "../../../services/liveEngine";
import { NotAllowlistedError } from "../../../lib/allowlist";
import { verifySessionToken, parseCookie, COOKIE_NAME } from "../../../lib/auth";

type Vector = "mempoolLure" | "addressPoisoning" | "fakeTokenTransfer";

interface Body {
  vector: Vector;
  targetAddress: string;
  amount?: string;
  fakeTokenContract?: string;
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

  const { vector, targetAddress, amount, fakeTokenContract } = req.body as Body;

  if (!vector || !targetAddress) {
    return res.status(400).json({ error: "vector and targetAddress are required" });
  }

  try {
    switch (vector) {
      case "mempoolLure": {
        const result = await triggerLowGasPendingLure(targetAddress, amount ?? "0.001");
        return res.status(200).json(result);
      }
      case "addressPoisoning": {
        if (!fakeTokenContract) {
          return res.status(400).json({ error: "fakeTokenContract is required for this vector" });
        }
        const result = await triggerZeroValuePoisoning(targetAddress, fakeTokenContract);
        return res.status(200).json(result);
      }
      case "fakeTokenTransfer": {
        if (!fakeTokenContract) {
          return res.status(400).json({ error: "fakeTokenContract is required for this vector" });
        }
        const result = await triggerFakeTokenTransfer(
          targetAddress,
          fakeTokenContract,
          amount ?? "1000000000000000000"
        );
        return res.status(200).json(result);
      }
      default:
        return res.status(400).json({ error: `Unknown vector: ${vector}` });
    }
  } catch (err) {
    if (err instanceof NotAllowlistedError) {
      return res.status(403).json({ error: err.message });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
