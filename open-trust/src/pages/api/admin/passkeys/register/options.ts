import type { NextApiRequest, NextApiResponse } from "next";
import {
  generateRegistrationOptions,
} from "@simplewebauthn/server";
import { requireAdminSession } from "../../../../../lib/adminSession";
import {
  listPasskeysForAdmin,
  storeChallenge,
  type StoredPasskey,
} from "../../../../../lib/passkeysStore";
import { getWebAuthnRpId, getWebAuthnRpName } from "../../../../../lib/webauthn";

/**
 * Start passkey registration — returns PublicKeyCredentialCreationOptionsJSON.
 * Challenge is stored server-side with a short TTL.
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
    const options = await generateRegistrationOptions({
      rpName: getWebAuthnRpName(),
      rpID: getWebAuthnRpId(),
      userName: session.username,
      userDisplayName: `3GGA admin (${session.username})`,
      attestationType: "none",
      excludeCredentials: existing.map((p: StoredPasskey) => ({
        id: p.credential_id,
        transports: (p.transports ?? undefined) as
          | ("ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb")[]
          | undefined,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform",
      },
    });

    await storeChallenge(session.username, options.challenge, "registration");
    return res.status(200).json({ options });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start passkey registration";
    return res.status(500).json({ error: message });
  }
}
