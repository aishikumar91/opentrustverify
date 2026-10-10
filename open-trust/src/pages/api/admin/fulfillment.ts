import type { NextApiRequest, NextApiResponse } from "next";
import { getRequester } from "../../../lib/auth";
import { listFulfillment, setFulfillmentStatus } from "../../../lib/fulfillmentStore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requester = getRequester(req);
  if (!requester || requester.role !== "admin") {
    return res.status(401).json({ error: "Admin session required." });
  }
  try {
    if (req.method === "GET") {
      return res.status(200).json({ queue: await listFulfillment() });
    }
    if (req.method === "PATCH") {
      const { id, status } = (req.body ?? {}) as { id?: number; status?: string };
      if (!Number.isFinite(Number(id)) || (status !== "completed" && status !== "rejected")) {
        return res.status(400).json({ error: "id and status (completed|rejected) are required" });
      }
      const updated = await setFulfillmentStatus(Number(id), status);
      return res.status(200).json({ updated });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Queue update failed" });
  }
}
