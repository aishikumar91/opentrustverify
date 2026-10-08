import type { NextApiRequest, NextApiResponse } from "next";
import { isAddress } from "viem";
import { verifySessionToken, parseCookie, COOKIE_NAME } from "../../../../lib/auth";
import { isAllowlisted, getAllowlist } from "../../../../lib/allowlist";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = verifySessionToken(parseCookie(req.headers.cookie, COOKIE_NAME));
  if (!session) {
    return res.status(401).json({ error: "Admin session required." });
  }
  const address =
    typeof req.query.address === "string"
      ? req.query.address
      : (req.body as { address?: string })?.address;
  if (!address || !isAddress(address)) {
    return res.status(400).json({ error: "Valid address required." });
  }
  const allowlisted = await isAllowlisted(address);
  const list = await getAllowlist();
  return res.status(200).json({
    address,
    allowlisted,
    allowlistSize: list.size,
    error: allowlisted ? null : "Not allowlisted.",
  });
}
