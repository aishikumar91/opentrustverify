import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminSettingsFlags } from "../../../lib/settings";
import { resolveWalletConnectProjectId } from "../../../lib/adminSettingsStore";

/**
 * Public runtime config for the admin UI.
 * WalletConnect project id: database first, then env — so Admin UI changes
 * apply without rebuilding the Next image (NEXT_PUBLIC_* alone is build-time).
 */
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const wc = await resolveWalletConnectProjectId();
  const settings = await getAdminSettingsFlags();

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    walletConnectProjectId: wc.projectId,
    walletConnectConfigured: wc.configured,
    walletConnectSource: wc.source,
    chainId: settings.chainId,
    chainName: settings.chainName,
    productName: "3GGA",
    rpc: settings.rpc,
    mainnet: settings.mainnet,
    allowlist: settings.allowlist,
    rpcSource: settings.rpcSource,
    turnstileSiteKey: (process.env.TURNSTILE_SITE_KEY ?? "").trim(),
  });
}
