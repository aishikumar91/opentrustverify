import type { NextApiRequest, NextApiResponse } from "next";
import { getRequester } from "../../../lib/auth";
import { getAdminSettingsFlags } from "../../../lib/settings";
import { setWalletConnectProjectId } from "../../../lib/adminSettingsStore";

/**
 * Session-gated admin settings.
 * GET — YES/NO flags + effective WalletConnect project id (DB then env).
 * PUT/PATCH — persist WalletConnect project id in admin_settings (DB).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requester = getRequester(req);
  if (!requester || requester.role !== "admin") {
    return res.status(401).json({ error: "Admin session required." });
  }
  const session = { username: requester.id };

  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    return res.status(200).json(await getAdminSettingsFlags());
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
      if (!Object.prototype.hasOwnProperty.call(body, "walletConnectProjectId")) {
        return res.status(400).json({
          error: "Provide walletConnectProjectId (string). Empty string clears the DB override.",
        });
      }
      const wc = await setWalletConnectProjectId(String(body.walletConnectProjectId ?? ""));
      const flags = await getAdminSettingsFlags();
      return res.status(200).json({
        ...flags,
        walletConnectProjectId: wc.projectId,
        walletConnectConfigured: wc.configured,
        walletConnectSource: wc.source,
        walletConnect: wc.configured ? "YES" : "NO",
        saved: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save settings";
      return res.status(400).json({ error: message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
