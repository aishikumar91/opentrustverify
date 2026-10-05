import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminSettingsFlags } from "../../../lib/settings";

/**
 * Public runtime config for the admin UI.
 * WalletConnect project id is read at request time so VPS .env changes
 * apply without rebuilding the Next image (NEXT_PUBLIC_* alone is build-time).
 * Status YES/NO flags are also exposed so landing can show readiness without
 * inventing client-side values.
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const walletConnectProjectId = (
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
    process.env.WALLETCONNECT_PROJECT_ID ||
    process.env.VITE_WALLETCONNECT_PROJECT_ID ||
    ""
  ).trim();

  const settings = getAdminSettingsFlags();

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    walletConnectProjectId,
    walletConnectConfigured: Boolean(walletConnectProjectId),
    chainId: settings.chainId,
    chainName: settings.chainName,
    productName: "3GGA",
    rpc: settings.rpc,
    mainnet: settings.mainnet,
    allowlist: settings.allowlist,
    rpcSource: settings.rpcSource,
  });
}
