import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdminSession } from "../../../../lib/adminSession";
import {
  deletePasskey,
  listPasskeysForAdmin,
  normalizeLinkedAddress,
  setPasskeyLinkedAddress,
  toPasskeyPublic,
} from "../../../../lib/passkeysStore";

/**
 * Session-gated passkey list / update / unlink.
 * GET — list passkeys for the admin (no private keys).
 * PATCH — associate or clear linked EVM address on a passkey ({ id, linkedAddress }).
 * DELETE — unlink a passkey ({ id }).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = requireAdminSession(req);
  if (!session) {
    return res.status(401).json({ error: "Admin session required." });
  }

  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method === "GET") {
      const rows = await listPasskeysForAdmin(session.username);
      return res.status(200).json({
        passkeys: rows.map(toPasskeyPublic),
        webauthnSupportedHint: true,
      });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const id = Number(body.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Provide a valid passkey id." });
    }

    if (req.method === "PATCH") {
      if (!Object.prototype.hasOwnProperty.call(body, "linkedAddress")) {
        return res.status(400).json({ error: "Provide linkedAddress (string or null)." });
      }
      const linkedAddress = normalizeLinkedAddress(body.linkedAddress);
      const updated = await setPasskeyLinkedAddress(id, session.username, linkedAddress);
      if (!updated) {
        return res.status(404).json({ error: "Passkey not found." });
      }
      return res.status(200).json({ passkey: toPasskeyPublic(updated) });
    }

    if (req.method === "DELETE") {
      const ok = await deletePasskey(id, session.username);
      if (!ok) {
        return res.status(404).json({ error: "Passkey not found." });
      }
      return res.status(200).json({ ok: true, id });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Passkey request failed";
    return res.status(400).json({ error: message });
  }
}
