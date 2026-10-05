import type { NextApiRequest, NextApiResponse } from "next";
import { verifySessionToken, parseCookie, COOKIE_NAME } from "../../../lib/auth";
import { getAdminSettingsFlags } from "../../../lib/settings";

/**
 * Session-gated admin settings. UI must read YES/NO from this API.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = verifySessionToken(parseCookie(req.headers.cookie, COOKIE_NAME));
  if (!session) {
    return res.status(401).json({ error: "Admin session required." });
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(getAdminSettingsFlags());
}
