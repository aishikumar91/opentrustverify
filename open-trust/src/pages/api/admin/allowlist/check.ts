import type { NextApiRequest, NextApiResponse } from "next";
import { isAddress } from "viem";
import { verifySessionToken, parseCookie, COOKIE_NAME } from "../../../../lib/auth";
import { isAllowlisted, getAllowlist } from "../../../../lib/allowlist";

/**
 * Preflight for the linked-wallet flow.
 * The connected wallet IS the signer: check target (and optionally signer)
 * are allowlisted BEFORE the browser asks the wallet to sign, so a test
 * run never wastes gas on a tx that record-run would reject with 403.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = verifySessionToken(parseCookie(req.headers.cookie, COOKIE_NAME));
  if (!session) {
    return res.status(401).json({ error: "Admin session required." });
  }
  const address = typeof req.query.address === "string"
    ? req.query.address
    : (req.body as { address?: string })?.address;
  if (!address || !isAddress(address)) {
    return res.status(400).json({ error: "address (valid EVM) is required" });
  }
  const allowlisted = await isAllowlisted(address);
  const list = await getAllowlist();
  return res.status(200).json({
    address,
    allowlisted,
    allowlistSize: list.size,
    hint: allowlisted
      ? null
      : "Not allowlisted. On the dashboard click 'Use as target' so target equals your linked signer wallet, or link the wallet first.",
  });
}
