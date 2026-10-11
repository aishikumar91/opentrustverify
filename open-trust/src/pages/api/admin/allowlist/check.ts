import type { NextApiRequest, NextApiResponse } from "next";
import { isAddress } from "viem";
import { getRequester } from "../../../../lib/auth";
import { isAllowlisted, getAllowlist } from "../../../../lib/allowlist";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: "Sign-in required." });
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
