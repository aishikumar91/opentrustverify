import type { NextApiRequest, NextApiResponse } from "next";
import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { requireAdminSession } from "../../../../../lib/adminSession";
import {
  consumeChallenge,
  findPasskeyByCredentialId,
  toPasskeyPublic,
  updatePasskeyCounter,
} from "../../../../../lib/passkeysStore";
import {
  getWebAuthnOrigins,
  getWebAuthnRpId,
  publicKeyFromBase64Url,
} from "../../../../../lib/webauthn";

/**
 * Finish passkey assertion — verify signature, bump counter, return linked address if any.
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
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const response = body.response as AuthenticationResponseJSON | undefined;
    if (!response || typeof response !== "object" || !response.id) {
      return res.status(400).json({ error: "Provide WebAuthn assertion response." });
    }

    const expectedChallenge = await consumeChallenge(session.username, "authentication");
    if (!expectedChallenge) {
      return res.status(400).json({
        error: "Assertion challenge expired or missing. Try again.",
      });
    }

    const stored = await findPasskeyByCredentialId(response.id);
    if (!stored || stored.admin_username !== session.username) {
      return res.status(404).json({ error: "Passkey not found for this admin." });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: getWebAuthnOrigins(),
      expectedRPID: getWebAuthnRpId(),
      requireUserVerification: false,
      credential: {
        id: stored.credential_id,
        publicKey: new Uint8Array(publicKeyFromBase64Url(stored.public_key)),
        counter: Number(stored.counter),
        transports: (stored.transports ?? undefined) as
          | ("ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb")[]
          | undefined,
      },
    });

    if (!verification.verified) {
      return res.status(400).json({ error: "Passkey assertion could not be verified." });
    }

    await updatePasskeyCounter(
      stored.credential_id,
      verification.authenticationInfo.newCounter
    );

    const refreshed = (await findPasskeyByCredentialId(stored.credential_id)) ?? stored;

    return res.status(200).json({
      verified: true,
      passkey: toPasskeyPublic(refreshed),
      linkedAddress: refreshed.linked_address,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Passkey assertion failed";
    return res.status(400).json({ error: message });
  }
}
