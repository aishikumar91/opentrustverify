import type { NextApiRequest, NextApiResponse } from "next";
import { getRequester } from "../../../lib/auth";
import { listExecutedRuns } from "../../../lib/runs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: "Sign in required." });
  }

  try {
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 50;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
    const runs = await listExecutedRuns(limit);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ runs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
