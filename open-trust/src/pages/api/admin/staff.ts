import type { NextApiRequest, NextApiResponse } from "next";
import { getRequester } from "../../../lib/auth";
import { listStaff, addStaff, setStaffActive } from "../../../lib/staffStore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requester = getRequester(req);
  if (!requester || requester.role !== "admin") {
    return res.status(401).json({ error: "Admin session required." });
  }
  try {
    if (req.method === "GET") {
      return res.status(200).json({ staff: await listStaff() });
    }
    if (req.method === "POST") {
      const { email, name } = (req.body ?? {}) as { email?: string; name?: string };
      const row = await addStaff(String(email ?? ""), name ?? null, requester.id);
      try {
        const { sendMemberAddedEmail } = await import("../../../lib/mailer");
        await sendMemberAddedEmail(row.email, requester.id);
      } catch (err) {
        console.error("Member notify failed:", err instanceof Error ? err.message : err);
      }
      return res.status(200).json({ member: row });
    }
    if (req.method === "DELETE") {
      const { id } = (req.body ?? {}) as { id?: number };
      if (!Number.isFinite(Number(id))) return res.status(400).json({ error: "id is required" });
      const removed = await setStaffActive(Number(id), false);
      return res.status(200).json({ removed });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Staff update failed" });
  }
}
