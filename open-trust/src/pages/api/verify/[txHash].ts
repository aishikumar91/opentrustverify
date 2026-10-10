import type { NextApiRequest, NextApiResponse } from "next";
import { verifyTransaction, explorerTxUrl } from "../../../services/verifierService";
import { updateExecutedRunAssessment } from "../../../lib/runs";
import { checkRateLimitAsync, clientIp } from "../../../lib/rateLimit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { txHash } = req.query;

  if (typeof txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return res.status(400).json({ error: "txHash must be a 0x-prefixed 32-byte hash" });
  }

  const ip = clientIp(req);
  const rl = await checkRateLimitAsync(`verify:${ip}`, 120, 60_000);
  if (!rl.ok) {
    return res.status(429).json({ error: "Too many attempts. Retry shortly." });
  }
  const chainRaw = req.query.chainId;
  const cid = chainRaw === "137" ? 137 : 8453;
  try {
    const assessment = await verifyTransaction(txHash, cid);
    try {
      await updateExecutedRunAssessment({
        txHash: assessment.txHash,
        chainId: cid,
        explorerUrl: explorerTxUrl(cid, txHash),
        status: assessment.status,
        threatScore: assessment.threatScore,
        vector: assessment.vector !== "NONE" ? assessment.vector : undefined,
        realBalanceImpact: assessment.realBalanceImpact,
        reasons: assessment.reasons,
        actionRecommended: assessment.actionRecommended,
      });
    } catch (persistErr) {
      console.error("Failed to update executed run assessment:", persistErr);
    }
    return res.status(200).json(assessment);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
