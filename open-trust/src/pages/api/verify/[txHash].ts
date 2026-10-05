import type { NextApiRequest, NextApiResponse } from "next";
import { verifyTransaction } from "../../../services/verifierService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { txHash } = req.query;

  if (typeof txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return res.status(400).json({ error: "txHash must be a 0x-prefixed 32-byte hash" });
  }

  try {
    const assessment = await verifyTransaction(txHash);
    return res.status(200).json(assessment);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
