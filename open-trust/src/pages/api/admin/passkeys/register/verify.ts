import type { NextApiRequest, NextApiResponse } from "next";
import {
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { requireAdminSession } from "../../../../../lib/adminSession";
import {
  consumeChallenge,
  insertPasskey,
  normalizeLinkedAddress,
  toPasskeyPublic,
} from "../../../../../lib/passkeysStore";
import {
  getWebAuthnOrigins,
  getWebAuthnRpId,
  publicKeyToBase64Url,
} from "../../../../../lib/webauthn";

/**
 * Finish passkey registration — verify attestation, persist credential id + public key.
 * Optional linkedAddress associates an EVM address for allowlist target use.
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
    const response = body.response as RegistrationResponseJSON | undefined;
    if (!response || typeof response !== "object" || !response.id) {
      return res.status(400).json({ error: "Provide WebAuthn registration response." });
    }

    const expectedChallenge = await consumeChallenge(session.username, "registration");
    if (!expectedChallenge) {
      return res.status(400).json({
        error: "Registration challenge expired or missing. Start registration again.",
      });
    }

    const linkedAddress = Object.prototype.hasOwnProperty.call(body, "linkedAddress")
      ? normalizeLinkedAddress(body.linkedAddress)
      : null;
    const deviceName =
      typeof body.deviceName === "string" && body.deviceName.trim()
        ? body.deviceName.trim().slice(0, 120)
        : null;

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: getWebAuthnOrigins(),
      expectedRPID: getWebAuthnRpId(),
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: "Passkey registration could not be verified." });
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    const row = await insertPasskey({
      username: session.username,
      credentialId: credential.id,
      publicKey: publicKeyToBase64Url(credential.publicKey),
      counter: credential.counter,
      transports: (credential.transports ?? []) as string[],
      deviceName,
      linkedAddress,
      credentialDeviceType,
      backedUp: credentialBackedUp,
    });

    return res.status(201).json({
      verified: true,
      passkey: toPasskeyPublic(row),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Passkey registration failed";
    // Unique credential_id race
    if (/unique|duplicate/i.test(message)) {
      return res.status(409).json({ error: "This passkey is already linked." });
    }
    return res.status(400).json({ error: message });
  }
}
