import type { NextApiRequest, NextApiResponse } from "next";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { requireAdminSession } from "../../../../../lib/adminSession";
import { listPasskeysForAdmin, storeChallenge } from "../../../../../lib/passkeysStore";
import { getWebAuthnRpId } from "../../../../../lib/webauthn";

/**
 * Start passkey assertion — returns PublicKeyCredentialRequestOptionsJSON.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = requireAdminSession(req);
  if (!session) {
    return res.status(401).json({ error: "Admin session required." });
  }

  res.setHeader("Cache-Control", "no-store");

  try {
    const existing = await listPasskeysForAdmin(session.username);
    if (existing.length === 0) {
      return res.status(400).json({
        error: "No passkeys linked yet. Use “Link with Passkey” first.",
      });
    }

    const options = await generateAuthenticationOptions({
      rpID: getWebAuthnRpId(),
      userVerification: "preferred",
      allowCredentials: existing.map((p) => ({
        id: p.credential_id,
        transports: (p.transports ?? undefined) as
          | ("ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb")[]
          | undefined,
      })),
    });

    await storeChallenge(session.username, options.challenge, "authentication");
    return res.status(200).json({ options });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start passkey assertion";
    return res.status(500).json({ error: message });
  }
}
